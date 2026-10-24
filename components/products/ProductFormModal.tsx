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
import { Badge } from '@/components/ui/badge';
import {
  ProductWithCost,
  ProductCategory,
  PRODUCT_CATEGORIES,
  createProduct,
  updateProduct,
} from '@/lib/services/product-service';
import { Package, Lock, AlertTriangle, Loader2, CheckCircle2 } from 'lucide-react';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: ProductWithCost | null;
  onSuccess: () => void;
  userRole: string;
  ownerId?: string;
}

export function ProductFormModal({
  isOpen,
  onClose,
  product,
  onSuccess,
  userRole,
  ownerId,
}: ProductFormModalProps) {
  const isEditing = !!product;
  const isOwner = userRole === 'owner';

  const [sku, setSku] = useState('');
  const [nama, setNama] = useState('');
  const [kategori, setKategori] = useState<ProductCategory>('kopi');
  const [hargaJual, setHargaJual] = useState<number>(0);
  const [hargaModal, setHargaModal] = useState<number>(0);
  const [aktif, setAktif] = useState(true);
  const [lacakStok, setLacakStok] = useState(true);
  const [stokMinimum, setStokMinimum] = useState<number>(10);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (product) {
      setSku(product.sku);
      setNama(product.nama);
      setKategori(product.kategori as ProductCategory);
      setHargaJual(product.harga_jual);
      setHargaModal(product.harga_modal_terakhir || 0);
      setAktif(product.aktif);
      setLacakStok(product.lacak_stok);
      setStokMinimum(product.stok_minimum ?? 10);
    } else {
      setSku('');
      setNama('');
      setKategori('kopi');
      setHargaJual(0);
      setHargaModal(0);
      setAktif(true);
      setLacakStok(true);
      setStokMinimum(10);
    }
    setError(null);
  }, [product, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!sku.trim() || !nama.trim()) {
      setError('SKU dan Nama Produk wajib diisi');
      return;
    }

    if (hargaJual < 0) {
      setError('Harga jual tidak boleh negatif');
      return;
    }

    try {
      setLoading(true);

      if (isEditing && product) {
        const res = await updateProduct(
          product.id,
          {
            sku,
            nama,
            kategori,
            harga_jual: hargaJual,
            aktif,
            lacak_stok: lacakStok,
            stok_minimum: stokMinimum,
            harga_modal: isOwner && hargaModal > 0 ? hargaModal : undefined,
          },
          ownerId
        );

        if (!res.success) {
          setError(res.error || 'Gagal mengubah produk');
          return;
        }
      } else {
        const res = await createProduct(
          {
            sku,
            nama,
            kategori,
            harga_jual: hargaJual,
            aktif,
            lacak_stok: lacakStok,
            stok_minimum: stokMinimum,
            harga_modal: isOwner && hargaModal > 0 ? hargaModal : undefined,
          },
          ownerId
        );

        if (!res.success) {
          setError(res.error || 'Gagal menambahkan produk');
          return;
        }
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan sistem');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            <DialogTitle className="text-base font-bold text-foreground">
              {isEditing ? 'Ubah Master Produk' : 'Tambah Produk Baru'}
            </DialogTitle>
          </div>
          <p className="text-xs text-muted-foreground">
            Kelola data katalog produk untuk transaksi POS dan perhitungan margin.
          </p>
        </DialogHeader>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive p-3 rounded-lg text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-destructive" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <label className="font-semibold text-foreground">SKU / Kode</label>
              <Input
                type="text"
                placeholder="KOP-001"
                value={sku}
                onChange={(e) => setSku(e.target.value.toUpperCase())}
                className="font-mono text-xs uppercase h-9"
                required
              />
            </div>
            <div className="col-span-2 space-y-1">
              <label className="font-semibold text-foreground">Nama Produk</label>
              <Input
                type="text"
                placeholder="Espresso Single"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                className="text-xs h-9"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="font-semibold text-foreground">Kategori (BR-01)</label>
              <select
                value={kategori}
                onChange={(e) => setKategori(e.target.value as ProductCategory)}
                className="w-full h-9 px-3 rounded-md border border-border bg-card text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {PRODUCT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-foreground">Harga Jual (Rp)</label>
              <Input
                type="number"
                min="0"
                value={hargaJual}
                onChange={(e) => setHargaJual(parseInt(e.target.value) || 0)}
                className="font-mono text-xs font-semibold h-9"
                required
              />
            </div>
          </div>

          {/* Owner Only: Harga Modal (BR-11) */}
          {isOwner && (
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="font-bold text-foreground flex items-center gap-1.5 text-xs">
                  <Lock className="w-3.5 h-3.5 text-primary" />
                  Harga Modal / HPP (Khusus Owner - BR-11)
                </label>
                <Badge className="bg-primary/20 text-primary text-[10px]">Rahasia</Badge>
              </div>
              <Input
                type="number"
                min="0"
                placeholder="7500"
                value={hargaModal}
                onChange={(e) => setHargaModal(parseInt(e.target.value) || 0)}
                className="font-mono text-xs font-bold bg-card border-primary/30 h-9"
              />
              <p className="text-[10px] text-muted-foreground">
                Data HPP ini tidak dapat diakses atau dilihat oleh Kepala Toko maupun Kasir.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 pt-1 border-t">
            <div className="space-y-1">
              <label className="font-semibold text-foreground">Batas Stok Minimum</label>
              <Input
                type="number"
                min="0"
                value={stokMinimum}
                onChange={(e) => setStokMinimum(parseInt(e.target.value) || 0)}
                className="font-mono text-xs h-9"
              />
            </div>

            <div className="flex flex-col justify-center space-y-1 pt-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={aktif}
                  onChange={(e) => setAktif(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary w-4 h-4"
                />
                <span className="font-semibold text-foreground">Produk Aktif (Dapat Dijual)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={lacakStok}
                  onChange={(e) => setLacakStok(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary w-4 h-4"
                />
                <span className="text-muted-foreground text-[11px]">Lacak Stok di Cabang</span>
              </label>
            </div>
          </div>

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
            <Button
              type="submit"
              size="sm"
              disabled={loading}
              className="text-xs gap-1.5"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {isEditing ? 'Simpan Perubahan' : 'Buat Produk'}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
