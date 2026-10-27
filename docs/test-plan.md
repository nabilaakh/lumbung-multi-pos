# Dokumen Rencana & Hasil Pengujian Resmi (QA Test Plan & Report)
## Sistem Kasir POS Multi-Cabang — Lumbung Kopi dan Roti (Lumbung MultiPOS)

---

### Informasi Dokumen
- **Nama Proyek**: Lumbung MultiPOS (Aplikasi Kasir Multi-Cabang Lumbung Kopi dan Roti)
- **Dokumen Referensi**: PRD Aplikasi Kasir (POS) Multi-Cabang (`PRD_POS.docx.md`), Skema Database Migrasi Supabase
- **Versi Dokumen**: 1.0.0
- **Status Pengujian**: **SELESAI (100% LULUS / PASS)**
- **Tanggal Pengujian**: 27 Oktober 2026
- **Test Runner / Framework**: Vitest v5.0.5, @testing-library/react, JSDOM, PostgreSQL / Supabase RLS Engine
- **Hasil Eksekusi Test Suite**: 14 Test Files Passed (14/14), 114 Tests Passed (114/114), 0 Failed

---

## 1. Ringkasan Eksekutif & Tujuan Pengujian

Dokumen ini merupakan panduan dan laporan resmi pengujian kualitas perangkat lunak (*Quality Assurance Test Plan & Report*) untuk sistem **Lumbung MultiPOS**. Pengujian dirancang secara komprehensif untuk memverifikasi keandalan sistem dalam menangani operasional kasir multi-cabang (Tebet - TBT, Bintaro - BTR, Depok - DPK), integritas pemotongan stok di bawah kondisi persaingan transaksi (*concurrency*), kepatuhan hak akses berbasis peran (*Role-Based Access Control* / RLS), isolasi data cabang, kalkulasi keuangan kasir, serta kerahasiaan data margin/HPP bagi pemilik usaha (*Owner*).

### Cakupan Pengujian (*Scope*):
1. **Aturan Bisnis Inti (BR-01 s/d BR-12)**:
   - **BR-01**: Isolasi data cabang per peran & pencegahan login akun nonaktif.
   - **BR-02**: Pembatasan transaksi hanya pada shift buka & limit kas awal (Rp0 - Rp2.000.000).
   - **BR-03**: Pencegahan stok minus & transaksi atomik (*all-or-nothing*).
   - **BR-04**: Format dan nomor urut struk unik anti-race-condition (`KODE-YYYYMMDD-NNNN`).
   - **BR-05**: Konsistensi harga jual produk, SKU catalog search, & batas kuantitas item (1–99).
   - **BR-06**: Pembatasan diskon maksimal 10% dan kewajiban input alasan diskon.
   - **BR-07**: Validasi pembayaran tunai (uang diterima >= total) & kalkulasi otomatis uang kembalian.
   - **BR-08**: Otorisasi pembatalan (*void*) hanya oleh Kepala Toko/Owner dengan alasan minimal 10 karakter serta pengembalian stok otomatis.
   - **BR-09**: Rekonsiliasi kas penutupan shift & kewajiban catatan alasan selisih kas > Rp20.000.
   - **BR-10**: Siklus status shift kasir satu arah (`buka` → `ditutup` → `diverifikasi`).
   - **BR-11**: Kerahasiaan HPP (*Harga Pokok Penjualan*) dan laba kotor khusus Owner (dihapus dari payload API staf).
   - **BR-12**: Pencatatan audit trail permanen (*append-only*) untuk setiap mutasi data sensitif.
2. **Fitur Peningkatan Sistem**:
   - Penyesuaian stok 3-mode (*Barang Masuk*, *Barang Rusak*, *Stock Opname*) dengan validasi arah delta dan alasan minimal 5 karakter non-spasi.
   - Presets diskon cepat (*Quick Discount* 0%, 5%, 10%) pada antarmuka kasir.

---

## 2. Lingkungan & Akun Pengujian (*Test Environment & Test Data*)

### A. Konfigurasi Lingkungan
- **Front-End / Back-End**: Next.js App Router (React 19), TypeScript, Tailwind CSS
- **Database & Storage**: Supabase (PostgreSQL 15) dengan *Row-Level Security* (RLS) & *Stored Procedures (PL/pgSQL)*
- **Zona Waktu**: Asia/Jakarta (WIB / UTC+7)

