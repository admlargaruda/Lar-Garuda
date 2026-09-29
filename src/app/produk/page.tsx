"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Product } from "@/data/products";
import { supabase } from "@/lib/supabase";

export default function ProdukPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("id", { ascending: true });

      if (error) {
        console.error("Gagal mengambil produk:", error);
        setLoading(false);
        return;
      }

      setProducts(data || []);
      setLoading(false);
    };

    fetchProducts();
  }, []);

  const formatRupiah = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <main className="min-h-screen bg-[#f8f5ef] text-[#2f241c]">

      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 border-b border-[#2f241c]/10 bg-[#f8f5ef]/95 backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-6">

          <Link href="/" className="text-center">
            <h1 className="font-serif text-2xl font-bold tracking-wide">
              LAR GARUDA
            </h1>

            <p className="text-[9px] uppercase tracking-[0.3em] text-[#2f241c]/60">
              Sarung Indonesia
            </p>
          </Link>

          <div className="flex items-center gap-3">

            <Link
              href="/"
              className="hidden rounded-full px-5 py-2 text-sm font-medium transition hover:bg-[#e5ded3] sm:block"
            >
              Beranda
            </Link>

            <Link
              href="/keranjang"
              className="rounded-full border border-[#2f241c]/20 px-4 py-2 text-sm font-medium transition hover:bg-[#2f241c] hover:text-white sm:px-5"
            >
              🛒 Keranjang
            </Link>

          </div>

        </div>
      </nav>

      {/* HEADER */}
      <section className="mx-auto max-w-7xl px-5 pb-12 pt-16 sm:px-6">

        <div className="text-center">

          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#a27b3f]">
            Koleksi Lar Garuda
          </p>

          <h2 className="mt-4 font-serif text-4xl font-bold sm:text-5xl">
            Semua Produk
          </h2>

          <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-[#2f241c]/60">
            Jelajahi seluruh koleksi sarung Lar Garuda yang
            tersedia untuk Anda.
          </p>

        </div>

      </section>

      {/* PRODUCT LIST */}
      <section className="mx-auto max-w-7xl px-5 pb-24 sm:px-6">

        {loading ? (

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">

            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="overflow-hidden rounded-3xl bg-white"
              >

                <div className="h-[380px] animate-pulse bg-[#e5ded3]" />

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
              Belum ada produk yang tersedia saat ini.
            </p>

          </div>

        ) : (

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">

            {products.map((product) => (

              <Link
                key={product.id}
                href={`/produk/${product.id}`}
                className="group"
              >

                <div className="overflow-hidden rounded-3xl bg-white shadow-sm transition duration-300 hover:-translate-y-2 hover:shadow-xl">

                  {/* FOTO */}
                  <div className="relative overflow-hidden bg-[#e5ded3]">

                    <img
                      src={product.image}
                      alt={product.name}
                      className={`h-[380px] w-full object-cover transition duration-500 ${
                        product.stock > 0
                          ? "group-hover:scale-105"
                          : "opacity-60 grayscale"
                      }`}
                    />

                    <div className="absolute left-4 top-4 rounded-full bg-[#2f241c]/90 px-4 py-2 text-xs font-medium text-white backdrop-blur">
                      Lar Garuda
                    </div>

                    {product.stock <= 0 ? (

                      <div className="absolute right-4 top-4 rounded-full bg-red-600 px-4 py-2 text-xs font-medium text-white">
                        Stok Habis
                      </div>

                    ) : (

                      <div className="absolute right-4 top-4 rounded-full bg-white/90 px-4 py-2 text-xs font-medium text-[#2f241c] backdrop-blur">
                        Tersedia
                      </div>

                    )}

                  </div>

                  {/* INFORMASI */}
                  <div className="p-6">

                    <h3 className="font-serif text-xl font-bold">
                      {product.name}
                    </h3>

                    <p className="mt-3 text-lg font-semibold text-[#a27b3f]">
                      {formatRupiah(product.price)}
                    </p>

                    <div className="mt-4">

                      {product.stock <= 0 ? (

                        <p className="text-sm font-medium text-red-600">
                          Stok habis
                        </p>

                      ) : (

                        <p className="text-sm text-[#2f241c]/50">
                          Stok tersedia: {product.stock}
                        </p>

                      )}

                    </div>

                    <div className="mt-5">

                      <span className="block w-full rounded-full bg-[#2f241c] px-5 py-3 text-center text-sm font-medium text-white transition group-hover:bg-[#a27b3f]">
                        Lihat Detail →
                      </span>

                    </div>

                  </div>

                </div>

              </Link>

            ))}

          </div>

        )}

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