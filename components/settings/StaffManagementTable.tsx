'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  Loader2,
  Edit2,
  Ban,
  UserCheck,
  Plus,
  KeyRound,
  AlertTriangle,
  CheckCircle2,
  X,
  ShieldCheck,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { CreateStaffModal } from './CreateStaffModal';
import { ResetPasswordModal } from './ResetPasswordModal';

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

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [resetPasswordStaff, setResetPasswordStaff] = useState<ProfilPengguna | null>(null);

  // Edit Staff Modal states
  const [editingStaff, setEditingStaff] = useState<ProfilPengguna | null>(null);
  const [selectedRole, setSelectedRole] = useState<PeranPengguna>('kasir');
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Toast notification state
  const [toast, setToast] = useState<{
    message: string;
    variant: 'success' | 'destructive';
  } | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (message: string, variant: 'success' | 'destructive' = 'success') => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToast({ message, variant });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

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

    // Proteksi akun Owner: tidak boleh dinonaktifkan
    if (staff.peran === 'owner') {
      showToast('Akun Owner dilindungi dan tidak dapat dinonaktifkan.', 'destructive');
      return;
    }

    try {
      const res = await updateStaffStatus(staff.id, !staff.aktif);
      if (!res.success) {
        showToast(res.error || 'Gagal mengubah status staf.', 'destructive');
        return;
      }

      showToast(
        `Akun "${staff.nama_lengkap}" berhasil ${!staff.aktif ? 'diaktifkan' : 'dinonaktifkan'}.`,
        'success'
      );
      onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan sistem.';
      showToast(msg, 'destructive');
    }
  };

  const handleOpenEdit = (staff: ProfilPengguna) => {
    // Proteksi: akun owner tidak boleh diedit perannya
    if (staff.peran === 'owner') {
      showToast('Peran dan penempatan akun Owner tidak dapat diubah.', 'destructive');
      return;
    }
    setEditingStaff(staff);
    // Role default hanya kasir atau kepala_toko
    setSelectedRole(staff.peran === 'kepala_toko' ? 'kepala_toko' : 'kasir');
    setSelectedBranch(staff.cabang_id || '');
    setEditError(null);
  };

  const handleOpenResetPassword = (staff: ProfilPengguna) => {
    if (staff.peran === 'owner') {
      showToast('Akun Owner dilindungi dan tidak dapat di-reset password-nya.', 'destructive');
      return;
    }
    setResetPasswordStaff(staff);
  };

  const handleSaveEdit = async () => {
    if (!editingStaff) return;
    setEditError(null);

    if (!selectedBranch) {
      setEditError('Cabang penempatan wajib dipilih.');
      return;
    }

    try {
      setIsUpdating(true);
      const res = await updateStaffRoleAndBranch(editingStaff.id, {
        peran: selectedRole,
        cabang_id: selectedBranch,
      });

      if (!res.success) {
        setEditError(res.error || 'Gagal memperbarui peran dan penempatan staf.');
        return;
      }

      showToast(`Data staf "${editingStaff.nama_lengkap}" berhasil diperbarui.`, 'success');
      setEditingStaff(null);
      onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan perubahan staf.';
      setEditError(msg);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toast Notification Banner */}
      {toast && (
        <div
          className={`flex items-center justify-between gap-3 p-3.5 rounded-xl border shadow-sm transition-all text-xs font-medium ${
            toast.variant === 'destructive'
              ? 'bg-destructive/10 border-destructive/20 text-destructive'
              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
          }`}
        >
          <div className="flex items-center gap-2">
            {toast.variant === 'destructive' ? (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
          <button
            onClick={() => setToast(null)}
            className="text-muted-foreground hover:text-foreground p-0.5 rounded-md"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

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

          {/* Tambah Staf Button (Sesuai Tombol Tambah Produk di Master Katalog) */}
          {isOwner && (
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="h-10 px-4 text-sm rounded-xl font-medium"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Tambah Staf
            </Button>
          )}
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
                const isStaffOwner = staff.peran === 'owner';

                return (
                  <TableRow key={staff.id} className="border-b border-border/40 hover:bg-muted/30 transition-colors py-3 px-4 text-sm">
                    <TableCell className="py-3 px-4 font-medium text-foreground">
                      <div className="flex items-center gap-1.5">
                        <span>{staff.nama_lengkap}</span>
                        {isStaffOwner && (
                          <span title="Akun Owner Terproteksi" className="inline-flex">
                            <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0" />
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-3 px-4 font-mono text-xs text-muted-foreground">
                      {staff.email}
                    </TableCell>
                    <TableCell className="py-3 px-4">
                      {isStaffOwner ? (
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
                      {isStaffOwner ? (
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
                          {/* Tombol Ubah Peran & Penempatan (Disabled untuk Owner) */}
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleOpenEdit(staff)}
                            disabled={isStaffOwner}
                            title={isStaffOwner ? 'Akun Owner dilindungi: peran tidak dapat diubah' : 'Ubah Peran & Penempatan'}
                            className="h-8 w-8 rounded-md text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <Edit2 className="h-4 w-4" />
                            <span className="sr-only">Ubah</span>
                          </Button>

                          {/* Tombol Reset Password (Disabled untuk Owner) */}
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleOpenResetPassword(staff)}
                            disabled={isStaffOwner}
                            title={isStaffOwner ? 'Akun Owner dilindungi: password tidak dapat di-reset lewat menu ini' : 'Reset Password Staf'}
                            className="h-8 w-8 rounded-md text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <KeyRound className="h-4 w-4" />
                            <span className="sr-only">Reset Password</span>
                          </Button>

                          {/* Tombol Toggle Status (Disabled untuk Owner) */}
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleToggleStatus(staff)}
                            disabled={isStaffOwner}
                            title={
                              isStaffOwner
                                ? 'Akun Owner dilindungi: tidak dapat dinonaktifkan'
                                : staff.aktif
                                ? 'Nonaktifkan Akun'
                                : 'Aktifkan Akun'
                            }
                            className={`h-8 w-8 rounded-md disabled:opacity-40 disabled:cursor-not-allowed ${
                              isStaffOwner
                                ? 'text-muted-foreground'
                                : staff.aktif
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

      {/* Modal 1: Edit Staff Modal ("Atur Penempatan & Peran Staf") */}
      {editingStaff && (
        <Dialog open={!!editingStaff} onOpenChange={(open) => !open && setEditingStaff(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-foreground">
                Atur Penempatan & Peran Staf
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 text-xs pt-1">
              {editError && (
                <div className="flex items-start gap-2 p-2.5 bg-destructive/10 text-destructive rounded-lg text-xs font-medium">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{editError}</span>
                </div>
              )}

              <div className="bg-muted/50 p-2.5 rounded-lg border border-border">
                <div className="font-bold text-foreground">{editingStaff.nama_lengkap}</div>
                <div className="text-muted-foreground font-mono text-[11px]">{editingStaff.email}</div>
              </div>

              {/* Peran Akun: HANYA Kasir atau Kepala Toko (Owner dihapus) */}
              <div className="space-y-1">
                <label className="font-semibold text-foreground">
                  Peran Akun <span className="text-destructive">*</span>
                </label>
                <Select
                  value={selectedRole}
                  onValueChange={(val) => setSelectedRole(val as PeranPengguna)}
                >
                  <SelectTrigger className="w-full h-9 text-xs">
                    <SelectValue placeholder="Pilih Peran" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kasir">Kasir</SelectItem>
                    <SelectItem value="kepala_toko">Kepala Toko</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  Pilihan peran hanya berlaku untuk Kasir dan Kepala Toko.
                </p>
              </div>

              {/* Penempatan Cabang: Wajib dipilih */}
              <div className="space-y-1">
                <label className="font-semibold text-foreground">
                  Cabang Penempatan <span className="text-destructive">*</span>
                </label>
                <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                  <SelectTrigger className="w-full h-9 text-xs">
                    <SelectValue placeholder="Pilih Cabang..." />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.kode} - {b.nama}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditingStaff(null)}
                disabled={isUpdating}
                className="text-xs"
              >
                Batal
              </Button>
              <Button
                size="sm"
                onClick={handleSaveEdit}
                disabled={isUpdating || !selectedBranch}
                className="text-xs"
              >
                {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
                {isUpdating ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal 2: Tambah Staf Baru */}
      <CreateStaffModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        branches={branches}
        onSuccess={onRefresh}
        onShowToast={showToast}
      />

      {/* Modal 3: Reset Password Staf */}
      <ResetPasswordModal
        isOpen={!!resetPasswordStaff}
        onClose={() => setResetPasswordStaff(null)}
        staff={resetPasswordStaff}
        onSuccess={onRefresh}
        onShowToast={showToast}
      />
    </div>
  );
}
