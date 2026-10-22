-- ============================================================================
-- MIGRATION 1: INITIAL SCHEMA & CONSTRAINTS (9 TABEL SESUAI ERD_POS.md)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- TABEL 1: CABANG
CREATE TABLE IF NOT EXISTS public.cabang (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kode TEXT NOT NULL UNIQUE CHECK (kode IN ('TBT', 'BTR', 'DPK')),
    nama TEXT NOT NULL,
    alamat TEXT,
    aktif BOOLEAN NOT NULL DEFAULT true,
    urut_struk_tanggal DATE,
    urut_struk_terakhir INT NOT NULL DEFAULT 0 CHECK (urut_struk_terakhir >= 0)
);

-- TABEL 2: PROFILES (Terhubung ke auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nama_lengkap TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    peran TEXT NOT NULL CHECK (peran IN ('kasir', 'kepala_toko', 'owner')),
    cabang_id UUID REFERENCES public.cabang(id) ON DELETE RESTRICT,
    aktif BOOLEAN NOT NULL DEFAULT false,
    dibuat_pada TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    CONSTRAINT chk_profiles_cabang CHECK (
        (peran = 'owner' AND cabang_id IS NULL) OR
        (peran IN ('kasir', 'kepala_toko') AND cabang_id IS NOT NULL)
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_kepala_toko_per_branch 
ON public.profiles(cabang_id) 
WHERE peran = 'kepala_toko' AND aktif = true;

-- Helper functions untuk pembacaan profil & peran di RLS
CREATE OR REPLACE FUNCTION public.get_auth_profile()
RETURNS TABLE (
    user_id UUID,
    peran TEXT,
    cabang_id UUID,
    aktif BOOLEAN
) 
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
    SELECT id, peran, cabang_id, aktif
    FROM public.profiles
    WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND peran = 'owner' AND aktif = true
    );
$$;

CREATE OR REPLACE FUNCTION public.get_user_branch_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT cabang_id FROM public.profiles WHERE id = auth.uid();
$$;

-- TABEL 3: PRODUK
CREATE TABLE IF NOT EXISTS public.produk (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku TEXT NOT NULL UNIQUE,
    nama TEXT NOT NULL,
    kategori TEXT NOT NULL CHECK (kategori IN ('kopi', 'non_kopi', 'roti', 'snack', 'kemasan')),
    harga_jual INT NOT NULL CHECK (harga_jual > 0),
    lacak_stok BOOLEAN NOT NULL DEFAULT true,
    aktif BOOLEAN NOT NULL DEFAULT true,
    dibuat_pada TIMESTAMPTZ NOT NULL DEFAULT now(),
    diubah_pada TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- TABEL 4: RIWAYAT HARGA MODAL (DATA RAHASIA OWNER)
CREATE TABLE IF NOT EXISTS public.riwayat_harga_modal (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    produk_id UUID NOT NULL REFERENCES public.produk(id) ON DELETE RESTRICT,
    harga_modal INT NOT NULL CHECK (harga_modal >= 0),
    berlaku_mulai TIMESTAMPTZ NOT NULL,
    dibuat_oleh UUID REFERENCES public.profiles(id),
    dibuat_pada TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    CONSTRAINT uq_produk_berlaku_mulai UNIQUE (produk_id, berlaku_mulai)
);

-- TABEL 5: STOK CABANG
CREATE TABLE IF NOT EXISTS public.stok_cabang (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cabang_id UUID NOT NULL REFERENCES public.cabang(id) ON DELETE RESTRICT,
    produk_id UUID NOT NULL REFERENCES public.produk(id) ON DELETE RESTRICT,
    jumlah INT NOT NULL DEFAULT 0 CHECK (jumlah >= 0),
    stok_minimum INT NOT NULL DEFAULT 5 CHECK (stok_minimum >= 0),
    diubah_pada TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    CONSTRAINT uq_cabang_produk UNIQUE (cabang_id, produk_id)
);

-- TABEL 6: SHIFT KASIR
CREATE TABLE IF NOT EXISTS public.shift_kasir (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cabang_id UUID NOT NULL REFERENCES public.cabang(id) ON DELETE RESTRICT,
    kasir_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'buka' CHECK (status IN ('buka', 'ditutup', 'diverifikasi')),
    dibuka_pada TIMESTAMPTZ NOT NULL DEFAULT now(),
    kas_awal INT NOT NULL CHECK (kas_awal >= 0 AND kas_awal <= 2000000),
    ditutup_pada TIMESTAMPTZ,
    total_tunai INT NOT NULL DEFAULT 0 CHECK (total_tunai >= 0),
    total_qris INT NOT NULL DEFAULT 0 CHECK (total_qris >= 0),
    kas_seharusnya INT NOT NULL DEFAULT 0 CHECK (kas_seharusnya >= 0),
    uang_fisik INT CHECK (uang_fisik >= 0),
    selisih INT,
    catatan_tutup TEXT,
    diverifikasi_oleh UUID REFERENCES public.profiles(id),
    diverifikasi_pada TIMESTAMPTZ,
    catatan_verifikasi TEXT,
    
    CONSTRAINT chk_shift_ditutup_pada CHECK (
        (status = 'buka' AND ditutup_pada IS NULL) OR
        (status IN ('ditutup', 'diverifikasi') AND ditutup_pada IS NOT NULL)
    ),
    CONSTRAINT chk_shift_selisih_catatan CHECK (
        status = 'buka' OR
        abs(COALESCE(selisih, 0)) <= 20000 OR
        (abs(COALESCE(selisih, 0)) > 20000 AND catatan_tutup IS NOT NULL AND length(trim(catatan_tutup)) > 0)
    ),
    CONSTRAINT chk_shift_diverifikasi CHECK (
        (status != 'diverifikasi') OR
        (status = 'diverifikasi' AND diverifikasi_oleh IS NOT NULL AND diverifikasi_pada IS NOT NULL)
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_one_open_shift_per_cashier 
ON public.shift_kasir(kasir_id) 
WHERE status = 'buka';

-- TABEL 7: TRANSAKSI
CREATE TABLE IF NOT EXISTS public.transaksi (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nomor_struk TEXT NOT NULL UNIQUE,
    cabang_id UUID NOT NULL REFERENCES public.cabang(id) ON DELETE RESTRICT,
    shift_id UUID NOT NULL REFERENCES public.shift_kasir(id) ON DELETE RESTRICT,
    kasir_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'lunas' CHECK (status IN ('lunas', 'void', 'menunggu_bayar', 'batal')),
    subtotal INT NOT NULL CHECK (subtotal > 0),
    diskon INT NOT NULL DEFAULT 0 CHECK (diskon >= 0),
    alasan_diskon TEXT,
    total INT NOT NULL CHECK (total > 0),
    metode_bayar TEXT NOT NULL CHECK (metode_bayar IN ('tunai', 'qris')),
    uang_diterima INT NOT NULL CHECK (uang_diterima >= 0),
    kembalian INT NOT NULL DEFAULT 0 CHECK (kembalian >= 0),
    dibuat_pada TIMESTAMPTZ NOT NULL DEFAULT now(),
    dibayar_pada TIMESTAMPTZ,
    void_oleh UUID REFERENCES public.profiles(id),
    void_pada TIMESTAMPTZ,
    alasan_void TEXT,
    mayar_invoice_id TEXT UNIQUE,
    
    CONSTRAINT chk_transaksi_diskon CHECK (
        diskon <= (subtotal * 10 / 100) AND
        ((diskon = 0) OR (diskon > 0 AND alasan_diskon IS NOT NULL AND length(trim(alasan_diskon)) > 0))
    ),
    CONSTRAINT chk_transaksi_total CHECK (total = subtotal - diskon),
    CONSTRAINT chk_transaksi_pembayaran CHECK (
        (metode_bayar = 'tunai' AND uang_diterima >= total AND kembalian = uang_diterima - total) OR
        (metode_bayar = 'qris' AND uang_diterima = total AND kembalian = 0)
    ),
    CONSTRAINT chk_transaksi_void CHECK (
        (status != 'void') OR
        (status = 'void' AND void_oleh IS NOT NULL AND void_pada IS NOT NULL AND length(trim(COALESCE(alasan_void, ''))) >= 10)
    )
);

-- TABEL 8: TRANSAKSI_ITEM
CREATE TABLE IF NOT EXISTS public.transaksi_item (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaksi_id UUID NOT NULL REFERENCES public.transaksi(id) ON DELETE CASCADE,
    produk_id UUID NOT NULL REFERENCES public.produk(id) ON DELETE RESTRICT,
    nama_produk TEXT NOT NULL,
    harga_satuan INT NOT NULL CHECK (harga_satuan > 0),
    jumlah INT NOT NULL CHECK (jumlah >= 1 AND jumlah <= 99),
    subtotal INT NOT NULL,
    
    CONSTRAINT uq_transaksi_produk UNIQUE (transaksi_id, produk_id),
    CONSTRAINT chk_item_subtotal CHECK (subtotal = harga_satuan * jumlah)
);

-- TABEL 9: AUDIT_LOG (DATA RAHASIA, IMMUTABLE)
CREATE TABLE IF NOT EXISTS public.audit_log (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    pelaku_id UUID REFERENCES public.profiles(id),
    aksi TEXT NOT NULL CHECK (aksi IN (
        'void_transaksi', 
        'verifikasi_shift', 
        'penyesuaian_stok', 
        'ubah_harga_jual', 
        'ubah_harga_modal', 
        'nonaktifkan_produk', 
        'ubah_akun',
        'nonaktifkan_akun'
    )),
    tabel TEXT NOT NULL,
    data_id UUID,
    nilai_sebelum JSONB,
    nilai_sesudah JSONB,
    dibuat_pada TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- TRIGGER OTOMATIS PENDAFTARAN DARI auth.users KE profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, nama_lengkap, email, peran, cabang_id, aktif)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'nama_lengkap', split_part(NEW.email, '@', 1)),
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'peran', 'kasir'),
        NULL,
        false
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
