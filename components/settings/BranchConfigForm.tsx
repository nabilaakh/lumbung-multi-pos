'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Cabang } from '@/types/database';
import { Building2, MapPin, Phone, CheckCircle2 } from 'lucide-react';

interface BranchConfigFormProps {
  branches: Cabang[];
}

export function BranchConfigForm({ branches }: BranchConfigFormProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {branches.map((b) => (
          <Card key={b.id} className="border-border shadow-sm bg-card overflow-hidden">
            <CardHeader className="bg-muted/50 border-b pb-3 pt-4">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="font-mono font-medium text-xs">
                  {b.kode}
                </Badge>
                {b.aktif ? (
                  <Badge variant="success" className="font-medium text-xs px-2.5 py-0.5 rounded-full">
                    Operasional Aktif
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="font-medium text-xs px-2.5 py-0.5 rounded-full">
                    Nonaktif
                  </Badge>
                )}
              </div>
              <CardTitle className="text-base font-bold text-foreground mt-2">
                {b.nama}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 text-xs space-y-2 text-muted-foreground">
              <div className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                <span>{b.alamat || 'Alamat cabang belum diatur'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="font-mono text-[11px]">No. Struk Terakhir: #{b.urut_struk_terakhir}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
