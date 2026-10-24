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
import { LoadingState } from '@/components/ui/loading-state';
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
          <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-[10px] hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 dark:hover:bg-rose-950/50">
            Void Transaksi
          </Badge>
        );
      case 'penyesuaian_stok':
        return (
          <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] hover:bg-primary/10">
            Penyesuaian Stok
          </Badge>
        );
      case 'verifikasi_shift':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 dark:hover:bg-emerald-950/50">
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
      <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex flex-1 items-center gap-2.5 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Cari pelaku, aksi, atau tabel..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs h-9 bg-muted/50 border-border"
            />
          </div>

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="h-9 px-3 rounded-md border border-border bg-muted/50 text-xs text-foreground font-medium focus:outline-none"
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
          className="text-xs h-9 gap-1.5 text-muted-foreground"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Log
        </Button>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="text-xs font-bold text-muted-foreground">Waktu Kejadian</TableHead>
              <TableHead className="text-xs font-bold text-muted-foreground">Pelaku</TableHead>
              <TableHead className="text-xs font-bold text-muted-foreground">Aksi Sistem (BR-12)</TableHead>
              <TableHead className="text-xs font-bold text-muted-foreground">Tabel Terkait</TableHead>
              <TableHead className="text-xs font-bold text-muted-foreground">Perubahan / Alasan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="p-0">
                  <LoadingState label="Memuat catatan audit log..." />
                </TableCell>
              </TableRow>
            ) : filteredLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-xs text-muted-foreground">
                  Tidak ada catatan audit log yang sesuai.
                </TableCell>
              </TableRow>
            ) : (
              filteredLogs.map((log) => (
                <TableRow key={log.id} className="hover:bg-muted/40 transition-colors">
                  <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(log.dibuat_pada).toLocaleString('id-ID')}
                  </TableCell>
                  <TableCell className="text-xs font-semibold text-foreground">
                    <div>{log.pelaku?.nama_lengkap || 'Sistem / Anon'}</div>
                    <span className="text-[10px] text-muted-foreground uppercase font-mono">
                      {log.pelaku?.peran || '-'}
                    </span>
                  </TableCell>
                  <TableCell>{getActionBadge(log.aksi)}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {log.tabel}
                  </TableCell>
                  <TableCell className="text-xs text-foreground">
                    <div className="space-y-1 font-mono text-[11px]">
                      {log.nilai_sesudah && (
                        <div className="bg-muted/50 p-2 rounded border border-border">
                          {Boolean(log.nilai_sesudah.alasan) && (
                            <div className="text-foreground font-sans font-semibold mb-1">
                              Alasan:{' '}
                              <span className="font-normal italic">
                                &ldquo;{String(log.nilai_sesudah.alasan)}&rdquo;
                              </span>
                            </div>
                          )}
                          {Boolean(log.nilai_sesudah.alasan_void) && (
                            <div className="text-rose-700 dark:text-rose-300 font-sans font-semibold mb-1">
                              Alasan Void:{' '}
                              <span className="font-normal italic">
                                &ldquo;{String(log.nilai_sesudah.alasan_void)}&rdquo;
                              </span>
                            </div>
                          )}
                          <div className="text-muted-foreground text-[10px]">
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
