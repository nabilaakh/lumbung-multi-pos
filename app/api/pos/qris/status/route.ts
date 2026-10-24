import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getMayarInvoiceDetail } from '@/lib/services/mayar-service';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(req.url);
    const transaksiId = searchParams.get('transaksi_id');

    if (!transaksiId) {
      return NextResponse.json({ error: 'Parameter transaksi_id wajib diisi' }, { status: 400 });
    }

    const { data: trx, error } = await supabase
      .from('transaksi')
      .select('id, nomor_struk, status, total, subtotal, diskon, dibayar_pada, mayar_invoice_id, shift_id')
      .eq('id', transaksiId)
      .maybeSingle();

    if (error || !trx) {
      return NextResponse.json({ error: 'Transaksi tidak ditemukan' }, { status: 404 });
    }

    // Jika status masih 'menunggu_bayar' dan ada mayar_invoice_id, cek sekilas status Mayar
    // (berguna jika webhook tertunda atau di lingkungan lokal tanpa tunnel ngrok)
    if (trx.status === 'menunggu_bayar' && trx.mayar_invoice_id) {
      const invoiceDetail = await getMayarInvoiceDetail(trx.mayar_invoice_id);
      if (invoiceDetail?.status === 'paid') {
        const adminClient = createAdminClient();
        await adminClient.rpc('lunaskan_transaksi_qris', {
          p_transaksi_id: trx.id,
          p_mayar_invoice_id: trx.mayar_invoice_id,
        });
        return NextResponse.json({
          status: 'lunas',
          nomor_struk: trx.nomor_struk,
          total: trx.total,
          subtotal: trx.subtotal,
          diskon: trx.diskon,
          dibayar_pada: new Date().toISOString(),
        });
      } else if (invoiceDetail?.status === 'expired') {
        // Auto-cancel jika expired dari Mayar
        const adminClient = createAdminClient();
        await adminClient.rpc('batalkan_transaksi_qris', {
          p_transaksi_id: trx.id,
          p_alasan: 'Tagihan Mayar telah kedaluwarsa (10 menit)',
        });
        return NextResponse.json({
          status: 'batal',
          nomor_struk: trx.nomor_struk,
          total: trx.total,
          reason: 'Tagihan kedaluwarsa',
        });
      }
    }

    return NextResponse.json({
      status: trx.status,
      nomor_struk: trx.nomor_struk,
      total: trx.total,
      subtotal: trx.subtotal,
      diskon: trx.diskon,
      dibayar_pada: trx.dibayar_pada,
    });
  } catch (error: any) {
    console.error('Error polling QRIS status:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
