import { createClient } from '@/lib/supabase/client';

export interface StockItem {
  id: string;
  cabang_id: string;
  produk_id: string;
  jumlah: number;
  stok_minimum: number;
  diubah_pada: string;
  produk: {
    id: string;
    sku: string;
    nama: string;
    kategori: string;
    harga_jual: number;
    aktif: boolean;
    satuan?: string;
  };
  cabang?: {
    id: string;
    kode: string;
    nama: string;
  };
}

export interface ShiftSupervisionItem {
  id: string;
  kasir_id: string;
  cabang_id: string;
  waktu_buka: string;
  waktu_tutup: string | null;
  kas_awal: number;
  total_penjualan_tunai: number;
  total_penjualan_qris: number;
  kas_seharusnya: number;
  kas_aktual: number | null;
  selisih: number | null;
  catatan_tutup: string | null;
  status: 'buka' | 'ditutup' | 'diverifikasi';
  diverifikasi_oleh: string | null;
  diverifikasi_pada: string | null;
  catatan_verifikasi: string | null;
  kasir?: {
    id: string;
    nama_lengkap: string;
    email: string;
  };
  cabang?: {
    id: string;
    kode: string;
    nama: string;
  };
  verifikator?: {
    id: string;
    nama_lengkap: string;
  };
}

export interface StockAdjustmentInput {
  cabangId: string;
  produkId: string;
  jumlahBaru: number;
  alasan: string;
}

export interface ShiftVerificationInput {
  shiftId: string;
  catatanVerifikasi: string;
}

/**
 * BR-09: Checks if current stock level is at or below minimum threshold
 */
export function isLowStock(jumlah: number, stokMinimum: number): boolean {
  return jumlah <= stokMinimum;
}

/**
 * BR-10: Checks if variance exceeds tolerance threshold (|selisih| > 20000)
 */
export function isHighCashVariance(selisih: number | null | undefined): boolean {
  if (selisih === null || selisih === undefined) return false;
  return Math.abs(selisih) > 20000;
}

/**
 * Format cash variance with human-readable status
 */
export function formatVarianceDisplay(selisih: number | null | undefined): {
  label: 'Sesuai' | 'Lebih' | 'Kurang';
  isAlert: boolean;
  amount: number;
} {
  const amount = selisih || 0;
  const isAlert = isHighCashVariance(amount);

  if (amount > 0) {
    return { label: 'Lebih', isAlert, amount };
  } else if (amount < 0) {
    return { label: 'Kurang', isAlert, amount };
  }
  return { label: 'Sesuai', isAlert: false, amount: 0 };
}

/**
 * BR-12, TC-17: Validate stock adjustment before calling RPC
 */
export function validateStockAdjustment(params: {
  jumlahBaru: number;
  alasan: string;
  userRole: string;
  userCabangId?: string | null;
  targetCabangId: string;
}): { valid: boolean; error?: string } {
  const { jumlahBaru, alasan, userRole, userCabangId, targetCabangId } = params;

  if (jumlahBaru < 0) {
    return { valid: false, error: 'Jumlah stok baru tidak boleh negatif' };
  }

  if (!alasan || alasan.trim().length === 0) {
    return { valid: false, error: 'Alasan penyesuaian stok wajib diisi (BR-12)' };
  }

  if (userRole === 'kasir') {
    return { valid: false, error: 'Kasir tidak berwenang menyesuaikan stok cabang ini (BR-12)' };
  }

  if (userRole === 'kepala_toko' && userCabangId !== targetCabangId) {
    return { valid: false, error: 'Kepala toko hanya dapat mengatur stok cabangnya sendiri (BR-12)' };
  }

  return { valid: true };
}

/**
 * BR-10, TC-17: Validate shift verification before calling RPC
 */
