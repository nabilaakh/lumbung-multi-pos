# Lumbung MultiPOS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membangun aplikasi kasir Lumbung MultiPOS berbasis Next.js App Router, TypeScript, Tailwind CSS v3.4, dan Supabase untuk 3 cabang Lumbung Kopi dan Roti dengan isolasi data cabang, shift kasir, transaksi atomik, struk sekuensial, dan proteksi kerahasiaan laba/harga modal.

**Architecture:** Next.js (App Router, Server & Client Components, Route Handlers / Server Actions) dengan `@supabase/ssr` untuk autentikasi aman berbasis sesi. Basis data PostgreSQL Supabase dengan Row Level Security (RLS) untuk isolasi cabang, Stored Procedures/RPC untuk transaksi *checkout* atomik dan penomoran struk anti-*race condition*, serta proteksi harga modal via RLS dan Security Definer RPC. UI responsif tablet 10" ($\ge 1024$px) dibangun dengan Tailwind CSS v3.4 dan siap di-deploy ke Netlify (*internal app with noindex*).

**Tech Stack:** Next.js 14/15 (App Router), React, TypeScript, Tailwind CSS v3.4, **shadcn/ui** (preset: `b1tgXpkWI`, base: `radix`, template: `next`), `@supabase/ssr`, `@supabase/supabase-js`, Vitest / Playwright, Netlify.

