import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, ShiftKasir } from '@/types/database';

export interface ValidationResult {
  valid: boolean;
  errorMessage: string | null;
}

export const MAX_OPENING_CASH = 2000000;
export const MAX_VARIANCE_WITHOUT_NOTE = 20000;

/**
 * Validasi nominal kas awal saat buka shift (BR-02: Rp0 s.d. Rp2.000.000)
 */
export function validateOpeningCash(kasAwal: number): ValidationResult {
  if (isNaN(kasAwal) || kasAwal < 0) {
    return {
      valid: false,
      errorMessage: 'Kas awal tidak boleh negatif.',
    };
  }

  if (kasAwal > MAX_OPENING_CASH) {
    return {
      valid: false,
      errorMessage: `Kas awal tidak boleh melebihi Rp${MAX_OPENING_CASH.toLocaleString('id-ID')}.`,
    };
  }

  return {
    valid: true,
    errorMessage: null,
  };
}

/**
 * Menghitung kas yang seharusnya ada di laci (kas_awal + total_tunai_lunas)
 */
export function calculateShiftCashExpected(kasAwal: number, totalTunaiLunas: number): number {
  return Math.max(0, kasAwal) + Math.max(0, totalTunaiLunas);
}

/**
 * Menghitung selisih kas fisik dengan kas yang seharusnya (uang_fisik - kas_seharusnya)
 */
export function calculateShiftVariance(uangFisik: number, kasSeharusnya: number): number {
  return uangFisik - kasSeharusnya;
}

/**
 * Memvalidasi penutupan shift (BR-09: jika |selisih| > Rp20.000 maka catatan wajib diisi)
 */
export function validateCloseShift(
  uangFisik: number,
  kasSeharusnya: number,
  catatanTutup?: string | null
): ValidationResult {
  if (isNaN(uangFisik) || uangFisik < 0) {
    return {
      valid: false,
      errorMessage: 'Uang fisik tidak boleh bernilai negatif.',
    };
  }

  const variance = calculateShiftVariance(uangFisik, kasSeharusnya);
  const absVariance = Math.abs(variance);

  if (absVariance > MAX_VARIANCE_WITHOUT_NOTE) {
    if (!catatanTutup || catatanTutup.trim().length === 0) {
      return {
        valid: false,
        errorMessage: `Selisih kas sebesar Rp${absVariance.toLocaleString('id-ID')} melebihi batas toleransi (Rp20.000). Harap masukkan catatan alasan selisih.`,
      };
    }
  }

  return {
    valid: true,
    errorMessage: null,
  };
}

/**
 * Mengambil shift berstatus 'buka' milik kasir tertentu
 */
export async function getActiveShift(
  supabase: SupabaseClient<Database>,
  cashierId: string
): Promise<ShiftKasir | null> {
  const { data, error } = await supabase
    .from('shift_kasir')
    .select('*')
    .eq('kasir_id', cashierId)
    .eq('status', 'buka')
    .maybeSingle();

  if (error) {
    console.error('Error fetching active shift:', error);
    return null;
  }

  return data;
}

/**
 * Membuka sesi shift kasir baru
 */
