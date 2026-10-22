'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { PaymentBreakdown } from '@/lib/services/report-service';
import { PieChart, DollarSign, QrCode } from 'lucide-react';

interface PaymentDonutChartProps {
  paymentSplit: PaymentBreakdown;
}

export function PaymentDonutChart({ paymentSplit }: PaymentDonutChartProps) {
  const totalAmount = paymentSplit.tunaiAmount + paymentSplit.qrisAmount;

  return (
    <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <PieChart className="w-4 h-4 text-amber-700" />
          Komposisi Metode Pembayaran
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2 space-y-4">
        {totalAmount === 0 ? (
          <div className="h-40 flex items-center justify-center text-xs text-slate-400">
            Belum ada transaksi pembayaran.
          </div>
        ) : (
          <>
            {/* Visual Progress Bar */}
            <div className="space-y-1.5">
              <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                <div
                  style={{ width: `${paymentSplit.tunaiPercentage}%` }}
                  className="bg-emerald-500 hover:bg-emerald-600 transition-all"
                  title={`Tunai: ${paymentSplit.tunaiPercentage}%`}
                />
                <div
                  style={{ width: `${paymentSplit.qrisPercentage}%` }}
                  className="bg-blue-500 hover:bg-blue-600 transition-all"
                  title={`QRIS: ${paymentSplit.qrisPercentage}%`}
                />
              </div>
              <div className="flex justify-between text-[11px] font-semibold">
                <span className="text-emerald-700">Tunai ({paymentSplit.tunaiPercentage}%)</span>
                <span className="text-blue-700">QRIS ({paymentSplit.qrisPercentage}%)</span>
              </div>
            </div>

            {/* Metric Breakdown Cards */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-lg space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                  Tunai / Cash
                </div>
                <div className="font-mono text-sm font-bold text-emerald-950">
                  Rp {paymentSplit.tunaiAmount.toLocaleString('id-ID')}
                </div>
                <div className="text-[10px] text-emerald-700">
                  {paymentSplit.tunaiCount} transaksi ({paymentSplit.tunaiPercentage}%)
                </div>
              </div>

              <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-lg space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-blue-800">
                  <QrCode className="w-3.5 h-3.5 text-blue-600" />
                  QRIS Dinamis
                </div>
                <div className="font-mono text-sm font-bold text-blue-950">
                  Rp {paymentSplit.qrisAmount.toLocaleString('id-ID')}
                </div>
                <div className="text-[10px] text-blue-700">
                  {paymentSplit.qrisCount} transaksi ({paymentSplit.qrisPercentage}%)
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
