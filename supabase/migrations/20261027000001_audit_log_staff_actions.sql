-- ============================================================================
-- MIGRATION 5: PERLUAS CHECK CONSTRAINT PADA AUDIT_LOG UNTUK AKSI STAF (BR-12)
-- ============================================================================

-- Tambahkan aksi baru pada constraint CHECK kolom aksi di tabel audit_log:
-- 'tambah_staf', 'aktifkan_akun', 'reset_password'
ALTER TABLE public.audit_log DROP CONSTRAINT IF EXISTS audit_log_aksi_check;
ALTER TABLE public.audit_log ADD CONSTRAINT audit_log_aksi_check CHECK (aksi IN (
    'void_transaksi', 
    'verifikasi_shift', 
    'penyesuaian_stok', 
    'ubah_harga_jual', 
    'ubah_harga_modal', 
    'nonaktifkan_produk', 
    'ubah_akun',
    'nonaktifkan_akun',
    'batal_transaksi_qris',
    'tambah_staf',
    'aktifkan_akun',
    'reset_password'
));
