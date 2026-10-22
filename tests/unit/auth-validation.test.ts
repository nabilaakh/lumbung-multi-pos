import { describe, it, expect } from 'vitest';
import { 
  getHomeRouteForRole, 
  isRouteAllowedForRole, 
  validateUserAccountStatus 
} from '@/lib/auth/role-redirect';
import type { PeranPengguna, ProfilPengguna } from '@/types/database';

describe('Task 3: Auth Validation & Role-Based Navigation (BR-01)', () => {
  describe('TC-01: Redirection by Role (Peran Pengguna)', () => {
    it('should redirect kasir to /kasir by default', () => {
      const destination = getHomeRouteForRole('kasir');
      expect(destination).toBe('/kasir');
    });

    it('should redirect kepala_toko to /transaksi by default', () => {
      const destination = getHomeRouteForRole('kepala_toko');
      expect(destination).toBe('/transaksi');
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

  describe('Role-Based Route Protection Matrix', () => {
    it('should forbid kasir from accessing /pengaturan and /laporan', () => {
      expect(isRouteAllowedForRole('kasir', '/pengaturan')).toBe(false);
      expect(isRouteAllowedForRole('kasir', '/laporan')).toBe(false);
      expect(isRouteAllowedForRole('kasir', '/produk')).toBe(false);
    });

    it('should allow kasir to access /kasir and /shift-saya', () => {
      expect(isRouteAllowedForRole('kasir', '/kasir')).toBe(true);
      expect(isRouteAllowedForRole('kasir', '/shift-saya')).toBe(true);
    });

    it('should forbid kepala_toko from accessing /pengaturan and /laporan/keuntungan', () => {
      expect(isRouteAllowedForRole('kepala_toko', '/pengaturan')).toBe(false);
      expect(isRouteAllowedForRole('kepala_toko', '/laporan/keuntungan')).toBe(false);
    });

    it('should allow kepala_toko to access /transaksi, /shift-saya, and /produk', () => {
      expect(isRouteAllowedForRole('kepala_toko', '/transaksi')).toBe(true);
      expect(isRouteAllowedForRole('kepala_toko', '/shift-saya')).toBe(true);
      expect(isRouteAllowedForRole('kepala_toko', '/produk')).toBe(true);
    });

    it('should allow owner to access all operational and administrative routes', () => {
      expect(isRouteAllowedForRole('owner', '/laporan')).toBe(true);
      expect(isRouteAllowedForRole('owner', '/pengaturan')).toBe(true);
      expect(isRouteAllowedForRole('owner', '/transaksi')).toBe(true);
      expect(isRouteAllowedForRole('owner', '/kasir')).toBe(true);
      expect(isRouteAllowedForRole('owner', '/produk')).toBe(true);
    });
  });
});
