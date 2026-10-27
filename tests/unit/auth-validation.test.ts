import { describe, it, expect } from 'vitest';
import { 
  getHomeRouteForRole, 
  isRouteAllowedForRole, 
  validateUserAccountStatus 
} from '@/lib/auth/role-redirect';
import type { PeranPengguna, ProfilPengguna } from '@/types/database';

describe('Task 3: Auth Validation & Role-Based Navigation (BR-01 & Bab 7)', () => {
  describe('TC-01: Redirection by Role (Peran Pengguna)', () => {
    it('should redirect kasir to /kasir by default', () => {
      const destination = getHomeRouteForRole('kasir');
      expect(destination).toBe('/kasir');
    });

    it('should redirect kepala_toko to /shift-cabang by default', () => {
      const destination = getHomeRouteForRole('kepala_toko');
      expect(destination).toBe('/shift-cabang');
    });

    it('should redirect owner to /laporan by default', () => {
      const destination = getHomeRouteForRole('owner');
      expect(destination).toBe('/laporan');
    });
  });

  describe('TC-03: Active Account Status Verification (BR-01)', () => {
    it('should permit active account (aktif = true)', () => {
      const profile: Partial<ProfilPengguna> = {
        id: '49f7b084-1f53-512b-a290-70b59c2b899d',
        nama_lengkap: 'Ratna Kusumawardani',
        email: 'ratna.owner@lumbung.test',
        peran: 'owner',
        aktif: true,
      };

      const result = validateUserAccountStatus(profile as ProfilPengguna);
      expect(result.allowed).toBe(true);
      expect(result.errorMessage).toBeNull();
    });

    it('should reject inactive account (aktif = false) like rizky.kasir.depok', () => {
      const profile: Partial<ProfilPengguna> = {
        id: 'a9200124-867d-5c01-8275-180c01f96a80',
        nama_lengkap: 'Rizky Ramadhan',
        email: 'rizky.kasir.depok@lumbung.test',
        peran: 'kasir',
        aktif: false,
      };

      const result = validateUserAccountStatus(profile as ProfilPengguna);
      expect(result.allowed).toBe(false);
      expect(result.errorMessage).toContain('dinonaktifkan');
    });

    it('should reject missing profile', () => {
      const result = validateUserAccountStatus(null);
      expect(result.allowed).toBe(false);
      expect(result.errorMessage).toBeDefined();
    });
  });

  describe('Role-Based Route Protection Matrix (Bab 7 & RBAC)', () => {
    it('should configure Kasir access: Diizinkan (/kasir, /shift-saya) & Ditolak (/transaksi, /stok, /shift-cabang, /produk, /laporan, /pengaturan)', () => {
      // Allowed
      expect(isRouteAllowedForRole('kasir', '/kasir')).toBe(true);
      expect(isRouteAllowedForRole('kasir', '/shift-saya')).toBe(true);

      // Forbidden (redirect ke /unauthorized)
      expect(isRouteAllowedForRole('kasir', '/transaksi')).toBe(false);
      expect(isRouteAllowedForRole('kasir', '/stok')).toBe(false);
      expect(isRouteAllowedForRole('kasir', '/shift-cabang')).toBe(false);
      expect(isRouteAllowedForRole('kasir', '/produk')).toBe(false);
      expect(isRouteAllowedForRole('kasir', '/laporan')).toBe(false);
      expect(isRouteAllowedForRole('kasir', '/pengaturan')).toBe(false);
    });

    it('should configure Kepala Toko access: Diizinkan (/shift-cabang, /transaksi, /stok, /produk, /laporan, /shift-saya) & Ditolak (/pengaturan, /kasir)', () => {
      // Allowed
      expect(isRouteAllowedForRole('kepala_toko', '/shift-cabang')).toBe(true);
      expect(isRouteAllowedForRole('kepala_toko', '/transaksi')).toBe(true);
      expect(isRouteAllowedForRole('kepala_toko', '/stok')).toBe(true);
      expect(isRouteAllowedForRole('kepala_toko', '/produk')).toBe(true);
      expect(isRouteAllowedForRole('kepala_toko', '/laporan')).toBe(true);
      expect(isRouteAllowedForRole('kepala_toko', '/shift-saya')).toBe(true);

      // Forbidden (redirect ke /unauthorized)
      expect(isRouteAllowedForRole('kepala_toko', '/pengaturan')).toBe(false);
      expect(isRouteAllowedForRole('kepala_toko', '/kasir')).toBe(false);
    });

    it('should configure Owner access: Diizinkan ke semua rute dashboard', () => {
      // Allowed ke semua rute dashboard
      expect(isRouteAllowedForRole('owner', '/kasir')).toBe(true);
      expect(isRouteAllowedForRole('owner', '/shift-saya')).toBe(true);
      expect(isRouteAllowedForRole('owner', '/transaksi')).toBe(true);
      expect(isRouteAllowedForRole('owner', '/stok')).toBe(true);
      expect(isRouteAllowedForRole('owner', '/shift-cabang')).toBe(true);
      expect(isRouteAllowedForRole('owner', '/produk')).toBe(true);
      expect(isRouteAllowedForRole('owner', '/laporan')).toBe(true);
      expect(isRouteAllowedForRole('owner', '/pengaturan')).toBe(true);
    });
  });
});
