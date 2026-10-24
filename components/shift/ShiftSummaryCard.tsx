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
    <Card className="border-border shadow-md">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={
                shift.status === 'buka'
                  ? 'bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
                  : shift.status === 'diverifikasi'
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                  : 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
              }
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

      <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-muted/40 border border-border/50">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1">
            <Wallet className="h-4 w-4 text-primary" />
            <span>Kas Awal di Laci</span>
          </div>
          <p className="text-2xl font-bold tracking-tight text-foreground">
            Rp{shift.kas_awal.toLocaleString('id-ID')}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-muted/40 border border-border/50">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1">
            <ArrowDownRight className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>Penjualan Tunai Lunas</span>
          </div>
          <p className="text-2xl font-bold tracking-tight text-emerald-700 dark:text-emerald-400">
            + Rp{totalTunai.toLocaleString('id-ID')}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-muted/40 border border-border/50">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1">
            <CreditCard className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span>Penjualan QRIS Lunas</span>
          </div>
          <p className="text-2xl font-bold tracking-tight text-blue-700 dark:text-blue-400">
            Rp{totalQris.toLocaleString('id-ID')}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-primary/10 border border-primary/30">
          <div className="flex items-center gap-2 text-primary text-xs font-semibold mb-1">
            <CheckCircle2 className="h-4 w-4" />
            <span>Kas Tunai Seharusnya</span>
          </div>
          <p className="text-2xl font-extrabold tracking-tight text-primary">
            Rp{kasSeharusnya.toLocaleString('id-ID')}
          </p>
        </div>

        {isClosed && shift.uang_fisik !== null && (
          <div className="col-span-full grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-border/60">
            <div className="p-3.5 rounded-lg bg-card border">
              <span className="text-xs text-muted-foreground font-medium">Uang Fisik Dihitung:</span>
              <p className="text-lg font-bold text-foreground">
                Rp{(shift.uang_fisik ?? 0).toLocaleString('id-ID')}
              </p>
            </div>
            <div className="p-3.5 rounded-lg bg-card border">
              <span className="text-xs text-muted-foreground font-medium">Selisih Kas:</span>
              <p
                className={`text-lg font-bold ${
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
              <div className="col-span-full p-3.5 rounded-lg bg-muted/60 text-xs text-muted-foreground flex gap-2 items-start">
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
