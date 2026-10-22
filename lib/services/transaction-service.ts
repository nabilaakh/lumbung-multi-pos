import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Transaksi, TransaksiItem } from '@/types/database';

export interface ValidationResult {
  valid: boolean;
  errorMessage: string | null;
}

export interface TransactionWithDetails extends Transaksi {
  cabang?: { kode: string; nama: string };
  kasir?: { nama_lengkap: string; email: string };
  void_user?: { nama_lengkap: string };
  items?: TransaksiItem[];
}

export const MIN_VOID_REASON_LENGTH = 10;

/**
 * Validasi Alasan Void (BR-08: Wajib diisi minimal 10 karakter)
 */
export function validateVoidReason(reason: string | null | undefined): ValidationResult {
  if (!reason || reason.trim().length === 0) {
    return {
      valid: false,
      errorMessage: 'Alasan void transaksi wajib diisi.',
    };
  }

  const trimmed = reason.trim();
  if (trimmed.length < MIN_VOID_REASON_LENGTH) {
    return {
      valid: false,
      errorMessage: `Alasan void wajib minimal ${MIN_VOID_REASON_LENGTH} karakter (saat ini ${trimmed.length} karakter).`,
    };
  }

  return {
    valid: true,
    errorMessage: null,
  };
}

/**
 * Mengambil daftar riwayat transaksi dengan filter cabang, status, dan tanggal
 */
export async function getTransactions(
  supabase: SupabaseClient<Database>,
  filters?: {
    cabangId?: string | null;
    status?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    searchQuery?: string | null;
  }
): Promise<{ data: TransactionWithDetails[]; error: string | null }> {
  try {
    let query = supabase
      .from('transaksi')
      .select(`
        *,
        cabang:cabang_id (kode, nama),
        kasir:kasir_id (nama_lengkap, email),
        void_user:void_oleh (nama_lengkap)
      `)
      .order('dibuat_pada', { ascending: false });

    if (filters?.cabangId) {
      query = query.eq('cabang_id', filters.cabangId);
    }

    if (filters?.status && filters.status !== 'semua') {
      query = query.eq('status', filters.status);
    }

    if (filters?.startDate) {
      query = query.gte('dibuat_pada', `${filters.startDate}T00:00:00+07:00`);
    }

    if (filters?.endDate) {
      query = query.lte('dibuat_pada', `${filters.endDate}T23:59:59+07:00`);
    }

    if (filters?.searchQuery && filters.searchQuery.trim().length > 0) {
      query = query.ilike('nomor_struk', `%${filters.searchQuery.trim()}%`);
    }

    const { data, error } = await query;

    if (error) {
      return { data: [], error: error.message };
    }

    return { data: (data as any) || [], error: null };
  } catch (err: any) {
    return { data: [], error: err.message };
  }
}

/**
 * Mengambil rincian transaksi lengkap beserta item produknya
 */
export async function getTransactionDetail(
  supabase: SupabaseClient<Database>,
  transaksiId: string
): Promise<{ data: TransactionWithDetails | null; error: string | null }> {
  try {
    const { data: trx, error: trxError } = await supabase
      .from('transaksi')
      .select(`
        *,
        cabang:cabang_id (kode, nama, alamat),
        kasir:kasir_id (nama_lengkap, email),
        void_user:void_oleh (nama_lengkap)
      `)
      .eq('id', transaksiId)
      .single();

    if (trxError || !trx) {
      return { data: null, error: trxError?.message || 'Transaksi tidak ditemukan.' };
    }

    const { data: items, error: itemsError } = await supabase
      .from('transaksi_item')
      .select('*')
      .eq('transaksi_id', transaksiId);

    if (itemsError) {
      return { data: null, error: itemsError.message };
    }

    const result: TransactionWithDetails = {
      ...(trx as any),
      items: items || [],
    };

    return { data: result, error: null };
  } catch (err: any) {
    return { data: null, error: err.message };
  }
}

/**
 * Menjalankan void transaksi atomik melalui Stored Procedure PostgreSQL (BR-08, BR-12)
 */
export async function executeVoidTransaction(
  supabase: SupabaseClient<Database>,
  params: {
    transaksiId: string;
    alasanVoid: string;
  }
): Promise<{ success: boolean; error: string | null }> {
  const validation = validateVoidReason(params.alasanVoid);
  if (!validation.valid) {
    return { success: false, error: validation.errorMessage };
  }

  try {
    const { data, error } = await supabase.rpc('eksekusi_void_transaksi', {
      p_transaksi_id: params.transaksiId,
      p_alasan_void: params.alasanVoid.trim(),
    });

    if (error) {
      return { success: false, error: error.message };
    }

    const res = data as any;
    if (res && res.success === false) {
      return { success: false, error: res.error || 'Gagal membatalkan transaksi.' };
    }

    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err.message || 'Terjadi kesalahan sistem saat memproses void.' };
  }
}
