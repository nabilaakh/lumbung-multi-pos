import type { PeranPengguna, ProfilPengguna } from '@/types/database';

export interface AccountValidationResult {
  allowed: boolean;
  errorMessage: string | null;
}

/**
 * Mendapatkan rute utama (home route) sesuai peran pengguna (BR-01 & Bab 7)
 */
export function getHomeRouteForRole(peran: PeranPengguna | string): string {
  switch (peran) {
    case 'kasir':
      return '/kasir';
    case 'kepala_toko':
      return '/shift-cabang';
    case 'owner':
      return '/laporan';
    default:
      return '/login';
  }
}

/**
 * Memvalidasi apakah status akun aktif untuk dapat mengakses sistem (BR-01)
 */
export function validateUserAccountStatus(
  profile: ProfilPengguna | null | undefined
): AccountValidationResult {
  if (!profile) {
    return {
      allowed: false,
      errorMessage: 'Profil pengguna tidak ditemukan.',
    };
  }

 

  return {
    allowed: true,
    errorMessage: null,
  };
}

/**
 * Menentukan apakah sebuah rute boleh diakses oleh peran tertentu berdasarkan Matriks RBAC:
 *
 * 1. Kasir:
 *    - Diizinkan: /kasir, /shift-saya
 *    - Ditolak (redirect ke /unauthorized): /laporan, /pengaturan, /stok, /produk, /shift-cabang, /transaksi
 * 2. Kepala Toko:
 *    - Diizinkan: /shift-cabang, /transaksi, /stok, /produk, /laporan, /shift-saya
 *    - Ditolak (redirect ke /unauthorized): /pengaturan, /kasir
 * 3. Owner:
 *    - Diizinkan ke semua rute dashboard (/kasir, /shift-saya, /transaksi, /stok, /shift-cabang, /produk, /laporan, /pengaturan)
 */
export function isRouteAllowedForRole(peran: PeranPengguna | string, pathname: string): boolean {
  const path = pathname.toLowerCase();

  // Helper untuk cek kecocokan rute persis atau sub-path
  const matches = (target: string) => path === target || path.startsWith(`${target}/`);

  // 1. Kasir: Diizinkan /kasir, /shift-saya
  if (peran === 'kasir') {
    return matches('/kasir') || matches('/shift-saya');
  }

  // 2. Kepala Toko: Diizinkan /shift-cabang, /transaksi, /stok, /produk, /laporan, /shift-saya
  if (peran === 'kepala_toko') {
    return (
      matches('/shift-cabang') ||
      matches('/transaksi') ||
      matches('/stok') ||
      matches('/produk') ||
      matches('/laporan') ||
      matches('/shift-saya')
    );
  }

  // 3. Owner: Diizinkan ke semua rute dashboard
  if (peran === 'owner') {
    return (
      matches('/kasir') ||
      matches('/shift-saya') ||
      matches('/transaksi') ||
      matches('/stok') ||
      matches('/shift-cabang') ||
      matches('/produk') ||
      matches('/laporan') ||
      matches('/pengaturan')
    );
  }

  return false;
}
