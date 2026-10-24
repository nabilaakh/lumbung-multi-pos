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
import { StockItem, adjustBranchStock, validateStockAdjustment } from '@/lib/services/stock-service';
import { AlertTriangle, CheckCircle, PackageOpen, Loader2 } from 'lucide-react';

interface StockAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: StockItem | null;
  onSuccess: () => void;
  userRole: string;
  userCabangId?: string | null;
}

const REASON_PRESETS = [
  'Barang Masuk (Faktur Penerimaan)',
  'Barang Rusak / Kadaluarsa',
  'Penyesuaian Stock Opname Fisik',
  'Pengembalian / Retur Supplier',
  'Lainnya',
];

export function StockAdjustmentModal({
  isOpen,
  onClose,
  item,
  onSuccess,
  userRole,
  userCabangId,
}: StockAdjustmentModalProps) {
  const [jumlahBaru, setJumlahBaru] = useState<number>(0);
  const [presetReason, setPresetReason] = useState<string>(REASON_PRESETS[0]);
  const [keterangan, setKeterangan] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (item) {
      setJumlahBaru(item.jumlah);
      setPresetReason(REASON_PRESETS[0]);
      setKeterangan('');
      setError(null);
    }
  }, [item, isOpen]);

  if (!item) return null;

  const selisih = jumlahBaru - item.jumlah;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!item.produk) {
      setError('Detail produk tidak tersedia sehingga penyesuaian stok tidak dapat dilakukan.');
      return;
    }

    const fullReason =
      presetReason === 'Lainnya'
        ? keterangan.trim()
        : `${presetReason}${keterangan.trim() ? ` - ${keterangan.trim()}` : ''}`;

    const validation = validateStockAdjustment({
      jumlahBaru,
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
        jumlahBaru,
        alasan: fullReason,
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
              <span>Stok Saat Ini: <strong className="text-foreground">{item.jumlah}</strong></span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground">Jumlah Stok Baru</label>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                min="0"
                value={jumlahBaru}
                onChange={(e) => setJumlahBaru(parseInt(e.target.value) || 0)}
                className="font-mono text-base font-bold text-center h-11"
                required
              />
              <div className="text-xs font-semibold shrink-0">
                {selisih > 0 ? (
                  <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1.5 rounded-md border border-emerald-200 dark:border-emerald-900">
                    +{selisih} unit
                  </span>
                ) : selisih < 0 ? (
                  <span className="text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 px-2.5 py-1.5 rounded-md border border-rose-200 dark:border-rose-900">
                    {selisih} unit
                  </span>
                ) : (
                  <span className="text-muted-foreground bg-muted px-2.5 py-1.5 rounded-md border border-border">
                    Tidak berubah
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground">Kategori Penyesuaian</label>
            <select
              value={presetReason}
              onChange={(e) => setPresetReason(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-border bg-card text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {REASON_PRESETS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground">
              Keterangan Alasan {presetReason === 'Lainnya' ? '(Wajib)' : '(Opsional)'}
            </label>
            <Input
              type="text"
              placeholder="Contoh: No. Faktur PO-2026-081 atau Kerusakan kemasan..."
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              className="text-xs h-10"
              required={presetReason === 'Lainnya'}
            />
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
              disabled={loading || !item.produk || (selisih === 0 && jumlahBaru === item.jumlah)}
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
                  Simpan Penyesuaian
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
