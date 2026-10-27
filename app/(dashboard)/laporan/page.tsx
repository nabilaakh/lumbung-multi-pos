'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  getReportDashboardData,
  ReportKpi,
  PaymentBreakdown,
  TopProductItem,
  DailySalesItem,
  ShiftVarianceAuditItem,
  ProfitMetrics,
  ReportTransactionRecord,
} from '@/lib/services/report-service';
import { Cabang } from '@/types/database';
import { KpiSummaryCards } from '@/components/reports/KpiSummaryCards';
import { SalesBarChart } from '@/components/reports/SalesBarChart';
import { PaymentDonutChart } from '@/components/reports/PaymentDonutChart';
import { TopProductsChart } from '@/components/reports/TopProductsChart';
import { CashVarianceTable } from '@/components/reports/CashVarianceTable';
import { ProfitSection } from '@/components/reports/ProfitSection';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Building2,
  Calendar,
  RefreshCw,
  FileSpreadsheet,
  Download,
  FileText,
  ChevronDown,
} from 'lucide-react';
import {
  exportTransactionsToCsv,
  exportShiftVariancesToCsv,
} from '@/lib/utils/csv-export';

export default function LaporanPage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<{ id: string; peran: string; cabang_id: string | null } | null>(null);
  const [branches, setBranches] = useState<Cabang[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('all');

  // Date filters
  const [datePreset, setDatePreset] = useState<'today' | '7days' | '30days' | 'all'>('30days');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Dashboard Data State
  const [kpi, setKpi] = useState<ReportKpi>({
    totalRevenue: 0,
    totalTransactions: 0,
    averageOrderValue: 0,
    voidCount: 0,
    voidAmount: 0,
  });
  const [paymentSplit, setPaymentSplit] = useState<PaymentBreakdown>({
    tunaiAmount: 0,
    tunaiCount: 0,
    tunaiPercentage: 0,
    qrisAmount: 0,
    qrisCount: 0,
    qrisPercentage: 0,
  });
  const [topProducts, setTopProducts] = useState<TopProductItem[]>([]);
  const [dailyTrend, setDailyTrend] = useState<DailySalesItem[]>([]);
  const [shiftVariances, setShiftVariances] = useState<ShiftVarianceAuditItem[]>([]);
  const [profitMetrics, setProfitMetrics] = useState<ProfitMetrics | null>(null);
  const [transactions, setTransactions] = useState<ReportTransactionRecord[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState<string | null>(null);

  // Set date preset helper
  const handleDatePreset = (preset: 'today' | '7days' | '30days' | 'all') => {
    setDatePreset(preset);
    const now = new Date();

    if (preset === 'today') {
      const todayStr = now.toISOString().split('T')[0];
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === '7days') {
      const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      setStartDate(past.toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    } else if (preset === '30days') {
      const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      setStartDate(past.toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    } else {
      setStartDate('');
      setEndDate('');
    }
  };

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setIsLoading(false);
        return;
      }

      const { data: prof } = await supabase
        .from('profiles')
        .select('id, peran, cabang_id')
        .eq('id', user.id)
        .single();

      if (prof) {
        setProfile(prof);
      }

      const { data: branchData } = await supabase
        .from('cabang')
        .select('*')
        .order('kode');
      setBranches((branchData as Cabang[]) || []);

      // If user is kepala_toko, lock to their branch
      const effectiveBranchId =
        prof?.peran === 'kepala_toko' ? prof.cabang_id : selectedBranch;

      const data = await getReportDashboardData({
        cabangId: effectiveBranchId,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        userRole: prof?.peran,
      });

      setKpi(data.kpi);
      setPaymentSplit(data.paymentSplit);
      setTopProducts(data.topProducts);
      setDailyTrend(data.dailyTrend);
      setShiftVariances(data.shiftVariances);
      setProfitMetrics(data.profitMetrics);
      setTransactions(data.transactions || []);
    } catch (err) {
      console.error('Error loading report dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, selectedBranch, startDate, endDate]);

  useEffect(() => {
    handleDatePreset('30days');
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const userRole = profile?.peran || 'kasir';
  const isOwner = userRole === 'owner';
  const branchName = branches.find((b) => b.id === profile?.cabang_id)?.nama || 'Cabang Saya';

  // Branch map for quick lookup
  const branchMap = useMemo(() => {
    const map = new Map<string, { kode: string; nama: string }>();
    branches.forEach((b) => map.set(b.id, { kode: b.kode, nama: b.nama }));
    return map;
  }, [branches]);

  const activeBranchName =
    selectedBranch === 'all'
      ? 'Semua Cabang'
      : branches.find((b) => b.id === selectedBranch)?.nama || 'Cabang';

  const effectiveExportBranchName =
    profile?.peran === 'kepala_toko' ? branchName : activeBranchName;

  const handleExportTransactions = () => {
    if (transactions.length === 0) {
      alert('Tidak ada data transaksi yang dapat diekspor pada rentang filter ini.');
      return;
    }
    setIsExporting('transactions');
    try {
      exportTransactionsToCsv(transactions, branchMap, {
        branchName: effectiveExportBranchName,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        datePreset,
      });
    } catch (err) {
      console.error('Failed to export transactions CSV:', err);
    } finally {
      setTimeout(() => setIsExporting(null), 600);
    }
  };

  const handleExportShiftAudit = () => {
    if (shiftVariances.length === 0) {
      alert('Tidak ada data audit kas shift yang dapat diekspor pada rentang filter ini.');
      return;
    }
    setIsExporting('shifts');
    try {
      exportShiftVariancesToCsv(shiftVariances, {
        branchName: effectiveExportBranchName,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        datePreset,
      });
    } catch (err) {
      console.error('Failed to export shift variances CSV:', err);
    } finally {
      setTimeout(() => setIsExporting(null), 600);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Laporan & Analitik Penjualan
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Pemantauan omzet, kinerja kasir, transaksi QRIS vs tunai, dan metrik profitabilitas bisnis.
          </p>
        </div>
      </div>

      {/* Filter Bar Container */}
      <div className="rounded-xl border border-border/60 bg-card p-3 shadow-xs flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Branch filter */}
          {isOwner ? (
            <div className="w-[200px]">
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger className="h-10 text-sm rounded-xl">
                  <SelectValue placeholder="Semua Cabang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Cabang (Konsolidasi)</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.kode} - {b.nama}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-muted/40 px-3 h-10 rounded-xl text-xs font-medium text-foreground border border-border/60">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              <span>Cabang: {branchName}</span>
            </div>
          )}

          {/* Date presets */}
          <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl border border-border/60 text-xs">
            <button
              type="button"
              onClick={() => handleDatePreset('today')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                datePreset === 'today'
                  ? 'bg-card text-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Hari Ini
            </button>
            <button
              type="button"
              onClick={() => handleDatePreset('7days')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                datePreset === '7days'
                  ? 'bg-card text-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              7 Hari
            </button>
            <button
              type="button"
              onClick={() => handleDatePreset('30days')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                datePreset === '30days'
                  ? 'bg-card text-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              30 Hari
            </button>
            <button
              type="button"
              onClick={() => handleDatePreset('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                datePreset === 'all'
                  ? 'bg-card text-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Semua
            </button>
          </div>
        </div>

        {/* Custom date range inputs, Refresh, and Export button */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <Input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setDatePreset('all');
              }}
              className="h-10 text-sm w-36 bg-background/50 rounded-xl"
            />
            <span className="text-muted-foreground">-</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setDatePreset('all');
              }}
              className="h-10 text-sm w-36 bg-background/50 rounded-xl"
            />
          </div>

          <Button
            variant="outline"
            onClick={loadData}
            disabled={isLoading}
            className="h-10 px-3 text-sm rounded-xl"
          >
            <RefreshCw className={`w-4 h-4 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          {/* Export Dropdown Button */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                disabled={isLoading || isExporting !== null}
                className="h-10 px-3.5 text-sm rounded-xl border-border/80 bg-background hover:bg-muted font-medium gap-1.5"
              >
                {isExporting ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                ) : (
                  <Download className="w-4 h-4 text-primary" />
                )}
                <span>{isExporting ? 'Mengekspor...' : 'Ekspor CSV'}</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-60 ml-0.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem
                onClick={handleExportTransactions}
                className="cursor-pointer gap-2 text-xs py-2"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <div className="flex flex-col">
                  <span className="font-semibold text-foreground">Transaksi Penjualan</span>
                  <span className="text-[10px] text-muted-foreground">
                    {transactions.length} baris data
                  </span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleExportShiftAudit}
                className="cursor-pointer gap-2 text-xs py-2"
              >
                <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <div className="flex flex-col">
                  <span className="font-semibold text-foreground">Audit Kas Shift (BR-10)</span>
                  <span className="text-[10px] text-muted-foreground">
                    {shiftVariances.length} baris data
                  </span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* KPI Cards */}
      <KpiSummaryCards kpi={kpi} />

      {/* Owner-only Profit Section (BR-11, TC-18) */}
      <ProfitSection profitMetrics={profitMetrics} userRole={userRole} />

      {/* Charts Row 1: Daily Trend & Payment Method */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <SalesBarChart dailyTrend={dailyTrend} />
        </div>
        <div>
          <PaymentDonutChart paymentSplit={paymentSplit} />
        </div>
      </div>

      {/* Charts Row 2: Top Products & Cash Variance Audit */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <TopProductsChart topProducts={topProducts} />
        </div>
        <div>
          <CashVarianceTable shiftVariances={shiftVariances} />
        </div>
      </div>
    </div>
  );
}
