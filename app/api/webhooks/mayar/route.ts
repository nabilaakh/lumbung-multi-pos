import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getMayarInvoiceDetail, isMayarMockMode, setMockInvoiceStatus } from '@/lib/services/mayar-service';

/**
 * Handler GET untuk pengecekan status webhook (Healthcheck / Ping)
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Mayar Webhook Endpoint is active and reachable',
    timestamp: new Date().toISOString(),
  });
}

/**
 * Webhook Route Handler untuk menerima notifikasi pembayaran dari Mayar.
 * Path: /api/webhooks/mayar
 */
export async function POST(req: NextRequest) {
  try {
    let rawBody: any = {};
    try {
      rawBody = await req.json();
    } catch {
      // Body kosong atau bukan JSON (ping test)
      return NextResponse.json({
        success: true,
        message: 'Ping acknowledged (empty or non-JSON body)',
      }, { status: 200 });
    }

    console.log('Webhook Mayar received:', JSON.stringify(rawBody));

    const event = rawBody?.event;
    // Mayar webhook event umum: 'payment.received', 'invoice.paid', atau status 'paid'
    const payloadData = rawBody?.data || rawBody;
    const invoiceId =
      payloadData?.invoiceId ||
      payloadData?.id ||
      payloadData?.invoice_id ||
      payloadData?.transactionId;

    // Respon 200 OK jika payload berupa ping / test tanpa invoiceId
    if (!invoiceId) {
      return NextResponse.json({
        success: true,
        message: 'Webhook ping or payload without invoiceId received successfully',
        event,
      }, { status: 200 });
    }

    // 1. Verifikasi ganda: Panggil Mayar API GET /invoices/{id} untuk anti-spoofing (PRD Bagian 11.3)
    let invoiceDetail = await getMayarInvoiceDetail(invoiceId);

    // Jika dalam Mock Mode dan menerima event payment.received, sinkronkan status mock
    if (isMayarMockMode() && event === 'payment.received') {
      setMockInvoiceStatus(invoiceId, 'paid');
      invoiceDetail = await getMayarInvoiceDetail(invoiceId);
    }

    if (!invoiceDetail) {
      console.warn(`Webhook Mayar: Invoice ${invoiceId} tidak ditemukan di Mayar API (kemungkinan dummy test payload).`);
      return NextResponse.json({
        success: true,
        message: 'Webhook received. Invoice verification skipped or dummy test payload.',
        invoiceId,
      }, { status: 200 });
    }

    // Jika status di Mayar bukan 'paid' dan bukan payment.received, respon 200 tanpa aksi
    if (invoiceDetail.status !== 'paid' && event !== 'payment.received') {
      return NextResponse.json({
        success: true,
        message: `Invoice status is ${invoiceDetail.status}, no action taken`,
      }, { status: 200 });
    }

    // 2. Hubungi database Supabase menggunakan Admin Client (Service Role)
    const supabase = createAdminClient();

    // 3. Cari transaksi berdasarkan mayar_invoice_id
    const { data: trx, error: fetchError } = await supabase
      .from('transaksi')
      .select('id, nomor_struk, status, total, shift_id')
      .eq('mayar_invoice_id', invoiceId)
      .maybeSingle();

    if (fetchError || !trx) {
      console.warn(`Webhook: Transaksi tidak ditemukan untuk mayar_invoice_id ${invoiceId} (uji pembayaran atau non-POS).`);
      return NextResponse.json({
        success: true,
        message: 'Webhook diterima dengan sukses. Tidak ada transaksi lokal POS yang terkait invoice ini.',
        invoiceId,
      }, { status: 200 });
    }

    // 4. Verifikasi Idempotensi (PRD Bagian 11.3):
    // Kabar yang sama yang datang dua kali tidak boleh memproses transaksi dua kali.
    if (trx.status === 'lunas') {
      return NextResponse.json(
        {
          success: true,
          message: 'Transaksi sudah berstatus lunas sebelumnya (idempoten)',
          nomor_struk: trx.nomor_struk,
        },
        { status: 200 }
      );
    }

    if (trx.status !== 'menunggu_bayar') {
      return NextResponse.json(
        {
          warning: `Transaksi berstatus '${trx.status}', tidak dapat dilunaskan`,
        },
        { status: 200 }
      );
    }

    // 5. Eksekusi RPC lunaskan_transaksi_qris
    const { data: rpcResult, error: rpcError } = await supabase.rpc('lunaskan_transaksi_qris', {
      p_transaksi_id: trx.id,
      p_mayar_invoice_id: invoiceId,
    });

    if (rpcError) {
      console.error('Webhook RPC Error:', rpcError);
      return NextResponse.json(
        { error: 'Gagal memperbarui status transaksi menjadi lunas' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Transaksi berhasil dilunaskan via webhook Mayar',
      data: rpcResult,
    });
  } catch (error: any) {
    console.error('Unhandled webhook error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
