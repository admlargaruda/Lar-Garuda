"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Navbar from "@/components/Navbar";


type Product = {
  id: number;
  name: string;
  image: string;
  category: string;
};

type CategoryPreview = {
  category: string;
  products: Product[];
};

export default function ProdukPage() {
  const [categories, setCategories] = useState<CategoryPreview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("products")
        .select("id, name, image, category")
        .not("category", "is", null)
        .order("id", {
          ascending: true,
        });

      if (error) {
        console.error(
          "Gagal mengambil kategori:",
          error
        );

        setLoading(false);
        return;
      }

      const products = (data || []) as Product[];

      const groupedCategories: CategoryPreview[] = [];

      products.forEach((product) => {
        if (!product.category) return;

        const existingCategory =
          groupedCategories.find(
            (item) =>
              item.category === product.category
          );

        if (existingCategory) {
          existingCategory.products.push(product);
        } else {
          groupedCategories.push({
            category: product.category,
            products: [product],
          });
        }
      });

      setCategories(groupedCategories);
      setLoading(false);
    };

    fetchCategories();
  }, []);

  return (
    <main className="min-h-screen bg-[#f8f5ef] text-[#2f241c]">
     <Navbar />
     
      {/* =====================================================
          HEADER
      ===================================================== */}

      <section className="mx-auto max-w-7xl px-5 pb-12 pt-6 sm:px-6">

        <div className="text-center">

          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#a27b3f]">
            Koleksi Lar Gurda
          </p>

          <h2 className="mt-4 font-serif text-4xl font-bold sm:text-5xl">
            Katalog
          </h2>

          <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-[#2f241c]/60">
            Jelajahi koleksi sarung Lar Gurda
            berdasarkan kategori.
          </p>

        </div>

      </section>

      {/* =====================================================
          KATEGORI
      ===================================================== */}

      <section className="mx-auto max-w-7xl px-5 pb-24 sm:px-6">

        {loading ? (

          <div className="grid grid-cols-2 gap-3 sm:gap-6">

            {[1, 2, 3, 4, 5, 6].map(
              (item) => (

                <div
                  key={item}
                  className="h-[360px] animate-pulse rounded-[2rem] bg-white"
                />

              )
            )}

          </div>

        ) : categories.length === 0 ? (

          <div className="rounded-3xl bg-white p-12 text-center shadow-sm">

            <h3 className="font-serif text-2xl font-bold">
              Kategori Belum Tersedia
            </h3>

            <p className="mt-3 text-sm text-[#2f241c]/50">
              Belum ada produk dengan kategori
              yang tersedia.
            </p>

          </div>

        ) : (

          <div className="grid grid-cols-2 gap-3 sm:gap-6">

            {categories.map(
              (category, categoryIndex) => (

                <CategoryCard
                  key={category.category}
                  category={category}
                  categoryIndex={categoryIndex}
                />

              )
            )}

          </div>

        )}

      </section>

      {/* =====================================================
          FOOTER
      ===================================================== */}

      <footer className="bg-[#2f241c] px-6 py-10 text-center text-white">

        <p className="font-serif text-xl font-bold">
          LAR GURDA
        </p>

        <p className="mt-2 text-xs uppercase tracking-[0.25em] text-white/40">
          Sarung Indonesia
        </p>

        <div className="mx-auto my-6 h-px w-12 bg-[#a27b3f]" />

        <p className="text-xs text-white/40">
          © 2026 Lar Gurda. All rights reserved.
        </p>

      </footer>

    </main>
  );
}


/* =========================================================
   CATEGORY CARD
========================================================= */

function CategoryCard({
  category,
  categoryIndex,
}: {
  category: CategoryPreview;
  categoryIndex: number;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  const products = category.products;

  useEffect(() => {
    if (products.length <= 1) return;

    const interval = setInterval(() => {

      setVisible(false);

      setTimeout(() => {

        setCurrentIndex(
          (previousIndex) =>
            (previousIndex + 1) %
            products.length
        );

        setVisible(true);

      }, 700);

    }, 5000);

    return () => {
      clearInterval(interval);
    };

  }, [products.length]);

  const currentProduct =
    products[currentIndex];

  if (!currentProduct) {
    return null;
  }

  return (
    <Link
      href={`/produk/kategori/${encodeURIComponent(
        category.category
      )}`}
      className="group relative block overflow-hidden rounded-[2rem] bg-white shadow-sm transition duration-500 hover:-translate-y-1 hover:shadow-2xl"
    >

      {/* =================================================
          FOTO PRODUK
      ================================================= */}

      <div className="relative h-[260px] overflow-hidden bg-[#e5ded3] sm:h-[360px]">

        <img
          key={currentProduct.id}
          src={currentProduct.image}
          alt={currentProduct.name}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
            visible
              ? "opacity-100"
              : "opacity-0"
          }`}
        />

        {/* OVERLAY */}

        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* =================================================
            NOMOR KATEGORI
        ================================================= */}

        <div className="absolute left-6 top-6 rounded-full bg-white/90 px-4 py-2 text-[10px] font-medium uppercase tracking-[0.3em] text-[#a27b3f] backdrop-blur">
          Kategori {categoryIndex + 1}
        </div>

        {/* =================================================
            INFORMASI
        ================================================= */}

        <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-7 text-white">

          <p className="text-xs uppercase tracking-[0.25em] text-white/60">
            Koleksi
          </p>

          <h3 className="mt-2 break-words font-serif text-lg font-bold sm:text-3xl">
            {category.category}
          </h3>

          <p className="mt-2 text-sm text-white/70">
            {currentProduct.name}
          </p>

          <div className="mt-5 flex items-center justify-between">

            <span className="text-sm font-medium">
              Lihat koleksi →
            </span>

            {/* INDICATOR */}

            {products.length > 1 && (

              <div className="flex gap-1.5">

                {products
                  .slice(0, Math.min(products.length, 5))
                  .map((_, index) => (

                    <span
                      key={index}
                      className={`h-1.5 rounded-full transition-all duration-500 ${
                        index ===
                        currentIndex %
                          Math.min(
                            products.length,
                            5
                          )
                          ? "w-5 bg-white"
                          : "w-1.5 bg-white/40"
                      }`}
                    />

                  ))}

              </div>

            )}

          </div>

        </div>

      </div>

    </Link>
    
  );
}