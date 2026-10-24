'use client';

import React, { useState, useMemo } from 'react';
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
import { StockItem, isLowStock } from '@/lib/services/stock-service';
import { StockAdjustmentModal } from './StockAdjustmentModal';
import { LoadingState } from '@/components/ui/loading-state';
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

      {/* Filter and Search Bar */}
      <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Cari nama produk atau SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs h-9 bg-muted/50 border-border"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="h-9 px-3 rounded-md border border-border bg-muted/50 text-xs text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>

          {/* Branch filter: only Owner can switch, Kepala Toko is locked */}
          {userRole === 'owner' ? (
            <div className="flex items-center gap-1.5 bg-muted/50 px-2.5 py-1 rounded-md border border-border">
              <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
              <select
                value={selectedCabang}
                onChange={(e) => setSelectedCabang(e.target.value)}
                className="bg-transparent text-xs text-foreground font-medium focus:outline-none"
              >
                <option value="all">Semua Cabang</option>
                {cabangList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.kode} - {c.nama}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-muted px-3 py-1.5 rounded-md text-xs font-semibold text-foreground border border-border">
              <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
              Cabang: {cabangList.find((c) => c.id === userCabangId)?.nama || 'Cabang Saya'}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
            className="text-xs h-9 gap-1.5 text-muted-foreground"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stock Table */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="text-xs font-bold text-muted-foreground">SKU</TableHead>
              <TableHead className="text-xs font-bold text-muted-foreground">Nama Produk</TableHead>
              <TableHead className="text-xs font-bold text-muted-foreground">Kategori</TableHead>
              <TableHead className="text-xs font-bold text-muted-foreground">Cabang</TableHead>
              <TableHead className="text-xs font-bold text-muted-foreground text-right">Stok Fisik</TableHead>
              <TableHead className="text-xs font-bold text-muted-foreground text-right">Batas Min</TableHead>
              <TableHead className="text-xs font-bold text-muted-foreground text-center">Status</TableHead>
              <TableHead className="text-xs font-bold text-muted-foreground text-right">Aksi</TableHead>
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
                <TableCell colSpan={8} className="text-center py-8 text-xs text-muted-foreground">
                  Tidak ada data stok yang sesuai dengan filter.
                </TableCell>
              </TableRow>
            ) : (
              filteredItems.map((item) => {
                const isWarning = isLowStock(item.jumlah, item.stok_minimum);
                const canAdjust =
                  !!item.produk &&
                  (userRole === 'owner' ||
                    (userRole === 'kepala_toko' && item.cabang_id === userCabangId));

                return (
                  <TableRow
                    key={item.id}
                    className={`hover:bg-muted/40 transition-colors ${
                      isWarning ? 'bg-amber-50/40 dark:bg-amber-950/20' : ''
                    }`}
                  >
                    <TableCell className="font-mono text-xs font-semibold text-foreground">
                      {item.produk?.sku ?? '-'}
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-foreground">
                      <div>{item.produk?.nama ?? 'Produk tidak tersedia / nonaktif'}</div>
                      <span className="text-[10px] text-muted-foreground font-normal">
                        {item.produk
                          ? `Rp ${item.produk.harga_jual.toLocaleString('id-ID')}`
                          : 'Harga tidak tersedia'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className="text-[10px] font-semibold uppercase tracking-wider bg-muted text-muted-foreground"
                      >
                        {item.produk?.kategori ?? '-'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-foreground">
                      <span className="font-bold text-foreground">{item.cabang?.kode}</span> -{' '}
                      {item.cabang?.nama}
                    </TableCell>
                    <TableCell className="text-right">
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
                    <TableCell className="text-right font-mono text-xs text-muted-foreground">
                      {item.stok_minimum}
                    </TableCell>
                    <TableCell className="text-center">
                      {item.jumlah === 0 ? (
                        <Badge className="bg-rose-100 text-rose-700 border-rose-300 text-[10px] hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 dark:hover:bg-rose-950/50">
                          Habis
                        </Badge>
                      ) : isWarning ? (
                        <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px] hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 dark:hover:bg-amber-950/50">
                          Menipis (≤ Min)
                        </Badge>
                      ) : (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 dark:hover:bg-emerald-950/50">
                          Aman
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {canAdjust ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedItemForAdjustment(item)}
                          className="text-xs h-8 border-border hover:border-primary hover:text-primary font-semibold"
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5 mr-1 text-muted-foreground" />
                          Sesuaikan
                        </Button>
                      ) : (
                        <span className="text-[11px] text-muted-foreground italic">
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
