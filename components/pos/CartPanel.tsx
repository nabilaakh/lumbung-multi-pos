'use client';

import React, { useState } from 'react';
import type { ProductWithStock } from './ProductCatalog';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  Percent,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';

export interface CartItem {
  product: ProductWithStock;
  jumlah: number;
}

interface CartPanelProps {
  cart: CartItem[];
  onUpdateQuantity: (productId: string, delta: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  onProceedToPayment: (diskon: number, alasanDiskon: string) => void;
}

export function CartPanel({
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onProceedToPayment,
}: CartPanelProps) {
  const [diskonInput, setDiskonInput] = useState<string>('0');
  const [alasanDiskon, setAlasanDiskon] = useState<string>('');
  const [discountError, setDiscountError] = useState<string | null>(null);

  const subtotal = cart.reduce(
    (sum, item) => sum + item.product.harga_jual * item.jumlah,
    0
  );

  const nominalDiskon = parseInt(diskonInput.replace(/\D/g, ''), 10) || 0;
  const maxDiskon = Math.floor(subtotal * 0.10);
  const isDiscountValid = nominalDiskon <= maxDiskon;
  const total = Math.max(0, subtotal - (isDiscountValid ? nominalDiskon : 0));

  const handleCheckoutClick = () => {
    setDiscountError(null);

    if (nominalDiskon > maxDiskon) {
      setDiscountError(`Diskon maksimal 10% (Rp${maxDiskon.toLocaleString('id-ID')}).`);
      return;
    }

    if (nominalDiskon > 0 && alasanDiskon.trim().length === 0) {
      setDiscountError('Alasan diskon wajib diisi jika diskon lebih dari Rp0.');
      return;
    }

    onProceedToPayment(nominalDiskon, alasanDiskon.trim());
  };

  const handleDiskonChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDiskonInput(e.target.value);
    setDiscountError(null);
  };

  return (
    <Card className="flex flex-col h-full border shadow-md bg-card">
      <CardHeader className="py-3.5 px-4 border-b flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-primary" />
          <CardTitle className="text-base font-bold">Keranjang Pesanan</CardTitle>
          <Badge variant="secondary" className="text-xs px-2 py-0.5">
            {cart.reduce((sum, item) => sum + item.jumlah, 0)} item
          </Badge>
        </div>
        {cart.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClearCart}
            className="text-xs text-muted-foreground hover:text-destructive h-8 px-2"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            Kosongkan
          </Button>
        )}
      </CardHeader>

      {/* Daftar Item di Keranjang */}
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center text-muted-foreground text-sm">
            <ShoppingCart className="h-10 w-10 mb-2 opacity-25" />
            <p className="font-medium">Keranjang masih kosong</p>
            <p className="text-xs">Klik menu di sebelah kiri untuk menambahkan pesanan.</p>
          </div>
        ) : (
          <div className="space-y-2.5 divide-y divide-border/60">
            {cart.map((item) => {
              const itemSubtotal = item.product.harga_jual * item.jumlah;
              const maxStock = item.product.lacak_stok ? (item.product.stok_tersedia ?? 99) : 99;
              const canIncrease = item.jumlah < maxStock && item.jumlah < 99;

              return (
                <div key={item.product.id} className="pt-2.5 first:pt-0 flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {item.product.nama}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Rp{item.product.harga_jual.toLocaleString('id-ID')}
                    </p>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => onUpdateQuantity(item.product.id, -1)}
                      className="h-7 w-7 rounded-md"
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-7 text-center font-bold text-sm">
                      {item.jumlah}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => onUpdateQuantity(item.product.id, 1)}
                      disabled={!canIncrease}
                      className="h-7 w-7 rounded-md"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>

                  <div className="text-right min-w-[70px]">
                    <p className="text-sm font-bold text-foreground">
                      Rp{itemSubtotal.toLocaleString('id-ID')}
                    </p>
                    <button
                      type="button"
                      onClick={() => onRemoveItem(item.product.id)}
                      className="text-[10px] text-muted-foreground hover:text-destructive underline"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Bagian Perhitungan & Pembayaran */}
      {cart.length > 0 && (
        <CardFooter className="flex-col p-4 border-t bg-muted/20 space-y-3">
          {discountError && (
            <div className="w-full flex items-center gap-2 p-2.5 rounded-lg bg-destructive/10 text-destructive text-xs border border-destructive/20">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{discountError}</span>
            </div>
          )}

          {/* Form Diskon (BR-05) */}
          <div className="w-full space-y-2 p-2.5 rounded-lg bg-card border text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground flex items-center gap-1">
                <Percent className="h-3.5 w-3.5 text-primary" />
                Diskon Promo (Maks 10%)
              </span>
              <span className="text-muted-foreground text-[11px]">
                Maks: Rp{maxDiskon.toLocaleString('id-ID')}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                min="0"
                max={maxDiskon}
                placeholder="Nominal Rp"
                value={diskonInput}
                onChange={handleDiskonChange}
                className="h-8 text-xs font-semibold"
              />
              <Input
                type="text"
                placeholder="Alasan Diskon (Wajib)"
                value={alasanDiskon}
                onChange={(e) => {
                  setAlasanDiskon(e.target.value);
                  setDiscountError(null);
                }}
                disabled={nominalDiskon === 0}
                className="h-8 text-xs"
              />
            </div>
          </div>

          {/* Rincian Subtotal, Diskon, Total */}
          <div className="w-full space-y-1 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal Pesanan</span>
              <span>Rp{subtotal.toLocaleString('id-ID')}</span>
            </div>
            {nominalDiskon > 0 && (
              <div className="flex justify-between text-emerald-600 font-medium">
                <span>Diskon Terpasang</span>
                <span>- Rp{nominalDiskon.toLocaleString('id-ID')}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-base font-extrabold text-foreground pt-1 border-t">
              <span>Total Tagihan</span>
              <span className="text-xl text-primary">
                Rp{total.toLocaleString('id-ID')}
              </span>
            </div>
          </div>

          <Button
            type="button"
            onClick={handleCheckoutClick}
            disabled={cart.length === 0}
            className="w-full h-12 text-base font-bold shadow-md bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <span>Lanjut Pembayaran</span>
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
