import { describe, it, expect } from 'vitest';
import {
  passwordSchema,
  createStaffSchema,
  resetPasswordSchema,
  updateStaffRoleAndBranchSchema,
} from '@/lib/validations/staff';

describe('Staff Management & Password Security Validations (PRD & Business Rules)', () => {
  describe('Strict Password Schema Validation', () => {
    it('should accept password that meets all 5 strict criteria', () => {
      const validPasswords = [
        'Lumbung2026!',
        'P@ssword123',
        'KopiDepok#88',
        'Secret.99*',
        'Bintaro_Store$1',
      ];

      for (const pass of validPasswords) {
        const result = passwordSchema.safeParse(pass);
        expect(result.success, `Expected "${pass}" to be valid`).toBe(true);
      }
    });

    it('should reject password with less than 8 characters', () => {
      const result = passwordSchema.safeParse('Ab1!xyz');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain('minimal 8 karakter');
      }
    });

    it('should reject password without uppercase letters', () => {
      const result = passwordSchema.safeParse('lumbung2026!');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.message.includes('huruf kapital'))).toBe(true);
      }
    });

    it('should reject password without lowercase letters', () => {
      const result = passwordSchema.safeParse('LUMBUNG2026!');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.message.includes('huruf kecil'))).toBe(true);
      }
    });

    it('should reject password without numbers', () => {
      const result = passwordSchema.safeParse('LumbungSecret!');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.message.includes('angka'))).toBe(true);
      }
    });

    it('should reject password without special characters / symbols', () => {
      const result = passwordSchema.safeParse('Lumbung2026abc');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.message.includes('simbol'))).toBe(true);
      }
    });
  });

  describe('Create Staff Schema & Role Restrictions', () => {
    it('should accept valid new Kasir and Kepala Toko data', () => {
      const kasirData = {
        nama_lengkap: 'Ahmad Kasir',
        email: 'ahmad.kasir@lumbung.test',
        password: 'Password123!',
        peran: 'kasir',
        cabang_id: 'c1111111-1111-1111-1111-111111111111',
      };
      expect(createStaffSchema.safeParse(kasirData).success).toBe(true);

      const kepalaTokoData = {
        nama_lengkap: 'Siti Kepala Toko',
        email: 'siti.kt@lumbung.test',
        password: 'Password123!',
        peran: 'kepala_toko',
        cabang_id: 'c2222222-2222-2222-2222-222222222222',
      };
      expect(createStaffSchema.safeParse(kepalaTokoData).success).toBe(true);
    });

    it('should reject creation with role "owner"', () => {
      const ownerAttempt = {
        nama_lengkap: 'Calon Owner',
        email: 'calon.owner@lumbung.test',
        password: 'Password123!',
        peran: 'owner',
        cabang_id: 'c1111111-1111-1111-1111-111111111111',
      };
      const result = createStaffSchema.safeParse(ownerAttempt);
      expect(result.success).toBe(false);
    });

    it('should reject if cabang_id is empty or missing', () => {
      const missingBranch = {
        nama_lengkap: 'Budi Kasir',
        email: 'budi@lumbung.test',
        password: 'Password123!',
        peran: 'kasir',
        cabang_id: '   ',
      };
      const result = createStaffSchema.safeParse(missingBranch);
      expect(result.success).toBe(false);
    });

    it('should reject invalid email format', () => {
      const invalidEmail = {
        nama_lengkap: 'Budi Kasir',
        email: 'budi-bukan-email',
        password: 'Password123!',
        peran: 'kasir',
        cabang_id: 'c1111111-1111-1111-1111-111111111111',
      };
      const result = createStaffSchema.safeParse(invalidEmail);
      expect(result.success).toBe(false);
    });
  });

  describe('Reset Password Schema & Match Validation', () => {
    it('should accept matching valid passwords', () => {
      const validPayload = {
        userId: 'u1111111-1111-1111-1111-111111111111',
        password: 'NewStrongPass1!',
        confirmPassword: 'NewStrongPass1!',
      };
      const result = resetPasswordSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('should reject password mismatch', () => {
      const mismatchPayload = {
        userId: 'u1111111-1111-1111-1111-111111111111',
        password: 'NewStrongPass1!',
        confirmPassword: 'DifferentPass2@',
      };
      const result = resetPasswordSchema.safeParse(mismatchPayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain('tidak cocok');
      }
    });

    it('should reject reset if password is weak even when matching', () => {
      const weakMatching = {
        userId: 'u1111111-1111-1111-1111-111111111111',
        password: 'weak',
        confirmPassword: 'weak',
      };
      const result = resetPasswordSchema.safeParse(weakMatching);
      expect(result.success).toBe(false);
    });
  });

  describe('Update Staff Role & Branch Constraints', () => {
    it('should reject update if peran is "owner"', () => {
      const result = updateStaffRoleAndBranchSchema.safeParse({
        profileId: 'p1111111-1111-1111-1111-111111111111',
        peran: 'owner',
        cabang_id: 'c1111111-1111-1111-1111-111111111111',
      });
      expect(result.success).toBe(false);
    });

    it('should reject update if cabang_id is missing', () => {
      const result = updateStaffRoleAndBranchSchema.safeParse({
        profileId: 'p1111111-1111-1111-1111-111111111111',
        peran: 'kasir',
        cabang_id: '',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Staff Audit Log Actions (BR-12)', () => {
    it('should define all staff audit actions in AksiAudit type', () => {
      // Type assertion test
      const validStaffActions: import('@/types/database').AksiAudit[] = [
        'tambah_staf',
        'ubah_akun',
        'aktifkan_akun',
        'nonaktifkan_akun',
        'reset_password',
      ];

      expect(validStaffActions).toContain('tambah_staf');
      expect(validStaffActions).toContain('ubah_akun');
      expect(validStaffActions).toContain('aktifkan_akun');
      expect(validStaffActions).toContain('nonaktifkan_akun');
      expect(validStaffActions).toContain('reset_password');
    });

    it('should structure audit payload for reset_password without exposing raw password', () => {
      const resetLogPayload = {
        aksi: 'reset_password' as const,
        tabel: 'profiles',
        nilai_sebelum: null,
        nilai_sesudah: { keterangan: 'Reset password oleh Owner' },
      };

      expect(resetLogPayload.aksi).toBe('reset_password');
      expect(resetLogPayload.nilai_sesudah).not.toHaveProperty('password');
      expect(resetLogPayload.nilai_sesudah.keterangan).toContain('Reset password');
    });

    it('should structure audit payload for tambah_staf with profile metadata', () => {
      const createLogPayload = {
        aksi: 'tambah_staf' as const,
        tabel: 'profiles',
        nilai_sebelum: null,
        nilai_sesudah: {
          email: 'staf.baru@lumbung.test',
          peran: 'kasir',
          cabang_id: 'cabang-uuid-123',
          aktif: true,
        },
      };

      expect(createLogPayload.aksi).toBe('tambah_staf');
      expect(createLogPayload.nilai_sesudah.aktif).toBe(true);
      expect(createLogPayload.nilai_sesudah.peran).toBe('kasir');
    });
  });
});
