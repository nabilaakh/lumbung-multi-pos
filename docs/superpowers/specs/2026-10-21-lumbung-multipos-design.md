# Lumbung MultiPOS — Spesifikasi Desain & Rencana Arsitektur

**Tanggal**: 2026-10-21  
**Status**: Disetujui (Approved)  
**Referensi**: [PRD_POS.docx.md](file:///c:/Users/LENOVO/Bootcamp-FutureMakers/lumbung-multi-pos/PRD_POS.docx.md)

---

## 1. Ringkasan Eksekutif & Tujuan

Lumbung MultiPOS adalah sistem kasir (Point of Sale) multi-cabang berbasis web yang dirancang untuk **Lumbung Kopi dan Roti** (3 cabang: Tebet `TBT`, Bintaro `BTR`, dan Depok `DPK`). Sistem ini menggantikan mesin kasir terpisah dan pencatatan stok manual di buku, mengatasi:
1. Penjualan ganda atas stok terakhir (race condition).
2. Duplikasi dan kelalaian nomor struk.
3. Selisih kas laci tanpa akuntabilitas shift.
4. Pembatalan (*void*) liar tanpa otorisasi.
5. Kebocoran harga modal dan ketidaktahuan laba harian per cabang.

---

## 2. Arsitektur Sistem & Tumpukan Teknologi (Tech Stack)

### 2.1 Komponen Sistem
- **Frontend & Framework**: Next.js (App Router, React, TypeScript, Tailwind CSS v3.4) & **shadcn/ui** (preset: `b1tgXpkWI`, base: `radix`, template: `next`).
  - Desain antarmuka responsif optimal untuk tablet 10" (resolusi $\ge 1024$px) serta desktop.
  - Performa cepat (< 2 detik waktu muat halaman, < 1 detik penyimpanan transaksi pada koneksi normal).
  - Cetak Struk: Integrasi thermal printer 58mm via browser print API dan ekspor format PDF.
- **Backend & Database (BaaS)**: Supabase (PostgreSQL 15+).
  - **Supabase Auth & SSR**: Menggunakan `@supabase/ssr` untuk autentikasi yang aman di Server Components, Middleware, dan Client Components.
  - **Row Level Security (RLS)**: Penegakan isolasi ketat data cabang dan restriksi peran langsung di basis data.
  - **Integritas Data & Concurrency**: Stored Procedures / RPC PostgreSQL untuk eksekusi transaksi atomik (*checkout* pesanan & pemotongan stok), penomoran struk sekuensial tahan balapan (*race condition*), serta eksekusi *void*.
  - **Security Definer Views / RPC**: Menjaga kerahasiaan `cost_price` dan laba dari akun non-Owner (data laba/modal tidak dikirim ke browser Kepala Toko/Kasir).
- **Hosting & Lingkungan**:
  - **Netlify**: Deployment Next.js (Netlify Next.js Runtime).
  - Pengaturan keamanan internal: Header `X-Robots-Tag: noindex, nofollow` dan `robots.txt` disetel tertutup (aplikasi internal).
  - Lingkungan variabel aman (kunci `service_role` dan kredensial sensitif hanya berada di server/Netlify environment).

---

## 3. Skema Basis Data & Keamanan

### 3.1 Entitas Data Utama
1. `branches`
   - `id` (UUID, PK), `code` (VARCHAR(3), UNIQUE: 'TBT', 'BTR', 'DPK'), `name`, `address`, `created_at`.
2. `profiles`
   - `id` (UUID, PK, references `auth.users`), `name`, `email`, `role` (ENUM: `'kasir'`, `'kepala_toko'`, `'owner'`), `branch_id` (FK `branches.id`, nullable for Owner), `is_active` (BOOLEAN, default true).
3. `products`
   - `id` (UUID, PK), `sku` (VARCHAR, UNIQUE), `name`, `category` (ENUM: `'minuman_racikan'`, `'roti_kue'`, `'kemasan'`), `selling_price` (NUMERIC), `is_stock_tracked` (BOOLEAN), `is_active` (BOOLEAN, default true).
4. `cost_price_history` *(Rahasia, RLS ketat Owner only)*
   - `id` (UUID, PK), `product_id` (FK `products.id`), `cost_price` (NUMERIC), `effective_from` (TIMESTAMPTZ, no retroactive change).
5. `branch_stock`
   - `id` (UUID, PK), `branch_id` (FK), `product_id` (FK), `quantity` (INT, CHECK $\ge 0$), `minimum_stock` (INT, default 5).
6. `cashier_shifts`
   - `id` (UUID, PK), `branch_id` (FK), `cashier_id` (FK `profiles.id`), `status` (ENUM: `'buka'`, `'ditutup'`, `'diverifikasi'`), `opening_cash` (NUMERIC, 0 - 2.000.000), `total_cash_sales` (NUMERIC, default 0), `total_qris_sales` (NUMERIC, default 0), `expected_cash` (NUMERIC, default 0), `actual_cash` (NUMERIC, nullable), `cash_difference` (NUMERIC, nullable), `notes` (TEXT, nullable), `opened_at` (TIMESTAMPTZ), `closed_at` (TIMESTAMPTZ), `verified_by` (FK `profiles.id`), `verified_at` (TIMESTAMPTZ).
7. `daily_invoice_counters`
   - `branch_id` (FK), `date` (DATE), `last_sequence` (INT, default 0), PRIMARY KEY (`branch_id`, `date`).
8. `transactions`
   - `id` (UUID, PK), `invoice_number` (VARCHAR, UNIQUE, format `KODE-YYYYMMDD-NNNN`), `branch_id` (FK), `shift_id` (FK `cashier_shifts.id`), `cashier_id` (FK `profiles.id`), `status` (ENUM: `'lunas'`, `'void'`, `'menunggu_bayar'`, `'batal'`), `subtotal` (NUMERIC), `discount_amount` (NUMERIC, default 0), `discount_reason` (TEXT, nullable), `total_amount` (NUMERIC), `payment_method` (ENUM: `'tunai'`, `'qris_manual'`, `'qris_mayar'`), `cash_tendered` (NUMERIC, nullable), `change_returned` (NUMERIC, nullable), `void_reason` (TEXT, nullable), `voided_by` (FK `profiles.id`), `voided_at` (TIMESTAMPTZ), `created_at` (TIMESTAMPTZ).
9. `transaction_items`
   - `id` (UUID, PK), `transaction_id` (FK `transactions.id`), `product_id` (FK), `product_name` (VARCHAR), `unit_price` (NUMERIC), `unit_cost_price` (NUMERIC, snapshot saat transaksi), `quantity` (INT, 1-99), `subtotal` (NUMERIC).
10. `audit_logs` *(Immutable, INSERT only)*
    - `id` (UUID, PK), `user_id` (FK `profiles.id`), `action` (VARCHAR), `entity_name` (VARCHAR), `entity_id` (VARCHAR), `previous_state` (JSONB), `new_state` (JSONB), `created_at` (TIMESTAMPTZ).

### 3.2 Aturan Keamanan Database & RLS
- **Isolasi Cabang**: `kasir` dan `kepala_toko` hanya dapat membaca dan menulis baris data yang memiliki `branch_id` sama dengan `profile.branch_id` mereka.
- **Kerahasiaan Modal & Laba**: Tabel `cost_price_history` dan kolom `unit_cost_price` di `transaction_items` hanya memiliki policy `SELECT` untuk `auth.jwt() ->> 'role' = 'owner'`.
- **Integritas Shift & Checkout**: Transaksi checkout dieksekusi melalui Postgres RPC `process_checkout()` yang mengunci baris stok produk (`SELECT ... FOR UPDATE`) dalam satu transaksi ACID untuk menjamin tidak ada stok negatif dan nomor struk tidak dobel.

---

## 4. Rencana Kerja Per Halaman

### 4.1 Halaman Masuk (`/login`)
- Form kredensial email & password.
- Deteksi status `is_active`: jika `false`, sesi dibatalkan dengan pesan akun nonaktif.
- Pengalihan cerdas berbasis peran:
  - Kasir $\rightarrow$ `/kasir`
  - Kepala Toko $\rightarrow$ `/transaksi`
  - Owner $\rightarrow$ `/laporan`

### 4.2 Halaman Shift Saya (`/shift-saya`)
- Tombol **Buka Shift**: Input kas awal validasi Rp0 s.d. Rp2.000.000. Memeriksa aturan BR-02 (maksimal 1 shift buka per kasir).
- Ringkasan shift berjalan: kas awal, akumulasi penjualan tunai dan QRIS yang lunas, kas seharusnya (`kas awal + total tunai lunas`).
- Formulir **Tutup Shift**: Input uang fisik laci kasir, kalkulasi otomatis selisih kas. Jika $|\text{selisih}| > 20.000$, kolom catatan wajib diisi (BR-09). Status shift beralih ke `ditutup`.

### 4.3 Halaman Kasir / POS (`/kasir`)
- Perlindungan BR-02: Memeriksa apakah kasir memiliki shift aktif berstatus `buka`. Jika tidak ada, fungsi penjualan dinonaktifkan.
- Katalog Produk: Navigasi kategori, filter pencarian teks, label stok cabang real-time. Produk nonaktif disembunyikan.
- Keranjang Belanja: Kontrol kuantitas 1-99, deteksi dini ketersediaan stok.
- Diskon Transaksi: Maksimal 10% dari subtotal, wajib alasan tertulis (BR-06).
- Panel Pembayaran:
  - Tunai: Uang diterima $\ge$ total, kalkulasi kembalian otomatis (BR-07).
  - QRIS Manual: Verifikasi nominal pas (BR-07).
- Cetak Struk: Dialog otomatis cetak struk format 58mm atau cetak PDF.

### 4.4 Halaman Transaksi (`/transaksi`)
- Daftar transaksi dengan filter tanggal, status, metode pembayaran, dan cabang (khusus Owner).
- Modal rincian struk & cetak ulang.
- Aksi *Void*: Otorisasi terbatas Kepala Toko cabang terkait & Owner (BR-08). Syarat: transaksi berstatus `lunas`, transaksi hari ini, shift kasir masih `buka`, alasan *void* minimal 10 karakter. Pengembalian stok otomatis dan pencatatan ke `audit_logs`.

### 4.5 Halaman Stok Cabang (`/stok`)
- Tabel inventaris cabang: SKU, nama, kategori, jumlah stok, indikator stok menipis ($< \text{stok minimum}$).
- Form Penyesuaian Stok: Jenis penyesuaian (Barang Masuk, Barang Rusak, Stock Opname), input jumlah baru, alasan wajib. Tercatat di `audit_logs` (BR-12).

### 4.6 Halaman Shift Cabang (`/shift-cabang`)
- Monitoring seluruh shift kasir di cabang bersangkutan (status: `buka`, `ditutup`, `diverifikasi`).
- Tanda peringatan khusus pada baris dengan selisih kas $> 20.000$.
- Aksi **Verifikasi Shift**: Hanya untuk shift berstatus `ditutup` $\rightarrow$ `diverifikasi` oleh Kepala Toko/Owner (BR-10). Tercatat di `audit_logs`.

### 4.7 Halaman Produk (`/produk`)
- Daftar master produk dengan harga jual dan status aktif.
- Khusus Owner: Tambah/edit produk, toggle aktif/nonaktif, konfigurasi pelacakan stok, dan kelola riwayat harga modal (BR-11, BR-12).
- Kepala Toko: Mode *read-only* tanpa tampilan harga modal.

### 4.8 Halaman Laporan (`/laporan`)
- Filter rentang tanggal dan cabang (Kepala Toko terkunci pada cabangnya sendiri).
- Kartu Ringkasan: Omzet, volume transaksi, rata-rata transaksi, jumlah void.
- Visualisasi Diagram:
  1. Grafik batang penjualan harian per cabang.
  2. Grafik batang 10 produk terlaris.
  3. Grafik donat proporsi metode pembayaran (Tunai vs QRIS).
- Tabel audit selisih kas per shift kasir.
- Panel Eksklusif Owner: Kartu Laba Kotor & Margin, serta grafik garis tren laba harian (BR-11).

### 4.9 Halaman Pengaturan (`/pengaturan`)
- Manajemen Akun Staf: Kelola nama, email, cabang, peran, dan status aktif staf (Owner only).
- Konfigurasi Data Cabang: Kode cabang, nama, alamat.
- Penampil Riwayat Audit (*Audit Log Viewer*): Tabel penelusuran aksi sistem dengan *before/after value*, bersifat *read-only* dan *immutable*.

---

## 5. Matriks Hak Akses Peran

| Modul / Fitur | Batasan Cabang | Kasir | Kepala Toko | Owner | Aturan Bisnis Terkait |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **Login Aplikasi** | Semua Cabang | ✅ (ke `/kasir`) | ✅ (ke `/transaksi`) | ✅ (ke `/laporan`) | BR-01 |
| **Login Akun Nonaktif** | Semua Cabang | ❌ Ditolak | ❌ Ditolak | ❌ Ditolak | BR-01 |
| **Buka Shift & Tutup Shift Sendiri** | Cabang Sendiri | ✅ | ❌ | ❌ | BR-02, BR-09 |
| **Input Penjualan / Buat Transaksi** | Cabang Sendiri | ✅ (wajib shift buka) | ❌ | ❌ | BR-02, BR-03, BR-04 |
| **Beri Diskon Transaksi ($\le$ 10%)** | Cabang Sendiri | ✅ (wajib alasan) | ❌ | ❌ | BR-06 |
| **Lihat Riwayat Transaksi** | Isolasi Cabang | ✅ (hanya shift sendiri) | ✅ (semua staf cabangnya) | ✅ (seluruh cabang) | BR-01 |
| **Eksekusi Void Transaksi** | Cabang Sendiri / Bebas | ❌ | ✅ (cabang sendiri, syarat BR-08) | ✅ (semua cabang, syarat BR-08) | BR-08, BR-12 |
| **Lihat Stok Produk** | Isolasi Cabang | ✅ (tampil di POS) | ✅ (tabel stok cabang sendiri) | ✅ (tabel stok semua cabang) | BR-01, BR-03 |
| **Penyesuaian Stok (Adjustment)** | Cabang Sendiri / Bebas | ❌ | ✅ (cabangnya + alasan) | ✅ (semua cabang + alasan) | BR-12 |
| **Lihat Daftar Shift Staf** | Isolasi Cabang | ❌ (hanya shift sendiri) | ✅ (semua shift di cabangnya) | ✅ (semua cabang) | BR-01 |
| **Verifikasi Shift Kasir** | Cabang Sendiri / Bebas | ❌ | ✅ (status `ditutup`) | ✅ (status `ditutup`) | BR-10, BR-12 |
| **Lihat Katalog & Harga Jual** | Semua Cabang | ✅ (katalog kasir) | ✅ (halaman produk read-only) | ✅ (halaman produk full) | BR-05 |
| **Kelola Produk & Harga Jual** | Lintas Cabang | ❌ | ❌ | ✅ | BR-05, BR-12 |
| **Lihat & Kelola Harga Modal** | Lintas Cabang | ❌ | ❌ (terblokir DB RLS) | ✅ (penuh) | BR-11, BR-12 |
| **Laporan Omzet, Transaksi, Void** | Isolasi Cabang | ❌ | ✅ (hanya cabangnya) | ✅ (semua cabang) | BR-01, BR-09 |
| **Laporan Laba Kotor & Margin** | Lintas Cabang | ❌ | ❌ (payload diblokir DB) | ✅ (penuh) | BR-11 |
| **Kelola Akun Staf & Cabang** | Lintas Cabang | ❌ | ❌ | ✅ | BR-01, BR-12 |
| **Lihat Audit Log** | Lintas Cabang | ❌ | ❌ | ✅ (Read-Only) | BR-12 |

---

## 6. Test Plan (18 Test Cases Merujuk Aturan Bisnis)

| ID Test Case | Kode BR | Kategori | Skenario Pengujian | Peran Penguji | Langkah Pengujian & Data Input | Hasil yang Diharapkan (*Expected Result*) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-01** | BR-01 | Uji Negatif | Login dengan akun staf yang berstatus nonaktif | Kasir / Staf | 1. Buka form login.<br>2. Masukkan email & kata sandi staf nonaktif (`is_active = false`).<br>3. Submit login. | Sistem menolak autentikasi, memunculkan pesan "Akun Anda dinonaktifkan", dan tidak menerbitkan sesi token JWT. |
| **TC-02** | BR-01 | Uji Hak Akses | Isolasi akses data cabang oleh Kepala Toko | Kepala Toko (TBT) | 1. Login sebagai Kepala Toko Tebet.<br>2. Buka halaman `/transaksi` dan `/laporan`.<br>3. Ubah filter cabang atau query API ke cabang lain (`BTR`). | Data transaksi dan laporan Bintaro/Depok tidak dimunculkan; filter terkunci permanen pada cabang Tebet. |
| **TC-03** | BR-01 | Uji Hak Akses | Kasir mencoba membuka halaman manajemen atau laporan | Kasir | 1. Login sebagai Kasir.<br>2. Akses langsung URL `/pengaturan` atau `/laporan` via address bar. | Router sistem langsung mengalihkan kembali ke `/kasir` dengan notifikasi akses ditolak (403 Unauthorized). |
| **TC-04** | BR-02 | Uji Negatif | Kasir membuka shift dengan nominal kas awal di luar batas | Kasir | 1. Buka menu Shift Saya.<br>2. Input kas awal: **Rp2.500.000** (atau $-10.000$).<br>3. Klik Buka Shift. | Tombol submit ditolak atau sistem memunculkan error: "Kas awal harus antara Rp0 s.d. Rp2.000.000". Shift tidak terbuat. |
| **TC-05** | BR-02 | Uji Negatif | Membuat transaksi penjualan tanpa memiliki shift buka | Kasir | 1. Login sebagai Kasir tanpa shift aktif.<br>2. Akses halaman `/kasir`.<br>3. Masukkan item dan tekan Simpan Transaksi. | Sistem memblokir aksi checkout dengan peringatan: "Harap buka shift terlebih dahulu untuk mulai melayani transaksi". |
| **TC-06** | BR-03 | Uji Negatif | Transaksi keranjang melebihi stok yang tersedia (*all-or-nothing*) | Kasir | 1. Stok produk roti tersedia = 2 unit.<br>2. Tambahkan kuantitas = 3 unit ke keranjang.<br>3. Proses pembayaran. | Sistem menolak seluruh transaksi (*all-or-nothing*) dengan error stok tidak mencukupi. Stok tidak terpotong dan transaksi tidak dibuat. |
| **TC-07** | BR-03 | Uji Konkurensi | Dua kasir menjual stok terakhir (sisa 1) secara bersamaan | Kasir 1 & 2 | 1. Produk kemasan memiliki sisa stok 1 unit.<br>2. Kasir 1 & 2 menekan Simpan Transaksi pada detik yang sama. | Hanya 1 transaksi yang berhasil diproses; transaksi lainnya gagal karena stok habis. Stok cabang menjadi 0 (tidak pernah negatif). |
| **TC-08** | BR-04 | Uji Positif | Pembuatan nomor struk sekuensial unik harian per cabang | Kasir | 1. Cabang Tebet memproses dua transaksi berturut-turut pada 15 Okt 2026. | Struk pertama bernomor `TBT-20261015-0001`, struk kedua `TBT-20261015-0002` secara unik dan berurutan. |
| **TC-09** | BR-05 | Uji Negatif | Menjual produk yang berstatus nonaktif | Kasir | 1. Owner mengubah status produk menjadi nonaktif.<br>2. Kasir mencari produk di katalog POS. | Produk nonaktif tidak muncul di daftar katalog pencarian POS dan tidak dapat dimasukkan ke keranjang belanja. |
| **TC-10** | BR-06 | Uji Negatif | Menginput diskon melebihi 10% dari subtotal transaksi | Kasir | 1. Subtotal transaksi Rp100.000.<br>2. Masukkan diskon 15% (Rp15.000).<br>3. Klik Simpan. | Form menolak dengan peringatan "Diskon maksimal 10%". Transaksi tidak dapat disimpan. |
| **TC-11** | BR-06 | Uji Negatif | Menginput diskon valid (10%) tanpa mengisi alasan diskon | Kasir | 1. Subtotal Rp100.000, diskon 10% (Rp10.000).<br>2. Kolom alasan diskon dikosongkan.<br>3. Klik Simpan. | Validasi form memblokir proses dengan pesan "Alasan diskon wajib diisi". |
| **TC-12** | BR-07 | Uji Negatif | Pembayaran tunai dengan uang diterima kurang dari total | Kasir | 1. Total tagihan Rp50.000.<br>2. Pilih metode Tunai, input uang diterima Rp40.000. | Muncul error "Nominal uang diterima kurang dari total tagihan" dan tombol Bayar tidak dapat ditekan. |
| **TC-13** | BR-08 | Uji Hak Akses | Kasir mencoba melakukan aksi pembatalan (*void*) | Kasir | 1. Kasir membuka detail transaksi miliknya.<br>2. Mencari opsi/tombol Void. | Tombol Void tidak tersedia di UI Kasir. Pengiriman request POST void via konsol/API dibalas HTTP 403 Forbidden. |
| **TC-14** | BR-08 | Uji Negatif | Void transaksi dengan alasan kurang dari 10 karakter | Kepala Toko | 1. Pilih transaksi lunas hari ini.<br>2. Masukkan alasan void: "Salah" (5 karakter).<br>3. Konfirmasi void. | Validasi memunculkan error "Alasan void minimal 10 karakter". Transaksi tidak dibatalkan. |
| **TC-15** | BR-08 | Uji Positif & Efek Samping | Void transaksi lunas hari ini mengembalikan stok produk | Kepala Toko | 1. Transaksi memuat 2 unit Roti Keju di-void dengan alasan sah $\ge 10$ karakter. | Status transaksi berubah menjadi `void`, stok Roti Keju di cabang bertambah kembali 2 unit, dan aksi tercatat di `audit_logs`. |
| **TC-16** | BR-09 | Uji Negatif | Tutup shift dengan selisih kas $>$ Rp20.000 tanpa catatan | Kasir | 1. Kas seharusnya Rp500.000.<br>2. Input uang fisik Rp470.000 (selisih -Rp30.000).<br>3. Kolom catatan dikosongkan, klik Tutup Shift. | Sistem memblokir penutupan shift: "Selisih kas melebihi Rp20.000, catatan penjelasan wajib diisi". |
| **TC-17** | BR-10 | Uji Negatif | Memverifikasi shift kasir yang masih berstatus `buka` | Kepala Toko | 1. Buka menu Shift Cabang.<br>2. Pilih shift yang masih berjalan (`status = buka`). | Tombol verifikasi tidak aktif. Request verifikasi ditolak database constraint (hanya shift `ditutup` yang dapat diverifikasi). |
| **TC-18** | BR-11 | Uji Hak Akses & Privasi Data | Pencegahan kebocoran harga modal & laba pada Kepala Toko | Kepala Toko | 1. Login sebagai Kepala Toko.<br>2. Buka halaman Laporan dan Produk.<br>3. Periksa respons JSON API Supabase di Network Inspector. | Payload JSON dari server tidak menyertakan kolom `cost_price` maupun kalkulasi laba (terproteksi di level PostgreSQL RLS). |

---

## 7. Rencana Penahapan Eksekusi (Implementation Milestones)

- **Milestone 1**: Inisialisasi Proyek Next.js App Router, TypeScript, Tailwind CSS, & Fondasi Komponen Desain Responsif (Tablet 10" $\ge 1024$px).
- **Milestone 2**: Desain Skema Database Supabase, Migrasi RLS, Stored Procedures (`process_checkout`, invoice counter, void).
- **Milestone 3**: Autentikasi Pengguna & Penanganan Shift Kasir (`/login`, `/shift-saya`).
- **Milestone 4**: Modul Kasir / POS & Cetak Struk 58mm/PDF (`/kasir`, BR-02 s.d. BR-07).
- **Milestone 5**: Modul Transaksi & Otomasi Void (`/transaksi`, BR-08).
- **Milestone 6**: Modul Inventaris Stok & Supervisi Shift Cabang (`/stok`, `/shift-cabang`, BR-09, BR-10, BR-12).
- **Milestone 7**: Modul Master Produk, Pengaturan, & Audit Log (`/produk`, `/pengaturan`, BR-11, BR-12).
- **Milestone 8**: Modul Dashboard Analitik & Visualisasi Grafik Laporan (`/laporan`).
- **Milestone 9**: Eksekusi Otomasi Test Case (TC-01 s.d. TC-18) & Validasi Kriteria Selesai.
