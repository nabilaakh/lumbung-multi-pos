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
import { History, DollarSign, Lock, Calendar } from 'lucide-react';
import { LoadingState } from '@/components/ui/loading-state';

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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-primary" />
              <DialogTitle className="text-base font-bold text-foreground">
                Riwayat Harga Modal (HPP)
              </DialogTitle>
            </div>
            <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] gap-1">
              <Lock className="w-3 h-3" />
              Khusus Owner
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Daftar perubahan harga modal per batch penerimaan untuk perhitungan laba kotor.
          </p>
        </DialogHeader>

        <div className="space-y-3">
          <div className="bg-muted/50 p-3 rounded-lg border border-border">
            <span className="text-[11px] font-mono text-muted-foreground uppercase">{product.sku}</span>
            <div className="font-bold text-sm text-foreground">{product.nama}</div>
            <div className="text-xs text-muted-foreground mt-1">
              Harga Jual POS: <strong className="text-emerald-700 dark:text-emerald-400">Rp {product.harga_jual.toLocaleString('id-ID')}</strong>
            </div>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {loading ? (
              <LoadingState size="sm" layout="inline" label="Memuat riwayat modal..." className="py-6" />
            ) : history.length === 0 ? (
              <div className="text-center py-6 text-xs text-muted-foreground">
                Belum ada catatan riwayat harga modal.
              </div>
            ) : (
              history.map((entry, idx) => (
                <div
                  key={entry.id || idx}
                  className={`p-3 rounded-lg border flex items-center justify-between text-xs ${
                    idx === 0
                      ? 'bg-primary/5 border-primary/20 text-foreground font-medium'
                      : 'bg-card border-border text-foreground'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      Berlaku: {new Date(entry.berlaku_mulai).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </div>
                    {idx === 0 && (
                      <span className="inline-block text-[10px] bg-primary/20 text-primary px-1.5 py-0.2 rounded font-bold">
                        Aktif Saat Ini
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-sm font-bold text-foreground">
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
