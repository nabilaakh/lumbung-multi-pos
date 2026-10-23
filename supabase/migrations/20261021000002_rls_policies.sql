-- ============================================================================
-- MIGRATION 2: ROW LEVEL SECURITY (RLS) POLICIES PER PERAN (BR-01, BR-11, BR-12)
-- ============================================================================

-- Aktifkan RLS di semua tabel
ALTER TABLE public.cabang ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produk ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.riwayat_harga_modal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stok_cabang ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_kasir ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaksi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaksi_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- 1. POLICIES: cabang
DROP POLICY IF EXISTS "Semua akun aktif dapat membaca data cabang aktif" ON public.cabang;
CREATE POLICY "Semua akun aktif dapat membaca data cabang aktif"
    ON public.cabang FOR SELECT
    TO authenticated
    USING (aktif = true OR public.is_owner());

DROP POLICY IF EXISTS "Hanya Owner yang dapat mengelola cabang" ON public.cabang;
CREATE POLICY "Hanya Owner yang dapat mengelola cabang"
    ON public.cabang FOR ALL
    TO authenticated
    USING (public.is_owner())
    WITH CHECK (public.is_owner());

-- 2. POLICIES: profiles
DROP POLICY IF EXISTS "Owner dapat melihat semua profil" ON public.profiles;
CREATE POLICY "Owner dapat melihat semua profil"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (public.is_owner());

DROP POLICY IF EXISTS "Kasir dan Kepala Toko hanya melihat profil cabangnya atau dirinya" ON public.profiles;
CREATE POLICY "Kasir dan Kepala Toko hanya melihat profil cabangnya atau dirinya"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (
        id = auth.uid() OR 
        (cabang_id = public.get_user_branch_id() AND (SELECT aktif FROM public.profiles WHERE id = auth.uid()))
    );

DROP POLICY IF EXISTS "Hanya Owner yang dapat mengubah data profil/akun" ON public.profiles;
CREATE POLICY "Hanya Owner yang dapat mengubah data profil/akun"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (public.is_owner())
    WITH CHECK (public.is_owner());

-- 3. POLICIES: produk
DROP POLICY IF EXISTS "Pengguna aktif dapat melihat produk aktif" ON public.produk;
CREATE POLICY "Pengguna aktif dapat melihat produk aktif"
    ON public.produk FOR SELECT
    TO authenticated
    USING (
        (aktif = true AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND aktif = true))
        OR public.is_owner()
    );

DROP POLICY IF EXISTS "Hanya Owner yang dapat menambah/mengubah produk" ON public.produk;
CREATE POLICY "Hanya Owner yang dapat menambah/mengubah produk"
    ON public.produk FOR ALL
    TO authenticated
    USING (public.is_owner())
    WITH CHECK (public.is_owner());

-- 4. POLICIES: riwayat_harga_modal (BR-11: RAHASIA, HANYA OWNER)
DROP POLICY IF EXISTS "Hanya Owner yang dapat melihat riwayat harga modal" ON public.riwayat_harga_modal;
CREATE POLICY "Hanya Owner yang dapat melihat riwayat harga modal"
    ON public.riwayat_harga_modal FOR SELECT
    TO authenticated
    USING (public.is_owner());

DROP POLICY IF EXISTS "Hanya Owner yang dapat mencatat harga modal baru" ON public.riwayat_harga_modal;
CREATE POLICY "Hanya Owner yang dapat mencatat harga modal baru"
    ON public.riwayat_harga_modal FOR INSERT
    TO authenticated
    WITH CHECK (public.is_owner());

-- 5. POLICIES: stok_cabang (BR-01, BR-12)
DROP POLICY IF EXISTS "Melihat stok cabang sesuai hak akses" ON public.stok_cabang;
CREATE POLICY "Melihat stok cabang sesuai hak akses"
    ON public.stok_cabang FOR SELECT
    TO authenticated
    USING (
        public.is_owner() OR 
        (cabang_id = public.get_user_branch_id() AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND aktif = true))
    );

DROP POLICY IF EXISTS "Kepala Toko dan Owner dapat menyesuaikan stok" ON public.stok_cabang;
CREATE POLICY "Kepala Toko dan Owner dapat menyesuaikan stok"
    ON public.stok_cabang FOR UPDATE
    TO authenticated
    USING (
        public.is_owner() OR 
        (cabang_id = public.get_user_branch_id() AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND peran = 'kepala_toko' AND aktif = true))
    )
    WITH CHECK (
        public.is_owner() OR 
        (cabang_id = public.get_user_branch_id() AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND peran = 'kepala_toko' AND aktif = true))
    );

