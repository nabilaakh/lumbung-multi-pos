'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  getActiveShift,
  calculateCurrentShiftTotals,
} from '@/lib/services/shift-service';
import type { ShiftKasir, ProfilPengguna } from '@/types/database';
import { ShiftSummaryCard } from '@/components/shift/ShiftSummaryCard';
import { OpenShiftModal } from '@/components/shift/OpenShiftModal';
import { CloseShiftModal } from '@/components/shift/CloseShiftModal';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, History, AlertCircle, ShoppingBag } from 'lucide-react';
import { LoadingState } from '@/components/ui/loading-state';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function ShiftSayaPage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<ProfilPengguna | null>(null);
  const [activeShift, setActiveShift] = useState<ShiftKasir | null>(null);
  const [recentShifts, setRecentShifts] = useState<ShiftKasir[]>([]);
  const [liveTotals, setLiveTotals] = useState<{ totalTunai: number; totalQris: number }>({
    totalTunai: 0,
    totalQris: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const loadShiftData = useCallback(async () => {
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

    if (currentProfile) {
      // 1. Ambil shift aktif
      const currentShift = await getActiveShift(supabase, currentProfile.id);
      setActiveShift(currentShift);

      if (currentShift) {
        // Ambil kalkulasi live transaksi
        const totals = await calculateCurrentShiftTotals(supabase, currentShift.id);
        setLiveTotals({
          totalTunai: totals.totalTunai,
          totalQris: totals.totalQris,
        });
      }

      // 2. Ambil riwayat shift kasir terakhir
      const { data: history } = await supabase
        .from('shift_kasir')
        .select('*')
        .eq('kasir_id', currentProfile.id)
        .order('dibuka_pada', { ascending: false })
        .limit(5);

      setRecentShifts((history as ShiftKasir[]) || []);
    }

    setIsLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadShiftData();
  }, [loadShiftData]);

  if (isLoading) {
    return <LoadingState fullScreen label="Memuat data sesi shift..." />;
  }

  if (!profile) {
    return (
      <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm flex items-center gap-2">
        <AlertCircle className="h-4 w-4" />
        <span>Profil pengguna tidak ditemukan. Harap login kembali.</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground font-serif">
            Shift Kerja Saya
          </h1>
          <p className="text-sm text-muted-foreground">
            Kelola pembukaan sesi kasir, pantau kas laci, dan rekonsiliasi kas saat tutup toko.
          </p>
        </div>

        {/* Action Button: Buka atau Tutup Shift */}
        <div>
          {!activeShift ? (
            profile.cabang_id ? (
              <OpenShiftModal
                cashierId={profile.id}
                cabangId={profile.cabang_id}
                onShiftOpened={loadShiftData}
              />
            ) : (
              <Badge variant="outline" className="text-xs p-2 text-primary">
                Akun belum dialokasikan ke cabang kasir tertentu
              </Badge>
            )
          ) : (
            <div className="flex items-center gap-2.5">
              <Button asChild className="h-11 px-5 shadow-sm font-medium">
                <Link href="/kasir">
                  <ShoppingBag className="h-4 w-4 mr-2" />
                  Mulai Kasir POS
                </Link>
              </Button>
              <CloseShiftModal
                shift={activeShift}
                totalTunai={liveTotals.totalTunai}
                totalQris={liveTotals.totalQris}
                onShiftClosed={loadShiftData}
              />
            </div>
          )}
        </div>
      </div>

      {/* Tampilan Shift Aktif */}
      {activeShift ? (
        <div className="space-y-4">
          <ShiftSummaryCard
            shift={activeShift}
            totalTunaiLive={liveTotals.totalTunai}
            totalQrisLive={liveTotals.totalQris}
          />
        </div>
      ) : (
        <Card className="border-dashed border-2 border-border/80 bg-muted/20">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">
              <Clock className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Tidak Ada Shift Aktif</h3>
            <p className="text-sm text-muted-foreground max-w-md mt-1 mb-6">
              Anda belum membuka sesi kerja kasir hari ini. Anda harus membuka shift dan memasukkan modal kas awal sebelum dapat melayani transaksi di menu Kasir (BR-02).
            </p>
            {profile.cabang_id && (
              <OpenShiftModal
                cashierId={profile.id}
                cabangId={profile.cabang_id}
                onShiftOpened={loadShiftData}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Riwayat Shift Sebelumnya */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base font-semibold">Riwayat Sesi Shift Terakhir</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Daftar 5 sesi shift terakhir yang Anda jalankan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentShifts.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Belum ada riwayat shift.</p>
          ) : (
            <div className="divide-y divide-border/60">
              {recentShifts.map((sh) => (
                <div key={sh.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">
                        {new Date(sh.dibuka_pada).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                      <Badge
                        variant="outline"
                        className={
                          sh.status === 'buka'
                            ? 'text-blue-700 border-blue-300 bg-blue-50 dark:text-blue-300 dark:border-blue-800 dark:bg-blue-950/30'
                            : sh.status === 'diverifikasi'
                            ? 'text-emerald-700 border-emerald-300 bg-emerald-50 dark:text-emerald-300 dark:border-emerald-800 dark:bg-emerald-950/30'
                            : 'text-amber-700 border-amber-300 bg-amber-50 dark:text-amber-300 dark:border-amber-800 dark:bg-amber-950/30'
                        }
                      >
                        {sh.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Buka: {new Date(sh.dibuka_pada).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}{' '}
                      {sh.ditutup_pada && `· Tutup: ${new Date(sh.ditutup_pada).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 text-xs sm:text-right">
                    <div>
                      <span className="text-muted-foreground">Kas Awal:</span>
                      <p className="font-medium text-foreground">Rp{sh.kas_awal.toLocaleString('id-ID')}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total Tunai:</span>
                      <p className="font-medium text-foreground">Rp{sh.total_tunai.toLocaleString('id-ID')}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Selisih:</span>
                      <p className={`font-medium ${(sh.selisih ?? 0) === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>
                        Rp{(sh.selisih ?? 0).toLocaleString('id-ID')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
