-- ============================================================================
-- MIGRATION 4: STORED PROCEDURES UNTUK INTEGRASI MAYAR QRIS DINAMIS
-- ============================================================================

-- 1. Perluas CHECK constraint pada audit_log untuk mencatat 'batal_transaksi_qris'
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
    'batal_transaksi_qris'
));

-- 2. RPC: INISIASI TRANSAKSI QRIS DINAMIS (STATUS MENUNGGU_BAYAR & RESERVASI STOK)
CREATE OR REPLACE FUNCTION public.inisiasi_transaksi_qris(
    p_shift_id UUID,
    p_items JSONB, -- Array: [{"produk_id": "uuid", "jumlah": 2}]
    p_diskon INT,
    p_alasan_diskon TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_kasir_id UUID := auth.uid();
    v_shift_kasir_id UUID;
    v_cabang_id UUID;
    v_kode_cabang TEXT;
    v_shift_status TEXT;
    v_today DATE := (NOW() AT TIME ZONE 'Asia/Jakarta')::DATE;
    v_next_seq INT;
    v_nomor_struk TEXT;
    v_subtotal INT := 0;
    v_total INT := 0;
    v_transaksi_id UUID;
    v_item JSONB;
    v_produk RECORD;
    v_stok_tersedia INT;
    v_item_subtotal INT;
BEGIN
    -- Validasi 1: Shift kasir harus berstatus 'buka' (BR-02)
    SELECT cabang_id, kasir_id, status 
    INTO v_cabang_id, v_shift_kasir_id, v_shift_status
    FROM public.shift_kasir
    WHERE id = p_shift_id;

    IF v_shift_status IS NULL OR v_shift_status != 'buka' THEN
        RAISE EXCEPTION 'Shift kasir tidak aktif atau sudah ditutup';
    END IF;

    IF v_kasir_id IS NULL THEN
        v_kasir_id := v_shift_kasir_id;
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

        -- Jika produk dilacak stoknya (reservasi stok)
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

    -- Simpan transaksi dengan status 'menunggu_bayar'
    INSERT INTO public.transaksi (
        nomor_struk, cabang_id, shift_id, kasir_id, status,
        subtotal, diskon, alasan_diskon, total,
        metode_bayar, uang_diterima, kembalian, dibuat_pada, dibayar_pada
    ) VALUES (
        v_nomor_struk, v_cabang_id, p_shift_id, v_kasir_id, 'menunggu_bayar',
        v_subtotal, p_diskon, p_alasan_diskon, v_total,
        'qris', v_total, 0, now(), NULL
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

    RETURN jsonb_build_object(
        'transaksi_id', v_transaksi_id,
        'nomor_struk', v_nomor_struk,
        'cabang_id', v_cabang_id,
        'subtotal', v_subtotal,
        'diskon', p_diskon,
        'total', v_total
    );
END;
$$;

-- 3. RPC: LUNASKAN TRANSAKSI QRIS (STATUS MENJADI LUNAS & AKUMULASI TOTAL QRIS)
CREATE OR REPLACE FUNCTION public.lunaskan_transaksi_qris(
    p_transaksi_id UUID,
    p_mayar_invoice_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_trx RECORD;
BEGIN
    SELECT * INTO v_trx 
    FROM public.transaksi 
    WHERE id = p_transaksi_id
    FOR UPDATE;

    IF v_trx IS NULL THEN
        RAISE EXCEPTION 'Transaksi tidak ditemukan';
    END IF;

    -- Idempoten: Jika sudah lunas, langsung return
    IF v_trx.status = 'lunas' THEN
        RETURN jsonb_build_object(
            'status', 'already_paid',
            'transaksi_id', p_transaksi_id,
            'nomor_struk', v_trx.nomor_struk,
            'total', v_trx.total
        );
    END IF;

    IF v_trx.status != 'menunggu_bayar' THEN
        RAISE EXCEPTION 'Hanya transaksi berstatus menunggu_bayar yang dapat dilunaskan (Status saat ini: %)', v_trx.status;
    END IF;

    -- Update status transaksi menjadi lunas
    UPDATE public.transaksi
    SET status = 'lunas',
        dibayar_pada = now(),
        mayar_invoice_id = COALESCE(p_mayar_invoice_id, v_trx.mayar_invoice_id)
    WHERE id = p_transaksi_id;

    -- Akumulasikan ke shift kasir
    UPDATE public.shift_kasir
    SET total_qris = total_qris + v_trx.total
    WHERE id = v_trx.shift_id;

    RETURN jsonb_build_object(
        'status', 'success',
        'transaksi_id', p_transaksi_id,
        'nomor_struk', v_trx.nomor_struk,
        'subtotal', v_trx.subtotal,
        'diskon', v_trx.diskon,
        'total', v_trx.total
    );
END;
$$;

-- 4. RPC: BATALKAN TRANSAKSI QRIS & ROLLBACK STOK CABANG
CREATE OR REPLACE FUNCTION public.batalkan_transaksi_qris(
    p_transaksi_id UUID,
    p_alasan TEXT DEFAULT 'Dibatalkan oleh kasir'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_trx RECORD;
    v_item RECORD;
    v_pelaku_id UUID := auth.uid();
BEGIN
    SELECT * INTO v_trx 
    FROM public.transaksi 
    WHERE id = p_transaksi_id
    FOR UPDATE;

    IF v_trx IS NULL THEN
        RAISE EXCEPTION 'Transaksi tidak ditemukan';
    END IF;

    -- Idempoten: Jika sudah batal, langsung return
    IF v_trx.status = 'batal' THEN
        RETURN jsonb_build_object(
            'status', 'already_cancelled',
            'transaksi_id', p_transaksi_id
        );
    END IF;

    IF v_trx.status != 'menunggu_bayar' THEN
        RAISE EXCEPTION 'Hanya transaksi berstatus menunggu_bayar yang dapat dibatalkan (Status saat ini: %)', v_trx.status;
    END IF;

    -- Kembalikan stok cabang yang dilacak
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

    -- Update status transaksi menjadi batal
    UPDATE public.transaksi
    SET status = 'batal',
        alasan_void = p_alasan
    WHERE id = p_transaksi_id;

    -- Catat ke audit log
    IF v_pelaku_id IS NULL THEN
        v_pelaku_id := v_trx.kasir_id;
    END IF;

    INSERT INTO public.audit_log (
        pelaku_id, aksi, tabel, data_id, nilai_sebelum, nilai_sesudah
    ) VALUES (
        v_pelaku_id,
        'batal_transaksi_qris',
        'transaksi',
        p_transaksi_id,
        jsonb_build_object('status', 'menunggu_bayar', 'total', v_trx.total),
        jsonb_build_object('status', 'batal', 'alasan', p_alasan)
    );

    RETURN jsonb_build_object(
        'status', 'success',
        'transaksi_id', p_transaksi_id
    );
END;
$$;
