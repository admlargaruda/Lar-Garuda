"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function TambahProduk() {
  const router = useRouter();

    const [name, setName] = useState("");
    const [price, setPrice] = useState("");
    const [image, setImage] = useState("");
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState("");
    const [description, setDescription] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
    const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
        setError("File yang dipilih harus berupa gambar.");
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        setError("Ukuran gambar maksimal 5 MB.");
        return;
    }

    setError("");
    setImageFile(file);

    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
    };
    const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
        if (!imageFile) {
        setError("Silakan pilih foto produk terlebih dahulu.");
        setLoading(false);
        return;
        }

        // Membuat nama file yang unik
        const fileExtension = imageFile.name.split(".").pop();
        const fileName = `${Date.now()}.${fileExtension}`;

        // Upload foto ke Supabase Storage
        const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(fileName, imageFile);

        if (uploadError) {
        console.error(uploadError);
        setError(`Gagal mengupload foto: ${uploadError.message}`);
        setLoading(false);
        return;
        }

        // Mengambil URL publik foto
        const { data: publicUrlData } = supabase.storage
        .from("product-images")
        .getPublicUrl(fileName);

        const imageUrl = publicUrlData.publicUrl;

        // Menyimpan data produk ke database
        const { error: insertError } = await supabase
        .from("products")
        .insert([
            {
            name,
            price: Number(price),
            image: imageUrl,
            description,
            },
        ]);

        if (insertError) {
        console.error(insertError);

        // Hapus foto jika penyimpanan produk gagal
        await supabase.storage
            .from("product-images")
            .remove([fileName]);

        setError(
            `Gagal menambahkan produk: ${insertError.message}`
        );

        setLoading(false);
        return;
        }

        router.push("/admin");
        router.refresh();
    } catch (err) {
        console.error(err);
        setError("Terjadi kesalahan saat menyimpan produk.");
        setLoading(false);
    }
    };

  return (
    <main className="min-h-screen bg-[#f8f5ef] text-[#2f241c]">
      <header className="border-b border-[#2f241c]/10 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <h1 className="font-serif text-2xl font-bold">LAR GARUDA</h1>
            <p className="text-xs uppercase tracking-[0.2em] text-[#2f241c]/50">
              Tambah Produk
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

      <section className="mx-auto max-w-3xl px-6 py-10">
        <div className="rounded-3xl bg-white p-8 shadow-sm">
          <div>
            <h2 className="font-serif text-3xl font-bold">
              Tambah Produk
            </h2>
            <p className="mt-2 text-sm text-[#2f241c]/60">
              Masukkan informasi produk baru ke katalog Lar Garuda.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <div>
              <label className="text-sm font-medium">
                Nama Produk
              </label>

              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Sarung Lar Garuda Premium"
                required
                className="mt-2 w-full rounded-xl border border-[#2f241c]/20 px-4 py-3 outline-none focus:border-[#a27b3f]"
              />
            </div>

            <div>
              <label className="text-sm font-medium">
                Harga
              </label>

              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Contoh: 125000"
                min="0"
                required
                className="mt-2 w-full rounded-xl border border-[#2f241c]/20 px-4 py-3 outline-none focus:border-[#a27b3f]"
              />
            </div>

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
                Format gambar JPG, JPEG, PNG, atau WebP. Maksimal 5 MB.
            </p>

            {imagePreview && (
                <div className="mt-4">
                <p className="mb-2 text-sm font-medium">
                    Preview Foto
                </p>

                <img
                    src={imagePreview}
                    alt="Preview produk"
                    className="h-48 w-48 rounded-2xl object-cover"
                />
                </div>
            )}
            </div>

            <div>
              <label className="text-sm font-medium">
                Deskripsi
              </label>

              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Masukkan deskripsi produk..."
                rows={5}
                required
                className="mt-2 w-full resize-none rounded-xl border border-[#2f241c]/20 px-4 py-3 outline-none focus:border-[#a27b3f]"
              />
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-[#2f241c] px-6 py-3 font-medium text-white transition hover:bg-[#a27b3f] disabled:opacity-50"
            >
              {loading ? "Menyimpan..." : "Simpan Produk"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}