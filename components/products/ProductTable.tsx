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
import { LoadingState } from '@/components/ui/loading-state';
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
      <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex flex-1 items-center gap-2.5 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Cari SKU atau nama produk..."
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
            className="h-9 px-3 rounded-md border border-border bg-muted/50 text-xs text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-primary"
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
            className="text-xs h-9 gap-1.5 text-muted-foreground"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          {isOwner && (
            <Button
              size="sm"
              onClick={handleCreate}
              className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs h-9 gap-1.5 font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              Tambah Produk
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="text-xs font-bold text-muted-foreground">SKU</TableHead>
              <TableHead className="text-xs font-bold text-muted-foreground">Nama Produk</TableHead>
              <TableHead className="text-xs font-bold text-muted-foreground">Kategori</TableHead>
              <TableHead className="text-xs font-bold text-muted-foreground text-right">Harga Jual</TableHead>
              {/* Owner Exclusive Cost Column (BR-11, TC-18) */}
              {isOwner && (
                <TableHead className="text-xs font-bold text-primary text-right bg-primary/5">
                  <span className="flex items-center justify-end gap-1">
                    <Lock className="w-3 h-3 text-primary" />
                    HPP Modal (Owner)
                  </span>
                </TableHead>
              )}
              <TableHead className="text-xs font-bold text-muted-foreground text-right">Batas Min</TableHead>
              <TableHead className="text-xs font-bold text-muted-foreground text-center">Status</TableHead>
              {isOwner && (
                <TableHead className="text-xs font-bold text-muted-foreground text-right">Aksi</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={isOwner ? 8 : 6} className="p-0">
                  <LoadingState label="Memuat katalog produk..." />
                </TableCell>
              </TableRow>
            ) : filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={isOwner ? 8 : 6}
                  className="text-center py-8 text-xs text-muted-foreground"
                >
                  Tidak ada produk yang sesuai dengan filter.
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((prod) => (
                <TableRow key={prod.id} className="hover:bg-muted/40 transition-colors">
                  <TableCell className="font-mono text-xs font-semibold text-foreground">
                    {prod.sku}
                  </TableCell>
                  <TableCell className="text-xs font-semibold text-foreground">
                    <div>{prod.nama}</div>
                    {!prod.lacak_stok && (
                      <span className="text-[10px] text-muted-foreground font-normal">
                        Tidak melacak stok
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className="text-[10px] uppercase font-bold tracking-wider bg-muted text-muted-foreground"
                    >
                      {prod.kategori}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs font-bold text-foreground">
                    Rp {prod.harga_jual.toLocaleString('id-ID')}
                  </TableCell>

                  {/* Owner Exclusive Cost Field */}
                  {isOwner && (
                    <TableCell className="text-right font-mono text-xs text-primary bg-primary/5">
                      {prod.harga_modal_terakhir !== undefined ? (
                        <div>
                          <span className="font-bold">
                            Rp {prod.harga_modal_terakhir.toLocaleString('id-ID')}
                          </span>
                          <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-sans">
                            Margin: Rp{' '}
                            {(prod.harga_jual - prod.harga_modal_terakhir).toLocaleString('id-ID')}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic text-[11px]">-</span>
                      )}
                    </TableCell>
                  )}

                  <TableCell className="text-right font-mono text-xs text-muted-foreground">
                    {prod.stok_minimum}
                  </TableCell>
                  <TableCell className="text-center">
                    {prod.aktif ? (
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 dark:hover:bg-emerald-950/50">
                        Aktif
                      </Badge>
                    ) : (
                      <Badge className="bg-muted text-muted-foreground border-border text-[10px] hover:bg-muted/60">
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
                          className="h-7 w-7 p-0 text-primary hover:bg-primary/10"
                        >
                          <History className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(prod)}
                          title="Ubah Produk"
                          className="h-7 w-7 p-0 text-muted-foreground hover:bg-muted/60"
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
