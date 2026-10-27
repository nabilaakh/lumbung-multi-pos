'use client';

import React, { useState, useMemo } from 'react';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ShiftSupervisionItem,
  isHighCashVariance,
  formatVarianceDisplay,
} from '@/lib/services/stock-service';
import { VerifyShiftModal } from './VerifyShiftModal';
import { LoadingState } from '@/components/ui/loading-state';
import {
  ShieldCheck,
  AlertTriangle,
  Building2,
  RefreshCw,
  Clock,
  Eye,
  CheckCircle2,
} from 'lucide-react';

interface BranchShiftTableProps {
  shiftList: ShiftSupervisionItem[];
  userRole: string;
  userCabangId?: string | null;
  cabangList: { id: string; kode: string; nama: string }[];
  onRefresh: () => void;
  loading?: boolean;
}

export function BranchShiftTable({
  shiftList,
  userRole,
  userCabangId,
  cabangList,
  onRefresh,
  loading = false,
}: BranchShiftTableProps) {
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedCabang, setSelectedCabang] = useState<string>(
    userRole === 'kepala_toko' && userCabangId ? userCabangId : 'all'
  );
  const [highVarianceOnly, setHighVarianceOnly] = useState(false);
  const [selectedShiftForDetail, setSelectedShiftForDetail] = useState<ShiftSupervisionItem | null>(
    null
  );

  const filteredShifts = useMemo(() => {
    return shiftList.filter((shift) => {
      // Cabang filter
      if (selectedCabang !== 'all' && shift.cabang_id !== selectedCabang) {
        return false;
      }

      // Status filter
      if (selectedStatus !== 'all' && shift.status !== selectedStatus) {
        return false;
      }

      // High variance filter
      if (highVarianceOnly && !isHighCashVariance(shift.selisih)) {
        return false;
      }

      return true;
    });
  }, [shiftList, selectedCabang, selectedStatus, highVarianceOnly]);

  const pendingVerificationCount = useMemo(() => {
    return shiftList.filter((s) => s.status === 'ditutup').length;
  }, [shiftList]);

  const highVarianceCount = useMemo(() => {
    return shiftList.filter((s) => isHighCashVariance(s.selisih)).length;
  }, [shiftList]);

  return (
    <div className="space-y-4">
      {/* Alert Banners */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {pendingVerificationCount > 0 && (
          <div className="bg-amber-50 dark:bg-amber-950/25 border border-amber-200 dark:border-amber-900 rounded-xl p-3 flex items-center justify-between text-amber-900 dark:text-amber-200 shadow-sm">
            <div className="flex items-center gap-2.5">
              <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <div>
                <div className="text-xs font-bold">Shift Menunggu Verifikasi (BR-10)</div>
                <div className="text-[11px] text-amber-800 dark:text-amber-300">
                  Ada <strong>{pendingVerificationCount} shift</strong> yang ditutup kasir dan menunggu persetujuan.
                </div>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedStatus(selectedStatus === 'ditutup' ? 'all' : 'ditutup')}
              className={`text-[11px] h-7 border-amber-300 dark:border-amber-800 font-semibold ${
                selectedStatus === 'ditutup'
                  ? 'bg-amber-600 text-white hover:bg-amber-700'
                  : 'text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/40'
              }`}
            >
              {selectedStatus === 'ditutup' ? 'Tampilkan Semua' : 'Filter Menunggu'}
            </Button>
          </div>
        )}

        {highVarianceCount > 0 && (
          <div className="bg-rose-50 dark:bg-rose-950/25 border border-rose-200 dark:border-rose-900 rounded-xl p-3 flex items-center justify-between text-rose-900 dark:text-rose-200 shadow-sm">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
              <div>
                <div className="text-xs font-bold">Selisih Kas Melebihi Rp 20.000</div>
                <div className="text-[11px] text-rose-800 dark:text-rose-300">
                  Ditemukan <strong>{highVarianceCount} shift</strong> dengan selisih kas fisik tinggi.
                </div>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setHighVarianceOnly(!highVarianceOnly)}
              className={`text-[11px] h-7 border-rose-300 dark:border-rose-800 font-semibold ${
                highVarianceOnly
                  ? 'bg-rose-600 text-white hover:bg-rose-700'
                  : 'text-rose-800 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-950/40'
              }`}
            >
              {highVarianceOnly ? 'Tampilkan Semua' : 'Filter Selisih Tinggi'}
            </Button>
          </div>
        )}
      </div>

      {/* Filter and Action Bar Container */}
      <div className="rounded-xl border border-border/60 bg-card p-3 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {/* Status select */}
          <div className="w-[200px]">
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="h-10 text-sm rounded-xl">
                <SelectValue placeholder="Status Shift" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status Shift</SelectItem>
                <SelectItem value="ditutup">Menunggu Verifikasi</SelectItem>
                <SelectItem value="diverifikasi">Sudah Diverifikasi</SelectItem>
                <SelectItem value="buka">Masih Aktif (Buka)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Branch selector */}
          {userRole === 'owner' ? (
            <div className="w-[180px]">
              <Select value={selectedCabang} onValueChange={setSelectedCabang}>
                <SelectTrigger className="h-10 text-sm rounded-xl">
                  <SelectValue placeholder="Semua Cabang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Cabang</SelectItem>
                  {cabangList.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.kode} - {c.nama}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-muted/40 px-3 h-10 rounded-xl text-xs font-medium text-foreground border border-border/60">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              <span>Cabang: {cabangList.find((c) => c.id === userCabangId)?.nama || 'Cabang Saya'}</span>
            </div>
          )}
        </div>

        <Button
          variant="outline"
          onClick={onRefresh}
          disabled={loading}
          className="h-10 px-3 text-sm rounded-xl"
        >
          <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Shift Table */}
      <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 border-b border-border/60 hover:bg-muted/40">
              <TableHead className="py-3.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Waktu Buka</TableHead>
              <TableHead className="py-3.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Kasir</TableHead>
              <TableHead className="py-3.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cabang</TableHead>
              <TableHead className="py-3.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Kas Awal</TableHead>
              <TableHead className="py-3.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Penjualan Tunai</TableHead>
              <TableHead className="py-3.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Kas Fisik</TableHead>
              <TableHead className="py-3.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Selisih Kas</TableHead>
              <TableHead className="py-3.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">Status</TableHead>
              <TableHead className="py-3.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="p-0">
                  <LoadingState label="Memuat data shift cabang..." />
                </TableCell>
              </TableRow>
            ) : filteredShifts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12 text-sm text-muted-foreground">
                  Tidak ada data shift yang sesuai dengan filter.
                </TableCell>
              </TableRow>
            ) : (
              filteredShifts.map((shift) => {
                const isHighVariance = isHighCashVariance(shift.selisih);

                return (
                  <TableRow
                    key={shift.id}
                    className="border-b border-border/40 hover:bg-muted/30 transition-colors py-3 px-4 text-sm"
                  >
                    <TableCell className="py-3 px-4 font-mono text-xs text-foreground whitespace-nowrap">
                      {new Date(shift.waktu_buka).toLocaleDateString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                      })}{' '}
                      {new Date(shift.waktu_buka).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </TableCell>
                    <TableCell className="py-3 px-4 font-medium text-foreground">
                      {shift.kasir?.nama_lengkap || 'Kasir'}
                    </TableCell>
                    <TableCell className="py-3 px-4 text-xs text-foreground font-semibold">
                      {shift.cabang?.kode}
                    </TableCell>
                    <TableCell className="py-3 px-4 text-right font-mono text-muted-foreground">
                      Rp {shift.kas_awal.toLocaleString('id-ID')}
                    </TableCell>
                    <TableCell className="py-3 px-4 text-right font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                      Rp {shift.total_penjualan_tunai.toLocaleString('id-ID')}
                    </TableCell>
                    <TableCell className="py-3 px-4 text-right font-mono text-foreground font-semibold">
                      {shift.kas_aktual !== null
                        ? `Rp ${shift.kas_aktual.toLocaleString('id-ID')}`
                        : '-'}
                    </TableCell>
                    <TableCell className="py-3 px-4 text-right whitespace-nowrap">
                      {shift.selisih !== null ? (
                        <span
                          className={`font-mono text-xs font-bold px-2 py-0.5 rounded-full ${
                            isHighVariance
                              ? 'text-destructive bg-destructive/10'
                              : shift.selisih === 0
                              ? 'text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-950/30'
                              : 'text-primary bg-primary/10'
                          }`}
                        >
                          {shift.selisih > 0 ? '+' : ''}
                          {shift.selisih.toLocaleString('id-ID')}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell className="py-3 px-4 text-center">
                      <Badge
                        variant={
                          shift.status === 'diverifikasi'
                            ? 'success'
                            : shift.status === 'ditutup'
                            ? 'warning'
                            : 'default'
                        }
                        className="font-medium text-xs px-2.5 py-0.5 rounded-full"
                      >
                        {shift.status === 'ditutup' ? 'Menunggu' : shift.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3 px-4 text-right">
                      {shift.status === 'ditutup' && (userRole === 'owner' || userRole === 'kepala_toko') ? (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setSelectedShiftForDetail(shift)}
                          title="Verifikasi Shift"
                          className="h-8 w-8 rounded-md text-primary hover:bg-primary/10"
                        >
                          <ShieldCheck className="h-4 w-4" />
                          <span className="sr-only">Verifikasi</span>
                        </Button>
                      ) : (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setSelectedShiftForDetail(shift)}
                          title="Lihat Detail Shift"
                          className="h-8 w-8 rounded-md text-muted-foreground hover:text-foreground"
                        >
                          <Eye className="h-4 w-4" />
                          <span className="sr-only">Detail</span>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Verify / Detail Modal */}
      <VerifyShiftModal
        isOpen={!!selectedShiftForDetail}
        onClose={() => setSelectedShiftForDetail(null)}
        shift={selectedShiftForDetail}
        onSuccess={() => {
          onRefresh();
          setSelectedShiftForDetail(null);
        }}
        userRole={userRole}
        userCabangId={userCabangId}
      />
    </div>
  );
}
