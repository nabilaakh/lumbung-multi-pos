'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getTransactionDetail, type TransactionWithDetails } from '@/lib/services/transaction-service';
import { printReceiptWindow, type ReceiptData } from '@/lib/utils/receipt-printer';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Printer, Ban, Receipt, Clock, User, Store, AlertCircle } from 'lucide-react';

interface TransactionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactionId: string | null;
  canVoid: boolean;
  onOpenVoidModal: (trx: TransactionWithDetails) => void;
}

export function TransactionDetailModal({
  isOpen,
  onClose,
  transactionId,
  canVoid,
  onOpenVoidModal,
}: TransactionDetailModalProps) {
  const supabase = createClient();
  const [transaction, setTransaction] = useState<TransactionWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && transactionId) {
      setIsLoading(true);
      getTransactionDetail(supabase, transactionId).then(({ data }) => {
        setTransaction(data);
        setIsLoading(false);
      });
    } else {
      setTransaction(null);
    }
  }, [isOpen, transactionId, supabase]);

  if (!isOpen) return null;

  const handlePrint = () => {
    if (!transaction) return;

    const receipt: ReceiptData = {
      namaCabang: transaction.cabang?.nama || 'Lumbung POS',
      alamatCabang: (transaction.cabang as any)?.alamat || 'Jl. Raya Lumbung',
      nomorStruk: transaction.nomor_struk,
      waktu: new Date(transaction.dibuat_pada).toLocaleString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      namaKasir: transaction.kasir?.nama_lengkap || 'Kasir',
      items: (transaction.items || []).map((it) => ({
        nama_produk: it.nama_produk,
        jumlah: it.jumlah,
        harga_satuan: it.harga_satuan,
        subtotal: it.subtotal,
      })),
      subtotal: transaction.subtotal,
      diskon: transaction.diskon,
      alasanDiskon: transaction.alasan_diskon,
      total: transaction.total,
      metodeBayar: transaction.metode_bayar,
      uangDiterima: transaction.uang_diterima,
      kembalian: transaction.kembalian,
    };

    printReceiptWindow(receipt);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-700">
                <Receipt className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg">Detail Transaksi</DialogTitle>
                <DialogDescription className="text-xs">
                  {transaction?.nomor_struk || 'Memuat...'}
                </DialogDescription>
              </div>
            </div>

            {transaction && (
              <Badge
                variant={transaction.status === 'lunas' ? 'default' : 'destructive'}
                className={
                  transaction.status === 'lunas'
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-destructive text-white'
                }
              >
                {transaction.status.toUpperCase()}
              </Badge>
            )}
          </div>
        </DialogHeader>

        {isLoading || !transaction ? (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            <Clock className="h-5 w-5 animate-spin mr-2 text-amber-600" />
            Memuat rincian transaksi...
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1">
            {/* Metadata Header Transaksi */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3 rounded-xl bg-muted/40 border text-xs">
              <div>
                <span className="text-muted-foreground flex items-center gap-1">
                  <Store className="h-3.5 w-3.5" /> Cabang:
                </span>
                <p className="font-semibold text-foreground mt-0.5">
                  {transaction.cabang?.nama} ({transaction.cabang?.kode})
                </p>
              </div>

              <div>
                <span className="text-muted-foreground flex items-center gap-1">
                  <User className="h-3.5 w-3.5" /> Kasir:
                </span>
                <p className="font-semibold text-foreground mt-0.5">
                  {transaction.kasir?.nama_lengkap || '-'}
                </p>
              </div>

              <div>
                <span className="text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" /> Tanggal:
                </span>
                <p className="font-semibold text-foreground mt-0.5">
                  {new Date(transaction.dibuat_pada).toLocaleString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>

            {/* Informasi Void jika status = void */}
            {transaction.status === 'void' && (
              <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertCircle className="h-4 w-4" />
                  <span>Transaksi Ini Telah Dibatalkan (Void)</span>
                </div>
                <p>
                  <span className="font-semibold">Dibatalkan oleh:</span>{' '}
                  {transaction.void_user?.nama_lengkap || 'Supervisor'}{' '}
                  pada {transaction.void_pada ? new Date(transaction.void_pada).toLocaleString('id-ID') : '-'}
                </p>
                <p>
                  <span className="font-semibold">Alasan:</span>{' '}
                  &ldquo;{transaction.alasan_void}&rdquo;
                </p>
              </div>
            )}

            {/* Tabel Item Pembelian */}
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="text-xs">Nama Menu</TableHead>
                    <TableHead className="text-xs text-center w-16">Qty</TableHead>
                    <TableHead className="text-xs text-right">Harga</TableHead>
                    <TableHead className="text-xs text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(transaction.items || []).map((it) => (
                    <TableRow key={it.id} className="text-xs">
                      <TableCell className="font-medium">{it.nama_produk}</TableCell>
                      <TableCell className="text-center">{it.jumlah}</TableCell>
                      <TableCell className="text-right">
                        Rp{it.harga_satuan.toLocaleString('id-ID')}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        Rp{it.subtotal.toLocaleString('id-ID')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Rekap Pembayaran */}
            <div className="p-3.5 rounded-xl bg-muted/30 border space-y-1.5 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal:</span>
                <span>Rp{transaction.subtotal.toLocaleString('id-ID')}</span>
              </div>
              {transaction.diskon > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Diskon {transaction.alasan_diskon ? `(${transaction.alasan_diskon})` : ''}:</span>
                  <span>- Rp{transaction.diskon.toLocaleString('id-ID')}</span>
                </div>
              )}
              <div className="flex justify-between font-extrabold text-sm text-foreground pt-1 border-t">
                <span>Total:</span>
                <span>Rp{transaction.total.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-muted-foreground pt-1">
                <span>Metode Pembayaran:</span>
                <span className="font-semibold uppercase text-foreground">
                  {transaction.metode_bayar}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Uang Diterima:</span>
                <span>Rp{transaction.uang_diterima.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Kembalian:</span>
                <span className="font-semibold text-emerald-600">
                  Rp{transaction.kembalian.toLocaleString('id-ID')}
                </span>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="flex items-center justify-between gap-2 border-t pt-3">
          <div>
            {canVoid && transaction && transaction.status === 'lunas' && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => onOpenVoidModal(transaction)}
              >
                <Ban className="h-4 w-4 mr-1.5" />
                Void Transaksi
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Tutup
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handlePrint}
              disabled={isLoading || !transaction}
              className="bg-amber-700 hover:bg-amber-800 text-white"
            >
              <Printer className="h-4 w-4 mr-1.5" />
              Cetak Ulang Struk
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
