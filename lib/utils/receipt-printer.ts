import type { CheckoutRPCResponse } from '@/lib/services/checkout-service';

export interface ReceiptData {
  namaCabang: string;
  alamatCabang: string;
  nomorStruk: string;
  waktu: string;
  namaKasir: string;
  items: Array<{
    nama_produk: string;
    jumlah: number;
    harga_satuan: number;
    subtotal: number;
  }>;
  subtotal: number;
  diskon: number;
  alasanDiskon?: string | null;
  total: number;
  metodeBayar: string;
  uangDiterima: number;
  kembalian: number;
}

export function generateReceiptHtml(receipt: ReceiptData): string {
  const formatRupiah = (val: number) => `Rp${Math.round(val).toLocaleString('id-ID')}`;

  const itemsRows = receipt.items
    .map(
      (it) => `
      <div style="margin-bottom: 4px;">
        <div style="font-weight: 600;">${it.nama_produk}</div>
        <div style="display: flex; justify-content: space-between; font-size: 11px;">
          <span>${it.jumlah} x ${formatRupiah(it.harga_satuan)}</span>
          <span>${formatRupiah(it.subtotal)}</span>
        </div>
      </div>
    `
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Struk Pembayaran - ${receipt.nomorStruk}</title>
        <style>
          @page {
            size: 58mm auto;
            margin: 0;
          }
          body {
            font-family: 'Courier New', Courier, monospace;
            width: 58mm;
            margin: 0 auto;
            padding: 8px;
            font-size: 12px;
            color: #000;
            line-height: 1.3;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .bold { font-weight: bold; }
          .divider { border-top: 1px dashed #000; margin: 6px 0; }
          .flex-between { display: flex; justify-content: space-between; }
        </style>
      </head>
      <body>
        <div class="text-center">
          <div class="bold" style="font-size: 14px;">LUMBUNG KOPI DAN ROTI</div>
          <div style="font-size: 10px;">${receipt.namaCabang}</div>
          <div style="font-size: 9px;">${receipt.alamatCabang}</div>
        </div>
        <div class="divider"></div>
        <div style="font-size: 10px;">
          <div>No: ${receipt.nomorStruk}</div>
          <div>Tgl: ${receipt.waktu}</div>
          <div>Kasir: ${receipt.namaKasir}</div>
        </div>
        <div class="divider"></div>
        ${itemsRows}
        <div class="divider"></div>
        <div class="flex-between">
          <span>Subtotal</span>
          <span>${formatRupiah(receipt.subtotal)}</span>
        </div>
        ${
          receipt.diskon > 0
            ? `
        <div class="flex-between">
          <span>Diskon ${receipt.alasanDiskon ? `(${receipt.alasanDiskon})` : ''}</span>
          <span>-${formatRupiah(receipt.diskon)}</span>
        </div>`
            : ''
        }
        <div class="flex-between bold" style="font-size: 13px; margin: 4px 0;">
          <span>TOTAL</span>
          <span>${formatRupiah(receipt.total)}</span>
        </div>
        <div class="flex-between" style="font-size: 11px;">
          <span>Bayar (${receipt.metodeBayar.toUpperCase()})</span>
          <span>${formatRupiah(receipt.uangDiterima)}</span>
        </div>
        <div class="flex-between" style="font-size: 11px;">
          <span>Kembalian</span>
          <span>${formatRupiah(receipt.kembalian)}</span>
        </div>
        <div class="divider"></div>
        <div class="text-center" style="font-size: 10px; margin-top: 8px;">
          <div>Terima kasih atas kunjungan Anda</div>
          <div>Nikmati Kopi & Roti Hangat Kami</div>
        </div>
      </body>
    </html>
  `;
}

export function printReceiptWindow(receipt: ReceiptData) {
  const html = generateReceiptHtml(receipt);
  const printWindow = window.open('', '_blank', 'width=350,height=600');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  }
}