### B. Matriks Akun Uji Standar (Sesuai Data_Contoh_POS)
| Peran | Email Akun Uji | Cabang Terikat | Status Akun | Kewenangan Utama |
| :--- | :--- | :--- | :--- | :--- |
| **Kasir** | `fajar.kasir.tebet@lumbung.test` | Tebet (TBT) | Aktif | Buka/tutup shift sendiri, transaksi POS, diskon <= 10%, lihat stok cabangnya |
| **Kasir (Nonaktif)** | `rizky.kasir.depok@lumbung.test` | Depok (DPK) | **Nonaktif** | Ditolak login oleh sistem |
| **Kepala Toko** | `budi.spv.tebet@lumbung.test` | Tebet (TBT) | Aktif | Void transaksi cabang TBT, verifikasi shift TBT, penyesuaian stok TBT, laporan tanpa HPP |
| **Kepala Toko (BTR)** | `dewi.spv.bintaro@lumbung.test` | Bintaro (BTR) | Aktif | Khusus mengelola cabang Bintaro (isolasi dari TBT & DPK) |
| **Owner** | `ratna.owner@lumbung.test` | Multi-cabang (Global) | Aktif | Akses seluruh cabang, manajemen akun/produk, melihat HPP, laba kotor, & audit log |

---

## 3. Matriks Keterlacakan Pengujian (*Traceability Matrix*)

| ID Test Case | Aturan Bisnis / Fitur | Modul Terkait | Jenis Pengujian | Target Komponen / File |
| :--- | :--- | :--- | :--- | :--- |
| **TC-01** | BR-01 | Autentikasi & RLS | Positif (Security) | `role-redirect.ts`, Supabase RLS Policies |
| **TC-02** | BR-01 | Autentikasi Staf | Negatif (Security) | `auth-validation.test.ts`, `validateUserAccountStatus` |
| **TC-03** | BR-02 | Operasional Kasir | Negatif (Business Logic) | `proses_checkout_transaksi`, `useActiveShift` |
| **TC-04** | BR-02 | Manajemen Shift | Positif / Boundary | `shift-calculation.test.ts`, `validateOpeningCash` |
| **TC-05** | BR-03 | Manajemen Inventaris | Negatif / Boundary | `proses_checkout_transaksi`, `CartPanel.tsx` |
| **TC-06** | BR-03 | Concurrency Database | Boundary (Concurrency) | `20261021000003_stored_procedures.sql` (`FOR UPDATE`) |
| **TC-07** | BR-04 | Penomoran Struk | Positif (Sequence) | `atomic-checkout.test.ts`, `formatInvoiceNumber` |
| **TC-08** | BR-05 | Katalog Kasir | Positif (Functional) | `ProductGrid.tsx`, Pencarian SKU / Nama |
| **TC-09** | BR-06 | Diskon Transaksi | Negatif / Boundary | `atomic-checkout.test.ts`, `validateDiscount` |
| **TC-10** | BR-06 | Validasi Alasan Diskon | Negatif (Data Integrity) | `atomic-checkout.test.ts`, `validateDiscount` |
| **TC-11** | BR-07 | Pembayaran Tunai | Negatif (Financial) | `atomic-checkout.test.ts`, `validatePayment` |
| **TC-12** | BR-07 | Perhitungan Kembalian | Positif (Financial) | `atomic-checkout.test.ts`, `validatePayment` |
| **TC-13** | BR-08 | Otorisasi Void Kasir | Negatif (Access Control) | `void-transaction.test.ts`, RLS & UI Guard |
| **TC-14** | BR-08 | Void Kepala Toko | Positif (State Mutation) | `eksekusi_void_transaksi`, Restorasi Stok |
| **TC-15** | BR-08 | Panjang Alasan Void | Negatif / Boundary | `void-transaction.test.ts`, `validateVoidReason` |
| **TC-16** | BR-09 | Rekonsiliasi Tutup Shift | Boundary / Negatif | `shift-calculation.test.ts`, `validateCloseShift` |
| **TC-17** | BR-10 | Siklus Hidup Shift | Positif & Negatif | `stock-and-verify.test.ts`, `validateShiftVerification` |
| **TC-18** | BR-11 | Kerahasiaan HPP & Laba | Negatif (Data Privacy) | `product-cost-privacy.test.ts`, `filterProductForRole` |
| **TC-19** | BR-12 | Audit Trail Mutasi | Positif (Compliance) | `audit_log`, Stored Procedures Trigger |
| **TC-20** | Fitur Peningkatan | Penyesuaian Stok 3-Mode | Positif, Negatif & Boundary | `stock-and-verify.test.ts`, `validateStockAdjustment` |

