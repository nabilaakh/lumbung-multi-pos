import React from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getHomeRouteForRole } from '@/lib/auth/role-redirect';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BrandLogo } from '@/components/brand/brand-logo';
import { ModeToggle } from '@/components/ui/mode-toggle';
import { ShieldAlert, Home } from 'lucide-react';
import { SignOutButton } from '@/components/auth/SignOutButton';
import type { ProfilPengguna } from '@/types/database';

export const metadata = {
  title: '403 - Akses Ditolak | Lumbung MultiPOS',
  description: 'Akun Anda tidak memiliki izin untuk mengakses rute halaman ini sesuai aturan hak akses sistem (RBAC).',
  robots: {
    index: false,
    follow: false,
  },
};

export default async function UnauthorizedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let homeRoute = '/login';
  let roleLabel = '';
  let userName = '';

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    const userProfile = profile as ProfilPengguna | null;
    if (userProfile?.peran) {
      homeRoute = getHomeRouteForRole(userProfile.peran);
      userName = userProfile.nama_lengkap;
      const roleMap: Record<string, string> = {
        kasir: 'Kasir',
        kepala_toko: 'Kepala Toko',
        owner: 'Owner / Pemilik',
      };
      roleLabel = roleMap[userProfile.peran] || userProfile.peran;
    }
  }

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-destructive/5 via-background to-muted/20">
      {/* Tombol switch tema dan logout di pojok kanan atas */}
      <div className="absolute top-6 right-6 z-20 flex items-center gap-2">
        <ModeToggle />
        {user && <SignOutButton />}
      </div>

      <Card className="w-full max-w-lg border-destructive/20 shadow-2xl bg-card/95 backdrop-blur-sm text-center">
        <CardHeader className="space-y-4 pb-4">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-500 ring-8 ring-red-50 dark:ring-red-950/20">
            <ShieldAlert className="h-10 w-10 text-red-600 dark:text-red-500 animate-pulse" />
          </div>

          <div className="space-y-2">
            <Badge variant="destructive" className="uppercase font-semibold tracking-wider text-[11px] px-3 py-1">
              HTTP 403 Forbidden
            </Badge>
            <CardTitle className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-serif">
              403 - Akses Ditolak
            </CardTitle>
            <CardDescription className="text-sm sm:text-base text-muted-foreground max-w-md mx-auto leading-relaxed">
              Akun Anda tidak memiliki izin untuk mengakses rute halaman ini sesuai aturan hak akses sistem (RBAC).
            </CardDescription>
          </div>
        </CardHeader>

        <CardFooter className="pt-4 pb-6 flex flex-col gap-3">
          <Button
            asChild
            className="w-full h-11 text-base font-medium shadow-md transition-all active:scale-[0.99] gap-2"
          >
            <Link href={homeRoute}>
              <Home className="h-4 w-4" />
              Kembali ke Halaman Utama
            </Link>
          </Button>

        </CardFooter>
      </Card>
    </div>
  );
}
