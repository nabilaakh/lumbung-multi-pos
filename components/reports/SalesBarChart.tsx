'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { DailySalesItem } from '@/lib/services/report-service';
import { BarChart3 } from 'lucide-react';

interface SalesBarChartProps {
  dailyTrend: DailySalesItem[];
}

export function SalesBarChart({ dailyTrend }: SalesBarChartProps) {
  if (dailyTrend.length === 0) {
    return (
      <Card className="border-slate-200 shadow-sm bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-amber-700" />
            Tren Penjualan Harian
          </CardTitle>
        </CardHeader>
        <CardContent className="h-48 flex items-center justify-center text-xs text-slate-400">
          Belum ada data penjualan pada periode ini.
        </CardContent>
      </Card>
    );
  }

  const maxRevenue = Math.max(...dailyTrend.map((d) => d.revenue), 100000);

  return (
    <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-amber-700" />
          Tren Penjualan Harian
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="h-56 flex items-end gap-2 pt-6 pb-2 px-2 border-b border-slate-100 overflow-x-auto">
          {dailyTrend.map((item, idx) => {
            const heightPercent = Math.max(Math.round((item.revenue / maxRevenue) * 100), 4);
            const dateObj = new Date(item.date);
            const formattedDate = dateObj.toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'short',
            });

            return (
              <div
                key={item.date || idx}
                className="flex-1 min-w-[48px] flex flex-col items-center gap-1.5 group relative"
              >
                {/* Tooltip on hover */}
                <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] py-1 px-2 rounded pointer-events-none whitespace-nowrap z-10 shadow-md">
                  <div>Rp {item.revenue.toLocaleString('id-ID')}</div>
                  <div className="text-slate-400">{item.count} transaksi</div>
                </div>

                {/* Amount text above bar */}
                <span className="text-[10px] font-mono text-slate-500 truncate max-w-[48px]">
                  {item.revenue >= 1000000
                    ? `${(item.revenue / 1000000).toFixed(1)}jt`
                    : `${Math.round(item.revenue / 1000)}k`}
                </span>

                {/* Bar */}
                <div className="w-full bg-slate-100 rounded-t-md h-36 flex items-end p-0.5">
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className="w-full bg-amber-600 hover:bg-amber-700 transition-all rounded-t-sm"
                  />
                </div>

                {/* Date label */}
                <span className="text-[10px] text-slate-500 font-medium truncate whitespace-nowrap">
                  {formattedDate}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
