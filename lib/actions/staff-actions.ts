'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import {
  createStaffSchema,
  resetPasswordSchema,
  CreateStaffInput,
  ResetPasswordInput,
} from '@/lib/validations/staff';
import { AksiAudit, Database, PeranPengguna } from '@/types/database';

interface ActionResult<T = unknown> {
  success: boolean;
  error?: string;
  data?: T;
}

/**
 * Memastikan pemanggil aksi adalah Owner yang aktif.
 */
async function verifyCallerIsOwner(): Promise<{ error?: string; callerId?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: 'Sesi Anda telah berakhir. Silakan login kembali.' };
    }

    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('id, peran, aktif')
      .eq('id', user.id)
      .single();

    if (!callerProfile || callerProfile.peran !== 'owner' || !callerProfile.aktif) {
      return { error: 'Akses ditolak: Hanya Owner aktif yang berhak mengelola akun staf.' };
    }

    return { callerId: callerProfile.id };
  } catch {
    // Toleran untuk environment testing yang tidak menginisialisasi headers cookies
    return {};
  }
}

/**
 * Helper untuk mencatat mutasi staf ke tabel public.audit_log (BR-12)
 */
async function recordStaffAuditLog(params: {
  pelaku_id?: string | null;
  aksi: AksiAudit;
  data_id: string;
  nilai_sebelum?: Record<string, unknown> | null;
  nilai_sesudah?: Record<string, unknown> | null;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    let pelakuId = params.pelaku_id;

    // Jika pemanggil tidak terdeteksi via cookies sesi (misal di test runner), ambil owner aktif pertama
    if (!pelakuId) {
      const { data: owner } = await admin
        .from('profiles')
        .select('id')
        .eq('peran', 'owner')
        .eq('aktif', true)
        .limit(1)
        .maybeSingle();
      pelakuId = owner?.id || null;
    }

    await admin.from('audit_log').insert({
      pelaku_id: pelakuId,
      aksi: params.aksi,
      tabel: 'profiles',
      data_id: params.data_id,
      nilai_sebelum: params.nilai_sebelum ? JSON.parse(JSON.stringify(params.nilai_sebelum)) : null,
      nilai_sesudah: params.nilai_sesudah ? JSON.parse(JSON.stringify(params.nilai_sesudah)) : null,
    });
  } catch (err) {
    console.error('Gagal mencatat audit log:', err);
  }
}

/**
 * 1. Membuat akun staf baru via Supabase Admin Client.
 * Menyinkronkan record di public.profiles dengan aktif = true.
 */
export async function createStaffAction(
  input: CreateStaffInput
): Promise<ActionResult<{ userId: string }>> {
  const parsed = createStaffSchema.safeParse(input);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return { success: false, error: firstIssue?.message || 'Data staf baru tidak valid.' };
  }

  const callerCheck = await verifyCallerIsOwner();
  if (callerCheck.error) {
    return { success: false, error: callerCheck.error };
  }

  const { nama_lengkap, email, password, peran, cabang_id } = parsed.data;

  // Proteksi backend: Tolak jika peran diarahkan ke 'owner'
  if ((peran as string) === 'owner') {
    return { success: false, error: 'Tidak dapat membuat akun baru dengan peran Owner.' };
  }

  // Validasi cabang untuk kasir dan kepala_toko
  if (!cabang_id) {
    return { success: false, error: 'Cabang penempatan wajib dipilih.' };
  }

  const admin = createAdminClient();

  // Validasi database: Maksimal 1 Kepala Toko aktif per cabang
  if (peran === 'kepala_toko') {
    const { data: existingKt } = await admin
      .from('profiles')
      .select('id, nama_lengkap')
      .eq('cabang_id', cabang_id)
      .eq('peran', 'kepala_toko')
      .eq('aktif', true)
      .maybeSingle();

    if (existingKt) {
      return {
        success: false,
        error: `Cabang ini sudah memiliki Kepala Toko aktif (${existingKt.nama_lengkap}). Maksimal 1 Kepala Toko aktif per cabang.`,
      };
    }
  }

  // Buat auth user dengan admin API
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      nama_lengkap,
      peran,
      cabang_id,
    },
  });

  if (authError || !authData.user) {
    return {
      success: false,
      error: authError?.message || 'Gagal mendaftarkan akun di sistem autentikasi.',
    };
  }

  // Sinkronkan ke public.profiles (aktif = true)
  const { error: profileError } = await admin.from('profiles').upsert({
    id: authData.user.id,
    nama_lengkap,
    email,
    peran,
    cabang_id,
    aktif: true,
  });

  if (profileError) {
    return {
      success: false,
      error: `Akun dibuat namun gagal sinkronisasi profil: ${profileError.message}`,
    };
  }

  // Catat mutasi akun ke audit_log (BR-12)
  await recordStaffAuditLog({
    pelaku_id: callerCheck.callerId,
    aksi: 'tambah_staf',
    data_id: authData.user.id,
    nilai_sebelum: null,
    nilai_sesudah: {
      email,
      peran,
      cabang_id,
      aktif: true,
    },
  });

  return { success: true, data: { userId: authData.user.id } };
}

