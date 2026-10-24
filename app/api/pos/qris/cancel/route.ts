import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
    const { transaksi_id, alasan = 'Dibatalkan oleh kasir' } = body;

    if (!transaksi_id) {
      return NextResponse.json({ error: 'Parameter transaksi_id wajib disertakan' }, { status: 400 });
    }

    // Eksekusi RPC batalkan_transaksi_qris (kembalikan stok cabang & set status batal)
    const { data: rpcData, error: rpcError } = await supabase.rpc('batalkan_transaksi_qris', {
      p_transaksi_id: transaksi_id,
      p_alasan: alasan,
    });

    if (rpcError) {
      return NextResponse.json({ error: rpcError.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Transaksi QRIS berhasil dibatalkan dan stok telah dikembalikan ke cabang',
      data: rpcData,
    });
  } catch (error: any) {
    console.error('Error cancelling QRIS transaction:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
