import { describe, it, expect } from 'vitest';
import {
  escapeCsvCell,
  generateCsv,
  formatExportFilename,
  formatLocalTimestamp,
  type CsvColumn,
} from '@/lib/utils/csv-export';

describe('CSV Export Utility (lib/utils/csv-export.ts)', () => {
  describe('escapeCsvCell', () => {
    it('returns empty string for null and undefined', () => {
      expect(escapeCsvCell(null)).toBe('');
      expect(escapeCsvCell(undefined)).toBe('');
    });

    it('returns plain strings and numbers as-is', () => {
      expect(escapeCsvCell('Kopi Susu')).toBe('Kopi Susu');
      expect(escapeCsvCell(15000)).toBe('15000');
      expect(escapeCsvCell(0)).toBe('0');
    });

    it('escapes cells containing commas by wrapping in double quotes', () => {
      expect(escapeCsvCell('Tebet, Jakarta Selatan')).toBe('"Tebet, Jakarta Selatan"');
    });

    it('escapes cells containing double quotes by doubling them and wrapping in quotes', () => {
      expect(escapeCsvCell('Ukuran "Large"')).toBe('"Ukuran ""Large"""');
    });

    it('escapes cells containing newlines', () => {
      expect(escapeCsvCell('Baris 1\nBaris 2')).toBe('"Baris 1\nBaris 2"');
      expect(escapeCsvCell('Baris 1\r\nBaris 2')).toBe('"Baris 1\r\nBaris 2"');
    });
  });

  describe('generateCsv', () => {
    interface TestData {
      id: string;
      nama: string;
      harga: number;
    }

    const testCols: CsvColumn<TestData>[] = [
      { header: 'ID', accessor: (d) => d.id },
      { header: 'Nama Produk', accessor: (d) => d.nama },
      { header: 'Harga (Rp)', accessor: (d) => d.harga },
    ];

    it('prepends UTF-8 BOM (\\uFEFF) and sep=,\\r\\n directive to the output string', () => {
      const csv = generateCsv([], testCols);
      expect(csv.startsWith('\uFEFFsep=,\r\n')).toBe(true);
    });

    it('generates correct header and data rows separated by \\r\\n with sep=, directive', () => {
      const items: TestData[] = [
        { id: '1', nama: 'Kopi Susu', harga: 18000 },
        { id: '2', nama: 'Roti Bakar, Cokelat', harga: 22000 },
      ];

      const csv = generateCsv(items, testCols);
      const lines = csv.slice(1).split('\r\n'); // strip BOM

      expect(lines).toHaveLength(4);
      expect(lines[0]).toBe('sep=,');
      expect(lines[1]).toBe('ID,Nama Produk,Harga (Rp)');
      expect(lines[2]).toBe('1,Kopi Susu,18000');
      expect(lines[3]).toBe('2,"Roti Bakar, Cokelat",22000');
    });
  });

  describe('formatExportFilename', () => {
    it('formats dynamic filename for single date', () => {
      const filename = formatExportFilename('penjualan', 'Cabang Tebet', {
        startDate: '2026-10-27',
        endDate: '2026-10-27',
      });
      expect(filename).toBe('laporan-penjualan-cabang-tebet-2026-10-27.csv');
    });

    it('formats dynamic filename for date range', () => {
      const filename = formatExportFilename('penjualan', 'Semua Cabang', {
        startDate: '2026-10-01',
        endDate: '2026-10-27',
      });
      expect(filename).toBe('laporan-penjualan-semua-cabang-2026-10-01-sd-2026-10-27.csv');
    });

    it('formats dynamic filename for presets when dates not set', () => {
      const filename = formatExportFilename('audit-kas-shift', 'TBT', {
        datePreset: '30days',
      });
      expect(filename).toBe('laporan-audit-kas-shift-tbt-30days.csv');
    });

    it('cleans special characters in branch names', () => {
      const filename = formatExportFilename('penjualan', 'Cabang BTR (Bintaro #2)!', {
        datePreset: 'today',
      });
      expect(filename).toBe('laporan-penjualan-cabang-btr-bintaro-2-today.csv');
    });
  });

  describe('formatLocalTimestamp', () => {
    it('formats valid ISO date string properly', () => {
      const result = formatLocalTimestamp('2026-10-27T08:30:00Z');
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
      expect(result).toContain('2026');
    });

    it('handles invalid date strings gracefully', () => {
      expect(formatLocalTimestamp('invalid-date')).toBe('invalid-date');
    });
  });
});
