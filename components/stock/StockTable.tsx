'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StockItem, isLowStock } from '@/lib/services/stock-service';
import { StockAdjustmentModal } from './StockAdjustmentModal';
import { LoadingState } from '@/components/ui/loading-state';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import {
  Search,
  AlertTriangle,
  CheckCircle2,
  SlidersHorizontal,
  PackageCheck,
  Building2,
  RefreshCw,
} from 'lucide-react';

interface StockTableProps {
  stockList: StockItem[];
  userRole: string;
  userCabangId?: string | null;
  cabangList: { id: string; kode: string; nama: string }[];
  onRefresh: () => void;
  loading?: boolean;
}

const CATEGORIES = [
  { id: 'all', label: 'Semua Kategori' },
  { id: 'kopi', label: 'Kopi' },
  { id: 'non_kopi', label: 'Non-Kopi' },
  { id: 'roti', label: 'Roti' },
  { id: 'snack', label: 'Snack' },
  { id: 'kemasan', label: 'Kemasan' },
];

export function StockTable({
  stockList,
  userRole,
  userCabangId,
  cabangList,
  onRefresh,
  loading = false,
}: StockTableProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedCabang, setSelectedCabang] = useState(
    userRole === 'kepala_toko' && userCabangId ? userCabangId : 'all'
  );
  const [filterLowStockOnly, setFilterLowStockOnly] = useState(false);
  const [selectedItemForAdjustment, setSelectedItemForAdjustment] = useState<StockItem | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Reset pagination when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedCategory, selectedCabang, filterLowStockOnly]);

  const filteredItems = useMemo(() => {
    return stockList.filter((item) => {
      // Cabang filter
      if (selectedCabang !== 'all' && item.cabang_id !== selectedCabang) {
        return false;
      }

      // Category filter
      if (selectedCategory !== 'all' && item.produk?.kategori !== selectedCategory) {
        return false;
      }

      // Low stock filter
      if (filterLowStockOnly && !isLowStock(item.jumlah, item.stok_minimum)) {
        return false;
      }

      // Search filter (name or sku)
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = (item.produk?.nama ?? '').toLowerCase().includes(q);
        const matchSku = (item.produk?.sku ?? '').toLowerCase().includes(q);
        if (!matchName && !matchSku) return false;
      }

      return true;
    });
  }, [stockList, selectedCabang, selectedCategory, filterLowStockOnly, search]);

  const totalPages = Math.ceil(filteredItems.length / pageSize) || 1;
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const lowStockCount = useMemo(() => {
    return stockList.filter((item) => isLowStock(item.jumlah, item.stok_minimum)).length;
  }, [stockList]);

  return (
    <div className="space-y-4">
      {/* Top Banner if low stock items exist */}
      {lowStockCount > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/25 border border-amber-200 dark:border-amber-900 rounded-xl p-4 flex items-center justify-between text-amber-900 dark:text-amber-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-950/50 rounded-lg text-amber-700 dark:text-amber-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold">Peringatan Stok Menipis (BR-09)</h4>
              <p className="text-xs text-amber-800 dark:text-amber-300">
                Terdapat <strong>{lowStockCount} item</strong> dengan jumlah stok di bawah atau sama dengan batas minimum.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setFilterLowStockOnly(!filterLowStockOnly)}
            className={`text-xs border-amber-300 dark:border-amber-800 font-semibold ${
              filterLowStockOnly
                ? 'bg-amber-600 text-white hover:bg-amber-700'
                : 'text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/40'
            }`}
          >
            {filterLowStockOnly ? 'Tampilkan Semua Stok' : 'Lihat Stok Menipis Saja'}
          </Button>
        </div>
      )}

      {/* Filter and Search Bar Container */}
      <div className="rounded-xl border border-border/60 bg-card p-3 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input
            type="text"
            placeholder="Cari nama produk atau SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-sm h-10 bg-background/50 rounded-xl"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Category Select */}
          <div className="w-[160px]">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="h-10 text-sm rounded-xl">
                <SelectValue placeholder="Kategori" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Branch filter: only Owner can switch, Kepala Toko is locked */}
          {userRole === 'owner' ? (
            <div className="w-[180px]">
              <Select value={selectedCabang} onValueChange={setSelectedCabang}>
                <SelectTrigger className="h-10 text-sm rounded-xl">
                  <SelectValue placeholder="Semua Cabang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Cabang</SelectItem>
                  {cabangList.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.kode} - {c.nama}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-muted/40 px-3 h-10 rounded-xl text-xs font-medium text-foreground border border-border/60">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              <span>{cabangList.find((c) => c.id === userCabangId)?.nama || 'Cabang Saya'}</span>
            </div>
          )}

          <Button
            variant="outline"
            onClick={onRefresh}
            disabled={loading}
            className="h-10 px-3 text-sm rounded-xl"
          >
            <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stock Table */}
      <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 border-b border-border/60 hover:bg-muted/40">
              <TableHead className="py-3.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">SKU</TableHead>
              <TableHead className="py-3.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nama Produk</TableHead>
              <TableHead className="py-3.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Kategori</TableHead>
              <TableHead className="py-3.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cabang</TableHead>
              <TableHead className="py-3.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Stok Fisik</TableHead>
              <TableHead className="py-3.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Batas Min</TableHead>
              <TableHead className="py-3.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">Status</TableHead>
              <TableHead className="py-3.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="p-0">
                  <LoadingState label="Memuat data inventaris stok..." />
                </TableCell>
              </TableRow>
            ) : filteredItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-sm text-muted-foreground">
                  Tidak ada data stok yang sesuai dengan filter.
                </TableCell>
              </TableRow>
            ) : (
              paginatedItems.map((item) => {
                const isWarning = isLowStock(item.jumlah, item.stok_minimum);
                const canAdjust =
                  !!item.produk &&
                  (userRole === 'owner' ||
                    (userRole === 'kepala_toko' && item.cabang_id === userCabangId));

                return (
                  <TableRow
                    key={item.id}
                    className="border-b border-border/40 hover:bg-muted/30 transition-colors py-3 px-4 text-sm"
                  >
                    <TableCell className="py-3 px-4 font-mono font-medium text-foreground">
                      {item.produk?.sku ?? '-'}
                    </TableCell>
                    <TableCell className="py-3 px-4 text-foreground">
                      <div className="font-medium">{item.produk?.nama ?? 'Produk tidak tersedia / nonaktif'}</div>
                      <span className="text-xs text-muted-foreground">
                        {item.produk
                          ? `Rp ${item.produk.harga_jual.toLocaleString('id-ID')}`
                          : 'Harga tidak tersedia'}
                      </span>
                    </TableCell>
                    <TableCell className="py-3 px-4">
                      <Badge
                        variant="secondary"
                        className="font-medium text-xs px-2.5 py-0.5 rounded-full uppercase"
                      >
                        {item.produk?.kategori ?? '-'}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3 px-4 text-sm text-foreground">
                      <span className="font-semibold">{item.cabang?.kode}</span> - {item.cabang?.nama}
                    </TableCell>
                    <TableCell className="py-3 px-4 text-right">
                      <span
                        className={`font-mono text-sm font-bold ${
                          item.jumlah === 0
                            ? 'text-rose-600 dark:text-rose-400'
                            : isWarning
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-foreground'
                        }`}
                      >
                        {item.jumlah}
                      </span>
                    </TableCell>
                    <TableCell className="py-3 px-4 text-right font-mono text-sm text-muted-foreground">
                      {item.stok_minimum}
                    </TableCell>
                    <TableCell className="py-3 px-4 text-center">
                      {item.jumlah === 0 ? (
                        <Badge variant="destructive" className="font-medium text-xs px-2.5 py-0.5 rounded-full">
                          Habis
                        </Badge>
                      ) : isWarning ? (
                        <Badge variant="warning" className="font-medium text-xs px-2.5 py-0.5 rounded-full">
                          Menipis
                        </Badge>
                      ) : (
                        <Badge variant="success" className="font-medium text-xs px-2.5 py-0.5 rounded-full">
                          Aman
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="py-3 px-4 text-right">
                      {canAdjust ? (
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Sesuaikan Stok"
                          onClick={() => setSelectedItemForAdjustment(item)}
                          className="h-8 w-8 rounded-md text-muted-foreground hover:text-foreground"
                        >
                          <SlidersHorizontal className="h-4 w-4" />
                          <span className="sr-only">Sesuaikan Stok</span>
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">
                          {item.produk ? 'Terkunci' : 'Tidak tersedia'}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        <DataTablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={filteredItems.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      {/* Stock Adjustment Modal */}
      <StockAdjustmentModal
        isOpen={!!selectedItemForAdjustment}
        onClose={() => setSelectedItemForAdjustment(null)}
        item={selectedItemForAdjustment}
        onSuccess={() => {
          onRefresh();
          setSelectedItemForAdjustment(null);
        }}
        userRole={userRole}
        userCabangId={userCabangId}
      />
    </div>
  );
}
