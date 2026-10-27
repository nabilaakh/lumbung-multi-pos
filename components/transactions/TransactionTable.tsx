'use client';

import React, { useState, useEffect } from 'react';
import type { TransactionWithDetails } from '@/lib/services/transaction-service';
import type { Cabang } from '@/types/database';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { Search, Eye, Ban, Receipt, RefreshCw } from 'lucide-react';

interface TransactionTableProps {
  transactions: TransactionWithDetails[];
  canVoid: boolean;
  onViewDetail: (transaksiId: string) => void;
  onOpenVoid: (trx: TransactionWithDetails) => void;
  selectedBranchId?: string;
  onSelectBranchId?: (id: string) => void;
  branches?: Cabang[];
  isOwner?: boolean;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export function TransactionTable({
  transactions,
  canVoid,
  onViewDetail,
  onOpenVoid,
  selectedBranchId = 'semua',
  onSelectBranchId,
  branches = [],
  isOwner = false,
  onRefresh,
  isLoading = false,
}: TransactionTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'semua' | 'lunas' | 'void'>('semua');
  const [methodFilter, setMethodFilter] = useState<'semua' | 'tunai' | 'qris'>('semua');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Reset pagination when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, methodFilter, selectedBranchId]);

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

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginatedData = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-4">
      {/* Filter Bar Container */}
      <div className="rounded-xl border border-border/60 bg-card p-3 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            placeholder="Cari nomor struk atau kasir..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 text-sm bg-background/50 rounded-xl"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Cabang Filter untuk Owner */}
          {isOwner && branches.length > 0 && onSelectBranchId && (
            <div className="w-[160px]">
              <Select value={selectedBranchId} onValueChange={onSelectBranchId}>
                <SelectTrigger className="h-10 text-sm rounded-xl">
                  <SelectValue placeholder="Semua Cabang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="semua">Semua Cabang</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.kode} - {b.nama}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Filter Status */}
          <div className="w-[140px]">
            <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val as any)}>
              <SelectTrigger className="h-10 text-sm rounded-xl">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="semua">Semua Status</SelectItem>
                <SelectItem value="lunas">Lunas</SelectItem>
                <SelectItem value="void">Void</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filter Metode Bayar */}
          <div className="w-[140px]">
            <Select value={methodFilter} onValueChange={(val) => setMethodFilter(val as any)}>
              <SelectTrigger className="h-10 text-sm rounded-xl">
                <SelectValue placeholder="Metode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="semua">Semua Metode</SelectItem>
                <SelectItem value="tunai">Tunai</SelectItem>
                <SelectItem value="qris">QRIS</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tombol Refresh */}
          {onRefresh && (
            <Button
              type="button"
              variant="outline"
              onClick={onRefresh}
              disabled={isLoading}
              className="h-10 px-3 text-sm rounded-xl"
            >
              <RefreshCw className={`h-4 w-4 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          )}
        </div>
      </div>

      {/* Tabel Transaksi */}
      <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 border-b border-border/60 hover:bg-muted/40">
              <TableHead className="py-3.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nomor Struk</TableHead>
              <TableHead className="py-3.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Waktu</TableHead>
              <TableHead className="py-3.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cabang</TableHead>
              <TableHead className="py-3.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Kasir</TableHead>
              <TableHead className="py-3.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Total Transaksi</TableHead>
              <TableHead className="py-3.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">Metode</TableHead>
              <TableHead className="py-3.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">Status</TableHead>
              <TableHead className="py-3.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Aksi</TableHead>
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
              paginatedData.map((trx) => (
                <TableRow key={trx.id} className="border-b border-border/40 hover:bg-muted/30 transition-colors py-3 px-4 text-sm">
                  <TableCell className="py-3 px-4 font-mono font-medium text-foreground">
                    {trx.nomor_struk}
                  </TableCell>
                  <TableCell className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                    {new Date(trx.dibuat_pada).toLocaleString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </TableCell>
                  <TableCell className="py-3 px-4 font-medium">
                    {trx.cabang?.kode || '-'}
                  </TableCell>
                  <TableCell className="py-3 px-4 text-muted-foreground">
                    {trx.kasir?.nama_lengkap || '-'}
                  </TableCell>
                  <TableCell className="py-3 px-4 text-right font-semibold text-foreground">
                    Rp{trx.total.toLocaleString('id-ID')}
                  </TableCell>
                  <TableCell className="py-3 px-4 text-center">
                    <Badge variant="outline" className="font-medium text-xs px-2.5 py-0.5 rounded-full uppercase">
                      {trx.metode_bayar}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-3 px-4 text-center">
                    <Badge
                      variant={trx.status === 'lunas' ? 'success' : 'destructive'}
                      className="font-medium text-xs px-2.5 py-0.5 rounded-full uppercase"
                    >
                      {trx.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        title="Lihat Detail"
                        onClick={() => onViewDetail(trx.id)}
                        className="h-8 w-8 rounded-md text-muted-foreground hover:text-primary"
                      >
                        <Eye className="h-4 w-4" />
                        <span className="sr-only">Lihat Detail</span>
                      </Button>

                      {canVoid && trx.status === 'lunas' && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          title="Void Transaksi"
                          onClick={() => onOpenVoid(trx)}
                          className="h-8 w-8 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        >
                          <Ban className="h-4 w-4" />
                          <span className="sr-only">Void</span>
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <DataTablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={filtered.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>
    </div>
  );
}
