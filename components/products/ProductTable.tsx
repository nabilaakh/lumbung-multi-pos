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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
      {/* Action and Filter Bar Container */}
      <div className="rounded-xl border border-border/60 bg-card p-3 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input
            type="text"
            placeholder="Cari SKU atau nama produk..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-sm h-10 bg-background/50 rounded-xl"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Category Select */}
          <div className="w-[170px]">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="h-10 text-sm rounded-xl">
                <SelectValue placeholder="Kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kategori</SelectItem>
                {PRODUCT_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status Select */}
          <div className="w-[150px]">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-10 text-sm rounded-xl">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="aktif">Hanya Aktif</SelectItem>
                <SelectItem value="nonaktif">Hanya Nonaktif</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="outline"
            onClick={onRefresh}
            disabled={loading}
            className="h-10 px-3 text-sm rounded-xl"
          >
            <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          {isOwner && (
            <Button
              onClick={handleCreate}
              className="h-10 px-4 text-sm rounded-xl font-medium"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Tambah Produk
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 border-b border-border/60 hover:bg-muted/40">
              <TableHead className="py-3.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">SKU</TableHead>
              <TableHead className="py-3.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nama Produk</TableHead>
              <TableHead className="py-3.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Kategori</TableHead>
              <TableHead className="py-3.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Harga Jual</TableHead>
              {/* Owner Exclusive Cost Column (BR-11, TC-18) */}
              {isOwner && (
                <TableHead className="py-3.5 px-4 text-xs font-semibold text-primary uppercase tracking-wider text-right bg-primary/5">
                  <span className="flex items-center justify-end gap-1">
                    <Lock className="w-3.5 h-3.5 text-primary" />
                    HPP Modal (Owner)
                  </span>
                </TableHead>
              )}
              <TableHead className="py-3.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">Status</TableHead>
              {isOwner && (
                <TableHead className="py-3.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Aksi</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={isOwner ? 7 : 5} className="p-0">
                  <LoadingState label="Memuat katalog produk..." />
                </TableCell>
              </TableRow>
            ) : filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={isOwner ? 7 : 5}
                  className="text-center py-12 text-sm text-muted-foreground"
                >
                  Tidak ada produk yang sesuai dengan filter.
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((prod) => (
                <TableRow key={prod.id} className="border-b border-border/40 hover:bg-muted/30 transition-colors py-3 px-4 text-sm">
                  <TableCell className="py-3 px-4 font-mono font-medium text-foreground">
                    {prod.sku}
                  </TableCell>
                  <TableCell className="py-3 px-4 text-foreground">
                    <div className="font-medium">{prod.nama}</div>
                    {!prod.lacak_stok && (
                      <span className="text-xs text-muted-foreground">
                        Tidak melacak stok
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="py-3 px-4">
                    <Badge
                      variant="secondary"
                      className="font-medium text-xs px-2.5 py-0.5 rounded-full uppercase"
                    >
                      {prod.kategori}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-3 px-4 text-right font-mono font-semibold text-foreground">
                    Rp {prod.harga_jual.toLocaleString('id-ID')}
                  </TableCell>

                  {/* Owner Exclusive Cost Field */}
                  {isOwner && (
                    <TableCell className="py-3 px-4 text-right font-mono text-sm text-primary bg-primary/5">
                      {prod.harga_modal_terakhir !== undefined ? (
                        <div>
                          <span className="font-semibold">
                            Rp {prod.harga_modal_terakhir.toLocaleString('id-ID')}
                          </span>
                          <div className="text-xs text-emerald-700 dark:text-emerald-400">
                            Margin: Rp{' '}
                            {(prod.harga_jual - prod.harga_modal_terakhir).toLocaleString('id-ID')}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic text-xs">-</span>
                      )}
                    </TableCell>
                  )}

                  <TableCell className="py-3 px-4 text-center">
                    {prod.aktif ? (
                      <Badge variant="success" className="font-medium text-xs px-2.5 py-0.5 rounded-full">
                        Aktif
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="font-medium text-xs px-2.5 py-0.5 rounded-full">
                        Nonaktif
                      </Badge>
                    )}
                  </TableCell>

                  {/* Owner Actions */}
                  {isOwner && (
                    <TableCell className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setSelectedProductForCostHistory(prod)}
                          title="Lihat Riwayat HPP"
                          className="h-8 w-8 rounded-md text-muted-foreground hover:text-primary"
                        >
                          <History className="h-4 w-4" />
                          <span className="sr-only">Lihat Riwayat HPP</span>
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleEdit(prod)}
                          title="Ubah Produk"
                          className="h-8 w-8 rounded-md text-muted-foreground hover:text-foreground"
                        >
                          <Edit2 className="h-4 w-4" />
                          <span className="sr-only">Ubah Produk</span>
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