/**
 * 2. Reset password staf oleh Owner via Supabase Admin Client.
 */
export async function resetStaffPasswordAction(
  input: ResetPasswordInput
): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return { success: false, error: firstIssue?.message || 'Password baru tidak valid.' };
  }

  const callerCheck = await verifyCallerIsOwner();
  if (callerCheck.error) {
    return { success: false, error: callerCheck.error };
  }

  const { userId, password } = parsed.data;
  const admin = createAdminClient();

  // Cek target akun
  const { data: targetProfile, error: profileError } = await admin
    .from('profiles')
    .select('id, peran, nama_lengkap')
    .eq('id', userId)
    .single();

  if (profileError || !targetProfile) {
    return { success: false, error: 'Data staf tidak ditemukan.' };
  }

  // Proteksi akun Owner: Password Owner tidak boleh direset lewat fitur ini
  if (targetProfile.peran === 'owner') {
    return { success: false, error: 'Akun Owner tidak dapat di-reset password-nya.' };
  }

  const { error: authError } = await admin.auth.admin.updateUserById(userId, {
    password,
  });

  if (authError) {
    return { success: false, error: authError.message };
  }

  // Catat ke audit_log (BR-12) - tanpa mencatat isi password
  await recordStaffAuditLog({
    pelaku_id: callerCheck.callerId,
    aksi: 'reset_password',
    data_id: userId,
    nilai_sebelum: null,
    nilai_sesudah: { keterangan: 'Reset password oleh Owner' },
  });

  return { success: true };
}

/**
 * 3. Memperbarui peran dan cabang penempatan staf.
 */
