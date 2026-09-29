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

export default function BuySection({
  product,
  whatsappNumber,
}: BuySectionProps) {
  const [quantity, setQuantity] = useState(1);

  const [showForm, setShowForm] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const [isProcessing, setIsProcessing] = useState(false);

  const [message, setMessage] = useState("");

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

    const savedCart = localStorage.getItem("lar-garuda-cart");

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
      "lar-garuda-cart",
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
    setShowForm(true);
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

      console.log(
        "Data yang dikirim ke RPC:",
        orderItems
      );

      // =================================================
      // SIMPAN ORDER + KURANGI STOK
      // =================================================

      const {
        data: orderId,
        error: orderError,
      } = await supabase.rpc(
        "create_order_with_stock",
        {
          p_customer_name: customerName.trim(),
          p_customer_phone: customerPhone.trim(),
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
      // CEK ORDER ID
      // =================================================

      if (!orderId) {
        console.error(
          "Order ID tidak diterima dari database."
        );

        setMessage(
          "Pesanan gagal diproses karena Order ID tidak diterima."
        );

        setIsProcessing(false);
        return;
      }

      console.log(
        "Order berhasil:",
        orderId
      );

      // =================================================
      // HITUNG TOTAL
      // =================================================

      const total =
        latestProduct.price * quantity;

      // =================================================
      // BUAT PESAN WHATSAPP
      // =================================================

      const whatsappMessage = `Halo Lar Garuda, saya ingin melakukan pemesanan:

Nama: ${customerName.trim()}
No. WhatsApp: ${customerPhone.trim()}

Produk: ${latestProduct.name}
Jumlah: ${quantity}
Harga: ${formatRupiah(latestProduct.price)}
Subtotal: ${formatRupiah(total)}

Total Pesanan: ${formatRupiah(total)}

Order ID: ${orderId}

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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6 backdrop-blur-sm">

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
                onChange={(e) =>
                  setCustomerPhone(
                    e.target.value
                  )
                }
                placeholder="Contoh: 081234567890"
                disabled={isProcessing}
                className="mt-2 w-full rounded-2xl border border-[#2f241c]/20 bg-white px-4 py-3 outline-none transition focus:border-[#a27b3f] disabled:opacity-50"
              />

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