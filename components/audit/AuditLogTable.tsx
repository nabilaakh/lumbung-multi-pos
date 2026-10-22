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
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AuditLogEntry } from '@/lib/services/settings-service';
import { Search, ShieldAlert, History, User, RefreshCw } from 'lucide-react';

interface AuditLogTableProps {
  logs: AuditLogEntry[];
  onRefresh: () => void;
  loading?: boolean;
}

export function AuditLogTable({ logs, onRefresh, loading = false }: AuditLogTableProps) {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      if (actionFilter !== 'all' && l.aksi !== actionFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchUser = l.pelaku?.nama_lengkap?.toLowerCase().includes(q);
        const matchAction = l.aksi.toLowerCase().includes(q);
        const matchTable = l.tabel.toLowerCase().includes(q);
        if (!matchUser && !matchAction && !matchTable) return false;
      }
      return true;
    });
  }, [logs, actionFilter, search]);

  const getActionBadge = (aksi: string) => {
    switch (aksi) {
      case 'void_transaksi':
        return (
          <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-[10px] hover:bg-rose-100">
            Void Transaksi
          </Badge>
        );
      case 'penyesuaian_stok':
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px] hover:bg-amber-100">
            Penyesuaian Stok
          </Badge>
        );
      case 'verifikasi_shift':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] hover:bg-emerald-100">
            Verifikasi Shift
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-[10px]">
            {aksi}
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Action Filter */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex flex-1 items-center gap-2.5 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Cari pelaku, aksi, atau tabel..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs h-9 bg-slate-50 border-slate-200"
            />
          </div>

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="h-9 px-3 rounded-md border border-slate-200 bg-slate-50 text-xs text-slate-700 font-medium focus:outline-none"
          >
            <option value="all">Semua Jenis Aksi Audit</option>
            <option value="penyesuaian_stok">Penyesuaian Stok</option>
            <option value="void_transaksi">Void Transaksi</option>
            <option value="verifikasi_shift">Verifikasi Shift</option>
          </select>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={loading}
          className="text-xs h-9 gap-1.5 text-slate-600"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Log
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="text-xs font-bold text-slate-600">Waktu Kejadian</TableHead>
              <TableHead className="text-xs font-bold text-slate-600">Pelaku</TableHead>
              <TableHead className="text-xs font-bold text-slate-600">Aksi Sistem (BR-12)</TableHead>
              <TableHead className="text-xs font-bold text-slate-600">Tabel Terkait</TableHead>
              <TableHead className="text-xs font-bold text-slate-600">Perubahan / Alasan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-xs text-slate-500">
                  Tidak ada catatan audit log yang sesuai.
                </TableCell>
              </TableRow>
            ) : (
              filteredLogs.map((log) => (
                <TableRow key={log.id} className="hover:bg-slate-50/80 transition-colors">
                  <TableCell className="font-mono text-xs text-slate-600 whitespace-nowrap">
                    {new Date(log.dibuat_pada).toLocaleString('id-ID')}
                  </TableCell>
                  <TableCell className="text-xs font-semibold text-slate-800">
                    <div>{log.pelaku?.nama_lengkap || 'Sistem / Anon'}</div>
                    <span className="text-[10px] text-slate-400 uppercase font-mono">
                      {log.pelaku?.peran || '-'}
                    </span>
                  </TableCell>
                  <TableCell>{getActionBadge(log.aksi)}</TableCell>
                  <TableCell className="font-mono text-xs text-slate-500">
                    {log.tabel}
                  </TableCell>
                  <TableCell className="text-xs text-slate-700">
                    <div className="space-y-1 font-mono text-[11px]">
                      {log.nilai_sesudah && (
                        <div className="bg-slate-50 p-2 rounded border border-slate-200">
                          {Boolean(log.nilai_sesudah.alasan) && (
                            <div className="text-slate-800 font-sans font-semibold mb-1">
                              Alasan:{' '}
                              <span className="font-normal italic">
                                &ldquo;{String(log.nilai_sesudah.alasan)}&rdquo;
                              </span>
                            </div>
                          )}
                          {Boolean(log.nilai_sesudah.alasan_void) && (
                            <div className="text-rose-700 font-sans font-semibold mb-1">
                              Alasan Void:{' '}
                              <span className="font-normal italic">
                                &ldquo;{String(log.nilai_sesudah.alasan_void)}&rdquo;
                              </span>
                            </div>
                          )}
                          <div className="text-slate-500 text-[10px]">
                            State: {JSON.stringify(log.nilai_sesudah)}
                          </div>
                        </div>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
