'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  getTransactions,
  type TransactionWithDetails,
} from '@/lib/services/transaction-service';
import type { ProfilPengguna, Cabang } from '@/types/database';
import { TransactionTable } from '@/components/transactions/TransactionTable';
import { TransactionDetailModal } from '@/components/transactions/TransactionDetailModal';
import { VoidModal } from '@/components/transactions/VoidModal';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Receipt, Clock, Store, RefreshCw } from 'lucide-react';

export default function TransaksiPage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<ProfilPengguna | null>(null);
  const [allBranches, setAllBranches] = useState<Cabang[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('semua');
  const [transactions, setTransactions] = useState<TransactionWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal States
  const [detailModalId, setDetailModalId] = useState<string | null>(null);
  const [voidTarget, setVoidTarget] = useState<TransactionWithDetails | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setIsLoading(false);
      return;
    }

    const { data: prof } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    const currentProfile = prof as ProfilPengguna | null;
    setProfile(currentProfile);

    // Ambil daftar seluruh cabang
    const { data: branches } = await supabase.from('cabang').select('*').order('kode');
    setAllBranches((branches as Cabang[]) || []);

    if (currentProfile) {
      const isOwner = currentProfile.peran === 'owner';
      const targetCabang = isOwner
        ? selectedBranchId === 'semua'
          ? null
          : selectedBranchId
        : currentProfile.cabang_id;

      const { data: trxList } = await getTransactions(supabase, {
        cabangId: targetCabang,
      });

      setTransactions(trxList);
    }

    setIsLoading(false);
  }, [supabase, selectedBranchId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const canVoid = profile?.peran === 'kepala_toko' || profile?.peran === 'owner';

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground font-serif">
            Riwayat Penjualan & Transaksi
          </h1>
          <p className="text-sm text-muted-foreground">
            Daftar seluruh struk transaksi, rincian pembayaran, dan pembatalan (*void*) terverifikasi.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter Cabang untuk Owner */}
          {profile?.peran === 'owner' && (
            <div className="flex items-center gap-1.5 bg-card p-1 rounded-lg border text-xs">
              <Store className="h-3.5 w-3.5 text-muted-foreground ml-1.5" />
              <Button
                variant={selectedBranchId === 'semua' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSelectedBranchId('semua')}
                className="h-7 text-xs px-2.5"
              >
                Semua Cabang
              </Button>
              {allBranches.map((cb) => (
                <Button
                  key={cb.id}
                  variant={selectedBranchId === cb.id ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setSelectedBranchId(cb.id)}
                  className="h-7 text-xs px-2.5"
                >
                  {cb.kode}
                </Button>
              ))}
            </div>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={isLoading}
            className="h-9 px-3 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Segarkan
          </Button>
        </div>
      </div>

      {/* Tabel Transaksi */}
      <TransactionTable
        transactions={transactions}
        canVoid={canVoid}
        onViewDetail={(id) => setDetailModalId(id)}
        onOpenVoid={(trx) => setVoidTarget(trx)}
      />

      {/* Modal Detail Transaksi */}
      <TransactionDetailModal
        isOpen={Boolean(detailModalId)}
        onClose={() => setDetailModalId(null)}
        transactionId={detailModalId}
        canVoid={canVoid}
        onOpenVoidModal={(trx) => {
          setDetailModalId(null);
          setVoidTarget(trx);
        }}
      />

      {/* Modal Eksekusi Void Transaksi */}
      <VoidModal
        isOpen={Boolean(voidTarget)}
        onClose={() => setVoidTarget(null)}
        transaction={voidTarget}
        onSuccessVoid={() => {
          loadData();
        }}
      />
    </div>
  );
}