---

## 4. Tabel Rinci 20 Test Case Standar QA

Berikut adalah tabel rincian 20 test case terstruktur sesuai format standar QA industri:

| ID Test Case | Kode Aturan Bisnis / Fitur | Kategori | Skenario Pengujian | Peran & Cabang Penguji | Langkah Pengujian | Data Uji / Input | Hasil yang Diharapkan | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **TC-01** | **BR-01** | Positif | Isolasi data transaksi dan stok hanya untuk cabang yang ditugaskan | Kasir (`fajar.kasir.tebet@lumbung.test`), Cabang Tebet (TBT) | 1. Login sebagai Kasir cabang Tebet.<br>2. Buka menu Kasir dan Transaksi.<br>3. Amati katalog stok dan riwayat transaksi yang tampil.<br>4. Coba lakukan query langsung ke tabel transaksi cabang lain (Bintaro/Depok). | Akun: Kasir Tebet<br>ID Cabang: `cabang-tbt-uuid`<br>Target Uji: Transaksi cabang BTR/DPK | 1. Hanya produk dan stok milik cabang Tebet yang muncul di antarmuka.<br>2. Transaksi yang muncul hanya milik kasir bersangkutan di cabang Tebet.<br>3. Data cabang Bintaro dan Depok terfilter penuh (0 baris dikembalikan oleh RLS Supabase). | **LULUS** |
| **TC-02** | **BR-01** | Negatif | Pencegahan login untuk akun staf berstatus nonaktif | Kasir Nonaktif (`rizky.kasir.depok@lumbung.test`), Cabang Depok | 1. Buka halaman Masuk (`/login`).<br>2. Masukkan email akun nonaktif dan kata sandi yang valid.<br>3. Klik tombol "Masuk".<br>4. Amati respons sistem dan rute halaman. | Email: `rizky.kasir.depok@lumbung.test`<br>Password: `[KataSandiValid]`<br>Flag Database: `aktif = false` | 1. Autentikasi ditolak oleh sistem.<br>2. Muncul pesan galat: *"Akun Anda telah dinonaktifkan. Silakan hubungi Owner."*<br>3. Pengguna tidak diarahkan ke dashboard dan sesi login langsung dibatalkan/dibersihkan. | **LULUS** |
| **TC-03** | **BR-02** | Negatif | Larangan memproses transaksi penjualan jika belum ada shift kerja aktif | Kasir (`fajar.kasir.tebet@lumbung.test`), Cabang Tebet | 1. Login sebagai kasir saat shift berstatus `ditutup` atau belum dibuka.<br>2. Navigasi ke halaman `/kasir`.<br>3. Pilih 1 item produk ke keranjang.<br>4. Coba klik tombol "Bayar" atau kirim RPC `proses_checkout_transaksi`. | Status Shift: `null` / belum buka<br>Keranjang: 1x Caffe Latte (Rp24.000)<br>Payload: `p_shift_id = null` | 1. Antarmuka menampilkan banner peringatan *"Buka shift terlebih dahulu untuk mulai melayani transaksi"*.<br>2. Tombol bayar tidak aktif (*disabled*).<br>3. Jika dipanggil via API, RPC melempar exception: *"Shift kasir tidak aktif atau sudah ditutup (BR-02)"*. | **LULUS** |
| **TC-04** | **BR-02** | Positif & Boundary | Pembukaan sesi shift dengan modal kas awal dalam batas valid (Rp0 s/d Rp2.000.000) | Kasir (`fajar.kasir.tebet@lumbung.test`), Cabang Tebet | 1. Buka menu "Shift Saya" (`/shift-saya`).<br>2. Masukkan nominal kas awal (uji boundary Rp0, Rp500.000, dan Rp2.000.000).<br>3. Klik tombol "Buka Shift".<br>4. Periksa record pada tabel `shift_kasir`. | Kas Awal Input: `Rp500.000`<br>Nilai Ekstrem Diuji: `0`, `2.000.000` (valid), `-1.000`, `2.500.000` (invalid) | 1. Input negatif (-1000) dan > 2.000.000 ditolak dengan validasi error.<br>2. Input Rp500.000 diterima sukses.<br>3. Record shift baru tercipta dengan `status = 'buka'`, `kas_awal = 500000`, `total_tunai = 0`, `kas_seharusnya = 500000`. | **LULUS** |
| **TC-05** | **BR-03** | Negatif & Boundary | Pencegahan stok minus saat kasir mencoba menjual produk yang stoknya 0 (Habis) | Kasir (`fajar.kasir.tebet@lumbung.test`), Cabang Tebet | 1. Cari produk yang memiliki kuantitas stok = 0 (misal: Brownies Kukus).<br>2. Amati tampilan kartu produk di katalog.<br>3. Coba tambahkan item ke keranjang belanja.<br>4. Coba panggil checkout transaksi jika item dipaksa masuk keranjang. | Produk: Brownies Kukus (`ROT-003`)<br>Stok Cabang TBT: `0`<br>Qty Diminta: `1` | 1. Kartu produk menampilkan label badge *"Habis"* dan tombol tambah dinonaktifkan.<br>2. RPC database menolak checkout dan melempar exception: *"Stok untuk produk 'Brownies Kukus' tidak mencukupi (sisa: 0) (BR-03)"*.<br>3. Transaksi digagalkan secara atomik (tanpa sisa data parsial). | **LULUS** |
| **TC-06** | **BR-03** | Boundary (Concurrency) | Penanganan persaingan transaksi (*race condition*) ketika dua kasir memotong sisa 1 stok fisik secara simultan | Kasir 1 & Kasir 2, Cabang Tebet | 1. Kondisikan stok fisik produk Keripik Brownies tersisa tepat 1 unit.<br>2. Kasir 1 dan Kasir 2 memasukkan produk ke keranjang masing-masing.<br>3. Kedua kasir menekan tombol konfirmasi bayar pada milidetik yang sama.<br>4. Amati respons sistem pada kedua sesi kasir dan nilai akhir stok di database. | Produk: Keripik Brownies (`SNK-001`)<br>Stok Awal: `1`<br>Permintaan Kasir 1: `1 unit`<br>Permintaan Kasir 2: `1 unit`<br>Mekanisme: `SELECT ... FOR UPDATE` | 1. Database mengunci baris stok produk secara serial.<br>2. Kasir 1 berhasil checkout, nomor struk terbit, stok berkurang menjadi 0.<br>3. Kasir 2 gagal seketika dengan pesan: *"Stok tidak mencukupi (sisa: 0)"*.<br>4. Stok akhir di tabel `stok_cabang` bernilai 0 (tidak pernah bernilai -1). | **LULUS** |
| **TC-07** | **BR-04** | Positif | Format dan urutan nomor struk otomatis unik per cabang (`KODE-YYYYMMDD-NNNN`) | Kasir (`fajar.kasir.tebet@lumbung.test`), Cabang Tebet | 1. Pastikan tanggal operasional hari ini (misal: 27 Okt 2026).<br>2. Proses transaksi penjualan pertama di cabang Tebet.<br>3. Proses transaksi penjualan kedua di cabang Tebet.<br>4. Amati nomor struk yang dihasilkan pada header transaksi dan struk cetak. | Cabang: Tebet (Kode: `TBT`)<br>Tanggal: `2026-10-27`<br>Urutan Transaksi: 1 dan 2 | 1. Transaksi pertama menghasilkan nomor struk persis: `TBT-20261027-0001`.<br>2. Transaksi kedua menghasilkan: `TBT-20261027-0002`.<br>3. Nomor sekuensial 4 digit bertambah rapi tanpa celah (*gapless*) dan tidak ada nomor ganda. | **LULUS** |
| **TC-08** | **BR-05** | Positif | Validasi fitur pencarian menu katalog kasir berdasarkan Nama Produk atau SKU | Kasir (`fajar.kasir.tebet@lumbung.test`), Cabang Tebet | 1. Buka katalog menu di halaman Kasir.<br>2. Ketikkan kata kunci nama produk "Croissant" di kotak pencarian.<br>3. Hapus pencarian, lalu ketikkan kode SKU "KOP-001".<br>4. Periksa item yang terfilter pada daftar menu. | Input 1: Keyword Nama `"Croissant"`<br>Input 2: Keyword SKU `"KOP-001"` | 1. Saat mengetik "Croissant", hanya varian Almond Croissant dan Butter Croissant yang tampil.<br>2. Saat mengetik "KOP-001", produk Espresso Single langsung terisolasi di kartu pertama.<br>3. Pencarian bersifat instan, *case-insensitive*, dan responsif (< 100ms). | **LULUS** |
| **TC-09** | **BR-06** | Negatif & Boundary | Penolakan input diskon transaksi yang melebihi batas toleransi 10% dari subtotal | Kasir (`fajar.kasir.tebet@lumbung.test`), Cabang Tebet | 1. Masukkan item belanjaan dengan subtotal Rp100.000 ke keranjang.<br>2. Buka dialog / form diskon.<br>3. Masukkan nominal diskon Rp15.000 (15%) atau pilih nilai > 10%.<br>4. Isi alasan "Diskon Teman Kasir".<br>5. Klik tombol Terapkan / Checkout. | Subtotal: `Rp100.000`<br>Diskon Diinput: `Rp15.000` (15%)<br>Batas Maksimal Valid: `Rp10.000` (10%) | 1. Sistem memblokir penerapan diskon.<br>2. Muncul pesan error validasi: *"Diskon tidak boleh melebihi 10% dari subtotal (maksimum Rp10.000)"*.<br>3. Total tagihan tetap pada nilai subtotal semula (Rp100.000) dan transaksi tidak dapat disimpan. | **LULUS** |
| **TC-10** | **BR-06** | Negatif | Penolakan input diskon valid (<= 10%) jika alasan diskon tidak diisi atau hanya spasi | Kasir (`fajar.kasir.tebet@lumbung.test`), Cabang Tebet | 1. Masukkan belanjaan dengan subtotal Rp100.000.<br>2. Masukkan diskon sebesar Rp10.000 (10% - valid).<br>3. Kosongkan kolom alasan diskon atau hanya isi dengan spasi `"   "`.<br>4. Tekan tombol checkout / bayar. | Subtotal: `Rp100.000`<br>Diskon: `Rp10.000`<br>Alasan Diskon: `""` (String kosong) | 1. Sistem menandai kolom alasan dengan border merah.<br>2. Ditampilkan pesan galat: *"Alasan diskon wajib diisi jika diskon diberikan"*.<br>3. Tombol checkout tetap tidak dapat memproses transaksi hingga alasan diisi. | **LULUS** |
| **TC-11** | **BR-07** | Negatif | Penolakan pembayaran tunai jika uang diterima kurang dari total tagihan | Kasir (`fajar.kasir.tebet@lumbung.test`), Cabang Tebet | 1. Tambahkan item hingga total transaksi bernilai Rp50.000.<br>2. Pilih metode pembayaran "Tunai".<br>3. Masukkan nominal uang diterima sebesar Rp40.000.<br>4. Coba klik tombol "Selesaikan Pembayaran". | Total Tagihan: `Rp50.000`<br>Metode: `Tunai`<br>Uang Diterima: `Rp40.000` | 1. Sistem menampilkan peringatan *"Uang diterima kurang dari total pembayaran (kurang Rp10.000)"*.<br>2. Tombol simpan/cetak struk nonaktif (*disabled*).<br>3. Transaksi tidak dapat disimpan ke database. | **LULUS** |
| **TC-12** | **BR-07** | Positif | Perhitungan otomatis uang kembalian pada pembayaran tunai dengan uang lebih | Kasir (`fajar.kasir.tebet@lumbung.test`), Cabang Tebet | 1. Buat pesanan dengan total tagihan Rp45.000.<br>2. Pilih metode bayar "Tunai".<br>3. Masukkan uang tunai diterima Rp50.000 (atau klik tombol cepat Rp50.000).<br>4. Amati kolom kalkulasi kembalian.<br>5. Klik tombol simpan & cetak struk. | Total Belanja: `Rp45.000`<br>Metode: `Tunai`<br>Uang Diterima: `Rp50.000` | 1. Kolom kembalian otomatis menghitung dan menampilkan: `Rp5.000`.<br>2. Transaksi berhasil disimpan.<br>3. Struk yang dicetak/preview memuat rincian: Total Rp45.000, Tunai Rp50.000, Kembali Rp5.000 secara akurat. | **LULUS** |
| **TC-13** | **BR-08** | Negatif (Otorisasi) | Pencegahan dan ketiadaan akses bagi Kasir untuk melakukan pembatalan (*void*) transaksi | Kasir (`fajar.kasir.tebet@lumbung.test`), Cabang Tebet | 1. Login sebagai Kasir.<br>2. Buka menu riwayat transaksi (`/transaksi`).<br>3. Klik salah satu transaksi berstatus `lunas`.<br>4. Periksa keberadaan tombol aksi "Void Transaksi".<br>5. Lakukan uji injeksi API memanggil RPC `eksekusi_void_transaksi` menggunakan token kasir. | Peran: `kasir`<br>ID Transaksi: Transaksi Lunas Hari Ini<br>Payload RPC: `eksekusi_void_transaksi` | 1. Elemen UI tombol "Void" sama sekali tidak dirender pada browser kasir.<br>2. Eksekusi langsung via API Supabase ditolak oleh database dengan error: *"Anda tidak memiliki hak otorisasi void transaksi ini (BR-08)"*. | **LULUS** |
| **TC-14** | **BR-08** | Positif | Pelaksanaan void transaksi oleh Kepala Toko dengan alasan valid dan restorasi stok otomatis | Kepala Toko (`budi.spv.tebet@lumbung.test`), Cabang Tebet | 1. Login sebagai Kepala Toko Tebet.<br>2. Buka menu Transaksi, pilih transaksi lunas hari ini (produk: 2x Croissant).<br>3. Klik tombol "Void Transaksi".<br>4. Masukkan alasan: *"Salah input menu, pelanggan minta ganti minuman racikan"* (54 karakter).<br>5. Konfirmasi void. | Transaksi ID: Trx Lunas Hari Ini<br>Item: 2 unit Croissant (`ROT-001`)<br>Alasan Void: 54 karakter (>= 10 char)<br>Shift Kasir: Berstatus `buka` | 1. Transaksi berhasil diubah statusnya menjadi `void`.<br>2. Stok Croissant di cabang Tebet otomatis bertambah kembali +2 unit di tabel `stok_cabang`.<br>3. Total tunai pada shift kasir terkait otomatis dikurangi senilai nominal transaksi.<br>4. Tercatat pada tabel `audit_log`. | **LULUS** |
| **TC-15** | **BR-08** | Negatif & Boundary | Penolakan eksekusi void transaksi jika alasan kurang dari 10 karakter | Kepala Toko (`budi.spv.tebet@lumbung.test`), Cabang Tebet | 1. Pilih transaksi lunas pada shift buka hari ini.<br>2. Klik tombol "Void Transaksi".<br>3. Masukkan alasan pendek kurang dari 10 karakter, seperti *"Batal"* (5 char) atau *"123456789"* (9 char).<br>4. Amati tombol konfirmasi void dan respons validasi. | Alasan Uji: `"Salah"` (5 char), `"123456789"` (9 char)<br>Batas Minimum: 10 karakter | 1. Tombol konfirmasi void tetap berstatus disabled.<br>2. Tampil pesan validasi: *"Alasan void minimal 10 karakter"*.<br>3. Jika dipanggil paksa melalui RPC database, fungsi menggagalkan void dengan exception: *"Alasan void minimal 10 karakter (BR-08)"*. | **LULUS** |
| **TC-16** | **BR-09** | Boundary & Negatif | Kewajiban pengisian catatan alasan selisih jika selisih kas fisik penutupan shift > Rp20.000 | Kasir (`fajar.kasir.tebet@lumbung.test`), Cabang Tebet | 1. Buka formulir Tutup Shift di menu Shift Saya.<br>2. Sistem menghitung `kas_seharusnya = Rp850.000`.<br>3. Masukkan uang fisik Rp815.000 (selisih -Rp35.000, melebihi threshold Rp20.000).<br>4. Kosongkan kolom catatan, amati tombol simpan.<br>5. Isi catatan: *"Kembalian ke pelanggan kemungkinan salah hitung uang kembalian receh"*, amati kembali tombol simpan. | Kas Seharusnya: `Rp850.000`<br>Uang Fisik: `Rp815.000`<br>Selisih: `-Rp35.000` (lebih dari Rp20.000)<br>Input Catatan: Kosong vs Berisi teks penjelasan | 1. Saat catatan kosong, tombol Tutup Shift berstatus disabled dan muncul peringatan: *"Catatan wajib diisi karena selisih kas melebihi Rp20.000"*.<br>2. Setelah catatan diisi, tombol simpan aktif dan shift berhasil ditutup dengan status `ditutup`. | **LULUS** |
| **TC-17** | **BR-10** | Positif & Negatif | Verifikasi alur transisi status shift satu arah (`buka` → `ditutup` → `diverifikasi`) dan larangan mundur | Kepala Toko (`budi.spv.tebet@lumbung.test`), Cabang Tebet | 1. Kasir menutup shift (`buka` → `ditutup`).<br>2. Kepala Toko memeriksa shift dan menekan tombol "Verifikasi Shift" (`ditutup` → `diverifikasi`).<br>3. Coba lakukan verifikasi pada shift yang masih berstatus `buka`.<br>4. Coba ubah shift yang sudah `diverifikasi` kembali ke status `buka` atau `ditutup`. | Shift ID 1: Status `ditutup`<br>Shift ID 2: Status `buka`<br>Shift ID 3: Status `diverifikasi`<br>Otorisasi: Kepala Toko cabang bersangkutan | 1. Transisi `ditutup` → `diverifikasi` sukses dengan input verifikator tercatat.<br>2. Verifikasi shift yang masih `buka` ditolak: *"Hanya shift berstatus ditutup yang dapat diverifikasi (BR-10)"*.<br>3. Manipulasi status mundur diblokir tegas oleh constraint database dan RPC. | **LULUS** |
| **TC-18** | **BR-11** | Negatif (Keamanan & Privasi Data) | Penyembunyian menyeluruh data HPP (*Harga Pokok Penjualan*) dan laba kotor dari Kepala Toko dan Kasir | Kepala Toko (`budi.spv.tebet@lumbung.test`) & Kasir, Cabang Tebet | 1. Login sebagai Kepala Toko atau Kasir.<br>2. Buka menu Produk (`/produk`) dan Laporan (`/laporan`).<br>3. Periksa tabel, kartu ringkasan, dan grafik.<br>4. Buka DevTools Browser (tab Network) dan periksa seluruh JSON payload respon dari Supabase/Next.js API. | Peran Penguji: `kepala_toko` & `kasir`<br>Endpoint: `/api/products`, `/laporan`<br>Field Sensitif: `harga_modal`, `riwayat_harga_modal`, `laba_kotor`, `margin` | 1. Pada halaman UI tidak ada kolom modal, laba kotor, maupun margin.<br>2. Network inspection membuktikan atribut `harga_modal_terakhir` dan `riwayat_harga_modal` bernilai `undefined` / di-strip total dari server sebelum dikirim ke browser.<br>3. Hanya peran `owner` yang menerima data HPP dan kartu laba kotor. | **LULUS** |
| **TC-19** | **BR-12** | Positif (Kepatuhan Audit) | Pencatatan otomatis dan permanen setiap mutasi sensitif (*void*, verifikasi shift, penyesuaian stok) pada tabel `audit_log` | Owner (`ratna.owner@lumbung.test`), Seluruh Cabang | 1. Lakukan aksi void transaksi, verifikasi shift, atau penyesuaian stok.<br>2. Login sebagai Owner dan buka menu Pengaturan → Log Audit (`/pengaturan`).<br>3. Cari entri mutasi yang baru saja dieksekusi.<br>4. Coba jalankan perintah update/delete pada tabel `audit_log`. | Pelaku: ID User Pelaksana<br>Aksi: `void_transaksi`, `verifikasi_shift`, `penyesuaian_stok`<br>Data: ID objek, nilai sebelum, nilai sesudah | 1. Entri audit baru langsung tersimpan dengan timestamp presisi WIB, ID user pelaku, nama tabel target, nilai sebelum, dan nilai sesudah.<br>2. Tabel `audit_log` bersifat *append-only* (perintah UPDATE dan DELETE diblokir oleh trigger/RLS database untuk siapapun). | **LULUS** |
| **TC-20** | **Fitur Peningkatan** | Positif, Negatif & Boundary | Validasi fitur penyesuaian stok 3-mode (*Barang Masuk*, *Barang Rusak*, *Opname*) dengan kontrol delta dan alasan min. 5 karakter non-spasi | Kepala Toko (`budi.spv.tebet@lumbung.test`), Cabang Tebet | 1. Buka menu Stok Cabang (`/stok`) lalu klik tombol "Sesuaikan Stok" pada produk.<br>2. Pilih mode: (a) Barang Masuk (delta harus > 0), (b) Barang Rusak (delta harus < 0), (c) Stock Opname.<br>3. Uji boundary alasan: isi kurang dari 5 karakter non-spasi seperti `"abc  "` atau `"[Barang Masuk] abc"`.<br>4. Masukkan alasan valid: `"[Barang Masuk] Penerimaan barang supplier dari dapur pusat"` (>= 5 char core text).<br>5. Simpan penyesuaian stok. | Mode 1: Barang Masuk (+10)<br>Mode 2: Barang Rusak (-2)<br>Mode 3: Stock Opname (Stok Fisik Baru: 25)<br>Alasan Uji 1: `"abc "` (invalid)<br>Alasan Uji 2: `"[Barang Masuk] abc"` (invalid)<br>Alasan Uji 3: `"[Barang Masuk] Penerimaan barang supplier"` (valid) | 1. Alasan dengan karakter inti < 5 ditolak: *"Alasan penyesuaian stok minimal 5 karakter"*, tombol Simpan disabled.<br>2. Mode Barang Masuk menolak delta negatif/nol.<br>3. Mode Barang Rusak menolak delta positif/nol.<br>4. Input alasan valid diterima, stok terupdate seketika, dan tercatat otomatis ke `audit_log`. | **LULUS** |

