import { describe, it, expect } from 'vitest';
import {
  calculateReportKpi,
  calculatePaymentBreakdown,
  calculateTopProducts,
  calculateProfitMetrics,
  type ReportTransactionItem,
  type ReportTransactionRecord,
  type CostReference,
} from '@/lib/services/report-service';

describe('Task 10: Reports & Analytics Calculation (BR-01, BR-09, BR-11, TC-02, TC-18)', () => {
  const sampleTransactions: ReportTransactionRecord[] = [
    {
      id: 'trx-1',
      cabang_id: 'cabang-tbt',
      total: 50000,
      subtotal: 50000,
      diskon: 0,
      metode_bayar: 'tunai',
      status: 'lunas',
      dibuat_pada: '2026-10-20T08:00:00Z',
    },
    {
      id: 'trx-2',
      cabang_id: 'cabang-tbt',
      total: 30000,
      subtotal: 30000,
      diskon: 0,
      metode_bayar: 'qris',
      status: 'lunas',
      dibuat_pada: '2026-10-20T09:00:00Z',
    },
    {
      id: 'trx-3',
      cabang_id: 'cabang-btr',
      total: 20000,
      subtotal: 20000,
      diskon: 0,
      metode_bayar: 'tunai',
      status: 'lunas',
      dibuat_pada: '2026-10-20T10:00:00Z',
    },
    {
      id: 'trx-4',
      cabang_id: 'cabang-tbt',
      total: 25000,
      subtotal: 25000,
      diskon: 0,
      metode_bayar: 'tunai',
      status: 'void',
      dibuat_pada: '2026-10-20T11:00:00Z',
    },
  ];

  const sampleItems: ReportTransactionItem[] = [
    {
      id: 'item-1',
      transaksi_id: 'trx-1',
      produk_id: 'p-espresso',
      nama_produk: 'Espresso Single',
      jumlah: 2,
      harga_satuan: 18000,
      subtotal: 36000,
    },
    {
      id: 'item-2',
      transaksi_id: 'trx-1',
      produk_id: 'p-croissant',
      nama_produk: 'Butter Croissant',
      jumlah: 1,
      harga_satuan: 14000,
      subtotal: 14000,
    },
    {
      id: 'item-3',
      transaksi_id: 'trx-2',
      produk_id: 'p-espresso',
      nama_produk: 'Espresso Single',
      jumlah: 1,
      harga_satuan: 18000,
      subtotal: 18000,
    },
    {
      id: 'item-4',
      transaksi_id: 'trx-2',
      produk_id: 'p-air',
      nama_produk: 'Mineral Water',
      jumlah: 2,
      harga_satuan: 6000,
      subtotal: 12000,
    },
    {
      id: 'item-5',
      transaksi_id: 'trx-3',
      produk_id: 'p-croissant',
      nama_produk: 'Butter Croissant',
      jumlah: 1,
      harga_satuan: 14000,
      subtotal: 14000,
    },
    // Item from void transaction should NOT be counted in sales!
    {
      id: 'item-6',
      transaksi_id: 'trx-4',
      produk_id: 'p-espresso',
      nama_produk: 'Espresso Single',
      jumlah: 1,
      harga_satuan: 18000,
      subtotal: 18000,
    },
  ];

  const sampleCostPrices: CostReference[] = [
    { produk_id: 'p-espresso', harga_modal: 7500 },
    { produk_id: 'p-croissant', harga_modal: 6000 },
    { produk_id: 'p-air', harga_modal: 2500 },
  ];

  describe('KPI Summary Metrics (TC-02)', () => {
    it('should aggregate omzet, transaction count, AOV, and void stats correctly', () => {
      const kpi = calculateReportKpi(sampleTransactions);

      // Omzet only from 'lunas' = 50000 + 30000 + 20000 = 100000
      expect(kpi.totalRevenue).toBe(100000);
      expect(kpi.totalTransactions).toBe(3);
      expect(kpi.averageOrderValue).toBe(Math.round(100000 / 3));

      // Void stats
      expect(kpi.voidCount).toBe(1);
      expect(kpi.voidAmount).toBe(25000);
    });

    it('should handle empty transaction list safely', () => {
      const kpi = calculateReportKpi([]);
      expect(kpi.totalRevenue).toBe(0);
      expect(kpi.totalTransactions).toBe(0);
      expect(kpi.averageOrderValue).toBe(0);
      expect(kpi.voidCount).toBe(0);
      expect(kpi.voidAmount).toBe(0);
    });
  });

  describe('Payment Method Split (Tunai vs QRIS)', () => {
    it('should calculate cash and QRIS ratios accurately', () => {
      const split = calculatePaymentBreakdown(sampleTransactions);

      // Tunai lunas: trx-1 (50000) + trx-3 (20000) = 70000
      // QRIS lunas: trx-2 (30000)
      // Total lunas: 100000
      expect(split.tunaiAmount).toBe(70000);
      expect(split.tunaiCount).toBe(2);
      expect(split.tunaiPercentage).toBe(70);

      expect(split.qrisAmount).toBe(30000);
      expect(split.qrisCount).toBe(1);
      expect(split.qrisPercentage).toBe(30);
    });
  });

  describe('Top Selling Products Ranking', () => {
    it('should rank products by quantity sold excluding void transactions', () => {
      const validTransactionIds = new Set(['trx-1', 'trx-2', 'trx-3']);
      const ranking = calculateTopProducts(sampleItems, validTransactionIds);

      // Espresso: 2 + 1 = 3 units
      // Butter Croissant: 1 + 1 = 2 units
      // Mineral Water: 2 units
      expect(ranking[0].nama_produk).toBe('Espresso Single');
      expect(ranking[0].totalJumlah).toBe(3);
      expect(ranking[0].totalSubtotal).toBe(54000);

      // Check void item (item-6) is excluded
      const espressoTotalQty = ranking.find((p) => p.produk_id === 'p-espresso')?.totalJumlah;
      expect(espressoTotalQty).toBe(3); // Not 4
    });
  });

  describe('Gross Profit & Margin Protection (BR-11, TC-18)', () => {
    it('should strictly return null if requested by kepala_toko or kasir', () => {
      const validTransactionIds = new Set(['trx-1', 'trx-2', 'trx-3']);
      const ktProfit = calculateProfitMetrics(
        sampleItems,
        validTransactionIds,
        sampleCostPrices,
        'kepala_toko'
      );
      const kasirProfit = calculateProfitMetrics(
        sampleItems,
        validTransactionIds,
        sampleCostPrices,
        'kasir'
      );

      expect(ktProfit).toBeNull();
      expect(kasirProfit).toBeNull();
    });

    it('should calculate gross profit and margin for owner correctly', () => {
      const validTransactionIds = new Set(['trx-1', 'trx-2', 'trx-3']);
      const profit = calculateProfitMetrics(
        sampleItems,
        validTransactionIds,
        sampleCostPrices,
        'owner'
      );

      expect(profit).not.toBeNull();
      if (!profit) return;

      // Revenue: 54000 (Espresso) + 28000 (Croissant) + 12000 (Air) = 94000
      // COGS (HPP):
      // - Espresso: 3 * 7500 = 22500
      // - Croissant: 2 * 6000 = 12000
      // - Air: 2 * 2500 = 5000
      // Total HPP = 39500
      // Gross Profit = 94000 - 39500 = 54500
      // Margin = (54500 / 94000) * 100 = 57.98%
      expect(profit.totalRevenue).toBe(94000);
      expect(profit.totalHpp).toBe(39500);
      expect(profit.grossProfit).toBe(54500);
      expect(profit.profitMarginPercent).toBeCloseTo(57.98, 1);
    });
  });
});
