"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

// Pesanan yang dihitung sebagai penjualan (pending dan cancelled tidak dihitung)
const COUNTED = ["confirmed", "processing", "completed"];

// Stok sama atau di bawah angka ini dianggap menipis
const LOW_STOCK_LIMIT = 5;

// Batas pembatalan otomatis pesanan pending (sama dengan jadwal di Supabase)
const AUTO_CANCEL_HOURS = 2;

// Urutan dan warna batang pada grafik "Pesanan per status"
const STATUS_GRAFIK = [
  { key: "pending", label: "Menunggu konfirmasi", warna: "bg-yellow-400" },
  { key: "confirmed", label: "Dikonfirmasi", warna: "bg-indigo-400" },
  { key: "processing", label: "Diproses", warna: "bg-blue-400" },
  { key: "completed", label: "Selesai", warna: "bg-green-500" },
  { key: "cancelled", label: "Dibatalkan", warna: "bg-red-400" },
];

type SalesOrder = {
  total_amount: number;
  status: string;
  created_at: string;
  reseller_id: string | null;
};

type PendingOrder = {
  id: string;
  customer_name: string;
  customer_phone: string;
  total_amount: number;
  created_at: string;
};

type LowStockProduct = {
  id: number;
  name: string;
  category: string | null;
  stock: number;
};

type ItemRow = {
  product_name: string;
  quantity: number;
  subtotal: number;
};

type TopProduct = {
  name: string;
  quantity: number;
  revenue: number;
};

type CrmStats = {
  total: number;
  aktif: number;
  perhatian: number;
  tidakAktif: number;
  belum: number;
  warningMonths: number;
  inactiveMonths: number;
};

const pad = (n: number) => String(n).padStart(2, "0");

const keyHari = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const formatRupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);

