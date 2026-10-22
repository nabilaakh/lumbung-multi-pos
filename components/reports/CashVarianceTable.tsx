'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ShiftVarianceAuditItem } from '@/lib/services/report-service';
import { isHighCashVariance, formatVarianceDisplay } from '@/lib/services/stock-service';
import { ShieldAlert, AlertTriangle } from 'lucide-react';

interface CashVarianceTableProps {
  shiftVariances: ShiftVarianceAuditItem[];
}

export function CashVarianceTable({ shiftVariances }: CashVarianceTableProps) {
  return (
    <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-700" />
            Audit Rekonsiliasi & Selisih Kas Shift (BR-10)
          </CardTitle>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Shift kasir dengan selisih kas fisik vs sistem. Selisih di atas Rp 20.000 ditandai merah.
          </p>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="rounded-lg border border-slate-200 overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="text-xs font-bold text-slate-600">Waktu Tutup</TableHead>
                <TableHead className="text-xs font-bold text-slate-600">Kasir</TableHead>
                <TableHead className="text-xs font-bold text-slate-600">Cabang</TableHead>
                <TableHead className="text-xs font-bold text-slate-600 text-right">Kas Sistem</TableHead>
                <TableHead className="text-xs font-bold text-slate-600 text-right">Kas Fisik</TableHead>
                <TableHead className="text-xs font-bold text-slate-600 text-right">Selisih Kas</TableHead>
                <TableHead className="text-xs font-bold text-slate-600 text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shiftVariances.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6 text-xs text-slate-400">
                    Belum ada data shift yang ditutup.
                  </TableCell>
                </TableRow>
              ) : (
                shiftVariances.map((s) => {
                  const isHigh = isHighCashVariance(s.selisih);
                  const varInfo = formatVarianceDisplay(s.selisih);

                  return (
                    <TableRow
                      key={s.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isHigh ? 'bg-rose-50/40' : ''
                      }`}
                    >
                      <TableCell className="font-mono text-xs text-slate-600 whitespace-nowrap">
                        {s.waktu_tutup
                          ? new Date(s.waktu_tutup).toLocaleDateString('id-ID', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'Belum Tutup'}
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-slate-800">
                        {s.kasir_nama}
                      </TableCell>
                      <TableCell className="font-bold text-xs text-slate-700">
                        {s.cabang_kode}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-slate-700">
                        Rp {s.kas_seharusnya.toLocaleString('id-ID')}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-slate-900 font-semibold">
                        {s.kas_aktual !== null
                          ? `Rp ${s.kas_aktual.toLocaleString('id-ID')}`
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {s.selisih !== null ? (
                          <span
                            className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
                              isHigh
                                ? 'text-rose-700 bg-rose-100'
                                : s.selisih === 0
                                ? 'text-emerald-700 bg-emerald-50'
                                : 'text-amber-800 bg-amber-50'
                            }`}
                          >
                            {s.selisih > 0 ? '+' : ''}
                            {s.selisih.toLocaleString('id-ID')}
                          </span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {isHigh ? (
                          <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-[10px] hover:bg-rose-100">
                            Penyimpangan &gt; 20k
                          </Badge>
                        ) : s.status === 'diverifikasi' ? (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] hover:bg-emerald-100">
                            Diverifikasi
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px] hover:bg-amber-100">
                            {s.status}
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
