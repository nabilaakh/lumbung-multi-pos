'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  closeShift,
  calculateShiftCashExpected,
  calculateShiftVariance,
  validateCloseShift,
  MAX_VARIANCE_WITHOUT_NOTE,
  countPendingShiftTransactions,
} from '@/lib/services/shift-service';
import type { ShiftKasir } from '@/types/database';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertCircle, LockKeyhole, Calculator, AlertTriangle, Loader2 } from 'lucide-react';

interface CloseShiftModalProps {
  shift: ShiftKasir;
  totalTunai: number;
  totalQris: number;
  onShiftClosed: () => void;
}

export function CloseShiftModal({
  shift,
  totalTunai,
  totalQris,
  onShiftClosed,
}: CloseShiftModalProps) {
  const supabase = createClient();
  const [isOpen, setIsOpen] = useState(false);
  const kasSeharusnya = calculateShiftCashExpected(shift.kas_awal, totalTunai);

  const [uangFisik, setUangFisik] = useState<string>('');
  const [catatanTutup, setCatatanTutup] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setUangFisik(kasSeharusnya.toString());
      setCatatanTutup('');
      setErrorMessage(null);
      // Cek apakah ada transaksi QRIS menggantung
      countPendingShiftTransactions(supabase, shift.id).then((count) => {
        setPendingCount(count);
      });
    }
  }, [isOpen, kasSeharusnya, shift.id, supabase]);

  const nominalFisik = parseInt(uangFisik.replace(/\D/g, ''), 10) || 0;
  const selisih = calculateShiftVariance(nominalFisik, kasSeharusnya);
  const isToleranceExceeded = Math.abs(selisih) > MAX_VARIANCE_WITHOUT_NOTE;

  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const validation = validateCloseShift(nominalFisik, kasSeharusnya, catatanTutup);
    if (!validation.valid) {
      setErrorMessage(validation.errorMessage);
      return;
    }

    setIsLoading(true);
    const { error } = await closeShift(supabase, {
      shiftId: shift.id,
      uangFisik: nominalFisik,
      catatanTutup: catatanTutup.trim() || null,
    });

    setIsLoading(false);

    if (error) {
      setErrorMessage(error);
      return;
    }

    setIsOpen(false);
    onShiftClosed();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" className="h-11 px-6 shadow-md font-medium">
          <LockKeyhole className="h-5 w-5 mr-2" />
          Tutup Shift & Hitung Kas
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleCloseShift}>
          <DialogHeader>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-destructive/10 text-destructive mb-2">
              <Calculator className="h-6 w-6" />
            </div>
            <DialogTitle className="text-xl">Tutup Sesi & Rekonsiliasi Kas</DialogTitle>
            <DialogDescription>
              Hitung uang fisik yang ada di laci kasir untuk dibandingkan dengan total penjualan sistem.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            {errorMessage && (
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Peringatan Transaksi QRIS Menunggu Pembayaran (PRD Bagian 11.5) */}
            {pendingCount > 0 && (
              <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400 text-sm border border-amber-500/30 animate-in fade-in">
                <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <div className="space-y-0.5">
                  <p className="font-bold text-sm">Ada {pendingCount} Transaksi QRIS Menunggu Pembayaran</p>
                  <p className="text-xs text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
                    Sesuai aturan PRD 11.5, shift tidak dapat ditutup selama masih ada transaksi menggantung. Silakan selesaikan atau batalkan transaksi tersebut di menu Kasir terlebih dahulu.
                  </p>
                </div>
              </div>
            )}

            {/* Rincian Kas Seharusnya */}
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-muted/50 border text-xs">
              <div>
                <span className="text-muted-foreground">Kas Awal:</span>
                <p className="font-semibold text-foreground text-sm">
                  Rp{shift.kas_awal.toLocaleString('id-ID')}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Penjualan Tunai Lunas:</span>
                <p className="font-semibold text-emerald-600 dark:text-emerald-400 text-sm">
                  + Rp{totalTunai.toLocaleString('id-ID')}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Penjualan QRIS (Non-Kas):</span>
                <p className="font-semibold text-blue-600 dark:text-blue-400 text-sm">
                  Rp{totalQris.toLocaleString('id-ID')}
                </p>
              </div>
              <div className="border-t pt-1.5 col-span-2 flex justify-between items-center text-sm">
                <span className="font-bold text-foreground">Kas Tunai Seharusnya:</span>
                <span className="font-extrabold text-foreground text-base">
                  Rp{kasSeharusnya.toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            {/* Input Uang Fisik */}
            <div className="space-y-2">
              <label htmlFor="uangFisik" className="text-sm font-medium">
                Uang Fisik Dihitung di Laci (Rp)
              </label>
              <Input
                id="uangFisik"
                type="number"
                min="0"
                step="100"
                value={uangFisik}
                onChange={(e) => {
                  setUangFisik(e.target.value);
                  setErrorMessage(null);
                }}
                disabled={isLoading}
                required
                className="h-11 text-lg font-bold"
                placeholder="Masukkan uang fisik kasir"
              />
            </div>

            {/* Indikator Selisih */}
            <div
              className={`p-3 rounded-lg border flex items-center justify-between text-sm ${
                selisih === 0
                  ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                  : isToleranceExceeded
                  ? 'bg-destructive/10 border-destructive/30 text-destructive'
                  : 'bg-primary/10 border-primary/30 text-primary'
              }`}
            >
              <span className="font-medium">Selisih Kas:</span>
              <span className="font-bold text-base">
                {selisih > 0 ? '+' : ''}Rp{selisih.toLocaleString('id-ID')}
              </span>
            </div>

            {/* Peringatan dan Input Catatan jika Selisih > Rp20.000 (BR-09) */}
            {isToleranceExceeded && (
              <div className="space-y-2 p-3.5 rounded-xl bg-destructive/5 border border-destructive/20 animate-in fade-in">
                <div className="flex items-center gap-2 text-destructive text-xs font-semibold">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Aturan BR-09: Selisih &gt; Rp20.000 Wajib Menjelaskan Alasan</span>
                </div>
                <textarea
                  id="catatanTutup"
                  rows={3}
                  value={catatanTutup}
                  onChange={(e) => {
                    setCatatanTutup(e.target.value);
                    setErrorMessage(null);
                  }}
                  disabled={isLoading}
                  required
                  placeholder="Contoh: Salah beri kembalian kepada pelanggan pada transaksi pagi..."
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={isLoading || pendingCount > 0}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Menutup Shift...
                </>
              ) : pendingCount > 0 ? (
                'Selesaikan Transaksi Terlebih Dahulu'
              ) : (
                'Konfirmasi Tutup Shift'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
