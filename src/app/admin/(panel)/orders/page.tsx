"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { ORDER_STATUS, statusClass } from "@/lib/orderStatus";
import type { OrderStatus } from "@/lib/orderStatus";

type Order = {
  id: string;
  customer_name: string;
  customer_phone: string;
  total_amount: number;
  status: string;
  created_at: string;
  stock_restored?: boolean;
};

type OrderItem = {
  id: string;
  order_id: string;
  product_id: number;
  product_name: string;
  price: number;
  quantity: number;
  subtotal: number;
  created_at: string;
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // ================================
  // FORMAT RUPIAH
  // ================================
  const formatRupiah = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);
  };

  // ================================
  // FORMAT TANGGAL
  // ================================
  const formatDate = (date: string) => {
    return new Date(date).toLocaleString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // ================================
  // LABEL STATUS (kode database -> teks Indonesia)
  // ================================
  const statusLabel = (status: string) =>
    ORDER_STATUS[status as OrderStatus]?.label ?? status;

  // ================================
  // AMBIL DATA PESANAN
  // ================================
  const loadOrders = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("orders")
      .select(
        "id, customer_name, customer_phone, total_amount, status, created_at, stock_restored"
      )
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error("Gagal mengambil pesanan:", error);

      alert(
        "Gagal mengambil data pesanan. Silakan cek koneksi Supabase dan RLS."
      );

      setLoading(false);
      return;
    }

    setOrders(data || []);
    setLoading(false);
  };

  // ================================
  // LOAD SAAT HALAMAN DIBUKA
  // ================================
  useEffect(() => {
    loadOrders();
  }, []);

  // ================================
  // LIHAT DETAIL PESANAN
  // ================================
  const viewDetail = async (order: Order) => {
    setSelectedOrder(order);
    setLoadingDetail(true);
    setOrderItems([]);

    const { data, error } = await supabase
      .from("order_items")
      .select(
        "id, order_id, product_id, product_name, price, quantity, subtotal, created_at"
      )
      .eq("order_id", order.id)
      .order("created_at", {
        ascending: true,
      });

    if (error) {
      console.error("Gagal mengambil detail pesanan:", error);

      alert("Gagal mengambil detail pesanan.");

      setLoadingDetail(false);
      return;
    }

    setOrderItems(data || []);
    setLoadingDetail(false);
  };

  // ================================
  // UPDATE STATUS
  // ================================
  const updateStatus = async (orderId: string, newStatus: string) => {
    const order = orders.find((o) => o.id === orderId);

    if (!order || order.status === newStatus) return;
    if (updatingId) return;
    if (order.status === "completed" && newStatus === "cancelled") {
      alert("Pesanan yang sudah selesai tidak dapat dibatalkan.");
      return;
    }

    let perubahan: Partial<Order> = { status: newStatus };

    setUpdatingId(orderId);

    // ---------- PEMBATALAN: stok dikembalikan oleh database ----------
    if (newStatus === "cancelled") {
      const confirmed = window.confirm(
        "Apakah Anda yakin ingin membatalkan pesanan ini?\n\nStok produk akan dikembalikan secara otomatis."
      );

      if (!confirmed) {
        setUpdatingId(null);
        return;
      }

      const { data, error } = await supabase.rpc(
        "cancel_order_and_restore_stock",
        {
          p_order_id: orderId,
        }
      );

      if (error || !data) {
        console.error("Gagal membatalkan pesanan:", error);

        alert(
          `Gagal membatalkan pesanan: ${
            error?.message ?? "tidak ada perubahan yang tersimpan"
          }`
        );

        setUpdatingId(null);
        return;
      }

      perubahan = { status: "cancelled", stock_restored: true };
    } else {
      // ---------- STATUS BIASA ----------
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("id", orderId);

      if (error) {
        console.error("Gagal mengubah status:", error);

        alert(`Gagal mengubah status pesanan: ${error.message}`);

        setUpdatingId(null);
        return;
      }
    }

    setOrders((currentOrders) =>
      currentOrders.map((o) =>
        o.id === orderId ? { ...o, ...perubahan } : o
      )
    );

    if (selectedOrder?.id === orderId) {
      setSelectedOrder({ ...selectedOrder, ...perubahan });
    }

    setUpdatingId(null);
  };

  return (
    <main className="min-h-screen bg-[#f8f5ef] text-[#2f241c]">
      {/* ================================
          NAVBAR
      ================================= */}

      <nav className="border-b border-[#2f241c]/10 bg-[#f8f5ef]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link href="/admin">
            <h1 className="font-serif text-2xl font-bold tracking-wide">
              LAR GURDA
            </h1>

            <p className="text-[10px] uppercase tracking-[0.3em]">
              Admin Dashboard
            </p>
          </Link>

        </div>
      </nav>

      {/* ================================
          CONTENT
      ================================= */}

      <section className="mx-auto max-w-7xl px-6 py-12">
        {/* TITLE */}

        <div className="mb-8">
          <p className="text-sm uppercase tracking-[0.3em] text-[#a27b3f]">
            Admin
          </p>

          <h1 className="mt-3 font-serif text-4xl font-bold">
            Pesanan Masuk
          </h1>

          <p className="mt-3 text-[#2f241c]/60">
            Kelola dan pantau pesanan pelanggan Lar Gurda.
          </p>
        </div>

        {/* ================================
            TABEL PESANAN
        ================================= */}

        
<div className="overflow-hidden rounded-2xl bg-white shadow-sm">
  {loading ? (
    <div className="p-10 text-center">
      <p className="text-sm text-[#2f241c]/60">
        Memuat data pesanan...
      </p>
    </div>
  ) : orders.length === 0 ? (
    <div className="p-10 text-center">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#e5ded3] text-3xl">
        📦
      </div>
      <h2 className="mt-5 font-serif text-2xl font-bold">
        Belum Ada Pesanan
      </h2>
      <p className="mt-2 text-sm text-[#2f241c]/60">
        Pesanan pelanggan akan muncul di halaman ini.
      </p>
    </div>
  ) : (
    <>
      {/* TAMPILAN MOBILE */}
      <div className="space-y-3 p-3 sm:hidden">
        {orders.map((order) => (
          <div
            key={order.id}
            className="rounded-xl border border-[#2f241c]/10 p-3"
          >
            {/* Nama pelanggan dan total */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="break-words text-sm font-bold">
                  {order.customer_name}
                </p>
                <p className="mt-1 text-[10px] text-[#2f241c]/40">
                  ID: {order.id.slice(0, 8)}...
                </p>
              </div>

              <p className="shrink-0 text-right text-sm font-bold text-[#a27b3f]">
                {formatRupiah(Number(order.total_amount))}
              </p>
            </div>

            <div className="my-3 border-t border-[#2f241c]/10" />

            {/* WhatsApp */}
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-[#2f241c]/50">WhatsApp</span>
              <a
                href={`https://wa.me/${order.customer_phone.replace(
                  /^0/,
                  "62"
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="max-w-[65%] break-all text-right text-[#a27b3f] hover:underline"
              >
                {order.customer_phone}
              </a>
            </div>

            {/* Tanggal */}
            <div className="mt-2 flex items-start justify-between gap-2 text-xs">
              <span className="shrink-0 text-[#2f241c]/50">
                Tanggal
              </span>
              <span className="text-right text-[#2f241c]/70">
                {formatDate(order.created_at)}
              </span>
            </div>

            {/* Status */}
            <div className="mt-3">
              <label className="mb-1 block text-xs text-[#2f241c]/50">
                Status pesanan
              </label>

              <select
                value={order.status}
                disabled={
                  order.status === "cancelled" ||
                  updatingId === order.id
                }
                onChange={(e) =>
                  updateStatus(order.id, e.target.value)
                }
                className={`w-full rounded-lg border-0 px-3 py-2 text-xs font-semibold outline-none disabled:cursor-not-allowed disabled:opacity-80 ${statusClass(
                  order.status
                )}`}
              >
                {Object.entries(ORDER_STATUS).map(([value, s]) => (
                  <option key={value} value={value}>
                    {s.label}
                  </option>
                ))}
              </select>

              {order.stock_restored && (
                <p className="mt-2 text-[10px] font-medium text-red-600">
                  Stok telah dikembalikan
                </p>
              )}
            </div>

            {/* Tombol detail */}
            <button
              type="button"
              onClick={() => viewDetail(order)}
              className="mt-3 w-full rounded-full bg-[#2f241c] px-4 py-2 text-xs font-medium text-white transition hover:bg-[#a27b3f]"
            >
              Lihat Detail Pesanan
            </button>
          </div>
        ))}
      </div>

      {/* TAMPILAN DESKTOP */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="border-b border-[#2f241c]/10 bg-[#e5ded3] text-left text-sm">
              <th className="px-6 py-4">Pelanggan</th>
              <th className="px-6 py-4">WhatsApp</th>
              <th className="px-6 py-4">Total</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Tanggal</th>
              <th className="px-6 py-4 text-center">Aksi</th>
            </tr>
          </thead>

          <tbody>
            {orders.map((order) => (
              <tr
                key={order.id}
                className="border-b border-[#2f241c]/10 last:border-b-0"
              >
                <td className="px-6 py-5">
                  <p className="font-semibold">
                    {order.customer_name}
                  </p>
                  <p className="mt-1 text-xs text-[#2f241c]/40">
                    ID: {order.id.slice(0, 8)}...
                  </p>
                </td>

                <td className="px-6 py-5">
                  <a
                    href={`https://wa.me/${order.customer_phone.replace(
                      /^0/,
                      "62"
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[#a27b3f] hover:underline"
                  >
                    {order.customer_phone}
                  </a>
                </td>

                <td className="px-6 py-5 font-semibold">
                  {formatRupiah(Number(order.total_amount))}
                </td>

                <td className="px-6 py-5">
                  <select
                    value={order.status}
                    disabled={
                      order.status === "cancelled" ||
                      updatingId === order.id
                    }
                    onChange={(e) =>
                      updateStatus(order.id, e.target.value)
                    }
                    className={`rounded-full border-0 px-3 py-2 text-xs font-semibold outline-none disabled:cursor-not-allowed disabled:opacity-80 ${statusClass(
                      order.status
                    )}`}
                  >
                    {Object.entries(ORDER_STATUS).map(
                      ([value, s]) => (
                        <option key={value} value={value}>
                          {s.label}
                        </option>
                      )
                    )}
                  </select>

                  {order.stock_restored && (
                    <p className="mt-2 text-xs font-medium text-red-600">
                      Stok telah dikembalikan
                    </p>
                  )}
                </td>

                <td className="px-6 py-5 text-sm text-[#2f241c]/60">
                  {formatDate(order.created_at)}
                </td>

                <td className="px-6 py-5 text-center">
                  <button
                    type="button"
                    onClick={() => viewDetail(order)}
                    className="rounded-full bg-[#2f241c] px-5 py-2 text-sm font-medium text-white transition hover:bg-[#a27b3f]"
                  >
                    Detail
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )}
</div>

      </section>

      {/* ================================
          MODAL DETAIL PESANAN
      ================================= */}

      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-[#f8f5ef] p-7 shadow-2xl">
            {/* HEADER */}

            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-[#a27b3f]">
                  Detail Pesanan
                </p>

                <h2 className="mt-2 font-serif text-2xl font-bold">
                  {selectedOrder.customer_name}
                </h2>

                <p className="mt-1 text-sm text-[#2f241c]/60">
                  {selectedOrder.customer_phone}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedOrder(null)
                }
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#2f241c]/20 text-lg transition hover:bg-[#2f241c] hover:text-white"
              >
                ×
              </button>
            </div>

            {/* INFORMASI PESANAN */}

            <div className="mt-6 rounded-2xl bg-white p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#2f241c]/60">
                  Status
                </span>

                <span
                  className={`rounded-full px-3 py-2 text-xs font-semibold ${statusClass(
                    selectedOrder.status
                  )}`}
                >
                  {statusLabel(selectedOrder.status)}
                </span>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm text-[#2f241c]/60">
                  Tanggal
                </span>

                <span className="text-sm font-medium">
                  {formatDate(
                    selectedOrder.created_at
                  )}
                </span>
              </div>

              {selectedOrder.stock_restored && (
                <p className="mt-4 text-xs font-medium text-red-600">
                  Stok telah dikembalikan
                </p>
              )}
            </div>

            {/* PRODUK */}

            <h3 className="mt-7 font-serif text-xl font-bold">
              Produk Dipesan
            </h3>

            {loadingDetail ? (
              <div className="mt-4 rounded-2xl bg-white p-6 text-center">
                <p className="text-sm text-[#2f241c]/60">
                  Memuat detail produk...
                </p>
              </div>
            ) : orderItems.length === 0 ? (
              <div className="mt-4 rounded-2xl bg-white p-6 text-center">
                <p className="text-sm text-[#2f241c]/60">
                  Tidak ada detail produk.
                </p>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {orderItems.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl bg-white p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h4 className="font-semibold">
                          {item.product_name}
                        </h4>

                        <p className="mt-1 text-sm text-[#2f241c]/50">
                          {formatRupiah(
                            Number(item.price)
                          )}{" "}
                          × {item.quantity}
                        </p>
                      </div>

                      <p className="font-bold text-[#a27b3f]">
                        {formatRupiah(
                          Number(item.subtotal)
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* TOTAL */}

            <div className="mt-6 rounded-2xl bg-[#e5ded3] p-5">
              <div className="flex items-center justify-between">
                <span className="text-[#2f241c]/60">
                  Total Pesanan
                </span>

                <span className="text-2xl font-bold text-[#a27b3f]">
                  {formatRupiah(
                    Number(selectedOrder.total_amount)
                  )}
                </span>
              </div>
            </div>

            {/* STATUS */}

            <div className="mt-6">
              <label className="text-sm font-medium">
                Ubah Status Pesanan
              </label>

              <select
                value={selectedOrder.status}
                disabled={
                  selectedOrder.status === "cancelled" ||
                  updatingId === selectedOrder.id
                }
                onChange={(e) =>
                  updateStatus(
                    selectedOrder.id,
                    e.target.value
                  )
                }
                className="mt-2 w-full rounded-2xl border border-[#2f241c]/20 bg-white px-4 py-3 outline-none focus:border-[#a27b3f] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {Object.entries(ORDER_STATUS).map(
                  ([value, s]) => (
                    <option key={value} value={value}>
                      {s.label}
                    </option>
                  )
                )}
              </select>
            </div>

            {/* TUTUP */}

            <button
              type="button"
              onClick={() =>
                setSelectedOrder(null)
              }
              className="mt-6 w-full rounded-full bg-[#2f241c] px-5 py-3 font-medium text-white transition hover:bg-[#a27b3f]"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* ================================
          FOOTER
      ================================= */}

      <footer className="bg-[#2f241c] px-6 py-8 text-center text-sm text-white/60">
        © 2026 Lar Gurda. All rights reserved.
      </footer>
    </main>
  );
}