**Spec:** [docs/superpowers/specs/2026-10-21-lumbung-multipos-design.md](file:///c:/Users/LENOVO/Bootcamp-FutureMakers/lumbung-multi-pos/docs/superpowers/specs/2026-10-21-lumbung-multipos-design.md)

---

## Global Constraints

- Waktu muat halaman Kasir $\le 2$ detik, proses simpan transaksi $\le 1$ detik pada koneksi normal.
- Tampilan responsif optimal untuk layar tablet 10 inci (lebar $\ge 1024$px).
- Internal App: seluruh halaman berstatus `noindex` (header `X-Robots-Tag: noindex, nofollow`).
- Tiga cabang tetap: Tebet (`TBT`), Bintaro (`BTR`), Depok (`DPK`).
- Format nomor struk: `KODE-YYYYMMDD-NNNN` (contoh: `TBT-20261015-0004`).
- Kasir dan Kepala Toko terikat ke 1 cabang; Owner lintas cabang.
- Kerahasiaan harga modal & laba: hanya terbaca oleh Owner di tingkat PostgreSQL RLS (bukan sekadar disembunyikan UI).

---

## Review Focus

1. **Race condition stok terakhir (TC-07 / BR-03)**: Dua kasir menjual sisa stok 1 bersamaan; hanya 1 berhasil, stok menjadi 0 dan tidak boleh negatif.
2. **Duplikasi / celah nomor struk (TC-08 / BR-04)**: Dua transaksi disimpan pada detik yang sama di cabang yang sama; nomor tetap unik dan berurutan via lock counter.
3. **Pemberian diskon ilegal (TC-10, TC-11 / BR-06)**: Diskon $> 10\%$ atau diskon tanpa alasan wajib ditolak.
4. **Pembatalan (*void*) tidak sah (TC-13, TC-14, TC-15 / BR-08)**: Kasir dilarang void; alasan $< 10$ karakter ditolak; transaksi kemarin atau pada shift yang sudah ditutup tidak boleh di-void.
5. **Kebocoran harga modal & laba (TC-18 / BR-11)**: Kepala Toko tidak dapat melihat nilai modal atau laba via network tab atau query langsung ke Supabase API.

---

## File Structure & Map

```
lumbung-multi-pos/
├── docs/superpowers/
│   ├── specs/2026-10-21-lumbung-multipos-design.md
│   └── plans/2026-10-21-lumbung-multipos.md
├── supabase/
│   ├── migrations/
│   │   ├── 20261021000001_initial_schema.sql
│   │   ├── 20261021000002_rls_policies.sql
│   │   └── 20261021000003_stored_procedures.sql
│   └── seed.sql
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── (auth)/
│   │   │   └── login/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx
│   │   │   ├── kasir/page.tsx
│   │   │   ├── shift-saya/page.tsx
│   │   │   ├── transaksi/page.tsx
│   │   │   ├── stok/page.tsx
│   │   │   ├── shift-cabang/page.tsx
│   │   │   ├── produk/page.tsx
│   │   │   ├── laporan/page.tsx
│   │   │   └── pengaturan/page.tsx
│   │   └── api/
│   ├── components/
│   │   ├── ui/ (Button, Input, Modal, Badge, Table, Card)
│   │   ├── layout/ (Sidebar, Topbar, ShiftStatusWidget)
│   │   ├── pos/ (ProductCatalog, CartPanel, DiscountModal, PaymentModal, ReceiptModal)
│   │   ├── shift/ (OpenShiftModal, CloseShiftModal, ShiftSummaryCard)
│   │   ├── transactions/ (TransactionTable, VoidModal, ReceiptPreview)
│   │   ├── stock/ (StockTable, StockAdjustmentModal)
│   │   ├── reports/ (SalesBarChart, TopProductsChart, PaymentDonutChart, ProfitSection)
│   │   └── audit/ (AuditLogTable)
│   ├── lib/
│   │   ├── supabase/ (client.ts, server.ts, middleware.ts)
│   │   ├── utils/ (currency.ts, date.ts, receipt-printer.ts)
│   │   └── constants/ (roles.ts, branches.ts, categories.ts)
│   ├── types/ (database.ts, pos.ts, shift.ts, auth.ts)
│   └── middleware.ts
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── netlify.toml
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## Tasks

### Task 1: Project Scaffolding, TypeScript, Tailwind CSS v3.4, shadcn/ui, and Testing Setup

**Files:**
- Create: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.js`, `netlify.toml`, `components.json`
- Create: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`
- Create: `src/components/ui/` (shadcn primitives: button, card, badge, dialog, input, table, tabs, dropdown-menu)
- Create: `vitest.config.ts`, `tests/unit/setup.test.ts`

**Interfaces:**
- Produces: Base Next.js app with Tailwind v3.4 design tokens, shadcn/ui components (Radix base, preset `b1tgXpkWI`), shared UI primitives, and Vitest test runner.

- [x] **Step 1: Inisialisasi package.json dan instalasi dependencies**
  - Next.js 14+, React 18/19, TypeScript, Tailwind CSS v3.4, `@supabase/ssr`, `@supabase/supabase-js`, Lucide React icons, Vitest, `@testing-library/react`.
- [x] **Step 2: Inisialisasi shadcn/ui menggunakan preset**
  - Jalankan: `npx shadcn@latest init --preset b1tgXpkWI --base radix --template next`
  - Verifikasi `components.json` terbuat dan terkonfigurasi dengan benar.
- [x] **Step 3: Konfigurasi Tailwind CSS v3.4, tema Lumbung, dan PostCSS**
  - `tailwind.config.ts`: sesuaikan tema Lumbung Kopi dan Roti (palet earthy amber, warm stone, espresso dark), serta breakpoint tablet `min-w-[1024px]`.
  - Pasang komponen UI dasar: `npx shadcn@latest add button card badge dialog input table tabs dropdown-menu`
- [x] **Step 4: Konfigurasi Netlify and Robots Noindex**
  - Buat `netlify.toml` dengan Next.js plugin dan custom headers `X-Robots-Tag: noindex, nofollow`.
- [x] **Step 5: Buat Unit Test Sederhana Vitest**
  - `tests/unit/setup.test.ts`: Uji bahwa environment test berjalan normal.
  - Jalankan `npm test` untuk memverifikasi.
- [x] **Step 6: Commit**
  ```bash
  git add .
  git commit -m "chore: scaffold Next.js App Router with Tailwind CSS v3.4, shadcn preset, and Vitest"
  ```

---

### Task 2: Supabase Database Schema, Migrations, and RLS Policies

**Files:**
- Create: `supabase/migrations/20261021000001_initial_schema.sql`
- Create: `supabase/migrations/20261021000002_rls_policies.sql`
- Create: `src/types/database.ts`
- Create: `tests/unit/schema-types.test.ts`

**Interfaces:**
- Produces: 9 tabel utama sesuai ERD (`cabang`, `profiles`, `produk`, `riwayat_harga_modal`, `stok_cabang`, `shift_kasir`, `transaksi`, `transaksi_item`, `audit_log`).
- Produces: RLS Policies penegak isolasi cabang dan kerahasiaan `riwayat_harga_modal` (BR-01, BR-11, BR-12).

- [x] **Step 1: Tulis migration 9 tabel utama, constraint, dan foreign keys**
  - Tabel `cabang` (TBT, BTR, DPK, urut_struk_tanggal, urut_struk_terakhir).
  - Tabel `profiles` (terkait `auth.users(id)`, peran: `kasir`, `kepala_toko`, `owner`, status `aktif`, constraint 1 kepala toko aktif per cabang).
  - Tabel `produk` (kategori: `kopi`, `non_kopi`, `roti`, `snack`, `kemasan`, harga_jual integer, lacak_stok, aktif).
  - Tabel `riwayat_harga_modal` (produk_id, harga_modal integer, berlaku_mulai, dibuat_oleh, rahasia Owner).
  - Tabel `stok_cabang` (cabang_id, produk_id, jumlah >= 0, stok_minimum >= 0).
  - Tabel `shift_kasir` (cabang_id, kasir_id, status: buka/ditutup/diverifikasi, kas_awal 0-2jt, kas_seharusnya, selisih, catatan_tutup, verifikasi).
  - Tabel `transaksi` (nomor_struk unik, cabang_id, shift_id, kasir_id, subtotal, diskon <= 10%, total, metode_bayar, uang_diterima, kembalian, void data).
  - Tabel `transaksi_item` (transaksi_id, produk_id, nama_produk, harga_satuan, jumlah 1-99, subtotal).
  - Tabel `audit_log` (id identity, pelaku_id, aksi, tabel, data_id, nilai_sebelum, nilai_sesudah, dibuat_pada).
- [x] **Step 2: Tulis RLS Policies**
  - `profiles`: user membaca profil sendiri/cabang; Owner membaca/mengubah semua.
  - `stok_cabang`, `transaksi`, `shift_kasir`: Kasir & Kepala Toko terisolasi ke `cabang_id`. Owner bebas akses.
  - `riwayat_harga_modal`: HANYA Owner yang memiliki izin SELECT / INSERT. Kasir dan Kepala Toko ditolak total di tingkat RLS.
  - `audit_log`: INSERT diizinkan untuk fungsi/sistem; SELECT untuk Owner; UPDATE/DELETE ditolak total (*immutable*).
- [x] **Step 3: Generate TypeScript types**
  - Buat `src/types/database.ts` yang mencerminkan 9 tabel Supabase.
- [x] **Step 4: Commit**
  ```bash
  git add supabase/ src/types/database.ts
  git commit -m "feat(db): add 9 tables schema, migrations, and RLS policies from ERD_POS"
  ```

---

### Task 3: Supabase Client, SSR Middleware, and Login Page (BR-01)

**Files:**
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/server.ts`
- Create: `src/lib/supabase/middleware.ts`
- Create: `src/middleware.ts`
- Create: `src/app/(auth)/login/page.tsx`
- Create: `tests/unit/auth-validation.test.ts`

**Interfaces:**
- Consumes: `src/types/database.ts`
- Produces: Supabase SSR client helper, Next.js Middleware route guard, Login UI with role redirection.

- [ ] **Step 1: Write test for Login validation & active status check (TC-01, TC-03)**
  - Pastikan akun nonaktif ditolak dan kasir dilarang masuk ke route `/pengaturan`.
- [ ] **Step 2: Implementasi Supabase SSR helpers**
  - Gunakan `@supabase/ssr` (`createBrowserClient`, `createServerClient`).
- [ ] **Step 3: Implementasi Next.js Middleware**
  - Periksa token sesi.
  - Query status profil pengguna: jika `is_active = false`, lakukan sign out dan redirect ke `/login?error=inactive`.
  - Terapkan guard: jika kasir mengakses `/laporan` atau `/pengaturan`, redirect ke `/kasir`.
- [ ] **Step 4: Implementasi Halaman Login (`/login`)**
  - Form email & password dengan gaya warm-earthy modern.
  - Tampilkan pesan error jika login gagal atau akun nonaktif.
  - Redirect otomatis sesuai peran:
    - Kasir $\rightarrow$ `/kasir`
    - Kepala Toko $\rightarrow$ `/transaksi`
    - Owner $\rightarrow$ `/laporan`
- [ ] **Step 5: Verifikasi test passing & Commit**
  ```bash
  git add src/lib/supabase/ src/middleware.ts src/app/\(auth\)/
  git commit -m "feat(auth): implement Supabase SSR auth, middleware guard, and login page"
  ```

---

### Task 4: Cashier Shift Management System (`/shift-saya` & BR-02, BR-09, BR-10)

**Files:**
- Create: `src/app/(dashboard)/shift-saya/page.tsx`
- Create: `src/components/shift/OpenShiftModal.tsx`
- Create: `src/components/shift/CloseShiftModal.tsx`
- Create: `src/components/shift/ShiftSummaryCard.tsx`
- Create: `src/lib/services/shift-service.ts`
- Create: `tests/unit/shift-calculation.test.ts`

**Interfaces:**
- Consumes: Supabase client, User session
- Produces: `getActiveShift(cashierId)`, `openShift(cashierId, openingCash)`, `closeShift(shiftId, actualCash, notes)`.

- [ ] **Step 1: Write unit tests for shift rules (TC-04, TC-16)**
  - Uji validasi kas awal: Rp0 s.d. Rp2.000.000. Nilai negatif atau $> 2.000.000$ ditolak.
  - Uji penutupan shift: selisih kas $> 20.000$ tanpa catatan ditolak.
  - Uji kalkulasi kas seharusnya: `kas_awal + total_tunai_lunas`. Transaksi `void` tidak dihitung.
- [ ] **Step 2: Implementasi `shift-service.ts`**
  - Fungsi `openShift`: periksa apakah kasir sudah punya shift `buka`. Jika ada, tolak.
  - Fungsi `closeShift`: hitung `expected_cash`, validasi `notes` jika $|actual - expected| > 20000$. Ubah status menjadi `ditutup`.
- [ ] **Step 3: Implementasi UI Halaman Shift Saya**
  - Tampilan dinamis sesuai state: jika belum ada shift buka, tampilkan form Buka Shift.
  - Jika shift aktif: tampilkan kartu ringkasan shift berjalan dan tombol Tutup Shift.
- [ ] **Step 4: Verifikasi test passing & Commit**
  ```bash
  git add src/app/\(dashboard\)/shift-saya/ src/components/shift/ src/lib/services/shift-service.ts tests/
  git commit -m "feat(shift): implement cashier shift lifecycle and cash reconciliation"
  ```

---

### Task 5: PostgreSQL RPC for Atomic Checkout & Invoice Numbering (BR-03, BR-04, BR-05, BR-07)

**Files:**
- Create: `supabase/migrations/20261021000003_stored_procedures.sql`
- Create: `src/lib/services/checkout-service.ts`
- Create: `tests/integration/atomic-checkout.test.ts`

**Interfaces:**
- Produces: Postgres function `proses_checkout_transaksi(p_shift_id, p_items, p_diskon, p_alasan_diskon, p_metode_bayar, p_uang_diterima)`
- Produces: Struk format `KODE-YYYYMMDD-NNNN` anti-*race condition* langsung via tabel `cabang`.

- [ ] **Step 1: Write integration tests for atomic checkout (TC-06, TC-07, TC-08, TC-10, TC-11, TC-12)**
  - Test transaksi ditolak jika kasir tidak memiliki shift `buka`.
  - Test transaksi atomik gagal jika stok produk kurang (tidak ada penjualan parsial).
  - Test simulasi 2 kasir membeli sisa stok 1: 1 sukses, 1 gagal, stok akhir 0.
  - Test nomor struk terbit berurutan `KODE-YYYYMMDD-0001`, `0002`.
- [ ] **Step 2: Tulis Stored Procedure `proses_checkout_transaksi` di SQL**
  - Kunci baris shift: pastikan `status = 'buka'` (BR-02).
  - Kunci baris `cabang` (`FOR UPDATE`) untuk nomor urut harian: jika tanggal baru (WIB), reset `urut_struk_terakhir = 1`, jika sama increment + 1 (BR-04).
  - Format nomor struk: `kode || '-' || TO_CHAR(WIB_DATE, 'YYYYMMDD') || '-' || LPAD(urut::text, 4, '0')`.
  - Kunci baris stok produk yang dilacak (`SELECT jumlah FROM stok_cabang WHERE ... FOR UPDATE`).
  - Validasi: jika stok kurang dari `item.jumlah`, lempar exception `'Stok tidak mencukupi'`.
  - Kurangi stok: `UPDATE stok_cabang SET jumlah = jumlah - item.jumlah`.
  - Catat `transaksi` dan `transaksi_item` (katalog produk 5 kategori, harga jual int).
  - Update akumulasi `total_tunai` / `total_qris` dan `kas_seharusnya` di tabel `shift_kasir`.
- [ ] **Step 3: Implementasi client service `checkout-service.ts`**
  - Wrapper pemanggil RPC `proses_checkout_transaksi` dari Next.js Server Action / Route Handler.
- [ ] **Step 4: Commit**
  ```bash
  git add supabase/migrations/20261021000003_stored_procedures.sql src/lib/services/checkout-service.ts tests/
  git commit -m "feat(checkout): implement atomic checkout RPC and sequential invoice generator"
  ```

---

### Task 6: POS Cashier Interface & Receipt Printing (`/kasir` & BR-02 s.d. BR-07)

**Files:**
- Create: `src/app/(dashboard)/kasir/page.tsx`
- Create: `src/components/pos/ProductCatalog.tsx`
- Create: `src/components/pos/CartPanel.tsx`
- Create: `src/components/pos/DiscountModal.tsx`
- Create: `src/components/pos/PaymentModal.tsx`
- Create: `src/components/pos/ReceiptModal.tsx`
- Create: `src/lib/utils/receipt-printer.ts`

**Interfaces:**
- Consumes: `checkout-service.ts`, `shift-service.ts`
- Produces: Complete responsive POS screen for cashier with thermal 58mm / PDF print.

- [ ] **Step 1: Implementasi Katalog Produk**
  - Grid kartu produk responsif tablet 10" (3-4 kolom).
  - Badge stok cabang *real-time* (peringatan warna jika stok $\le$ minimum).
  - Filter kategori (`kopi`, `non_kopi`, `roti`, `snack`, `kemasan`) dan kotak pencarian teks instan.
- [ ] **Step 2: Implementasi Panel Keranjang Belanja**
  - List item pesanan, tombol +/- kuantitas (1-99), hitung subtotal otomatis.
  - Tombol Buka Modal Diskon (validasi input $\le 10\%$, alasan wajib).
  - Validasi sebelum bayar: cek shift buka kasir.
- [ ] **Step 3: Implementasi Modal Pembayaran**
  - Pilihan metode: Tunai vs QRIS Manual (vs QRIS Mayar opsional).
  - Tunai: kalkulasi kembalian otomatis. Validasi uang diterima $\ge$ total.
  - Tombol Simpan Transaksi memanggil `proses_checkout_transaksi()`.
- [ ] **Step 4: Implementasi Dialog Struk & Cetak 58mm/PDF**
  - Komponen struk dengan format toko Lumbung Kopi dan Roti, nomor struk, tanggal, kasir, rincian produk, subtotal, diskon, total, metode bayar.
  - Utility CSS `@media print` untuk ukuran kertas thermal 58mm dan opsi simpan PDF.
- [ ] **Step 5: Verifikasi fungsionalitas UI & Commit**
  ```bash
  git add src/app/\(dashboard\)/kasir/ src/components/pos/ src/lib/utils/receipt-printer.ts
  git commit -m "feat(pos): build cashier POS screen, payment processing, and 58mm thermal print"
  ```

---

### Task 7: Transaction History & Void Automation (`/transaksi` & BR-01, BR-08, BR-12)

**Files:**
- Create: `src/app/(dashboard)/transaksi/page.tsx`
- Create: `src/components/transactions/TransactionTable.tsx`
- Create: `src/components/transactions/VoidModal.tsx`
- Create: `src/components/transactions/ReceiptPreview.tsx`
- Create: `src/lib/services/transaction-service.ts`
- Create: `tests/integration/void-transaction.test.ts`

**Interfaces:**
- Consumes: Supabase client, User session
- Produces: `getTransactions(filter)`, `voidTransaction(transactionId, reason)`

- [ ] **Step 1: Write tests for Void requirements (TC-13, TC-14, TC-15)**
  - Uji kasir dilarang void (403 Forbidden).
  - Uji alasan void $< 10$ karakter ditolak.
  - Uji void mengembalikan stok cabang dan mencatat entri di `audit_log`.
- [ ] **Step 2: Buat Stored Procedure `eksekusi_void_transaksi` di SQL**
  - Cek otorisasi pemanggil: role harus `kepala_toko` pada cabang yang bersangkutan atau `owner` (BR-08).
  - Cek status transaksi: harus `lunas`.
  - Cek tanggal: harus `(dibuat_pada AT TIME ZONE 'Asia/Jakarta')::DATE = CURRENT_DATE`.
  - Cek shift transaksi: shift harus masih `buka`.
  - Update status transaksi menjadi `void`, simpan `void_reason`, `void_oleh`, `void_pada`.
  - Kembalikan stok item transaksi ke `stok_cabang`.
  - Kurangi akumulasi kas/QRIS di `shift_kasir`.
  - Catat log ke `audit_log` (BR-12).
- [ ] **Step 3: Implementasi UI Halaman Transaksi**
  - Tabel transaksi dengan filter tanggal, status, metode bayar, dan filter cabang (jika Owner).
  - Kasir hanya melihat transaksi miliknya; Kepala Toko melihat cabangnya; Owner melihat semua cabang.
  - Tombol Void hanya muncul untuk Kepala Toko dan Owner jika transaksi memenuhi syarat.
- [ ] **Step 4: Verifikasi test passing & Commit**
  ```bash
  git add src/app/\(dashboard\)/transaksi/ src/components/transactions/ src/lib/services/transaction-service.ts tests/
  git commit -m "feat(transactions): implement transaction history and atomic void authorization"
  ```

---

### Task 8: Branch Stock & Shift Supervision (`/stok`, `/shift-cabang` & BR-09, BR-10, BR-12)

**Files:**
- Create: `src/app/(dashboard)/stok/page.tsx`
- Create: `src/components/stock/StockTable.tsx`
- Create: `src/components/stock/StockAdjustmentModal.tsx`
- Create: `src/app/(dashboard)/shift-cabang/page.tsx`
- Create: `src/components/shift/BranchShiftTable.tsx`
- Create: `src/components/shift/VerifyShiftModal.tsx`
- Create: `tests/unit/stock-and-verify.test.ts`

**Interfaces:**
- Produces: `sesuaikan_stok_cabang(cabangId, produkId, jumlahBaru, alasan)`, `verifikasi_shift_kasir(shiftId, catatanVerifikasi)`

- [ ] **Step 1: Write tests for stock adjustment & shift verification (TC-17)**
  - Uji Kepala Toko hanya dapat mengatur stok cabangnya.
  - Uji verifikasi shift hanya bisa pada shift `ditutup` (menolak shift `buka`).
  - Uji audit log mencatat aksi penyesuaian stok dan verifikasi shift.
- [ ] **Step 2: Implementasi Halaman Stok Cabang (`/stok`)**
  - Tampilkan tabel stok per produk dengan indikator merah jika $< \text{stok minimum}$.
  - Modal Penyesuaian Stok: jenis (Barang Masuk / Rusak / Stock Opname), jumlah baru, alasan wajib.
- [ ] **Step 3: Implementasi Halaman Shift Cabang (`/shift-cabang`)**
  - Tabel seluruh shift di cabang dengan penanda visual jika selisih kas $> 20.000$.
  - Modal detail shift: uang fisik vs kas seharusnya, catatan kasir.
  - Tombol Verifikasi Shift yang mengubah status menjadi `diverifikasi` dan mencatat verifikator.
- [ ] **Step 4: Verifikasi test & Commit**
  ```bash
  git add src/app/\(dashboard\)/stok/ src/app/\(dashboard\)/shift-cabang/ src/components/stock/ tests/
  git commit -m "feat(branch-ops): implement stock adjustment and shift verification modules"
  ```

---

### Task 9: Master Products, Settings, and Audit Log (`/produk`, `/pengaturan` & BR-01, BR-11, BR-12)

**Files:**
- Create: `src/app/(dashboard)/produk/page.tsx`
- Create: `src/components/products/ProductTable.tsx`
- Create: `src/components/products/ProductFormModal.tsx`
- Create: `src/components/products/CostPriceHistoryModal.tsx`
- Create: `src/app/(dashboard)/pengaturan/page.tsx`
- Create: `src/components/settings/StaffManagementTable.tsx`
- Create: `src/components/settings/BranchConfigForm.tsx`
- Create: `src/components/audit/AuditLogTable.tsx`
- Create: `tests/integration/product-cost-privacy.test.ts`

**Interfaces:**
- Produces: Product management, Cost price history (Owner only), Staff management, Immutable Audit Log viewer.

- [ ] **Step 1: Write integration tests for Cost Price Privacy (TC-09, TC-18)**
  - Uji Kepala Toko tidak dapat melihat harga modal di response API.
  - Uji produk nonaktif tidak dapat dijual.
- [ ] **Step 2: Implementasi Halaman Produk (`/produk`)**
  - Mode Owner: Tambah/ubah produk, SKU, 5 kategori (`kopi`, `non_kopi`, `roti`, `snack`, `kemasan`), pelacakan stok, harga jual, dan modal.
  - Mode Kepala Toko: *Read-only*, kolom harga modal dihilangkan dari tabel dan payload.
- [ ] **Step 3: Implementasi Halaman Pengaturan (`/pengaturan`)**
  - Manajemen Akun Staf: nama, email, cabang, peran, toggle status aktif.
  - Data Cabang: konfig kode dan nama cabang.
  - Audit Log Viewer: tabel riwayat aksi sistem lengkap dengan before/after state (read-only).
- [ ] **Step 4: Verifikasi test passing & Commit**
  ```bash
  git add src/app/\(dashboard\)/produk/ src/app/\(dashboard\)/pengaturan/ src/components/products/ src/components/settings/ tests/
  git commit -m "feat(admin): implement products catalog, cost price history, settings, and audit logs"
  ```

---

### Task 10: Reports & Analytics Dashboard (`/laporan` & BR-01, BR-09, BR-11)

**Files:**
- Create: `src/app/(dashboard)/laporan/page.tsx`
- Create: `src/components/reports/KpiSummaryCards.tsx`
- Create: `src/components/reports/SalesBarChart.tsx`
- Create: `src/components/reports/TopProductsChart.tsx`
- Create: `src/components/reports/PaymentDonutChart.tsx`
- Create: `src/components/reports/CashVarianceTable.tsx`
- Create: `src/components/reports/ProfitSection.tsx`
- Create: `src/lib/services/report-service.ts`
- Create: `tests/unit/report-calculation.test.ts`

**Interfaces:**
- Produces: Aggregated sales reports, 3 standard charts, cash variance audit, and Owner-exclusive profit metrics.

- [ ] **Step 1: Write unit tests for Report metrics and role protection (TC-02, TC-18)**
  - Uji Kepala Toko hanya menerima data cabangnya dan tanpa metrik laba.
  - Uji kalkulasi laba kotor hanya berjalan untuk peran Owner berdasarkan harga modal di `riwayat_harga_modal` yang berlaku saat transaksi dibuat.
- [ ] **Step 2: Implementasi Report Server Functions**
  - Agregasi omzet, total transaksi, average order value, void count.
  - Query data grafik penjualan harian, 10 produk terlaris, dan rasio tunai/QRIS.
  - Query khusus laba kotor & margin yang di-guard ketat di server (jika role !== owner, return null).
- [ ] **Step 3: Implementasi Visualisasi Dashboard Laporan**
  - Filter rentang tanggal dan cabang (Kepala Toko terkunci).
  - Komponen grafik visual (SVG/Canvas based responsive chart yang ringan).
  - Tabel selisih kas shift dengan penanda merah jika selisih $> 20.000$.
  - Bagian laba kotor khusus Owner.
- [ ] **Step 4: Verifikasi test & Commit**
  ```bash
  git add src/app/\(dashboard\)/laporan/ src/components/reports/ src/lib/services/report-service.ts tests/
  git commit -m "feat(reports): implement analytics dashboard, visualizations, and protected profit metrics"
  ```

---

### Task 11: End-to-End Test Suite, Netlify Deployment Verification, and Production Polish

**Files:**
- Create: `tests/e2e/all-test-cases.test.ts`
- Create: `public/robots.txt`
- Modify: `netlify.toml`
- Modify: `README.md`

**Interfaces:**
- Executes all 18 Test Cases (TC-01 through TC-18) against the implemented application.
- Prepares Netlify deployment configuration.

- [ ] **Step 1: Eksekusi seluruh suite test (TC-01 s.d. TC-18)**
  - Jalankan test otomatis untuk memverifikasi seluruh 18 skenario uji PRD.
  - Catat dan verifikasi semua output test berstatus PASS.
- [ ] **Step 2: Konfigurasi robots.txt dan header noindex**
  - Pastikan file `public/robots.txt` berisi `User-agent: *\nDisallow: /`.
  - Verifikasi response header `X-Robots-Tag: noindex, nofollow`.
- [ ] **Step 3: Build Verification**
  - Jalankan `npm run build` untuk memverifikasi tidak ada error TypeScript, lint, atau SSR issue.
- [ ] **Step 4: Final Commit & Tag**
  ```bash
  git add .
  git commit -m "chore: complete test suite verification and production build readiness"
  ```
