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
      <nav className="sticky top-0 z-10 border-b border-black/10 bg-white px-2 py-1.5 sm:px-4 sm:py-3">
  <div className="grid grid-cols-2 gap-1 sm:flex sm:items-center sm:gap-2">
    {menu.map((m) => (
      <Link
        key={m.href}
        href={m.href}
        className={`flex items-center justify-center whitespace-nowrap rounded-full px-2 py-1.5 text-center text-[10px] font-medium transition sm:px-4 sm:py-2 sm:text-sm ${
          aktif(m.cocok)
            ? "bg-[#2f241c] text-white"
            : "text-[#2f241c] hover:bg-black/5"
        }`}
      >
        {m.label}
      </Link>
    ))}

    <button
      type="button"
      onClick={keluar}
      className="col-span-2 rounded-full px-2 py-1 text-[10px] font-medium text-red-600 transition hover:bg-red-50 sm:ml-auto sm:col-span-1 sm:px-4 sm:py-2 sm:text-sm"
    >
      Keluar
    </button>
  </div>
</nav>

      {children}
    </div>
  );
}