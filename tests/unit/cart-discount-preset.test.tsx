import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CartPanel, CartItem } from '@/components/pos/CartPanel';

describe('CartPanel Quick Discount Presets (BR-05)', () => {
  const sampleCart: CartItem[] = [
    {
      product: {
        id: 'prod-1',
        sku: 'SKU01',
        nama: 'Kopi Susu Aren',
        kategori: 'minuman',
        harga_jual: 20000,
        lacak_stok: true,
        stok_tersedia: 50,
        aktif: true,
        dibuat_pada: '2026-10-20T00:00:00Z',
        diubah_pada: '2026-10-20T00:00:00Z',
      },
      jumlah: 2, // Subtotal = 40,000
    },
    {
      product: {
        id: 'prod-2',
        sku: 'SKU02',
        nama: 'Roti Bakar',
        kategori: 'makanan',
        harga_jual: 15000,
        lacak_stok: true,
        stok_tersedia: 20,
        aktif: true,
        dibuat_pada: '2026-10-20T00:00:00Z',
        diubah_pada: '2026-10-20T00:00:00Z',
      },
      jumlah: 1, // Subtotal = 15,000. Total Subtotal = 55,000
    },
  ];

  it('renders quick discount preset buttons [0%] / Reset, [5%], [10%]', () => {
    render(
      <CartPanel
        cart={sampleCart}
        onUpdateQuantity={vi.fn()}
        onRemoveItem={vi.fn()}
        onClearCart={vi.fn()}
        onProceedToPayment={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /\[0%\] \/ Reset/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /\[5%\]/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /\[10%\]/i })).toBeDefined();
  });

  it('calculates 5% discount (Math.floor(0.05 * subtotal)) and auto-fills reason when [5%] is clicked', () => {
    render(
      <CartPanel
        cart={sampleCart}
        onUpdateQuantity={vi.fn()}
        onRemoveItem={vi.fn()}
        onClearCart={vi.fn()}
        onProceedToPayment={vi.fn()}
      />
    );

    // Subtotal = 55,000 -> 5% = 2,750
    fireEvent.click(screen.getByRole('button', { name: /\[5%\]/i }));

    const diskonInput = screen.getByPlaceholderText(/Nominal Rp/i) as HTMLInputElement;
    const alasanInput = screen.getByPlaceholderText(/Alasan Diskon/i) as HTMLInputElement;

    expect(diskonInput.value).toBe('2750');
    expect(alasanInput.value).toBe('Diskon Promo 5%');
  });

  it('calculates 10% discount (Math.floor(0.10 * subtotal)) and auto-fills reason when [10%] is clicked', () => {
    render(
      <CartPanel
        cart={sampleCart}
        onUpdateQuantity={vi.fn()}
        onRemoveItem={vi.fn()}
        onClearCart={vi.fn()}
        onProceedToPayment={vi.fn()}
      />
    );

    // Subtotal = 55,000 -> 10% = 5,500
    fireEvent.click(screen.getByRole('button', { name: /\[10%\]/i }));

    const diskonInput = screen.getByPlaceholderText(/Nominal Rp/i) as HTMLInputElement;
    const alasanInput = screen.getByPlaceholderText(/Alasan Diskon/i) as HTMLInputElement;

    expect(diskonInput.value).toBe('5500');
    expect(alasanInput.value).toBe('Diskon Promo 10%');
  });

  it('resets discount to 0 and clears reason when [0%] / Reset is clicked', () => {
    render(
      <CartPanel
        cart={sampleCart}
        onUpdateQuantity={vi.fn()}
        onRemoveItem={vi.fn()}
        onClearCart={vi.fn()}
        onProceedToPayment={vi.fn()}
      />
    );

    // Apply 10% first
    fireEvent.click(screen.getByRole('button', { name: /\[10%\]/i }));
    // Then reset
    fireEvent.click(screen.getByRole('button', { name: /\[0%\] \/ Reset/i }));

    const diskonInput = screen.getByPlaceholderText(/Nominal Rp/i) as HTMLInputElement;
    const alasanInput = screen.getByPlaceholderText(/Alasan Diskon/i) as HTMLInputElement;

    expect(diskonInput.value).toBe('0');
    expect(alasanInput.value).toBe('');
  });

  it('automatically recalculates active preset discount when cart items change', () => {
    const { rerender } = render(
      <CartPanel
        cart={sampleCart} // Subtotal = 55,000
        onUpdateQuantity={vi.fn()}
        onRemoveItem={vi.fn()}
        onClearCart={vi.fn()}
        onProceedToPayment={vi.fn()}
      />
    );

    // Activate 10% preset (5,500)
    fireEvent.click(screen.getByRole('button', { name: /\[10%\]/i }));
    const diskonInput = screen.getByPlaceholderText(/Nominal Rp/i) as HTMLInputElement;
    expect(diskonInput.value).toBe('5500');

    // Simulate adding 1 more Kopi Susu Aren (+20,000, new subtotal = 75,000)
    const updatedCart: CartItem[] = [
      {
        ...sampleCart[0],
        jumlah: 3, // 3 * 20,000 = 60,000 + 15,000 = 75,000
      },
      sampleCart[1],
    ];

    rerender(
      <CartPanel
        cart={updatedCart}
        onUpdateQuantity={vi.fn()}
        onRemoveItem={vi.fn()}
        onClearCart={vi.fn()}
        onProceedToPayment={vi.fn()}
      />
    );

    // 10% of 75,000 should now be 7,500 automatically!
    expect(diskonInput.value).toBe('7500');
  });
});
