'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  executeVoidTransaction,
  validateVoidReason,
  MIN_VOID_REASON_LENGTH,
  type TransactionWithDetails,
} from '@/lib/services/transaction-service';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { AlertCircle, AlertTriangle, Ban, Loader2 } from 'lucide-react';

interface VoidModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: TransactionWithDetails | null;
  onSuccessVoid: () => void;
}

export function VoidModal({
  isOpen,
  onClose,
  transaction,
  onSuccessVoid,
}: VoidModalProps) {
  const supabase = createClient();
  const [alasanVoid, setAlasanVoid] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!transaction) return null;

  const charCount = alasanVoid.trim().length;
  const isReasonValid = charCount >= MIN_VOID_REASON_LENGTH;

  const handleConfirmVoid = async () => {
    setErrorMessage(null);

    const validation = validateVoidReason(alasanVoid);
    if (!validation.valid) {
      setErrorMessage(validation.errorMessage);
      return;
    }

    setIsLoading(true);
    const { success, error } = await executeVoidTransaction(supabase, {
      transaksiId: transaction.id,
      alasanVoid: alasanVoid.trim(),
    });

    setIsLoading(false);

    if (!success || error) {
      const msg = error || 'Gagal memproses pembatalan transaksi.';
      setErrorMessage(msg);
      toast.error(msg);
      return;
    }

    toast.success('Transaksi berhasil dibatalkan (Void) dan stok dikembalikan');
    setAlasanVoid('');
    onClose();
    onSuccessVoid();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isLoading && !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-destructive/10 text-destructive mb-2">
            <Ban className="h-6 w-6" />
          </div>
          <DialogTitle className="text-xl">Batalkan Transaksi (Void)</DialogTitle>
          <DialogDescription>
            Tindakan ini akan membatalkan nomor struk, mengembalikan stok produk ke cabang, dan mencatat audit log.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {errorMessage && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Ringkasan Transaksi yang Akan di-Void */}
          <div className="p-3.5 rounded-xl bg-muted/50 border text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Nomor Struk:</span>
              <span className="font-bold text-foreground">{transaction.nomor_struk}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Transaksi:</span>
              <span className="font-bold text-foreground">
                Rp{transaction.total.toLocaleString('id-ID')} ({transaction.metode_bayar.toUpperCase()})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Kasir:</span>
              <span>{transaction.kasir?.nama_lengkap || '-'}</span>
            </div>
          </div>

          {/* Form Input Alasan Void (Minimal 10 Karakter) */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <label htmlFor="alasanVoid" className="font-semibold text-foreground">
                Alasan Pembatalan / Void (Wajib)
              </label>
              <span
                className={`font-mono text-[11px] ${
                  isReasonValid ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'
                }`}
              >
                {charCount}/{MIN_VOID_REASON_LENGTH} karakter
              </span>
            </div>

            <textarea
              id="alasanVoid"
              rows={3}
              value={alasanVoid}
              onChange={(e) => {
                setAlasanVoid(e.target.value);
                setErrorMessage(null);
              }}
              disabled={isLoading}
              required
              placeholder="Contoh: Salah input pesanan produk, pelanggan membatalkan pesanan..."
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20 flex gap-2 items-start text-xs text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              Perhatian: Transaksi yang telah dibatalkan tidak dapat dikembalikan ke status lunas.
            </span>
          </div>
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
            variant="destructive"
            onClick={handleConfirmVoid}
            disabled={isLoading || !isReasonValid}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Memproses Void...
              </>
            ) : (
              'Konfirmasi Pembatalan (Void)'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
