import type { PeranPengguna, ProfilPengguna } from '@/types/database';

export interface AccountValidationResult {
  allowed: boolean;
  errorMessage: string | null;
}

/**
 * Mendapatkan rute utama (home route) sesuai peran pengguna (BR-01)
 */
export function getHomeRouteForRole(peran: PeranPengguna | string): string {
  switch (peran) {
    case 'kasir':
      return '/kasir';
    case 'kepala_toko':
      return '/transaksi';
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

  if (!profile.aktif) {
    return {
      allowed: false,
      errorMessage: 'Akun Anda dinonaktifkan. Hubungi Owner untuk informasi lebih lanjut.',
    };
  }

  return {
    allowed: true,
    errorMessage: null,
  };
}

/**
 * Menentukan apakah sebuah rute boleh diakses oleh peran tertentu berdasarkan Matriks Akses Halaman (Bab 7)
 *
 * 1. Kasir: /kasir, /shift-saya, /transaksi
 * 2. Kepala Toko: /transaksi, /stok, /shift-cabang, /produk, /laporan
 * 3. Owner: /transaksi, /stok, /shift-cabang, /produk, /laporan, /pengaturan
 */
export function isRouteAllowedForRole(peran: PeranPengguna | string, pathname: string): boolean {
  // 1. Kasir: Hanya boleh mengakses Kasir POS, Shift Saya, dan Riwayat Transaksi (miliknya)
  if (peran === 'kasir') {
    return (
      pathname.startsWith('/kasir') ||
      pathname.startsWith('/shift-saya') ||
      pathname.startsWith('/transaksi')
    );
  }

  // 2. Kepala Toko: Transaksi (cabangnya), Stok Cabang, Shift Cabang, Produk (tanpa HPP), Laporan (tanpa laba)
  // Dilarang: Kasir POS, Shift Saya, Pengaturan
  if (peran === 'kepala_toko') {
    return (
      pathname.startsWith('/transaksi') ||
      pathname.startsWith('/stok') ||
      pathname.startsWith('/shift-cabang') ||
      pathname.startsWith('/produk') ||
      pathname.startsWith('/laporan')
    );
  }

  // 3. Owner: Transaksi, Stok Cabang, Shift Cabang, Produk, Laporan, Pengaturan
  // Dilarang: Kasir POS & Shift Saya (khusus peran Kasir)
  if (peran === 'owner') {
    return (
      pathname.startsWith('/transaksi') ||
      pathname.startsWith('/stok') ||
      pathname.startsWith('/shift-cabang') ||
      pathname.startsWith('/produk') ||
      pathname.startsWith('/laporan') ||
      pathname.startsWith('/pengaturan')
    );
  }

  return false;
}
