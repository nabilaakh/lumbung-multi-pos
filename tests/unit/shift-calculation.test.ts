import { describe, it, expect } from 'vitest';
import {
  validateOpeningCash,
  calculateShiftCashExpected,
  calculateShiftVariance,
  validateCloseShift,
} from '@/lib/services/shift-service';

describe('Task 4: Cashier Shift Management Rules (BR-02, BR-09, BR-10)', () => {
  describe('TC-04: Opening Cash Validation (Kas Awal BR-02)', () => {
    it('should accept valid opening cash between Rp0 and Rp2.000.000', () => {
      expect(validateOpeningCash(0).valid).toBe(true);
      expect(validateOpeningCash(500000).valid).toBe(true);
      expect(validateOpeningCash(2000000).valid).toBe(true);
    });

    it('should reject negative opening cash', () => {
      const res = validateOpeningCash(-1000);
      expect(res.valid).toBe(false);
      expect(res.errorMessage).toContain('tidak boleh negatif');
    });

    it('should reject opening cash exceeding Rp2.000.000', () => {
      const res = validateOpeningCash(2500000);
      expect(res.valid).toBe(false);
      expect(res.errorMessage).toContain('Rp2.000.000');
    });
  });

  describe('Expected Cash Calculation (Kas Seharusnya)', () => {
    it('should accurately calculate kas_seharusnya = kas_awal + total_tunai_lunas', () => {
      const kasAwal = 500000;
      const totalTunai = 350000; // Hanya tunai lunas
      const expected = calculateShiftCashExpected(kasAwal, totalTunai);
      expect(expected).toBe(850000);
    });
  });

  describe('TC-16: Cash Reconciliation & Variance Note Rule (BR-09)', () => {
    it('should calculate variance as uang_fisik - kas_seharusnya', () => {
      expect(calculateShiftVariance(850000, 850000)).toBe(0);
      expect(calculateShiftVariance(845000, 850000)).toBe(-5000); // tekor 5rb
      expect(calculateShiftVariance(860000, 850000)).toBe(10000); // lebih 10rb
    });

    it('should allow closing shift without notes if variance <= Rp20.000', () => {
      const kasSeharusnya = 850000;
      const uangFisik = 845000; // selisih -5000 <= 20000
      const validation = validateCloseShift(uangFisik, kasSeharusnya, '');
      expect(validation.valid).toBe(true);
    });

    it('should reject closing shift without notes if variance exceeds Rp20.000 (negative variance)', () => {
      const kasSeharusnya = 850000;
      const uangFisik = 815000; // selisih -35000 > 20000
      const validation = validateCloseShift(uangFisik, kasSeharusnya, '');
      expect(validation.valid).toBe(false);
      expect(validation.errorMessage).toContain('catatan');
    });

    it('should accept closing shift if variance exceeds Rp20.000 when note is provided', () => {
      const kasSeharusnya = 850000;
      const uangFisik = 815000; // selisih -35000
      const note = 'Kembalian ke pelanggan kemungkinan salah hitung';
      const validation = validateCloseShift(uangFisik, kasSeharusnya, note);
      expect(validation.valid).toBe(true);
    });
  });
});
