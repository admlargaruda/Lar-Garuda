"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const menu = [
  { href: "/admin", label: "Dashboard", cocok: ["/admin"] },
  { href: "/admin/produk", label: "Produk & Stok", cocok: ["/admin/produk", "/admin/tambah", "/admin/edit"] },
  { href: "/admin/orders", label: "Pesanan", cocok: ["/admin/orders"] },
  { href: "/admin/reseller", label: "Reseller (CRM)", cocok: ["/admin/reseller"] },
];

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const aktif = (cocok: string[]) =>
    cocok.some((p) => (p === "/admin" ? pathname === "/admin" : pathname.startsWith(p)));

  return (
    <div>
      <nav className="sticky top-0 z-10 flex gap-2 overflow-x-auto border-b border-black/10 bg-white px-4 py-3">
        {menu.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium ${
              aktif(m.cocok) ? "bg-[#2f241c] text-white" : "text-[#2f241c] hover:bg-black/5"
            }`}
          >
            {m.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}