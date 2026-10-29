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
  } | null;
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
  dibuka_pada: string;
  ditutup_pada: string | null;
  waktu_buka: string;
  waktu_tutup: string | null;
  kas_awal: number;
  total_tunai: number;
  total_qris: number;
  total_penjualan_tunai: number;
  total_penjualan_qris: number;
  kas_seharusnya: number;
  uang_fisik: number | null;
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

export type StockAdjustmentMode = 'tambah' | 'kurang' | 'opname';

export const STOCK_ADJUSTMENT_TYPE_LABELS = {
  tambah: 'Barang Masuk',
  kurang: 'Barang Rusak',
  opname: 'Stock Opname',
} as const;

export type StockAdjustmentType = (typeof STOCK_ADJUSTMENT_TYPE_LABELS)[keyof typeof STOCK_ADJUSTMENT_TYPE_LABELS];

export interface StockAdjustmentInput {
  cabangId: string;
  produkId: string;
  jumlahBaru: number;
  alasan: string;
  tipe?: StockAdjustmentType | string;
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

  const rawAlasan = alasan ? alasan.trim() : '';
  const coreReason = rawAlasan.replace(/^\[[^\]]+\]\s*/, '').trim();

  if (!rawAlasan || rawAlasan.length < 5 || (rawAlasan.startsWith('[') && coreReason.length < 5)) {
    return { valid: false, error: 'Alasan penyesuaian stok wajib diisi minimal 5 karakter' };
  }

  if (userRole === 'kasir') {
    return { valid: false, error: 'Kasir tidak berwenang menyesuaikan stok cabang ini' };
  }

  if (userRole === 'kepala_toko' && userCabangId !== targetCabangId) {
    return { valid: false, error: 'Kepala toko hanya dapat mengatur stok cabangnya sendiri' };
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
    return { valid: false, error: 'Hanya shift berstatus ditutup yang dapat diverifikasi' };
  }

  if (userRole === 'kasir') {
    return { valid: false, error: 'Kasir tidak berwenang memverifikasi shift ini' };
  }

  if (userRole === 'kepala_toko' && userCabangId !== shiftCabangId) {
    return { valid: false, error: 'Kepala toko hanya dapat memverifikasi shift di cabangnya' };
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
    console.error('Error fetching branch stock:', error.message, error);
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
  const rawAlasan = input.alasan ? input.alasan.trim() : '';
  const coreReason = rawAlasan.replace(/^\[[^\]]+\]\s*/, '').trim();

  if (!rawAlasan || rawAlasan.length < 5 || (rawAlasan.startsWith('[') && coreReason.length < 5)) {
    return {
      success: false,
      message: 'Alasan penyesuaian stok wajib diisi minimal 5 karakter',
    };
  }

  let finalAlasan = rawAlasan;
  if (input.tipe && !rawAlasan.startsWith(`[${input.tipe}]`)) {
    finalAlasan = `[${input.tipe}] ${coreReason}`;
  }

  const supabase = createClient();

  const { data, error } = await supabase.rpc('sesuaikan_stok_cabang', {
    p_cabang_id: input.cabangId,
    p_produk_id: input.produkId,
    p_jumlah_baru: input.jumlahBaru,
    p_alasan: finalAlasan.trim(),
  });

  if (error) {
    console.error('Error executing sesuaikan_stok_cabang RPC:', error.message, error);
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
      dibuka_pada,
      ditutup_pada,
      kas_awal,
      total_tunai,
      total_qris,
      kas_seharusnya,
      uang_fisik,
      selisih,
      catatan_tutup,
      status,
      diverifikasi_oleh,
      diverifikasi_pada,
      catatan_verifikasi,
      kasir:profiles!shift_kasir_kasir_id_fkey (
        id,
        nama_lengkap,
        email
      ),
      cabang:cabang_id (
        id,
        kode,
        nama
      ),
      verifikator:profiles!shift_kasir_diverifikasi_oleh_fkey (
        id,
        nama_lengkap
      )
    `)
    .order('dibuka_pada', { ascending: false });

  if (cabangId && cabangId !== 'all') {
    query = query.eq('cabang_id', cabangId);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching branch shifts:', error.message, error);
    throw error;
  }

  // Map to ShiftSupervisionItem ensuring both schema column names and frontend aliases are populated
  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (data as any[])?.map((s) => ({
      ...s,
      waktu_buka: s.dibuka_pada,
      waktu_tutup: s.ditutup_pada,
      total_penjualan_tunai: s.total_tunai,
      total_penjualan_qris: s.total_qris,
      kas_aktual: s.uang_fisik,
    })) || []
  );
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
    console.error('Error executing verifikasi_shift_kasir RPC:', error.message, error);
    return { success: false, message: error.message };
  }

  const result = data as { status: string };
  return {
    success: result.status === 'success',
  };
}
