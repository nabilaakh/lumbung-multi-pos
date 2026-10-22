import { createClient } from '@/lib/supabase/client';

export interface ReportTransactionRecord {
  id: string;
  cabang_id: string;
  total: number;
  subtotal: number;
  diskon: number;
  metode_bayar: string;
  status: string;
  dibuat_pada: string;
}

export interface ReportTransactionItem {
  id: string;
  transaksi_id: string;
  produk_id: string;
  nama_produk: string;
  jumlah: number;
  harga_satuan: number;
  subtotal: number;
}

export interface CostReference {
  produk_id: string;
  harga_modal: number;
}

export interface ReportKpi {
  totalRevenue: number;
  totalTransactions: number;
  averageOrderValue: number;
  voidCount: number;
  voidAmount: number;
}

export interface PaymentBreakdown {
  tunaiAmount: number;
  tunaiCount: number;
  tunaiPercentage: number;
  qrisAmount: number;
  qrisCount: number;
  qrisPercentage: number;
}

export interface TopProductItem {
  produk_id: string;
  nama_produk: string;
  totalJumlah: number;
  totalSubtotal: number;
}

export interface DailySalesItem {
  date: string;
  revenue: number;
  count: number;
}

export interface ShiftVarianceAuditItem {
  id: string;
  waktu_buka: string;
  waktu_tutup: string | null;
  kasir_nama: string;
  cabang_kode: string;
  kas_seharusnya: number;
  kas_aktual: number | null;
  selisih: number | null;
  status: string;
}

export interface ProfitMetrics {
  totalRevenue: number;
  totalHpp: number;
  grossProfit: number;
  profitMarginPercent: number;
}

/**
 * Aggregate summary KPIs from transaction records
 */
export function calculateReportKpi(transactions: ReportTransactionRecord[]): ReportKpi {
  let totalRevenue = 0;
  let totalTransactions = 0;
  let voidCount = 0;
  let voidAmount = 0;

  for (const trx of transactions) {
    if (trx.status === 'lunas') {
      totalRevenue += trx.total;
      totalTransactions += 1;
    } else if (trx.status === 'void') {
      voidCount += 1;
      voidAmount += trx.total;
    }
  }

  const averageOrderValue =
    totalTransactions > 0 ? Math.round(totalRevenue / totalTransactions) : 0;

  return {
    totalRevenue,
    totalTransactions,
    averageOrderValue,
    voidCount,
    voidAmount,
  };
}

/**
 * Calculate payment method split (Cash vs QRIS)
 */
export function calculatePaymentBreakdown(
  transactions: ReportTransactionRecord[]
): PaymentBreakdown {
  let tunaiAmount = 0;
  let tunaiCount = 0;
  let qrisAmount = 0;
  let qrisCount = 0;

  for (const trx of transactions) {
    if (trx.status !== 'lunas') continue;

    if (trx.metode_bayar === 'tunai') {
      tunaiAmount += trx.total;
      tunaiCount += 1;
    } else if (trx.metode_bayar === 'qris') {
      qrisAmount += trx.total;
      qrisCount += 1;
    }
  }

  const grandTotal = tunaiAmount + qrisAmount;
  const tunaiPercentage =
    grandTotal > 0 ? Math.round((tunaiAmount / grandTotal) * 100) : 0;
  const qrisPercentage =
    grandTotal > 0 ? Math.round((qrisAmount / grandTotal) * 100) : 0;

  return {
    tunaiAmount,
    tunaiCount,
    tunaiPercentage,
    qrisAmount,
    qrisCount,
    qrisPercentage,
  };
}

/**
 * Calculate top selling products ranking
 */
export function calculateTopProducts(
  items: ReportTransactionItem[],
  validTransactionIds: Set<string>
): TopProductItem[] {
  const map = new Map<string, { nama_produk: string; totalJumlah: number; totalSubtotal: number }>();

  for (const item of items) {
    if (!validTransactionIds.has(item.transaksi_id)) continue;

    const existing = map.get(item.produk_id);
    if (existing) {
      existing.totalJumlah += item.jumlah;
      existing.totalSubtotal += item.subtotal;
    } else {
      map.set(item.produk_id, {
        nama_produk: item.nama_produk,
        totalJumlah: item.jumlah,
        totalSubtotal: item.subtotal,
      });
    }
  }

  const result: TopProductItem[] = [];
  map.forEach((val, produk_id) => {
    result.push({
      produk_id,
      nama_produk: val.nama_produk,
      totalJumlah: val.totalJumlah,
      totalSubtotal: val.totalSubtotal,
    });
  });

  result.sort((a, b) => b.totalJumlah - a.totalJumlah);
  return result.slice(0, 10);
}

/**
 * BR-11, TC-18: Calculate Gross Profit & Margin strictly protected for Owner.
 * If user role is NOT 'owner', this always returns null.
 */
export function calculateProfitMetrics(
  items: ReportTransactionItem[],
  validTransactionIds: Set<string>,
  costPrices: CostReference[],
  role?: string
): ProfitMetrics | null {
  if (role !== 'owner') {
    return null;
  }

  const costMap = new Map<string, number>();
  for (const cp of costPrices) {
    costMap.set(cp.produk_id, cp.harga_modal);
  }

  let totalRevenue = 0;
  let totalHpp = 0;

  for (const item of items) {
    if (!validTransactionIds.has(item.transaksi_id)) continue;

    totalRevenue += item.subtotal;
    const unitHpp = costMap.get(item.produk_id) || 0;
    totalHpp += unitHpp * item.jumlah;
  }

  const grossProfit = totalRevenue - totalHpp;
  const profitMarginPercent =
    totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

  return {
    totalRevenue,
    totalHpp,
    grossProfit,
    profitMarginPercent,
  };
}

