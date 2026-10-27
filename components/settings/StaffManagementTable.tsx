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
import { ProfilPengguna, Cabang, PeranPengguna } from '@/types/database';
import {
  updateStaffStatus,
  updateStaffRoleAndBranch,
} from '@/lib/services/settings-service';
import {
  Search,
  Users,
  Building2,
  Shield,
  CheckCircle2,
  XCircle,
  Loader2,
  Edit2,
  Ban,
  UserCheck,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface StaffManagementTableProps {
  staffList: ProfilPengguna[];
  branches: Cabang[];
  userRole: string;
  onRefresh: () => void;
}

export function StaffManagementTable({
  staffList,
  branches,
  userRole,
  onRefresh,
}: StaffManagementTableProps) {
  const isOwner = userRole === 'owner';

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');

  const [editingStaff, setEditingStaff] = useState<ProfilPengguna | null>(null);
  const [selectedRole, setSelectedRole] = useState<PeranPengguna>('kasir');
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);

  const filteredStaff = useMemo(() => {
    return staffList.filter((s) => {
      if (roleFilter !== 'all' && s.peran !== roleFilter) return false;
      if (branchFilter !== 'all' && s.cabang_id !== branchFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = s.nama_lengkap.toLowerCase().includes(q);
        const matchEmail = s.email.toLowerCase().includes(q);
        if (!matchName && !matchEmail) return false;
      }
      return true;
    });
  }, [staffList, roleFilter, branchFilter, search]);

  const handleToggleStatus = async (staff: ProfilPengguna) => {
    if (!isOwner) return;
    try {
      await updateStaffStatus(staff.id, !staff.aktif);
      onRefresh();
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  const handleOpenEdit = (staff: ProfilPengguna) => {
    setEditingStaff(staff);
    setSelectedRole(staff.peran as PeranPengguna);
    setSelectedBranch(staff.cabang_id || '');
  };

  const handleSaveEdit = async () => {
    if (!editingStaff) return;
    try {
      setIsUpdating(true);
      await updateStaffRoleAndBranch(editingStaff.id, {
        peran: selectedRole,
        cabang_id: selectedRole === 'owner' ? null : selectedBranch || null,
      });
      setEditingStaff(null);
      onRefresh();
    } catch (err) {
      console.error('Failed to save staff update', err);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters Container */}
      <div className="rounded-xl border border-border/60 bg-card p-3 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input
            type="text"
            placeholder="Cari nama atau email staf..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-sm h-10 bg-background/50 rounded-xl"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Role Filter */}
          <div className="w-[160px]">
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="h-10 text-sm rounded-xl">
                <SelectValue placeholder="Semua Peran" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Peran</SelectItem>
                <SelectItem value="owner">Owner</SelectItem>
                <SelectItem value="kepala_toko">Kepala Toko</SelectItem>
                <SelectItem value="kasir">Kasir</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Branch Filter */}
          <div className="w-[200px]">
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger className="h-10 text-sm rounded-xl">
                <SelectValue placeholder="Semua Cabang" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Penempatan</SelectItem>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.kode} - {b.nama}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Staff Table */}
      <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 border-b border-border/60 hover:bg-muted/40">
              <TableHead className="py-3.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nama Lengkap</TableHead>
              <TableHead className="py-3.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email Login</TableHead>
              <TableHead className="py-3.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Peran / Hak Akses</TableHead>
              <TableHead className="py-3.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Penempatan Cabang</TableHead>
              <TableHead className="py-3.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">Status</TableHead>
              {isOwner && (
                <TableHead className="py-3.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Aksi</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStaff.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={isOwner ? 6 : 5}
                  className="text-center py-12 text-sm text-muted-foreground"
                >
                  Tidak ada data staf yang sesuai.
                </TableCell>
              </TableRow>
            ) : (
              filteredStaff.map((staff) => {
                const branchObj = branches.find((b) => b.id === staff.cabang_id);
                return (
                  <TableRow key={staff.id} className="border-b border-border/40 hover:bg-muted/30 transition-colors py-3 px-4 text-sm">
                    <TableCell className="py-3 px-4 font-medium text-foreground">
                      {staff.nama_lengkap}
                    </TableCell>
                    <TableCell className="py-3 px-4 font-mono text-xs text-muted-foreground">
                      {staff.email}
                    </TableCell>
                    <TableCell className="py-3 px-4">
                      {staff.peran === 'owner' ? (
                        <Badge variant="default" className="font-medium text-xs px-2.5 py-0.5 rounded-full">
                          Owner
                        </Badge>
                      ) : staff.peran === 'kepala_toko' ? (
                        <Badge variant="secondary" className="font-medium text-xs px-2.5 py-0.5 rounded-full">
                          Kepala Toko
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="font-medium text-xs px-2.5 py-0.5 rounded-full">
                          Kasir
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="py-3 px-4 text-sm text-foreground">
                      {staff.peran === 'owner' ? (
                        <span className="text-muted-foreground italic text-xs">Semua Cabang</span>
                      ) : branchObj ? (
                        <span>
                          <strong className="text-foreground">{branchObj.kode}</strong> -{' '}
                          {branchObj.nama}
                        </span>
                      ) : (
                        <span className="text-rose-500 dark:text-rose-400 text-xs">Belum diatur</span>
                      )}
                    </TableCell>
                    <TableCell className="py-3 px-4 text-center">
                      {staff.aktif ? (
                        <Badge variant="success" className="font-medium text-xs px-2.5 py-0.5 rounded-full">
                          Aktif
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="font-medium text-xs px-2.5 py-0.5 rounded-full">
                          Nonaktif
                        </Badge>
                      )}
                    </TableCell>
                    {isOwner && (
                      <TableCell className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleOpenEdit(staff)}
                            title="Ubah Peran & Penempatan"
                            className="h-8 w-8 rounded-md text-muted-foreground hover:text-foreground"
                          >
                            <Edit2 className="h-4 w-4" />
                            <span className="sr-only">Ubah</span>
                          </Button>
                          {staff.peran !== 'owner' && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleToggleStatus(staff)}
                              title={staff.aktif ? 'Nonaktifkan Akun' : 'Aktifkan Akun'}
                              className={`h-8 w-8 rounded-md ${
                                staff.aktif
                                  ? 'text-muted-foreground hover:text-destructive hover:bg-destructive/10'
                                  : 'text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                              }`}
                            >
                              {staff.aktif ? (
                                <Ban className="h-4 w-4" />
                              ) : (
                                <UserCheck className="h-4 w-4" />
                              )}
                              <span className="sr-only">
                                {staff.aktif ? 'Nonaktifkan' : 'Aktifkan'}
                              </span>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Staff Modal */}
      {editingStaff && (
        <Dialog open={!!editingStaff} onOpenChange={(open) => !open && setEditingStaff(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-foreground">
                Atur Penempatan & Peran Staf
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 text-xs">
              <div className="bg-muted/50 p-2.5 rounded-lg border border-border">
                <div className="font-bold text-foreground">{editingStaff.nama_lengkap}</div>
                <div className="text-muted-foreground font-mono text-[11px]">{editingStaff.email}</div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Peran Akun</label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as PeranPengguna)}
                  className="w-full h-9 px-3 rounded-md border border-border bg-card text-xs"
                >
                  <option value="kasir">Kasir</option>
                  <option value="kepala_toko">Kepala Toko</option>
                  <option value="owner">Owner</option>
                </select>
              </div>

              {selectedRole !== 'owner' && (
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Cabang Penempatan</label>
                  <select
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                    className="w-full h-9 px-3 rounded-md border border-border bg-card text-xs"
                  >
                    <option value="">Pilih Cabang...</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.kode} - {b.nama}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditingStaff(null)}
                className="text-xs"
              >
                Batal
              </Button>
              <Button
                size="sm"
                onClick={handleSaveEdit}
                disabled={isUpdating}
                className="text-xs"
              >
                {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Simpan'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
