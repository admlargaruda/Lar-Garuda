"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const menu = [
  { href: "/admin", label: "Dashboard", cocok: ["/admin"] },
  { href: "/admin/produk", label: "Produk & Stok", cocok: ["/admin/produk", "/admin/tambah", "/admin/edit"] },
  { href: "/admin/orders", label: "Pesanan", cocok: ["/admin/orders"] },
  { href: "/admin/reseller", label: "Reseller (CRM)", cocok: ["/admin/reseller"] },
];

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [siap, setSiap] = useState(false);

  useEffect(() => {
    const cek = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/admin/login");
        return;
      }
      setSiap(true);
    };
    cek();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace("/admin/login");
    });
    return () => listener.subscription.unsubscribe();
  }, [router]);

  const keluar = async () => {
    await supabase.auth.signOut();
    router.replace("/admin/login");
  };

  const aktif = (cocok: string[]) =>
    cocok.some((p) => (p === "/admin" ? pathname === "/admin" : pathname.startsWith(p)));

  if (!siap) {
    return <p className="p-6 text-sm opacity-60">Memeriksa login...</p>;
  }

  return (
    <div>
      <nav className="sticky top-0 z-10 flex items-center gap-2 overflow-x-auto border-b border-black/10 bg-white px-4 py-3">
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
        <button
          type="button"
          onClick={keluar}
          className="ml-auto whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
        >
          Keluar
        </button>
      </nav>
      {children}
    </div>
  );
}