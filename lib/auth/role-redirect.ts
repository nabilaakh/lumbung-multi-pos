import type { PeranPengguna, ProfilPengguna } from '@/types/database';

export interface AccountValidationResult {
  allowed: boolean;
  errorMessage: string | null;
}

/**
 * Mendapatkan rute utama (home route) sesuai peran pengguna (BR-01)
 */
export function getHomeRouteForRole(peran: PeranPengguna): string {
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
 * Menentukan apakah sebuah rute boleh diakses oleh peran tertentu berdasarkan Matriks Akses
 */
export function isRouteAllowedForRole(peran: PeranPengguna, pathname: string): boolean {
  // Owner memiliki akses penuh ke seluruh rute
  if (peran === 'owner') {
    return true;
  }

  // Kasir: Hanya boleh mengakses /kasir dan /shift-saya
  if (peran === 'kasir') {
    if (pathname.startsWith('/kasir') || pathname.startsWith('/shift-saya')) {
      return true;
    }
    return false;
  }

  // Kepala Toko: Boleh transaksi, shift, produk, stok, dan laporan operasional
  // DILARANG: /pengaturan dan /laporan/keuntungan (data rahasia margin laba modal)
  if (peran === 'kepala_toko') {
    if (pathname.startsWith('/pengaturan')) {
      return false;
    }
    if (pathname.startsWith('/laporan/keuntungan')) {
      return false;
    }
    if (
      pathname.startsWith('/transaksi') ||
      pathname.startsWith('/shift-saya') ||
      pathname.startsWith('/produk') ||
      pathname.startsWith('/stok') ||
      pathname.startsWith('/laporan')
    ) {
      return true;
    }
    return false;
  }

  return false;
}
