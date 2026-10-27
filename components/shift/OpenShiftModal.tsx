'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { openShift, validateOpeningCash } from '@/lib/services/shift-service';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertCircle, Loader2, PlayCircle, Wallet } from 'lucide-react';

interface OpenShiftModalProps {
  cashierId: string;
  cabangId: string;
  onShiftOpened: () => void;
}

export function OpenShiftModal({ cashierId, cabangId, onShiftOpened }: OpenShiftModalProps) {
  const supabase = createClient();
  const [isOpen, setIsOpen] = useState(false);
  const [kasAwal, setKasAwal] = useState<string>('500000');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const nominal = parseInt(kasAwal.replace(/\D/g, ''), 10) || 0;
    const validation = validateOpeningCash(nominal);
    if (!validation.valid) {
      setErrorMessage(validation.errorMessage);
      return;
    }

    setIsLoading(true);
    const { error } = await openShift(supabase, {
      cabangId,
      cashierId,
      kasAwal: nominal,
    });

    setIsLoading(false);

    if (error) {
      setErrorMessage(error);
      return;
    }

    setIsOpen(false);
    toast.success("Shift kasir berhasil dibuka. Selamat bertugas!");
    onShiftOpened();
  };

  const handleQuickNominal = (value: number) => {
    setKasAwal(value.toString());
    setErrorMessage(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="h-11 px-6 shadow-md font-medium">
          <PlayCircle className="h-5 w-5 mr-2" />
          Buka Sesi Shift Baru
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleOpenShift}>
          <DialogHeader>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary mb-2">
              <Wallet className="h-6 w-6" />
            </div>
            <DialogTitle className="text-xl">Buka Sesi Shift Kasir</DialogTitle>
            <DialogDescription>
              Masukkan jumlah modal kas awal di laci kasir saat membuka toko (Maksimal Rp2.000.000).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {errorMessage && (
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="kasAwal" className="text-sm font-medium">
                Nominal Kas Awal (Rp)
              </label>
              <Input
                id="kasAwal"
                type="number"
                min="0"
                max="2000000"
                step="1000"
                value={kasAwal}
                onChange={(e) => {
                  setKasAwal(e.target.value);
                  setErrorMessage(null);
                }}
                disabled={isLoading}
                required
                className="h-11 text-lg font-semibold"
                placeholder="Contoh: 500000"
              />
            </div>

            <div className="space-y-1.5">
              <span className="text-xs text-muted-foreground font-medium">Pilihan Cepat Modal:</span>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickNominal(200000)}
                >
                  Rp200.000
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickNominal(500000)}
                >
                  Rp500.000
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickNominal(1000000)}
                >
                  Rp1.000.000
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Membuka Shift...
                </>
              ) : (
                'Buka Shift Sekarang'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
