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
      <Card className="border-border shadow-sm bg-card overflow-hidden">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Omzet Penjualan
            </span>
            <div className="text-xl font-bold font-serif text-foreground">
              Rp {kpi.totalRevenue.toLocaleString('id-ID')}
            </div>
            <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
              Dari {kpi.totalTransactions} transaksi lunas
            </span>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900">
            <DollarSign className="w-5 h-5" />
          </div>
        </CardContent>
      </Card>

      {/* 2. Total Transactions */}
      <Card className="border-border shadow-sm bg-card overflow-hidden">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Transaksi
            </span>
            <div className="text-xl font-bold font-serif text-foreground">
              {kpi.totalTransactions} <span className="text-xs font-normal text-muted-foreground font-sans">Struk</span>
            </div>
            <span className="text-[11px] text-muted-foreground">
              Status lunas terverifikasi
            </span>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900">
            <ShoppingBag className="w-5 h-5" />
          </div>
        </CardContent>
      </Card>

      {/* 3. Average Order Value */}
      <Card className="border-border shadow-sm bg-card overflow-hidden">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Rata-rata Keranjang (AOV)
            </span>
            <div className="text-xl font-bold font-serif text-foreground">
              Rp {kpi.averageOrderValue.toLocaleString('id-ID')}
            </div>
            <span className="text-[11px] text-muted-foreground">
              Per transaksi berhasil
            </span>
          </div>
          <div className="p-3 bg-primary/10 rounded-xl text-primary border border-primary/20">
            <TrendingUp className="w-5 h-5" />
          </div>
        </CardContent>
      </Card>

      {/* 4. Void Transactions */}
      <Card className="border-border shadow-sm bg-card overflow-hidden">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Pembatalan (Void)
            </span>
            <div className="text-xl font-bold font-serif text-rose-700 dark:text-rose-400">
              {kpi.voidCount} <span className="text-xs font-normal text-muted-foreground font-sans">Transaksi</span>
            </div>
            <span className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">
              Nilai: Rp {kpi.voidAmount.toLocaleString('id-ID')}
            </span>
          </div>
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900">
            <AlertOctagon className="w-5 h-5" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
