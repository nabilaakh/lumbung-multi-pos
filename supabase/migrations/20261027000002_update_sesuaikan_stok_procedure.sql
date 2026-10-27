-- Migration: Update sesuaikan_stok_cabang stored procedure
-- Enforce mandatory reason length >= 5 and p_jumlah_baru >= 0

CREATE OR REPLACE FUNCTION public.sesuaikan_stok_cabang(
    p_cabang_id UUID,
    p_produk_id UUID,
    p_jumlah_baru INT,
    p_alasan TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user RECORD;
    v_jumlah_lama INT;
BEGIN
    SELECT * INTO v_user FROM public.profiles WHERE id = auth.uid();

    IF v_user.peran = 'kasir' OR (v_user.peran = 'kepala_toko' AND v_user.cabang_id != p_cabang_id) THEN
        RAISE EXCEPTION 'Tidak berwenang menyesuaikan stok cabang ini (BR-12)';
    END IF;

    IF p_jumlah_baru IS NULL OR p_jumlah_baru < 0 THEN
        RAISE EXCEPTION 'Jumlah stok baru tidak boleh negatif';
    END IF;

    IF p_alasan IS NULL OR length(trim(p_alasan)) < 5 THEN
        RAISE EXCEPTION 'Alasan penyesuaian stok wajib diisi minimal 5 karakter';
    END IF;

    SELECT jumlah INTO v_jumlah_lama 
    FROM public.stok_cabang 
    WHERE cabang_id = p_cabang_id AND produk_id = p_produk_id;

    UPDATE public.stok_cabang
    SET jumlah = p_jumlah_baru,
        diubah_pada = now()
    WHERE cabang_id = p_cabang_id AND produk_id = p_produk_id;

    INSERT INTO public.audit_log (
        pelaku_id, aksi, tabel, data_id, nilai_sebelum, nilai_sesudah
    ) VALUES (
        v_user.id,
        'penyesuaian_stok',
        'stok_cabang',
        p_produk_id,
        jsonb_build_object('jumlah', v_jumlah_lama),
        jsonb_build_object('jumlah', p_jumlah_baru, 'alasan', p_alasan)
    );

    RETURN jsonb_build_object('status', 'success', 'jumlah_baru', p_jumlah_baru);
END;
$$;
