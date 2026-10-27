import { createClient } from '@/lib/supabase/client';
import { ProfilPengguna, Cabang, PeranPengguna } from '@/types/database';
import {
  toggleStaffStatusAction,
  updateStaffRoleAndBranchAction,
} from '@/lib/actions/staff-actions';

export interface AuditLogEntry {
  id: string;
  pelaku_id: string | null;
  aksi: string;
  tabel: string;
  data_id: string | null;
  nilai_sebelum: Record<string, unknown> | null;
  nilai_sesudah: Record<string, unknown> | null;
  dibuat_pada: string;
  pelaku?: {
    id: string;
    nama_lengkap: string;
    email: string;
    peran: string;
  };
}

export async function getStaffProfiles(): Promise<ProfilPengguna[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      id,
      email,
      nama_lengkap,
      peran,
      cabang_id,
      aktif,
      dibuat_pada,
      cabang:cabang_id (
        id,
        kode,
        nama
      )
    `)
    .order('nama_lengkap', { ascending: true });

  if (error) {
    console.error('Error fetching staff profiles:', error.message, error);
    throw error;
  }

  return (data as unknown as ProfilPengguna[]) || [];
}

export async function updateStaffStatus(
  profileId: string,
  aktif: boolean
): Promise<{ success: boolean; error?: string }> {
  return toggleStaffStatusAction(profileId, aktif);
}

export async function updateStaffRoleAndBranch(
  profileId: string,
  params: { peran: PeranPengguna; cabang_id?: string | null }
): Promise<{ success: boolean; error?: string }> {
  return updateStaffRoleAndBranchAction(profileId, params);
}

export async function getBranches(): Promise<Cabang[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('cabang')
    .select('*')
    .order('kode', { ascending: true });

  if (error) {
    console.error('Error fetching branches:', error.message, error);
    throw error;
  }

  return (data as Cabang[]) || [];
}

export async function getAuditLogs(limit = 100): Promise<AuditLogEntry[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('audit_log')
    .select(`
      id,
      pelaku_id,
      aksi,
      tabel,
      data_id,
      nilai_sebelum,
      nilai_sesudah,
      dibuat_pada,
      pelaku:profiles!audit_log_pelaku_id_fkey (
        id,
        nama_lengkap,
        email,
        peran
      )
    `)
    .order('dibuat_pada', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching audit logs:', error.message, error);
    throw error;
  }

  return (data as unknown as AuditLogEntry[]) || [];
}
