export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Peran = 'kasir' | 'kepala_toko' | 'owner';
export type KategoriProduk = 'kopi' | 'non_kopi' | 'roti' | 'snack' | 'kemasan';
export type StatusShift = 'buka' | 'ditutup' | 'diverifikasi';
export type StatusTransaksi = 'lunas' | 'void' | 'menunggu_bayar' | 'batal';
export type MetodeBayar = 'tunai' | 'qris';
export type AksiAudit =
  | 'void_transaksi'
  | 'verifikasi_shift'
  | 'penyesuaian_stok'
  | 'ubah_harga_jual'
  | 'ubah_harga_modal'
  | 'nonaktifkan_produk'
  | 'ubah_akun';

export interface Database {
  public: {
    Tables: {
      cabang: {
        Row: {
          id: string;
          kode: 'TBT' | 'BTR' | 'DPK';
          nama: string;
          alamat: string | null;
          aktif: boolean;
          urut_struk_tanggal: string | null;
          urut_struk_terakhir: number;
        };
        Insert: {
          id?: string;
          kode: 'TBT' | 'BTR' | 'DPK';
          nama: string;
          alamat?: string | null;
          aktif?: boolean;
          urut_struk_tanggal?: string | null;
          urut_struk_terakhir?: number;
        };
        Update: {
          id?: string;
          kode?: 'TBT' | 'BTR' | 'DPK';
          nama?: string;
          alamat?: string | null;
          aktif?: boolean;
          urut_struk_tanggal?: string | null;
          urut_struk_terakhir?: number;
        };
      };
      profiles: {
        Row: {
          id: string;
          nama_lengkap: string;
          email: string;
          peran: Peran;
          cabang_id: string | null;
          aktif: boolean;
          dibuat_pada: string;
        };
        Insert: {
          id: string;
          nama_lengkap: string;
          email: string;
          peran?: Peran;
          cabang_id?: string | null;
          aktif?: boolean;
          dibuat_pada?: string;
        };
        Update: {
          id?: string;
          nama_lengkap?: string;
          email?: string;
          peran?: Peran;
          cabang_id?: string | null;
          aktif?: boolean;
          dibuat_pada?: string;
        };
      };
      produk: {
        Row: {
          id: string;
          sku: string;
          nama: string;
          kategori: KategoriProduk;
          harga_jual: number;
          lacak_stok: boolean;
          aktif: boolean;
          dibuat_pada: string;
          diubah_pada: string;
        };
        Insert: {
          id?: string;
          sku: string;
          nama: string;
          kategori: KategoriProduk;
          harga_jual: number;
          lacak_stok?: boolean;
          aktif?: boolean;
          dibuat_pada?: string;
          diubah_pada?: string;
        };
        Update: {
          id?: string;
          sku?: string;
          nama?: string;
          kategori?: KategoriProduk;
          harga_jual?: number;
          lacak_stok?: boolean;
          aktif?: boolean;
          dibuat_pada?: string;
          diubah_pada?: string;
        };
      };
      riwayat_harga_modal: {
        Row: {
          id: string;
          produk_id: string;
          harga_modal: number;
          berlaku_mulai: string;
          dibuat_oleh: string | null;
          dibuat_pada: string;
        };
        Insert: {
          id?: string;
          produk_id: string;
          harga_modal: number;
          berlaku_mulai: string;
          dibuat_oleh?: string | null;
          dibuat_pada?: string;
        };
        Update: {
          id?: string;
          produk_id?: string;
          harga_modal?: number;
          berlaku_mulai?: string;
          dibuat_oleh?: string | null;
          dibuat_pada?: string;
        };
      };
      stok_cabang: {
        Row: {
          id: string;
          cabang_id: string;
          produk_id: string;
          jumlah: number;
          stok_minimum: number;
          diubah_pada: string;
        };
        Insert: {
          id?: string;
          cabang_id: string;
          produk_id: string;
          jumlah?: number;
          stok_minimum?: number;
          diubah_pada?: string;
        };
        Update: {
          id?: string;
          cabang_id?: string;
          produk_id?: string;
          jumlah?: number;
          stok_minimum?: number;
          diubah_pada?: string;
        };
      };
      shift_kasir: {
        Row: {
          id: string;
          cabang_id: string;
          kasir_id: string;
          status: StatusShift;
          dibuka_pada: string;
          kas_awal: number;
          ditutup_pada: string | null;
          total_tunai: number;
          total_qris: number;
          kas_seharusnya: number;
          uang_fisik: number | null;
          selisih: number | null;
          catatan_tutup: string | null;
          diverifikasi_oleh: string | null;
          diverifikasi_pada: string | null;
          catatan_verifikasi: string | null;
        };
        Insert: {
          id?: string;
          cabang_id: string;
          kasir_id: string;
          status?: StatusShift;
          dibuka_pada?: string;
          kas_awal: number;
          ditutup_pada?: string | null;
          total_tunai?: number;
          total_qris?: number;
          kas_seharusnya?: number;
          uang_fisik?: number | null;
          selisih?: number | null;
          catatan_tutup?: string | null;
          diverifikasi_oleh?: string | null;
          diverifikasi_pada?: string | null;
          catatan_verifikasi?: string | null;
        };
        Update: {
          id?: string;
          cabang_id?: string;
          kasir_id?: string;
          status?: StatusShift;
          dibuka_pada?: string;
          kas_awal?: number;
          ditutup_pada?: string | null;
          total_tunai?: number;
          total_qris?: number;
          kas_seharusnya?: number;
          uang_fisik?: number | null;
          selisih?: number | null;
          catatan_tutup?: string | null;
          diverifikasi_oleh?: string | null;
          diverifikasi_pada?: string | null;
          catatan_verifikasi?: string | null;
        };
      };
      transaksi: {
        Row: {
          id: string;
          nomor_struk: string;
          cabang_id: string;
          shift_id: string;
          kasir_id: string;
          status: StatusTransaksi;
          subtotal: number;
          diskon: number;
          alasan_diskon: string | null;
          total: number;
          metode_bayar: MetodeBayar;
          uang_diterima: number;
          kembalian: number;
          dibuat_pada: string;
          dibayar_pada: string | null;
          void_oleh: string | null;
          void_pada: string | null;
          alasan_void: string | null;
          mayar_invoice_id: string | null;
        };
        Insert: {
          id?: string;
          nomor_struk: string;
          cabang_id: string;
          shift_id: string;
          kasir_id: string;
          status?: StatusTransaksi;
          subtotal: number;
          diskon?: number;
          alasan_diskon?: string | null;
          total: number;
          metode_bayar: MetodeBayar;
          uang_diterima: number;
          kembalian?: number;
          dibuat_pada?: string;
          dibayar_pada?: string | null;
          void_oleh?: string | null;
          void_pada?: string | null;
          alasan_void?: string | null;
          mayar_invoice_id?: string | null;
        };
        Update: {
          id?: string;
          nomor_struk?: string;
          cabang_id?: string;
          shift_id?: string;
          kasir_id?: string;
          status?: StatusTransaksi;
          subtotal?: number;
          diskon?: number;
          alasan_diskon?: string | null;
          total?: number;
          metode_bayar?: MetodeBayar;
          uang_diterima?: number;
          kembalian?: number;
          dibuat_pada?: string;
          dibayar_pada?: string | null;
          void_oleh?: string | null;
          void_pada?: string | null;
          alasan_void?: string | null;
          mayar_invoice_id?: string | null;
        };
      };
      transaksi_item: {
        Row: {
          id: string;
          transaksi_id: string;
          produk_id: string;
          nama_produk: string;
          harga_satuan: number;
          jumlah: number;
          subtotal: number;
        };
        Insert: {
          id?: string;
          transaksi_id: string;
          produk_id: string;
          nama_produk: string;
          harga_satuan: number;
          jumlah: number;
          subtotal: number;
        };
        Update: {
          id?: string;
          transaksi_id?: string;
          produk_id?: string;
          nama_produk?: string;
          harga_satuan?: number;
          jumlah?: number;
          subtotal?: number;
        };
      };
      audit_log: {
        Row: {
          id: number;
          pelaku_id: string | null;
          aksi: AksiAudit;
          tabel: string;
          data_id: string | null;
          nilai_sebelum: Json | null;
          nilai_sesudah: Json | null;
          dibuat_pada: string;
        };
        Insert: {
          id?: number;
          pelaku_id?: string | null;
          aksi: AksiAudit;
          tabel: string;
          data_id?: string | null;
          nilai_sebelum?: Json | null;
          nilai_sesudah?: Json | null;
          dibuat_pada?: string;
        };
        Update: {
          id?: number;
          pelaku_id?: string | null;
          aksi?: AksiAudit;
          tabel?: string;
          data_id?: string | null;
          nilai_sebelum?: Json | null;
          nilai_sesudah?: Json | null;
          dibuat_pada?: string;
        };
      };
    };
    Functions: {
      proses_checkout_transaksi: {
        Args: {
          p_shift_id: string;
          p_items: Json;
          p_diskon: number;
          p_alasan_diskon: string | null;
          p_metode_bayar: MetodeBayar;
          p_uang_diterima: number;
        };
        Returns: Json;
      };
      eksekusi_void_transaksi: {
        Args: {
          p_transaksi_id: string;
          p_alasan_void: string;
        };
        Returns: Json;
      };
      sesuaikan_stok_cabang: {
        Args: {
          p_cabang_id: string;
          p_produk_id: string;
          p_jumlah_baru: number;
          p_alasan: string;
        };
        Returns: Json;
      };
      verifikasi_shift_kasir: {
        Args: {
          p_shift_id: string;
          p_catatan_verifikasi: string | null;
        };
        Returns: Json;
      };
    };
  };
}

// Convenience Type Aliases
export type Cabang = Database['public']['Tables']['cabang']['Row'];
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Produk = Database['public']['Tables']['produk']['Row'];
export type RiwayatHargaModal = Database['public']['Tables']['riwayat_harga_modal']['Row'];
export type StokCabang = Database['public']['Tables']['stok_cabang']['Row'];
export type ShiftKasir = Database['public']['Tables']['shift_kasir']['Row'];
export type Transaksi = Database['public']['Tables']['transaksi']['Row'];
export type TransaksiItem = Database['public']['Tables']['transaksi_item']['Row'];
export type AuditLog = Database['public']['Tables']['audit_log']['Row'];