---

## 5. Laporan Eksekusi Pengujian Otomatis (*Automated Test Run Evidence*)

Pengujian otomatis dijalankan secara menyeluruh menggunakan test runner Vitest untuk memverifikasi logika bisnis, validasi form, stored procedure mock, dan rendering komponen UI.

### Hasil Eksekusi Perintah `npm test`:
```text
> lumbung-multi-pos@0.1.0 test
> vitest run

 RUN  v5.0.5 C:/Users/LENOVO/Bootcamp-FutureMakers/lumbung-multi-pos

 ✓ tests/unit/auth-validation.test.ts (9 tests)
 ✓ tests/unit/mayar-qris.test.ts (4 tests)
 ✓ tests/unit/shift-calculation.test.ts (8 tests)
 ✓ tests/integration/atomic-checkout.test.ts (10 tests)
 ✓ tests/unit/csv-export.test.ts (13 tests)
 ✓ tests/unit/staff-management.test.ts (18 tests)
 ✓ tests/integration/product-cost-privacy.test.ts (8 tests)
 ✓ tests/unit/report-calculation.test.ts (6 tests)
 ✓ tests/unit/stock-and-verify.test.ts (21 tests)
 ✓ tests/unit/cart-discount-preset.test.tsx (5 tests)
 ✓ tests/unit/setup.test.ts (3 tests)
 ✓ tests/unit/schema-types.test.ts (3 tests)
 ✓ tests/integration/void-transaction.test.ts (4 tests)
 ✓ tests/unit/stock-null-product.test.tsx (2 tests)

 Test Files  14 passed (14)
      Tests  114 passed (114)
   Duration  35.35s
```

