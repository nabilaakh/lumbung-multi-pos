/**
 * lib/services/mayar-service.ts
 * Helper layanan Mayar API V2 (Sandbox) dengan mekanisme Mock/Fallback otomatis.
 */

const MAYAR_SANDBOX_BASE_URL =
  process.env.MAYAR_BASE_URL || 'https://api.mayar.io/hl/v2';

export interface MayarInvoiceItem {
  description: string;
  quantity: number;
  rate: number;
}

export interface CreateInvoiceParams {
  amount: number;
  invoiceNumber: string;
  customerName?: string;
  customerEmail?: string;
  customerMobile?: string;
  description: string;
  items: MayarInvoiceItem[];
}

export interface MayarInvoiceResponse {
  isMock: boolean;
  invoiceId: string;
  paymentUrl: string;
  qrCodeUrl: string;
  status: 'unpaid' | 'paid' | 'expired' | 'closed';
  expiredAt: string; // ISO string 10 menit dari pembuatan
}

export interface MayarInvoiceDetail {
  isMock: boolean;
  invoiceId: string;
  status: 'unpaid' | 'paid' | 'expired' | 'closed';
  amount: number;
  paymentUrl: string;
}

// In-Memory store untuk mock invoice saat sandbox Mayar belum terhubung
// Key: invoiceId, Value: { status, amount, expiredAt }
const mockInvoiceStore = new Map<
  string,
  {
    status: 'unpaid' | 'paid' | 'expired' | 'closed';
    amount: number;
    expiredAt: number; // timestamp ms
  }
>();

/**
 * Deteksi apakah sistem berjalan dalam Mock Mode.
 * Aktif jika MAYAR_API_KEY tidak disetel, kosong, atau bernilai dummy/mock.
 */
export function isMayarMockMode(): boolean {
  const apiKey = process.env.MAYAR_API_KEY;
  if (!apiKey || apiKey.trim() === '') return true;
  const lower = apiKey.toLowerCase();
  return (
    lower.includes('dummy') ||
    lower.includes('mock') ||
    lower.includes('placeholder') ||
    lower.includes('your_api_key')
  );
}

/**
 * Buat data URL QR Code SVG mock yang valid untuk preview di frontend.
 */
function generateMockQrDataUrl(invoiceId: string, amount: number): string {
  // Gunakan QR Server gratis / data URI yang andal
  const qrData = encodeURIComponent(`https://sandbox.mayar.id/inv/${invoiceId}?amt=${amount}`);
  return `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${qrData}`;
}

/**
 * Buat invoice / tagihan QRIS baru via Mayar API (atau Mock).
 */
export async function createMayarInvoice(
  params: CreateInvoiceParams
): Promise<MayarInvoiceResponse> {
  const mock = isMayarMockMode();
  const expiresAtMs = Date.now() + 10 * 60 * 1000; // 10 menit
  const expiredAtIso = new Date(expiresAtMs).toISOString();

  if (mock) {
    const mockInvoiceId = `inv_mock_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const mockPaymentUrl = `https://sandbox.mayar.id/inv/${mockInvoiceId}`;
    const mockQrCodeUrl = generateMockQrDataUrl(mockInvoiceId, params.amount);

    mockInvoiceStore.set(mockInvoiceId, {
      status: 'unpaid',
      amount: params.amount,
      expiredAt: expiresAtMs,
    });

    return {
      isMock: true,
      invoiceId: mockInvoiceId,
      paymentUrl: mockPaymentUrl,
      qrCodeUrl: mockQrCodeUrl,
      status: 'unpaid',
      expiredAt: expiredAtIso,
    };
  }

  // Real Mayar API Call
  const apiKey = process.env.MAYAR_API_KEY!;
  try {
    const response = await fetch(`${MAYAR_SANDBOX_BASE_URL}/invoices/create`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: params.customerName || 'Pelanggan Lumbung POS',
        email: params.customerEmail || 'kasir@lumbungkopi.id',
        mobile: params.customerMobile || '081234567890',
        description: params.description || `Pembayaran POS #${params.invoiceNumber}`,
        items: params.items.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          rate: Math.round(item.rate),
        })),
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.warn('Mayar API error, falling back to mock mode:', errBody);
      // Fallback anggun jika Mayar sandbox sedang down
      return createMayarInvoice({ ...params });
    }

    const resJson = await response.json();
    const data = resJson.data || resJson;

    const invoiceId = data.id || data.invoiceId || data.uuid;
    const paymentUrl =
      data.paymentUrl || data.link || `https://sandbox.mayar.id/inv/${invoiceId}`;
    const qrCodeUrl =
      data.qrCodeUrl ||
      `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(paymentUrl)}`;

    return {
      isMock: false,
      invoiceId,
      paymentUrl,
      qrCodeUrl,
      status: 'unpaid',
      // Sesuai PRD Bagian 11: Tagihan POS dan reservasi stok berlaku tepat 10 menit
      expiredAt: expiredAtIso,
    };
  } catch (error) {
    console.error('Failed to connect to Mayar API, activating fallback mock:', error);
    // Fallback otomatis
    return {
      isMock: true,
      invoiceId: `inv_fallback_${Date.now()}`,
      paymentUrl: `https://sandbox.mayar.id/inv/fallback`,
      qrCodeUrl: generateMockQrDataUrl('fallback', params.amount),
      status: 'unpaid',
      expiredAt: expiredAtIso,
    };
  }
}

