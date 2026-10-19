"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Product = {
  id: number;
  name: string;
  price: number;
  image: string;
  description: string;
  stock: number;
};

// Stok dianggap menipis jika jumlahnya sama atau di bawah angka ini.
const LOW_STOCK_LIMIT = 5;

export default function AdminProdukPage() {
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

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
  // AMBIL DATA PRODUK
  // =====================================================

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("id", {
        ascending: true,
      });

    if (error) {
      console.error("Gagal mengambil produk:", error);
      alert(`Gagal mengambil produk: ${error.message}`);
      return;
    }

    setProducts(data || []);
  };

  // =====================================================
  // LOAD SAAT HALAMAN DIBUKA
  // (pengecekan login sudah dilakukan oleh layout admin)
  // =====================================================

  useEffect(() => {
    const load = async () => {
      await fetchProducts();
      setLoading(false);
    };

    load();
  }, []);

  // =====================================================
  // HAPUS PRODUK
  // =====================================================

  const handleDelete = async (id: number, name: string) => {
    const confirmed = window.confirm(
      `Apakah Anda yakin ingin menghapus produk "${name}"?`
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Gagal menghapus produk:", error);

      alert(`Gagal menghapus produk: ${error.message}`);

      return;
    }

    setProducts((currentProducts) =>
      currentProducts.filter((product) => product.id !== id)
    );
  };

  return (
    <main className="min-h-screen bg-[#f8f5ef] text-[#2f241c]">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="border-b border-[#2f241c]/10 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <h1 className="font-serif text-2xl font-bold">
              LAR GURDA
            </h1>

            <p className="text-xs uppercase tracking-[0.2em] text-[#2f241c]/50">
              Admin Dashboard
            </p>
          </div>
        </div>
      </header>

      {/* =====================================================
          CONTENT
      ===================================================== */}

      <section className="mx-auto max-w-7xl px-6 py-10">
        {/* =================================================
            JUDUL + TOMBOL TAMBAH
        ================================================= */}

        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-serif text-3xl font-bold">
              Produk &amp; Stok
            </h2>

            <p className="mt-2 text-sm text-[#2f241c]/60">
              Kelola katalog produk dan stok Lar Gurda.
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.push("/admin/tambah")}
            className="rounded-full bg-[#2f241c] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#a27b3f]"
          >
            + Tambah Produk
          </button>
        </div>

        {/* =================================================
            DAFTAR PRODUK
        ================================================= */}

        <div className="mt-8 overflow-hidden rounded-3xl bg-white shadow-sm">
          {loading ? (
            <div className="p-8 text-center text-sm text-[#2f241c]/60">
              Memuat produk...
            </div>
          ) : products.length === 0 ? (
            <div className="p-8 text-center text-sm text-[#2f241c]/60">
              Belum ada produk.
            </div>
          ) : (
            <div className="divide-y divide-[#2f241c]/10">
              {products.map((product) => {
                const stock = product.stock ?? 0;

                return (
                  <div
                    key={product.id}
                    className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-5">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="h-24 w-24 rounded-2xl object-cover"
                      />

                      <div>
                        <h3 className="font-serif text-xl font-semibold">
                          {product.name}
                        </h3>

                        <p className="mt-1 font-medium text-[#a27b3f]">
                          {formatRupiah(product.price)}
                        </p>

                        <p className="mt-1 text-xs text-[#2f241c]/50">
                          ID Produk: {product.id}
                        </p>

                        <p
                          className={`mt-1 text-sm font-medium ${
                            stock === 0
                              ? "text-red-600"
                              : stock <= LOW_STOCK_LIMIT
                              ? "text-amber-600"
                              : "text-green-700"
                          }`}
                        >
                          Stok: {stock}
                          {stock === 0 && " (Habis)"}
                          {stock > 0 &&
                            stock <= LOW_STOCK_LIMIT &&
                            " (Menipis)"}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          router.push(`/admin/edit/${product.id}`)
                        }
                        className="rounded-full border border-[#2f241c]/20 px-5 py-2 text-sm transition hover:bg-[#e5ded3]"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleDelete(product.id, product.name)
                        }
                        className="rounded-full border border-red-200 px-5 py-2 text-sm text-red-600 transition hover:bg-red-50"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}