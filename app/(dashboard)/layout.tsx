import React from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { SignOutButton } from '@/components/auth/SignOutButton';
import { BrandLogo } from '@/components/brand/brand-logo';
import { Badge } from '@/components/ui/badge';
import { ModeToggle } from '@/components/ui/mode-toggle';
import { DashboardNav } from '@/components/ui/dashboard-nav';
import {
  ShoppingCart,
  Clock,
  Receipt,
  Package,
  Layers,
  BarChart3,
  Settings,
  Users2,
} from 'lucide-react';
import type { ProfilPengguna, Cabang } from '@/types/database';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  const userProfile = profile as ProfilPengguna | null;

  if (!userProfile || !userProfile.aktif) {
    redirect('/login?error=inactive');
  }

  let cabangInfo: Cabang | null = null;
  if (userProfile.cabang_id) {
    const { data: cabang } = await supabase
      .from('cabang')
      .select('*')
      .eq('id', userProfile.cabang_id)
      .single();
    cabangInfo = cabang as Cabang | null;
  }

  const role = userProfile.peran;

  const roleLabels: Record<string, string> = {
    kasir: 'Kasir',
    kepala_toko: 'Kepala Toko',
    owner: 'Owner / Pemilik',
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/75 shadow-xs">
        <div className="container mx-auto px-4 lg:px-6 h-16 flex items-center justify-between">
          {/* Logo & Cabang Tag */}
          <div className="flex items-center gap-3">
            <BrandLogo href="/" textClassName="hidden sm:inline" />

            {cabangInfo ? (
              <Badge variant="outline" className="font-semibold text-xs px-2.5 py-0.5">
                Cabang: {cabangInfo.nama} ({cabangInfo.kode})
              </Badge>
            ) : (
              <Badge variant="secondary" className="font-semibold text-xs px-2.5 py-0.5">
                Pusat (Semua Cabang)
              </Badge>
            )}
          </div>

          {/* User Profile & Action Controls (Sign Out & Toogle Mode) */}
          <div className="flex items-center gap-3">
            {/* 1. Teks Profil Pengguna */}
            <div className="flex flex-col text-right">
              <span className="text-sm font-semibold text-foreground leading-none">
                {userProfile.nama_lengkap}
              </span>
              <span className="text-xs text-muted-foreground mt-1">
                {roleLabels[userProfile.peran] || userProfile.peran}
              </span>
            </div>

            {/* Garis pemisah vertikal tipis */}
            <div className="h-6 w-px bg-border/70" />

            {/* 2. Kelompok Tombol Aksi */}
            <div className="flex items-center gap-1.5">
              <ModeToggle />
              <SignOutButton />
            </div>
          </div>
        </div>

        {/* Sub-Header Horizontal Navigation */}
        <div className="border-t border-border/50 bg-muted/30 overflow-x-auto scrollbar-none">
          <DashboardNav role={role} />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 container mx-auto px-4 lg:px-6 py-6 max-w-7xl">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t py-4 text-center text-xs text-muted-foreground bg-card">
        Lumbung Kopi dan Roti MultiPOS · Tebet · Bintaro · Depok
      </footer>
    </div>
  );
}
