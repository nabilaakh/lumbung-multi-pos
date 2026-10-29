'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getBranchShifts, ShiftSupervisionItem } from '@/lib/services/stock-service';
import { BranchShiftTable } from '@/components/shift/BranchShiftTable';
import { ShieldCheck } from 'lucide-react';

export default function ShiftCabangPage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<{ id: string; peran: string; cabang_id: string | null } | null>(null);
  const [cabangList, setCabangList] = useState<{ id: string; kode: string; nama: string }[]>([]);
  const [shiftList, setShiftList] = useState<ShiftSupervisionItem[]>([]);
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
      const shifts = await getBranchShifts(targetCabang || undefined);
      setShiftList(shifts);
    } catch (err) {
      console.error('Error loading branch shift data:', err);
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
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Supervisi Shift Kasir
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Verifikasi rekonsiliasi kas shift, pemantauan selisih kas fisik vs sistem, dan persetujuan supervisor.
          </p>
        </div>
      </div>

      {/* Branch Shift Table Component */}
      <BranchShiftTable
        shiftList={shiftList}
        userRole={profile?.peran || 'kasir'}
        userCabangId={profile?.cabang_id}
        cabangList={cabangList}
        onRefresh={loadData}
        loading={isLoading}
      />
    </div>
  );
}
