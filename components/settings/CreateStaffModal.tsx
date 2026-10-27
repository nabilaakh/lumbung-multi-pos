'use client';

import React, { useState, useId } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Cabang, PeranPengguna } from '@/types/database';
import { createStaffAction } from '@/lib/actions/staff-actions';
import { createStaffSchema } from '@/lib/validations/staff';
import {
  UserPlus,
  Loader2,
  AlertTriangle,
  Check,
  X,
  Eye,
  EyeOff,
} from 'lucide-react';
import { toast } from 'sonner';

interface CreateStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  branches: Cabang[];
  onSuccess: () => void;
  onShowToast?: (message: string, variant?: 'success' | 'destructive') => void;
}

export function CreateStaffModal({
  isOpen,
  onClose,
  branches,
  onSuccess,
  onShowToast,
}: CreateStaffModalProps) {
  const [namaLengkap, setNamaLengkap] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [peran, setPeran] = useState<'kasir' | 'kepala_toko'>('kasir');
  const [cabangId, setCabangId] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Password criteria verification helper
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const isPasswordValid =
    hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecial;

  const resetForm = () => {
    setNamaLengkap('');
    setEmail('');
    setPassword('');
    setPeran('kasir');
    setCabangId('');
    setShowPassword(false);
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validasi Zod di frontend sebelum mengirim ke server
    const validationResult = createStaffSchema.safeParse({
      nama_lengkap: namaLengkap,
      email,
      password,
      peran,
      cabang_id: cabangId,
    });

    if (!validationResult.success) {
      const firstIssue = validationResult.error.issues[0];
      setError(firstIssue?.message || 'Mohon lengkapi formulir dengan benar.');
      return;
    }

    try {
      setLoading(true);
      const res = await createStaffAction({
        nama_lengkap: namaLengkap.trim(),
        email: email.trim(),
        password,
        peran,
        cabang_id: cabangId,
      });

      if (!res.success) {
        setError(res.error || 'Gagal menambahkan staf baru.');
        return;
      }

      toast.success(`Staf "${namaLengkap}" berhasil didaftarkan dan diaktifkan.`);
      if (onShowToast) {
        onShowToast(`Staf "${namaLengkap}" berhasil didaftarkan dan diaktifkan.`, 'success');
      }
      resetForm();
      onClose();
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan sistem.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            Tambah Akun Staf Baru
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {error && (
            <div className="flex items-start gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-xs font-medium">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Nama Lengkap */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">
              Nama Lengkap <span className="text-destructive">*</span>
            </label>
            <Input
              type="text"
              placeholder="Contoh: Budi Prasetyo"
              value={namaLengkap}
              onChange={(e) => setNamaLengkap(e.target.value)}
              className="h-9 text-xs"
              required
            />
          </div>

          {/* Email Login */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">
              Email Login <span className="text-destructive">*</span>
            </label>
            <Input
              type="email"
              placeholder="budi.kasir@lumbung.test"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-9 text-xs font-mono"
              required
            />
          </div>

          {/* Password Awal */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">
              Password Awal <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Minimal 8 karakter (kombinasi huruf, angka, simbol)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-9 text-xs pr-9 font-mono"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Checklist Standar Password */}
            <div className="rounded-md bg-muted/40 p-2.5 space-y-1 text-[11px] border border-border/50 mt-1">
              <div className="font-semibold text-muted-foreground text-[10px] uppercase tracking-wider mb-1">
                Kriteria Keamanan Password:
              </div>
              <div className="grid grid-cols-2 gap-1">
                <span className={`flex items-center gap-1 ${hasMinLength ? 'text-emerald-600 font-medium' : 'text-muted-foreground'}`}>
                  {hasMinLength ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                  Min. 8 karakter
                </span>
                <span className={`flex items-center gap-1 ${hasUppercase ? 'text-emerald-600 font-medium' : 'text-muted-foreground'}`}>
                  {hasUppercase ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                  Huruf kapital (A-Z)
                </span>
                <span className={`flex items-center gap-1 ${hasLowercase ? 'text-emerald-600 font-medium' : 'text-muted-foreground'}`}>
                  {hasLowercase ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                  Huruf kecil (a-z)
                </span>
                <span className={`flex items-center gap-1 ${hasNumber ? 'text-emerald-600 font-medium' : 'text-muted-foreground'}`}>
                  {hasNumber ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                  Angka (0-9)
                </span>
                <span className={`flex items-center gap-1 col-span-2 ${hasSpecial ? 'text-emerald-600 font-medium' : 'text-muted-foreground'}`}>
                  {hasSpecial ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                  Simbol / Karakter Spesial (!@#$%^&* dll.)
                </span>
              </div>
            </div>
          </div>

          {/* Peran Akun (Hanya Kasir atau Kepala Toko) */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">
              Peran Akun <span className="text-destructive">*</span>
            </label>
            <Select value={peran} onValueChange={(val) => setPeran(val as 'kasir' | 'kepala_toko')}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Pilih Peran" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="kasir">Kasir</SelectItem>
                <SelectItem value="kepala_toko">Kepala Toko</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Peran menentukan hak akses operasional cabang. Peran Owner tidak dapat dibuat melalui formulir ini.
            </p>
          </div>

          {/* Penempatan Cabang */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">
              Penempatan Cabang <span className="text-destructive">*</span>
            </label>
            <Select value={cabangId} onValueChange={setCabangId}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Pilih Cabang Penempatan..." />
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

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClose}
              disabled={loading}
              className="text-xs"
            >
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading || !isPasswordValid || !namaLengkap.trim() || !email.trim() || !cabangId}
              className="text-xs"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  Mendaftarkan...
                </>
              ) : (
                'Simpan Staf'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
