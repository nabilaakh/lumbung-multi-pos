import React from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { SignOutButton } from '@/components/auth/SignOutButton';
import { Badge } from '@/components/ui/badge';
import {
  Coffee,
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

  // Filter Nav Items sesuai Matriks Akses Peran
  const navItems = [
    {
      title: 'Kasir POS',
      href: '/kasir',
      icon: ShoppingCart,
      roles: ['kasir'],
    },
    {
      title: 'Shift Saya',
      href: '/shift-saya',
      icon: Clock,
      roles: ['kasir'],
    },
    {
      title: 'Riwayat Transaksi',
      href: '/transaksi',
      icon: Receipt,
      roles: ['kasir', 'kepala_toko', 'owner'],
    },
    {
      title: 'Stok Cabang',
      href: '/stok',
      icon: Layers,
      roles: ['kepala_toko', 'owner'],
    },
    {
      title: 'Shift Cabang',
      href: '/shift-cabang',
      icon: Users2,
      roles: ['kepala_toko', 'owner'],
    },
    {
      title: 'Master Produk',
      href: '/produk',
      icon: Package,
      roles: ['kepala_toko', 'owner'],
    },
    {
      title: 'Laporan & Analitik',
      href: '/laporan',
      icon: BarChart3,
      roles: ['kepala_toko', 'owner'],
    },
    {
      title: 'Pengaturan & Audit',
      href: '/pengaturan',
      icon: Settings,
      roles: ['owner'],
    },
  ].filter((item) => item.roles.includes(role));

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
            <Link href="/" className="flex items-center gap-2.5 font-bold tracking-tight text-foreground font-serif text-lg">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-700/10 text-amber-800 dark:text-amber-500">
                <Coffee className="h-5 w-5" />
              </div>
              <span className="hidden sm:inline">Lumbung MultiPOS</span>
            </Link>

            {cabangInfo ? (
              <Badge variant="outline" className="font-semibold text-xs px-2.5 py-0.5">
                Cabang: {cabangInfo.nama} ({cabangInfo.kode})
              </Badge>
            ) : (
              <Badge variant="secondary" className="font-semibold text-xs px-2.5 py-0.5">
                Kantor Pusat (Semua Cabang)
              </Badge>
            )}
          </div>

          {/* User Profile & Sign Out */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-sm font-semibold text-foreground leading-none">
                {userProfile.nama_lengkap}
              </span>
              <span className="text-xs text-muted-foreground mt-0.5">
                {roleLabels[userProfile.peran] || userProfile.peran}
              </span>
            </div>
            <SignOutButton />
          </div>
        </div>

        {/* Sub-Header Horizontal Navigation (Tablet & Desktop Optimized) */}
        <div className="border-t border-border/50 bg-muted/30 overflow-x-auto scrollbar-none">
          <div className="container mx-auto px-4 lg:px-6 flex items-center gap-1 py-1.5 min-w-max">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs md:text-sm font-medium transition-colors hover:bg-card hover:text-foreground text-muted-foreground"
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.title}</span>
                </Link>
              );
            })}
          </div>
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
