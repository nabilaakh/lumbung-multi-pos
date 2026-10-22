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
      <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Omzet Penjualan
            </span>
            <div className="text-xl font-bold font-serif text-slate-900">
              Rp {kpi.totalRevenue.toLocaleString('id-ID')}
            </div>
            <span className="text-[11px] text-emerald-700 font-medium">
              Dari {kpi.totalTransactions} transaksi lunas
            </span>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600 border border-emerald-100">
            <DollarSign className="w-5 h-5" />
          </div>
        </CardContent>
      </Card>

      {/* 2. Total Transactions */}
      <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Transaksi
            </span>
            <div className="text-xl font-bold font-serif text-slate-900">
              {kpi.totalTransactions} <span className="text-xs font-normal text-slate-500 font-sans">Struk</span>
            </div>
            <span className="text-[11px] text-slate-500">
              Status lunas terverifikasi
            </span>
          </div>
          <div className="p-3 bg-blue-50 rounded-xl text-blue-600 border border-blue-100">
            <ShoppingBag className="w-5 h-5" />
          </div>
        </CardContent>
      </Card>

      {/* 3. Average Order Value */}
      <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Rata-rata Keranjang (AOV)
            </span>
            <div className="text-xl font-bold font-serif text-slate-900">
              Rp {kpi.averageOrderValue.toLocaleString('id-ID')}
            </div>
            <span className="text-[11px] text-slate-500">
              Per transaksi berhasil
            </span>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl text-amber-600 border border-amber-100">
            <TrendingUp className="w-5 h-5" />
          </div>
        </CardContent>
      </Card>

      {/* 4. Void Transactions */}
      <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Pembatalan (Void)
            </span>
            <div className="text-xl font-bold font-serif text-rose-700">
              {kpi.voidCount} <span className="text-xs font-normal text-slate-500 font-sans">Transaksi</span>
            </div>
            <span className="text-[11px] text-rose-600 font-medium">
              Nilai: Rp {kpi.voidAmount.toLocaleString('id-ID')}
            </span>
          </div>
          <div className="p-3 bg-rose-50 rounded-xl text-rose-600 border border-rose-100">
            <AlertOctagon className="w-5 h-5" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
