"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

type Product = {
  id: string;
  name: string;
  price: number;
  image: string;
  stock: number;
};

type BuySectionProps = {
  product: Product;
  whatsappNumber: string;
};

type CartItem = {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  stock: number;
};

// Hasil dari fungsi database create_order_with_stock_v2
type OrderResult = {
  order_id: string;
  total_amount: number;
  is_reseller: boolean;
  items: {
    product_name: string;
    price: number;
    quantity: number;
    subtotal: number;
  }[];
};

// Hasil dari fungsi database get_reseller_prices (hanya pratinjau harga)
type PricePreview = {
  is_reseller: boolean;
  total_amount: number;
  items: {
    product_id: string;
    price: number;
    quantity: number;
    subtotal: number;
  }[];
};

export default function BuySection({
  product,
  whatsappNumber,
}: BuySectionProps) {
  const [quantity, setQuantity] = useState(1);

  const [showForm, setShowForm] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");

  const [isProcessing, setIsProcessing] = useState(false);

  const [message, setMessage] = useState("");

  // Pratinjau harga reseller (hanya informasi; harga final dihitung database saat checkout)
  const [preview, setPreview] = useState<PricePreview | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [checkMessage, setCheckMessage] = useState("");

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
  // TAMBAH KE KERANJANG
  // =====================================================

  const addToCart = () => {
    if (product.stock <= 0) {
      alert("Maaf, stok produk sedang habis.");
      return;
    }

    const savedCart = localStorage.getItem("lar-gurda-cart");

    let cart: CartItem[] = [];

    try {
      if (savedCart) {
        const parsedCart = JSON.parse(savedCart);

        if (Array.isArray(parsedCart)) {
          cart = parsedCart;
        }
      }
    } catch (error) {
      console.error("Gagal membaca keranjang:", error);
      cart = [];
    }

    const existingIndex = cart.findIndex(
      (item) => String(item.id) === String(product.id)
    );

    if (existingIndex !== -1) {
      const existingItem = cart[existingIndex];

      const newQuantity = existingItem.quantity + quantity;

      if (newQuantity > product.stock) {
        alert(
          `Jumlah melebihi stok.\n\nStok tersedia: ${product.stock}`
        );
        return;
      }

      cart[existingIndex] = {
        ...existingItem,
        quantity: newQuantity,
        stock: product.stock,
      };
    } else {
      cart.push({
        id: String(product.id),
        name: product.name,
        price: product.price,
        image: product.image,
        quantity: quantity,
        stock: product.stock,
      });
    }

    localStorage.setItem(
      "lar-gurda-cart",
      JSON.stringify(cart)
    );

    alert(
      `${product.name} berhasil ditambahkan ke keranjang.`
    );
  };

  // =====================================================
  // BUKA FORM BELI SEKARANG
  // =====================================================

  const buyNow = () => {
    if (product.stock <= 0) {
      alert("Maaf, stok produk sedang habis.");
      return;
    }

    setMessage("");
    setPreview(null);
    setCheckMessage("");
    setShowForm(true);
  };

  // =====================================================
  // CEK HARGA RESELLER (pratinjau)
  // =====================================================

  const checkResellerPrice = async () => {
    if (isChecking || isProcessing) return;

    const digits = customerPhone.replace(/\D/g, "");

    if (digits.length < 9) {
      setPreview(null);
      setCheckMessage("Masukkan nomor WhatsApp yang valid terlebih dahulu.");
      return;
    }

    setIsChecking(true);
    setCheckMessage("");

    const { data, error } = await supabase.rpc("get_reseller_prices", {
      p_phone: customerPhone.trim(),
      p_items: [{ product_id: String(product.id), quantity: quantity }],
    });

    setIsChecking(false);

    if (error || !data) {
      console.error("Gagal mengecek harga reseller:", error);
      setPreview(null);
      setCheckMessage("Gagal mengecek harga. Silakan coba lagi.");
      return;
    }

    const result = data as PricePreview;

    if (!Array.isArray(result.items) || result.items.length === 0) {
      setPreview(null);
      setCheckMessage("Gagal mengecek harga. Silakan coba lagi.");
      return;
    }

    setPreview(result);
    setCheckMessage(
      result.is_reseller
        ? "Nomor terdaftar sebagai reseller. Harga reseller ditampilkan di ringkasan."
        : "Nomor ini tidak terdaftar sebagai reseller. Harga umum berlaku."
    );
  };

  // =====================================================
  // PROSES BELI SEKARANG
  // =====================================================

  const processBuyNow = async () => {
    if (isProcessing) return;

    if (!customerName.trim()) {
      setMessage("Silakan masukkan nama Anda.");
      return;
    }

    if (!customerPhone.trim()) {
      setMessage("Silakan masukkan nomor WhatsApp Anda.");
      return;
    }

    if (!customerAddress.trim()) {
      setMessage("Silakan masukkan alamat lengkap Anda.");
      return;
    }

    if (quantity <= 0) {
      setMessage("Jumlah produk tidak valid.");
      return;
    }

    setIsProcessing(true);
    setMessage("");

    try {
      // =================================================
      // CEK STOK TERBARU
      // =================================================

      const {
        data: latestProduct,
        error: stockError,
      } = await supabase
        .from("products")
        .select("id, name, price, image, stock")
        .eq("id", product.id)
        .maybeSingle();

      if (stockError) {
        console.error(
          "Gagal mengecek stok:",
          stockError
        );

        setMessage(
          "Gagal mengecek stok terbaru. Silakan coba lagi."
        );

        setIsProcessing(false);
        return;
      }

      // =================================================
      // PRODUK TIDAK DITEMUKAN
      // =================================================

      if (!latestProduct) {
        setMessage("Produk sudah tidak tersedia.");

        setIsProcessing(false);
        return;
      }

      // =================================================
      // STOK HABIS
      // =================================================

      if (
        latestProduct.stock === null ||
        latestProduct.stock <= 0
      ) {
        setMessage("Maaf, stok produk sedang habis.");

        setIsProcessing(false);
        return;
      }

      // =================================================
      // JUMLAH MELEBIHI STOK
      // =================================================

      if (quantity > latestProduct.stock) {
        setMessage(
          `Stok tidak mencukupi. Stok tersedia hanya ${latestProduct.stock} produk.`
        );

        setQuantity(latestProduct.stock);

        setIsProcessing(false);
        return;
      }

      // =================================================
      // DATA PRODUK UNTUK DATABASE
      // =================================================

      const orderItems = [
        {
          product_id: String(latestProduct.id),
          quantity: quantity,
        },
      ];

      // =================================================
      // SIMPAN ORDER + KURANGI STOK + HITUNG HARGA
      // (harga reseller ditentukan database dari nomor WhatsApp)
      // =================================================

      const {
        data: orderData,
        error: orderError,
      } = await supabase.rpc(
        "create_order_with_stock_v2",
        {
          p_customer_name: customerName.trim(),
          p_customer_phone: customerPhone.trim(),
          p_customer_address: customerAddress.trim(),
          p_items: orderItems,
        }
      );

      // =================================================
      // JIKA DATABASE ERROR
      // =================================================

      if (orderError) {
        console.error(
          "ERROR CREATE ORDER:",
          orderError
        );

        setMessage(
          `Pesanan gagal diproses.\n\n${orderError.message}`
        );

        setIsProcessing(false);
        return;
      }

      // =================================================
      // CEK HASIL DARI DATABASE
      // =================================================

      const result = orderData as OrderResult | null;

      if (
        !result ||
        !result.order_id ||
        !Array.isArray(result.items) ||
        result.items.length === 0
      ) {
        console.error(
          "Hasil pesanan tidak lengkap:",
          orderData
        );

        setMessage(
          "Pesanan gagal diproses karena data pesanan tidak diterima."
        );

        setIsProcessing(false);
        return;
      }

      // =================================================
      // BUAT PESAN WHATSAPP
      // (harga dan total diambil dari database)
      // =================================================

      const line = result.items[0];
      const shortCode = result.order_id.slice(0, 8);

      const whatsappMessage = `Halo Lar Gurda, saya ingin melakukan pemesanan:

Nama: ${customerName.trim()}
No. WhatsApp: ${customerPhone.trim()}
Alamat: ${customerAddress.trim()}

Produk: ${line.product_name}
Jumlah: ${line.quantity}
Harga: ${formatRupiah(Number(line.price))}${
        result.is_reseller ? " (harga reseller)" : ""
      }
Subtotal: ${formatRupiah(Number(line.subtotal))}

Total Pesanan: ${formatRupiah(Number(result.total_amount))}

Catatan:
Harga belum termasuk ongkir.
Ongkos kirim akan diinformasikan setelah alamat dikonfirmasi.

Kode Pesanan: ${shortCode}
Order ID: ${result.order_id}

Mohon konfirmasi pesanan saya. Terima kasih.`;

      const whatsappUrl =
        `https://wa.me/${whatsappNumber}?text=` +
        encodeURIComponent(whatsappMessage);

      // =================================================
      // RESET FORM
      // =================================================

      setShowForm(false);
      setCustomerName("");
      setCustomerPhone("");
      setCustomerAddress("");
      setQuantity(1);
      setMessage("");

      // =================================================
      // BUKA WHATSAPP
      // =================================================

      window.location.href = whatsappUrl;
    } catch (error) {
      console.error(
        "Buy Now Error:",
        error
      );

      setMessage(
        "Terjadi kesalahan saat memproses pesanan."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      {/* HARGA */}

      <div className="mt-6">
        <p className="text-2xl font-semibold text-[#a27b3f]">
          {formatRupiah(product.price)}
        </p>

        <p className="mt-1 text-xs italic text-[#2f241c]/50">
          Harga belum termasuk ongkir
        </p>
      </div>

      {/* JUMLAH PRODUK */}

      <div className="mt-8">
        <p className="mb-3 text-sm font-medium">
          Jumlah
        </p>

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={
              quantity <= 1 ||
              isProcessing
            }
            onClick={() =>
              setQuantity(
                Math.max(1, quantity - 1)
              )
            }
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#2f241c]/20 transition hover:bg-[#2f241c] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            −
          </button>

          <span className="w-8 text-center font-semibold">
            {quantity}
          </span>

          <button
            type="button"
            disabled={
              quantity >= product.stock ||
              isProcessing
            }
            onClick={() =>
              setQuantity(
                Math.min(
                  product.stock,
                  quantity + 1
                )
              )
            }
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#2f241c]/20 transition hover:bg-[#2f241c] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            +
          </button>
        </div>

        <p className="mt-2 text-xs text-[#2f241c]/50">
          {product.stock > 0
            ? `Stok tersedia: ${product.stock}`
            : "Stok habis"}
        </p>
      </div>

      {/* TOMBOL */}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={addToCart}
          disabled={
            product.stock <= 0 ||
            isProcessing
          }
          className="flex-1 rounded-full border border-[#2f241c] px-6 py-4 text-sm font-medium transition hover:bg-[#2f241c] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          Tambahkan ke Keranjang
        </button>

        <button
          type="button"
          onClick={buyNow}
          disabled={
            product.stock <= 0 ||
            isProcessing
          }
          className="flex-1 rounded-full bg-[#2f241c] px-6 py-4 text-sm font-medium text-white transition hover:bg-[#a27b3f] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Beli Sekarang via WhatsApp
        </button>
      </div>

      {/* FORM DATA PEMESAN */}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 px-6 py-8 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-[#f8f5ef] p-7 shadow-2xl">
            <h2 className="font-serif text-2xl font-bold">
              Data Pemesan
            </h2>

            <p className="mt-2 text-sm text-[#2f241c]/60">
              Masukkan data Anda sebelum melanjutkan pesanan.
            </p>

            {/* NAMA */}

            <div className="mt-6">
              <label className="text-sm font-medium">
                Nama
              </label>

              <input
                type="text"
                value={customerName}
                onChange={(e) =>
                  setCustomerName(
                    e.target.value
                  )
                }
                placeholder="Masukkan nama Anda"
                disabled={isProcessing}
                className="mt-2 w-full rounded-2xl border border-[#2f241c]/20 bg-white px-4 py-3 outline-none transition focus:border-[#a27b3f] disabled:opacity-50"
              />
            </div>

            {/* NOMOR WHATSAPP */}

            <div className="mt-4">
              <label className="text-sm font-medium">
                No. WhatsApp
              </label>

              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => {
                  setCustomerPhone(e.target.value);
                  setPreview(null);
                  setCheckMessage("");
                }}
                placeholder="Contoh: 081234567890"
                disabled={isProcessing}
                className="mt-2 w-full rounded-2xl border border-[#2f241c]/20 bg-white px-4 py-3 outline-none transition focus:border-[#a27b3f] disabled:opacity-50"
              />

              <button
                type="button"
                onClick={checkResellerPrice}
                disabled={isChecking || isProcessing}
                className="mt-3 rounded-full border border-[#2f241c]/30 px-4 py-2 text-xs font-medium transition hover:bg-[#2f241c] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isChecking ? "Memeriksa..." : "Cek harga reseller"}
              </button>

              {checkMessage && (
                <p
                  className={`mt-2 text-xs ${
                    preview?.is_reseller
                      ? "font-medium text-green-700"
                      : "text-[#2f241c]/60"
                  }`}
                >
                  {checkMessage}
                </p>
              )}

              <p className="mt-2 text-xs text-[#2f241c]/50">
                Reseller: gunakan nomor yang terdaftar, lalu tekan tombol
                di atas untuk melihat harga reseller.
              </p>
            </div>

            {/* ALAMAT */}

            <div className="mt-4">
              <label className="text-sm font-medium">
                Alamat Lengkap
              </label>

              <textarea
                value={customerAddress}
                onChange={(e) =>
                  setCustomerAddress(
                    e.target.value
                  )
                }
                placeholder="Contoh: Jl. Merpati No. 10, RT 02/RW 03, Kelurahan..., Kecamatan..., Kabupaten..., Jawa Tengah"
                rows={4}
                disabled={isProcessing}
                className="mt-2 w-full resize-none rounded-2xl border border-[#2f241c]/20 bg-white px-4 py-3 outline-none transition focus:border-[#a27b3f] disabled:opacity-50"
              />
            </div>

            {/* RINGKASAN */}

            <div className="mt-5 rounded-2xl bg-[#e5ded3] p-4">
              <p className="text-xs uppercase tracking-[0.15em] text-[#2f241c]/50">
                Ringkasan Pesanan
              </p>

              <div className="mt-3 flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium">
                    {product.name}
                  </p>

                  <p className="mt-1 text-sm text-[#2f241c]/60">
                    {quantity} ×{" "}
                    {formatRupiah(
                      preview ? Number(preview.items[0].price) : product.price
                    )}
                    {preview?.is_reseller && " (harga reseller)"}
                  </p>
                </div>

                <p className="font-semibold text-[#a27b3f]">
                  {formatRupiah(
                    preview
                      ? Number(preview.total_amount)
                      : product.price * quantity
                  )}
                </p>
              </div>

              {/* KETERANGAN HARGA DAN ONGKIR */}
              <div className="mt-3 border-t border-[#2f241c]/10 pt-3">
                <p className="text-xs italic text-[#2f241c]/60">
                  {preview
                    ? "Harga di atas adalah pratinjau. Harga final dihitung saat pesanan dibuat."
                    : "Harga di atas adalah harga umum. Jika nomor WhatsApp Anda terdaftar sebagai reseller, harga reseller diterapkan otomatis pada pesanan."}
                </p>

                <p className="mt-1 text-xs italic text-[#2f241c]/60">
                  Harga belum termasuk ongkir
                </p>
              </div>
            </div>

            {/* PESAN */}

            {message && (
              <div className="mt-4 whitespace-pre-line rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
                {message}
              </div>
            )}

            {/* BUTTON */}

            <div className="mt-7 flex gap-3">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() =>
                  setShowForm(false)
                }
                className="flex-1 rounded-full border border-[#2f241c]/20 px-5 py-3 text-sm font-medium transition hover:bg-[#e5ded3] disabled:opacity-50"
              >
                Batal
              </button>

              <button
                type="button"
                disabled={isProcessing}
                onClick={processBuyNow}
                className="flex-1 rounded-full bg-[#2f241c] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#a27b3f] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isProcessing
                  ? "Memproses..."
                  : "Lanjutkan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}