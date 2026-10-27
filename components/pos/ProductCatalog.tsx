'use client';

import React, { useState } from 'react';
import type { Produk, KategoriProduk } from '@/types/database';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Coffee, Utensils, Cookie, Package, Sparkles } from 'lucide-react';

export interface ProductWithStock extends Produk {
  stok_tersedia: number | null;
}

interface ProductCatalogProps {
  products: ProductWithStock[];
  onAddToCart: (product: ProductWithStock) => void;
}

const CATEGORIES: Array<{ key: string; label: string; icon: any }> = [
  { key: 'semua', label: 'Semua Menu', icon: Sparkles },
  { key: 'kopi', label: 'Kopi', icon: Coffee },
  { key: 'non_kopi', label: 'Non-Kopi', icon: Coffee },
  { key: 'roti', label: 'Roti', icon: Utensils },
  { key: 'snack', label: 'Snack', icon: Cookie },
  { key: 'kemasan', label: 'Kemasan', icon: Package },
];

export function ProductCatalog({ products, onAddToCart }: ProductCatalogProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('semua');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredProducts = products.filter((prod) => {
    // Hanya tampilkan produk aktif (BR-11)
    if (!prod.aktif) return false;

    // Filter Kategori
    if (selectedCategory !== 'semua' && prod.kategori !== selectedCategory) {
      return false;
    }

    // Filter Pencarian
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      const matchName = prod.nama.toLowerCase().includes(q);
      const matchSku = prod.sku.toLowerCase().includes(q);
      if (!matchName && !matchSku) return false;
    }

    return true;
  });

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Search Bar & Category Filter Tabs */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            placeholder="Cari nama menu atau SKU (contoh: Kopi Susu, ROT-001)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11 text-sm bg-card"
          />
        </div>

        {/* Category Pills (Horizontal Scroll for Tablet Touch) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.key;
            return (
              <Button
                key={cat.key}
                type="button"
                variant={isSelected ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(cat.key)}
                className={`h-9 px-3.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs'
                    : 'bg-card text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="h-3.5 w-3.5 mr-1.5" />
                {cat.label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Grid Menu Produk */}
      <div className="flex-1 overflow-y-auto pr-1">
        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground text-sm">
            <Package className="h-10 w-10 mb-2 opacity-30" />
            <p className="font-medium">Tidak ada produk yang sesuai.</p>
            <p className="text-xs">Coba kata kunci pencarian atau kategori lain.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredProducts.map((prod) => {
              const isOutOfStock = prod.lacak_stok && (prod.stok_tersedia ?? 0) <= 0;

              return (
                <Card
                  key={prod.id}
                  onClick={() => !isOutOfStock && onAddToCart(prod)}
                  className={`border transition-all select-none flex flex-col justify-between ${
                    isOutOfStock
                      ? 'opacity-50 cursor-not-allowed bg-muted/40'
                      : 'cursor-pointer hover:border-primary/50 hover:shadow-md active:scale-[0.98] bg-card'
                  }`}
                >
                  <CardContent className="p-3.5 flex flex-col justify-between h-full">
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <span className="text-[10px] font-mono font-medium text-muted-foreground uppercase">
                          {prod.sku}
                        </span>
                        {prod.lacak_stok ? (
                          <Badge
                            variant={isOutOfStock ? 'destructive' : 'secondary'}
                            className="text-[10px] px-1.5 py-0 font-normal"
                          >
                            {isOutOfStock ? 'Habis' : `Stok: ${prod.stok_tersedia}`}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal text-muted-foreground">
                            Tersedia
                          </Badge>
                        )}
                      </div>

                      <h4 className="font-semibold text-foreground text-sm line-clamp-2 leading-tight">
                        {prod.nama}
                      </h4>
                    </div>

                    <div className="mt-3 pt-2 border-t border-border/50 flex items-center justify-between">
                      <span className="text-sm font-extrabold text-primary">
                        Rp{prod.harga_jual.toLocaleString('id-ID')}
                      </span>
                      <span className="text-[10px] text-muted-foreground capitalize">
                        {prod.kategori.replace('_', ' ')}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
