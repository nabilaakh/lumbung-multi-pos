import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function Page() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <Card className="w-full max-w-lg shadow-lg border-border">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <Badge variant="outline" className="text-xs px-2.5 py-0.5">
              Multi-Branch Point of Sale
            </Badge>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
            Lumbung Kopi dan Roti
          </CardTitle>
          <CardDescription>
            Sistem Kasir Terintegrasi Multi-Cabang: Tebet (TBT), Bintaro (BTR), dan Depok (DPK).
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
            <p className="font-semibold text-foreground mb-1">Status Fondasi Sistem:</p>
            <ul className="list-disc pl-4 space-y-1 text-xs">
              <li>Framework: Next.js (App Router, TypeScript)</li>
              <li>UI Library: shadcn/ui (Radix Base, Preset b1tgXpkWI)</li>
              <li>Styling: Tailwind CSS v4 & Tema Lumbung</li>
              <li>Database & Auth: Supabase SSR Ready</li>
            </ul>
          </div>
          <Button asChild className="w-full">
            <Link href="/login">Buka Halaman Masuk</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
