import { describe, it, expect } from 'vitest';
import type {
  Cabang,
  Profile,
  Produk,
  RiwayatHargaModal,
  StokCabang,
  ShiftKasir,
  Transaksi,
  TransaksiItem,
  AuditLog,
  Peran,
  KategoriProduk,
} from '@/src/types/database';

describe('Database Schema & TypeScript Types (ERD_POS)', () => {
  it('should support valid Peran types', () => {
    const roles: Peran[] = ['kasir', 'kepala_toko', 'owner'];
    expect(roles).toHaveLength(3);
  });

  it('should support 5 KategoriProduk types', () => {
    const categories: KategoriProduk[] = ['kopi', 'non_kopi', 'roti', 'snack', 'kemasan'];
    expect(categories).toHaveLength(5);
  });

  it('should instantiate type-safe mock models', () => {
    const mockCabang: Cabang = {
      id: '00000000-0000-0000-0000-000000000001',
      kode: 'TBT',
      nama: 'Lumbung Tebet',
      alamat: 'Jl. Tebet Raya No. 10',
      aktif: true,
      urut_struk_tanggal: '2026-10-21',
      urut_struk_terakhir: 1,
    };
    expect(mockCabang.kode).toBe('TBT');

    const mockProfile: Profile = {
      id: '00000000-0000-0000-0000-000000000002',
      nama_lengkap: 'Budi Santoso',
      email: 'budi@lumbung.com',
      peran: 'kasir',
      cabang_id: mockCabang.id,
      aktif: true,
      dibuat_pada: new Date().toISOString(),
    };
    expect(mockProfile.peran).toBe('kasir');

    const mockProduk: Produk = {
      id: '00000000-0000-0000-0000-000000000003',
      sku: 'KOP-001',
      nama: 'Kopi Susu Gula Aren',
      kategori: 'kopi',
      harga_jual: 22000,
      lacak_stok: false,
      aktif: true,
      dibuat_pada: new Date().toISOString(),
      diubah_pada: new Date().toISOString(),
    };
    expect(mockProduk.kategori).toBe('kopi');
    expect(mockProduk.lacak_stok).toBe(false);
  });
});
