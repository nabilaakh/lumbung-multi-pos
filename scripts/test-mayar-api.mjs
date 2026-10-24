import fs from 'fs';
import path from 'path';

// Baca .env.local
const envContent = fs.readFileSync(path.resolve('.env.local'), 'utf-8');
const envVars = Object.fromEntries(
  envContent
    .split('\n')
    .filter(line => line.trim() && !line.startsWith('#') && line.includes('='))
    .map(line => {
      const idx = line.indexOf('=');
      return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
    })
);

const apiKey = envVars.MAYAR_API_KEY;
const baseUrl = envVars.MAYAR_BASE_URL || 'https://api.mayar.io/hl/v2';

console.log('--- TEST KONEKSI MAYAR API ---');
console.log('Base URL:', baseUrl);
console.log('API Key exists:', !!apiKey);
console.log('API Key length:', apiKey ? apiKey.length : 0);

async function testConnection() {
  try {
    // 1. Cek Balance / Profile
    console.log('\n1. Menguji GET /balance ...');
    const resBalance = await fetch(`${baseUrl}/balance`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });
    console.log('Status GET /balance:', resBalance.status, resBalance.statusText);
    const balanceData = await resBalance.text();
    console.log('Response /balance:', balanceData.slice(0, 300));

    // 2. Cek Buat Invoice
    console.log('\n2. Menguji POST /invoices/create ...');
    const invoicePayload = {
      name: 'Pelanggan Uji Lumbung POS',
      email: 'pelanggan@test.com',
      mobile: '081234567890',
      description: 'Uji Coba Invoice POS Lumbung #' + Date.now(),
      items: [
        {
          description: 'Kopi Susu Lumbung (Test)',
          quantity: 1,
          rate: 22000,
        },
      ],
    };

    const resInvoice = await fetch(`${baseUrl}/invoices/create`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(invoicePayload),
    });

    console.log('Status POST /invoices/create:', resInvoice.status, resInvoice.statusText);
    const invoiceData = await resInvoice.json();
    console.log('Response /invoices/create:', JSON.stringify(invoiceData, null, 2));

    if (invoiceData?.data?.id || invoiceData?.id) {
      const invId = invoiceData?.data?.id || invoiceData?.id;
      console.log('\n3. Menguji GET /invoices/' + invId + ' ...');
      const resDetail = await fetch(`${baseUrl}/invoices/${invId}`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });
      console.log('Status GET detail:', resDetail.status);
      const detailData = await resDetail.json();
      console.log('Detail Invoice:', JSON.stringify(detailData, null, 2));
    }
  } catch (err) {
    console.error('Error saat uji Mayar API:', err);
  }
}

testConnection();
