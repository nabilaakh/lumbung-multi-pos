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

      {/* Filter and Action Bar */}
      <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex flex-1 items-center gap-2.5 flex-wrap">
          {/* Status select */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="h-9 px-3 rounded-md border border-border bg-muted/50 text-xs text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">Semua Status Shift</option>
            <option value="ditutup">Menunggu Verifikasi (Ditutup)</option>
            <option value="diverifikasi">Sudah Diverifikasi</option>
            <option value="buka">Masih Aktif (Buka)</option>
          </select>

          {/* Branch selector */}
          {userRole === 'owner' ? (
            <div className="flex items-center gap-1.5 bg-muted/50 px-2.5 py-1 rounded-md border border-border">
              <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
              <select
                value={selectedCabang}
                onChange={(e) => setSelectedCabang(e.target.value)}
                className="bg-transparent text-xs text-foreground font-medium focus:outline-none"
              >
                <option value="all">Semua Cabang</option>
                {cabangList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.kode} - {c.nama}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-muted px-3 py-1.5 rounded-md text-xs font-semibold text-foreground border border-border">
              <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
              Cabang: {cabangList.find((c) => c.id === userCabangId)?.nama || 'Cabang Saya'}
            </div>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={loading}
          className="text-xs h-9 gap-1.5 text-muted-foreground"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Data
        </Button>
      </div>

      {/* Shift Table */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="text-xs font-bold text-muted-foreground">Waktu Buka</TableHead>
              <TableHead className="text-xs font-bold text-muted-foreground">Kasir</TableHead>
              <TableHead className="text-xs font-bold text-muted-foreground">Cabang</TableHead>
              <TableHead className="text-xs font-bold text-muted-foreground text-right">Kas Awal</TableHead>
              <TableHead className="text-xs font-bold text-muted-foreground text-right">Penjualan Tunai</TableHead>
              <TableHead className="text-xs font-bold text-muted-foreground text-right">Kas Fisik</TableHead>
              <TableHead className="text-xs font-bold text-muted-foreground text-right">Selisih Kas</TableHead>
              <TableHead className="text-xs font-bold text-muted-foreground text-center">Status</TableHead>
              <TableHead className="text-xs font-bold text-muted-foreground text-right">Aksi</TableHead>
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
                <TableCell colSpan={9} className="text-center py-8 text-xs text-muted-foreground">
                  Tidak ada data shift yang sesuai dengan filter.
                </TableCell>
              </TableRow>
            ) : (
              filteredShifts.map((shift) => {
                const isHighVariance = isHighCashVariance(shift.selisih);
                const varianceInfo = formatVarianceDisplay(shift.selisih);

                return (
                  <TableRow
                    key={shift.id}
                    className={`hover:bg-muted/40 transition-colors ${
                      isHighVariance ? 'bg-rose-50/30 dark:bg-rose-950/20' : ''
                    }`}
                  >
                    <TableCell className="font-mono text-xs text-foreground whitespace-nowrap">
                      {new Date(shift.waktu_buka).toLocaleDateString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                      })}{' '}
                      {new Date(shift.waktu_buka).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-foreground">
                      {shift.kasir?.nama_lengkap || 'Kasir'}
                    </TableCell>
                    <TableCell className="text-xs text-foreground">
                      <span className="font-bold">{shift.cabang?.kode}</span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-muted-foreground">
                      Rp {shift.kas_awal.toLocaleString('id-ID')}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                      Rp {shift.total_penjualan_tunai.toLocaleString('id-ID')}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-foreground">
                      {shift.kas_aktual !== null
                        ? `Rp ${shift.kas_aktual.toLocaleString('id-ID')}`
                        : '-'}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {shift.selisih !== null ? (
                        <span
                          className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
                            isHighVariance
                              ? 'text-rose-700 bg-rose-100 dark:text-rose-300 dark:bg-rose-950/40'
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
                    <TableCell className="text-center">
                      {shift.status === 'diverifikasi' ? (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 dark:hover:bg-emerald-950/50">
                          Diverifikasi
                        </Badge>
                      ) : shift.status === 'ditutup' ? (
                        <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px] hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 dark:hover:bg-amber-950/50">
                          Menunggu Verifikasi
                        </Badge>
                      ) : (
                        <Badge className="bg-blue-100 text-blue-800 border-blue-300 text-[10px] hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800 dark:hover:bg-blue-950/50">
                          Shift Buka
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant={shift.status === 'ditutup' ? 'default' : 'outline'}
                        onClick={() => setSelectedShiftForDetail(shift)}
                        className="text-xs h-8 font-semibold"
                      >
                        {shift.status === 'ditutup' ? (
                          <>
                            <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                            Verifikasi
                          </>
                        ) : (
                          <>
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            Detail
                          </>
                        )}
                      </Button>
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
