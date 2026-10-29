-- ============================================================================
-- MIGRATION 3: STORED PROCEDURES / RPC UNTUK TRANSAKSI ATOMIK & CONCURRENCY
-- ============================================================================

-- 1. RPC: PROSES CHECKOUT TRANSAKSI ATOMIK & NOMOR STRUK ANTI-RACE-CONDITION
CREATE OR REPLACE FUNCTION public.proses_checkout_transaksi(
    p_shift_id UUID,
    p_items JSONB, -- Array: [{"produk_id": "uuid", "jumlah": 2}]
    p_diskon INT,
    p_alasan_diskon TEXT,
    p_metode_bayar TEXT,
    p_uang_diterima INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_kasir_id UUID := auth.uid();
    v_cabang_id UUID;
    v_kode_cabang TEXT;
    v_shift_status TEXT;
    v_today DATE := (NOW() AT TIME ZONE 'Asia/Jakarta')::DATE;
    v_next_seq INT;
    v_nomor_struk TEXT;
    v_subtotal INT := 0;
    v_total INT := 0;
    v_kembalian INT := 0;
    v_transaksi_id UUID;
    v_item JSONB;
    v_produk RECORD;
    v_stok_tersedia INT;
    v_item_subtotal INT;
BEGIN
    -- Validasi 1: Shift kasir harus berstatus 'buka' (BR-02)
    SELECT cabang_id, status INTO v_cabang_id, v_shift_status
    FROM public.shift_kasir
    WHERE id = p_shift_id AND kasir_id = v_kasir_id;

    IF v_shift_status IS NULL OR v_shift_status != 'buka' THEN
        RAISE EXCEPTION 'Shift kasir tidak aktif atau sudah ditutup';
    END IF;

    -- Validasi 2: Kunci baris cabang untuk penomoran struk sekuensial (BR-04)
    SELECT kode, urut_struk_tanggal, urut_struk_terakhir 
    INTO v_kode_cabang, v_today, v_next_seq
    FROM public.cabang
    WHERE id = v_cabang_id
    FOR UPDATE;

    -- Reset nomor urut jika tanggal baru (WIB)
    IF v_today IS NULL OR v_today < (NOW() AT TIME ZONE 'Asia/Jakarta')::DATE THEN
        v_today := (NOW() AT TIME ZONE 'Asia/Jakarta')::DATE;
        v_next_seq := 1;
    ELSE
        v_next_seq := v_next_seq + 1;
    END IF;

    -- Update penghitung struk cabang
    UPDATE public.cabang
    SET urut_struk_tanggal = v_today,
        urut_struk_terakhir = v_next_seq
    WHERE id = v_cabang_id;

    -- Format nomor struk: KODE-YYYYMMDD-NNNN
    v_nomor_struk := v_kode_cabang || '-' || TO_CHAR(v_today, 'YYYYMMDD') || '-' || LPAD(v_next_seq::TEXT, 4, '0');

    -- Validasi 3: Cek stok dan hitung subtotal (BR-03 & BR-05)
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        SELECT * INTO v_produk 
        FROM public.produk 
        WHERE id = (v_item->>'produk_id')::UUID;

        IF v_produk IS NULL OR v_produk.aktif = false THEN
            RAISE EXCEPTION 'Produk tidak ditemukan atau berstatus nonaktif';
        END IF;

        IF (v_item->>'jumlah')::INT < 1 OR (v_item->>'jumlah')::INT > 99 THEN
            RAISE EXCEPTION 'Jumlah item harus antara 1 sampai 99';
        END IF;

        -- Jika produk dilacak stoknya (bukan minuman racikan)
        IF v_produk.lacak_stok THEN
            SELECT jumlah INTO v_stok_tersedia
            FROM public.stok_cabang
            WHERE cabang_id = v_cabang_id AND produk_id = v_produk.id
            FOR UPDATE;

            IF v_stok_tersedia IS NULL OR v_stok_tersedia < (v_item->>'jumlah')::INT THEN
                RAISE EXCEPTION 'Stok untuk produk "%" tidak mencukupi (sisa: %)', 
                    v_produk.nama, COALESCE(v_stok_tersedia, 0);
            END IF;

            UPDATE public.stok_cabang
            SET jumlah = jumlah - (v_item->>'jumlah')::INT,
                diubah_pada = now()
            WHERE cabang_id = v_cabang_id AND produk_id = v_produk.id;
        END IF;

        v_item_subtotal := v_produk.harga_jual * (v_item->>'jumlah')::INT;
        v_subtotal := v_subtotal + v_item_subtotal;
    END LOOP;

    -- Hitung diskon dan total (BR-06)
    v_total := v_subtotal - p_diskon;
    IF v_total <= 0 THEN
        RAISE EXCEPTION 'Total transaksi tidak valid';
    END IF;

    -- Hitung kembalian (BR-07)
    v_kembalian := p_uang_diterima - v_total;

    -- Simpan transaksi
    INSERT INTO public.transaksi (
        nomor_struk, cabang_id, shift_id, kasir_id, status,
        subtotal, diskon, alasan_diskon, total,
        metode_bayar, uang_diterima, kembalian, dibayar_pada
    ) VALUES (
        v_nomor_struk, v_cabang_id, p_shift_id, v_kasir_id, 'lunas',
        v_subtotal, p_diskon, p_alasan_diskon, v_total,
        p_metode_bayar, p_uang_diterima, v_kembalian, now()
    ) RETURNING id INTO v_transaksi_id;

    -- Simpan transaksi_item
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        SELECT * INTO v_produk FROM public.produk WHERE id = (v_item->>'produk_id')::UUID;
        INSERT INTO public.transaksi_item (
            transaksi_id, produk_id, nama_produk, harga_satuan, jumlah, subtotal
        ) VALUES (
            v_transaksi_id,
            v_produk.id,
            v_produk.nama,
            v_produk.harga_jual,
            (v_item->>'jumlah')::INT,
            v_produk.harga_jual * (v_item->>'jumlah')::INT
        );
    END LOOP;

    -- Akumulasikan ke shift kasir berjalan
    IF p_metode_bayar = 'tunai' THEN
        UPDATE public.shift_kasir
        SET total_tunai = total_tunai + v_total,
            kas_seharusnya = kas_awal + total_tunai + v_total
        WHERE id = p_shift_id;
    ELSE
        UPDATE public.shift_kasir
        SET total_qris = total_qris + v_total
        WHERE id = p_shift_id;
    END IF;

    RETURN jsonb_build_object(
        'transaksi_id', v_transaksi_id,
        'nomor_struk', v_nomor_struk,
        'total', v_total,
        'kembalian', v_kembalian
    );
END;
$$;

-- 2. RPC: EKSEKUSI VOID TRANSAKSI & PENGEMBALIAN STOK (BR-08 & BR-12)
CREATE OR REPLACE FUNCTION public.eksekusi_void_transaksi(
    p_transaksi_id UUID,
    p_alasan_void TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user RECORD;
    v_trx RECORD;
    v_item RECORD;
    v_shift RECORD;
BEGIN
    SELECT * INTO v_user FROM public.profiles WHERE id = auth.uid();
    
    SELECT * INTO v_trx FROM public.transaksi WHERE id = p_transaksi_id;
    IF v_trx IS NULL THEN
        RAISE EXCEPTION 'Transaksi tidak ditemukan';
    END IF;

    IF v_user.peran = 'kasir' OR (v_user.peran = 'kepala_toko' AND v_user.cabang_id != v_trx.cabang_id) THEN
        RAISE EXCEPTION 'Anda tidak memiliki hak otorisasi void transaksi ini';
    END IF;

    IF v_trx.status != 'lunas' THEN
        RAISE EXCEPTION 'Hanya transaksi berstatus lunas yang dapat di-void';
    END IF;

    IF (v_trx.dibuat_pada AT TIME ZONE 'Asia/Jakarta')::DATE != (NOW() AT TIME ZONE 'Asia/Jakarta')::DATE THEN
        RAISE EXCEPTION 'Void hanya berlaku untuk transaksi pada hari ini';
    END IF;

    SELECT * INTO v_shift FROM public.shift_kasir WHERE id = v_trx.shift_id;
    IF v_shift.status != 'buka' THEN
        RAISE EXCEPTION 'Transaksi tidak dapat di-void karena shift kasir sudah ditutup';
    END IF;

    IF length(trim(COALESCE(p_alasan_void, ''))) < 10 THEN
        RAISE EXCEPTION 'Alasan void minimal 10 karakter';
    END IF;

    -- Kembalikan stok produk yang dilacak
    FOR v_item IN SELECT ti.*, p.lacak_stok 
                  FROM public.transaksi_item ti
                  JOIN public.produk p ON p.id = ti.produk_id
                  WHERE ti.transaksi_id = p_transaksi_id
    LOOP
        IF v_item.lacak_stok THEN
            UPDATE public.stok_cabang
            SET jumlah = jumlah + v_item.jumlah,
                diubah_pada = now()
            WHERE cabang_id = v_trx.cabang_id AND produk_id = v_item.produk_id;
        END IF;
    END LOOP;

    -- Kurangi total tunai/qris pada shift kasir
    IF v_trx.metode_bayar = 'tunai' THEN
        UPDATE public.shift_kasir
        SET total_tunai = total_tunai - v_trx.total,
            kas_seharusnya = kas_awal + (total_tunai - v_trx.total)
        WHERE id = v_trx.shift_id;
    ELSE
        UPDATE public.shift_kasir
        SET total_qris = total_qris - v_trx.total
        WHERE id = v_trx.shift_id;
    END IF;

    -- Ubah status transaksi menjadi void
    UPDATE public.transaksi
    SET status = 'void',
        void_oleh = v_user.id,
        void_pada = now(),
        alasan_void = p_alasan_void
    WHERE id = p_transaksi_id;

    -- Catat ke audit_log
    INSERT INTO public.audit_log (
        pelaku_id, aksi, tabel, data_id, nilai_sebelum, nilai_sesudah
    ) VALUES (
        v_user.id,
        'void_transaksi',
        'transaksi',
        p_transaksi_id,
        jsonb_build_object('status', 'lunas', 'total', v_trx.total),
        jsonb_build_object('status', 'void', 'alasan_void', p_alasan_void, 'void_oleh', v_user.id)
    );

    RETURN jsonb_build_object('status', 'success', 'transaksi_id', p_transaksi_id);
END;
$$;

-- 3. RPC: PENYESUAIAN STOK (BR-12)
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
        RAISE EXCEPTION 'Tidak berwenang menyesuaikan stok cabang ini';
    END IF;

    IF p_jumlah_baru < 0 THEN
        RAISE EXCEPTION 'Jumlah stok baru tidak boleh negatif';
    END IF;

    IF length(trim(COALESCE(p_alasan, ''))) = 0 THEN
        RAISE EXCEPTION 'Alasan penyesuaian stok wajib diisi';
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

-- 4. RPC: VERIFIKASI SHIFT KASIR (BR-10 & BR-12)
CREATE OR REPLACE FUNCTION public.verifikasi_shift_kasir(
    p_shift_id UUID,
    p_catatan_verifikasi TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user RECORD;
    v_shift RECORD;
BEGIN
    SELECT * INTO v_user FROM public.profiles WHERE id = auth.uid();
    SELECT * INTO v_shift FROM public.shift_kasir WHERE id = p_shift_id;

    IF v_shift IS NULL THEN
        RAISE EXCEPTION 'Shift tidak ditemukan';
    END IF;

    IF v_user.peran = 'kasir' OR (v_user.peran = 'kepala_toko' AND v_user.cabang_id != v_shift.cabang_id) THEN
        RAISE EXCEPTION 'Tidak berwenang memverifikasi shift ini';
    END IF;

    IF v_shift.status != 'ditutup' THEN
        RAISE EXCEPTION 'Hanya shift berstatus ditutup yang dapat diverifikasi';
    END IF;

    UPDATE public.shift_kasir
    SET status = 'diverifikasi',
        diverifikasi_oleh = v_user.id,
        diverifikasi_pada = now(),
        catatan_verifikasi = p_catatan_verifikasi
    WHERE id = p_shift_id;

    INSERT INTO public.audit_log (
        pelaku_id, aksi, tabel, data_id, nilai_sebelum, nilai_sesudah
    ) VALUES (
        v_user.id,
        'verifikasi_shift',
        'shift_kasir',
        p_shift_id,
        jsonb_build_object('status', 'ditutup'),
        jsonb_build_object('status', 'diverifikasi', 'catatan', p_catatan_verifikasi)
    );

    RETURN jsonb_build_object('status', 'success');
END;
$$;
