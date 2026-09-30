"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Product = {
  id: number;
  name: string;
  category: string | null;
  price: number;
  image: string;
  description: string;
  stock: number;
};

const categories = [
  "Kelengan",
  "Kesikan",
  "Bledag",
  "Premium 1",
  "Granit Malaman",
  "Granit",
  "New Partan",
  "Full Tulis (A)",
  "Full Tulis (B)",
  "Full Tulis Signature",
];

export default function EditProduk() {
  const router = useRouter();
  const params = useParams();

  const id = params.id as string;

  const [product, setProduct] = useState<Product | null>(null);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [description, setDescription] = useState("");

  const [image, setImage] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // ==============================
  // AMBIL DATA PRODUK
  // ==============================

  useEffect(() => {
    const getProduct = async () => {
      setLoading(true);
      setError("");

      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", Number(id))
        .single();

      if (error) {
        console.error(error);

        setError(
          `Gagal mengambil data produk: ${error.message}`
        );

        setLoading(false);
        return;
      }

      setProduct(data);

      setName(data.name);
      setCategory(data.category ?? "");
      setPrice(String(data.price));
      setStock(String(data.stock ?? 0));
      setDescription(data.description ?? "");
      setImage(data.image ?? "");
      setImagePreview(data.image ?? "");

      setLoading(false);
    };

    if (id) {
      getProduct();
    }
  }, [id]);

  // ==============================
  // PILIH FOTO BARU
  // ==============================

  const handleImageChange = (
    e: ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError(
        "File yang dipilih harus berupa gambar."
      );
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError(
        "Ukuran gambar maksimal 5 MB."
      );
      return;
    }

    setError("");

    setImageFile(file);

    const previewUrl =
      URL.createObjectURL(file);

    setImagePreview(previewUrl);
  };

  // ==============================
  // SIMPAN PERUBAHAN
  // ==============================

  const handleSubmit = async (
    e: FormEvent
  ) => {
    e.preventDefault();

    setError("");
    setSaving(true);

    try {
      if (!name.trim()) {
        setError(
          "Nama produk wajib diisi."
        );
        setSaving(false);
        return;
      }

      if (!category) {
        setError(
          "Silakan pilih kategori produk."
        );
        setSaving(false);
        return;
      }

      if (!price || Number(price) <= 0) {
        setError(
          "Harga produk harus lebih dari 0."
        );
        setSaving(false);
        return;
      }

      if (!stock || Number(stock) < 0) {
        setError(
          "Stok produk tidak boleh kurang dari 0."
        );
        setSaving(false);
        return;
      }

      if (!description.trim()) {
        setError(
          "Deskripsi produk wajib diisi."
        );
        setSaving(false);
        return;
      }

      let imageUrl = image;

      // ==============================
      // JIKA ADA FOTO BARU
      // ==============================

      if (imageFile) {
        const fileExtension =
          imageFile.name.split(".").pop();

        const fileName =
          `${Date.now()}-${id}.${fileExtension}`;

        const { error: uploadError } =
          await supabase.storage
            .from("product-images")
            .upload(
              fileName,
              imageFile
            );

        if (uploadError) {
          console.error(uploadError);

          setError(
            `Gagal mengupload foto: ${uploadError.message}`
          );

          setSaving(false);
          return;
        }

        const {
          data: publicUrlData,
        } = supabase.storage
          .from("product-images")
          .getPublicUrl(fileName);

        imageUrl =
          publicUrlData.publicUrl;
      }

      // ==============================
      // UPDATE DATABASE
      // ==============================

      const { error: updateError } =
        await supabase
          .from("products")
          .update({
            name: name.trim(),
            category: category,
            price: Number(price),
            stock: Number(stock),
            image: imageUrl,
            description:
              description.trim(),
          })
          .eq("id", Number(id));

      if (updateError) {
        console.error(updateError);

        setError(
          `Gagal memperbarui produk: ${updateError.message}`
        );

        setSaving(false);
        return;
      }

      // ==============================
      // KEMBALI KE DASHBOARD
      // ==============================

      router.push("/admin");
      router.refresh();

    } catch (err) {
      console.error(err);

      setError(
        "Terjadi kesalahan saat memperbarui produk."
      );

      setSaving(false);
    }
  };

  // ==============================
  // LOADING
  // ==============================

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f8f5ef]">

        <p className="text-[#2f241c]/60">
          Memuat data produk...
        </p>

      </main>
    );
  }

  // ==============================
  // PRODUK TIDAK DITEMUKAN
  // ==============================

  if (!product) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f8f5ef] px-6">

        <div className="text-center">

          <h1 className="font-serif text-3xl font-bold">
            Produk Tidak Ditemukan
          </h1>

          <p className="mt-3 text-[#2f241c]/60">
            Produk dengan ID {id} tidak ditemukan.
          </p>

          <Link
            href="/admin"
            className="mt-6 inline-block rounded-full bg-[#2f241c] px-6 py-3 text-sm text-white transition hover:bg-[#a27b3f]"
          >
            Kembali ke Dashboard
          </Link>

        </div>

      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8f5ef] text-[#2f241c]">

      {/* HEADER */}

      <header className="border-b border-[#2f241c]/10 bg-white">

        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">

          <div>

            <h1 className="font-serif text-2xl font-bold">
              LAR GARUDA
            </h1>

            <p className="text-xs uppercase tracking-[0.2em] text-[#2f241c]/50">
              Edit Produk
            </p>

          </div>

          <Link
            href="/admin"
            className="rounded-full border border-[#2f241c]/20 px-5 py-2 text-sm transition hover:bg-[#2f241c] hover:text-white"
          >
            ← Kembali
          </Link>

        </div>

      </header>

      {/* FORM */}

      <section className="mx-auto max-w-3xl px-6 py-10">

        <div className="rounded-3xl bg-white p-8 shadow-sm">

          <div>

            <p className="text-sm uppercase tracking-[0.2em] text-[#a27b3f]">
              ID Produk #{product.id}
            </p>

            <h2 className="mt-2 font-serif text-3xl font-bold">
              Edit Produk
            </h2>

            <p className="mt-2 text-sm text-[#2f241c]/60">
              Ubah informasi produk dan simpan perubahan.
            </p>

          </div>

          <form
            onSubmit={handleSubmit}
            className="mt-8 space-y-6"
          >

            {/* ID */}

            <div>

              <label className="text-sm font-medium">
                ID Produk
              </label>

              <input
                type="text"
                value={product.id}
                disabled
                className="mt-2 w-full rounded-xl border border-[#2f241c]/10 bg-[#f5f2ed] px-4 py-3 text-[#2f241c]/50"
              />

              <p className="mt-2 text-xs text-[#2f241c]/50">
                ID tidak dapat diubah.
              </p>

            </div>

            {/* NAMA */}

            <div>

              <label className="text-sm font-medium">
                Nama Produk
              </label>

              <input
                type="text"
                value={name}
                onChange={(e) =>
                  setName(e.target.value)
                }
                required
                className="mt-2 w-full rounded-xl border border-[#2f241c]/20 px-4 py-3 outline-none transition focus:border-[#a27b3f]"
              />

            </div>

            {/* KATEGORI */}

            <div>

              <label className="text-sm font-medium">
                Kategori Produk
              </label>

              <select
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value)
                }
                required
                className="mt-2 w-full rounded-xl border border-[#2f241c]/20 bg-white px-4 py-3 outline-none transition focus:border-[#a27b3f]"
              >

                <option value="">
                  Pilih kategori produk
                </option>

                {categories.map(
                  (item) => (
                    <option
                      key={item}
                      value={item}
                    >
                      {item}
                    </option>
                  )
                )}

              </select>

              <p className="mt-2 text-xs text-[#2f241c]/50">
                Kategori saat ini akan otomatis
                dipilih berdasarkan data produk.
              </p>

            </div>

            {/* HARGA */}

            <div>

              <label className="text-sm font-medium">
                Harga
              </label>

              <input
                type="number"
                value={price}
                onChange={(e) =>
                  setPrice(e.target.value)
                }
                min="0"
                required
                className="mt-2 w-full rounded-xl border border-[#2f241c]/20 px-4 py-3 outline-none transition focus:border-[#a27b3f]"
              />

            </div>

            {/* STOK */}

            <div>

              <label className="text-sm font-medium">
                Jumlah Produk / Stok
              </label>

              <input
                type="number"
                value={stock}
                onChange={(e) =>
                  setStock(e.target.value)
                }
                min="0"
                required
                className="mt-2 w-full rounded-xl border border-[#2f241c]/20 px-4 py-3 outline-none transition focus:border-[#a27b3f]"
              />

              <p className="mt-2 text-xs text-[#2f241c]/50">
                Masukkan jumlah produk yang tersedia.
              </p>

            </div>

            {/* FOTO */}

            <div>

              <label className="text-sm font-medium">
                Foto Produk
              </label>

              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="mt-2 w-full rounded-xl border border-[#2f241c]/20 bg-white px-4 py-3 text-sm outline-none file:mr-4 file:rounded-full file:border-0 file:bg-[#2f241c] file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-[#a27b3f]"
              />

              <p className="mt-2 text-xs text-[#2f241c]/50">
                Kosongkan jika ingin mempertahankan foto lama.
              </p>

              {imagePreview && (
                <div className="mt-4">

                  <p className="mb-2 text-sm font-medium">
                    Preview Foto
                  </p>

                  <img
                    src={imagePreview}
                    alt={name}
                    className="h-48 w-48 rounded-2xl object-cover"
                  />

                </div>
              )}

            </div>

            {/* DESKRIPSI */}

            <div>

              <label className="text-sm font-medium">
                Deskripsi
              </label>

              <textarea
                value={description}
                onChange={(e) =>
                  setDescription(e.target.value)
                }
                rows={5}
                required
                className="mt-2 w-full resize-none rounded-xl border border-[#2f241c]/20 px-4 py-3 outline-none transition focus:border-[#a27b3f]"
              />

            </div>

            {/* ERROR */}

            {error && (
              <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            {/* SIMPAN */}

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-full bg-[#2f241c] px-6 py-3 font-medium text-white transition hover:bg-[#a27b3f] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? "Menyimpan Perubahan..."
                : "Simpan Perubahan"}
            </button>

          </form>

        </div>

      </section>

      {/* FOOTER */}

      <footer className="bg-[#2f241c] px-6 py-8 text-center text-sm text-white/60">
        © 2026 Lar Garuda. All rights reserved.
      </footer>

    </main>
  );
}