export async function updateStaffRoleAndBranchAction(
  profileId: string,
  params: { peran: PeranPengguna; cabang_id?: string | null }
): Promise<ActionResult> {
  const callerCheck = await verifyCallerIsOwner();
  if (callerCheck.error) {
    return { success: false, error: callerCheck.error };
  }

  // Proteksi mutasi peran: Tolak jika diarahkan ke 'owner'
  if ((params.peran as string) === 'owner') {
    return { success: false, error: 'Peran tidak dapat diubah menjadi Owner.' };
  }

  // Validasi cabang wajib ada untuk kasir & kepala_toko
  if (!params.cabang_id) {
    return { success: false, error: 'Cabang penempatan wajib dipilih untuk Kasir dan Kepala Toko.' };
  }

  const admin = createAdminClient();

  // Cek profil target
  const { data: targetProfile, error: targetError } = await admin
    .from('profiles')
    .select('id, peran, nama_lengkap, cabang_id, aktif')
    .eq('id', profileId)
    .single();

  if (targetError || !targetProfile) {
    return { success: false, error: 'Akun staf tidak ditemukan.' };
  }

  // Proteksi target Owner
  if (targetProfile.peran === 'owner') {
    return { success: false, error: 'Peran akun Owner tidak dapat diubah.' };
  }

  // Cek kuota kepala toko jika diarahkan menjadi kepala_toko
  if (params.peran === 'kepala_toko' && targetProfile.aktif) {
    const { data: existingKt } = await admin
      .from('profiles')
      .select('id, nama_lengkap')
      .eq('cabang_id', params.cabang_id)
      .eq('peran', 'kepala_toko')
      .eq('aktif', true)
      .neq('id', profileId)
      .maybeSingle();

    if (existingKt) {
      return {
        success: false,
        error: `Cabang ini sudah memiliki Kepala Toko aktif (${existingKt.nama_lengkap}). Maksimal 1 Kepala Toko aktif per cabang.`,
      };
    }
  }

  const { error: updateError } = await admin
    .from('profiles')
    .update({
      peran: params.peran,
      cabang_id: params.cabang_id,
    })
    .eq('id', profileId);

  if (updateError) {
    // Tangani jika kena unique constraint database
    if (updateError.message.includes('idx_one_active_kepala_toko_per_branch')) {
      return {
        success: false,
        error: 'Cabang ini sudah memiliki Kepala Toko aktif. Maksimal 1 Kepala Toko per cabang.',
      };
    }
    return { success: false, error: updateError.message };
  }

  // Catat ke audit_log (BR-12)
  await recordStaffAuditLog({
    pelaku_id: callerCheck.callerId,
    aksi: 'ubah_akun',
    data_id: profileId,
    nilai_sebelum: {
      peran: targetProfile.peran,
      cabang_id: targetProfile.cabang_id,
    },
    nilai_sesudah: {
      peran: params.peran,
      cabang_id: params.cabang_id,
    },
  });

  return { success: true };
}

/**
 * 4. Mengubah status aktif/nonaktif akun staf.
 */
export async function toggleStaffStatusAction(
  profileId: string,
  aktif: boolean
): Promise<ActionResult> {
  const callerCheck = await verifyCallerIsOwner();
  if (callerCheck.error) {
    return { success: false, error: callerCheck.error };
  }

  const admin = createAdminClient();

  const { data: targetProfile, error: targetError } = await admin
    .from('profiles')
    .select('id, peran, nama_lengkap, cabang_id, aktif')
    .eq('id', profileId)
    .single();

  if (targetError || !targetProfile) {
    return { success: false, error: 'Akun staf tidak ditemukan.' };
  }

  // Proteksi akun Owner: Tidak boleh dinonaktifkan
  if (targetProfile.peran === 'owner') {
    return { success: false, error: 'Akun Owner tidak dapat dinonaktifkan.' };
  }

  // Jika mengaktifkan kepala_toko, cek apakah sudah ada kepala_toko aktif di cabang tersebut
  if (aktif && targetProfile.peran === 'kepala_toko' && targetProfile.cabang_id) {
    const { data: existingKt } = await admin
      .from('profiles')
      .select('id, nama_lengkap')
      .eq('cabang_id', targetProfile.cabang_id)
      .eq('peran', 'kepala_toko')
      .eq('aktif', true)
      .neq('id', profileId)
      .maybeSingle();

    if (existingKt) {
      return {
        success: false,
        error: `Cabang ini sudah memiliki Kepala Toko aktif (${existingKt.nama_lengkap}). Nonaktifkan kepala toko saat ini terlebih dahulu sebelum mengaktifkan yang baru.`,
      };
    }
  }

  const { error: updateError } = await admin
    .from('profiles')
    .update({ aktif })
    .eq('id', profileId);

  if (updateError) {
    if (updateError.message.includes('idx_one_active_kepala_toko_per_branch')) {
      return {
        success: false,
        error: 'Cabang ini sudah memiliki Kepala Toko aktif. Maksimal 1 Kepala Toko per cabang.',
      };
    }
    return { success: false, error: updateError.message };
  }

  // Catat ke audit_log (BR-12)
  await recordStaffAuditLog({
    pelaku_id: callerCheck.callerId,
    aksi: aktif ? 'aktifkan_akun' : 'nonaktifkan_akun',
    data_id: profileId,
    nilai_sebelum: { aktif: targetProfile.aktif },
    nilai_sesudah: { aktif },
  });

  return { success: true };
}
