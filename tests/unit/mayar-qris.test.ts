import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  isMayarMockMode,
  createMayarInvoice,
  getMayarInvoiceDetail,
  setMockInvoiceStatus,
} from '@/lib/services/mayar-service';
import { closeShift, countPendingShiftTransactions } from '@/lib/services/shift-service';

describe('Mayar QRIS Service & Business Rules (PRD Bagian 11)', () => {
  const originalKey = process.env.MAYAR_API_KEY;

  describe('Mayar Helper & Mock Fallback Mechanism', () => {
    beforeEach(() => {
      process.env.MAYAR_API_KEY = 'dummy_key';
    });

    afterEach(() => {
      if (originalKey !== undefined) {
        process.env.MAYAR_API_KEY = originalKey;
      } else {
        delete process.env.MAYAR_API_KEY;
      }
    });

    it('should detect mock mode when MAYAR_API_KEY is not set or contains dummy', () => {
      expect(isMayarMockMode()).toBe(true);
    });

    it('should create valid mock invoice with 10-minute expiry when in mock mode', async () => {
      const res = await createMayarInvoice({
        amount: 35000,
        invoiceNumber: 'TBT-20261024-0001',
        description: 'Pembayaran POS Lumbung #TBT-20261024-0001',
        items: [
          { description: 'Kopi Susu Lumbung', quantity: 1, rate: 20000 },
          { description: 'Roti Srikaya', quantity: 1, rate: 15000 },
        ],
      });

      expect(res.isMock).toBe(true);
      expect(res.invoiceId).toMatch(/^inv_mock_/);
      expect(res.status).toBe('unpaid');
      expect(res.paymentUrl).toContain(res.invoiceId);
      expect(res.qrCodeUrl).toBeDefined();

      const expDate = new Date(res.expiredAt).getTime();
      const now = Date.now();
      // Verifikasi waktu expiry ~10 menit (antara 9.5 s.d 10.5 menit dari sekarang)
      expect(expDate - now).toBeGreaterThanOrEqual(9 * 60 * 1000);
      expect(expDate - now).toBeLessThanOrEqual(11 * 60 * 1000);
    });

    it('should allow querying mock invoice detail and simulate payment state transition', async () => {
      const created = await createMayarInvoice({
        amount: 25000,
        invoiceNumber: 'TBT-20261024-0002',
        description: 'Testing detail',
        items: [{ description: 'Americano', quantity: 1, rate: 25000 }],
      });

      const initialDetail = await getMayarInvoiceDetail(created.invoiceId);
      expect(initialDetail).not.toBeNull();
      expect(initialDetail?.status).toBe('unpaid');

      // Simulasi pelunasan (mock pay)
      setMockInvoiceStatus(created.invoiceId, 'paid');

      const updatedDetail = await getMayarInvoiceDetail(created.invoiceId);
      expect(updatedDetail?.status).toBe('paid');
    });
  });

  describe('PRD 11.5: Shift Closure Blocked When Pending Transactions Exist', () => {
    it('should block shift closure if count of menunggu_bayar transactions > 0', async () => {
      // Mock Supabase client yang mensimulasikan adanya 1 transaksi menggantung
      const mockSupabase: any = {
        from: (table: string) => {
          if (table === 'shift_kasir') {
            return {
              select: () => ({
                eq: () => ({
                  single: async () => ({
                    data: {
                      id: 'shift-123',
                      status: 'buka',
                      kas_awal: 100000,
                    },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'transaksi') {
            return {
              select: (_cols: any, options: any) => ({
                eq: (_col1: string, _val1: any) => ({
                  eq: (_col2: string, val2: any) => {
                    if (val2 === 'menunggu_bayar') {
                      return Promise.resolve({
                        count: 2,
                        error: null,
                      });
                    }
                    return Promise.resolve({
                      data: [],
                      error: null,
                    });
                  },
                }),
              }),
            };
          }
          return {};
        },
      };

      const pendingCount = await countPendingShiftTransactions(mockSupabase, 'shift-123');
      expect(pendingCount).toBe(2);

      const result = await closeShift(mockSupabase, {
        shiftId: 'shift-123',
        uangFisik: 100000,
      });

      expect(result.data).toBeNull();
      expect(result.error).toContain('menunggu pembayaran');
      expect(result.error).toContain('PRD Bagian 11.5');
    });
  });
});
