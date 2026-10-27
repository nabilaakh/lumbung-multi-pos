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
    <Card className="border-primary/20 shadow-sm bg-gradient-to-br from-primary/5 via-card to-primary/5 overflow-hidden">
      <CardHeader className="pb-3 border-b border-border flex flex-row items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-bold text-foreground">
              Analisis Laba Kotor & Margin Bisnis
            </CardTitle>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Kalkulasi profitabilitas bersih berdasarkan riwayat harga modal HPP (BR-11).
          </p>
        </div>

        <Badge className="bg-primary/10 text-primary border-primary/20 text-xs gap-1 py-1 font-semibold">
          <Lock className="w-3 h-3 text-primary" />
          Khusus Owner (BR-11)
        </Badge>
      </CardHeader>

      <CardContent className="pt-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Revenue */}
          <div className="bg-card p-3.5 rounded-xl border border-border space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Pendapatan Penjualan
            </span>
            <div className="text-lg font-bold font-mono text-foreground">
              Rp {profitMetrics.totalRevenue.toLocaleString('id-ID')}
            </div>
            <span className="text-[10px] text-muted-foreground">Total subtotal produk lunas</span>
          </div>

          {/* HPP (COGS) */}
          <div className="bg-card p-3.5 rounded-xl border border-border space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Scale className="w-3.5 h-3.5 text-muted-foreground" />
              Total HPP (Modal)
            </span>
            <div className="text-lg font-bold font-mono text-foreground">
              Rp {profitMetrics.totalHpp.toLocaleString('id-ID')}
            </div>
            <span className="text-[10px] text-muted-foreground">Beban pokok pengadaan</span>
          </div>

          {/* Gross Profit */}
          <div className="bg-emerald-50/70 dark:bg-emerald-950/25 p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-900 space-y-1">
            <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-200 uppercase tracking-wider flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Laba Kotor (Gross Profit)
            </span>
            <div className="text-xl font-bold font-mono text-emerald-900 dark:text-emerald-100">
              Rp {profitMetrics.grossProfit.toLocaleString('id-ID')}
            </div>
            <span className="text-[10px] text-emerald-700 dark:text-emerald-300">Omzet dikurangi HPP</span>
          </div>

          {/* Profit Margin */}
          <div className="bg-primary/10 p-3.5 rounded-xl border border-primary/20 space-y-1">
            <span className="text-[11px] font-bold text-primary uppercase tracking-wider flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-primary" />
              Margin Laba Kotor
            </span>
            <div className="text-2xl font-bold text-primary">
              {profitMetrics.profitMarginPercent.toFixed(1)}%
            </div>
            <span className="text-[10px] text-muted-foreground">
              Rasio efisiensi profitabilitas
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
