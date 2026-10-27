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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
          <Badge variant="destructive" className="font-medium text-xs px-2.5 py-0.5 rounded-full">
            Void Transaksi
          </Badge>
        );
      case 'penyesuaian_stok':
        return (
          <Badge variant="default" className="font-medium text-xs px-2.5 py-0.5 rounded-full">
            Penyesuaian Stok
          </Badge>
        );
      case 'verifikasi_shift':
        return (
          <Badge variant="success" className="font-medium text-xs px-2.5 py-0.5 rounded-full">
            Verifikasi Shift
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="font-medium text-xs px-2.5 py-0.5 rounded-full">
            {aksi}
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Action Filter Container */}
      <div className="rounded-xl border border-border/60 bg-card p-3 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input
            type="text"
            placeholder="Cari pelaku, aksi, atau tabel..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-sm h-10 bg-background/50 rounded-xl"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="w-[200px]">
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="h-10 text-sm rounded-xl">
                <SelectValue placeholder="Semua Aksi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Jenis Aksi Audit</SelectItem>
                <SelectItem value="penyesuaian_stok">Penyesuaian Stok</SelectItem>
                <SelectItem value="void_transaksi">Void Transaksi</SelectItem>
                <SelectItem value="verifikasi_shift">Verifikasi Shift</SelectItem>
              </SelectContent>
            </Select>
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
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 border-b border-border/60 hover:bg-muted/40">
              <TableHead className="py-3.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Waktu Kejadian</TableHead>
              <TableHead className="py-3.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pelaku</TableHead>
              <TableHead className="py-3.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Aksi Sistem (BR-12)</TableHead>
              <TableHead className="py-3.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tabel Terkait</TableHead>
              <TableHead className="py-3.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Perubahan / Alasan</TableHead>
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
                <TableCell colSpan={5} className="text-center py-12 text-sm text-muted-foreground">
                  Tidak ada catatan audit log yang sesuai.
                </TableCell>
              </TableRow>
            ) : (
              filteredLogs.map((log) => (
                <TableRow key={log.id} className="border-b border-border/40 hover:bg-muted/30 transition-colors py-3 px-4 text-sm">
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
