'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  getStaffProfiles,
  getBranches,
  getAuditLogs,
  AuditLogEntry,
} from '@/lib/services/settings-service';
import { ProfilPengguna, Cabang } from '@/types/database';
import { StaffManagementTable } from '@/components/settings/StaffManagementTable';
import { BranchConfigForm } from '@/components/settings/BranchConfigForm';
import { AuditLogTable } from '@/components/audit/AuditLogTable';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Settings, Users, Building2, History } from 'lucide-react';

export default function PengaturanPage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<{ id: string; peran: string; cabang_id: string | null } | null>(null);
  const [staffList, setStaffList] = useState<ProfilPengguna[]>([]);
  const [branches, setBranches] = useState<Cabang[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
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

      const [staffs, branchData, logs] = await Promise.all([
        getStaffProfiles(),
        getBranches(),
        getAuditLogs(100),
      ]);

      setStaffList(staffs);
      setBranches(branchData);
      setAuditLogs(logs);
    } catch (err) {
      console.error('Error loading settings data:', err);
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
            Pengaturan Sistem & Audit
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kelola penempatan akun staf, konfigurasi cabang, dan riwayat audit perubahan sistem (BR-12).
          </p>
        </div>
      </div>

      {/* Tabs Layout */}
      <Tabs defaultValue="staff" className="space-y-4">
        <TabsList className="bg-muted p-1 border border-border">
          <TabsTrigger value="staff" className="text-xs font-semibold gap-1.5">
            <Users className="w-3.5 h-3.5" />
            Manajemen Akun Staf
          </TabsTrigger>
          <TabsTrigger value="branches" className="text-xs font-semibold gap-1.5">
            <Building2 className="w-3.5 h-3.5" />
            Konfigurasi Cabang
          </TabsTrigger>
          <TabsTrigger value="audit" className="text-xs font-semibold gap-1.5">
            <History className="w-3.5 h-3.5" />
            Audit Log Sistem (BR-12)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="staff" className="space-y-4">
          <StaffManagementTable
            staffList={staffList}
            branches={branches}
            userRole={profile?.peran || 'kasir'}
            onRefresh={loadData}
          />
        </TabsContent>

        <TabsContent value="branches" className="space-y-4">
          <BranchConfigForm branches={branches} />
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <AuditLogTable
            logs={auditLogs}
            onRefresh={loadData}
            loading={isLoading}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
