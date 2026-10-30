"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";

const WHATSAPP_NUMBER = "6281333888009";

const MENU_LINKS = [
  { href: "/", label: "Beranda", note: "Halaman utama" },
  { href: "/produk", label: "Produk", note: "Koleksi sarung pilihan" },
  { href: "/#tentang", label: "Tentang Kami", note: "Kenali Lar Gurda" },
  { href: "/#kontak", label: "Kontak", note: "Hubungi kami" },
];

type NavbarProps = {
  subtitle?: string; // teks kecil di bawah logo
  showCart?: boolean; // tombol keranjang
  showMenu?: boolean; // hamburger (HP) dan tautan menu (desktop)
  rightSlot?: React.ReactNode; // tombol tambahan di kanan
};

export default function Navbar({
  subtitle = "Sarung Indonesia",
  showCart = true,
  showMenu = true,
  rightSlot,
}: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Tutup menu saat pindah halaman
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Escape menutup menu, dan halaman di belakang tidak ikut bergulir
  useEffect(() => {
    if (!menuOpen) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };

    document.addEventListener("keydown", onKey);
    const sebelumnya = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = sebelumnya;
    };
  }, [menuOpen]);

  // Jumlah item keranjang
  useEffect(() => {
    const updateCartCount = () => {
      const savedCart = localStorage.getItem("lar-gurda-cart");

      if (!savedCart) {
        setCartCount(0);
        return;
      }

      try {
        const cart = JSON.parse(savedCart);
        setCartCount(
          Array.isArray(cart)
            ? cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
            : 0
        );
      } catch {
        setCartCount(0);
      }
    };

    updateCartCount();

    window.addEventListener("storage", updateCartCount);
    window.addEventListener("focus", updateCartCount);
    window.addEventListener("cart-updated", updateCartCount);

    return () => {
      window.removeEventListener("storage", updateCartCount);
      window.removeEventListener("focus", updateCartCount);
      window.removeEventListener("cart-updated", updateCartCount);
    };
  }, []);

  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-[#2f241c]/10 bg-[#f8f5ef]/95 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-5 sm:px-6">
          <div className="relative flex h-20 items-center justify-between gap-6">
            {/* HAMBURGER (HP) */}
            {showMenu && (
              <button
                type="button"
                aria-label="Buka menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen(true)}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-[#2f241c]/15 bg-white/60 transition active:scale-95 md:hidden"
              >
                <span className="flex w-5 flex-col gap-[5px]">
                  <span className="h-[2px] w-full rounded bg-[#2f241c]" />
                  <span className="h-[2px] w-3/4 self-end rounded bg-[#a27b3f]" />
                  <span className="h-[2px] w-full rounded bg-[#2f241c]" />
                </span>
              </button>
            )}

            {/* LOGO */}
            <Link
              href="/"
              className="absolute left-1/2 shrink-0 -translate-x-1/2 text-center md:static md:translate-x-0"
            >
              <span className="block font-serif text-xl font-bold tracking-wide sm:text-2xl">
                LAR GURDA
              </span>
              <span className="block text-[9px] uppercase tracking-[0.3em] text-[#2f241c]/60">
                {subtitle}
              </span>
            </Link>

            {/* MENU DESKTOP */}
            {showMenu && (
              <div className="hidden items-center gap-5 whitespace-nowrap text-sm md:flex lg:gap-8">
                {MENU_LINKS.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={`transition hover:text-[#a27b3f] ${
                      pathname === l.href ? "text-[#a27b3f]" : ""
                    }`}
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
            )}

            {/* SISI KANAN */}
            <div className="ml-auto flex items-center gap-2">
              {rightSlot}

              {showCart && (
                <Link
                  href="/keranjang"
                  className="flex items-center gap-1.5 rounded-full border border-[#2f241c]/20 px-4 py-2 text-sm font-medium transition hover:bg-[#2f241c] hover:text-white sm:px-5"
                >
                  <span>🛒</span>
                  <span className="hidden sm:inline">Keranjang</span>
                  {cartCount > 0 && (
                    <span className="font-semibold">({cartCount})</span>
                  )}
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* PANEL MENU HP (dari kiri) */}
      {mounted &&
        showMenu &&
        createPortal(
          <div
            className={`fixed inset-0 z-[60] md:hidden ${
              menuOpen ? "" : "pointer-events-none"
            }`}
            aria-hidden={!menuOpen}
          >
            <div
              onClick={() => setMenuOpen(false)}
              className={`absolute inset-0 bg-[#2f241c]/50 backdrop-blur-sm transition-opacity duration-300 ${
                menuOpen ? "opacity-100" : "opacity-0"
              }`}
            />

            <aside
              role="dialog"
              aria-modal="true"
              aria-label="Menu navigasi"
              className={`absolute left-0 top-0 flex h-full w-[84%] max-w-sm flex-col bg-[#f8f5ef] shadow-2xl transition-transform duration-500 ease-out ${
                menuOpen ? "translate-x-0" : "-translate-x-full"
              }`}
            >
              <div className="h-1 w-full bg-gradient-to-r from-[#a27b3f] via-[#d6b97b] to-[#a27b3f]" />

              <div className="flex items-center justify-between px-6 py-5">
                <div>
                  <p className="font-serif text-xl font-bold tracking-wide">
                    LAR GURDA
                  </p>
                  <p className="text-[9px] uppercase tracking-[0.3em] text-[#2f241c]/60">
                    Sarung Indonesia
                  </p>
                </div>

                <button
                  type="button"
                  aria-label="Tutup menu"
                  onClick={() => setMenuOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-[#2f241c]/15 text-xl transition hover:bg-[#2f241c] hover:text-white active:scale-95"
                >
                  ×
                </button>
              </div>

              <nav className="flex-1 overflow-y-auto px-6">
                <ul>
                  {MENU_LINKS.map((l, i) => {
                    const aktif = pathname === l.href;

                    return (
                      <li
                        key={l.href}
                        className={`transition-all duration-500 ${
                          menuOpen
                            ? "translate-x-0 opacity-100"
                            : "-translate-x-8 opacity-0"
                        }`}
                        style={{
                          transitionDelay: menuOpen ? `${150 + i * 70}ms` : "0ms",
                        }}
                      >
                        <Link
                          href={l.href}
                          onClick={() => setMenuOpen(false)}
                          className="group flex items-center gap-4 border-b border-[#2f241c]/10 py-5"
                        >
                          <span className="font-serif text-sm text-[#a27b3f]">
                            {String(i + 1).padStart(2, "0")}
                          </span>

                          <span className="flex-1">
                            <span
                              className={`block font-serif text-2xl font-bold transition group-hover:text-[#a27b3f] ${
                                aktif ? "text-[#a27b3f]" : ""
                              }`}
                            >
                              {l.label}
                            </span>
                            <span className="block text-xs text-[#2f241c]/50">
                              {l.note}
                            </span>
                          </span>

                          <span className="text-[#a27b3f] transition group-hover:translate-x-1">
                            →
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </nav>

              <div
                className="space-y-3 border-t border-[#2f241c]/10 px-6 pt-5"
                style={{
                  paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))",
                }}
              >
                <Link
                  href="/keranjang"
                  onClick={() => setMenuOpen(false)}
                  className="flex w-full items-center justify-center rounded-full border border-[#2f241c] px-6 py-3 text-sm font-medium transition hover:bg-[#2f241c] hover:text-white"
                >
                  Lihat Keranjang
                </Link>

                <a
                  href={`https://wa.me/${WHATSAPP_NUMBER}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center rounded-full bg-[#2f241c] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#a27b3f]"
                >
                  Hubungi via WhatsApp
                </a>
              </div>
            </aside>
          </div>,
          document.body
        )}
    </>
  );
}