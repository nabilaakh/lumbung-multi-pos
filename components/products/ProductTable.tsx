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
import {
  ProductWithCost,
  PRODUCT_CATEGORIES,
} from '@/lib/services/product-service';
import { ProductFormModal } from './ProductFormModal';
import { CostPriceHistoryModal } from './CostPriceHistoryModal';
import {
  Search,
  Plus,
  Edit2,
  History,
  Lock,
  RefreshCw,
  Package,
} from 'lucide-react';

interface ProductTableProps {
  products: ProductWithCost[];
  userRole: string;
  ownerId?: string;
  onRefresh: () => void;
  loading?: boolean;
}

export function ProductTable({
  products,
  userRole,
  ownerId,
  onRefresh,
  loading = false,
}: ProductTableProps) {
  const isOwner = userRole === 'owner';

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedProductForEdit, setSelectedProductForEdit] = useState<ProductWithCost | null>(null);
  const [selectedProductForCostHistory, setSelectedProductForCostHistory] = useState<ProductWithCost | null>(null);

  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      // Category filter
      if (selectedCategory !== 'all' && prod.kategori !== selectedCategory) {
        return false;
      }

      // Status filter
      if (statusFilter === 'aktif' && !prod.aktif) return false;
      if (statusFilter === 'nonaktif' && prod.aktif) return false;

      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = prod.nama.toLowerCase().includes(q);
        const matchSku = prod.sku.toLowerCase().includes(q);
        if (!matchName && !matchSku) return false;
      }

      return true;
    });
  }, [products, selectedCategory, statusFilter, search]);

  const handleCreate = () => {
    setSelectedProductForEdit(null);
    setIsFormModalOpen(true);
  };

  const handleEdit = (prod: ProductWithCost) => {
    setSelectedProductForEdit(prod);
    setIsFormModalOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Action and Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex flex-1 items-center gap-2.5 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Cari SKU atau nama produk..."
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
            <option value="all">Semua Kategori (5 Kategori)</option>
            {PRODUCT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c.toUpperCase()}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-3 rounded-md border border-slate-200 bg-slate-50 text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="all">Semua Status</option>
            <option value="aktif">Hanya Aktif</option>
            <option value="nonaktif">Hanya Nonaktif</option>
          </select>
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

          {isOwner && (
            <Button
              size="sm"
              onClick={handleCreate}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-9 gap-1.5 font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              Tambah Produk
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="text-xs font-bold text-slate-600">SKU</TableHead>
              <TableHead className="text-xs font-bold text-slate-600">Nama Produk</TableHead>
              <TableHead className="text-xs font-bold text-slate-600">Kategori</TableHead>
              <TableHead className="text-xs font-bold text-slate-600 text-right">Harga Jual</TableHead>
              {/* Owner Exclusive Cost Column (BR-11, TC-18) */}
              {isOwner && (
                <TableHead className="text-xs font-bold text-amber-900 text-right bg-amber-50/50">
                  <span className="flex items-center justify-end gap-1">
                    <Lock className="w-3 h-3 text-amber-600" />
                    HPP Modal (Owner)
                  </span>
                </TableHead>
              )}
              <TableHead className="text-xs font-bold text-slate-600 text-right">Batas Min</TableHead>
              <TableHead className="text-xs font-bold text-slate-600 text-center">Status</TableHead>
              {isOwner && (
                <TableHead className="text-xs font-bold text-slate-600 text-right">Aksi</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={isOwner ? 8 : 6}
                  className="text-center py-8 text-xs text-slate-500"
                >
                  Tidak ada produk yang sesuai dengan filter.
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((prod) => (
                <TableRow key={prod.id} className="hover:bg-slate-50/80 transition-colors">
                  <TableCell className="font-mono text-xs font-semibold text-slate-700">
                    {prod.sku}
                  </TableCell>
                  <TableCell className="text-xs font-semibold text-slate-900">
                    <div>{prod.nama}</div>
                    {!prod.lacak_stok && (
                      <span className="text-[10px] text-slate-400 font-normal">
                        Tidak melacak stok
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className="text-[10px] uppercase font-bold tracking-wider bg-slate-100 text-slate-600"
                    >
                      {prod.kategori}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs font-bold text-slate-800">
                    Rp {prod.harga_jual.toLocaleString('id-ID')}
                  </TableCell>

                  {/* Owner Exclusive Cost Field */}
                  {isOwner && (
                    <TableCell className="text-right font-mono text-xs text-amber-900 bg-amber-50/20">
                      {prod.harga_modal_terakhir !== undefined ? (
                        <div>
                          <span className="font-bold">
                            Rp {prod.harga_modal_terakhir.toLocaleString('id-ID')}
                          </span>
                          <div className="text-[10px] text-emerald-700 font-sans">
                            Margin: Rp{' '}
                            {(prod.harga_jual - prod.harga_modal_terakhir).toLocaleString('id-ID')}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">-</span>
                      )}
                    </TableCell>
                  )}

                  <TableCell className="text-right font-mono text-xs text-slate-500">
                    {prod.stok_minimum}
                  </TableCell>
                  <TableCell className="text-center">
                    {prod.aktif ? (
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] hover:bg-emerald-100">
                        Aktif
                      </Badge>
                    ) : (
                      <Badge className="bg-slate-100 text-slate-600 border-slate-300 text-[10px] hover:bg-slate-100">
                        Nonaktif
                      </Badge>
                    )}
                  </TableCell>

                  {/* Owner Actions */}
                  {isOwner && (
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedProductForCostHistory(prod)}
                          title="Lihat Riwayat HPP"
                          className="h-7 w-7 p-0 text-amber-700 hover:bg-amber-50"
                        >
                          <History className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(prod)}
                          title="Ubah Produk"
                          className="h-7 w-7 p-0 text-slate-600 hover:bg-slate-100"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modals */}
      <ProductFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        product={selectedProductForEdit}
        onSuccess={onRefresh}
        userRole={userRole}
        ownerId={ownerId}
      />

      <CostPriceHistoryModal
        isOpen={!!selectedProductForCostHistory}
        onClose={() => setSelectedProductForCostHistory(null)}
        product={selectedProductForCostHistory}
      />
    </div>
  );
}
