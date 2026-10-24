'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  ShiftSupervisionItem,
  verifyBranchShift,
  validateShiftVerification,
  isHighCashVariance,
  formatVarianceDisplay,
} from '@/lib/services/stock-service';
import {
  ShieldCheck,
  AlertTriangle,
  Clock,
  User,
  DollarSign,
  QrCode,
  FileText,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

interface VerifyShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  shift: ShiftSupervisionItem | null;
  onSuccess: () => void;
  userRole: string;
  userCabangId?: string | null;
}

export function VerifyShiftModal({
  isOpen,
  onClose,
  shift,
  onSuccess,
  userRole,
  userCabangId,
}: VerifyShiftModalProps) {
  const [catatanVerifikasi, setCatatanVerifikasi] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!shift) return null;

  const isHighVariance = isHighCashVariance(shift.selisih);
  const varianceInfo = formatVarianceDisplay(shift.selisih);

  const canVerify =
    shift.status === 'ditutup' &&
    (userRole === 'owner' || (userRole === 'kepala_toko' && shift.cabang_id === userCabangId));

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validation = validateShiftVerification({
      shiftStatus: shift.status,
      userRole,
      userCabangId,
      shiftCabangId: shift.cabang_id,
    });

    if (!validation.valid) {
      setError(validation.error || 'Validasi gagal');
      return;
    }

    try {
      setLoading(true);
      const res = await verifyBranchShift({
        shiftId: shift.id,
        catatanVerifikasi,
      });

      if (!res.success) {
        setError(res.message || 'Gagal memverifikasi shift');
        return;
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan sistem');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <DialogTitle className="text-base font-bold text-foreground">
                Supervisi Rekonsiliasi Shift
              </DialogTitle>
            </div>
            {shift.status === 'diverifikasi' ? (
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-xs dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                Terverifikasi
              </Badge>
            ) : shift.status === 'ditutup' ? (
              <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-xs dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
                Menunggu Verifikasi
              </Badge>
            ) : (
              <Badge className="bg-blue-100 text-blue-800 border-blue-300 text-xs dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800">
                Shift Aktif (Buka)
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Pemeriksaan selisih kas fisik vs sistem sebelum disetujui (BR-10 & BR-12).
          </p>
        </DialogHeader>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive p-3 rounded-lg text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-destructive" />
            <span>{error}</span>
          </div>
        )}

        {/* High Variance Alert */}
        {isHighVariance && (
          <div className="bg-rose-50 dark:bg-rose-950/25 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 p-3 rounded-lg text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">Selisih Kas Melebihi Toleransi (BR-10)</div>
              <div>
                Selisih kas sebesar{' '}
                <strong className="font-mono text-rose-900 dark:text-rose-100">
                  Rp {Math.abs(shift.selisih || 0).toLocaleString('id-ID')}
                </strong>{' '}
                melampaui batas toleransi normal Rp 20.000. Periksa catatan kasir di bawah sebelum verifikasi.
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3.5 text-xs">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-2 bg-muted/50 p-3 rounded-lg border border-border">
            <div>
              <span className="text-muted-foreground block text-[11px]">Kasir</span>
              <span className="font-bold text-foreground flex items-center gap-1.5 mt-0.5">
                <User className="w-3.5 h-3.5 text-muted-foreground" />
                {shift.kasir?.nama_lengkap || 'Kasir'}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">Cabang</span>
              <span className="font-bold text-foreground mt-0.5 block">
                {shift.cabang?.kode} - {shift.cabang?.nama}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">Waktu Buka</span>
              <span className="font-mono text-foreground flex items-center gap-1.5 mt-0.5">
                <Clock className="w-3 h-3 text-muted-foreground" />
                {new Date(shift.waktu_buka).toLocaleString('id-ID')}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">Waktu Tutup</span>
              <span className="font-mono text-foreground mt-0.5 block">
                {shift.waktu_tutup
                  ? new Date(shift.waktu_tutup).toLocaleString('id-ID')
                  : 'Belum ditutup'}
              </span>
            </div>
          </div>

          {/* Cash Reconciliation Calculation */}
          <div className="border border-border rounded-lg p-3 space-y-2">
            <h5 className="font-bold text-foreground text-xs border-b pb-1.5">
              Rincian Rekonsiliasi Kas
            </h5>
            <div className="flex justify-between items-center text-muted-foreground">
              <span>Kas Awal Modal:</span>
              <span className="font-mono font-semibold">
                Rp {shift.kas_awal.toLocaleString('id-ID')}
              </span>
            </div>
            <div className="flex justify-between items-center text-muted-foreground">
              <span className="flex items-center gap-1">
                <DollarSign className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> Penjualan Tunai:
              </span>
              <span className="font-mono font-semibold text-emerald-700 dark:text-emerald-300">
                +Rp {shift.total_penjualan_tunai.toLocaleString('id-ID')}
              </span>
            </div>
            <div className="flex justify-between items-center text-muted-foreground">
              <span className="flex items-center gap-1">
                <QrCode className="w-3 h-3 text-blue-600 dark:text-blue-400" /> Penjualan QRIS:
              </span>
              <span className="font-mono font-semibold text-blue-700 dark:text-blue-300">
                Rp {shift.total_penjualan_qris.toLocaleString('id-ID')}
              </span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t font-semibold text-foreground">
              <span>Kas Seharusnya (Tunai):</span>
              <span className="font-mono">
                Rp {shift.kas_seharusnya.toLocaleString('id-ID')}
              </span>
            </div>
            <div className="flex justify-between items-center text-foreground">
              <span>Kas Fisik Dihitung Kasir:</span>
              <span className="font-mono font-bold text-foreground">
                {shift.kas_aktual !== null
                  ? `Rp ${shift.kas_aktual.toLocaleString('id-ID')}`
                  : 'Belum dihitung'}
              </span>
            </div>

            {shift.selisih !== null && (
              <div
                className={`flex justify-between items-center pt-2 border-t font-bold ${
                  isHighVariance
                    ? 'text-rose-700 bg-rose-50/60 dark:text-rose-300 dark:bg-rose-950/30 p-2 rounded'
                    : shift.selisih === 0
                    ? 'text-emerald-700 bg-emerald-50/60 dark:text-emerald-300 dark:bg-emerald-950/30 p-2 rounded'
                    : 'text-primary bg-primary/10 p-2 rounded'
                }`}
              >
                <span>Selisih Kas ({varianceInfo.label}):</span>
                <span className="font-mono text-sm">
                  {shift.selisih > 0 ? '+' : ''}
                  Rp {shift.selisih.toLocaleString('id-ID')}
                </span>
              </div>
            )}
          </div>

          {/* Kasir Notes */}
          {shift.catatan_tutup && (
            <div className="bg-primary/5 p-2.5 rounded-lg border border-primary/20">
              <span className="text-[11px] font-bold text-foreground flex items-center gap-1 mb-1">
                <FileText className="w-3.5 h-3.5 text-primary" />
                Catatan Kasir Saat Tutup Shift:
              </span>
              <p className="text-xs text-muted-foreground italic pl-4">
                &ldquo;{shift.catatan_tutup}&rdquo;
              </p>
            </div>
          )}

          {/* Verification section */}
          {shift.status === 'diverifikasi' ? (
            <div className="bg-emerald-50 dark:bg-emerald-950/25 p-3 rounded-lg border border-emerald-200 dark:border-emerald-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-emerald-800 dark:text-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Shift Telah Diverifikasi
              </div>
              <div className="text-[11px] text-emerald-900 dark:text-emerald-200">
                Diverifikasi oleh: <strong>{shift.verifikator?.nama_lengkap || 'Kepala Toko'}</strong>
                {shift.diverifikasi_pada && (
                  <span> pada {new Date(shift.diverifikasi_pada).toLocaleString('id-ID')}</span>
                )}
              </div>
              {shift.catatan_verifikasi && (
                <div className="text-[11px] text-emerald-950 dark:text-emerald-100 pt-1">
                  Catatan Verifikasi: <em>{shift.catatan_verifikasi}</em>
                </div>
              )}
            </div>
          ) : canVerify ? (
            <form onSubmit={handleVerify} className="space-y-3 pt-2 border-t">
              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground">
                  Catatan Verifikasi Supervisor (Opsional)
                </label>
                <Input
                  type="text"
                  placeholder="Contoh: Selisih Rp 5.000 sudah diklarifikasi untuk uang kembalian..."
                  value={catatanVerifikasi}
                  onChange={(e) => setCatatanVerifikasi(e.target.value)}
                  className="text-xs h-9"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onClose}
                  disabled={loading}
                  className="text-xs"
                >
                  Tutup
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={loading}
                  className="text-xs gap-1.5"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Memverifikasi...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Verifikasi & Setujui Shift
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          ) : (
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                className="text-xs"
              >
                Tutup
              </Button>
            </DialogFooter>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
