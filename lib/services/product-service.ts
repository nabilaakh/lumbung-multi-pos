import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/types/database';

export const PRODUCT_CATEGORIES = ['kopi', 'non_kopi', 'roti', 'snack', 'kemasan'] as const;
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export interface CostHistoryEntry {
  id: string;
  harga_modal: number;
  berlaku_mulai: string;
  dibuat_pada: string;
  dibuat_oleh?: string | null;
}

export interface ProductWithCost {
  id: string;
  sku: string;
  nama: string;
  kategori: string;
  harga_jual: number;
  aktif: boolean;
  lacak_stok: boolean;
  dibuat_pada: string;
  diubah_pada: string;
  stok_minimum?: number;
  harga_modal_terakhir?: number;
  riwayat_harga_modal?: CostHistoryEntry[];
}

export interface ProductInput {
  sku: string;
  nama: string;
  kategori: ProductCategory;
  harga_jual: number;
  aktif: boolean;
  lacak_stok: boolean;
  stok_minimum?: number;
  harga_modal?: number;
}

export function isValidCategory(kategori: string): kategori is ProductCategory {
  return PRODUCT_CATEGORIES.includes(kategori as ProductCategory);
}

export function canSellProduct(product: { aktif: boolean }): boolean {
  return product.aktif === true;
}

/**
 * BR-11, TC-09, TC-18: Sanitize product object to ensure cost price is hidden
 * from any role other than 'owner'.
 */
export function filterProductForRole(
  product: ProductWithCost,
  role?: string
): ProductWithCost {
  if (role === 'owner') {
    return product;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { harga_modal_terakhir, riwayat_harga_modal, ...rest } = product;
  return rest as ProductWithCost;
}

/**
 * Fetch products list with role-based cost price inclusion
 */
export async function getProducts(role?: string): Promise<ProductWithCost[]> {
  const supabase = createClient();

  const { data: products, error } = await supabase
    .from('produk')
    .select('*')
    .order('nama', { ascending: true });

  if (error) {
    console.error('Error fetching products:', error);
    throw error;
  }

  if (!products) return [];

  // If role is owner, we fetch the latest cost prices from riwayat_harga_modal
  if (role === 'owner') {
    const { data: costs } = await supabase
      .from('riwayat_harga_modal')
      .select('id, produk_id, harga_modal, berlaku_mulai, dibuat_pada')
      .order('berlaku_mulai', { ascending: false });

    const costMap = new Map<string, CostHistoryEntry[]>();
    (costs || []).forEach((c) => {
      const list = costMap.get(c.produk_id) || [];
      list.push({
        id: c.id,
        harga_modal: c.harga_modal,
        berlaku_mulai: c.berlaku_mulai,
        dibuat_pada: c.dibuat_pada,
      });
      costMap.set(c.produk_id, list);
    });

    return products.map((p) => {
      const hist = costMap.get(p.id) || [];
      return {
        ...p,
        harga_modal_terakhir: hist[0]?.harga_modal,
        riwayat_harga_modal: hist,
      };
    });
  }

  // For non-owner, strip any cost price
  return products.map((p) => filterProductForRole(p as ProductWithCost, role));
}

/**
 * Get complete cost price history for a specific product (Owner only)
 */
export async function getProductCostHistory(productId: string): Promise<CostHistoryEntry[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('riwayat_harga_modal')
    .select('id, harga_modal, berlaku_mulai, dibuat_pada')
    .eq('produk_id', productId)
    .order('berlaku_mulai', { ascending: false });

  if (error) {
    console.error('Error fetching cost history:', error);
    throw error;
  }

  return (data as CostHistoryEntry[]) || [];
}

/**
 * Create a new product (Owner only)
 */
export async function createProduct(
  input: ProductInput,
  ownerId?: string
): Promise<{ success: boolean; data?: ProductWithCost; error?: string }> {
  const supabase = createClient();

  if (!isValidCategory(input.kategori)) {
    return { success: false, error: 'Kategori produk tidak valid' };
  }

  const { data: newProd, error: prodErr } = await supabase
    .from('produk')
    .insert({
      sku: input.sku.trim().toUpperCase(),
      nama: input.nama.trim(),
      kategori: input.kategori,
      harga_jual: input.harga_jual,
      aktif: input.aktif,
      lacak_stok: input.lacak_stok,
    })
    .select()
    .single();

  if (prodErr) {
    return { success: false, error: prodErr.message };
  }

  // If cost price provided and owner present, add initial cost history
  if (input.harga_modal && input.harga_modal > 0 && ownerId) {
    await supabase.from('riwayat_harga_modal').insert({
      produk_id: newProd.id,
      harga_modal: input.harga_modal,
      berlaku_mulai: new Date().toISOString(),
      dibuat_oleh: ownerId,
    });
  }

  // Initialize stock for all branches if tracking stock
  if (input.lacak_stok) {
    const { data: branches } = await supabase.from('cabang').select('id');
    if (branches && branches.length > 0) {
      const stockInserts = branches.map((b) => ({
        cabang_id: b.id,
        produk_id: newProd.id,
        jumlah: 0,
        stok_minimum: input.stok_minimum || 10,
      }));
      await supabase.from('stok_cabang').insert(stockInserts);
    }
  }

  return { success: true, data: newProd as ProductWithCost };
}

/**
 * Update existing product (Owner only)
 */
export async function updateProduct(
  id: string,
  input: Partial<ProductInput>,
  ownerId?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  type ProductUpdate = Database['public']['Tables']['produk']['Update'];
  const updatePayload: ProductUpdate = {};
  if (input.sku !== undefined) updatePayload.sku = input.sku.trim().toUpperCase();
  if (input.nama !== undefined) updatePayload.nama = input.nama.trim();
  if (input.kategori !== undefined) updatePayload.kategori = input.kategori;
  if (input.harga_jual !== undefined) updatePayload.harga_jual = input.harga_jual;
  if (input.aktif !== undefined) updatePayload.aktif = input.aktif;
  if (input.lacak_stok !== undefined) updatePayload.lacak_stok = input.lacak_stok;
  updatePayload.diubah_pada = new Date().toISOString();

  const { error: prodErr } = await supabase
    .from('produk')
    .update(updatePayload)
    .eq('id', id);

  if (prodErr) {
    return { success: false, error: prodErr.message };
  }

  // If new cost price is provided
  if (input.harga_modal !== undefined && input.harga_modal > 0 && ownerId) {
    await supabase.from('riwayat_harga_modal').insert({
      produk_id: id,
      harga_modal: input.harga_modal,
      berlaku_mulai: new Date().toISOString(),
      dibuat_oleh: ownerId,
    });
  }

  return { success: true };
}
