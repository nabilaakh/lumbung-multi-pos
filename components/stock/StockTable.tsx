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
      if (selectedCategory !== 'all' && item.produk.kategori !== selectedCategory) {
        return false;
      }

      // Low stock filter
      if (filterLowStockOnly && !isLowStock(item.jumlah, item.stok_minimum)) {
        return false;
      }

      // Search filter (name or sku)
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = item.produk.nama.toLowerCase().includes(q);
        const matchSku = item.produk.sku.toLowerCase().includes(q);
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
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between text-amber-900 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg text-amber-700">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold">Peringatan Stok Menipis (BR-09)</h4>
              <p className="text-xs text-amber-800">
                Terdapat <strong>{lowStockCount} item</strong> dengan jumlah stok di bawah atau sama dengan batas minimum.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setFilterLowStockOnly(!filterLowStockOnly)}
            className={`text-xs border-amber-300 font-semibold ${
              filterLowStockOnly
                ? 'bg-amber-600 text-white hover:bg-amber-700'
                : 'text-amber-800 hover:bg-amber-100'
            }`}
          >
            {filterLowStockOnly ? 'Tampilkan Semua Stok' : 'Lihat Stok Menipis Saja'}
          </Button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Cari nama produk atau SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs h-9 bg-slate-50 border-slate-200"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="h-9 px-3 rounded-md border border-slate-200 bg-slate-50 text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>

          {/* Branch filter: only Owner can switch, Kepala Toko is locked */}
          {userRole === 'owner' ? (
            <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedCabang}
                onChange={(e) => setSelectedCabang(e.target.value)}
                className="bg-transparent text-xs text-slate-700 font-medium focus:outline-none"
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
            <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-md text-xs font-semibold text-slate-700 border border-slate-200">
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
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
            className="text-xs h-9 gap-1.5 text-slate-600"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stock Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="text-xs font-bold text-slate-600">SKU</TableHead>
              <TableHead className="text-xs font-bold text-slate-600">Nama Produk</TableHead>
              <TableHead className="text-xs font-bold text-slate-600">Kategori</TableHead>
              <TableHead className="text-xs font-bold text-slate-600">Cabang</TableHead>
              <TableHead className="text-xs font-bold text-slate-600 text-right">Stok Fisik</TableHead>
              <TableHead className="text-xs font-bold text-slate-600 text-right">Batas Min</TableHead>
              <TableHead className="text-xs font-bold text-slate-600 text-center">Status</TableHead>
              <TableHead className="text-xs font-bold text-slate-600 text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-xs text-slate-500">
                  Tidak ada data stok yang sesuai dengan filter.
                </TableCell>
              </TableRow>
            ) : (
              filteredItems.map((item) => {
                const isWarning = isLowStock(item.jumlah, item.stok_minimum);
                const canAdjust =
                  userRole === 'owner' ||
                  (userRole === 'kepala_toko' && item.cabang_id === userCabangId);

                return (
                  <TableRow
                    key={item.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      isWarning ? 'bg-amber-50/40' : ''
                    }`}
                  >
                    <TableCell className="font-mono text-xs font-semibold text-slate-700">
                      {item.produk.sku}
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-slate-800">
                      <div>{item.produk.nama}</div>
                      <span className="text-[10px] text-slate-500 font-normal">
                        Rp {item.produk.harga_jual.toLocaleString('id-ID')}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className="text-[10px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-600"
                      >
                        {item.produk.kategori}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-700">
                      <span className="font-bold text-slate-800">{item.cabang?.kode}</span> -{' '}
                      {item.cabang?.nama}
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={`font-mono text-sm font-bold ${
                          item.jumlah === 0
                            ? 'text-rose-600'
                            : isWarning
                            ? 'text-amber-600'
                            : 'text-slate-800'
                        }`}
                      >
                        {item.jumlah}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-slate-500">
                      {item.stok_minimum}
                    </TableCell>
                    <TableCell className="text-center">
                      {item.jumlah === 0 ? (
                        <Badge className="bg-rose-100 text-rose-700 border-rose-300 text-[10px] hover:bg-rose-100">
                          Habis
                        </Badge>
                      ) : isWarning ? (
                        <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px] hover:bg-amber-100">
                          Menipis (≤ Min)
                        </Badge>
                      ) : (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] hover:bg-emerald-100">
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
                          className="text-xs h-8 border-slate-300 hover:border-amber-500 hover:text-amber-700 font-semibold"
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5 mr-1 text-slate-500" />
                          Sesuaikan
                        </Button>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Terkunci</span>
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
