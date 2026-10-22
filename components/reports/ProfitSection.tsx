'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProfitMetrics } from '@/lib/services/report-service';
import { Lock, DollarSign, TrendingUp, Sparkles, Scale } from 'lucide-react';

interface ProfitSectionProps {
  profitMetrics: ProfitMetrics | null;
  userRole: string;
}

export function ProfitSection({ profitMetrics, userRole }: ProfitSectionProps) {
  // BR-11, TC-18: strictly guarded on both server and client
  if (userRole !== 'owner' || !profitMetrics) {
    return null;
  }

  return (
    <Card className="border-amber-200 shadow-sm bg-gradient-to-br from-amber-50/60 via-white to-amber-50/30 overflow-hidden">
      <CardHeader className="pb-3 border-b border-amber-100 flex flex-row items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-700" />
            <CardTitle className="text-base font-bold text-slate-900 font-serif">
              Analisis Laba Kotor & Margin Bisnis
            </CardTitle>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Kalkulasi profitabilitas bersih berdasarkan riwayat harga modal HPP (BR-11).
          </p>
        </div>

        <Badge className="bg-amber-100 text-amber-950 border-amber-300 text-xs gap-1 py-1 font-semibold">
          <Lock className="w-3 h-3 text-amber-700" />
          Khusus Owner (BR-11)
        </Badge>
      </CardHeader>

      <CardContent className="pt-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Revenue */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Pendapatan Penjualan
            </span>
            <div className="text-lg font-bold font-mono text-slate-800">
              Rp {profitMetrics.totalRevenue.toLocaleString('id-ID')}
            </div>
            <span className="text-[10px] text-slate-400">Total subtotal produk lunas</span>
          </div>

          {/* HPP (COGS) */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Scale className="w-3.5 h-3.5 text-slate-400" />
              Total HPP (Modal)
            </span>
            <div className="text-lg font-bold font-mono text-slate-700">
              Rp {profitMetrics.totalHpp.toLocaleString('id-ID')}
            </div>
            <span className="text-[10px] text-slate-400">Beban pokok pengadaan</span>
          </div>

          {/* Gross Profit */}
          <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-200 space-y-1">
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
              Laba Kotor (Gross Profit)
            </span>
            <div className="text-xl font-bold font-mono text-emerald-900">
              Rp {profitMetrics.grossProfit.toLocaleString('id-ID')}
            </div>
            <span className="text-[10px] text-emerald-700">Omzet dikurangi HPP</span>
          </div>

          {/* Profit Margin */}
          <div className="bg-amber-100/60 p-3.5 rounded-xl border border-amber-300 space-y-1">
            <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-amber-700" />
              Margin Laba Kotor
            </span>
            <div className="text-2xl font-bold font-serif text-amber-950">
              {profitMetrics.profitMarginPercent.toFixed(1)}%
            </div>
            <span className="text-[10px] text-amber-800">
              Rasio efisiensi profitabilitas
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
