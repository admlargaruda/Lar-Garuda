"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Navbar from "@/components/Navbar";

type Product = {
  id: number;
  name: string;
  price: number;
  image: string;
  description: string;
  stock: number;
  category: string;
};

export default function CategoryProductsPage() {
  const params = useParams();

  const category = decodeURIComponent(
    params.category as string
  );

  const [products, setProducts] = useState<Product[]>(
    []
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // =====================================================
  // FORMAT RUPIAH
  // =====================================================

  const formatRupiah = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);
  };

  // =====================================================
  // AMBIL PRODUK BERDASARKAN KATEGORI
  // =====================================================

  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true);
      setError("");

      const { data, error } = await supabase
        .from("products")
        .select(
          "id, name, price, image, description, stock, category"
        )
        .eq("category", category)
        .order("name", {
          ascending: true,
        });

      if (error) {
        console.error(
          "Gagal mengambil produk:",
          error
        );

        setError(
          "Gagal mengambil produk dalam kategori ini."
        );

        setLoading(false);
        return;
      }

      setProducts(
        (data as Product[]) ?? []
      );

      setLoading(false);
    };

    if (category) {
      loadProducts();
    }
  }, [category]);

  return (
    <main className="min-h-screen bg-[#f8f5ef] text-[#2f241c]">
      <Navbar />

      {/* =====================================================
          HEADER
      ===================================================== */}

      <section className="mx-auto max-w-7xl px-6 pb-10 pt-12">

        <Link
          href="/produk"
          className="text-sm text-[#a27b3f] transition hover:text-[#2f241c]"
        >
          ← Kembali ke Katalog
        </Link>

        <p className="mt-8 text-sm uppercase tracking-[0.3em] text-[#a27b3f]">
          Koleksi Lar Gurda
        </p>

        <h1 className="mt-3 font-serif text-4xl font-bold md:text-5xl">
          {category}
        </h1>

        <p className="mt-4 text-[#2f241c]/60">
          Menampilkan koleksi produk kategori{" "}
          <span className="font-medium text-[#2f241c]">
            {category}
          </span>
          .
        </p>

      </section>

      {/* =====================================================
          PRODUK
      ===================================================== */}

      <section className="mx-auto max-w-7xl px-6 pb-20">

        {loading && (
          <div className="py-20 text-center">

            <p className="text-[#2f241c]/60">
              Memuat produk...
            </p>

          </div>
        )}

        {error && (
          <div className="rounded-2xl bg-red-50 px-5 py-4 text-sm text-red-600">
            {error}
          </div>
        )}

        {!loading &&
          !error &&
          products.length === 0 && (

            <div className="rounded-3xl bg-white p-10 text-center shadow-sm">

              <h2 className="font-serif text-2xl font-bold">
                Produk Belum Tersedia
              </h2>

              <p className="mt-3 text-sm text-[#2f241c]/60">
                Belum ada produk dalam kategori ini.
              </p>

              <Link
                href="/produk"
                className="mt-7 inline-block rounded-full bg-[#2f241c] px-7 py-3 text-sm font-medium text-white transition hover:bg-[#a27b3f]"
              >
                Kembali ke Katalog
              </Link>

            </div>
          )}

        {!loading &&
          !error &&
          products.length > 0 && (

            <div className="grid grid-cols-2 gap-4 md:gap-6">

              {products.map((product) => (

                <Link
                  key={product.id}
                  href={`/produk/${product.id}`}
                  className="group overflow-hidden rounded-3xl bg-white shadow-sm transition duration-500 hover:-translate-y-1 hover:shadow-xl"
                >

                  {/* FOTO PRODUK */}

                  <div className="aspect-square overflow-hidden bg-[#e5ded3]">

                    <img
                      src={product.image}
                      alt={product.name}
                      className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                    />

                  </div>

                  {/* INFORMASI PRODUK */}

                  <div className="p-4 md:p-6">

                    <p className="text-[10px] uppercase tracking-[0.2em] text-[#a27b3f] md:text-xs">
                      {product.category}
                    </p>

                    <h2 className="mt-2 line-clamp-2 font-serif text-lg font-bold md:text-xl">
                      {product.name}
                    </h2>

                    <p className="mt-2 text-sm font-semibold text-[#a27b3f] md:text-base">
                      {formatRupiah(
                        Number(product.price)
                      )}
                    </p>

                    <p className="mt-2 text-xs text-[#2f241c]/50">
                      {Number(product.stock) > 0
                        ? `Stok tersedia: ${product.stock}`
                        : "Stok habis"}
                    </p>

                    <div className="mt-4 text-sm font-medium text-[#2f241c] transition group-hover:text-[#a27b3f]">
                      Lihat Produk →
                    </div>

                  </div>

                </Link>

              ))}

            </div>

          )}

      </section>

      {/* =====================================================
          FOOTER
      ===================================================== */}

      <footer className="bg-[#2f241c] px-6 py-8 text-center text-sm text-white/60">
        © 2026 Lar Gurda. All rights reserved.
      </footer>

    </main>
  );
}