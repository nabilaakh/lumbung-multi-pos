import { describe, it, expect } from 'vitest';
import {
  filterProductForRole,
  canSellProduct,
  isValidCategory,
  PRODUCT_CATEGORIES,
  type ProductWithCost,
} from '@/lib/services/product-service';

describe('Task 9: Product Management & Cost Privacy Rules (BR-01, BR-11, TC-09, TC-18)', () => {
  const sampleProduct: ProductWithCost = {
    id: 'prod-123',
    sku: 'KOP-001',
    nama: 'Espresso Single',
    kategori: 'kopi',
    harga_jual: 18000,
    aktif: true,
    lacak_stok: true,
    dibuat_pada: '2026-10-01T00:00:00Z',
    diubah_pada: '2026-10-01T00:00:00Z',
    harga_modal_terakhir: 7500,
    riwayat_harga_modal: [
      {
        id: 'c-1',
        harga_modal: 7000,
        berlaku_mulai: '2026-09-01T00:00:00Z',
        dibuat_pada: '2026-09-01T00:00:00Z',
      },
      {
        id: 'c-2',
        harga_modal: 7500,
        berlaku_mulai: '2026-10-01T00:00:00Z',
        dibuat_pada: '2026-10-01T00:00:00Z',
      },
    ],
  };

  describe('Cost Price Confidentiality (BR-11, TC-09, TC-18)', () => {
    it('should completely strip cost prices and history for kepala_toko', () => {
      const sanitized = filterProductForRole(sampleProduct, 'kepala_toko');

      expect(sanitized.harga_modal_terakhir).toBeUndefined();
      expect(sanitized.riwayat_harga_modal).toBeUndefined();
      expect(sanitized.nama).toBe('Espresso Single');
      expect(sanitized.harga_jual).toBe(18000);
    });

    it('should completely strip cost prices and history for kasir', () => {
      const sanitized = filterProductForRole(sampleProduct, 'kasir');

      expect(sanitized.harga_modal_terakhir).toBeUndefined();
      expect(sanitized.riwayat_harga_modal).toBeUndefined();
    });

    it('should preserve cost prices and history for owner', () => {
      const allowed = filterProductForRole(sampleProduct, 'owner');

      expect(allowed.harga_modal_terakhir).toBe(7500);
      expect(allowed.riwayat_harga_modal).toBeDefined();
      expect(allowed.riwayat_harga_modal?.length).toBe(2);
      expect(allowed.riwayat_harga_modal?.[1].harga_modal).toBe(7500);
    });
  });

  describe('Inactive product validation (BR-01, TC-09)', () => {
    it('should not allow an inactive product to be sold', () => {
      const inactiveProduct: ProductWithCost = {
        ...sampleProduct,
        aktif: false,
      };

      expect(canSellProduct(inactiveProduct)).toBe(false);
    });

    it('should allow an active product to be sold', () => {
      expect(canSellProduct(sampleProduct)).toBe(true);
    });
  });

  describe('Product category taxonomy (BR-01)', () => {
    it('should enforce exactly 5 business categories', () => {
      expect(PRODUCT_CATEGORIES).toEqual(['kopi', 'non_kopi', 'roti', 'snack', 'kemasan']);
    });

    it('should validate valid categories correctly', () => {
      expect(isValidCategory('kopi')).toBe(true);
      expect(isValidCategory('non_kopi')).toBe(true);
      expect(isValidCategory('roti')).toBe(true);
      expect(isValidCategory('snack')).toBe(true);
      expect(isValidCategory('kemasan')).toBe(true);
    });

    it('should reject non-standard categories', () => {
      expect(isValidCategory('makanan_berat')).toBe(false);
      expect(isValidCategory('minuman')).toBe(false);
      expect(isValidCategory('')).toBe(false);
    });
  });
});