/**
 * Calculate daily sales trend for chart
 */
export function calculateDailySalesTrend(
  transactions: ReportTransactionRecord[]
): DailySalesItem[] {
  const map = new Map<string, { revenue: number; count: number }>();

  for (const trx of transactions) {
    if (trx.status !== 'lunas') continue;
    const dateStr = trx.dibuat_pada.split('T')[0];

    const current = map.get(dateStr) || { revenue: 0, count: 0 };
    current.revenue += trx.total;
    current.count += 1;
    map.set(dateStr, current);
  }

  const result: DailySalesItem[] = [];
  map.forEach((val, date) => {
    result.push({
      date,
      revenue: val.revenue,
      count: val.count,
    });
  });

  result.sort((a, b) => a.date.localeCompare(b.date));
  return result;
}

/**
 * Fetch comprehensive report data
 */
export async function getReportDashboardData(options: {
  cabangId?: string | null;
  startDate?: string;
  endDate?: string;
  userRole?: string;
}): Promise<{
  kpi: ReportKpi;
  paymentSplit: PaymentBreakdown;
  topProducts: TopProductItem[];
  dailyTrend: DailySalesItem[];
  shiftVariances: ShiftVarianceAuditItem[];
  profitMetrics: ProfitMetrics | null;
}> {
  const supabase = createClient();
  const { cabangId, startDate, endDate, userRole } = options;

  // 1. Query Transaksi
  let trxQuery = supabase
    .from('transaksi')
    .select('id, cabang_id, total, subtotal, diskon, metode_bayar, status, dibuat_pada')
    .order('dibuat_pada', { ascending: true });

  if (cabangId && cabangId !== 'all') {
    trxQuery = trxQuery.eq('cabang_id', cabangId);
  }
  if (startDate) {
    trxQuery = trxQuery.gte('dibuat_pada', `${startDate}T00:00:00Z`);
  }
  if (endDate) {
    trxQuery = trxQuery.lte('dibuat_pada', `${endDate}T23:59:59Z`);
  }

  const { data: transactions, error: trxErr } = await trxQuery;
  if (trxErr) {
    console.error('Error fetching report transactions:', trxErr);
    throw trxErr;
  }

  const trxList = (transactions as ReportTransactionRecord[]) || [];
  const validTrxIds = new Set(
    trxList.filter((t) => t.status === 'lunas').map((t) => t.id)
  );

  // 2. Query Transaksi Items for top products and profit
  let itemsList: ReportTransactionItem[] = [];
  if (trxList.length > 0) {
    const trxIds = trxList.map((t) => t.id);
    const { data: items, error: itemsErr } = await supabase
      .from('transaksi_item')
      .select('id, transaksi_id, produk_id, nama_produk, jumlah, harga_satuan, subtotal')
      .in('transaksi_id', trxIds);

    if (!itemsErr && items) {
      itemsList = items as ReportTransactionItem[];
    }
  }

  // 3. Query Shift Kasir for Variance Audit
  let shiftQuery = supabase
    .from('shift_kasir')
    .select(`
      id,
      dibuka_pada,
      ditutup_pada,
      kas_seharusnya,
      uang_fisik,
      selisih,
      status,
      profiles:profiles!shift_kasir_kasir_id_fkey (nama_lengkap),
      cabang:cabang_id (kode)
    `)
    .not('selisih', 'is', null)
    .order('dibuka_pada', { ascending: false })
    .limit(20);

  if (cabangId && cabangId !== 'all') {
    shiftQuery = shiftQuery.eq('cabang_id', cabangId);
  }

  const { data: shiftData } = await shiftQuery;
  const shiftVariances: ShiftVarianceAuditItem[] = ((shiftData as any[]) || []).map((s) => ({
    id: s.id,
    waktu_buka: s.dibuka_pada,
    waktu_tutup: s.ditutup_pada,
    kasir_nama: s.profiles?.nama_lengkap || 'Kasir',
    cabang_kode: s.cabang?.kode || '-',
    kas_seharusnya: s.kas_seharusnya,
    kas_aktual: s.uang_fisik,
    selisih: s.selisih,
    status: s.status,
  }));

  // 4. If Owner, fetch cost prices for profit metrics (BR-11)
  let profitMetrics: ProfitMetrics | null = null;
  if (userRole === 'owner') {
    const { data: costs } = await supabase
      .from('riwayat_harga_modal')
      .select('produk_id, harga_modal')
      .order('berlaku_mulai', { ascending: false });

    // Pick latest cost per product
    const latestCostMap = new Map<string, number>();
    (costs || []).forEach((c) => {
      if (!latestCostMap.has(c.produk_id)) {
        latestCostMap.set(c.produk_id, c.harga_modal);
      }
    });

    const costRefs: CostReference[] = [];
    latestCostMap.forEach((harga_modal, produk_id) => {
      costRefs.push({ produk_id, harga_modal });
    });

    profitMetrics = calculateProfitMetrics(itemsList, validTrxIds, costRefs, userRole);
  }

  const kpi = calculateReportKpi(trxList);
  const paymentSplit = calculatePaymentBreakdown(trxList);
  const topProducts = calculateTopProducts(itemsList, validTrxIds);
  const dailyTrend = calculateDailySalesTrend(trxList);

  return {
    kpi,
    paymentSplit,
    topProducts,
    dailyTrend,
    shiftVariances,
    profitMetrics,
  };
}
