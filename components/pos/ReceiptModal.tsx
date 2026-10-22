'use client';

import React from 'react';
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
import { CheckCircle2, Printer, PlusCircle } from 'lucide-react';
import { printReceiptWindow, type ReceiptData } from '@/lib/utils/receipt-printer';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  receiptData: ReceiptData | null;
  onNewTransaction: () => void;
}

export function ReceiptModal({
  isOpen,
  onClose,
  receiptData,
  onNewTransaction,
}: ReceiptModalProps) {
  if (!receiptData) return null;

  const handlePrint = () => {
    printReceiptWindow(receiptData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center sm:text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 mb-2">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <DialogTitle className="text-xl font-bold">Transaksi Berhasil!</DialogTitle>
          <DialogDescription>
            Pembayaran telah diterima dan stok telah diperbarui otomatis secara atomik.
          </DialogDescription>
        </DialogHeader>

        {/* Box Tampilan Mini Struk */}
        <div className="p-4 rounded-xl border bg-muted/30 font-mono text-xs space-y-2">
          <div className="text-center pb-2 border-b">
            <p className="font-bold text-sm font-serif">Lumbung Kopi dan Roti</p>
            <p className="text-[10px] text-muted-foreground">{receiptData.namaCabang}</p>
          </div>

          <div className="flex justify-between text-[11px]">
            <span className="text-muted-foreground">No. Struk:</span>
            <span className="font-bold">{receiptData.nomorStruk}</span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="text-muted-foreground">Kasir:</span>
            <span>{receiptData.namaKasir}</span>
          </div>

          <div className="border-t border-dashed my-2"></div>

          {/* Items */}
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {receiptData.items.map((it, idx) => (
              <div key={idx} className="flex justify-between">
                <span>
                  {it.nama_produk} ({it.jumlah}x)
                </span>
                <span>Rp{it.subtotal.toLocaleString('id-ID')}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-dashed my-2"></div>

          <div className="flex justify-between font-bold text-sm">
            <span>TOTAL:</span>
            <span>Rp{receiptData.total.toLocaleString('id-ID')}</span>
          </div>
          <div className="flex justify-between text-muted-foreground text-[11px]">
            <span>Bayar ({receiptData.metodeBayar.toUpperCase()}):</span>
            <span>Rp{receiptData.uangDiterima.toLocaleString('id-ID')}</span>
          </div>
          <div className="flex justify-between text-muted-foreground text-[11px]">
            <span>Kembalian:</span>
            <span className="font-semibold text-emerald-600">
              Rp{receiptData.kembalian.toLocaleString('id-ID')}
            </span>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handlePrint}
            className="flex-1 h-11 font-medium"
          >
            <Printer className="h-4 w-4 mr-2" />
            Cetak Struk (Thermal 58mm)
          </Button>

          <Button
            type="button"
            onClick={onNewTransaction}
            className="flex-1 h-11 bg-amber-700 hover:bg-amber-800 text-white font-bold"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Transaksi Baru
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
