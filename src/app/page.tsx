"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Product } from "@/data/products";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const [cartCount, setCartCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  const [currentSlide, setCurrentSlide] = useState(0);
  const [isChanging, setIsChanging] = useState(false);

  useEffect(() => {
    const updateCartCount = () => {
      const savedCart = localStorage.getItem("lar-garuda-cart");

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

      setProducts(data || []);
      setLoadingProducts(false);
    };

    fetchProducts();
  }, []);

  /*
   * CAROUSEL OTOMATIS
   * Produk berganti setiap 4 detik.
   */
  useEffect(() => {
    if (products.length <= 3) {
      return;
    }

    const interval = setInterval(() => {
      setIsChanging(true);

      setTimeout(() => {
        setCurrentSlide((current) => {
          const maxSlide = Math.max(products.length - 3, 0);

          return current >= maxSlide ? 0 : current + 1;
        });

        setIsChanging(false);
      }, 350);
    }, 5300);

    return () => {
      clearInterval(interval);
    };
  }, [products.length]);

  const formatRupiah = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const visibleProducts = products.slice(
    currentSlide,
    currentSlide + 3
  );

  return (
    <main className="min-h-screen bg-[#f8f5ef] text-[#2f241c]">

      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 border-b border-[#2f241c]/10 bg-[#f8f5ef]/95 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-5 sm:px-6">

          <div className="relative flex h-20 items-center justify-between">

            {/* MOBILE MENU */}
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Buka menu"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[#2f241c]/20 text-lg transition hover:bg-[#2f241c] hover:text-white md:hidden"
            >
              {menuOpen ? "×" : "☰"}
            </button>

            {/* LOGO */}
            <Link
              href="/"
              className="absolute left-1/2 -translate-x-1/2 text-center md:static md:translate-x-0"
            >
              <h1 className="font-serif text-2xl font-bold tracking-wide">
                LAR GARUDA
              </h1>

              <p className="text-[9px] uppercase tracking-[0.3em] text-[#2f241c]/60">
                Sarung Indonesia
              </p>
            </Link>

            {/* DESKTOP MENU */}
            <div className="hidden items-center gap-8 text-sm md:flex">

              <Link
                href="/"
                className="transition hover:text-[#a27b3f]"
              >
                Beranda
              </Link>

              <Link
                href="/produk"
                className="transition hover:text-[#a27b3f]"
              >
                Produk
              </Link>

              <a
                href="#tentang"
                className="transition hover:text-[#a27b3f]"
              >
                Tentang Kami
              </a>

              <a
                href="#kontak"
                className="transition hover:text-[#a27b3f]"
              >
                Kontak
              </a>

            </div>

            {/* CART */}
            <Link
              href="/keranjang"
              className="ml-auto flex items-center gap-1.5 rounded-full border border-[#2f241c]/20 px-4 py-2 text-sm font-medium transition hover:bg-[#2f241c] hover:text-white sm:px-5"
            >
              <span>🛒</span>

              <span className="hidden sm:inline">
                Keranjang
              </span>

              {cartCount > 0 && (
                <span className="font-semibold">
                  ({cartCount})
                </span>
              )}
            </Link>

          </div>

          {/* MOBILE MENU */}
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
            sarung pilihan Lar Garuda.
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
              <p className="font-serif text-2xl font-bold">
                100%
              </p>

              <p className="mt-1 text-xs text-[#2f241c]/50">
                Produk Lokal
              </p>
            </div>

            <div>
              <p className="font-serif text-2xl font-bold">
                Premium
              </p>

              <p className="mt-1 text-xs text-[#2f241c]/50">
                Kualitas Produk
              </p>
            </div>

            <div>
              <p className="font-serif text-2xl font-bold">
                Lar
              </p>

              <p className="mt-1 text-xs text-[#2f241c]/50">
                Garuda
              </p>
            </div>

          </div>

        </div>

        {/* HERO IMAGE */}
        <div className="relative">

          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full border border-[#a27b3f]/30" />

          <div className="absolute -bottom-5 -left-5 h-28 w-28 rounded-full bg-[#a27b3f]/10" />

          <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] bg-[#ded5c7] shadow-2xl">

            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#e7dfd3] via-[#d8cbbb] to-[#c5b39d]">

              <div className="text-center">

                <div className="mb-5 text-7xl">
                  🧵
                </div>

                <p className="font-serif text-2xl font-bold">
                  LAR GARUDA
                </p>

                <p className="mt-2 text-sm text-[#2f241c]/55">
                  Koleksi Sarung Indonesia
                </p>

              </div>

            </div>

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
            Tentang Lar Garuda
          </p>

          <h2 className="mt-5 font-serif text-4xl font-bold sm:text-5xl">
            Tradisi yang Terus Hidup
          </h2>

          <p className="mx-auto mt-7 max-w-2xl text-base leading-8 text-white/65">
            Lar Garuda hadir membawa produk sarung yang
            menggabungkan nilai tradisi, kenyamanan, dan desain
            yang sesuai dengan kebutuhan masyarakat masa kini.
          </p>

          <div className="mx-auto mt-10 h-px w-16 bg-[#c8a66a]" />

        </div>

      </section>

      {/* PRODUCTS CAROUSEL */}
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
              Beberapa koleksi pilihan Lar Garuda.
              Jelajahi katalog untuk melihat seluruh produk kami.
            </p>

          </div>

          <Link
            href="/produk"
            className="inline-flex w-fit rounded-full border border-[#2f241c]/20 px-5 py-2.5 text-sm font-medium transition hover:bg-[#2f241c] hover:text-white"
          >
            Lihat Katalog →
          </Link>

        </div>

        {/* LOADING */}
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

        ) : products.length === 0 ? (

          <div className="rounded-3xl bg-white p-12 text-center shadow-sm">

            <p className="font-serif text-2xl font-bold">
              Produk Belum Tersedia
            </p>

            <p className="mt-3 text-sm text-[#2f241c]/50">
              Silakan kembali lagi untuk melihat koleksi terbaru
              Lar Garuda.
            </p>

          </div>

        ) : (

          <div className="relative">

            {/* CAROUSEL */}
            <div
              className={`grid gap-8 md:grid-cols-3 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                isChanging
                  ? "translate-y-2 scale-[0.985] opacity-0"
                  : "translate-y-0 scale-100 opacity-100"
              }`}
            >

              {visibleProducts.map((product) => (

                <Link
                  key={product.id}
                  href={`/produk/${product.id}`}
                  className="group"
                >

                  <div className="overflow-hidden rounded-3xl bg-white shadow-sm transition duration-500 hover:-translate-y-2 hover:shadow-xl">

                    {/* FOTO PRODUK */}
                    <div className="relative overflow-hidden bg-[#e5ded3]">

                      <img
                        src={product.image}
                        alt={product.name}
                        className="h-[420px] w-full object-cover transition duration-700 ease-out group-hover:scale-105"
                      />

                      <div className="absolute left-4 top-4 rounded-full bg-[#2f241c]/90 px-4 py-2 text-xs font-medium text-white backdrop-blur">
                        Lar Garuda
                      </div>

                      {product.stock <= 0 ? (

                        <div className="absolute right-4 top-4 rounded-full bg-red-600 px-4 py-2 text-xs font-medium text-white shadow-lg">
                          Stok Habis
                        </div>

                      ) : (

                        <div className="absolute right-4 top-4 rounded-full bg-white/90 px-4 py-2 text-xs font-medium text-[#2f241c] shadow-sm backdrop-blur">
                          Tersedia
                        </div>

                      )}

                    </div>

                    {/* INFORMASI PRODUK */}
                    <div className="p-6">

                      <h3 className="font-serif text-xl font-bold">
                        {product.name}
                      </h3>

                      <p className="mt-3 text-lg font-semibold text-[#a27b3f]">
                        {formatRupiah(product.price)}
                      </p>

                      <div className="mt-5 flex items-center justify-between gap-3">

                        <span className="text-sm text-[#2f241c]/50">
                          Koleksi Sarung
                        </span>

                        <span className="rounded-full bg-[#2f241c] px-5 py-2.5 text-sm font-medium text-white transition group-hover:bg-[#a27b3f]">
                          Lihat Detail →
                        </span>

                      </div>

                    </div>

                  </div>

                </Link>

              ))}

            </div>

            {/* DOT INDICATOR */}
            {products.length > 3 && (

              <div className="mt-8 flex items-center justify-center gap-2">

                {Array.from({
                  length: Math.max(products.length - 2, 1),
                }).map((_, index) => (

                  <button
                    key={index}
                    type="button"
                    onClick={() => {
                      if (index === currentSlide) return;

                      setIsChanging(true);

                      setTimeout(() => {
                        setCurrentSlide(index);
                        setIsChanging(false);
                      }, 450);
                    }}
                    aria-label={`Tampilkan produk ${index + 1}`}
                    className={`h-2 rounded-full transition-all duration-500 ${
                      currentSlide === index
                        ? "w-8 bg-[#2f241c]"
                        : "w-2 bg-[#2f241c]/20 hover:bg-[#a27b3f]"
                    }`}
                  />

                ))}

              </div>

            )}

          </div>

        )}

      </section>

      {/* CALL TO ACTION */}
      <section className="px-5 pb-24 sm:px-6">

        <div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-[#e5ded3] px-6 py-14 text-center sm:px-10">

          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#a27b3f]">
            Lar Garuda
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
            hubungi Lar Garuda melalui WhatsApp.
          </p>

          <a
            href={`https://wa.me/6285772492774?text=${encodeURIComponent(
              "Halo Lar Garuda, saya ingin mendapatkan informasi mengenai produk sarung."
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

        <p className="font-serif text-xl font-bold">
          LAR GARUDA
        </p>

        <p className="mt-2 text-xs uppercase tracking-[0.25em] text-white/40">
          Sarung Indonesia
        </p>

        <div className="mx-auto my-6 h-px w-12 bg-[#a27b3f]" />

        <p className="text-xs text-white/40">
          © 2026 Lar Garuda. All rights reserved.
        </p>

      </footer>

    </main>
  );
}