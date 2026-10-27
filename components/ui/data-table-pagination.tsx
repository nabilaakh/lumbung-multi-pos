'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';

export interface DataTablePaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  className?: string;
}

export function DataTablePagination({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50],
  className = '',
}: DataTablePaginationProps) {
  const safeTotalPages = Math.max(1, totalPages);
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  const canGoPrev = currentPage > 1;
  const canGoNext = currentPage < safeTotalPages;

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-border/60 bg-muted/20 text-xs text-muted-foreground ${className}`}
    >
      {/* Keterangan Data */}
      <div className="flex items-center gap-4">
        <div>
          {totalItems === 0 ? (
            <span>Menampilkan 0 data</span>
          ) : (
            <span>
              Menampilkan <strong className="text-foreground">{startItem}</strong> -{' '}
              <strong className="text-foreground">{endItem}</strong> dari{' '}
              <strong className="text-foreground">{totalItems}</strong> data
            </span>
          )}
        </div>

        {/* Pemilih Baris per Halaman */}
        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 ml-2">
            <span className="hidden md:inline">Baris:</span>
            <Select
              value={pageSize.toString()}
              onValueChange={(val) => {
                onPageSizeChange(Number(val));
                onPageChange(1);
              }}
            >
              <SelectTrigger className="h-7 w-[68px] text-xs bg-background">
                <SelectValue placeholder={pageSize.toString()} />
              </SelectTrigger>
              <SelectContent side="top">
                {pageSizeOptions.map((opt) => (
                  <SelectItem key={opt} value={opt.toString()} className="text-xs">
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Navigasi Paginasi */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-medium mr-2">
          Halaman <strong className="text-foreground">{currentPage}</strong> dari{' '}
          <strong className="text-foreground">{safeTotalPages}</strong>
        </span>

        {/* Halaman Pertama */}
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7 text-xs"
          onClick={() => onPageChange(1)}
          disabled={!canGoPrev}
          title="Halaman Pertama"
        >
          <ChevronsLeft className="h-3.5 w-3.5" />
          <span className="sr-only">Halaman Pertama</span>
        </Button>

        {/* Halaman Sebelumnya */}
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7 text-xs"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!canGoPrev}
          title="Halaman Sebelumnya"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          <span className="sr-only">Halaman Sebelumnya</span>
        </Button>

        {/* Halaman Berikutnya */}
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7 text-xs"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!canGoNext}
          title="Halaman Berikutnya"
        >
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="sr-only">Halaman Berikutnya</span>
        </Button>

        {/* Halaman Terakhir */}
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7 text-xs"
          onClick={() => onPageChange(safeTotalPages)}
          disabled={!canGoNext}
          title="Halaman Terakhir"
        >
          <ChevronsRight className="h-3.5 w-3.5" />
          <span className="sr-only">Halaman Terakhir</span>
        </Button>
      </div>
    </div>
  );
}
