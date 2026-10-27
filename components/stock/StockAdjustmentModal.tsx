'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  StockItem,
  StockAdjustmentMode,
  StockAdjustmentType,
  adjustBranchStock,
  validateStockAdjustment,
} from '@/lib/services/stock-service';
import { AlertTriangle, CheckCircle, PackageOpen, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StockAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: StockItem | null;
  onSuccess: () => void;
  userRole: string;
  userCabangId?: string | null;
}

export function StockAdjustmentModal({
  isOpen,
  onClose,
  item,
  onSuccess,
  userRole,
  userCabangId,
}: StockAdjustmentModalProps) {
  const [mode, setMode] = useState<StockAdjustmentMode>('tambah');
  const [kuantitasInput, setKuantitasInput] = useState<string>('');
  const [alasan, setAlasan] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (item && isOpen) {
      setMode('tambah');
      setKuantitasInput('');
      setAlasan('');
      setError(null);
    }
  }, [item, isOpen]);

  if (!item) return null;

  const stokSaatIni = item.jumlah;
  const parsedKuantitas = kuantitasInput.trim() === '' ? NaN : parseInt(kuantitasInput, 10);
  const kuantitas = isNaN(parsedKuantitas) ? 0 : parsedKuantitas;

  let stokAkhir = stokSaatIni;
  let isKuantitasValid = false;
  let validationMessage: string | null = null;

  if (mode === 'tambah') {
    stokAkhir = stokSaatIni + kuantitas;
    if (kuantitasInput.trim() === '' || isNaN(parsedKuantitas) || parsedKuantitas <= 0) {
      isKuantitasValid = false;
      if (kuantitasInput.trim() !== '') {
        validationMessage = 'Kuantitas penyesuaian harus lebih dari 0.';
      }
    } else {
      isKuantitasValid = true;
    }
  } else if (mode === 'kurang') {
    stokAkhir = stokSaatIni - kuantitas;
    if (kuantitasInput.trim() === '' || isNaN(parsedKuantitas) || parsedKuantitas <= 0) {
      isKuantitasValid = false;
      if (kuantitasInput.trim() !== '') {
        validationMessage = 'Kuantitas penyesuaian harus lebih dari 0.';
      }
    } else if (parsedKuantitas > stokSaatIni) {
      isKuantitasValid = false;
      validationMessage = `Kuantitas tidak boleh melebihi stok saat ini (${stokSaatIni} unit).`;
    } else {
      isKuantitasValid = true;
    }
  } else if (mode === 'opname') {
    stokAkhir = kuantitas;
    if (kuantitasInput.trim() === '' || isNaN(parsedKuantitas) || parsedKuantitas < 0) {
      isKuantitasValid = false;
      if (kuantitasInput.trim() !== '') {
        validationMessage = 'Jumlah fisik tidak boleh bernilai negatif.';
      }
    } else if (parsedKuantitas === stokSaatIni) {
      isKuantitasValid = false;
      validationMessage = 'Jumlah fisik hasil opname tidak boleh bernilai sama persis dengan stok saat ini.';
    } else {
      isKuantitasValid = true;
    }
  }

  const trimmedAlasan = alasan.trim();
  const charCount = trimmedAlasan.length;
  const isAlasanValid = charCount >= 5;
  const canSubmit = !loading && Boolean(item.produk) && isKuantitasValid && isAlasanValid && stokAkhir >= 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!item.produk) {
      setError('Detail produk tidak tersedia sehingga penyesuaian stok tidak dapat dilakukan.');
      return;
    }

    if (!isKuantitasValid) {
      setError(validationMessage || 'Kuantitas input tidak valid.');
      return;
    }

    if (trimmedAlasan.length < 5) {
      setError('Alasan penyesuaian stok wajib diisi minimal 5 karakter.');
      return;
    }

    const typeLabel: StockAdjustmentType =
      mode === 'tambah'
        ? 'Barang Masuk'
        : mode === 'kurang'
        ? 'Barang Rusak'
        : 'Stock Opname';

    const fullReason = `[${typeLabel}] ${trimmedAlasan}`;

    const validation = validateStockAdjustment({
      jumlahBaru: stokAkhir,
      alasan: fullReason,
      userRole,
      userCabangId,
      targetCabangId: item.cabang_id,
    });

    if (!validation.valid) {
      setError(validation.error || 'Validasi gagal');
      return;
    }

    try {
      setLoading(true);
      const res = await adjustBranchStock({
        cabangId: item.cabang_id,
        produkId: item.produk_id,
        jumlahBaru: stokAkhir,
        alasan: trimmedAlasan,
        tipe: typeLabel,
      });

      if (!res.success) {
        setError(res.message || 'Gagal menyesuaikan stok');
        return;
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan sistem');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <PackageOpen className="w-5 h-5 text-primary" />
            <DialogTitle className="text-lg font-bold text-foreground">
              Penyesuaian Stok Cabang
            </DialogTitle>
          </div>
          <p className="text-xs text-muted-foreground">
            Aksi ini dicatat dalam Audit Log sistem secara permanen (BR-12).
          </p>
        </DialogHeader>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive p-3 rounded-lg text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-destructive" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-muted/50 p-3 rounded-lg border border-border space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-muted-foreground">Produk</span>
              <Badge variant="outline" className="font-mono text-xs">
                {item.produk?.sku ?? '-'}
              </Badge>
            </div>
            <div className="font-semibold text-sm text-foreground">
              {item.produk?.nama ?? 'Produk tidak tersedia / nonaktif'}
            </div>
            {!item.produk && (
              <p className="text-[11px] text-amber-700 dark:text-amber-400">
                Detail produk tidak dapat diakses (kemungkinan produk nonaktif). Penyesuaian stok
                dinonaktifkan.
              </p>
            )}
            <div className="flex justify-between text-xs text-muted-foreground pt-1">
              <span>Cabang: <strong className="text-foreground">{item.cabang?.nama || item.cabang_id}</strong></span>
              <span>Stok Saat Ini: <strong className="text-foreground">{stokSaatIni} unit</strong></span>
            </div>
          </div>

          {/* 3 Mode Toggle Buttons */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Tipe Penyesuaian</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setMode('tambah');
                  setError(null);
                }}
                className={cn(
                  'py-2 px-1.5 rounded-lg text-xs font-semibold border transition-all text-center',
                  mode === 'tambah'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm ring-2 ring-emerald-500/20'
                    : 'bg-background text-muted-foreground border-border hover:bg-muted hover:text-foreground'
                )}
              >
                Barang Masuk
                <span className="block text-[10px] font-normal opacity-90">(+ Tambah)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('kurang');
                  setError(null);
                }}
                className={cn(
                  'py-2 px-1.5 rounded-lg text-xs font-semibold border transition-all text-center',
                  mode === 'kurang'
                    ? 'bg-rose-600 text-white border-rose-600 shadow-sm ring-2 ring-rose-500/20'
                    : 'bg-background text-muted-foreground border-border hover:bg-muted hover:text-foreground'
                )}
              >
                Barang Rusak
                <span className="block text-[10px] font-normal opacity-90">(- Kurangi)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('opname');
                  setError(null);
                }}
                className={cn(
                  'py-2 px-1.5 rounded-lg text-xs font-semibold border transition-all text-center',
                  mode === 'opname'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-sm ring-2 ring-amber-500/20'
                    : 'bg-background text-muted-foreground border-border hover:bg-muted hover:text-foreground'
                )}
              >
                Stock Opname
                <span className="block text-[10px] font-normal opacity-90">(= Set Nilai)</span>
              </button>
            </div>
          </div>

          {/* Dynamic Quantity Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              {mode === 'opname' ? 'Jumlah Fisik Hasil Opname' : 'Kuantitas Penyesuaian'}
            </label>
            <Input
              type="number"
              min="0"
              placeholder={mode === 'opname' ? `Contoh: ${stokSaatIni + 5}` : 'Contoh: 10'}
              value={kuantitasInput}
              onChange={(e) => {
                setKuantitasInput(e.target.value);
                setError(null);
              }}
              className="font-mono text-base font-bold text-center h-11"
              required
            />
            {validationMessage && (
              <p className="text-[11px] text-destructive font-medium flex items-center gap-1 mt-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{validationMessage}</span>
              </p>
            )}
          </div>

          {/* Calculation Preview */}
          <div className="bg-muted/40 p-3 rounded-lg border border-border flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium">Preview Kalkulasi:</span>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">
                Stok Akhir: <span className="font-mono">{stokSaatIni}</span> →{' '}
                <span
                  className={cn(
                    'font-mono font-bold',
                    isKuantitasValid ? 'text-primary' : 'text-muted-foreground'
                  )}
                >
                  {isKuantitasValid ? stokAkhir : '-'} unit
                </span>
              </span>
              {isKuantitasValid && (
                mode === 'tambah' ? (
                  <Badge
                    variant="outline"
                    className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 font-mono text-[11px]"
                  >
                    +{kuantitas} unit
                  </Badge>
                ) : mode === 'kurang' ? (
                  <Badge
                    variant="outline"
                    className="bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border-rose-300 dark:border-rose-800 font-mono text-[11px]"
                  >
                    -{kuantitas} unit
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className={cn(
                      'font-mono text-[11px]',
                      stokAkhir > stokSaatIni
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800'
                        : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border-rose-300 dark:border-rose-800'
                    )}
                  >
                    {stokAkhir > stokSaatIni ? `+${stokAkhir - stokSaatIni}` : `${stokAkhir - stokSaatIni}`} unit
                  </Badge>
                )
              )}
            </div>
          </div>

          {/* Reason Textarea (Mandatory, min 5 chars, no fallback) */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-foreground">
                Alasan Penyesuaian (Wajib Diisi - Minimal 5 Karakter)
              </label>
              <span
                className={cn(
                  'text-[11px] font-mono',
                  charCount >= 5
                    ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                    : 'text-muted-foreground'
                )}
              >
                {charCount} / 5 karakter
              </span>
            </div>
            <textarea
              rows={3}
              value={alasan}
              onChange={(e) => {
                setAlasan(e.target.value);
                setError(null);
              }}
              placeholder="Ketik alasan spesifik penyesuaian stok di sini (wajib diisi)..."
              className="w-full rounded-md border border-input bg-card px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
              required
            />
            {charCount > 0 && charCount < 5 && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400">
                * Masukkan minimal {5 - charCount} karakter lagi agar tombol simpan aktif.
              </p>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={loading}
              className="text-xs"
            >
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!canSubmit}
              className="text-xs gap-1.5"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <CheckCircle className="w-3.5 h-3.5" />
                  Simpan Penyesuaian Stok
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
