'use client';

import React, { useState } from 'react';
import type { TransactionWithDetails } from '@/lib/services/transaction-service';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, Eye, Ban, Filter, Receipt } from 'lucide-react';

interface TransactionTableProps {
  transactions: TransactionWithDetails[];
  canVoid: boolean;
  onViewDetail: (transaksiId: string) => void;
  onOpenVoid: (trx: TransactionWithDetails) => void;
}

export function TransactionTable({
  transactions,
  canVoid,
  onViewDetail,
  onOpenVoid,
}: TransactionTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'semua' | 'lunas' | 'void'>('semua');
  const [methodFilter, setMethodFilter] = useState<'semua' | 'tunai' | 'qris'>('semua');

  const filtered = transactions.filter((trx) => {
    if (statusFilter !== 'semua' && trx.status !== statusFilter) return false;
    if (methodFilter !== 'semua' && trx.metode_bayar !== methodFilter) return false;

    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      const matchStruk = trx.nomor_struk.toLowerCase().includes(q);
      const matchKasir = trx.kasir?.nama_lengkap.toLowerCase().includes(q);
      if (!matchStruk && !matchKasir) return false;
    }

    return true;
  });

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            placeholder="Cari nomor struk atau kasir..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs bg-card"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg border text-xs">
            <span className="text-[11px] text-muted-foreground px-1.5 flex items-center gap-1 font-medium">
              <Filter className="h-3 w-3" /> Status:
            </span>
            <Button
              type="button"
              variant={statusFilter === 'semua' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setStatusFilter('semua')}
              className="h-7 text-xs px-2.5"
            >
              Semua
            </Button>
            <Button
              type="button"
              variant={statusFilter === 'lunas' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setStatusFilter('lunas')}
              className="h-7 text-xs px-2.5 text-emerald-600 dark:text-emerald-400"
            >
              Lunas
            </Button>
            <Button
              type="button"
              variant={statusFilter === 'void' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setStatusFilter('void')}
              className="h-7 text-xs px-2.5 text-destructive"
            >
              Void
            </Button>
          </div>

          <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg border text-xs">
            <span className="text-[11px] text-muted-foreground px-1.5 font-medium">Bayar:</span>
            <Button
              type="button"
              variant={methodFilter === 'semua' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setMethodFilter('semua')}
              className="h-7 text-xs px-2.5"
            >
              Semua
            </Button>
            <Button
              type="button"
              variant={methodFilter === 'tunai' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setMethodFilter('tunai')}
              className="h-7 text-xs px-2.5 uppercase"
            >
              Tunai
            </Button>
            <Button
              type="button"
              variant={methodFilter === 'qris' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setMethodFilter('qris')}
              className="h-7 text-xs px-2.5 uppercase"
            >
              QRIS
            </Button>
          </div>
        </div>
      </div>

      {/* Tabel Transaksi */}
      <div className="rounded-xl border bg-card shadow-xs overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="text-xs font-semibold">Nomor Struk</TableHead>
              <TableHead className="text-xs font-semibold">Waktu</TableHead>
              <TableHead className="text-xs font-semibold">Cabang</TableHead>
              <TableHead className="text-xs font-semibold">Kasir</TableHead>
              <TableHead className="text-xs font-semibold text-right">Total Transaksi</TableHead>
              <TableHead className="text-xs font-semibold text-center">Metode</TableHead>
              <TableHead className="text-xs font-semibold text-center">Status</TableHead>
              <TableHead className="text-xs font-semibold text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground text-sm">
                  <Receipt className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="font-medium">Tidak ada transaksi yang cocok.</p>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((trx) => (
                <TableRow key={trx.id} className="text-xs hover:bg-muted/30">
                  <TableCell className="font-mono font-bold text-foreground">
                    {trx.nomor_struk}
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {new Date(trx.dibuat_pada).toLocaleString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </TableCell>
                  <TableCell className="font-medium">
                    {trx.cabang?.kode || '-'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {trx.kasir?.nama_lengkap || '-'}
                  </TableCell>
                  <TableCell className="text-right font-bold text-foreground">
                    Rp{trx.total.toLocaleString('id-ID')}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="text-[10px] uppercase px-1.5 py-0 font-medium">
                      {trx.metode_bayar}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant={trx.status === 'lunas' ? 'default' : 'destructive'}
                      className={
                        trx.status === 'lunas'
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] px-2 py-0.5'
                          : 'bg-destructive text-white text-[10px] px-2 py-0.5'
                      }
                    >
                      {trx.status.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewDetail(trx.id)}
                        className="h-7 px-2 text-xs hover:bg-muted text-foreground"
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        Detail
                      </Button>

                      {canVoid && trx.status === 'lunas' && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => onOpenVoid(trx)}
                          className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Ban className="h-3.5 w-3.5 mr-1" />
                          Void
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