const linkWa = (phone: string) => {
  const digit = phone.replace(/\D/g, "");
  if (digit.startsWith("0")) return `https://wa.me/62${digit.slice(1)}`;
  if (digit.startsWith("8")) return `https://wa.me/62${digit}`;
  return `https://wa.me/${digit}`;
};

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [galat, setGalat] = useState<string[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingList, setPendingList] = useState<PendingOrder[]>([]);
  const [todayCount, setTodayCount] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [lowStockList, setLowStockList] = useState<LowStockProduct[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [crm, setCrm] = useState<CrmStats | null>(null);

  const [rentang, setRentang] = useState<7 | 30>(7);
  const [sekarang, setSekarang] = useState(() => new Date());

  // ================================
  // AMBIL SEMUA DATA
  // ================================
  const load = async () => {
    setLoading(true);

    const catatan: string[] = [];
    const now = new Date();
    setSekarang(now);

    const awalHariIni = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    const awalBulanLalu = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const awal30Hari = new Date(awalHariIni);
    awal30Hari.setDate(awal30Hari.getDate() - 29);

    const sejak =
      awalBulanLalu < awal30Hari ? awalBulanLalu : awal30Hari;

    const [
      
      salesRes,
      pendingRes,
      pendingCountRes,
      todayRes,
      stockRes,
      itemsRes,
      lastRes,
      resellerRes,
      settingRes,
      statusRes,
    ] = await Promise.all([
      // Penjualan (untuk omzet dan grafik)
      supabase
        .from("orders")
        .select("total_amount, status, created_at, reseller_id")
        .in("status", COUNTED)
        .gte("created_at", sejak.toISOString())
        .limit(5000),

      // Daftar pesanan menunggu konfirmasi
      supabase
        .from("orders")
        .select("id, customer_name, customer_phone, total_amount, created_at")
        .eq("status", "pending")
        .order("created_at", { ascending: true })
        .limit(5),

      // Jumlah pesanan menunggu konfirmasi
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),

      // Pesanan hari ini (selain yang dibatalkan)
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .gte("created_at", awalHariIni.toISOString())
        .neq("status", "cancelled"),

      // Stok menipis atau habis
      supabase
        .from("products")
        .select("id, name, category, stock", { count: "exact" })
        .lte("stock", LOW_STOCK_LIMIT)
        .order("stock", { ascending: true })
        .limit(6),

      // Produk terlaris 30 hari terakhir
      supabase
        .from("order_items")
        .select("product_name, quantity, subtotal, orders!inner(created_at, status)")
        .in("orders.status", COUNTED)
        .gte("orders.created_at", awal30Hari.toISOString())
        .limit(5000),

      // Pembelian terakhir tiap reseller
      supabase
        .from("orders")
        .select("reseller_id, created_at")
        .not("reseller_id", "is", null)
        .in("status", COUNTED)
        .order("created_at", { ascending: false })
        .limit(5000),

      supabase.from("resellers").select("id"),

      supabase
        .from("app_settings")
        .select("key, value")
        .in("key", ["reseller_warning_months", "reseller_inactive_months"]),
        
      // Semua pesanan 30 hari terakhir (untuk grafik per status)
      supabase
        .from("orders")
        .select("status")
        .gte("created_at", awal30Hari.toISOString())
        .limit(5000),
    ]);

    if (salesRes.error) {
      console.error(salesRes.error);
      catatan.push(`Data penjualan: ${salesRes.error.message}`);
    } else {
      setSalesOrders((salesRes.data || []) as SalesOrder[]);
    }

    if (pendingRes.error) {
      console.error(pendingRes.error);
      catatan.push(`Pesanan menunggu: ${pendingRes.error.message}`);
    } else {
      setPendingList((pendingRes.data || []) as PendingOrder[]);
    }

    if (pendingCountRes.error) {
      console.error(pendingCountRes.error);
    } else {
      setPendingCount(pendingCountRes.count ?? 0);
    }

    if (todayRes.error) {
      console.error(todayRes.error);
    } else {
      setTodayCount(todayRes.count ?? 0);
    }

    if (stockRes.error) {
      console.error(stockRes.error);
      catatan.push(`Stok: ${stockRes.error.message}`);
    } else {
      setLowStockList((stockRes.data || []) as LowStockProduct[]);
      setLowStockCount(stockRes.count ?? 0);
    }

    if (itemsRes.error) {
      console.error(itemsRes.error);
      catatan.push(`Produk terlaris: ${itemsRes.error.message}`);
    } else {
      const rows = (itemsRes.data || []) as unknown as ItemRow[];
      const peta = new Map<string, TopProduct>();

      rows.forEach((r) => {
        const ada = peta.get(r.product_name);
        if (ada) {
          ada.quantity += Number(r.quantity);
          ada.revenue += Number(r.subtotal);
        } else {
          peta.set(r.product_name, {
            name: r.product_name,
            quantity: Number(r.quantity),
            revenue: Number(r.subtotal),
          });
        }
      });

      setTopProducts(
        Array.from(peta.values())
          .sort((a, b) => b.quantity - a.quantity)
          .slice(0, 5)
      );
    }

    // Ringkasan CRM
    if (lastRes.error || resellerRes.error) {
      console.error(lastRes.error || resellerRes.error);
      catatan.push(
        `Reseller: ${(lastRes.error || resellerRes.error)?.message}`
      );
    } else {
      const pengaturan: Record<string, number> = {};
      (settingRes.data || []).forEach((s: { key: string; value: string }) => {
        const angka = parseInt(s.value, 10);
        if (!Number.isNaN(angka)) pengaturan[s.key] = angka;
      });

      const warningMonths = pengaturan["reseller_warning_months"] ?? 3;
      const inactiveMonths = pengaturan["reseller_inactive_months"] ?? 5;

      const batasPerhatian = new Date(now);
      batasPerhatian.setMonth(batasPerhatian.getMonth() - warningMonths);
      const batasTidakAktif = new Date(now);
      batasTidakAktif.setMonth(batasTidakAktif.getMonth() - inactiveMonths);

      // Pembelian terakhir per reseller (data sudah diurutkan dari yang terbaru)
      const terakhir = new Map<string, Date>();
      ((lastRes.data || []) as { reseller_id: string; created_at: string }[]).forEach(
        (o) => {
          if (!terakhir.has(o.reseller_id)) {
            terakhir.set(o.reseller_id, new Date(o.created_at));
          }
        }
      );

      const stat: CrmStats = {
        total: (resellerRes.data || []).length,
        aktif: 0,
        perhatian: 0,
        tidakAktif: 0,
        belum: 0,
        warningMonths,
        inactiveMonths,
      };

      (resellerRes.data || []).forEach((r: { id: string }) => {
        const last = terakhir.get(r.id);

        if (!last) stat.belum += 1;
        else if (last >= batasPerhatian) stat.aktif += 1;
        else if (last >= batasTidakAktif) stat.perhatian += 1;
        else stat.tidakAktif += 1;
      });

      setCrm(stat);
    }
    if (!statusRes.error) {
      const hitung: Record<string, number> = {};

      ((statusRes.data || []) as { status: string }[]).forEach((o) => {
        hitung[o.status] = (hitung[o.status] ?? 0) + 1;
      });

      setStatusCounts(hitung);
    }
    setGalat(catatan);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  // ================================
  // HITUNGAN OMZET
  // ================================
  const ringkasan = useMemo(() => {
    const now = sekarang;
    const awalBulan = new Date(now.getFullYear(), now.getMonth(), 1);
    const awalBulanLalu = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const awalHariIni = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

    let bulanIni = 0;
    let bulanLalu = 0;
    let hariIni = 0;
    let bulanIniReseller = 0;

    salesOrders.forEach((o) => {
      const tgl = new Date(o.created_at);
      const nilai = Number(o.total_amount);

      if (tgl >= awalBulan) {
        bulanIni += nilai;
        if (o.reseller_id) bulanIniReseller += nilai;
      } else if (tgl >= awalBulanLalu) {
        bulanLalu += nilai;
      }

      if (tgl >= awalHariIni) hariIni += nilai;
    });

    const perubahan =
      bulanLalu > 0 ? ((bulanIni - bulanLalu) / bulanLalu) * 100 : null;

    const porsiReseller =
      bulanIni > 0 ? (bulanIniReseller / bulanIni) * 100 : null;

    return { bulanIni, bulanLalu, hariIni, perubahan, porsiReseller };
  }, [salesOrders, sekarang]);

  // ================================
  // DATA GRAFIK
  // ================================
  const grafik = useMemo(() => {
    const awalHariIni = new Date(
      sekarang.getFullYear(),
      sekarang.getMonth(),
      sekarang.getDate()
    );

    const hari: { key: string; label: string; nilai: number }[] = [];

    for (let i = rentang - 1; i >= 0; i--) {
      const d = new Date(awalHariIni);
      d.setDate(d.getDate() - i);

      hari.push({
        key: keyHari(d),
        label: d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" }),
        nilai: 0,
      });
    }

    const peta = new Map(hari.map((h) => [h.key, h]));

    salesOrders.forEach((o) => {
      const h = peta.get(keyHari(new Date(o.created_at)));
      if (h) h.nilai += Number(o.total_amount);
    });

    const maks = Math.max(...hari.map((h) => h.nilai), 0);
    const jumlah = hari.reduce((s, h) => s + h.nilai, 0);

    return { hari, maks, jumlah };
  }, [salesOrders, rentang, sekarang]);

  // ================================
  // WAKTU
  // ================================
  const umurPesanan = (iso: string) => {
    const menit = Math.max(
      0,
      Math.floor((sekarang.getTime() - new Date(iso).getTime()) / 60000)
    );

    if (menit < 60) return `${menit} menit lalu`;
    const jam = Math.floor(menit / 60);
    return `${jam} jam ${menit % 60} menit lalu`;
  };

  const sisaWaktu = (iso: string) => {
    const batas =
      new Date(iso).getTime() + AUTO_CANCEL_HOURS * 60 * 60 * 1000;
    const menit = Math.floor((batas - sekarang.getTime()) / 60000);

    if (menit <= 0) return "segera dibatalkan otomatis";
    if (menit < 60) return `dibatalkan otomatis ${menit} menit lagi`;
    return `dibatalkan otomatis ${Math.floor(menit / 60)} jam ${menit % 60} menit lagi`;
  };

  return (
    <main className="min-h-screen bg-[#f8f5ef] text-[#2f241c]">
      <section className="mx-auto max-w-7xl px-6 py-10">
        {/* JUDUL */}

        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="font-serif text-3xl font-bold">Dashboard</h1>

            <p className="mt-2 text-sm text-[#2f241c]/60">
              Ringkasan penjualan, stok, dan reseller Lar Gurda.
            </p>
          </div>

          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="rounded-full border border-[#2f241c]/20 px-5 py-2 text-sm transition hover:bg-[#e5ded3] disabled:opacity-50"
          >
            {loading ? "Memuat..." : "Muat ulang"}
          </button>
        </div>

        {galat.length > 0 && (
          <div className="mt-6 rounded-2xl bg-red-50 px-5 py-4 text-sm text-red-600">
            <p className="font-medium">Sebagian data gagal dimuat:</p>
            <ul className="mt-2 list-disc pl-5">
              {galat.map((g, i) => (
                <li key={i}>{g}</li>
              ))}
            </ul>
          </div>
        )}

        {/* KARTU RINGKASAN */}

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-xs text-[#2f241c]/50">Menunggu konfirmasi</p>
            <p className="mt-2 text-3xl font-bold">{pendingCount}</p>
            <p className="mt-1 text-xs text-[#2f241c]/50">
              Dibatalkan otomatis setelah {AUTO_CANCEL_HOURS} jam
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-xs text-[#2f241c]/50">Omzet bulan ini</p>
            <p className="mt-2 text-2xl font-bold text-[#a27b3f]">
              {formatRupiah(ringkasan.bulanIni)}
            </p>
            <p className="mt-1 text-xs text-[#2f241c]/50">
              {ringkasan.perubahan === null
                ? "Belum ada pembanding bulan lalu"
                : `${ringkasan.perubahan >= 0 ? "Naik" : "Turun"} ${Math.abs(
                    ringkasan.perubahan
                  ).toFixed(0)}% dari bulan lalu`}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-xs text-[#2f241c]/50">Pesanan hari ini</p>
            <p className="mt-2 text-3xl font-bold">{todayCount}</p>
            <p className="mt-1 text-xs text-[#2f241c]/50">
              Terkonfirmasi: {formatRupiah(ringkasan.hariIni)}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-xs text-[#2f241c]/50">Stok perlu perhatian</p>
            <p
              className={`mt-2 text-3xl font-bold ${
                lowStockCount > 0 ? "text-amber-600" : ""
              }`}
            >
              {lowStockCount}
            </p>
            <p className="mt-1 text-xs text-[#2f241c]/50">
              Produk dengan stok {LOW_STOCK_LIMIT} atau kurang
            </p>
          </div>
        </div>

        <p className="mt-3 text-xs text-[#2f241c]/50">
          Omzet hanya menghitung pesanan berstatus Dikonfirmasi, Diproses, dan
          Selesai. Pesanan menunggu konfirmasi dan yang dibatalkan tidak
          dihitung.
        </p>

        {/* GRAFIK PENJUALAN */}

        <div className="mt-8 rounded-3xl bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-serif text-xl font-bold">Penjualan harian</h2>

              <p className="mt-1 text-sm text-[#2f241c]/60">
                {rentang} hari terakhir: {formatRupiah(grafik.jumlah)}
              </p>
            </div>

            <div className="flex gap-2">
              {([7, 30] as const).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRentang(n)}
                  className={`rounded-full px-4 py-2 text-sm transition ${
                    rentang === n
                      ? "bg-[#2f241c] text-white"
                      : "border border-[#2f241c]/20 hover:bg-[#e5ded3]"
                  }`}
                >
                  {n} hari
                </button>
              ))}
            </div>
          </div>

                   


<div className="mt-6 overflow-x-auto pb-4">
  <div
    className="flex h-80 items-end gap-2 px-2"
    style={{
      width: rentang === 30 ? "1140px" : "100%",
      minWidth: rentang === 30 ? "1140px" : "100%",
    }}
  >
    {grafik.hari.map((h) => {
      const tinggi =
        grafik.maks > 0 && h.nilai > 0
          ? Math.max(3, (h.nilai / grafik.maks) * 100)
          : 1;

      return (
        <div
          key={h.key}
          className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end"
        >
          {/* Area batang dan omzet */}
          <div className="relative flex h-52 w-full items-end justify-center">
            {/* Batang */}
            <div
              className="w-full rounded-t bg-[#a27b3f] transition-all duration-300 group-hover:bg-[#2f241c]"
              style={{
                height: `${tinggi}%`,
                opacity: h.nilai > 0 ? 1 : 0.25,
              }}
            />

            {/* Omzet di ujung batang */}
            {h.nilai > 0 && (
              <div
                className="absolute right-1/2 whitespace-nowrap text-[10px] font-semibold text-[#2f241c]"
                style={{
                  bottom: `${tinggi}%`,
                  transform: "translate(50%, -5px) rotate(-45deg)",
                  transformOrigin: "center bottom",
                }}
              >
                {new Intl.NumberFormat("id-ID", {
                  notation: "compact",
                  maximumFractionDigits: 1,
                  style: "currency",
                  currency: "IDR",
                }).format(h.nilai)}
              </div>
            )}

            {/* Tooltip */}
            <div className="pointer-events-none absolute bottom-full z-20 mb-1 hidden whitespace-nowrap rounded-lg bg-[#2f241c] px-3 py-2 text-xs text-white shadow-lg group-hover:block">
              <p className="font-semibold">{h.label}</p>
              <p>{formatRupiah(h.nilai)}</p>
            </div>
          </div>

          {/* Label tanggal miring */}
          <div className="relative h-20 w-full">
            <p
              className="absolute left-1 top-3 whitespace-nowrap text-[10px] font-medium text-[#2f241c]/60"
              style={{
                transform: "rotate(-45deg)",
                transformOrigin: "top left",
              }}
            >
              {h.label}
            </p>
          </div>
        </div>
      );
    })}
  </div>
</div>




          <div className="mt-2 flex justify-between text-xs text-[#2f241c]/50">
            <span>{grafik.hari[0].label}</span>
            <span>{grafik.hari[grafik.hari.length - 1].label}</span>
          </div>

          {grafik.maks === 0 && (
            <p className="mt-4 text-center text-sm text-[#2f241c]/50">
              Belum ada penjualan terkonfirmasi pada rentang ini. Grafik
              terisi setelah ada pesanan berstatus Dikonfirmasi, Diproses,
              atau Selesai.
            </p>
          )}
        </div>

        {/* PESANAN PER STATUS */}

        <div className="mt-8 rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="font-serif text-xl font-bold">
            Pesanan per status (30 hari)
          </h2>

          <div className="mt-5 space-y-3">
            {STATUS_GRAFIK.map((s) => {
              const jumlah = statusCounts[s.key] ?? 0;
              const maks = Math.max(
                1,
                ...STATUS_GRAFIK.map((x) => statusCounts[x.key] ?? 0)
              );

              return (
                <div key={s.key} className="flex items-center gap-3 text-sm">
                  <span className="w-40 shrink-0 text-[#2f241c]/70">
                    {s.label}
                  </span>

                  <div className="h-5 flex-1 rounded-full bg-[#f8f5ef]">
                    <div
                      className={`h-5 rounded-full ${s.warna}`}
                      style={{
                        width: `${(jumlah / maks) * 100}%`,
                        minWidth: jumlah > 0 ? "8px" : "0px",
                      }}
                    />
                  </div>

                  <span className="w-8 text-right font-semibold">{jumlah}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* PESANAN MENUNGGU + STOK */}

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-xl font-bold">
                Pesanan menunggu konfirmasi
              </h2>

              <Link
                href="/admin/orders"
                className="text-sm text-[#a27b3f] hover:underline"
              >
                Lihat semua
              </Link>
            </div>

            {pendingList.length === 0 ? (
              <p className="mt-6 text-sm text-[#2f241c]/50">
                Tidak ada pesanan yang menunggu konfirmasi.
              </p>
            ) : (
              <div className="mt-4 divide-y divide-[#2f241c]/10">
                {pendingList.map((o) => (
                  <div key={o.id} className="py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{o.customer_name}</p>

                        <a
                          href={linkWa(o.customer_phone)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-[#a27b3f] hover:underline"
                        >
                          {o.customer_phone}
                        </a>
                      </div>

                      <p className="font-semibold text-[#a27b3f]">
                        {formatRupiah(Number(o.total_amount))}
                      </p>
                    </div>

                    <p className="mt-2 text-xs text-[#2f241c]/50">
                      Kode {o.id.slice(0, 8)} · {umurPesanan(o.created_at)} ·{" "}
                      {sisaWaktu(o.created_at)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-xl font-bold">Stok perlu perhatian</h2>

              <Link
                href="/admin/produk"
                className="text-sm text-[#a27b3f] hover:underline"
              >
                Kelola stok
              </Link>
            </div>

            {lowStockList.length === 0 ? (
              <p className="mt-6 text-sm text-[#2f241c]/50">
                Semua produk memiliki stok yang cukup.
              </p>
            ) : (
              <div className="mt-4 divide-y divide-[#2f241c]/10">
                {lowStockList.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-3 py-4"
                  >
                    <div>
                      <p className="font-semibold">{p.name}</p>
                      <p className="text-xs text-[#2f241c]/50">
                        {p.category ?? "Tanpa kategori"}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        p.stock <= 0
                          ? "bg-red-100 text-red-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {p.stock <= 0 ? "Habis" : `Sisa ${p.stock}`}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {lowStockCount > lowStockList.length && (
              <p className="mt-3 text-xs text-[#2f241c]/50">
                Menampilkan {lowStockList.length} dari {lowStockCount} produk.
              </p>
            )}
          </div>
        </div>

        {/* PRODUK TERLARIS + CRM */}

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="font-serif text-xl font-bold">
              Produk terlaris (30 hari)
            </h2>

            {topProducts.length === 0 ? (
              <p className="mt-6 text-sm text-[#2f241c]/50">
                Belum ada penjualan terkonfirmasi.
              </p>
            ) : (
              <div className="mt-4 divide-y divide-[#2f241c]/10">
                {topProducts.map((p, i) => (
                  <div
                    key={p.name}
                    className="flex items-center justify-between gap-3 py-4"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e5ded3] text-sm font-semibold">
                        {i + 1}
                      </span>

                      <p className="font-semibold">{p.name}</p>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-semibold">{p.quantity} pcs</p>
                      <p className="text-xs text-[#2f241c]/50">
                        {formatRupiah(p.revenue)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-xl font-bold">Ringkasan reseller</h2>

              <Link
                href="/admin/reseller"
                className="text-sm text-[#a27b3f] hover:underline"
              >
                Kelola reseller
              </Link>
            </div>

            {!crm ? (
              <p className="mt-6 text-sm text-[#2f241c]/50">
                Data reseller belum tersedia.
              </p>
            ) : (
              <>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-green-50 p-4">
                    <p className="text-xs text-green-700">Aktif</p>
                    <p className="mt-1 text-2xl font-bold text-green-700">
                      {crm.aktif}
                    </p>
                    <p className="mt-1 text-xs text-green-700/70">
                      Membeli dalam {crm.warningMonths} bulan
                    </p>
                  </div>

                  <div className="rounded-2xl bg-amber-50 p-4">
                    <p className="text-xs text-amber-700">Perlu perhatian</p>
                    <p className="mt-1 text-2xl font-bold text-amber-700">
                      {crm.perhatian}
                    </p>
                    <p className="mt-1 text-xs text-amber-700/70">
                      {crm.warningMonths}–{crm.inactiveMonths} bulan tanpa
                      pembelian
                    </p>
                  </div>

                  <div className="rounded-2xl bg-red-50 p-4">
                    <p className="text-xs text-red-700">Tidak aktif</p>
                    <p className="mt-1 text-2xl font-bold text-red-700">
                      {crm.tidakAktif}
                    </p>
                    <p className="mt-1 text-xs text-red-700/70">
                      Lebih dari {crm.inactiveMonths} bulan tanpa pembelian
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[#f8f5ef] p-4">
                    <p className="text-xs text-[#2f241c]/60">
                      Belum ada pembelian tercatat
                    </p>
                    <p className="mt-1 text-2xl font-bold">{crm.belum}</p>
                    <p className="mt-1 text-xs text-[#2f241c]/50">
                      Pembelian sebelum sistem ini dipakai belum tercatat
                    </p>
                  </div>
                </div>

                <p className="mt-4 text-sm text-[#2f241c]/60">
                  Total {crm.total} reseller terdaftar.
                  {ringkasan.porsiReseller !== null &&
                    ` Reseller menyumbang ${ringkasan.porsiReseller.toFixed(
                      0
                    )}% omzet bulan ini.`}
                </p>
              </>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}