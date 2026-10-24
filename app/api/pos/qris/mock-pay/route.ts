import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { setMockInvoiceStatus } from '@/lib/services/mayar-service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { transaksi_id } = body;

    if (!transaksi_id) {
      return NextResponse.json({ error: 'Parameter transaksi_id wajib diisi' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    const { data: trx, error: fetchError } = await adminClient
      .from('transaksi')
      .select('id, nomor_struk, status, total, mayar_invoice_id')
      .eq('id', transaksi_id)
      .single();

    if (fetchError || !trx) {
      return NextResponse.json({ error: 'Transaksi tidak ditemukan' }, { status: 404 });
    }

    if (trx.mayar_invoice_id) {
      setMockInvoiceStatus(trx.mayar_invoice_id, 'paid');
    }

    const { data: rpcData, error: rpcError } = await adminClient.rpc('lunaskan_transaksi_qris', {
      p_transaksi_id: trx.id,
      p_mayar_invoice_id: trx.mayar_invoice_id || 'inv_mock_manual',
    });

    if (rpcError) {
      return NextResponse.json({ error: rpcError.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Simulasi pembayaran berhasil dilunaskan!',
      data: rpcData,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
