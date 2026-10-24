import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createMayarInvoice } from '@/lib/services/mayar-service';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Harap login terlebih dahulu' }, { status: 401 });
    }

    const body = await req.json();
    const { shiftId, items, diskon = 0, alasanDiskon = '', customerName, customerEmail } = body;

    if (!shiftId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Data transaksi tidak lengkap' }, { status: 400 });
    }

    // 1. Eksekusi RPC inisiasi_transaksi_qris (status: 'menunggu_bayar', reservasi stok)
    const { data: rpcData, error: rpcError } = await supabase.rpc('inisiasi_transaksi_qris', {
      p_shift_id: shiftId,
      p_items: items.map((i: any) => ({
        produk_id: i.produk_id,
        jumlah: i.jumlah,
      })),
      p_diskon: Math.round(diskon),
      p_alasan_diskon: alasanDiskon?.trim() || '',
    });

    if (rpcError || !rpcData) {
      return NextResponse.json(
        { error: rpcError?.message || 'Gagal menginisiasi transaksi di database' },
        { status: 400 }
      );
    }

    const { transaksi_id, nomor_struk, total, subtotal } = rpcData as any;

    // 2. Siapkan tagihan Mayar API (atau Mock jika sandbox belum tersedia)
    const mayarItems = items.map((i: any) => ({
      description: i.nama || `Item ${i.produk_id}`,
      quantity: i.jumlah,
      rate: i.harga_satuan || Math.round(total / items.length),
    }));

    const invoiceResult = await createMayarInvoice({
      amount: total,
      invoiceNumber: nomor_struk,
      customerName: customerName || 'Pelanggan Lumbung POS',
      customerEmail: customerEmail || 'kasir@lumbungkopi.id',
      description: `POS Lumbung Kopi & Roti - Struk #${nomor_struk}`,
      items: mayarItems,
    });

    // 3. Simpan mayar_invoice_id ke transaksi
    const adminClient = createAdminClient();
    await adminClient
      .from('transaksi')
      .update({ mayar_invoice_id: invoiceResult.invoiceId })
      .eq('id', transaksi_id);

    return NextResponse.json({
      success: true,
      transaksi_id,
      nomor_struk,
      subtotal,
      diskon,
      total,
      mayarInvoiceId: invoiceResult.invoiceId,
      paymentUrl: invoiceResult.paymentUrl,
      qrCodeUrl: invoiceResult.qrCodeUrl,
      expiredAt: invoiceResult.expiredAt,
      isMock: invoiceResult.isMock,
    });
  } catch (error: any) {
    console.error('Error initiating QRIS transaction:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
