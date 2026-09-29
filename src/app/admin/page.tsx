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

type Order = {
  id: string;
  customer_name: string;
  customer_phone: string;
  total_amount: number;
  status: string;
  created_at: string;
  stock_processed: boolean;
  stock_restored: boolean;
};

type OrderItem = {
  id?: number;
  order_id: string;
  product_id: number;
  product_name: string;
  price: number;
  quantity: number;
  subtotal: number;
  created_at?: string;
};

export default function AdminDashboard() {
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);

  const [selectedOrder, setSelectedOrder] =
    useState<Order | null>(null);

  const [selectedOrderItems, setSelectedOrderItems] =
    useState<OrderItem[]>([]);

  const [loadingOrderDetail, setLoadingOrderDetail] =
    useState(false);

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
  // FORMAT TANGGAL
  // =====================================================

  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(date));
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
      console.error(
        "Gagal mengambil produk:",
        error
      );
      return;
    }

    setProducts(data || []);
  };

  // =====================================================
  // AMBIL DATA PESANAN
  // =====================================================

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from("orders")
      .select(
        `
        id,
        customer_name,
        customer_phone,
        total_amount,
        status,
        created_at,
        stock_processed,
        stock_restored
        `
      )
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(
        "Gagal mengambil pesanan:",
        error
      );
      return;
    }

    setOrders(data || []);
  };

  // =====================================================
  // CEK LOGIN
  // =====================================================

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/admin/login");
        return;
      }

      await Promise.all([
        fetchProducts(),
        fetchOrders(),
      ]);

      setLoading(false);
      setOrdersLoading(false);
    };

    checkUser();
  }, [router]);

  // =====================================================
  // DETAIL PESANAN
  // =====================================================

  const openOrderDetail = async (
    order: Order
  ) => {
    setSelectedOrder(order);
    setSelectedOrderItems([]);
    setLoadingOrderDetail(true);

    const { data, error } = await supabase
      .from("order_items")
      .select("*")
      .eq("order_id", order.id)
      .order("created_at", {
        ascending: true,
      });

    if (error) {
      console.error(
        "Gagal mengambil detail pesanan:",
        error
      );

      alert(
        `Gagal mengambil detail pesanan: ${error.message}`
      );

      setLoadingOrderDetail(false);
      return;
    }

    setSelectedOrderItems(data || []);
    setLoadingOrderDetail(false);
  };

  // =====================================================
  // TUTUP DETAIL
  // =====================================================

  const closeOrderDetail = () => {
    setSelectedOrder(null);
    setSelectedOrderItems([]);
  };

  // =====================================================
  // UBAH STATUS PESANAN
  // =====================================================

  const updateOrderStatus = async (
    order: Order,
    newStatus: string
  ) => {
    // ===================================================
    // PESANAN YANG SUDAH DIBATALKAN ADALAH FINAL
    // ===================================================

    if (order.status === "cancelled") {
      alert(
        "Pesanan yang sudah dibatalkan tidak dapat diubah kembali."
      );

      return;
    }

    // ===================================================
    // PESANAN SELESAI TIDAK BOLEH DIBATALKAN
    // ===================================================

    if (
      order.status === "completed" &&
      newStatus === "cancelled"
    ) {
      alert(
        "Pesanan yang sudah selesai tidak dapat dibatalkan."
      );

      return;
    }

    // ===================================================
    // JIKA STATUS TIDAK BERUBAH
    // ===================================================

    if (order.status === newStatus) {
      return;
    }

    // ===================================================
    // JIKA ADMIN MEMBATALKAN PESANAN
    // ===================================================

    if (newStatus === "cancelled") {
      const confirmed = window.confirm(
        "Apakah Anda yakin ingin membatalkan pesanan ini?\n\nStok produk akan dikembalikan secara otomatis."
      );

      if (!confirmed) {
        return;
      }

      const {
        data,
        error,
      } = await supabase.rpc(
        "cancel_order_and_restore_stock",
        {
          p_order_id: order.id,
        }
      );

      if (error) {
        console.error(
          "Gagal membatalkan pesanan:",
          error
        );

        alert(
          `Gagal membatalkan pesanan: ${error.message}`
        );

        return;
      }

      if (!data) {
        alert(
          "Pesanan gagal dibatalkan."
        );

        return;
      }

      // =================================================
      // UPDATE DATA ORDER DI FRONTEND
      // =================================================

      const updatedOrder: Order = {
        ...order,
        status: "cancelled",
        stock_restored: true,
      };

      setOrders((currentOrders) =>
        currentOrders.map((currentOrder) =>
          currentOrder.id === order.id
            ? updatedOrder
            : currentOrder
        )
      );

      if (
        selectedOrder &&
        selectedOrder.id === order.id
      ) {
        setSelectedOrder(updatedOrder);
      }

      // =================================================
      // REFRESH STOK PRODUK
      // =================================================

      await fetchProducts();

      alert(
        "Pesanan berhasil dibatalkan dan stok telah dikembalikan."
      );

      return;
    }

    // ===================================================
    // STATUS NORMAL
    // ===================================================

    const { error } = await supabase
      .from("orders")
      .update({
        status: newStatus,
      })
      .eq("id", order.id);

    if (error) {
      console.error(
        "Gagal mengubah status:",
        error
      );

      alert(
        `Gagal mengubah status: ${error.message}`
      );

      return;
    }

    // ===================================================
    // UPDATE DATA ORDER DI FRONTEND
    // ===================================================

    const updatedOrder: Order = {
      ...order,
      status: newStatus,
    };

    setOrders((currentOrders) =>
      currentOrders.map((currentOrder) =>
        currentOrder.id === order.id
          ? updatedOrder
          : currentOrder
      )
    );

    if (
      selectedOrder &&
      selectedOrder.id === order.id
    ) {
      setSelectedOrder(updatedOrder);
    }
  };

  // =====================================================
  // HAPUS PRODUK
  // =====================================================

  const handleDelete = async (
    id: number,
    name: string
  ) => {
    const confirmed = window.confirm(
      `Apakah Anda yakin ingin menghapus produk "${name}"?`
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", id);

    if (error) {
      console.error(
        "Gagal menghapus produk:",
        error
      );

      alert(
        `Gagal menghapus produk: ${error.message}`
      );

      return;
    }

    setProducts((currentProducts) =>
      currentProducts.filter(
        (product) => product.id !== id
      )
    );
  };

  // =====================================================
  // LOGOUT
  // =====================================================

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/admin/login");
  };

  // =====================================================
  // STATUS BADGE
  // =====================================================

  const getStatusClass = (
    status: string
  ) => {
    switch (status.toLowerCase()) {
      case "pending":
        return "bg-yellow-100 text-yellow-700";

      case "confirmed":
        return "bg-blue-100 text-blue-700";

      case "processing":
        return "bg-indigo-100 text-indigo-700";

      case "completed":
        return "bg-green-100 text-green-700";

      case "cancelled":
        return "bg-red-100 text-red-700";

      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  // =====================================================
  // LABEL STATUS
  // =====================================================

  const getStatusLabel = (
    status: string
  ) => {
    switch (status) {
      case "pending":
        return "Pending";

      case "confirmed":
        return "Dikonfirmasi";

      case "processing":
        return "Diproses";

      case "completed":
        return "Selesai";

      case "cancelled":
        return "Dibatalkan";

      default:
        return status;
    }
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
              LAR GARUDA
            </h1>

            <p className="text-xs uppercase tracking-[0.2em] text-[#2f241c]/50">
              Admin Dashboard
            </p>

          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="rounded-full border border-[#2f241c]/20 px-5 py-2 text-sm transition hover:bg-[#2f241c] hover:text-white"
          >
            Logout
          </button>

        </div>

      </header>

      {/* =====================================================
          CONTENT
      ===================================================== */}

      <section className="mx-auto max-w-7xl px-6 py-10">

        {/* =================================================
            PRODUK
        ================================================= */}

        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">

          <div>

            <h2 className="font-serif text-3xl font-bold">
              Produk
            </h2>

            <p className="mt-2 text-sm text-[#2f241c]/60">
              Kelola katalog produk Lar Garuda.
            </p>

          </div>

          <button
            type="button"
            onClick={() =>
              router.push("/admin/tambah")
            }
            className="rounded-full bg-[#2f241c] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#a27b3f]"
          >
            + Tambah Produk
          </button>

        </div>

        {/* =================================================
            PRODUCT LIST
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

              {products.map((product) => (

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
                        {formatRupiah(
                          product.price
                        )}
                      </p>

                      <p className="mt-1 text-xs text-[#2f241c]/50">
                        ID Produk: {product.id}
                      </p>

                      <p
                        className={`mt-1 text-sm font-medium ${
                          product.stock > 0
                            ? "text-green-700"
                            : "text-red-600"
                        }`}
                      >
                        Stok: {product.stock}

                        {product.stock === 0 &&
                          " (Habis)"}
                      </p>

                    </div>

                  </div>

                  <div className="flex gap-3">

                    <button
                      type="button"
                      onClick={() =>
                        router.push(
                          `/admin/edit/${product.id}`
                        )
                      }
                      className="rounded-full border border-[#2f241c]/20 px-5 py-2 text-sm transition hover:bg-[#e5ded3]"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleDelete(
                          product.id,
                          product.name
                        )
                      }
                      className="rounded-full border border-red-200 px-5 py-2 text-sm text-red-600 transition hover:bg-red-50"
                    >
                      Hapus
                    </button>

                  </div>

                </div>

              ))}

            </div>

          )}

        </div>

        {/* =================================================
            PESANAN
        ================================================= */}

        <div className="mt-16">

          <div>

            <h2 className="font-serif text-3xl font-bold">
              Pesanan
            </h2>

            <p className="mt-2 text-sm text-[#2f241c]/60">
              Kelola pesanan pelanggan Lar Garuda.
            </p>

          </div>

          <div className="mt-8 overflow-hidden rounded-3xl bg-white shadow-sm">

            {ordersLoading ? (

              <div className="p-8 text-center text-sm text-[#2f241c]/60">
                Memuat pesanan...
              </div>

            ) : orders.length === 0 ? (

              <div className="p-8 text-center text-sm text-[#2f241c]/60">
                Belum ada pesanan.
              </div>

            ) : (

              <div className="divide-y divide-[#2f241c]/10">

                {orders.map((order) => (

                  <div
                    key={order.id}
                    className="p-6"
                  >

                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

                      {/* INFORMASI PESANAN */}

                      <div>

                        <div className="flex flex-wrap items-center gap-3">

                          <h3 className="font-serif text-xl font-semibold">
                            {order.customer_name}
                          </h3>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusClass(
                              order.status
                            )}`}
                          >
                            {getStatusLabel(
                              order.status
                            )}
                          </span>

                        </div>

                        <p className="mt-2 text-sm text-[#2f241c]/60">
                          WhatsApp:{" "}
                          {order.customer_phone}
                        </p>

                        <p className="mt-1 text-xs text-[#2f241c]/50">
                          Order ID:{" "}
                          {order.id}
                        </p>

                        <p className="mt-1 text-xs text-[#2f241c]/50">
                          {formatDate(
                            order.created_at
                          )}
                        </p>

                        {order.stock_restored && (
                          <p className="mt-2 text-xs font-medium text-red-600">
                            Stok telah dikembalikan
                          </p>
                        )}

                      </div>

                      {/* TOTAL + STATUS */}

                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">

                        <div className="text-left sm:text-right">

                          <p className="text-xs text-[#2f241c]/50">
                            Total Pesanan
                          </p>

                          <p className="mt-1 text-xl font-bold text-[#a27b3f]">
                            {formatRupiah(
                              order.total_amount
                            )}
                          </p>

                        </div>

                        {order.status === "cancelled" ? (

                          <div className="rounded-full bg-red-100 px-5 py-2 text-center text-sm font-medium text-red-700">
                            Dibatalkan
                          </div>

                        ) : order.status === "completed" ? (

                          <div className="rounded-full bg-green-100 px-5 py-2 text-center text-sm font-medium text-green-700">
                            Selesai
                          </div>

                        ) : (

                          <select
                            value={order.status}
                            onChange={(e) =>
                              updateOrderStatus(
                                order,
                                e.target.value
                              )
                            }
                            className="rounded-full border border-[#2f241c]/20 bg-white px-4 py-2 text-sm outline-none focus:border-[#a27b3f]"
                          >

                            <option value="pending">
                              Pending
                            </option>

                            <option value="confirmed">
                              Dikonfirmasi
                            </option>

                            <option value="processing">
                              Diproses
                            </option>

                            <option value="completed">
                              Selesai
                            </option>

                            <option value="cancelled">
                              Dibatalkan
                            </option>

                          </select>

                        )}

                        <button
                          type="button"
                          onClick={() =>
                            openOrderDetail(order)
                          }
                          className="rounded-full bg-[#2f241c] px-5 py-2 text-sm text-white transition hover:bg-[#a27b3f]"
                        >
                          Detail
                        </button>

                      </div>

                    </div>

                  </div>

                ))}

              </div>

            )}

          </div>

        </div>

      </section>

      {/* =====================================================
          MODAL DETAIL PESANAN
      ===================================================== */}

      {selectedOrder && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6 py-8 backdrop-blur-sm">

          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-[#f8f5ef] p-7 shadow-2xl">

            <div className="flex items-start justify-between gap-5">

              <div>

                <p className="text-sm uppercase tracking-[0.2em] text-[#a27b3f]">
                  Detail Pesanan
                </p>

                <h2 className="mt-2 font-serif text-2xl font-bold">
                  {selectedOrder.customer_name}
                </h2>

              </div>

              <button
                type="button"
                onClick={closeOrderDetail}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[#2f241c]/20 text-xl transition hover:bg-[#e5ded3]"
              >
                ×
              </button>

            </div>

            {/* INFORMASI PEMBELI */}

            <div className="mt-6 rounded-2xl bg-white p-5">

              <div className="grid gap-4 sm:grid-cols-2">

                <div>

                  <p className="text-xs text-[#2f241c]/50">
                    Nama
                  </p>

                  <p className="mt-1 font-medium">
                    {selectedOrder.customer_name}
                  </p>

                </div>

                <div>

                  <p className="text-xs text-[#2f241c]/50">
                    No. WhatsApp
                  </p>

                  <a
                    href={`https://wa.me/${selectedOrder.customer_phone.replace(
                      /^0/,
                      "62"
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 block font-medium text-[#a27b3f] hover:underline"
                  >
                    {selectedOrder.customer_phone}
                  </a>

                </div>

                <div>

                  <p className="text-xs text-[#2f241c]/50">
                    Order ID
                  </p>

                  <p className="mt-1 break-all text-sm font-medium">
                    {selectedOrder.id}
                  </p>

                </div>

                <div>

                  <p className="text-xs text-[#2f241c]/50">
                    Tanggal
                  </p>

                  <p className="mt-1 font-medium">
                    {formatDate(
                      selectedOrder.created_at
                    )}
                  </p>

                </div>

              </div>

            </div>

            {/* DAFTAR PRODUK */}

            <div className="mt-6">

              <h3 className="font-serif text-xl font-bold">
                Produk yang Dipesan
              </h3>

              {loadingOrderDetail ? (

                <div className="mt-4 rounded-2xl bg-white p-6 text-center text-sm text-[#2f241c]/60">
                  Memuat detail...
                </div>

              ) : selectedOrderItems.length === 0 ? (

                <div className="mt-4 rounded-2xl bg-white p-6 text-center text-sm text-[#2f241c]/60">
                  Detail produk tidak ditemukan.
                </div>

              ) : (

                <div className="mt-4 overflow-hidden rounded-2xl bg-white">

                  <div className="divide-y divide-[#2f241c]/10">

                    {selectedOrderItems.map(
                      (item, index) => (

                        <div
                          key={`${item.order_id}-${item.product_id}-${index}`}
                          className="flex items-center justify-between gap-4 p-5"
                        >

                          <div>

                            <p className="font-medium">
                              {item.product_name}
                            </p>

                            <p className="mt-1 text-sm text-[#2f241c]/50">
                              {formatRupiah(
                                item.price
                              )}{" "}
                              ×{" "}
                              {item.quantity}
                            </p>

                          </div>

                          <p className="font-semibold text-[#a27b3f]">
                            {formatRupiah(
                              item.subtotal
                            )}
                          </p>

                        </div>

                      )
                    )}

                  </div>

                </div>

              )}

            </div>

            {/* TOTAL */}

            <div className="mt-6 rounded-2xl bg-[#e5ded3] p-5">

              <div className="flex items-center justify-between">

                <span className="text-[#2f241c]/60">
                  Total Pesanan
                </span>

                <span className="text-2xl font-bold text-[#a27b3f]">
                  {formatRupiah(
                    selectedOrder.total_amount
                  )}
                </span>

              </div>

            </div>

            {/* STATUS */}

            <div className="mt-6">

              <label className="text-sm font-medium">
                Status Pesanan
              </label>

              {selectedOrder.status === "cancelled" ? (

                <div className="mt-2 rounded-2xl bg-red-100 px-4 py-3 text-sm font-medium text-red-700">
                  Pesanan dibatalkan dan stok telah dikembalikan.
                </div>

              ) : selectedOrder.status === "completed" ? (

                <div className="mt-2 rounded-2xl bg-green-100 px-4 py-3 text-sm font-medium text-green-700">
                  Pesanan telah selesai.
                </div>

              ) : (

                <select
                  value={selectedOrder.status}
                  onChange={(e) =>
                    updateOrderStatus(
                      selectedOrder,
                      e.target.value
                    )
                  }
                  className="mt-2 w-full rounded-2xl border border-[#2f241c]/20 bg-white px-4 py-3 outline-none focus:border-[#a27b3f]"
                >

                  <option value="pending">
                    Pending
                  </option>

                  <option value="confirmed">
                    Dikonfirmasi
                  </option>

                  <option value="processing">
                    Diproses
                  </option>

                  <option value="completed">
                    Selesai
                  </option>

                  <option value="cancelled">
                    Dibatalkan
                  </option>

                </select>

              )}

            </div>

            {/* TUTUP */}

            <button
              type="button"
              onClick={closeOrderDetail}
              className="mt-7 w-full rounded-full bg-[#2f241c] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#a27b3f]"
            >
              Tutup
            </button>

          </div>

        </div>

      )}

    </main>
  );
}