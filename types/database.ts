export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          aksi: string
          data_id: string | null
          dibuat_pada: string
          id: number
          nilai_sebelum: Json | null
          nilai_sesudah: Json | null
          pelaku_id: string | null
          tabel: string
        }
        Insert: {
          aksi: string
          data_id?: string | null
          dibuat_pada?: string
          id?: never
          nilai_sebelum?: Json | null
          nilai_sesudah?: Json | null
          pelaku_id?: string | null
          tabel: string
        }
        Update: {
          aksi?: string
          data_id?: string | null
          dibuat_pada?: string
          id?: never
          nilai_sebelum?: Json | null
          nilai_sesudah?: Json | null
          pelaku_id?: string | null
          tabel?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_pelaku_id_fkey"
            columns: ["pelaku_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cabang: {
        Row: {
          aktif: boolean
          alamat: string | null
          id: string
          kode: string
          nama: string
          urut_struk_tanggal: string | null
          urut_struk_terakhir: number
        }
        Insert: {
          aktif?: boolean
          alamat?: string | null
          id?: string
          kode: string
          nama: string
          urut_struk_tanggal?: string | null
          urut_struk_terakhir?: number
        }
        Update: {
          aktif?: boolean
          alamat?: string | null
          id?: string
          kode?: string
          nama?: string
          urut_struk_tanggal?: string | null
          urut_struk_terakhir?: number
        }
        Relationships: []
      }
      produk: {
        Row: {
          aktif: boolean
          dibuat_pada: string
          diubah_pada: string
          harga_jual: number
          id: string
          kategori: string
          lacak_stok: boolean
          nama: string
          sku: string
        }
        Insert: {
          aktif?: boolean
          dibuat_pada?: string
          diubah_pada?: string
          harga_jual: number
          id?: string
          kategori: string
          lacak_stok?: boolean
          nama: string
          sku: string
        }
        Update: {
          aktif?: boolean
          dibuat_pada?: string
          diubah_pada?: string
          harga_jual?: number
          id?: string
          kategori?: string
          lacak_stok?: boolean
          nama?: string
          sku?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          aktif: boolean
          cabang_id: string | null
          dibuat_pada: string
          email: string
          id: string
          nama_lengkap: string
          peran: string
        }
        Insert: {
          aktif?: boolean
          cabang_id?: string | null
          dibuat_pada?: string
          email: string
          id: string
          nama_lengkap: string
          peran: string
        }
        Update: {
          aktif?: boolean
          cabang_id?: string | null
          dibuat_pada?: string
          email?: string
          id?: string
          nama_lengkap?: string
          peran?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_cabang_id_fkey"
            columns: ["cabang_id"]
            isOneToOne: false
            referencedRelation: "cabang"
            referencedColumns: ["id"]
          },
        ]
      }
      riwayat_harga_modal: {
        Row: {
          berlaku_mulai: string
          dibuat_oleh: string | null
          dibuat_pada: string
          harga_modal: number
          id: string
          produk_id: string
        }
        Insert: {
          berlaku_mulai: string
          dibuat_oleh?: string | null
          dibuat_pada?: string
          harga_modal: number
          id?: string
          produk_id: string
        }
        Update: {
          berlaku_mulai?: string
          dibuat_oleh?: string | null
          dibuat_pada?: string
          harga_modal?: number
          id?: string
          produk_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "riwayat_harga_modal_dibuat_oleh_fkey"
            columns: ["dibuat_oleh"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "riwayat_harga_modal_produk_id_fkey"
            columns: ["produk_id"]
            isOneToOne: false
            referencedRelation: "produk"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_kasir: {
        Row: {
          cabang_id: string
          catatan_tutup: string | null
          catatan_verifikasi: string | null
          dibuka_pada: string
          ditutup_pada: string | null
          diverifikasi_oleh: string | null
          diverifikasi_pada: string | null
          id: string
          kas_awal: number
          kas_seharusnya: number
          kasir_id: string
          selisih: number | null
          status: string
          total_qris: number
          total_tunai: number
          uang_fisik: number | null
        }
        Insert: {
          cabang_id: string
          catatan_tutup?: string | null
          catatan_verifikasi?: string | null
          dibuka_pada?: string
          ditutup_pada?: string | null
          diverifikasi_oleh?: string | null
          diverifikasi_pada?: string | null
          id?: string
          kas_awal: number
          kas_seharusnya?: number
          kasir_id: string
          selisih?: number | null
          status?: string
          total_qris?: number
          total_tunai?: number
          uang_fisik?: number | null
        }
        Update: {
          cabang_id?: string
          catatan_tutup?: string | null
          catatan_verifikasi?: string | null
          dibuka_pada?: string
          ditutup_pada?: string | null
          diverifikasi_oleh?: string | null
          diverifikasi_pada?: string | null
          id?: string
          kas_awal?: number
          kas_seharusnya?: number
          kasir_id?: string
          selisih?: number | null
          status?: string
          total_qris?: number
          total_tunai?: number
          uang_fisik?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "shift_kasir_cabang_id_fkey"
            columns: ["cabang_id"]
            isOneToOne: false
            referencedRelation: "cabang"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_kasir_diverifikasi_oleh_fkey"
            columns: ["diverifikasi_oleh"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_kasir_kasir_id_fkey"
            columns: ["kasir_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stok_cabang: {
        Row: {
          cabang_id: string
          diubah_pada: string
          id: string
          jumlah: number
          produk_id: string
          stok_minimum: number
        }
        Insert: {
          cabang_id: string
          diubah_pada?: string
          id?: string
          jumlah?: number
          produk_id: string
          stok_minimum?: number
        }
        Update: {
          cabang_id?: string
          diubah_pada?: string
          id?: string
          jumlah?: number
          produk_id?: string
          stok_minimum?: number
        }
        Relationships: [
          {
            foreignKeyName: "stok_cabang_cabang_id_fkey"
            columns: ["cabang_id"]
            isOneToOne: false
            referencedRelation: "cabang"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stok_cabang_produk_id_fkey"
            columns: ["produk_id"]
            isOneToOne: false
            referencedRelation: "produk"
            referencedColumns: ["id"]
          },
        ]
      }
      transaksi: {
        Row: {
          alasan_diskon: string | null
          alasan_void: string | null
          cabang_id: string
          dibayar_pada: string | null
          dibuat_pada: string
          diskon: number
          id: string
          kasir_id: string
          kembalian: number
          mayar_invoice_id: string | null
          metode_bayar: string
          nomor_struk: string
          shift_id: string
          status: string
          subtotal: number
          total: number
          uang_diterima: number
          void_oleh: string | null
          void_pada: string | null
        }
        Insert: {
          alasan_diskon?: string | null
          alasan_void?: string | null
          cabang_id: string
          dibayar_pada?: string | null
          dibuat_pada?: string
          diskon?: number
          id?: string
          kasir_id: string
          kembalian?: number
          mayar_invoice_id?: string | null
          metode_bayar: string
          nomor_struk: string
          shift_id: string
          status?: string
          subtotal: number
          total: number
          uang_diterima: number
          void_oleh?: string | null
          void_pada?: string | null
        }
        Update: {
          alasan_diskon?: string | null
          alasan_void?: string | null
          cabang_id?: string
          dibayar_pada?: string | null
          dibuat_pada?: string
          diskon?: number
          id?: string
          kasir_id?: string
          kembalian?: number
          mayar_invoice_id?: string | null
          metode_bayar?: string
          nomor_struk?: string
          shift_id?: string
          status?: string
          subtotal?: number
          total?: number
          uang_diterima?: number
          void_oleh?: string | null
          void_pada?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transaksi_cabang_id_fkey"
            columns: ["cabang_id"]
            isOneToOne: false
            referencedRelation: "cabang"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaksi_kasir_id_fkey"
            columns: ["kasir_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaksi_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shift_kasir"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaksi_void_oleh_fkey"
            columns: ["void_oleh"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      transaksi_item: {
        Row: {
          harga_satuan: number
          id: string
          jumlah: number
          nama_produk: string
          produk_id: string
          subtotal: number
          transaksi_id: string
        }
        Insert: {
          harga_satuan: number
          id?: string
          jumlah: number
          nama_produk: string
          produk_id: string
          subtotal: number
          transaksi_id: string
        }
        Update: {
          harga_satuan?: number
          id?: string
          jumlah?: number
          nama_produk?: string
          produk_id?: string
          subtotal?: number
          transaksi_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaksi_item_produk_id_fkey"
            columns: ["produk_id"]
            isOneToOne: false
            referencedRelation: "produk"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaksi_item_transaksi_id_fkey"
            columns: ["transaksi_id"]
            isOneToOne: false
            referencedRelation: "transaksi"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      batalkan_transaksi_qris: {
        Args: {
          p_alasan?: string
          p_transaksi_id: string
        }
        Returns: Json
      }
      eksekusi_void_transaksi: {
        Args: { p_alasan_void: string; p_transaksi_id: string }
        Returns: Json
      }
      inisiasi_transaksi_qris: {
        Args: {
          p_alasan_diskon?: string
          p_diskon: number
          p_items: Json
          p_shift_id: string
        }
        Returns: Json
      }
      lunaskan_transaksi_qris: {
        Args: {
          p_mayar_invoice_id?: string
          p_transaksi_id: string
        }
        Returns: Json
      }
      get_auth_profile: {
        Args: never
        Returns: {
          aktif: boolean
          cabang_id: string
          peran: string
          user_id: string
        }[]
      }
      get_user_branch_id: { Args: never; Returns: string }
      is_owner: { Args: never; Returns: boolean }
      proses_checkout_transaksi: {
        Args: {
          p_alasan_diskon: string
          p_diskon: number
          p_items: Json
          p_metode_bayar: string
          p_shift_id: string
          p_uang_diterima: number
        }
        Returns: Json
      }
      sesuaikan_stok_cabang: {
        Args: {
          p_alasan: string
          p_cabang_id: string
          p_jumlah_baru: number
          p_produk_id: string
        }
        Returns: Json
      }
      verifikasi_shift_kasir: {
        Args: { p_catatan_verifikasi: string; p_shift_id: string }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

// Convenience Type Aliases
export type Peran = 'kasir' | 'kepala_toko' | 'owner';
export type PeranPengguna = Peran;
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
  | 'ubah_akun'
  | 'nonaktifkan_akun'
  | 'batal_transaksi_qris'
  | 'tambah_staf'
  | 'aktifkan_akun'
  | 'reset_password';

export type Cabang = Database['public']['Tables']['cabang']['Row'];
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type ProfilPengguna = Profile;
export type Produk = Database['public']['Tables']['produk']['Row'];
export type RiwayatHargaModal = Database['public']['Tables']['riwayat_harga_modal']['Row'];
export type StokCabang = Database['public']['Tables']['stok_cabang']['Row'];
export type ShiftKasir = Database['public']['Tables']['shift_kasir']['Row'];
export type Transaksi = Database['public']['Tables']['transaksi']['Row'];
export type TransaksiItem = Database['public']['Tables']['transaksi_item']['Row'];
export type AuditLog = Database['public']['Tables']['audit_log']['Row'];