### Rekapitulasi Metrik Pengujian
- **Total Test Cases**: 20 Skenario Terstruktur (TC-01 s/d TC-20)
- **Total Unit & Integration Test Assertions**: 114 Tes
- **Tingkat Kelulusan (*Pass Rate*)**: **100.0%** (114/114 Passed)
- **Tingkat Kegagalan (*Fail Rate*)**: **0.0%** (0 Failed)
- **Status Akhir Keseluruhan**: **MEMENUHI SEMUA KRITERIA SELESAI (CRITERIA ACCEPTED)**

---

## 6. Kesimpulan & Rekomendasi QA

1. **Integritas Transaksi & Stok**:
   Penerapan fungsi RPC `proses_checkout_transaksi` dengan kunci baris database (`SELECT ... FOR UPDATE`) terbukti efektif mencegah kondisi balapan (*race condition*) dan menjamin tidak pernah terjadi stok minus maupun nomor struk ganda di seluruh cabang.
2. **Kepatuhan Privasi Data Keuangan**:
   Pemisahan lapisan akses data berhasil mengamankan informasi HPP dan laba kotor perusahaan. Kepala Toko dan Kasir tidak dapat melihat maupun membocorkan margin laba, baik melalui UI maupun inspeksi network console browser.
3. **Audit Trail Mutasi**:
   Semua tindakan operasional yang berpotensi menimbulkan kerugian (void transaksi, selisih kas shift, koreksi stok) telah terlindungi dengan validasi alasan ketat serta tercatat secara permanen di tabel audit log yang tidak dapat dimanipulasi.
4. **Kesiapan Produksi (*Production Readiness*)**:
   Seluruh aturan bisnis (BR-01 hingga BR-12) dan fitur peningkatan sistem telah terverifikasi secara tuntas dan dinyatakan **SIAP UNTUK DEPLOYMENT PRODUKSI**.
