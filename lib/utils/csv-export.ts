/**
 * Client-side CSV export utility for Lumbung Multi-POS
 * Compliant with RFC 4180 and Microsoft Excel UTF-8 standards.
 */

import { ReportTransactionRecord, ShiftVarianceAuditItem } from '@/lib/services/report-service';

export interface CsvColumn<T> {
  header: string;
  accessor: (item: T, index: number) => unknown;
}

/**
 * Escape a single CSV cell value according to RFC 4180:
 * - Wrap in quotes if it contains commas, double quotes, or newlines
 * - Escape internal double quotes by doubling them (" -> "")
 */
export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Generate a complete CSV string from data array and column specifications.
 * Prepends UTF-8 Byte Order Mark (\uFEFF) for seamless Microsoft Excel compatibility.
 */
export function generateCsv<T>(data: T[], columns: CsvColumn<T>[]): string {
  const headerRow = columns.map((col) => escapeCsvCell(col.header)).join(',');
  const dataRows = data.map((item, idx) =>
    columns.map((col) => escapeCsvCell(col.accessor(item, idx))).join(',')
  );

  const BOM = '\uFEFF';
  const sepDirective = 'sep=,';
  return `${BOM}${sepDirective}\r\n${[headerRow, ...dataRows].join('\r\n')}`;
}

/**
 * Trigger browser file download for CSV content using Blob and object URL.
 */
export function downloadCsv(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Format dynamic filename:
 * `laporan-[tipe]-[nama-cabang]-[rentang-tanggal].csv`
 */
export function formatExportFilename(
  reportType: 'penjualan' | 'audit-kas-shift',
  branchName: string,
  options?: {
    startDate?: string;
    endDate?: string;
    datePreset?: string;
  }
): string {
  const cleanBranch = branchName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'semua-cabang';

  let dateRangeStr = '';
  if (options?.startDate && options?.endDate) {
    if (options.startDate === options.endDate) {
      dateRangeStr = options.startDate;
    } else {
      dateRangeStr = `${options.startDate}-sd-${options.endDate}`;
    }
  } else if (options?.datePreset && options.datePreset !== 'all') {
    dateRangeStr = options.datePreset;
  } else {
    dateRangeStr = 'semua-periode';
  }

  return `laporan-${reportType}-${cleanBranch}-${dateRangeStr}.csv`;
}

/**
 * Format date to Indonesian localized format (e.g. "27 Okt 2026, 14:30")
 */
export function formatLocalTimestamp(isoDateStr: string): string {
  try {
    const d = new Date(isoDateStr);
    if (isNaN(d.getTime())) return isoDateStr;
    return d.toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return isoDateStr;
  }
}

/**
 * Export Transactions to CSV (Laporan Transaksi Penjualan)
 */
export function exportTransactionsToCsv(
  transactions: ReportTransactionRecord[],
  branchMap: Map<string, { kode: string; nama: string }>,
  options: {
    branchName: string;
    startDate?: string;
    endDate?: string;
    datePreset?: string;
  }
): void {
  const columns: CsvColumn<ReportTransactionRecord>[] = [
    {
      header: 'Nomor Transaksi / ID',
      accessor: (t) => t.id,
    },
    {
      header: 'Waktu Transaksi',
      accessor: (t) => formatLocalTimestamp(t.dibuat_pada),
    },
    {
      header: 'Cabang',
      accessor: (t) => {
        const b = branchMap.get(t.cabang_id);
        return b ? `${b.kode} - ${b.nama}` : t.cabang_id;
      },
    },
    {
      header: 'Subtotal (Rp)',
      accessor: (t) => t.subtotal,
    },
    {
      header: 'Diskon (Rp)',
      accessor: (t) => t.diskon,
    },
    {
      header: 'Total Nominal (Rp)',
      accessor: (t) => t.total,
    },
    {
      header: 'Metode Pembayaran',
      accessor: (t) => (t.metode_bayar === 'qris' ? 'QRIS Mayar' : 'Tunai'),
    },
    {
      header: 'Status Transaksi',
      accessor: (t) =>
        t.status === 'lunas'
          ? 'Lunas'
          : t.status === 'void'
          ? 'Void'
          : t.status.charAt(0).toUpperCase() + t.status.slice(1),
    },
  ];

  const csv = generateCsv(transactions, columns);
  const filename = formatExportFilename('penjualan', options.branchName, {
    startDate: options.startDate,
    endDate: options.endDate,
    datePreset: options.datePreset,
  });

  downloadCsv(csv, filename);
}

/**
 * Export Shift Variances to CSV (Laporan Audit Kas Shift - BR-10)
 */
export function exportShiftVariancesToCsv(
  shiftVariances: ShiftVarianceAuditItem[],
  options: {
    branchName: string;
    startDate?: string;
    endDate?: string;
    datePreset?: string;
  }
): void {
  const columns: CsvColumn<ShiftVarianceAuditItem>[] = [
    {
      header: 'ID Shift',
      accessor: (s) => s.id,
    },
    {
      header: 'Waktu Buka',
      accessor: (s) => formatLocalTimestamp(s.waktu_buka),
    },
    {
      header: 'Waktu Tutup',
      accessor: (s) => (s.waktu_tutup ? formatLocalTimestamp(s.waktu_tutup) : 'Belum Ditutup'),
    },
    {
      header: 'Nama Kasir',
      accessor: (s) => s.kasir_nama,
    },
    {
      header: 'Kode Cabang',
      accessor: (s) => s.cabang_kode,
    },
    {
      header: 'Kas Sistem (Rp)',
      accessor: (s) => s.kas_seharusnya,
    },
    {
      header: 'Kas Fisik (Rp)',
      accessor: (s) => (s.kas_aktual !== null ? s.kas_aktual : 0),
    },
    {
      header: 'Selisih Kas (Rp)',
      accessor: (s) => (s.selisih !== null ? s.selisih : 0),
    },
    {
      header: 'Status Shift',
      accessor: (s) =>
        s.status === 'diverifikasi'
          ? 'Diverifikasi'
          : s.status === 'ditutup'
          ? 'Ditutup'
          : 'Buka',
    },
  ];

  const csv = generateCsv(shiftVariances, columns);
  const filename = formatExportFilename('audit-kas-shift', options.branchName, {
    startDate: options.startDate,
    endDate: options.endDate,
    datePreset: options.datePreset,
  });

  downloadCsv(csv, filename);
}
