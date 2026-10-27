'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getProducts, ProductWithCost } from '@/lib/services/product-service';
import { ProductTable } from '@/components/products/ProductTable';
import { Package, Lock, ShieldCheck } from 'lucide-react';

export default function ProdukPage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<{ id: string; peran: string; cabang_id: string | null } | null>(null);
  const [products, setProducts] = useState<ProductWithCost[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setIsLoading(false);
        return;
      }

      const { data: prof } = await supabase
        .from('profiles')
        .select('id, peran, cabang_id')
        .eq('id', user.id)
        .single();

      if (prof) {
        setProfile(prof);
      }

      const prods = await getProducts(prof?.peran);
      setProducts(prods);
    } catch (err) {
      console.error('Error loading products data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const isOwner = profile?.peran === 'owner';

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Katalog Master Produk
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Struktur 5 kategori bisnis (kopi, non_kopi, roti, snack, kemasan) dan proteksi harga modal (BR-01 & BR-11).
          </p>
        </div>
      </div>

      {/* Product Table Component */}
      <ProductTable
        products={products}
        userRole={profile?.peran || 'kasir'}
        ownerId={profile?.id}
        onRefresh={loadData}
        loading={isLoading}
      />
    </div>
  );
}
