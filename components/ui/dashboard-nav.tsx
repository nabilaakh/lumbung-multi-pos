"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  ShoppingCart,
  Clock,
  Receipt,
  Package,
  Layers,
  BarChart3,
  Settings,
  Users2,
} from "lucide-react"

const ALL_NAV_ITEMS = [
  {
    title: "Kasir",
    href: "/kasir",
    icon: ShoppingCart,
    roles: ["kasir", "owner"],
  },
  {
    title: "Shift Saya",
    href: "/shift-saya",
    icon: Clock,
    roles: ["kasir", "kepala_toko", "owner"],
  },
  {
    title: "Transaksi",
    href: "/transaksi",
    icon: Receipt,
    roles: ["kepala_toko", "owner"],
  },
  {
    title: "Stok Cabang",
    href: "/stok",
    icon: Layers,
    roles: ["kepala_toko", "owner"],
  },
  {
    title: "Shift Cabang",
    href: "/shift-cabang",
    icon: Users2,
    roles: ["kepala_toko", "owner"],
  },
  {
    title: "Produk",
    href: "/produk",
    icon: Package,
    roles: ["kepala_toko", "owner"],
  },
  {
    title: "Laporan",
    href: "/laporan",
    icon: BarChart3,
    roles: ["kepala_toko", "owner"],
  },
  {
    title: "Pengaturan",
    href: "/pengaturan",
    icon: Settings,
    roles: ["owner"],
  },
]

interface DashboardNavProps {
  role: string
}

export function DashboardNav({ role }: DashboardNavProps) {
  const pathname = usePathname()

  const allowedNavItems = ALL_NAV_ITEMS.filter((item) =>
    item.roles.includes(role)
  )

  return (
    <div className="container mx-auto px-4 lg:px-6 flex items-center gap-1.5 py-1.5 min-w-max">
      {allowedNavItems.map((item) => {
        const Icon = item.icon
        const isActive =
          pathname === item.href || pathname.startsWith(`${item.href}/`)

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs md:text-sm font-medium transition-all ${
              isActive
                ? "bg-card text-foreground shadow-xs font-semibold border border-border/60"
                : "text-muted-foreground hover:bg-card/60 hover:text-foreground"
            }`}
          >
            <Icon
              className={`h-4 w-4 ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
            />
            <span>{item.title}</span>
          </Link>
        )
      })}
    </div>
  )
}