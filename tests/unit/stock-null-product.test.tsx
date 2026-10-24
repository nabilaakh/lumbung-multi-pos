import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StockTable } from '@/components/stock/StockTable';
import { StockAdjustmentModal } from '@/components/stock/StockAdjustmentModal';
import type { StockItem } from '@/lib/services/stock-service';

// Simulates a stock row whose product is hidden by RLS (e.g. an inactive product).
const itemWithoutProduct: StockItem = {
  id: 'stock-1',
  cabang_id: 'cabang-1',
  produk_id: 'produk-1',
  jumlah: 0,
  stok_minimum: 0,
  diubah_pada: '2026-10-15T00:00:00Z',
  produk: null,
  cabang: {
    id: 'cabang-1',
    kode: 'TBT',
    nama: 'Lumbung Tebet',
  },
};

describe('Stock UI when product details are unavailable', () => {
  it('does not offer stock adjustment for a row without product details', () => {
    render(
      <StockTable
        stockList={[itemWithoutProduct]}
        userRole="kepala_toko"
        userCabangId="cabang-1"
        cabangList={[{ id: 'cabang-1', kode: 'TBT', nama: 'Lumbung Tebet' }]}
        onRefresh={vi.fn()}
      />
    );

    expect(screen.queryByRole('button', { name: /sesuaikan/i })).toBeNull();
    expect(screen.getAllByText(/tidak tersedia/i).length).toBeGreaterThan(0);
  });

  it('renders the adjustment modal without crashing and disables submission', () => {
    render(
      <StockAdjustmentModal
        isOpen
        onClose={vi.fn()}
        item={itemWithoutProduct}
        onSuccess={vi.fn()}
        userRole="kepala_toko"
        userCabangId="cabang-1"
      />
    );

    expect(screen.getAllByText(/tidak tersedia/i).length).toBeGreaterThan(0);
    expect(
      (screen.getByRole('button', { name: /simpan penyesuaian/i }) as HTMLButtonElement).disabled
    ).toBe(true);
  });
});
