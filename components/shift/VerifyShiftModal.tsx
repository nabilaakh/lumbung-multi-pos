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
      <DialogContent className="sm:max-w-lg bg-white border border-slate-200">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <DialogTitle className="text-base font-bold text-slate-800">
                Supervisi Rekonsiliasi Shift
              </DialogTitle>
            </div>
            {shift.status === 'diverifikasi' ? (
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-xs">
                Terverifikasi
              </Badge>
            ) : shift.status === 'ditutup' ? (
              <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-xs">
                Menunggu Verifikasi
              </Badge>
            ) : (
              <Badge className="bg-blue-100 text-blue-800 border-blue-300 text-xs">
                Shift Aktif (Buka)
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-500">
            Pemeriksaan selisih kas fisik vs sistem sebelum disetujui (BR-10 & BR-12).
          </p>
        </DialogHeader>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {/* High Variance Alert */}
        {isHighVariance && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-lg text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">Selisih Kas Melebihi Toleransi (BR-10)</div>
              <div>
                Selisih kas sebesar{' '}
                <strong className="font-mono text-rose-900">
                  Rp {Math.abs(shift.selisih || 0).toLocaleString('id-ID')}
                </strong>{' '}
                melampaui batas toleransi normal Rp 20.000. Periksa catatan kasir di bawah sebelum verifikasi.
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3.5 text-xs">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div>
              <span className="text-slate-400 block text-[11px]">Kasir</span>
              <span className="font-bold text-slate-800 flex items-center gap-1.5 mt-0.5">
                <User className="w-3.5 h-3.5 text-slate-500" />
                {shift.kasir?.nama_lengkap || 'Kasir'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Cabang</span>
              <span className="font-bold text-slate-800 mt-0.5 block">
                {shift.cabang?.kode} - {shift.cabang?.nama}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Waktu Buka</span>
              <span className="font-mono text-slate-700 flex items-center gap-1.5 mt-0.5">
                <Clock className="w-3 h-3 text-slate-400" />
                {new Date(shift.waktu_buka).toLocaleString('id-ID')}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Waktu Tutup</span>
              <span className="font-mono text-slate-700 mt-0.5 block">
                {shift.waktu_tutup
                  ? new Date(shift.waktu_tutup).toLocaleString('id-ID')
                  : 'Belum ditutup'}
              </span>
            </div>
          </div>

          {/* Cash Reconciliation Calculation */}
          <div className="border border-slate-200 rounded-lg p-3 space-y-2">
            <h5 className="font-bold text-slate-700 text-xs border-b pb-1.5">
              Rincian Rekonsiliasi Kas
            </h5>
            <div className="flex justify-between items-center text-slate-600">
              <span>Kas Awal Modal:</span>
              <span className="font-mono font-semibold">
                Rp {shift.kas_awal.toLocaleString('id-ID')}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span className="flex items-center gap-1">
                <DollarSign className="w-3 h-3 text-emerald-600" /> Penjualan Tunai:
              </span>
              <span className="font-mono font-semibold text-emerald-700">
                +Rp {shift.total_penjualan_tunai.toLocaleString('id-ID')}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span className="flex items-center gap-1">
                <QrCode className="w-3 h-3 text-blue-600" /> Penjualan QRIS:
              </span>
              <span className="font-mono font-semibold text-blue-700">
                Rp {shift.total_penjualan_qris.toLocaleString('id-ID')}
              </span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t font-semibold text-slate-800">
              <span>Kas Seharusnya (Tunai):</span>
              <span className="font-mono">
                Rp {shift.kas_seharusnya.toLocaleString('id-ID')}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-800">
              <span>Kas Fisik Dihitung Kasir:</span>
              <span className="font-mono font-bold text-slate-900">
                {shift.kas_aktual !== null
                  ? `Rp ${shift.kas_aktual.toLocaleString('id-ID')}`
                  : 'Belum dihitung'}
              </span>
            </div>

            {shift.selisih !== null && (
              <div
                className={`flex justify-between items-center pt-2 border-t font-bold ${
                  isHighVariance
                    ? 'text-rose-700 bg-rose-50/60 p-2 rounded'
                    : shift.selisih === 0
                    ? 'text-emerald-700 bg-emerald-50/60 p-2 rounded'
                    : 'text-amber-800 bg-amber-50/60 p-2 rounded'
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
            <div className="bg-amber-50/50 p-2.5 rounded-lg border border-amber-200">
              <span className="text-[11px] font-bold text-amber-900 flex items-center gap-1 mb-1">
                <FileText className="w-3.5 h-3.5 text-amber-600" />
                Catatan Kasir Saat Tutup Shift:
              </span>
              <p className="text-xs text-amber-950 italic pl-4">
                &ldquo;{shift.catatan_tutup}&rdquo;
              </p>
            </div>
          )}

          {/* Verification section */}
          {shift.status === 'diverifikasi' ? (
            <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Shift Telah Diverifikasi
              </div>
              <div className="text-[11px] text-emerald-900">
                Diverifikasi oleh: <strong>{shift.verifikator?.nama_lengkap || 'Kepala Toko'}</strong>
                {shift.diverifikasi_pada && (
                  <span> pada {new Date(shift.diverifikasi_pada).toLocaleString('id-ID')}</span>
                )}
              </div>
              {shift.catatan_verifikasi && (
                <div className="text-[11px] text-emerald-950 pt-1">
                  Catatan Verifikasi: <em>{shift.catatan_verifikasi}</em>
                </div>
              )}
            </div>
          ) : canVerify ? (
            <form onSubmit={handleVerify} className="space-y-3 pt-2 border-t">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">
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
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
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
