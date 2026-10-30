
"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import type { Product } from "@/data/products";
import { supabase } from "@/lib/supabase";
import Image from "next/image";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";


type CategoryGroup = {
  category: string;
  products: Product[];
};

const WHATSAPP_NUMBER = "6281333888009";

const MENU_LINKS = [
  { href: "/", label: "Beranda", note: "Halaman utama" },
  { href: "/produk", label: "Produk", note: "Koleksi sarung pilihan" },
  { href: "/#tentang", label: "Tentang Kami", note: "Kenali Lar Gurda" },
  { href: "/#kontak", label: "Kontak", note: "Hubungi kami" },
];

export default function Home() {
  const [activeSlide, setActiveSlide] = useState(0);
  const [cartCount, setCartCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [imageRotation, setImageRotation] = useState(0);
  const categoryCarouselRef = useRef<HTMLDivElement>(null);
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

  const scrollCategories = (direction: "left" | "right") => {
    const container = categoryCarouselRef.current;
    if (!container) return;

    container.scrollBy({
      left:
        direction === "left"
          ? -container.clientWidth * 0.8
          : container.clientWidth * 0.8,
      behavior: "smooth",
    });
  };

  // ...useEffect updateCartCount, fetchProducts, dan lainnya tetap seperti semula

  useEffect(() => {
    const updateCartCount = () => {
      const savedCart = localStorage.getItem("lar-gurda-cart");

      if (!savedCart) {
        setCartCount(0);
        return;
      }

      try {
        const cart = JSON.parse(savedCart);

        if (Array.isArray(cart)) {
          const totalItems = cart.reduce(
            (sum, item) => sum + Number(item.quantity || 0),
            0
          );

          setCartCount(totalItems);
        } else {
          setCartCount(0);
        }
      } catch {
        setCartCount(0);
      }
    };

    updateCartCount();

    window.addEventListener("storage", updateCartCount);
    window.addEventListener("focus", updateCartCount);

    return () => {
      window.removeEventListener("storage", updateCartCount);
      window.removeEventListener("focus", updateCartCount);
    };
  }, []);

  // Ambil produk dari Supabase
  useEffect(() => {
    const fetchProducts = async () => {
      setLoadingProducts(true);

      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("id", { ascending: true });

      if (error) {
        console.error("Gagal mengambil produk:", error);
        setLoadingProducts(false);
        return;
      }

      setProducts((data || []) as Product[]);
      setLoadingProducts(false);
    };

    fetchProducts();
  }, []);

  // Ganti gambar semua kategori setiap 5 detik
  useEffect(() => {
    const interval = window.setInterval(() => {
      setImageRotation((previous) => previous + 1);
    }, 5000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  // Format harga rupiah
  const formatRupiah = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);
  };

  // Kelompokkan produk berdasarkan kategori
  const categoryGroups = products
    .reduce<CategoryGroup[]>((groups, product) => {
      const category = product.category?.trim();

      if (!category) return groups;

      const existingCategory = groups.find(
        (group) => group.category === category
      );

      if (existingCategory) {
        existingCategory.products.push(product);
      } else {
        groups.push({
          category,
          products: [product],
        });
      }

      return groups;
    }, [])
    .slice(0, 10);

  return (
    <main className="min-h-screen bg-[#f8f5ef] text-[#2f241c]">
          {/* NAVBAR */}
          <nav className="sticky top-0 z-50 border-b border-[#2f241c]/10 bg-[#f8f5ef]/95 backdrop-blur-md">
            <div className="mx-auto max-w-7xl px-5 sm:px-6">
              {/* 1. tambah gap-6: jarak minimal antara logo dan menu */}
              <div className="relative flex h-20 items-center justify-between gap-6">
                            {/* TOMBOL HAMBURGER (hanya di layar HP) */}
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

            {mounted &&
              createPortal(
                <div
                  className={`fixed inset-0 z-[60] md:hidden ${
                    menuOpen ? "" : "pointer-events-none"
                  }`}
                  aria-hidden={!menuOpen}
                >
                  {/* LATAR GELAP */}
                  <div
                    onClick={() => setMenuOpen(false)}
                    className={`absolute inset-0 bg-[#2f241c]/50 backdrop-blur-sm transition-opacity duration-300 ${
                      menuOpen ? "opacity-100" : "opacity-0"
                    }`}
                  />

                  {/* PANEL */}
                  <aside
                    role="dialog"
                    aria-modal="true"
                    aria-label="Menu navigasi"
                    className={`absolute left-0 top-0 flex h-full w-[84%] max-w-sm flex-col bg-[#f8f5ef] shadow-2xl transition-transform duration-500 ease-out ${
                      menuOpen ? "translate-x-0" : "-translate-x-full"
                    }`}
                  >
                    <div className="h-1 w-full bg-gradient-to-r from-[#a27b3f] via-[#d6b97b] to-[#a27b3f]" />

                    {/* KEPALA */}
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
                        className="flex h-10 w-10 items-center justify-center rounded-full border border-[#2f241c]/15 text-xl transition active:scale-95 hover:bg-[#2f241c] hover:text-white"
                      >
                        ×
                      </button>
                    </div>

                    {/* DAFTAR MENU */}
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

                    {/* TOMBOL AKSI */}
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

                      <p className="pt-1 text-center text-[10px] uppercase tracking-[0.3em] text-[#2f241c]/40">
                        Koleksi Sarung Indonesia
                      </p>
                    </div>
                  </aside>
                </div>,
                document.body
              )}

                {/* 2. tambah shrink-0: logo tidak terhimpit */}
                <Link
                  href="/"
                  className="absolute left-1/2 shrink-0 -translate-x-1/2 text-center md:static md:translate-x-0"
                >
                  <h1 className="font-serif text-2xl font-bold tracking-wide">
                    LAR GURDA
                  </h1>
                  <p className="text-[9px] uppercase tracking-[0.3em] text-[#2f241c]/60">
                    Sarung Indonesia
                  </p>
                </Link>

                {/* 3. gap-8 diganti gap-5 lg:gap-8, tambah whitespace-nowrap */}
                <div className="hidden items-center gap-5 whitespace-nowrap text-sm md:flex lg:gap-8">
                  <Link href="/" className="transition hover:text-[#a27b3f]">
                    Beranda
                  </Link>
                  <Link href="/produk" className="transition hover:text-[#a27b3f]">
                    Produk
                  </Link>
                  <a href="#tentang" className="transition hover:text-[#a27b3f]">
                    Tentang Kami
                  </a>
                  <a href="#kontak" className="transition hover:text-[#a27b3f]">
                    Kontak
                  </a>
                </div>
                

            <Link
              href="/keranjang"
              className="ml-auto flex items-center gap-1.5 rounded-full border border-[#2f241c]/20 px-4 py-2 text-sm font-medium transition hover:bg-[#2f241c] hover:text-white sm:px-5"
            >
              <span>🛒</span>
              <span className="hidden sm:inline">Keranjang</span>
              {cartCount > 0 && (
                <span className="font-semibold">({cartCount})</span>
              )}
            </Link>
          </div>

          {menuOpen && (
            <div className="border-t border-[#2f241c]/10 py-4 md:hidden">
              <div className="flex flex-col gap-1">
                <Link
                  href="/"
                  onClick={() => setMenuOpen(false)}
                  className="rounded-xl px-4 py-3 text-sm transition hover:bg-[#e5ded3]"
                >
                  Beranda
                </Link>
                <Link
                  href="/produk"
                  onClick={() => setMenuOpen(false)}
                  className="rounded-xl px-4 py-3 text-sm transition hover:bg-[#e5ded3]"
                >
                  Produk
                </Link>
                <a
                  href="#tentang"
                  onClick={() => setMenuOpen(false)}
                  className="rounded-xl px-4 py-3 text-sm transition hover:bg-[#e5ded3]"
                >
                  Tentang Kami
                </a>
                <a
                  href="#kontak"
                  onClick={() => setMenuOpen(false)}
                  className="rounded-xl px-4 py-3 text-sm transition hover:bg-[#e5ded3]"
                >
                  Kontak
                </a>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* HERO */}
      <section className="mx-auto grid min-h-[680px] max-w-7xl items-center gap-14 px-5 py-16 sm:px-6 md:grid-cols-2 md:py-20">
        <div className="max-w-xl">
          <div className="mb-6 flex items-center gap-3">
            <div className="h-px w-10 bg-[#a27b3f]" />
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#a27b3f]">
              Sarung Lokal Indonesia
            </p>
          </div>

          <h2 className="font-serif text-5xl font-bold leading-[1.08] sm:text-6xl md:text-7xl">
            Warisan Tradisi
            <br />
            <span className="text-[#a27b3f]">
              Dalam Setiap Helai
            </span>
          </h2>

          <p className="mt-7 max-w-lg text-base leading-8 text-[#2f241c]/65">
            Hadirkan kenyamanan, karakter, dan keindahan
            budaya Indonesia dalam setiap momen bersama
            sarung pilihan Lar Gurda.
          </p>

          <div className="mt-9 flex flex-wrap gap-4">
            <Link
              href="/produk"
              className="rounded-full bg-[#2f241c] px-7 py-3 text-sm font-medium text-white transition hover:bg-[#a27b3f]"
            >
              Lihat Koleksi
            </Link>
            <a
              href="#tentang"
              className="rounded-full border border-[#2f241c]/25 px-7 py-3.5 text-sm font-medium transition hover:bg-[#2f241c] hover:text-white"
            >
              Tentang Kami
            </a>
          </div>

          <div className="mt-12 grid max-w-md grid-cols-3 gap-5 border-t border-[#2f241c]/10 pt-7">
            <div>
              <p className="font-serif text-2xl font-bold">100%</p>
              <p className="mt-1 text-xs text-[#2f241c]/50">Produk Lokal</p>
            </div>
            <div>
              <p className="font-serif text-2xl font-bold">Premium</p>
              <p className="mt-1 text-xs text-[#2f241c]/50">Kualitas Produk</p>
            </div>
            <div>
              <p className="font-serif text-2xl font-bold">Lar</p>
              <p className="mt-1 text-xs text-[#2f241c]/50">Gurda</p>
            </div>
          </div>
        </div>

        {/* HERO IMAGE */}
        <div className="relative">
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full border border-[#a27b3f]/30" />
          <div className="absolute -bottom-5 -left-5 h-28 w-28 rounded-full bg-[#a27b3f]/10" />

          <div className="relative aspect-[5/5] overflow-hidden rounded-[2rem] bg-[#ded5c7] shadow-2xl">
            <Image
              src="/products/logo-lar-gurda.jpg"
              alt="Logo Lar Gurda"
              fill
              priority
              sizes="(min-width: 768px) 45vw, 90vw"
              className="object-cover"
            />

            <div className="absolute bottom-5 left-5 right-5 rounded-2xl bg-white/90 p-4 shadow-lg backdrop-blur">
              <p className="text-xs uppercase tracking-[0.2em] text-[#a27b3f]">
                Koleksi Pilihan
              </p>
              <p className="mt-1 font-serif text-lg font-bold">
                Nyaman Dipakai, Berkarakter
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section
        id="tentang"
        className="relative overflow-hidden bg-[#2f241c] px-5 py-24 text-[#f8f5ef] sm:px-6"
      >
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full border border-white/10" />
        <div className="absolute -bottom-32 -left-20 h-72 w-72 rounded-full border border-white/10" />

        <div className="relative mx-auto max-w-4xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#c8a66a]">
            Tentang Lar Gurda
          </p>
          <h2 className="mt-5 font-serif text-4xl font-bold sm:text-5xl">
            Tradisi yang Terus Hidup
          </h2>
          <p className="mx-auto mt-7 max-w-2xl text-base leading-8 text-white/65">
            Lar Gurda hadir membawa produk sarung yang
            menggabungkan nilai tradisi, kenyamanan, dan desain
            yang sesuai dengan kebutuhan masyarakat masa kini.
          </p>
          <div className="mx-auto mt-10 h-px w-16 bg-[#c8a66a]" />
        </div>
      </section>

      {/* PILIHAN SARUNG */}
      <section
        id="produk"
        className="mx-auto max-w-7xl px-5 py-24 sm:px-6"
      >
        <div className="mb-12 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#a27b3f]">
              Koleksi Kami
            </p>
            <h2 className="mt-3 font-serif text-4xl font-bold sm:text-5xl">
              Pilihan Sarung
            </h2>
            <p className="mt-3 max-w-lg text-sm leading-6 text-[#2f241c]/55">
              Jelajahi kategori pilihan Lar Gurda.
              Gambar produk berganti otomatis agar Anda dapat
              melihat lebih banyak koleksi.
            </p>
          </div>

          <Link
            href="/produk"
            className="inline-flex w-fit rounded-full border border-[#2f241c]/20 px-5 py-2.5 text-sm font-medium transition hover:bg-[#2f241c] hover:text-white"
          >
            Lihat Katalog →
          </Link>
        </div>

        {loadingProducts ? (
          <div className="grid gap-8 md:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="overflow-hidden rounded-3xl bg-white"
              >
                <div className="h-[420px] animate-pulse bg-[#e5ded3]" />
                <div className="space-y-4 p-6">
                  <div className="h-5 w-3/4 animate-pulse rounded bg-[#e5ded3]" />
                  <div className="h-5 w-1/2 animate-pulse rounded bg-[#e5ded3]" />
                  <div className="h-10 w-full animate-pulse rounded-full bg-[#e5ded3]" />
                </div>
              </div>
            ))}
          </div>
        ) : categoryGroups.length === 0 ? (
          <div className="rounded-3xl bg-white p-12 text-center shadow-sm">
            <p className="font-serif text-2xl font-bold">
              Kategori Belum Tersedia
            </p>
            <p className="mt-3 text-sm text-[#2f241c]/50">
              Belum ada produk dengan kategori yang tersedia.
            </p>
          </div>
        ) : (
          <div className="relative">
            {/* Tombol navigasi kiri */}
                <button
                  type="button"
                  onClick={() => scrollCategories("left")}
                  aria-label="Kategori sebelumnya"
                  className="absolute left-2 top-[210px] z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-[#2f241c]/20 bg-white text-xl text-[#2f241c] shadow-lg transition hover:bg-[#2f241c] hover:text-white md:flex"
                >
                  ←
                </button>

                {/* Tombol navigasi kanan */}
                <button
                  type="button"
                  onClick={() => scrollCategories("right")}
                  aria-label="Kategori berikutnya"
                  className="absolute right-2 top-[210px] z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-[#2f241c]/20 bg-white text-xl text-[#2f241c] shadow-lg transition hover:bg-[#2f241c] hover:text-white md:flex"
                >
                  →
                </button>
            <div
              ref={categoryCarouselRef}
              className="flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:gap-8"
              aria-label="Koleksi kategori Lar Gurda"
              onScroll={(event) => {
                const container = event.currentTarget;
                const cards = Array.from(
                  container.children
                ) as HTMLElement[];

                if (cards.length === 0) return;

                const containerCenter =
                  container.getBoundingClientRect().left +
                  container.clientWidth / 2;

                let nearestIndex = 0;
                let nearestDistance = Infinity;

                cards.forEach((card, index) => {
                  const rect = card.getBoundingClientRect();
                  const cardCenter = rect.left + rect.width / 2;
                  const distance = Math.abs(
                    containerCenter - cardCenter
                  );

                  if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nearestIndex = index;
                  }
                });

                setActiveSlide(nearestIndex);
              }}
            >
              {categoryGroups.map((group, index) => {
                const categoryProducts = group.products;
                const imageIndex =
                  imageRotation % categoryProducts.length;
                const currentProduct =
                  categoryProducts[imageIndex];

                return (
                  <Link
                    key={group.category}
                    href={`/produk/kategori/${encodeURIComponent(
                      group.category
                    )}`}
                    className="group w-[88%] shrink-0 snap-center overflow-hidden rounded-3xl sm:w-[70%] md:w-[38%] lg:w-[32%] xl:w-[30%]"
                  >
                    <div className="h-full overflow-hidden rounded-3xl bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl">
                      <div className="relative h-[300px] overflow-hidden bg-[#e5ded3] sm:h-[360px] md:h-[420px]">
                        {categoryProducts.map(
                          (product, productIndex) => (
                            <img
                              key={product.id}
                              src={product.image}
                              alt={product.name}
                              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ease-in-out ${
                                productIndex === imageIndex
                                  ? "opacity-100"
                                  : "opacity-0"
                              }`}
                            />
                          )
                        )}

                        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />

                        <div className="absolute left-3 top-3 rounded-full bg-[#2f241c]/90 px-3 py-2 text-[10px] font-medium text-white sm:left-4 sm:top-4 sm:text-xs">
                          Lar Gurda
                        </div>

                        {currentProduct.stock <= 0 ? (
                          <div className="absolute right-3 top-3 rounded-full bg-red-600 px-3 py-2 text-[10px] font-medium text-white sm:right-4 sm:top-4 sm:text-xs">
                            Stok Habis
                          </div>
                        ) : (
                          <div className="absolute right-3 top-3 rounded-full bg-white/90 px-3 py-2 text-[10px] font-medium text-[#2f241c] sm:right-4 sm:top-4 sm:text-xs">
                            Tersedia
                          </div>
                        )}

                        <div className="absolute bottom-0 left-0 right-0 p-4 text-white sm:p-6">
                          <p className="text-xs uppercase tracking-[0.25em] text-white/70">
                            Kategori {index + 1}
                          </p>
                          <h3 className="mt-2 break-words font-serif text-xl font-bold sm:text-2xl">
                            {group.category}
                          </h3>
                          <p className="mt-2 text-sm text-white/75">
                            {currentProduct.name}
                          </p>
                        </div>
                      </div>

                      <div className="p-3 sm:p-5 md:p-6">
                        <p className="text-sm text-[#2f241c]/55">
                          {categoryProducts.length} produk dalam kategori
                        </p>

                        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 sm:mt-5">
                          <span className="text-xs text-[#2f241c]/50 sm:text-sm">
                            Koleksi Sarung
                          </span>
                          <span className="rounded-full bg-[#2f241c] px-3 py-2 text-xs font-medium text-white transition group-hover:bg-[#a27b3f] sm:px-4 sm:text-sm">
                            Lihat Kategori →
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            <p className="mt-3 text-center text-xs text-[#2f241c]/50">
              Geser untuk melihat kategori lainnya →
            </p>
          </div>
        )}
      </section>

      {/* CALL TO ACTION */}
      <section className="px-5 pb-24 sm:px-6">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-[#e5ded3] px-6 py-14 text-center sm:px-10">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#a27b3f]">
            Lar Gurda
          </p>
          <h2 className="mt-4 font-serif text-3xl font-bold sm:text-4xl">
            Temukan Sarung Pilihan Anda
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-[#2f241c]/60">
            Jelajahi seluruh koleksi kami dan temukan sarung
            yang sesuai dengan kebutuhan dan karakter Anda.
          </p>
          <Link
            href="/produk"
            className="mt-7 inline-flex rounded-full bg-[#2f241c] px-7 py-3.5 text-sm font-medium text-white transition hover:bg-[#a27b3f]"
          >
            Lihat Katalog
          </Link>
        </div>
      </section>

      {/* CONTACT */}
      <section
        id="kontak"
        className="border-t border-[#2f241c]/10 px-5 py-20 sm:px-6"
      >
        <div className="mx-auto max-w-7xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#a27b3f]">
            Hubungi Kami
          </p>
          <h2 className="mt-4 font-serif text-4xl font-bold">
            Butuh Informasi Produk?
          </h2>
          <p className="mx-auto mt-5 max-w-xl leading-7 text-[#2f241c]/60">
            Untuk informasi produk dan pemesanan, silakan
            hubungi Lar Gurda melalui WhatsApp.
          </p>
          <a
            href={`https://wa.me/6281333888009?text=${encodeURIComponent(
              "Halo Lar Gurda, saya ingin mendapatkan informasi mengenai produk sarung."
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-[#2f241c] px-8 py-4 font-medium text-white shadow-lg shadow-[#2f241c]/10 transition hover:-translate-y-0.5 hover:bg-[#a27b3f]"
          >
            <span>WhatsApp</span>
            <span>→</span>
          </a>
        </div>
      </section>

      {/* FOOTER */}
      
        <footer className="bg-[#2f241c] px-6 py-10 text-center text-white">
          <p className="font-serif text-xl font-bold">LAR GARUDA</p>

          <p className="mt-2 text-xs uppercase tracking-[0.25em] text-white/40">
            Sarung Indonesia
          </p>

          <div className="mx-auto my-6 h-px w-12 bg-[#a27b3f]" />

          {/* MEDIA SOSIAL DAN MARKETPLACE */}
          <div className="mx-auto flex max-w-md flex-wrap items-center justify-center gap-5">
            <a
              href="https://www.instagram.com/largurda_ind/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram Lar Garuda"
              className="transition hover:scale-110"
            >
              <img src="/products/instagram.png" alt="Instagram" className="h-7 w-7 object-contain" />
            </a>

            <a
              href="https://web.facebook.com/largurdastore"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook Lar Garuda"
              className="transition hover:scale-110"
            >
              <img src="/products/facebook.png" alt="Facebook" className="h-7 w-7 object-contain" />
            </a>

            <a
              href="https://shopee.co.id/largurdastore"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Shopee Lar Garuda"
              className="transition hover:scale-110"
            >
              <img src="/products/shopee.png" alt="Shopee" className="h-11 w-11 object-contain" />
            </a>

            <a
              href="https://www.tokopedia.com/largurdaoriginal"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Tokopedia Lar Garuda"
              className="transition hover:scale-110"
            >
              <img src="/products/tokopedia.png" alt="Tokopedia" className="h-12 w-12 object-contain" />
            </a>

            <a
              href="https://www.blibli.com/brand/lar-gurda"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Blibli Lar Garuda"
              className="transition hover:scale-110"
            >
              <img src="/products/blibli.png" alt="Blibli" className="h-11 w-11 object-contain" />
            </a>

            <a
              href="https://www.lazada.co.id/tag/sarung-lar-gurda-solo/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Lazada Lar Garuda"
              className="transition hover:scale-110"
            >
              <img src="/products/lazada.png" alt="Lazada" className="h-7 w-7 object-contain" />
            </a>
          </div>

          <p className="mt-7 text-xs text-white/40">
            © 2026 Lar Garuda. All rights reserved.
          </p>
        </footer>

    </main>
  );
}
