'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getActiveShift } from '@/lib/services/shift-service';
import type { CheckoutRPCResponse } from '@/lib/services/checkout-service';
import type { ProfilPengguna, Cabang, ShiftKasir } from '@/types/database';
import { ProductCatalog, type ProductWithStock } from '@/components/pos/ProductCatalog';
import { CartPanel, type CartItem } from '@/components/pos/CartPanel';
import { PaymentModal } from '@/components/pos/PaymentModal';
import { ReceiptModal } from '@/components/pos/ReceiptModal';
import { type ReceiptData } from '@/lib/utils/receipt-printer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Clock, ShoppingCart, ArrowRight } from 'lucide-react';

export default function KasirPOSPage() {
  const supabase = createClient();

  const [profile, setProfile] = useState<ProfilPengguna | null>(null);
  const [cabang, setCabang] = useState<Cabang | null>(null);
  const [activeShift, setActiveShift] = useState<ShiftKasir | null>(null);
  const [products, setProducts] = useState<ProductWithStock[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [currentDiskon, setCurrentDiskon] = useState(0);
  const [currentAlasanDiskon, setCurrentAlasanDiskon] = useState('');

  const loadData = useCallback(async () => {
    setIsLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setIsLoading(false);
      return;
    }

    // 1. Ambil profil kasir
    const { data: prof } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    const currentProfile = prof as ProfilPengguna | null;
    setProfile(currentProfile);

    if (currentProfile) {
      // 2. Ambil cabang kasir
      let targetCabangId = currentProfile.cabang_id;
      if (!targetCabangId) {
        // Jika owner membuka kasir, default ke cabang pertama (Tebet)
        const { data: firstBranch } = await supabase.from('cabang').select('*').limit(1).single();
        targetCabangId = firstBranch ? (firstBranch as Cabang).id : null;
      }

      if (targetCabangId) {
        const { data: cabangData } = await supabase
          .from('cabang')
          .select('*')
          .eq('id', targetCabangId)
          .single();
        setCabang(cabangData as Cabang | null);
      }

      // 3. Ambil shift aktif kasir (BR-02)
      const currentShift = await getActiveShift(supabase, currentProfile.id);
      setActiveShift(currentShift);

      // 4. Ambil master produk aktif dan stok cabang
      const { data: rawProducts } = await supabase
        .from('produk')
        .select('*')
        .eq('aktif', true)
        .order('nama', { ascending: true });

      const allProducts = (rawProducts as any[]) || [];

      let stockMap = new Map<string, number>();
      if (targetCabangId) {
        const { data: stockData } = await supabase
          .from('stok_cabang')
          .select('produk_id, jumlah')
          .eq('cabang_id', targetCabangId);

        (stockData || []).forEach((st: any) => {
          stockMap.set(st.produk_id, st.jumlah);
        });
      }

      const productsWithStock: ProductWithStock[] = allProducts.map((p) => ({
        ...p,
        stok_tersedia: p.lacak_stok ? (stockMap.get(p.id) ?? 0) : null,
      }));

      setProducts(productsWithStock);
    }

    setIsLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Cart Handlers
  const handleAddToCart = (product: ProductWithStock) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      const currentQty = existing ? existing.jumlah : 0;
      const maxStock = product.lacak_stok ? (product.stok_tersedia ?? 99) : 99;

      if (currentQty >= maxStock) {
        return prev;
      }

      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, jumlah: item.jumlah + 1 }
            : item
        );
      }

      return [...prev, { product, jumlah: 1 }];
    });
  };

  const handleUpdateQuantity = (productId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.product.id === productId) {
            const nextQty = item.jumlah + delta;
            const maxStock = item.product.lacak_stok
              ? (item.product.stok_tersedia ?? 99)
              : 99;

            if (nextQty <= 0) return null;
            if (nextQty > maxStock) return item;
            return { ...item, jumlah: nextQty };
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const handleRemoveItem = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const handleClearCart = () => {
    setCart([]);
  };

  const handleProceedToPayment = (diskon: number, alasan: string) => {
    setCurrentDiskon(diskon);
    setCurrentAlasanDiskon(alasan);
    setIsPaymentModalOpen(true);
  };

  const handleCheckoutSuccess = (
    result: CheckoutRPCResponse,
    paymentDetails: { metodeBayar: any; uangDiterima: number; kembalian: number }
  ) => {
    setIsPaymentModalOpen(false);

    // Siapkan data cetak struk
    const receipt: ReceiptData = {
      namaCabang: cabang ? cabang.nama : 'Lumbung POS',
      alamatCabang: cabang?.alamat || 'Jl. Raya Lumbung',
      nomorStruk: result.nomor_struk,
      waktu: new Date().toLocaleString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      namaKasir: profile?.nama_lengkap || 'Kasir',
      items: cart.map((c) => ({
        nama_produk: c.product.nama,
        jumlah: c.jumlah,
        harga_satuan: c.product.harga_jual,
        subtotal: c.product.harga_jual * c.jumlah,
      })),
      subtotal: result.subtotal,
      diskon: result.diskon,
      alasanDiskon: currentAlasanDiskon,
      total: result.total,
      metodeBayar: paymentDetails.metodeBayar,
      uangDiterima: paymentDetails.uangDiterima,
      kembalian: paymentDetails.kembalian,
    };

    setReceiptData(receipt);
    setIsReceiptModalOpen(true);

    // Refresh katalog agar sisa stok berkurang secara real-time
    loadData();
  };

  const handleNewTransaction = () => {
    setCart([]);
    setCurrentDiskon(0);
    setCurrentAlasanDiskon('');
    setReceiptData(null);
    setIsReceiptModalOpen(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-2 text-muted-foreground text-sm">
          <Clock className="h-6 w-6 animate-spin text-primary" />
          <span>Memuat sistem kasir POS...</span>
        </div>
      </div>
    );
  }

  // BR-02: Kasir WAJIB memiliki shift aktif 'buka' untuk melayani pesanan
  if (!activeShift) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <Card className="border-dashed border-2 border-primary/50 bg-primary/5 shadow-md">
          <CardContent className="flex flex-col items-center text-center p-8 space-y-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <Clock className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-serif text-foreground">
                Sesi Kasir Belum Dibuka (BR-02)
              </h2>
              <p className="text-sm text-muted-foreground max-w-md mt-1">
                Sesuai aturan operasional toko, Anda harus membuka sesi shift kasir dan mencatat kas awal di laci sebelum dapat memproses transaksi penjualan.
              </p>
            </div>
            <Button asChild className="h-11 px-6 shadow-md bg-primary hover:bg-primary/90 text-primary-foreground font-medium">
              <Link href="/shift-saya">
                <span>Buka Shift Saya Sekarang</span>
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const subtotalCart = cart.reduce(
    (sum, item) => sum + item.product.harga_jual * item.jumlah,
    0
  );
  const totalCart = Math.max(0, subtotalCart - currentDiskon);

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col lg:flex-row gap-5">
      {/* Kolom Kiri: Katalog Produk (65% width di desktop/tablet) */}
      <div className="flex-1 h-full overflow-hidden">
        <ProductCatalog products={products} onAddToCart={handleAddToCart} />
      </div>

      {/* Kolom Kanan: Panel Keranjang & Checkout (35% width di desktop/tablet) */}
      <div className="w-full lg:w-[400px] xl:w-[440px] h-full shrink-0">
        <CartPanel
          cart={cart}
          onUpdateQuantity={handleUpdateQuantity}
          onRemoveItem={handleRemoveItem}
          onClearCart={handleClearCart}
          onProceedToPayment={handleProceedToPayment}
        />
      </div>

      {/* Modal Pembayaran */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        shiftId={activeShift.id}
        cart={cart}
        subtotal={subtotalCart}
        diskon={currentDiskon}
        alasanDiskon={currentAlasanDiskon}
        total={totalCart}
        onSuccessCheckout={handleCheckoutSuccess}
      />

      {/* Modal Cetak Struk */}
      <ReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        receiptData={receiptData}
        onNewTransaction={handleNewTransaction}
      />
    </div>
  );
}
