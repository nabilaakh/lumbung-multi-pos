import { describe, it, expect } from 'vitest';
import {
  isLowStock,
  validateStockAdjustment,
  validateShiftVerification,
  isHighCashVariance,
  formatVarianceDisplay
} from '@/lib/services/stock-service';

describe('Task 8: Stock and Shift Supervision Business Rules', () => {
  describe('Stock minimum & low stock indicators (BR-09, TC-17)', () => {
    it('should flag low stock when quantity is below minimum stock', () => {
      expect(isLowStock(4, 10)).toBe(true);
      expect(isLowStock(0, 5)).toBe(true);
    });

    it('should flag low stock when quantity equals minimum stock', () => {
      expect(isLowStock(10, 10)).toBe(true);
    });

    it('should not flag low stock when quantity exceeds minimum stock', () => {
      expect(isLowStock(15, 10)).toBe(false);
      expect(isLowStock(100, 20)).toBe(false);
    });
  });

  describe('Stock adjustment authorization & validation (BR-12, TC-17)', () => {
    it('should reject adjustment if new quantity is negative', () => {
      const result = validateStockAdjustment({
        jumlahBaru: -5,
        alasan: 'Stock opname rusak',
        userRole: 'kepala_toko',
        userCabangId: 'cabang-tbt',
        targetCabangId: 'cabang-tbt',
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('tidak boleh negatif');
    });

    it('should reject adjustment if reason is empty or whitespace only', () => {
      const result = validateStockAdjustment({
        jumlahBaru: 25,
        alasan: '   ',
        userRole: 'kepala_toko',
        userCabangId: 'cabang-tbt',
        targetCabangId: 'cabang-tbt',
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Alasan penyesuaian stok wajib diisi');
    });

    it('should forbid cashier (kasir) from adjusting stock', () => {
      const result = validateStockAdjustment({
        jumlahBaru: 20,
        alasan: 'Barang baru datang',
        userRole: 'kasir',
        userCabangId: 'cabang-tbt',
        targetCabangId: 'cabang-tbt',
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Kasir tidak berwenang');
    });

    it('should forbid kepala toko from adjusting stock of another branch', () => {
      const result = validateStockAdjustment({
        jumlahBaru: 30,
        alasan: 'Koreksi stok',
        userRole: 'kepala_toko',
        userCabangId: 'cabang-tbt',
        targetCabangId: 'cabang-btr',
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('hanya dapat mengatur stok cabangnya sendiri');
    });

    it('should permit kepala toko adjusting their own branch stock', () => {
      const result = validateStockAdjustment({
        jumlahBaru: 30,
        alasan: 'Barang masuk faktur #123',
        userRole: 'kepala_toko',
        userCabangId: 'cabang-tbt',
        targetCabangId: 'cabang-tbt',
      });
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should permit owner adjusting stock in any branch', () => {
      const result = validateStockAdjustment({
        jumlahBaru: 50,
        alasan: 'Audit stok berkala owner',
        userRole: 'owner',
        userCabangId: null,
        targetCabangId: 'cabang-dpk',
      });
      expect(result.valid).toBe(true);
    });
  });

  describe('Shift verification authorization & lifecycle (BR-10, TC-17)', () => {
    it('should reject shift verification if shift is still open (buka)', () => {
      const result = validateShiftVerification({
        shiftStatus: 'buka',
        userRole: 'kepala_toko',
        userCabangId: 'cabang-tbt',
        shiftCabangId: 'cabang-tbt',
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Hanya shift berstatus ditutup');
    });

    it('should reject shift verification if shift is already verified (diverifikasi)', () => {
      const result = validateShiftVerification({
        shiftStatus: 'diverifikasi',
        userRole: 'kepala_toko',
        userCabangId: 'cabang-tbt',
        shiftCabangId: 'cabang-tbt',
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Hanya shift berstatus ditutup');
    });

    it('should forbid cashier from verifying shift', () => {
      const result = validateShiftVerification({
        shiftStatus: 'ditutup',
        userRole: 'kasir',
        userCabangId: 'cabang-tbt',
        shiftCabangId: 'cabang-tbt',
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Kasir tidak berwenang');
    });

    it('should forbid kepala toko from verifying shift in another branch', () => {
      const result = validateShiftVerification({
        shiftStatus: 'ditutup',
        userRole: 'kepala_toko',
        userCabangId: 'cabang-tbt',
        shiftCabangId: 'cabang-btr',
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('hanya dapat memverifikasi shift di cabangnya');
    });

    it('should permit kepala toko verifying closed shift in their own branch', () => {
      const result = validateShiftVerification({
        shiftStatus: 'ditutup',
        userRole: 'kepala_toko',
        userCabangId: 'cabang-tbt',
        shiftCabangId: 'cabang-tbt',
      });
      expect(result.valid).toBe(true);
    });

    it('should permit owner verifying closed shift in any branch', () => {
      const result = validateShiftVerification({
        shiftStatus: 'ditutup',
        userRole: 'owner',
        userCabangId: null,
        shiftCabangId: 'cabang-dpk',
      });
      expect(result.valid).toBe(true);
    });
  });

  describe('High cash variance alerts & formatting (|selisih| > 20000)', () => {
    it('should correctly flag variance greater than 20,000 as high variance', () => {
      expect(isHighCashVariance(25000)).toBe(true);
      expect(isHighCashVariance(-25000)).toBe(true);
      expect(isHighCashVariance(20001)).toBe(true);
      expect(isHighCashVariance(-20001)).toBe(true);
    });

    it('should not flag variance within 20,000 threshold', () => {
      expect(isHighCashVariance(0)).toBe(false);
      expect(isHighCashVariance(20000)).toBe(false);
      expect(isHighCashVariance(-20000)).toBe(false);
      expect(isHighCashVariance(5000)).toBe(false);
      expect(isHighCashVariance(-5000)).toBe(false);
    });

    it('should format variance display with + or - and status label', () => {
      expect(formatVarianceDisplay(15000).label).toBe('Lebih');
      expect(formatVarianceDisplay(-30000).label).toBe('Kurang');
      expect(formatVarianceDisplay(0).label).toBe('Sesuai');
    });
  });
});
