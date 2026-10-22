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
      <DialogContent className="sm:max-w-md bg-white border border-slate-200">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <PackageOpen className="w-5 h-5 text-amber-600" />
            <DialogTitle className="text-lg font-bold text-slate-800">
              Penyesuaian Stok Cabang
            </DialogTitle>
          </div>
          <p className="text-xs text-slate-500">
            Aksi ini dicatat dalam Audit Log sistem secara permanen (BR-12).
          </p>
        </DialogHeader>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-500">Produk</span>
              <Badge variant="outline" className="font-mono text-xs">
                {item.produk.sku}
              </Badge>
            </div>
            <div className="font-semibold text-sm text-slate-800">{item.produk.nama}</div>
            <div className="flex justify-between text-xs text-slate-600 pt-1">
              <span>Cabang: <strong className="text-slate-800">{item.cabang?.nama || item.cabang_id}</strong></span>
              <span>Stok Saat Ini: <strong className="text-slate-800">{item.jumlah}</strong></span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700">Jumlah Stok Baru</label>
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
                  <span className="text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded-md border border-emerald-200">
                    +{selisih} unit
                  </span>
                ) : selisih < 0 ? (
                  <span className="text-rose-600 bg-rose-50 px-2.5 py-1.5 rounded-md border border-rose-200">
                    {selisih} unit
                  </span>
                ) : (
                  <span className="text-slate-500 bg-slate-100 px-2.5 py-1.5 rounded-md border border-slate-200">
                    Tidak berubah
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700">Kategori Penyesuaian</label>
            <select
              value={presetReason}
              onChange={(e) => setPresetReason(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              {REASON_PRESETS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700">
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
              disabled={loading || (selisih === 0 && jumlahBaru === item.jumlah)}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs gap-1.5"
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
