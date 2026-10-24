'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TopProductItem } from '@/lib/services/report-service';
import { Award, Flame } from 'lucide-react';

interface TopProductsChartProps {
  topProducts: TopProductItem[];
}

export function TopProductsChart({ topProducts }: TopProductsChartProps) {
  if (topProducts.length === 0) {
    return (
      <Card className="border-border shadow-sm bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
            <Award className="w-4 h-4 text-primary" />
            10 Produk Terlaris
          </CardTitle>
        </CardHeader>
        <CardContent className="h-48 flex items-center justify-center text-xs text-muted-foreground">
          Belum ada produk terjual pada periode ini.
        </CardContent>
      </Card>
    );
  }

  const maxQty = Math.max(...topProducts.map((p) => p.totalJumlah), 1);

  return (
    <Card className="border-border shadow-sm bg-card overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
          <Award className="w-4 h-4 text-primary" />
          10 Produk Terlaris
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
          {topProducts.map((product, idx) => {
            const percent = Math.round((product.totalJumlah / maxQty) * 100);
            const isTop3 = idx < 3;

            return (
              <div key={product.produk_id || idx} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        idx === 0
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : idx === 1
                          ? 'bg-muted-foreground/30 text-foreground'
                          : idx === 2
                          ? 'bg-primary/80 text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <span className="font-semibold text-foreground truncate max-w-[160px]">
                      {product.nama_produk}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="font-bold text-foreground font-mono">
                      {product.totalJumlah} <span className="font-sans font-normal text-[11px] text-muted-foreground">unit</span>
                    </span>
                    <span className="text-[10px] text-muted-foreground block font-mono">
                      Rp {product.totalSubtotal.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${percent}%` }}
                    className={`h-full rounded-full transition-all ${
                      isTop3 ? 'bg-primary' : 'bg-muted-foreground/50'
                    }`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
