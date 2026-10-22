'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getHomeRouteForRole, isRouteAllowedForRole } from '@/lib/auth/role-redirect';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Coffee, Lock, Mail, Eye, EyeOff, AlertCircle } from 'lucide-react';
import type { ProfilPengguna } from '@/types/database';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam === 'inactive') {
      setErrorMessage('Akun Anda dinonaktifkan. Hubungi Owner untuk informasi lebih lanjut.');
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setErrorMessage('Harap masukkan email dan kata sandi.');
      return;
    }

    setIsLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: password,
      });

      if (authError || !authData.user) {
        setErrorMessage('Email atau kata sandi yang Anda masukkan salah.');
        setIsLoading(false);
        return;
      }

      // Periksa data profil di tabel public.profiles
      const { data: rawProfile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();
      const profile = rawProfile as ProfilPengguna | null;

      if (profileError || !profile) {
        setErrorMessage('Profil pengguna tidak ditemukan.');
        await supabase.auth.signOut();
        setIsLoading(false);
        return;
      }

      // BR-01: Periksa apakah akun aktif
      if (!profile.aktif) {
        setErrorMessage('Akun Anda dinonaktifkan. Hubungi Owner untuk informasi lebih lanjut.');
        await supabase.auth.signOut();
        setIsLoading(false);
        return;
      }

      // Tentukan tujuan redirect berdasarkan peran pengguna
      const defaultHome = getHomeRouteForRole(profile.peran);
      const redirectTo = searchParams.get('redirectTo');

      let targetUrl = defaultHome;
      if (redirectTo && isRouteAllowedForRole(profile.peran, redirectTo)) {
        targetUrl = redirectTo;
      }

      router.replace(targetUrl);
      router.refresh();
    } catch {
      setErrorMessage('Terjadi kendala saat menghubungkan ke server. Silakan coba lagi.');
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md border-amber-900/10 shadow-xl bg-card/95 backdrop-blur-sm">
      <CardHeader className="space-y-3 text-center pb-6">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-700/10 text-amber-800 dark:text-amber-500 shadow-inner">
          <Coffee className="h-7 w-7" />
        </div>
        <div>
          <CardTitle className="text-2xl font-bold tracking-tight text-foreground font-serif">
            Lumbung Kopi & Roti
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground mt-1">
            Sistem Kasir Multi-Cabang (MultiPOS)
          </CardDescription>
        </div>
        <div className="flex justify-center gap-2 pt-1">
          <Badge variant="outline" className="text-xs font-medium px-2 py-0.5">Tebet</Badge>
          <Badge variant="outline" className="text-xs font-medium px-2 py-0.5">Bintaro</Badge>
          <Badge variant="outline" className="text-xs font-medium px-2 py-0.5">Depok</Badge>
        </div>
      </CardHeader>

      <form onSubmit={handleLogin}>
        <CardContent className="space-y-4">
          {errorMessage && (
            <div className="flex items-start gap-3 p-3.5 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20 animate-in fade-in duration-200">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{errorMessage}</span>
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Email Pengguna
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                id="email"
                type="email"
                placeholder="nama@lumbung.test"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
                className="pl-10 h-11 text-base md:text-sm"
                autoComplete="email"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Kata Sandi
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
                className="pl-10 pr-10 h-11 text-base md:text-sm"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
                aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </CardContent>

        <CardFooter className="pt-2 pb-6 flex flex-col gap-3">
          <Button
            type="submit"
            className="w-full h-11 text-base font-medium shadow-md transition-all active:scale-[0.99]"
            disabled={isLoading}
          >
            {isLoading ? 'Memverifikasi...' : 'Masuk ke Aplikasi'}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Akses terbatas hanya untuk staf & pengelola Lumbung Kopi dan Roti
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-amber-900/5 via-background to-stone-900/10">
      <Suspense fallback={
        <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
          Memuat halaman masuk...
        </div>
      }>
        <LoginForm />
      </Suspense>
    </div>
  );
}
