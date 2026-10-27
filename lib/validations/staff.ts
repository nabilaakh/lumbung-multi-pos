import { z } from 'zod';

export const passwordSchema = z
  .string()
  .min(8, 'Password minimal 8 karakter')
  .regex(/[A-Z]/, 'Password harus mengandung minimal 1 huruf kapital (A-Z)')
  .regex(/[a-z]/, 'Password harus mengandung minimal 1 huruf kecil (a-z)')
  .regex(/[0-9]/, 'Password harus mengandung minimal 1 angka (0-9)')
  .regex(/[^A-Za-z0-9]/, 'Password harus mengandung minimal 1 simbol / karakter spesial (!@#$%^&* dll.)');

export const createStaffSchema = z.object({
  nama_lengkap: z
    .string()
    .trim()
    .min(1, 'Nama lengkap wajib diisi'),
  email: z
    .string()
    .trim()
    .email('Format email tidak valid'),
  password: passwordSchema,
  peran: z.enum(['kasir', 'kepala_toko'], {
    error: 'Peran akun hanya boleh Kasir atau Kepala Toko',
  }),
  cabang_id: z
    .string()
    .trim()
    .min(1, 'Penempatan cabang wajib dipilih'),
});

export const resetPasswordSchema = z
  .object({
    userId: z.string().min(1, 'ID pengguna tidak valid'),
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Konfirmasi password wajib diisi'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Konfirmasi password baru tidak cocok',
    path: ['confirmPassword'],
  });

export const updateStaffRoleAndBranchSchema = z.object({
  profileId: z.string().min(1, 'ID profil tidak valid'),
  peran: z.enum(['kasir', 'kepala_toko'], {
    error: 'Peran akun hanya boleh Kasir atau Kepala Toko',
  }),
  cabang_id: z.string().trim().min(1, 'Penempatan cabang wajib dipilih'),
});

export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type UpdateStaffRoleAndBranchInput = z.infer<typeof updateStaffRoleAndBranchSchema>;