export async function openShift(
  supabase: SupabaseClient<Database>,
  params: {
    cabangId: string;
    cashierId: string;
    kasAwal: number;
  }
): Promise<{ data: ShiftKasir | null; error: string | null }> {
  const validation = validateOpeningCash(params.kasAwal);
  if (!validation.valid) {
    return { data: null, error: validation.errorMessage };
  }

  // Periksa apakah sudah ada shift buka
  const existingShift = await getActiveShift(supabase, params.cashierId);
  if (existingShift) {
    return { data: null, error: 'Kasir masih memiliki shift aktif yang belum ditutup.' };
  }

  const { data, error } = await supabase
    .from('shift_kasir')
    .insert({
      cabang_id: params.cabangId,
      kasir_id: params.cashierId,
      status: 'buka',
      kas_awal: Math.round(params.kasAwal),
      total_tunai: 0,
      total_qris: 0,
      kas_seharusnya: Math.round(params.kasAwal),
    })
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

/**
 * Mengalkulasi total tunai dan QRIS dari transaksi lunas selama shift
 */
export async function calculateCurrentShiftTotals(
  supabase: SupabaseClient<Database>,
  shiftId: string
): Promise<{ totalTunai: number; totalQris: number; error: string | null }> {
  const { data: transactions, error } = await supabase
    .from('transaksi')
    .select('metode_bayar, total, status')
    .eq('shift_id', shiftId)
    .eq('status', 'lunas');

  if (error) {
    return { totalTunai: 0, totalQris: 0, error: error.message };
  }

  let totalTunai = 0;
  let totalQris = 0;

  for (const trx of transactions || []) {
    if (trx.metode_bayar === 'tunai') {
      totalTunai += trx.total;
    } else if (trx.metode_bayar === 'qris') {
      totalQris += trx.total;
    }
  }

  return { totalTunai, totalQris, error: null };
}

/**
 * Menutup shift kasir dan merekonsiliasi kas
 */
export async function closeShift(
  supabase: SupabaseClient<Database>,
  params: {
    shiftId: string;
    uangFisik: number;
    catatanTutup?: string | null;
  }
): Promise<{ data: ShiftKasir | null; error: string | null }> {
  // Ambil data shift aktif
  const { data: shift, error: fetchError } = await supabase
    .from('shift_kasir')
    .select('*')
    .eq('id', params.shiftId)
    .single();

  if (fetchError || !shift) {
    return { data: null, error: 'Data shift tidak ditemukan.' };
  }

  if (shift.status !== 'buka') {
    return { data: null, error: 'Shift ini sudah ditutup sebelumnya.' };
  }

  // PRD Bagian 11.5: Shift tidak dapat ditutup selama masih ada transaksi menunggu_bayar
  const { count: pendingCount, error: pendingError } = await supabase
    .from('transaksi')
    .select('*', { count: 'exact', head: true })
    .eq('shift_id', params.shiftId)
    .eq('status', 'menunggu_bayar');

  if (pendingError) {
    return { data: null, error: 'Gagal memeriksa transaksi tertunda pada shift ini.' };
  }

  if (pendingCount && pendingCount > 0) {
    return {
      data: null,
      error: `Shift tidak dapat ditutup karena masih ada ${pendingCount} transaksi QRIS yang berstatus menunggu pembayaran. Harap selesaikan atau batalkan transaksi tersebut terlebih dahulu (PRD Bagian 11.5).`,
    };
  }

  // Hitung total transaksi riil
  const { totalTunai, totalQris, error: totalError } = await calculateCurrentShiftTotals(supabase, params.shiftId);
  if (totalError) {
    return { data: null, error: totalError };
  }

  const kasSeharusnya = calculateShiftCashExpected(shift.kas_awal, totalTunai);
  const validation = validateCloseShift(params.uangFisik, kasSeharusnya, params.catatanTutup);
  if (!validation.valid) {
    return { data: null, error: validation.errorMessage };
  }

  const selisih = calculateShiftVariance(params.uangFisik, kasSeharusnya);

  const { data: updatedShift, error: updateError } = await supabase
    .from('shift_kasir')
    .update({
      status: 'ditutup',
      ditutup_pada: new Date().toISOString(),
      total_tunai: totalTunai,
      total_qris: totalQris,
      kas_seharusnya: kasSeharusnya,
      uang_fisik: Math.round(params.uangFisik),
      selisih: selisih,
      catatan_tutup: params.catatanTutup?.trim() || null,
    })
    .eq('id', params.shiftId)
    .select()
    .single();

  if (updateError) {
    return { data: null, error: updateError.message };
  }

  return { data: updatedShift, error: null };
}

/**
 * Menghitung transaksi berstatus 'menunggu_bayar' pada shift tertentu (PRD Bagian 11.5)
 */
export async function countPendingShiftTransactions(
  supabase: SupabaseClient<Database>,
  shiftId: string
): Promise<number> {
  const { count, error } = await supabase
    .from('transaksi')
    .select('*', { count: 'exact', head: true })
    .eq('shift_id', shiftId)
    .eq('status', 'menunggu_bayar');

  if (error || !count) return 0;
  return count;
}
