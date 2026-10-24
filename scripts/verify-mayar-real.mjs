import fs from 'fs';
import path from 'path';

// Load .env.local into process.env
const envPath = path.resolve('.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
    const idx = trimmed.indexOf('=');
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim();
    process.env[key] = val;
  }
});

import { isMayarMockMode, createMayarInvoice, getMayarInvoiceDetail } from '../lib/services/mayar-service.ts';

async function runRealTest() {
  console.log('====================================================');
  console.log('VERIFIKASI INTEGRASI MAYAR SANDBOX REAL API');
  console.log('====================================================');
  console.log('1. Deteksi Mock Mode:');
  const mockMode = isMayarMockMode();
  console.log('   isMayarMockMode() =', mockMode);
  if (mockMode) {
    console.error('   [FAIL] Mock mode masih aktif!');
    process.exit(1);
  }
  console.log('   [PASS] Mock mode dinonaktifkan! Menggunakan Real Sandbox API.');

  console.log('\n2. Memanggil createMayarInvoice() ke https://api.mayar.io/hl/v2 ...');
  const testTrxNumber = `TBT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
  const invoiceRes = await createMayarInvoice({
    amount: 45000,
    invoiceNumber: testTrxNumber,
    customerName: 'Pelanggan POS Lumbung Sandbox',
    customerEmail: 'pelanggan.pos@lumbungkopi.id',
    customerMobile: '081234567890',
    description: `Pembayaran Transaksi POS Lumbung #${testTrxNumber}`,
    items: [
      { description: 'Kopi Susu Gula Aren Lumbung', quantity: 1, rate: 25000 },
      { description: 'Roti Panggang Coklat Keju', quantity: 1, rate: 20000 },
    ],
  });

  console.log('   Hasil Pembuatan Tagihan:');
  console.log('   - isMock:', invoiceRes.isMock);
  console.log('   - Invoice ID:', invoiceRes.invoiceId);
  console.log('   - Status:', invoiceRes.status);
  console.log('   - Payment URL:', invoiceRes.paymentUrl);
  console.log('   - QR Code URL:', invoiceRes.qrCodeUrl);
  console.log('   - Expired At:', invoiceRes.expiredAt);

  if (invoiceRes.isMock) {
    console.error('   [FAIL] Expected isMock to be false!');
    process.exit(1);
  }

  if (!invoiceRes.invoiceId || invoiceRes.invoiceId.startsWith('inv_mock_')) {
    console.error('   [FAIL] Invoice ID tidak valid dari Mayar Sandbox!');
    process.exit(1);
  }

  console.log('   [PASS] Invoice berhasil dibuat di server Mayar Sandbox!');

  console.log('\n3. Memanggil getMayarInvoiceDetail() untuk verifikasi status riil...');
  const detailRes = await getMayarInvoiceDetail(invoiceRes.invoiceId);
  console.log('   Detail dari server Mayar:');
  console.log('   - isMock:', detailRes?.isMock);
  console.log('   - Status:', detailRes?.status);
  console.log('   - Amount:', detailRes?.amount);
  console.log('   - Payment URL:', detailRes?.paymentUrl);

  if (detailRes?.status !== 'unpaid') {
    console.error('   [FAIL] Status tagihan tidak sesuai:', detailRes?.status);
    process.exit(1);
  }

  console.log('   [PASS] Status tagihan terverifikasi sinkron dengan Mayar Sandbox!');
  console.log('\n====================================================');
  console.log('SEMUA UJI COBA SANDBOX REAL MAYAR BERHASIL (100% SUKSES)');
  console.log('====================================================');
}

runRealTest().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
