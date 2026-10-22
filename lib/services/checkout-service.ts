import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, MetodeBayar } from '@/types/database';

export interface ValidationResult {
  valid: boolean;
  errorMessage: string | null;
}

export interface PaymentValidationResult extends ValidationResult {
  kembalian: number;
}

export interface CheckoutItemPayload {
  produk_id: string;
  jumlah: number;
}

export interface CheckoutRPCResponse {
  transaksi_id: string;
  nomor_struk: string;
  subtotal: number;
  diskon: number;
  total: number;
  metode_bayar: MetodeBayar;
  uang_diterima: number;
  kembalian: number;
  dibuat_pada: string;
}

/**
 * Validasi Diskon (BR-05: Diskon maks 10% subtotal dan wajib alasan jika > 0)
 */
export function validateDiscount(
  subtotal: number,
  diskon: number,
  alasanDiskon?: string | null
): ValidationResult {
  if (isNaN(diskon) || diskon < 0) {
    return {
      valid: false,
      errorMessage: 'Diskon tidak boleh bernilai negatif.',
    };
  }

  const maxDiscount = Math.floor(subtotal * 0.10);
  if (diskon > maxDiscount) {
    return {
      valid: false,
      errorMessage: `Diskon tidak boleh melebihi 10% dari subtotal (Maksimal Rp${maxDiscount.toLocaleString('id-ID')}).`,
    };
  }

  if (diskon > 0 && (!alasanDiskon || alasanDiskon.trim().length === 0)) {
    return {
      valid: false,
      errorMessage: 'Alasan diskon wajib diisi jika diskon lebih dari Rp0.',
    };
  }

  return {
    valid: true,
    errorMessage: null,
  };
}

/**
 * Validasi Pembayaran & Hitung Kembalian (BR-07)
 */
export function validatePayment(
  total: number,
  metodeBayar: MetodeBayar,
  uangDiterima: number
): PaymentValidationResult {
  if (isNaN(uangDiterima) || uangDiterima < 0) {
    return {
      valid: false,
      errorMessage: 'Nominal pembayaran tidak valid.',
      kembalian: 0,
    };
  }

  if (metodeBayar === 'tunai') {
    if (uangDiterima < total) {
      return {
        valid: false,
        errorMessage: `Uang tunai yang diterima kurang Rp${(total - uangDiterima).toLocaleString('id-ID')}.`,
        kembalian: 0,
      };
    }

    return {
      valid: true,
      errorMessage: null,
      kembalian: uangDiterima - total,
    };
  }

  // Metode QRIS: Uang diterima harus sama persis dengan total tagihan
  if (uangDiterima !== total) {
    return {
      valid: false,
      errorMessage: 'Pembayaran QRIS harus sama persis dengan total transaksi.',
      kembalian: 0,
    };
  }

  return {
    valid: true,
    errorMessage: null,
    kembalian: 0,
  };
}

/**
 * Format nomor struk KODE-YYYYMMDD-NNNN (BR-03)
 */
export function formatInvoiceNumber(kodeCabang: string, date: Date, counter: number): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const nnnn = String(counter).padStart(4, '0');
  return `${kodeCabang}-${yyyy}${mm}${dd}-${nnnn}`;
}

/**
 * Format mata uang Rupiah
 */
export function formatCurrency(amount: number): string {
  return `Rp${Math.round(amount).toLocaleString('id-ID')}`;
}

/**
 * Eksekusi checkout transaksi atomik melalui Stored Procedure PostgreSQL
 */
export async function executeCheckoutRPC(
  supabase: SupabaseClient<Database>,
  params: {
    shiftId: string;
    items: CheckoutItemPayload[];
    diskon: number;
    alasanDiskon?: string | null;
    metodeBayar: MetodeBayar;
    uangDiterima: number;
  }
): Promise<{ data: CheckoutRPCResponse | null; error: string | null }> {
  try {
    const { data, error } = await supabase.rpc('proses_checkout_transaksi', {
      p_shift_id: params.shiftId,
      p_items: params.items as any,
      p_diskon: Math.round(params.diskon),
      p_alasan_diskon: params.alasanDiskon?.trim() || '',
      p_metode_bayar: params.metodeBayar,
      p_uang_diterima: Math.round(params.uangDiterima),
    });

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as unknown as CheckoutRPCResponse, error: null };
  } catch (err: any) {
    return { data: null, error: err.message || 'Terjadi kesalahan sistem saat checkout.' };
  }
}
