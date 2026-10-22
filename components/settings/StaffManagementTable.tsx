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
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex flex-1 items-center gap-2.5 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Cari nama atau email staf..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs h-9 bg-slate-50 border-slate-200"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="h-9 px-3 rounded-md border border-slate-200 bg-slate-50 text-xs text-slate-700 font-medium focus:outline-none"
          >
            <option value="all">Semua Peran</option>
            <option value="owner">Owner</option>
            <option value="kepala_toko">Kepala Toko</option>
            <option value="kasir">Kasir</option>
          </select>

          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="h-9 px-3 rounded-md border border-slate-200 bg-slate-50 text-xs text-slate-700 font-medium focus:outline-none"
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
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="text-xs font-bold text-slate-600">Nama Lengkap</TableHead>
              <TableHead className="text-xs font-bold text-slate-600">Email Login</TableHead>
              <TableHead className="text-xs font-bold text-slate-600">Peran / Hak Akses</TableHead>
              <TableHead className="text-xs font-bold text-slate-600">Penempatan Cabang</TableHead>
              <TableHead className="text-xs font-bold text-slate-600 text-center">Status</TableHead>
              {isOwner && (
                <TableHead className="text-xs font-bold text-slate-600 text-right">Aksi</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStaff.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={isOwner ? 6 : 5}
                  className="text-center py-8 text-xs text-slate-500"
                >
                  Tidak ada data staf yang sesuai.
                </TableCell>
              </TableRow>
            ) : (
              filteredStaff.map((staff) => {
                const branchObj = branches.find((b) => b.id === staff.cabang_id);
                return (
                  <TableRow key={staff.id} className="hover:bg-slate-50/80 transition-colors">
                    <TableCell className="text-xs font-bold text-slate-800">
                      {staff.nama_lengkap}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-slate-600">
                      {staff.email}
                    </TableCell>
                    <TableCell>
                      {staff.peran === 'owner' ? (
                        <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[10px] hover:bg-amber-100">
                          Owner (Direksi)
                        </Badge>
                      ) : staff.peran === 'kepala_toko' ? (
                        <Badge className="bg-blue-100 text-blue-900 border-blue-300 text-[10px] hover:bg-blue-100">
                          Kepala Toko
                        </Badge>
                      ) : (
                        <Badge className="bg-slate-100 text-slate-700 border-slate-300 text-[10px] hover:bg-slate-100">
                          Kasir
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-slate-700">
                      {staff.peran === 'owner' ? (
                        <span className="text-slate-400 italic">Semua Cabang</span>
                      ) : branchObj ? (
                        <span>
                          <strong className="text-slate-800">{branchObj.kode}</strong> -{' '}
                          {branchObj.nama}
                        </span>
                      ) : (
                        <span className="text-rose-500 text-[11px]">Belum diatur</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {staff.aktif ? (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] hover:bg-emerald-100">
                          Aktif
                        </Badge>
                      ) : (
                        <Badge className="bg-rose-100 text-rose-700 border-rose-300 text-[10px] hover:bg-rose-100">
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
                            className="h-7 px-2 text-xs text-slate-600 hover:text-amber-700"
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
                                  ? 'text-rose-700 border-rose-200 hover:bg-rose-50'
                                  : 'text-emerald-700 border-emerald-200 hover:bg-emerald-50'
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
          <DialogContent className="sm:max-w-md bg-white border border-slate-200">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-800">
                Atur Penempatan & Peran Staf
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <div className="font-bold text-slate-800">{editingStaff.nama_lengkap}</div>
                <div className="text-slate-500 font-mono text-[11px]">{editingStaff.email}</div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Peran Akun</label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as PeranPengguna)}
                  className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-xs"
                >
                  <option value="kasir">Kasir</option>
                  <option value="kepala_toko">Kepala Toko</option>
                  <option value="owner">Owner</option>
                </select>
              </div>

              {selectedRole !== 'owner' && (
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Cabang Penempatan</label>
                  <select
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                    className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-xs"
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
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs"
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
