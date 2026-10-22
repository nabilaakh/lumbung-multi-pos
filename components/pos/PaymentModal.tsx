'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  executeCheckoutRPC,
  validatePayment,
  type CheckoutRPCResponse,
} from '@/lib/services/checkout-service';
import type { CartItem } from './CartPanel';
import type { MetodeBayar } from '@/types/database';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Wallet,
  QrCode,
  AlertCircle,
  CheckCircle2,
  Receipt,
  ArrowRight,
} from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  shiftId: string;
  cart: CartItem[];
  subtotal: number;
  diskon: number;
  alasanDiskon?: string | null;
  total: number;
  onSuccessCheckout: (result: CheckoutRPCResponse, paymentDetails: { metodeBayar: MetodeBayar; uangDiterima: number; kembalian: number }) => void;
}

export function PaymentModal({
  isOpen,
  onClose,
  shiftId,
  cart,
  subtotal,
  diskon,
  alasanDiskon,
  total,
  onSuccessCheckout,
}: PaymentModalProps) {
  const supabase = createClient();
  const [metodeBayar, setMetodeBayar] = useState<MetodeBayar>('tunai');
  const [uangDiterimaInput, setUangDiterimaInput] = useState<string>(total.toString());
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const nominalDiterima =
    metodeBayar === 'qris'
      ? total
      : parseInt(uangDiterimaInput.replace(/\D/g, ''), 10) || 0;

  const paymentValidation = validatePayment(total, metodeBayar, nominalDiterima);
  const kembalian = paymentValidation.valid ? paymentValidation.kembalian : 0;

  const handleQuickNominal = (val: number) => {
    setUangDiterimaInput(val.toString());
    setErrorMessage(null);
  };

  const handleCheckout = async () => {
    setErrorMessage(null);

    if (!paymentValidation.valid) {
      setErrorMessage(paymentValidation.errorMessage);
      return;
    }

    setIsLoading(true);

    const itemsPayload = cart.map((item) => ({
      produk_id: item.product.id,
      jumlah: item.jumlah,
    }));

    const { data, error } = await executeCheckoutRPC(supabase, {
      shiftId,
      items: itemsPayload,
      diskon,
      alasanDiskon,
      metodeBayar,
      uangDiterima: nominalDiterima,
    });

    setIsLoading(false);

    if (error || !data) {
      setErrorMessage(error || 'Checkout gagal diproses.');
      return;
    }

    onSuccessCheckout(data, {
      metodeBayar,
      uangDiterima: nominalDiterima,
      kembalian,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isLoading && !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-700 mb-2">
            <Receipt className="h-6 w-6" />
          </div>
          <DialogTitle className="text-xl">Pembayaran Transaksi</DialogTitle>
          <DialogDescription>
            Pilih metode pembayaran dan masukkan jumlah uang yang diterima pelanggan.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {errorMessage && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Banner Total Tagihan */}
          <div className="p-4 rounded-xl bg-muted/60 border flex justify-between items-center">
            <div>
              <span className="text-xs text-muted-foreground font-medium">Total yang Harus Dibayar:</span>
              <p className="text-2xl font-extrabold text-foreground">
                Rp{total.toLocaleString('id-ID')}
              </p>
            </div>
            {diskon > 0 && (
              <Badge variant="secondary" className="text-xs">
                Diskon: Rp{diskon.toLocaleString('id-ID')}
              </Badge>
            )}
          </div>

          {/* Pemilihan Metode Bayar */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Metode Pembayaran
            </span>
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant={metodeBayar === 'tunai' ? 'default' : 'outline'}
                onClick={() => {
                  setMetodeBayar('tunai');
                  setUangDiterimaInput(total.toString());
                  setErrorMessage(null);
                }}
                className={`h-12 text-sm font-semibold flex items-center justify-center gap-2 ${
                  metodeBayar === 'tunai'
                    ? 'bg-amber-700 hover:bg-amber-800 text-white'
                    : 'bg-card'
                }`}
              >
                <Wallet className="h-4 w-4" />
                <span>Tunai (Cash)</span>
              </Button>

              <Button
                type="button"
                variant={metodeBayar === 'qris' ? 'default' : 'outline'}
                onClick={() => {
                  setMetodeBayar('qris');
                  setUangDiterimaInput(total.toString());
                  setErrorMessage(null);
                }}
                className={`h-12 text-sm font-semibold flex items-center justify-center gap-2 ${
                  metodeBayar === 'qris'
                    ? 'bg-amber-700 hover:bg-amber-800 text-white'
                    : 'bg-card'
                }`}
              >
                <QrCode className="h-4 w-4" />
                <span>QRIS Dinamis</span>
              </Button>
            </div>
          </div>

          {/* Form Tunai */}
          {metodeBayar === 'tunai' ? (
            <div className="space-y-3 p-3.5 rounded-xl border bg-card">
              <div className="space-y-1.5">
                <label htmlFor="uangDiterima" className="text-xs font-semibold text-foreground">
                  Uang Tunai Diterima (Rp)
                </label>
                <Input
                  id="uangDiterima"
                  type="number"
                  min="0"
                  step="500"
                  value={uangDiterimaInput}
                  onChange={(e) => {
                    setUangDiterimaInput(e.target.value);
                    setErrorMessage(null);
                  }}
                  disabled={isLoading}
                  required
                  className="h-11 text-lg font-bold"
                  placeholder="0"
                />
              </div>

              {/* Tombol Cepat Nominal */}
              <div className="grid grid-cols-4 gap-1.5 text-xs">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickNominal(total)}
                  className="text-xs"
                >
                  Uang Pas
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickNominal(50000)}
                  className="text-xs"
                >
                  50.000
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickNominal(100000)}
                  className="text-xs"
                >
                  100.000
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickNominal(200000)}
                  className="text-xs"
                >
                  200.000
                </Button>
              </div>

              {/* Kalkulasi Kembalian */}
              <div className="pt-2 border-t flex justify-between items-center text-sm">
                <span className="font-semibold text-muted-foreground">Uang Kembalian:</span>
                <span
                  className={`text-lg font-extrabold ${
                    paymentValidation.valid
                      ? 'text-emerald-600'
                      : 'text-destructive text-sm'
                  }`}
                >
                  {paymentValidation.valid
                    ? `Rp${kembalian.toLocaleString('id-ID')}`
                    : 'Nominal Kurang'}
                </span>
              </div>
            </div>
          ) : (
            /* Tampilan QRIS Dinamis */
            <div className="p-4 rounded-xl border bg-card flex flex-col items-center justify-center space-y-3 text-center">
              <div className="p-3 bg-white rounded-xl shadow-inner border">
                {/* Simulasi Mock QR Code SVG */}
                <svg className="w-36 h-36" viewBox="0 0 100 100">
                  <rect width="100" height="100" fill="white" />
                  <path
                    d="M10,10 h30 v30 h-30 z M15,15 v20 h20 v-20 z M20,20 h10 v10 h-10 z"
                    fill="black"
                  />
                  <path
                    d="M60,10 h30 v30 h-30 z M65,15 v20 h20 v-20 z M70,20 h10 v10 h-10 z"
                    fill="black"
                  />
                  <path
                    d="M10,60 h30 v30 h-30 z M15,65 v20 h20 v-20 z M20,70 h10 v10 h-10 z"
                    fill="black"
                  />
                  <rect x="50" y="50" width="10" height="10" fill="black" />
                  <rect x="70" y="70" width="15" height="15" fill="black" />
                  <rect x="45" y="75" width="10" height="15" fill="black" />
                  <rect x="75" y="45" width="15" height="10" fill="black" />
                </svg>
              </div>
              <div>
                <p className="font-bold text-sm text-foreground">
                  QRIS Dinamis POS Lumbung
                </p>
                <p className="text-xs text-muted-foreground">
                  Pelanggan scan QRIS melalui BCA, Mandiri, GoPay, OVO, atau ShopeePay.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Batal
          </Button>
          <Button
            type="button"
            onClick={handleCheckout}
            disabled={isLoading || !paymentValidation.valid}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
          >
            {isLoading ? 'Memproses Transaksi...' : 'Selesaikan Pembayaran'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
