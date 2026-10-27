'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ReportKpi } from '@/lib/services/report-service';
import { DollarSign, ShoppingBag, TrendingUp, AlertOctagon } from 'lucide-react';

interface KpiSummaryCardsProps {
  kpi: ReportKpi;
}

export function KpiSummaryCards({ kpi }: KpiSummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Total Revenue */}
      <Card className="rounded-xl border border-border bg-card p-5 shadow-xs">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Omzet Penjualan
            </span>
            <div className="text-xl font-bold text-foreground">
              Rp {kpi.totalRevenue.toLocaleString('id-ID')}
            </div>
            <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
              Dari {kpi.totalTransactions} transaksi lunas
            </span>
          </div>
          <div className="h-9 w-9 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900 flex items-center justify-center shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
      </Card>

      {/* 2. Total Transactions */}
      <Card className="rounded-xl border border-border bg-card p-5 shadow-xs">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Transaksi
            </span>
            <div className="text-xl font-bold text-foreground">
              {kpi.totalTransactions} <span className="text-xs font-normal text-muted-foreground">Struk</span>
            </div>
            <span className="text-xs text-muted-foreground">
              Status lunas terverifikasi
            </span>
          </div>
          <div className="h-9 w-9 p-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900 flex items-center justify-center shrink-0">
            <ShoppingBag className="w-5 h-5" />
          </div>
        </div>
      </Card>

      {/* 3. Average Order Value */}
      <Card className="rounded-xl border border-border bg-card p-5 shadow-xs">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Rata-rata Keranjang (AOV)
            </span>
            <div className="text-xl font-bold text-foreground">
              Rp {kpi.averageOrderValue.toLocaleString('id-ID')}
            </div>
            <span className="text-xs text-muted-foreground">
              Per transaksi berhasil
            </span>
          </div>
          <div className="h-9 w-9 p-2 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </Card>

      {/* 4. Void Transactions */}
      <Card className="rounded-xl border border-border bg-card p-5 shadow-xs">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Pembatalan (Void)
            </span>
            <div className="text-xl font-bold text-rose-700 dark:text-rose-400">
              {kpi.voidCount} <span className="text-xs font-normal text-muted-foreground">Transaksi</span>
            </div>
            <span className="text-xs text-rose-600 dark:text-rose-400 font-medium">
              Nilai: Rp {kpi.voidAmount.toLocaleString('id-ID')}
            </span>
          </div>
          <div className="h-9 w-9 p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900 flex items-center justify-center shrink-0">
            <AlertOctagon className="w-5 h-5" />
          </div>
        </div>
      </Card>
    </div>
  );
}
