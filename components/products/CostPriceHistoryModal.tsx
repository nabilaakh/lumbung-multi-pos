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
import { Badge } from '@/components/ui/badge';
import {
  ProductWithCost,
  CostHistoryEntry,
  getProductCostHistory,
} from '@/lib/services/product-service';
import { History, DollarSign, Lock, Loader2, Calendar } from 'lucide-react';

interface CostPriceHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: ProductWithCost | null;
}

export function CostPriceHistoryModal({
  isOpen,
  onClose,
  product,
}: CostPriceHistoryModalProps) {
  const [history, setHistory] = useState<CostHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && product) {
      setLoading(true);
      getProductCostHistory(product.id)
        .then((data) => setHistory(data))
        .catch((err) => console.error('Failed to load cost history', err))
        .finally(() => setLoading(false));
    }
  }, [isOpen, product]);

  if (!product) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-white border border-slate-200">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-amber-700" />
              <DialogTitle className="text-base font-bold text-slate-800">
                Riwayat Harga Modal (HPP)
              </DialogTitle>
            </div>
            <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[10px] gap-1">
              <Lock className="w-3 h-3" />
              Khusus Owner (BR-11)
            </Badge>
          </div>
          <p className="text-xs text-slate-500">
            Daftar perubahan harga modal per batch penerimaan untuk perhitungan laba kotor.
          </p>
        </DialogHeader>

        <div className="space-y-3">
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <span className="text-[11px] font-mono text-slate-500 uppercase">{product.sku}</span>
            <div className="font-bold text-sm text-slate-900">{product.nama}</div>
            <div className="text-xs text-slate-600 mt-1">
              Harga Jual POS: <strong className="text-emerald-700">Rp {product.harga_jual.toLocaleString('id-ID')}</strong>
            </div>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {loading ? (
              <div className="flex items-center justify-center py-6 text-slate-400 gap-2 text-xs">
                <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                Memuat riwayat modal...
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400">
                Belum ada catatan riwayat harga modal.
              </div>
            ) : (
              history.map((entry, idx) => (
                <div
                  key={entry.id || idx}
                  className={`p-3 rounded-lg border flex items-center justify-between text-xs ${
                    idx === 0
                      ? 'bg-amber-50/70 border-amber-200 text-amber-950 font-medium'
                      : 'bg-white border-slate-200 text-slate-700'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                      <Calendar className="w-3 h-3" />
                      Berlaku: {new Date(entry.berlaku_mulai).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </div>
                    {idx === 0 && (
                      <span className="inline-block text-[10px] bg-amber-200/80 text-amber-900 px-1.5 py-0.2 rounded font-bold">
                        Aktif Saat Ini
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-sm font-bold text-slate-900">
                      Rp {entry.harga_modal.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs"
          >
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
