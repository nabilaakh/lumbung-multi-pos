import React from 'react';
import type { ShiftKasir } from '@/types/database';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Wallet, CreditCard, ArrowDownRight, FileText, CheckCircle2 } from 'lucide-react';

interface ShiftSummaryCardProps {
  shift: ShiftKasir;
  totalTunaiLive?: number;
  totalQrisLive?: number;
}

export function ShiftSummaryCard({ shift, totalTunaiLive, totalQrisLive }: ShiftSummaryCardProps) {
  const isClosed = shift.status !== 'buka';
  const totalTunai = isClosed ? shift.total_tunai : (totalTunaiLive ?? shift.total_tunai);
  const totalQris = isClosed ? shift.total_qris : (totalQrisLive ?? shift.total_qris);
  const kasSeharusnya = shift.kas_awal + totalTunai;

  const formatDate = (isoString: string | null) => {
    if (!isoString) return '-';
    const date = new Date(isoString);
    return date.toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Card className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
      <CardHeader className="pb-4 border-b border-border/60 bg-muted/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge
              variant={
                shift.status === 'buka'
                  ? 'default'
                  : shift.status === 'diverifikasi'
                  ? 'success'
                  : 'warning'
              }
              className="font-medium text-xs px-2.5 py-0.5 rounded-full"
            >
              {shift.status === 'buka' ? '● Sedang Buka' : shift.status === 'ditutup' ? 'Ditutup (Menunggu Verifikasi)' : 'Diverifikasi'}
            </Badge>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>Dibuka: {formatDate(shift.dibuka_pada)}</span>
          </div>
        </div>
        <CardTitle className="text-xl font-bold mt-2">Ringkasan Sesi Kasir</CardTitle>
        <CardDescription>
          {shift.status === 'buka'
            ? 'Sesi penjualan aktif. Total kas tunai dan QRIS diperbarui otomatis dari transaksi lunas.'
            : `Sesi telah ditutup pada ${formatDate(shift.ditutup_pada)}`}
        </CardDescription>
      </CardHeader>

      <CardContent className="p-5 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Kas Awal */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-xs flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Kas Awal di Laci
              </span>
              <p className="text-xl font-bold tracking-tight text-foreground">
                Rp{shift.kas_awal.toLocaleString('id-ID')}
              </p>
              <span className="text-xs text-muted-foreground">Modal kerja awal</span>
            </div>
            <div className="h-9 w-9 p-2 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Wallet className="h-5 w-5" />
            </div>
          </div>

          {/* Penjualan Tunai */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-xs flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Penjualan Tunai
              </span>
              <p className="text-xl font-bold tracking-tight text-emerald-700 dark:text-emerald-400">
                + Rp{totalTunai.toLocaleString('id-ID')}
              </p>
              <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">Transaksi tunai lunas</span>
            </div>
            <div className="h-9 w-9 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900 flex items-center justify-center shrink-0">
              <ArrowDownRight className="h-5 w-5" />
            </div>
          </div>

          {/* Penjualan QRIS */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-xs flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Penjualan QRIS
              </span>
              <p className="text-xl font-bold tracking-tight text-blue-700 dark:text-blue-400">
                Rp{totalQris.toLocaleString('id-ID')}
              </p>
              <span className="text-xs text-blue-700 dark:text-blue-400 font-medium">Non-tunai rekening</span>
            </div>
            <div className="h-9 w-9 p-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900 flex items-center justify-center shrink-0">
              <CreditCard className="h-5 w-5" />
            </div>
          </div>

          {/* Kas Seharusnya */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 shadow-xs flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                Kas Tunai Seharusnya
              </span>
              <p className="text-xl font-bold tracking-tight text-primary">
                Rp{kasSeharusnya.toLocaleString('id-ID')}
              </p>
              <span className="text-xs text-muted-foreground">Kas awal + tunai</span>
            </div>
            <div className="h-9 w-9 p-2 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
        </div>

        {isClosed && shift.uang_fisik !== null && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border/60">
            <div className="p-4 rounded-xl bg-card border border-border shadow-xs">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Uang Fisik Dihitung</span>
              <p className="text-lg font-bold text-foreground mt-1">
                Rp{(shift.uang_fisik ?? 0).toLocaleString('id-ID')}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-card border border-border shadow-xs">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Selisih Kas</span>
              <p
                className={`text-lg font-bold mt-1 ${
                  (shift.selisih ?? 0) === 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : (shift.selisih ?? 0) < 0
                    ? 'text-destructive'
                    : 'text-primary'
                }`}
              >
                {(shift.selisih ?? 0) > 0 ? '+' : ''}
                Rp{(shift.selisih ?? 0).toLocaleString('id-ID')}
              </p>
            </div>
            {shift.catatan_tutup && (
              <div className="col-span-full p-4 rounded-xl bg-muted/40 border border-border text-xs text-muted-foreground flex gap-2.5 items-start">
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
                <div>
                  <span className="font-semibold text-foreground">Catatan Penutupan Kas: </span>
                  {shift.catatan_tutup}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
