"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

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

export default function CartPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [stockWarning, setStockWarning] = useState<{
    productName: string;
    stock: number;
    quantity: number;
  } | null>(null);

  const [showCheckoutForm, setShowCheckoutForm] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");

  const [isProcessing, setIsProcessing] = useState(false);

  // Pratinjau harga reseller (hanya informasi; harga final dihitung database saat checkout)
  const [preview, setPreview] = useState<PricePreview | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [checkMessage, setCheckMessage] = useState("");

  // =====================================================
  // MENGAMBIL DATA KERANJANG
  // =====================================================

  useEffect(() => {
    const loadCart = async () => {
      const savedCart = localStorage.getItem("lar-gurda-cart");

      if (!savedCart) {
        setCart([]);
        return;
      }

      try {
        const parsedCart = JSON.parse(savedCart);

        if (!Array.isArray(parsedCart) || parsedCart.length === 0) {
          setCart([]);
          return;
        }

        const ids = parsedCart.map((item: CartItem) => item.id);

        const { data: products, error } = await supabase
          .from("products")
          .select("id, name, price, image, stock")
          .in("id", ids);

        if (error) {
          console.error(
            "Gagal mengambil data produk:",
            error
          );

          setCart(parsedCart);
          return;
        }

        const updatedCart = parsedCart
          .map((item: CartItem) => {
            const product = products?.find(
              (p) => String(p.id) === String(item.id)
            );

            if (!product) {
              return null;
            }

            return {
              ...item,
              name: product.name,
              price: Number(product.price),
              image: product.image,
              stock: Number(product.stock ?? 0),
            };
          })
          .filter(Boolean) as CartItem[];

        setCart(updatedCart);

        localStorage.setItem(
          "lar-gurda-cart",
          JSON.stringify(updatedCart)
        );
      } catch (error) {
        console.error(
          "Gagal membaca keranjang:",
          error
        );

        setCart([]);
      }
    };

    loadCart();
  }, []);

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
  // SIMPAN CART
  // =====================================================

  const saveCart = (updatedCart: CartItem[]) => {
    setCart(updatedCart);

    localStorage.setItem(
      "lar-gurda-cart",
      JSON.stringify(updatedCart)
    );
  };

  // =====================================================
  // HAPUS PRODUK
  // =====================================================

  const removeItem = (id: string) => {
    const updatedCart = cart.filter(
      (item) => item.id !== id
    );

    saveCart(updatedCart);
  };

  // =====================================================
  // UBAH JUMLAH PRODUK
  // =====================================================

  const updateQuantity = (
    id: string,
    change: number
  ) => {
    const item = cart.find(
      (item) => item.id === id
    );

    if (!item) return;

    // Jika jumlah 1 dan tombol minus ditekan
    if (
      item.quantity === 1 &&
      change === -1
    ) {
      setDeleteId(id);
      return;
    }

    // Cek stok
    if (
      change > 0 &&
      item.quantity + change > item.stock
    ) {
      setStockWarning({
        productName: item.name,
        stock: item.stock,
        quantity: item.quantity,
      });

      return;
    }

    const updatedCart = cart.map(
      (cartItem) =>
        cartItem.id === id
          ? {
              ...cartItem,
              quantity: Math.max(
                1,
                cartItem.quantity + change
              ),
            }
          : cartItem
    );

    saveCart(updatedCart);
  };

  // =====================================================
  // KONFIRMASI HAPUS
  // =====================================================

  const confirmDelete = () => {
    if (!deleteId) return;

    removeItem(deleteId);
    setDeleteId(null);
  };

  // =====================================================
  // TOTAL (harga umum, hanya perkiraan sebelum checkout)
  // =====================================================

  const total = cart.reduce(
    (sum, item) =>
      sum +
      Number(item.price) * item.quantity,
    0
  );

  // =====================================================
  // BUKA FORM CHECKOUT
  // =====================================================

  const checkoutWhatsApp = () => {
    if (cart.length === 0) {
      alert("Keranjang masih kosong.");
      return;
    }

    setPreview(null);
    setCheckMessage("");
    setShowCheckoutForm(true);
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
      p_items: cart.map((item) => ({
        product_id: String(item.id),
        quantity: item.quantity,
      })),
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
  // PROSES CHECKOUT
  // =====================================================

  const processCheckout = async () => {
    if (isProcessing) return;

    // =================================================
    // VALIDASI NAMA
    // =================================================

    if (!customerName.trim()) {
      alert("Silakan masukkan nama Anda.");
      return;
    }

    // =================================================
    // VALIDASI NOMOR WHATSAPP
    // =================================================

    if (!customerPhone.trim()) {
      alert("Silakan masukkan nomor WhatsApp Anda.");
      return;
    }

    // =================================================
    // VALIDASI ALAMAT
    // =================================================

    if (!customerAddress.trim()) {
      alert("Silakan masukkan alamat pengiriman Anda.");
      return;
    }

    // =================================================
    // VALIDASI KERANJANG
    // =================================================

    if (cart.length === 0) {
      alert("Keranjang masih kosong.");
      return;
    }

    setIsProcessing(true);

    try {
      // =================================================
      // AMBIL DATA PRODUK TERBARU
      // =================================================

      const ids = cart.map(
        (item) => item.id
      );

      const {
        data: latestProducts,
        error: stockCheckError,
      } = await supabase
        .from("products")
        .select(
          "id, name, price, image, stock"
        )
        .in("id", ids);

      if (stockCheckError) {
        console.error(
          "Gagal mengecek stok:",
          stockCheckError
        );

        alert(
          "Gagal mengecek stok terbaru. Silakan coba lagi."
        );

        return;
      }

      // =================================================
      // CEK STOK
      // =================================================

      for (const item of cart) {
        const product =
          latestProducts?.find(
            (p) =>
              String(p.id) ===
              String(item.id)
          );

        if (!product) {
          alert(
            `Produk "${item.name}" sudah tidak tersedia.`
          );

          return;
        }

        const currentStock =
          Number(product.stock ?? 0);

        // STOK HABIS
        if (currentStock <= 0) {
          setShowCheckoutForm(false);

          setStockWarning({
            productName: product.name,
            stock: 0,
            quantity: item.quantity,
          });

          return;
        }

        // JUMLAH MELEBIHI STOK
        if (
          item.quantity >
          currentStock
        ) {
          const updatedCart =
            cart.map((cartItem) =>
              cartItem.id === item.id
                ? {
                    ...cartItem,
                    quantity: currentStock,
                    stock: currentStock,
                  }
                : cartItem
            );

          saveCart(updatedCart);

          setShowCheckoutForm(false);

          setStockWarning({
            productName: product.name,
            stock: currentStock,
            quantity: item.quantity,
          });

          return;
        }
      }

      // =================================================
      // DATA UNTUK RPC
      // =================================================

      const orderItems = cart.map(
        (item) => ({
          product_id: String(item.id),
          quantity: item.quantity,
        })
      );

      // =================================================
      // PANGGIL FUNCTION SUPABASE
      // (harga reseller ditentukan database dari nomor WhatsApp)
      // =================================================

      const {
        data: orderData,
        error: orderError,
      } = await supabase.rpc(
        "create_order_with_stock_v2",
        {
          p_customer_name:
            customerName.trim(),

          p_customer_phone:
            customerPhone.trim(),

          p_customer_address:
            customerAddress.trim(),

          p_items: orderItems,
        }
      );

      // =================================================
      // JIKA GAGAL
      // =================================================

      if (orderError) {
        console.error(
          "ERROR CREATE ORDER:",
          orderError
        );

        alert(
          `Pesanan gagal disimpan ke database.\n\n${orderError.message}`
        );

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

        alert(
          "Pesanan gagal diproses karena data pesanan tidak diterima."
        );

        return;
      }

      // =================================================
      // BUAT DAFTAR PRODUK UNTUK WHATSAPP
      // (harga dan subtotal diambil dari database)
      // =================================================

      const itemsMessage = result.items
        .map(
          (item, index) =>
            `${index + 1}. ${item.product_name}
Jumlah: ${item.quantity}
Harga: ${formatRupiah(
              Number(item.price)
            )}${result.is_reseller ? " (harga reseller)" : ""}
Subtotal: ${formatRupiah(
              Number(item.subtotal)
            )}`
        )
        .join("\n\n");

      const shortCode =
        result.order_id.slice(0, 8);

      // =================================================
      // PESAN WHATSAPP
      // =================================================

      const message = `Halo Lar Gurda, saya ingin melakukan pemesanan:

Nama: ${customerName.trim()}
No. WhatsApp: ${customerPhone.trim()}

Alamat Pengiriman:
${customerAddress.trim()}

${itemsMessage}

Total Pesanan: ${formatRupiah(
        Number(result.total_amount)
      )}

Harga belum termasuk ongkir.

Kode Pesanan: ${shortCode}
Order ID: ${result.order_id}

Mohon konfirmasi pesanan saya. Terima kasih.`;

      // =================================================
      // NOMOR WHATSAPP LAR GURDA
      // =================================================

      const whatsappNumber =
        "6281333888009";

      const whatsappUrl =
        `https://wa.me/${whatsappNumber}?text=` +
        encodeURIComponent(message);

      // =================================================
      // KOSONGKAN KERANJANG
      // =================================================

      localStorage.removeItem(
        "lar-gurda-cart"
      );

      setCart([]);

      setCustomerName("");
      setCustomerPhone("");
      setCustomerAddress("");

      setShowCheckoutForm(false);

      // =================================================
      // BUKA WHATSAPP
      // =================================================

      window.location.href =
        whatsappUrl;
    } catch (error) {
      console.error(
        "Checkout error:",
        error
      );

      alert(
        "Terjadi kesalahan saat memproses pesanan."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f8f5ef] text-[#2f241c]">

      {/* =================================================
          NAVBAR
      ================================================= */}

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
            ← Kembali Belanja
          </Link>

        </div>

      </nav>

      {/* =================================================
          CONTENT
      ================================================= */}

      <section className="mx-auto max-w-5xl px-6 py-16">

        <div className="mb-10">

          <p className="text-sm uppercase tracking-[0.3em] text-[#a27b3f]">
            Pesanan Anda
          </p>

          <h1 className="mt-3 font-serif text-4xl font-bold md:text-5xl">
            Keranjang Belanja
          </h1>

        </div>

        {/* =================================================
            KERANJANG KOSONG
        ================================================= */}

        {cart.length === 0 ? (

          <div className="rounded-3xl bg-white p-8 text-center shadow-sm">

            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#e5ded3] text-3xl">
              🛒
            </div>

            <h2 className="mt-6 font-serif text-2xl font-bold">
              Keranjang masih kosong
            </h2>

            <p className="mt-3 text-[#2f241c]/60">
              Silakan pilih produk Lar Gurda terlebih dahulu.
            </p>

            <Link
              href="/produk"
              className="mt-7 inline-block rounded-full bg-[#2f241c] px-8 py-3 text-sm font-medium text-white transition hover:bg-[#a27b3f]"
            >
              Lihat Produk
            </Link>

          </div>

        ) : (

          <div className="space-y-6">

            {/* =================================================
                DAFTAR PRODUK
            ================================================= */}

            {cart.map((item) => (

              <div
                key={item.id}
                className="flex flex-col gap-6 rounded-3xl bg-white p-5 shadow-sm sm:flex-row sm:items-center"
              >

                <img
                  src={item.image}
                  alt={item.name}
                  className="h-40 w-full rounded-2xl object-cover sm:h-32 sm:w-32"
                />

                <div className="flex-1">

                  <h2 className="font-serif text-xl font-bold">
                    {item.name}
                  </h2>

                  <p className="mt-2 font-semibold text-[#a27b3f]">
                    {formatRupiah(
                      Number(item.price)
                    )}
                  </p>

                  <div className="mt-4 flex items-center gap-3">

                    <button
                      type="button"
                      onClick={() =>
                        updateQuantity(
                          item.id,
                          -1
                        )
                      }
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-[#2f241c]/20 transition hover:bg-[#2f241c] hover:text-white"
                    >
                      −
                    </button>

                    <span className="w-6 text-center font-semibold">
                      {item.quantity}
                    </span>

                    <button
                      type="button"
                      disabled={
                        item.quantity >=
                        item.stock
                      }
                      onClick={() =>
                        updateQuantity(
                          item.id,
                          1
                        )
                      }
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-[#2f241c]/20 transition hover:bg-[#2f241c] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      +
                    </button>

                  </div>

                  <p className="mt-2 text-xs text-[#2f241c]/50">
                    {item.stock > 0
                      ? `Stok tersedia: ${item.stock}`
                      : "Stok habis"}
                  </p>

                </div>

                <div className="flex items-center justify-between gap-6 sm:flex-col sm:items-end">

                  <p className="font-bold text-[#a27b3f]">
                    {formatRupiah(
                      Number(item.price) *
                        item.quantity
                    )}
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      removeItem(item.id)
                    }
                    className="text-sm text-red-600 transition hover:text-red-800"
                  >
                    Hapus
                  </button>

                </div>

              </div>

            ))}

            {/* =================================================
                RINGKASAN PESANAN
            ================================================= */}

            <div className="rounded-3xl bg-[#e5ded3] p-6">

              <div className="flex items-center justify-between">

                <span className="text-[#2f241c]/60">
                  Total Pesanan
                </span>

                <span className="text-2xl font-bold text-[#a27b3f]">
                  {formatRupiah(total)}
                </span>

              </div>

              {/* KETERANGAN HARGA DAN ONGKIR */}

              <p className="mt-2 text-right text-xs text-[#2f241c]/60">
                Harga di atas adalah harga umum. Reseller terdaftar
                mendapat harga reseller otomatis saat checkout.
              </p>

              <p className="mt-1 text-right text-xs text-[#2f241c]/60">
                Harga belum termasuk ongkir
              </p>

              <button
                type="button"
                onClick={checkoutWhatsApp}
                className="mt-6 flex w-full items-center justify-center rounded-full bg-[#2f241c] px-8 py-4 font-medium text-white transition hover:bg-[#a27b3f]"
              >
                Checkout via WhatsApp
              </button>

            </div>

          </div>

        )}

      </section>

      {/* =================================================
          FORM DATA PEMESAN
      ================================================= */}

      {showCheckoutForm && (

        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 px-6 py-8 backdrop-blur-sm">

          <div className="w-full max-w-md rounded-3xl bg-[#f8f5ef] p-7 shadow-2xl">

            <h2 className="font-serif text-2xl font-bold">
              Data Pemesan
            </h2>

            <p className="mt-2 text-sm text-[#2f241c]/60">
              Masukkan data Anda sebelum melanjutkan pesanan.
            </p>

            {/* =================================================
                NAMA
            ================================================= */}

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

            {/* =================================================
                NOMOR WHATSAPP
            ================================================= */}

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

            {/* =================================================
                ALAMAT
            ================================================= */}

            <div className="mt-4">

              <label className="text-sm font-medium">
                Alamat Pengiriman
              </label>

              <textarea
                value={customerAddress}
                onChange={(e) =>
                  setCustomerAddress(
                    e.target.value
                  )
                }
                placeholder="Masukkan alamat lengkap pengiriman"
                rows={4}
                disabled={isProcessing}
                className="mt-2 w-full resize-none rounded-2xl border border-[#2f241c]/20 bg-white px-4 py-3 outline-none transition focus:border-[#a27b3f] disabled:opacity-50"
              />

              <p className="mt-2 text-xs text-[#2f241c]/50">
                Pastikan alamat pengiriman sudah lengkap dan benar.
              </p>

            </div>

            {/* =================================================
                RINGKASAN
            ================================================= */}

            <div className="mt-5 rounded-2xl bg-white p-4">

              <div className="flex justify-between gap-4 text-sm">

                <span className="text-[#2f241c]/60">
                  Jumlah Produk
                </span>

                <span className="font-medium">
                  {cart.reduce(
                    (sum, item) =>
                      sum + item.quantity,
                    0
                  )}
                </span>

              </div>

              {preview?.is_reseller && (
                <div className="mt-3 space-y-1 border-t border-[#2f241c]/10 pt-3">
                  {preview.items.map((it, index) => {
                    const nama =
                      cart.find(
                        (c) => String(c.id) === String(it.product_id)
                      )?.name ?? "Produk";

                    return (
                      <div
                        key={`${it.product_id}-${index}`}
                        className="flex justify-between gap-3 text-xs"
                      >
                        <span className="text-[#2f241c]/60">
                          {nama} ({it.quantity} × {formatRupiah(Number(it.price))})
                        </span>

                        <span className="font-medium">
                          {formatRupiah(Number(it.subtotal))}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="mt-2 flex justify-between">

                <span className="text-[#2f241c]/60">
                  {preview?.is_reseller
                    ? "Total (harga reseller)"
                    : "Total (harga umum)"}
                </span>

                <span className="font-bold text-[#a27b3f]">
                  {formatRupiah(
                    preview ? Number(preview.total_amount) : total
                  )}
                </span>

              </div>

              <p className="mt-2 text-xs text-[#2f241c]/50">
                {preview
                  ? "Ini pratinjau. Harga final dihitung saat pesanan dibuat."
                  : "Jika nomor WhatsApp Anda terdaftar sebagai reseller, harga reseller diterapkan pada pesanan."}
              </p>

              <p className="mt-1 text-xs text-[#2f241c]/50">
                Harga belum termasuk ongkir
              </p>

            </div>

            {/* =================================================
                BUTTON
            ================================================= */}

            <div className="mt-7 flex gap-3">

              <button
                type="button"
                disabled={isProcessing}
                onClick={() =>
                  setShowCheckoutForm(false)
                }
                className="flex-1 rounded-full border border-[#2f241c]/20 px-5 py-3 text-sm font-medium transition hover:bg-[#e5ded3] disabled:opacity-50"
              >
                Batal
              </button>

              <button
                type="button"
                disabled={isProcessing}
                onClick={processCheckout}
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

      {/* =================================================
          MODAL HAPUS
      ================================================= */}

      {deleteId && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6 backdrop-blur-sm">

          <div className="w-full max-w-md rounded-3xl bg-[#f8f5ef] p-7 shadow-2xl">

            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#e5ded3] text-2xl">
              🛒
            </div>

            <h2 className="mt-5 text-center font-serif text-2xl font-bold">
              Hapus Produk?
            </h2>

            <p className="mt-3 text-center leading-6 text-[#2f241c]/60">
              Jumlah produk tinggal 1.
              <br />
              Apakah Anda yakin ingin menghapus
              produk ini dari keranjang?
            </p>

            <div className="mt-7 flex gap-3">

              <button
                type="button"
                onClick={() =>
                  setDeleteId(null)
                }
                className="flex-1 rounded-full border border-[#2f241c]/20 px-5 py-3 text-sm font-medium transition hover:bg-[#e5ded3]"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={confirmDelete}
                className="flex-1 rounded-full bg-[#2f241c] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#a27b3f]"
              >
                Hapus
              </button>

            </div>

          </div>

        </div>

      )}

      {/* =================================================
          MODAL STOK
      ================================================= */}

      {stockWarning && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6 backdrop-blur-sm">

          <div className="w-full max-w-md rounded-3xl bg-[#f8f5ef] p-7 shadow-2xl">

            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#e5ded3] text-2xl">
              ⚠️
            </div>

            <h2 className="mt-5 text-center font-serif text-2xl font-bold">
              Stok Tidak Mencukupi
            </h2>

            <p className="mt-3 text-center leading-6 text-[#2f241c]/60">

              Produk{" "}

              <strong>
                {stockWarning.productName}
              </strong>{" "}

              hanya tersedia{" "}

              <strong>
                {stockWarning.stock}
              </strong>{" "}

              produk.

              <br />

              Jumlah di keranjang:{" "}

              <strong>
                {stockWarning.quantity}
              </strong>{" "}

              produk.

            </p>

            <button
              type="button"
              onClick={() =>
                setStockWarning(null)
              }
              className="mt-7 w-full rounded-full bg-[#2f241c] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#a27b3f]"
            >
              Mengerti
            </button>

          </div>

        </div>

      )}

      {/* =================================================
          FOOTER
      ================================================= */}

      <footer className="bg-[#2f241c] px-6 py-8 text-center text-sm text-white/60">
        © 2026 Lar Gurda. All rights reserved.
      </footer>

    </main>
  );
}