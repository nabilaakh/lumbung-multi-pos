import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { getHomeRouteForRole, isRouteAllowedForRole } from '@/lib/auth/role-redirect';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Lewati static assets, API auth callbacks, dsb.
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const { supabaseResponse, user, profile, supabase } = await updateSession(request);

  const isAuthRoute = pathname === '/login';
  const isProtectedPath = 
    pathname.startsWith('/kasir') ||
    pathname.startsWith('/shift-saya') ||
    pathname.startsWith('/transaksi') ||
    pathname.startsWith('/stok') ||
    pathname.startsWith('/shift-cabang') ||
    pathname.startsWith('/produk') ||
    pathname.startsWith('/laporan') ||
    pathname.startsWith('/pengaturan');

  // 1. Kasus Belum Login
  if (!user) {
    // Jika akses root '/' langsung lempar ke login
    if (pathname === '/') {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    
    if (isProtectedPath) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirectTo', pathname);
      return NextResponse.redirect(loginUrl);
    }
    return supabaseResponse;
  }

  // 2. Kasus Sudah Login tetapi Akun Tidak Aktif (BR-01, TC-03)
  if (profile && !profile.aktif) {
    await supabase.auth.signOut();
    const inactiveUrl = new URL('/login', request.url);
    inactiveUrl.searchParams.set('error', 'inactive');
    return NextResponse.redirect(inactiveUrl);
  }

  // 3. Kasus Sudah Login dan Mencoba Mengakses Halaman /login
  if (isAuthRoute) {
    if (profile) {
      const homeRoute = getHomeRouteForRole(profile.peran);
      return NextResponse.redirect(new URL(homeRoute, request.url));
    }
    return supabaseResponse;
  }

  // 4. Kasus Sudah Login di Halaman Root '/' -> Arahkan ke rute peran
  if (pathname === '/') {
    if (profile) {
      const homeRoute = getHomeRouteForRole(profile.peran);
      return NextResponse.redirect(new URL(homeRoute, request.url));
    }
  }

  // 5. Kasus Penegakan Hak Akses Peran (RBAC Guard)
  if (isProtectedPath && profile) {
    const isAllowed = isRouteAllowedForRole(profile.peran, pathname);
    if (!isAllowed) {
      // Pengguna mencoba membuka halaman di luar hak aksesnya -> redirect ke home peran
      const homeRoute = getHomeRouteForRole(profile.peran);
      return NextResponse.redirect(new URL(homeRoute, request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images/media (*.svg, *.png, *.jpg, *.webp)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
