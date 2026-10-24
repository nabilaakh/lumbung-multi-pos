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
  Edit,
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
      {/* Search and Filters */}
      <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex flex-1 items-center gap-2.5 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Cari nama atau email staf..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs h-9 bg-muted/50 border-border"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="h-9 px-3 rounded-md border border-border bg-muted/50 text-xs text-foreground font-medium focus:outline-none"
          >
            <option value="all">Semua Peran</option>
            <option value="owner">Owner</option>
            <option value="kepala_toko">Kepala Toko</option>
            <option value="kasir">Kasir</option>
          </select>

          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="h-9 px-3 rounded-md border border-border bg-muted/50 text-xs text-foreground font-medium focus:outline-none"
          >
            <option value="all">Semua Penempatan Cabang</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.kode} - {b.nama}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="text-xs font-bold text-muted-foreground">Nama Lengkap</TableHead>
              <TableHead className="text-xs font-bold text-muted-foreground">Email Login</TableHead>
              <TableHead className="text-xs font-bold text-muted-foreground">Peran / Hak Akses</TableHead>
              <TableHead className="text-xs font-bold text-muted-foreground">Penempatan Cabang</TableHead>
              <TableHead className="text-xs font-bold text-muted-foreground text-center">Status</TableHead>
              {isOwner && (
                <TableHead className="text-xs font-bold text-muted-foreground text-right">Aksi</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStaff.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={isOwner ? 6 : 5}
                  className="text-center py-8 text-xs text-muted-foreground"
                >
                  Tidak ada data staf yang sesuai.
                </TableCell>
              </TableRow>
            ) : (
              filteredStaff.map((staff) => {
                const branchObj = branches.find((b) => b.id === staff.cabang_id);
                return (
                  <TableRow key={staff.id} className="hover:bg-muted/40 transition-colors">
                    <TableCell className="text-xs font-bold text-foreground">
                      {staff.nama_lengkap}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {staff.email}
                    </TableCell>
                    <TableCell>
                      {staff.peran === 'owner' ? (
                        <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] hover:bg-primary/10">
                          Owner (Direksi)
                        </Badge>
                      ) : staff.peran === 'kepala_toko' ? (
                        <Badge className="bg-blue-100 text-blue-900 border-blue-300 text-[10px] hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800 dark:hover:bg-blue-950/50">
                          Kepala Toko
                        </Badge>
                      ) : (
                        <Badge className="bg-muted text-foreground border-border text-[10px] hover:bg-muted/60">
                          Kasir
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-foreground">
                      {staff.peran === 'owner' ? (
                        <span className="text-muted-foreground italic">Semua Cabang</span>
                      ) : branchObj ? (
                        <span>
                          <strong className="text-foreground">{branchObj.kode}</strong> -{' '}
                          {branchObj.nama}
                        </span>
                      ) : (
                        <span className="text-rose-500 dark:text-rose-400 text-[11px]">Belum diatur</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {staff.aktif ? (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 dark:hover:bg-emerald-950/50">
                          Aktif
                        </Badge>
                      ) : (
                        <Badge className="bg-rose-100 text-rose-700 border-rose-300 text-[10px] hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 dark:hover:bg-rose-950/50">
                          Nonaktif
                        </Badge>
                      )}
                    </TableCell>
                    {isOwner && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenEdit(staff)}
                            className="h-7 px-2 text-xs text-muted-foreground hover:text-primary"
                          >
                            <Edit className="w-3.5 h-3.5 mr-1" />
                            Ubah
                          </Button>
                          {staff.peran !== 'owner' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleToggleStatus(staff)}
                              className={`h-7 px-2 text-[11px] font-semibold ${
                                staff.aktif
                                  ? 'text-rose-700 border-rose-200 hover:bg-rose-50 dark:text-rose-300 dark:border-rose-900 dark:hover:bg-rose-950/30'
                                  : 'text-emerald-700 border-emerald-200 hover:bg-emerald-50 dark:text-emerald-300 dark:border-emerald-900 dark:hover:bg-emerald-950/30'
                              }`}
                            >
                              {staff.aktif ? 'Nonaktifkan' : 'Aktifkan'}
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