export function validateShiftVerification(params: {
  shiftStatus: string;
  userRole: string;
  userCabangId?: string | null;
  shiftCabangId: string;
}): { valid: boolean; error?: string } {
  const { shiftStatus, userRole, userCabangId, shiftCabangId } = params;

  if (shiftStatus !== 'ditutup') {
    return { valid: false, error: 'Hanya shift berstatus ditutup yang dapat diverifikasi (BR-10)' };
  }

  if (userRole === 'kasir') {
    return { valid: false, error: 'Kasir tidak berwenang memverifikasi shift ini (BR-10)' };
  }

  if (userRole === 'kepala_toko' && userCabangId !== shiftCabangId) {
    return { valid: false, error: 'Kepala toko hanya dapat memverifikasi shift di cabangnya (BR-10)' };
  }

  return { valid: true };
}

/**
 * Fetch branch stock with product details
 */
export async function getBranchStock(cabangId?: string): Promise<StockItem[]> {
  const supabase = createClient();
  let query = supabase
    .from('stok_cabang')
    .select(`
      id,
      cabang_id,
      produk_id,
      jumlah,
      stok_minimum,
      diubah_pada,
      produk:produk_id (
        id,
        sku,
        nama,
        kategori,
        harga_jual,
        aktif
      ),
      cabang:cabang_id (
        id,
        kode,
        nama
      )
    `)
    .order('jumlah', { ascending: true });

  if (cabangId && cabangId !== 'all') {
    query = query.eq('cabang_id', cabangId);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching branch stock:', error);
    throw error;
  }

  return (data as unknown as StockItem[]) || [];
}

/**
 * Execute atomic stock adjustment via Supabase RPC
 */
export async function adjustBranchStock(input: StockAdjustmentInput): Promise<{
  success: boolean;
  jumlahBaru?: number;
  message?: string;
}> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc('sesuaikan_stok_cabang', {
    p_cabang_id: input.cabangId,
    p_produk_id: input.produkId,
    p_jumlah_baru: input.jumlahBaru,
    p_alasan: input.alasan.trim(),
  });

  if (error) {
    console.error('Error executing sesuaikan_stok_cabang RPC:', error);
    return { success: false, message: error.message };
  }

  const result = data as { status: string; jumlah_baru?: number };
  return {
    success: result.status === 'success',
    jumlahBaru: result.jumlah_baru,
  };
}

/**
 * Fetch branch shifts for supervision
 */
export async function getBranchShifts(cabangId?: string): Promise<ShiftSupervisionItem[]> {
  const supabase = createClient();
  let query = supabase
    .from('shift_kasir')
    .select(`
      id,
      kasir_id,
      cabang_id,
      waktu_buka,
      waktu_tutup,
      kas_awal,
      total_penjualan_tunai,
      total_penjualan_qris,
      kas_seharusnya,
      kas_aktual,
      selisih,
      catatan_tutup,
      status,
      diverifikasi_oleh,
      diverifikasi_pada,
      catatan_verifikasi,
      kasir:kasir_id (
        id,
        nama_lengkap,
        email
      ),
      cabang:cabang_id (
        id,
        kode,
        nama
      ),
      verifikator:diverifikasi_oleh (
        id,
        nama_lengkap
      )
    `)
    .order('waktu_buka', { ascending: false });

  if (cabangId && cabangId !== 'all') {
    query = query.eq('cabang_id', cabangId);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching branch shifts:', error);
    throw error;
  }

  return (data as unknown as ShiftSupervisionItem[]) || [];
}

/**
 * Execute atomic shift verification via Supabase RPC
 */
export async function verifyBranchShift(input: ShiftVerificationInput): Promise<{
  success: boolean;
  message?: string;
}> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc('verifikasi_shift_kasir', {
    p_shift_id: input.shiftId,
    p_catatan_verifikasi: input.catatanVerifikasi.trim(),
  });

  if (error) {
    console.error('Error executing verifikasi_shift_kasir RPC:', error);
    return { success: false, message: error.message };
  }

  const result = data as { status: string };
  return {
    success: result.status === 'success',
  };
}
