'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ProfilPengguna } from '@/types/database';
import { resetStaffPasswordAction } from '@/lib/actions/staff-actions';
import { resetPasswordSchema } from '@/lib/validations/staff';
import {
  KeyRound,
  Loader2,
  AlertTriangle,
  Check,
  X,
  Eye,
  EyeOff,
  ShieldAlert,
} from 'lucide-react';
import { toast } from 'sonner';

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff: ProfilPengguna | null;
  onSuccess: () => void;
  onShowToast?: (message: string, variant?: 'success' | 'destructive') => void;
}

export function ResetPasswordModal({
  isOpen,
  onClose,
  staff,
  onSuccess,
  onShowToast,
}: ResetPasswordModalProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setError(null);
  }, [isOpen, staff]);

  // Password criteria verification helper
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const isPasswordValid =
    hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecial;
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staff) return;

    if (staff.peran === 'owner') {
      setError('Akun Owner tidak dapat di-reset password-nya.');
      return;
    }

    // Frontend validation via Zod
    const validationResult = resetPasswordSchema.safeParse({
      userId: staff.id,
      password,
      confirmPassword,
    });

    if (!validationResult.success) {
      const firstIssue = validationResult.error.issues[0];
      setError(firstIssue?.message || 'Password baru tidak valid.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await resetStaffPasswordAction({
        userId: staff.id,
        password,
        confirmPassword,
      });

      if (!res.success) {
        setError(res.error || 'Gagal mereset password staf.');
        return;
      }

      toast.success(`Password untuk "${staff.nama_lengkap}" berhasil diperbarui.`);
      if (onShowToast) {
        onShowToast(`Password untuk "${staff.nama_lengkap}" berhasil diperbarui.`, 'success');
      }
      onClose();
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan sistem.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!staff) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-primary" />
            Reset Password Staf
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {error && (
            <div className="flex items-start gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-xs font-medium">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Staf Info Header */}
          <div className="bg-muted/50 p-2.5 rounded-lg border border-border">
            <div className="font-bold text-foreground text-xs">{staff.nama_lengkap}</div>
            <div className="text-muted-foreground font-mono text-[11px]">{staff.email}</div>
          </div>

          {staff.peran === 'owner' ? (
            <div className="p-3 bg-amber-500/10 text-amber-800 dark:text-amber-300 rounded-lg text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              Akun Owner dilindungi dan tidak dapat di-reset password-nya melalui menu ini.
            </div>
          ) : (
            <>
              {/* Password Baru */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Password Baru <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Masukkan password baru"
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

                {/* Password Criteria Checklist */}
                <div className="rounded-md bg-muted/40 p-2.5 space-y-1 text-[11px] border border-border/50 mt-1">
                  <div className="font-semibold text-muted-foreground text-[10px] uppercase tracking-wider mb-1">
                    Kriteria Password Ketat:
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

              {/* Konfirmasi Password Baru */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Konfirmasi Password Baru <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Ulangi password baru"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="h-9 text-xs pr-9 font-mono"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPassword && (
                  <p className={`text-[11px] flex items-center gap-1 ${passwordsMatch ? 'text-emerald-600' : 'text-destructive'}`}>
                    {passwordsMatch ? (
                      <>
                        <Check className="w-3 h-3" />
                        Konfirmasi password cocok
                      </>
                    ) : (
                      <>
                        <X className="w-3 h-3" />
                        Konfirmasi password tidak sama
                      </>
                    )}
                  </p>
                )}
              </div>
            </>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={loading}
              className="text-xs"
            >
              Batal
            </Button>
            {staff.peran !== 'owner' && (
              <Button
                type="submit"
                size="sm"
                disabled={loading || !isPasswordValid || !passwordsMatch}
                className="text-xs"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    Menyimpan...
                  </>
                ) : (
                  'Simpan Password Baru'
                )}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
