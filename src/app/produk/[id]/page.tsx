import Link from "next/link";
import BuySection from "./BuySection";
import { supabase } from "@/lib/supabase";

export default async function ProductDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data: product, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error(
      "Gagal mengambil detail produk:",
      error
    );
  }

  if (!product) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f8f5ef] px-6">
        <div className="text-center">

          <h1 className="font-serif text-4xl font-bold">
            Produk Tidak Ditemukan
          </h1>

          <p className="mt-4 text-[#2f241c]/60">
            Produk yang Anda cari tidak tersedia.
          </p>

          <Link
            href="/"
            className="mt-8 inline-block rounded-full bg-[#2f241c] px-7 py-3 text-sm text-white"
          >
            Kembali ke Beranda
          </Link>

        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8f5ef] text-[#2f241c]">

      {/* NAVBAR */}

      <nav className="border-b border-[#2f241c]/10 bg-[#f8f5ef]">

        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">

          <Link href="/">

            <h1 className="font-serif text-2xl font-bold tracking-wide">
              LAR GURDA
            </h1>

            <p className="text-[10px] uppercase tracking-[0.3em]">
              Sarung Indonesia
            </p>

          </Link>

          <Link
            href="/"
            className="text-sm transition hover:text-[#a27b3f]"
          >
            ← Kembali
          </Link>

        </div>

      </nav>

      {/* PRODUCT DETAIL */}

      <section className="mx-auto max-w-7xl px-6 py-16">

        <div className="grid gap-12 md:grid-cols-2">

          {/* IMAGE */}

          <div className="overflow-hidden rounded-3xl bg-[#e5ded3]">

            <img
              src={product.image}
              alt={product.name}
              className="h-full max-h-[700px] w-full object-cover"
            />

          </div>

          {/* INFORMATION */}

          <div className="flex flex-col justify-center">

            <p className="text-sm uppercase tracking-[0.3em] text-[#a27b3f]">
              Koleksi Lar Gurda
            </p>

            <h1 className="mt-4 font-serif text-4xl font-bold leading-tight md:text-5xl">
              {product.name}
            </h1>

            <p className="mt-6 text-2xl font-semibold text-[#a27b3f]">
              {new Intl.NumberFormat("id-ID", {
                style: "currency",
                currency: "IDR",
                minimumFractionDigits: 0,
              }).format(Number(product.price))}
            </p>

            <div className="my-8 h-px bg-[#2f241c]/10" />

            <p className="leading-8 text-[#2f241c]/70">
              {product.description}
            </p>

            {/* PRODUCT INFO */}

            <div className="mt-8 space-y-4 border-y border-[#2f241c]/10 py-6">

              <div className="flex justify-between">

                <span className="text-[#2f241c]/60">
                  Kualitas
                </span>

                <span className="font-medium">
                  Premium
                </span>

              </div>

              <div className="flex justify-between">

                <span className="text-[#2f241c]/60">
                  Kategori
                </span>

                <span className="font-medium">
                  Sarung
                </span>

              </div>

              <div className="flex justify-between">

                <span className="text-[#2f241c]/60">
                  Ketersediaan
                </span>

                {Number(product.stock ?? 0) > 0 ? (

                  <span className="font-medium text-green-700">
                    Tersedia ({Number(product.stock)})
                  </span>

                ) : (

                  <span className="font-medium text-red-600">
                    Stok Habis
                  </span>

                )}

              </div>

            </div>

            {/* BUY BUTTON */}

            <BuySection
              product={{
                id: String(product.id),
                name: product.name,
                price: Number(product.price),
                image: product.image,
                stock: Number(product.stock ?? 0),
              }}
              whatsappNumber="6285772492774"
            />

          </div>

        </div>

      </section>

      {/* FOOTER */}

      <footer className="bg-[#2f241c] px-6 py-8 text-center text-sm text-white/60">
        © 2026 Lar Gurda. All rights reserved.
      </footer>

    </main>
  );
}