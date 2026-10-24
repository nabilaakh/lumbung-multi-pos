'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getBranchStock, StockItem } from '@/lib/services/stock-service';
import { StockTable } from '@/components/stock/StockTable';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Package, ShieldAlert, Boxes, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function StokPage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<{ id: string; peran: string; cabang_id: string | null } | null>(null);
  const [cabangList, setCabangList] = useState<{ id: string; kode: string; nama: string }[]>([]);
  const [stockList, setStockList] = useState<StockItem[]>([]);
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

      const { data: branches } = await supabase
        .from('cabang')
        .select('id, kode, nama')
        .order('kode');

      setCabangList(branches || []);

      // If kepala_toko, fetch their branch; if owner, fetch all
      const targetCabang = prof?.peran === 'kepala_toko' ? prof.cabang_id : undefined;
      const stocks = await getBranchStock(targetCabang || undefined);
      setStockList(stocks);
    } catch (err) {
      console.error('Error loading stock data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground font-serif flex items-center gap-2">
            <Boxes className="w-6 h-6 text-primary" />
            Manajemen Stok Cabang
          </h1>
          <p className="text-sm text-muted-foreground">
            Pemantauan kuantitas fisik, batas ambang minimum stok (BR-09), dan audit penyesuaian stok (BR-12).
          </p>
        </div>
      </div>

      {/* Stock Table Component */}
      <StockTable
        stockList={stockList}
        userRole={profile?.peran || 'kasir'}
        userCabangId={profile?.cabang_id}
        cabangList={cabangList}
        onRefresh={loadData}
        loading={isLoading}
      />
    </div>
  );
}