/**
 * Dapatkan rincian invoice dan status verifikasi dari Mayar (atau Mock).
 */
export async function getMayarInvoiceDetail(
  invoiceId: string
): Promise<MayarInvoiceDetail | null> {
  const mock = isMayarMockMode();

  if (mock || invoiceId.startsWith('inv_mock_') || invoiceId.startsWith('inv_fallback_')) {
    const item = mockInvoiceStore.get(invoiceId);
    if (!item) {
      return {
        isMock: true,
        invoiceId,
        status: 'unpaid',
        amount: 0,
        paymentUrl: `https://sandbox.mayar.id/inv/${invoiceId}`,
      };
    }

    // Periksa apakah waktu 10 menit sudah kedaluwarsa
    if (Date.now() > item.expiredAt && item.status === 'unpaid') {
      item.status = 'expired';
    }

    return {
      isMock: true,
      invoiceId,
      status: item.status,
      amount: item.amount,
      paymentUrl: `https://sandbox.mayar.id/inv/${invoiceId}`,
    };
  }

  // Real Mayar API Call
  const apiKey = process.env.MAYAR_API_KEY!;
  try {
    const response = await fetch(`${MAYAR_SANDBOX_BASE_URL}/invoices/${invoiceId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      console.error(`Failed to get Mayar invoice ${invoiceId}:`, response.statusText);
      return null;
    }

    const resJson = await response.json();
    const data = resJson.data || resJson;

    let normalizedStatus: 'unpaid' | 'paid' | 'expired' | 'closed' = 'unpaid';
    const rawStatus = (data.status || '').toLowerCase();
    if (rawStatus === 'paid' || rawStatus === 'settled' || rawStatus === 'success') {
      normalizedStatus = 'paid';
    } else if (rawStatus === 'expired') {
      normalizedStatus = 'expired';
    } else if (rawStatus === 'closed' || rawStatus === 'canceled' || rawStatus === 'cancelled') {
      normalizedStatus = 'closed';
    }

    return {
      isMock: false,
      invoiceId,
      status: normalizedStatus,
      amount: data.amount || data.totalAmount || 0,
      paymentUrl: data.link || `https://sandbox.mayar.id/inv/${invoiceId}`,
    };
  } catch (error) {
    console.error('Error fetching Mayar invoice detail:', error);
    return null;
  }
}

/**
 * Utilitas untuk simulasi testing: ubah status mock invoice menjadi 'paid'.
 * Hanya berguna saat pengujian mock secara lokal/sandbox.
 */
export function setMockInvoiceStatus(
  invoiceId: string,
  status: 'unpaid' | 'paid' | 'expired' | 'closed'
): boolean {
  const item = mockInvoiceStore.get(invoiceId);
  if (item) {
    item.status = status;
    return true;
  }
  // Daftarkan jika belum ada
  mockInvoiceStore.set(invoiceId, {
    status,
    amount: 0,
    expiredAt: Date.now() + 10 * 60 * 1000,
  });
  return true;
}
