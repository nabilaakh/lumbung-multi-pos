'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  executeCheckoutRPC,
  validatePayment,
  type CheckoutRPCResponse,
} from '@/lib/services/checkout-service';
import type { CartItem } from './CartPanel';
import type { MetodeBayar } from '@/types/database';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Wallet,
  QrCode,
  AlertCircle,
  Receipt,
  Clock,
  Copy,
  Check,
  ExternalLink,
  Loader2,
  AlertTriangle,
  XCircle,
  Sparkles,
} from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  shiftId: string;
  cart: CartItem[];
  subtotal: number;
  diskon: number;
  alasanDiskon?: string | null;
  total: number;
  onSuccessCheckout: (
    result: CheckoutRPCResponse,
    paymentDetails: { metodeBayar: MetodeBayar; uangDiterima: number; kembalian: number }
  ) => void;
}

interface QrisSessionState {
  transaksiId: string;
  nomorStruk: string;
  paymentUrl: string;
  qrCodeUrl: string;
  expiredAt: string;
  isMock: boolean;
  subtotal: number;
  diskon: number;
  total: number;
}

export function PaymentModal({
  isOpen,
  onClose,
  shiftId,
  cart,
  subtotal,
  diskon,
  alasanDiskon,
  total,
  onSuccessCheckout,
}: PaymentModalProps) {
  const supabase = createClient();
  const [metodeBayar, setMetodeBayar] = useState<MetodeBayar>('tunai');
  const [uangDiterimaInput, setUangDiterimaInput] = useState<string>(total.toString());
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // QRIS Session State
  const [qrisSession, setQrisSession] = useState<QrisSessionState | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(600); // 10 menit = 600 detik
  const [isCopied, setIsCopied] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isSimulatingPay, setIsSimulatingPay] = useState(false);

  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Reset state saat modal dibuka atau total berubah
  useEffect(() => {
    if (isOpen) {
      setMetodeBayar('tunai');
      setUangDiterimaInput(total.toString());
      setErrorMessage(null);
      setQrisSession(null);
      setRemainingSeconds(600);
      setIsCopied(false);
    }
  }, [isOpen, total]);

  // Cleanup timer saat modal ditutup atau unmount
  const stopTimers = useCallback(() => {
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopTimers();
  }, [stopTimers]);

  const nominalDiterima =
    metodeBayar === 'qris'
      ? total
      : parseInt(uangDiterimaInput.replace(/\D/g, ''), 10) || 0;

  const paymentValidation = validatePayment(total, metodeBayar, nominalDiterima);
  const kembalian = paymentValidation.valid ? paymentValidation.kembalian : 0;

  const handleQuickNominal = (val: number) => {
    setUangDiterimaInput(val.toString());
    setErrorMessage(null);
  };

  // 1. Eksekusi Checkout Tunai
  const handleCashCheckout = async () => {
    setErrorMessage(null);

    if (!paymentValidation.valid) {
      setErrorMessage(paymentValidation.errorMessage);
      return;
    }

    setIsLoading(true);

    const itemsPayload = cart.map((item) => ({
      produk_id: item.product.id,
      jumlah: item.jumlah,
    }));

    const { data, error } = await executeCheckoutRPC(supabase, {
      shiftId,
      items: itemsPayload,
      diskon,
      alasanDiskon,
      metodeBayar: 'tunai',
      uangDiterima: nominalDiterima,
    });

    setIsLoading(false);

    if (error || !data) {
      setErrorMessage(error || 'Checkout gagal diproses.');
      return;
    }

    onSuccessCheckout(data, {
      metodeBayar: 'tunai',
      uangDiterima: nominalDiterima,
      kembalian,
    });
  };

  // 2. Inisiasi QRIS Mayar
  const handleInitiateQris = async () => {
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const itemsPayload = cart.map((item) => ({
        produk_id: item.product.id,
        nama: item.product.nama,
        harga_satuan: item.product.harga_jual,
        jumlah: item.jumlah,
      }));

      const res = await fetch('/api/pos/qris/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shiftId,
          items: itemsPayload,
          diskon,
          alasanDiskon,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal membuat tagihan QRIS.');
      }

      // Hitung sisa detik dari expiredAt (maksimal 600 detik / 10 menit sesuai PRD Bagian 11)
      const expMs = data.expiredAt ? new Date(data.expiredAt).getTime() : Date.now() + 600 * 1000;
      const rawSecs = Math.floor((expMs - Date.now()) / 1000);
      const diffSecs = Math.max(0, Math.min(rawSecs > 0 ? rawSecs : 600, 600));

      const session: QrisSessionState = {
        transaksiId: data.transaksi_id,
        nomorStruk: data.nomor_struk,
        paymentUrl: data.paymentUrl,
        qrCodeUrl: data.qrCodeUrl,
        expiredAt: data.expiredAt,
        isMock: !!data.isMock,
        subtotal: data.subtotal,
        diskon: data.diskon,
        total: data.total,
      };

      setQrisSession(session);
      setRemainingSeconds(diffSecs);
      setIsLoading(false);

      // Mulai Polling Status dan Countdown
      startQrisTimers(session.transaksiId);
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err.message || 'Terjadi kesalahan saat inisiasi QRIS.');
    }
  };

  // 3. Batalkan Transaksi QRIS (Rollback Stok)
  const handleCancelQris = async (alasan = 'Dibatalkan oleh kasir') => {
    if (!qrisSession) return;
    stopTimers();
    setIsCancelling(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/pos/qris/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transaksi_id: qrisSession.transaksiId,
          alasan,
        }),
      });

      const data = await res.json();
      setIsCancelling(false);

      if (!res.ok) {
        throw new Error(data.error || 'Gagal membatalkan transaksi');
      }

      setQrisSession(null);
      setErrorMessage(
        alasan.includes('kedaluwarsa')
          ? 'Waktu pembayaran 10 menit telah habis. Transaksi dibatalkan dan stok dikembalikan.'
          : 'Transaksi QRIS berhasil dibatalkan dan stok telah dikembalikan ke laci toko.'
      );
    } catch (err: any) {
      setIsCancelling(false);
      setErrorMessage(err.message || 'Gagal membatalkan transaksi.');
    }
  };

  // 4. Simulasi Pembayaran Berhasil (Dev/Mock Mode Helper)
  const handleSimulatePayment = async () => {
    if (!qrisSession) return;
    setIsSimulatingPay(true);
    try {
      const res = await fetch('/api/pos/qris/mock-pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transaksi_id: qrisSession.transaksiId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Simulasi bayar gagal');
      }
      // Status poller otomatis akan menangkap status lunas pada interval berikutnya
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal simulasi pembayaran.');
    } finally {
      setIsSimulatingPay(false);
    }
  };

  // 5. Timer & Polling Runner
  const startQrisTimers = (transaksiId: string) => {
    stopTimers();

    // Countdown 1 detik per tick
    countdownTimerRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          stopTimers();
          // Auto cancel saat waktu habis
          handleCancelQris('Waktu pembayaran kedaluwarsa (10 menit habis)');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Polling status setiap 3 detik
    pollingTimerRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/pos/qris/status?transaksi_id=${transaksiId}`);
        if (!res.ok) return;

        const data = await res.json();

        if (data.status === 'lunas') {
          stopTimers();

          const rpcMockResponse: CheckoutRPCResponse = {
            transaksi_id: transaksiId,
            nomor_struk: data.nomor_struk || 'STRUK-QRIS',
            subtotal: data.subtotal || subtotal,
            diskon: data.diskon || diskon,
            total: data.total || total,
            metode_bayar: 'qris',
            uang_diterima: data.total || total,
            kembalian: 0,
            dibuat_pada: data.dibayar_pada || new Date().toISOString(),
          };

          onSuccessCheckout(rpcMockResponse, {
            metodeBayar: 'qris',
            uangDiterima: data.total || total,
            kembalian: 0,
          });
        } else if (data.status === 'batal') {
          stopTimers();
          setQrisSession(null);
          setErrorMessage('Transaksi ini telah dibatalkan di sistem.');
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 3000);
  };

  const handleCopyPaymentLink = () => {
    if (!qrisSession?.paymentUrl) return;
    navigator.clipboard.writeText(qrisSession.paymentUrl);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Format detik ke MM:SS
  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Cegah kasir menutup modal secara tidak sengaja saat QRIS sedang aktif
  const handleModalClose = () => {
    if (isLoading || isCancelling) return;
    if (qrisSession) {
      if (
        window.confirm(
          'Transaksi QRIS masih menunggu pembayaran. Apakah Anda yakin ingin membatalkan transaksi ini dan mengembalikan stok?'
        )
      ) {
        handleCancelQris('Dibatalkan karena kasir menutup modal');
        onClose();
      }
      return;
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleModalClose()}>
      <DialogContent className={`sm:max-w-md ${qrisSession ? 'sm:max-w-lg' : ''}`}>
        <DialogHeader>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary mb-2">
            {qrisSession ? <QrCode className="h-6 w-6" /> : <Receipt className="h-6 w-6" />}
          </div>
          <DialogTitle className="text-xl">
            {qrisSession ? 'QRIS Dinamis Mayar' : 'Pembayaran Transaksi'}
          </DialogTitle>
          <DialogDescription>
            {qrisSession
              ? `Tunjukkan QRIS ke pelanggan. Tagihan berlaku 10 menit (Struk #${qrisSession.nomorStruk}).`
              : 'Pilih metode pembayaran dan selesaikan transaksi kasir.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {errorMessage && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20 animate-in fade-in">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* VIEW 1: Pemilihan Metode & Checkout Tunai */}
          {!qrisSession && (
            <>
              {/* Banner Total Tagihan */}
              <div className="p-4 rounded-xl bg-muted/60 border flex justify-between items-center">
                <div>
                  <span className="text-xs text-muted-foreground font-medium">Total yang Harus Dibayar:</span>
                  <p className="text-2xl font-extrabold text-foreground">
                    Rp{total.toLocaleString('id-ID')}
                  </p>
                </div>
                {diskon > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    Diskon: Rp{diskon.toLocaleString('id-ID')}
                  </Badge>
                )}
              </div>

              {/* Pemilihan Metode Bayar */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Metode Pembayaran
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant={metodeBayar === 'tunai' ? 'default' : 'outline'}
                    onClick={() => {
                      setMetodeBayar('tunai');
                      setUangDiterimaInput(total.toString());
                      setErrorMessage(null);
                    }}
                    className={`h-12 text-sm font-semibold flex items-center justify-center gap-2 ${
                      metodeBayar === 'tunai'
                        ? 'bg-primary hover:bg-primary/90 text-primary-foreground'
                        : 'bg-card'
                    }`}
                  >
                    <Wallet className="h-4 w-4" />
                    <span>Tunai (Cash)</span>
                  </Button>

                  <Button
                    type="button"
                    variant={metodeBayar === 'qris' ? 'default' : 'outline'}
                    onClick={() => {
                      setMetodeBayar('qris');
                      setUangDiterimaInput(total.toString());
                      setErrorMessage(null);
                    }}
                    className={`h-12 text-sm font-semibold flex items-center justify-center gap-2 ${
                      metodeBayar === 'qris'
                        ? 'bg-primary hover:bg-primary/90 text-primary-foreground'
                        : 'bg-card'
                    }`}
                  >
                    <QrCode className="h-4 w-4" />
                    <span>QRIS Dinamis</span>
                  </Button>
                </div>
              </div>

              {/* Form Tunai */}
              {metodeBayar === 'tunai' ? (
                <div className="space-y-3 p-3.5 rounded-xl border bg-card">
                  <div className="space-y-1.5">
                    <label htmlFor="uangDiterima" className="text-xs font-semibold text-foreground">
                      Uang Tunai Diterima (Rp)
                    </label>
                    <Input
                      id="uangDiterima"
                      type="number"
                      min="0"
                      step="500"
                      value={uangDiterimaInput}
                      onChange={(e) => {
                        setUangDiterimaInput(e.target.value);
                        setErrorMessage(null);
                      }}
                      disabled={isLoading}
                      required
                      className="h-11 text-lg font-bold"
                      placeholder="0"
                    />
                  </div>

                  {/* Tombol Cepat Nominal */}
                  <div className="grid grid-cols-4 gap-1.5 text-xs">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickNominal(total)}
                      className="text-xs"
                    >
                      Uang Pas
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickNominal(50000)}
                      className="text-xs"
                    >
                      50.000
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickNominal(100000)}
                      className="text-xs"
                    >
                      100.000
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickNominal(200000)}
                      className="text-xs"
                    >
                      200.000
                    </Button>
                  </div>

                  {/* Kalkulasi Kembalian */}
                  <div className="pt-2 border-t flex justify-between items-center text-sm">
                    <span className="font-semibold text-muted-foreground">Uang Kembalian:</span>
                    <span
                      className={`text-lg font-extrabold ${
                        paymentValidation.valid
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-destructive text-sm'
                      }`}
                    >
                      {paymentValidation.valid
                        ? `Rp${kembalian.toLocaleString('id-ID')}`
                        : 'Nominal Kurang'}
                    </span>
                  </div>
                </div>
              ) : (
                /* Preview Pengalihan QRIS Dinamis */
                <div className="p-4 rounded-xl border bg-card/60 flex flex-col items-center justify-center space-y-3 text-center">
                  <div className="h-14 w-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                    <QrCode className="h-7 w-7" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-foreground">
                      Integrasi Mayar QRIS Dinamis
                    </p>
                    <p className="text-xs text-muted-foreground max-w-xs mt-1">
                      Klik tombol di bawah untuk membuat invoice Mayar dan kode QRIS otomatis sebesar{' '}
                      <span className="font-bold text-foreground">Rp{total.toLocaleString('id-ID')}</span>. Stok akan direservasi selama 10 menit.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* VIEW 2: Tampilan Aktif QRIS Dinamis (Countdown + Polling) */}
          {qrisSession && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Timer Bar & Info Mode */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-primary/5 border border-primary/20 text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary animate-pulse" />
                  <span className="text-xs font-semibold text-muted-foreground">Sisa Waktu Bayar:</span>
                  <span
                    className={`font-mono font-extrabold text-base ${
                      remainingSeconds < 60 ? 'text-destructive animate-pulse' : 'text-primary'
                    }`}
                  >
                    {formatTimer(remainingSeconds)}
                  </span>
                </div>
                {qrisSession.isMock && (
                  <Badge variant="outline" className="text-[10px] bg-background border-amber-500/40 text-amber-600 dark:text-amber-400 font-medium">
                    Sandbox / Mock
                  </Badge>
                )}
              </div>

              {/* Tampilan QR Code Dinamis */}
              <div className="flex flex-col items-center justify-center p-4 rounded-2xl border bg-card shadow-sm space-y-3">
                <div className="relative p-3 bg-white rounded-xl shadow border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrisSession.qrCodeUrl}
                    alt="QRIS Mayar POS"
                    className="w-48 h-48 object-contain rounded"
                  />
                </div>

                <div className="text-center space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Total Tagihan QRIS
                  </p>
                  <p className="text-2xl font-black text-foreground">
                    Rp{qrisSession.total.toLocaleString('id-ID')}
                  </p>
                </div>

                {/* Status Indicator (Pulsing) */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-medium">
                  <Loader2 className="h-3 w-3 animate-spin text-emerald-600 dark:text-emerald-400" />
                  <span>Menunggu pembayaran pelanggan...</span>
                </div>
              </div>

              {/* Actions Tautan Pembayaran */}
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyPaymentLink}
                  className="flex-1 text-xs h-9"
                >
                  {isCopied ? (
                    <>
                      <Check className="h-3.5 w-3.5 mr-1.5 text-emerald-600" />
                      Tersalin!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 mr-1.5" />
                      Salin Link Bayar
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  asChild
                  className="flex-1 text-xs h-9"
                >
                  <a href={qrisSession.paymentUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                    Buka Link Mayar
                  </a>
                </Button>
              </div>

              {/* Helper Simulasi Pembayaran untuk Developer / Pengujian Sandbox */}
              {qrisSession.isMock && (
                <div className="p-3 rounded-xl bg-muted/60 border border-dashed flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <p className="font-semibold text-foreground flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                      Fitur Pengujian Sandbox
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Simulasikan status sukses tanpa scan fisik
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={handleSimulatePayment}
                    disabled={isSimulatingPay}
                    className="h-8 text-xs font-medium"
                  >
                    {isSimulatingPay ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      'Simulasi Bayar'
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
          {!qrisSession ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
              >
                Batal
              </Button>
              {metodeBayar === 'tunai' ? (
                <Button
                  type="button"
                  onClick={handleCashCheckout}
                  disabled={isLoading || !paymentValidation.valid}
                  className="font-bold"
                >
                  {isLoading ? 'Memproses Transaksi...' : 'Selesaikan Pembayaran Tunai'}
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleInitiateQris}
                  disabled={isLoading}
                  className="font-bold bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Membuat QRIS Mayar...
                    </>
                  ) : (
                    <>
                      <QrCode className="h-4 w-4 mr-2" />
                      Buat Tagihan QRIS & Tampilkan QR
                    </>
                  )}
                </Button>
              )}
            </>
          ) : (
            <div className="w-full flex items-center justify-between">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => handleCancelQris('Dibatalkan oleh kasir secara manual')}
                disabled={isCancelling}
                className="h-10 text-xs font-semibold"
              >
                {isCancelling ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    Membatalkan & Merollback Stok...
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 mr-1.5" />
                    Batalkan Transaksi (Kembalikan Stok)
                  </>
                )}
              </Button>

              <p className="text-[11px] text-muted-foreground text-right">
                Otomatis batal jika 10 menit habis
              </p>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