-- 6. POLICIES: shift_kasir (BR-01, BR-02, BR-09, BR-10)
DROP POLICY IF EXISTS "Membaca shift kasir sesuai peran" ON public.shift_kasir;
CREATE POLICY "Membaca shift kasir sesuai peran"
    ON public.shift_kasir FOR SELECT
    TO authenticated
    USING (
        public.is_owner() OR
        (cabang_id = public.get_user_branch_id() AND EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = auth.uid() AND p.aktif = true AND (p.peran = 'kepala_toko' OR p.id = shift_kasir.kasir_id)
        ))
    );

DROP POLICY IF EXISTS "Kasir dapat membuka shift miliknya" ON public.shift_kasir;
CREATE POLICY "Kasir dapat membuka shift miliknya"
    ON public.shift_kasir FOR INSERT
    TO authenticated
    WITH CHECK (
        kasir_id = auth.uid() AND
        cabang_id = public.get_user_branch_id() AND
        status = 'buka' AND
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND peran = 'kasir' AND aktif = true)
    );

DROP POLICY IF EXISTS "Kasir dapat menutup shift; Kepala Toko/Owner dapat memverifikasi" ON public.shift_kasir;
DROP POLICY IF EXISTS "Kasir dapat menutup shift; Kepala Toko/Owner dapat memverifikas" ON public.shift_kasir;
DROP POLICY IF EXISTS "Kasir dapat menutup shift miliknya" ON public.shift_kasir;
DROP POLICY IF EXISTS "Kepala Toko dapat memverifikasi shift cabangnya" ON public.shift_kasir;
DROP POLICY IF EXISTS "Owner dapat mengelola shift kasir" ON public.shift_kasir;

CREATE POLICY "Kasir dapat menutup shift miliknya"
    ON public.shift_kasir FOR UPDATE
    TO authenticated
    USING (
        kasir_id = auth.uid() AND
        cabang_id = public.get_user_branch_id() AND
        status = 'buka'
    )
    WITH CHECK (
        kasir_id = auth.uid() AND
        cabang_id = public.get_user_branch_id() AND
        status = 'ditutup'
    );

CREATE POLICY "Kepala Toko dapat memverifikasi shift cabangnya"
    ON public.shift_kasir FOR UPDATE
    TO authenticated
    USING (
        cabang_id = public.get_user_branch_id() AND
        status = 'ditutup' AND
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND peran = 'kepala_toko' AND aktif = true)
    )
    WITH CHECK (
        cabang_id = public.get_user_branch_id() AND
        status = 'diverifikasi' AND
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND peran = 'kepala_toko' AND aktif = true)
    );

CREATE POLICY "Owner dapat mengelola shift kasir"
    ON public.shift_kasir FOR UPDATE
    TO authenticated
    USING (public.is_owner())
    WITH CHECK (public.is_owner());

-- 7. POLICIES: transaksi & transaksi_item (BR-01)
DROP POLICY IF EXISTS "Membaca transaksi sesuai isolasi cabang & kasir" ON public.transaksi;
CREATE POLICY "Membaca transaksi sesuai isolasi cabang & kasir"
    ON public.transaksi FOR SELECT
    TO authenticated
    USING (
        public.is_owner() OR
        (cabang_id = public.get_user_branch_id() AND EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = auth.uid() AND p.aktif = true AND (p.peran = 'kepala_toko' OR p.id = transaksi.kasir_id)
        ))
    );

DROP POLICY IF EXISTS "Membaca item transaksi sesuai izin transaksi" ON public.transaksi_item;
CREATE POLICY "Membaca item transaksi sesuai izin transaksi"
    ON public.transaksi_item FOR SELECT
    TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.transaksi t WHERE t.id = transaksi_item.transaksi_id)
    );

-- 8. POLICIES: audit_log (BR-12: HANYA OWNER, IMMUTABLE)
DROP POLICY IF EXISTS "Hanya Owner yang dapat membaca audit log" ON public.audit_log;
CREATE POLICY "Hanya Owner yang dapat membaca audit log"
    ON public.audit_log FOR SELECT
    TO authenticated
    USING (public.is_owner());

DROP POLICY IF EXISTS "Sistem/Aplikasi dapat mencatat audit log" ON public.audit_log;
CREATE POLICY "Sistem/Aplikasi dapat mencatat audit log"
    ON public.audit_log FOR INSERT
    TO authenticated
    WITH CHECK (true);
