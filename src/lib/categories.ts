// Daftar kategori produk Lar Gurda.
// Penulisannya harus SAMA PERSIS dengan kategori yang tersimpan di tabel products
// (huruf besar-kecil, spasi, dan tanda kurung), karena dipakai mencocokkan harga reseller.
export const CATEGORIES = [
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
] as const;

export type Category = (typeof CATEGORIES)[number];