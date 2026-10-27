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
    <Card className="border-border shadow-sm bg-card overflow-hidden">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-primary" />
            Audit Rekonsiliasi & Selisih Kas Shift (BR-10)
          </CardTitle>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Shift kasir dengan selisih kas fisik vs sistem. Selisih di atas Rp 20.000 ditandai merah.
          </p>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 border-b border-border/60 hover:bg-muted/40">
                <TableHead className="py-3.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Waktu Tutup</TableHead>
                <TableHead className="py-3.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Kasir</TableHead>
                <TableHead className="py-3.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cabang</TableHead>
                <TableHead className="py-3.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Kas Sistem</TableHead>
                <TableHead className="py-3.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Kas Fisik</TableHead>
                <TableHead className="py-3.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Selisih Kas</TableHead>
                <TableHead className="py-3.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shiftVariances.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-sm text-muted-foreground">
                    Belum ada data shift yang ditutup.
                  </TableCell>
                </TableRow>
              ) : (
                shiftVariances.map((s) => {
                  const isHigh = isHighCashVariance(s.selisih);

                  return (
                    <TableRow
                      key={s.id}
                      className="border-b border-border/40 hover:bg-muted/30 transition-colors py-3 px-4 text-sm"
                    >
                      <TableCell className="py-3 px-4 font-mono text-xs text-muted-foreground whitespace-nowrap">
                        {s.waktu_tutup
                          ? new Date(s.waktu_tutup).toLocaleDateString('id-ID', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'Belum Tutup'}
                      </TableCell>
                      <TableCell className="py-3 px-4 font-medium text-foreground">
                        {s.kasir_nama}
                      </TableCell>
                      <TableCell className="py-3 px-4 font-semibold text-foreground">
                        {s.cabang_kode}
                      </TableCell>
                      <TableCell className="py-3 px-4 text-right font-mono text-foreground">
                        Rp {s.kas_seharusnya.toLocaleString('id-ID')}
                      </TableCell>
                      <TableCell className="py-3 px-4 text-right font-mono text-foreground font-semibold">
                        {s.kas_aktual !== null
                          ? `Rp ${s.kas_aktual.toLocaleString('id-ID')}`
                          : '-'}
                      </TableCell>
                      <TableCell className="py-3 px-4 text-right whitespace-nowrap">
                        {s.selisih !== null ? (
                          <span
                            className={`font-mono text-xs font-bold px-2 py-0.5 rounded-full ${
                              isHigh
                                ? 'text-destructive bg-destructive/10'
                                : s.selisih === 0
                                ? 'text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-950/30'
                                : 'text-primary bg-primary/10'
                            }`}
                          >
                            {s.selisih > 0 ? '+' : ''}
                            {s.selisih.toLocaleString('id-ID')}
                          </span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="py-3 px-4 text-center">
                        {isHigh ? (
                          <Badge variant="destructive" className="font-medium text-xs px-2.5 py-0.5 rounded-full">
                            Penyimpangan &gt; 20k
                          </Badge>
                        ) : s.status === 'diverifikasi' ? (
                          <Badge variant="success" className="font-medium text-xs px-2.5 py-0.5 rounded-full">
                            Diverifikasi
                          </Badge>
                        ) : (
                          <Badge variant="warning" className="font-medium text-xs px-2.5 py-0.5 rounded-full">
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
