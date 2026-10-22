import { describe, it, expect } from 'vitest';
import {
  validateDiscount,
  validatePayment,
  formatInvoiceNumber,
} from '@/lib/services/checkout-service';

describe('Task 5: Atomic Checkout Business Rules (BR-03, BR-04, BR-05, BR-07)', () => {
  describe('TC-10: Discount Validation (Diskon Maks 10% & Alasan Wajib BR-05)', () => {
    it('should allow 0 discount without reason', () => {
      const res = validateDiscount(100000, 0, null);
      expect(res.valid).toBe(true);
    });

    it('should allow valid discount <= 10% with reason', () => {
      const res = validateDiscount(100000, 10000, 'Promo Member Grand Opening');
      expect(res.valid).toBe(true);
    });

    it('should reject discount > 10% of subtotal', () => {
      const res = validateDiscount(100000, 15000, 'Diskon Spesial');
      expect(res.valid).toBe(false);
      expect(res.errorMessage).toContain('10%');
    });

    it('should reject discount > 0 without reason', () => {
      const res = validateDiscount(100000, 5000, '');
      expect(res.valid).toBe(false);
      expect(res.errorMessage).toContain('Alasan diskon wajib diisi');
    });

    it('should reject negative discount', () => {
      const res = validateDiscount(100000, -5000, 'Salah input');
      expect(res.valid).toBe(false);
      expect(res.errorMessage).toContain('negatif');
    });
  });

  describe('TC-07: Payment & Change Calculation (BR-07)', () => {
    it('should calculate correct change for Cash (Tunai)', () => {
      const res = validatePayment(45000, 'tunai', 50000);
      expect(res.valid).toBe(true);
      expect(res.kembalian).toBe(5000);
    });

    it('should reject Cash payment if uang_diterima < total', () => {
      const res = validatePayment(50000, 'tunai', 40000);
      expect(res.valid).toBe(false);
      expect(res.errorMessage).toContain('kurang');
    });

    it('should require uang_diterima === total for QRIS payment', () => {
      const res = validatePayment(75000, 'qris', 75000);
      expect(res.valid).toBe(true);
      expect(res.kembalian).toBe(0);
    });

    it('should reject QRIS payment if uang_diterima != total', () => {
      const res = validatePayment(75000, 'qris', 100000);
      expect(res.valid).toBe(false);
      expect(res.errorMessage).toContain('sama persis');
    });
  });

  describe('TC-11: Invoice Number Sequential Format (BR-03)', () => {
    it('should format invoice number as KODE-YYYYMMDD-NNNN', () => {
      const invoice = formatInvoiceNumber('TBT', new Date(2026, 9, 21), 1);
      expect(invoice).toBe('TBT-20261021-0001');

      const invoice42 = formatInvoiceNumber('BTR', new Date(2026, 9, 21), 42);
      expect(invoice42).toBe('BTR-20261021-0042');
    });
  });
});
