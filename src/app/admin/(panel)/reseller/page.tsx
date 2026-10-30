"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { CATEGORIES } from "@/lib/categories";

type Tier = {
  id: number;
  name: string;
  discount_percent: number;
  sort_order: number;
};

type Reseller = {
  id: string;
  name: string;
  phone: string;
  tier_id: number | null;
  joined_at: string;
  notes: string | null;
  created_at: string;
};

type PriceRow = {
  category: string;
  tier_id: number;
  price: number;
};
type OrderStat = {
  id: string;
  reseller_id: string;
  created_at: string;
  total_amount: number;
  on_credit: boolean;
  paid_amount: number;
  due_date: string | null;
};

type Stat = {
  last: Date | null;
  orders12: number;
  total12: number;
  piutang: number;
  jatuhTempo: boolean;
  pcsTarget: number;
};

type StatusKeaktifan = "aktif" | "perhatian" | "tidak_aktif" | "belum";

type DetailOrder = {
  id: string;
  created_at: string;
  total_amount: number;
  status: string;
  on_credit: boolean;
  paid_amount: number;
  due_date: string | null;
};

type Followup = {
  id: string;
  note: string;
  created_at: string;
};

type FormState = {
  name: string;
  phone: string;
  tier_id: string;
  joined_at: string;
  notes: string;
};

const hariIni = () => new Date().toISOString().slice(0, 10);

const formKosong = (): FormState => ({
  name: "",
  phone: "",
  tier_id: "",
  joined_at: hariIni(),
  notes: "",
});

export default function ResellerPage() {
  const [resellers, setResellers] = useState<Reseller[]>([]);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);

  const [cari, setCari] = useState("");
  const [filterKelas, setFilterKelas] = useState("");
    const [filterStatus, setFilterStatus] = useState("");

  // Statistik pembelian, hutang, dan target dropship tiap reseller
  const [stats, setStats] = useState<Record<string, Stat>>({});
  const [batas, setBatas] = useState({
    warning: 3,
    inactive: 5,
    dropshipPcs: 12,
    dropshipMonths: 2,
  });

  // Detail reseller (riwayat, hutang, catatan tindak lanjut)
  const [detail, setDetail] = useState<Reseller | null>(null);
  const [detailOrders, setDetailOrders] = useState<DetailOrder[]>([]);
  const [followups, setFollowups] = useState<Followup[]>([]);
  const [catatanBaru, setCatatanBaru] = useState("");
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Form tambah / edit
  const [formTerbuka, setFormTerbuka] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(formKosong());
  const [formError, setFormError] = useState("");
  const [menyimpan, setMenyimpan] = useState(false);

  // Harga reseller per kategori dan kelas (kunci: "Kategori|idKelas")
  const [hargaTersimpan, setHargaTersimpan] = useState<Record<string, number>>({});
  const [hargaInput, setHargaInput] = useState<Record<string, string>>({});
  const [hargaPesan, setHargaPesan] = useState("");
  const [hargaMenyimpan, setHargaMenyimpan] = useState(false);

  // ================================
  // AMBIL DATA
  // ================================
    const loadAll = async () => {
    const enamBulanLalu = new Date();
    enamBulanLalu.setMonth(enamBulanLalu.getMonth() - 6);

    const [
      tierRes,
      resellerRes,
      priceRes,
      ordersRes,
      itemsRes,
      settingRes,
    ] = await Promise.all([

      supabase
        .from("reseller_tiers")
        .select("id, name, discount_percent, sort_order")
        .order("sort_order", { ascending: true }),
      supabase
        .from("resellers")
        .select("id, name, phone, tier_id, joined_at, notes, created_at")
        .order("name", { ascending: true }),
      supabase
        .from("category_tier_prices")
        .select("category, tier_id, price"),
        
      // Pembelian reseller (untuk status, belanja 12 bulan, dan hutang)
      supabase
        .from("orders")
        .select(
          "id, reseller_id, created_at, total_amount, on_credit, paid_amount, due_date"
        )
        .not("reseller_id", "is", null)
        .in("status", ["confirmed", "processing", "completed"])
        .order("created_at", { ascending: false })
        .limit(5000),

      // Jumlah pcs per pembelian (untuk target dropship)
      supabase
        .from("order_items")
        .select("quantity, orders!inner(reseller_id, created_at, status)")
        .not("orders.reseller_id", "is", null)
        .in("orders.status", ["confirmed", "processing", "completed"])
        .gte("orders.created_at", enamBulanLalu.toISOString())
        .limit(5000),

      supabase.from("app_settings").select("key, value"),
    ]);

    if (tierRes.error) {
      console.error("Gagal mengambil kelas:", tierRes.error);
      alert(`Gagal mengambil kelas reseller: ${tierRes.error.message}`);
    } else {
      setTiers((tierRes.data || []) as Tier[]);
    }

    if (resellerRes.error) {
      console.error("Gagal mengambil reseller:", resellerRes.error);
      alert(`Gagal mengambil reseller: ${resellerRes.error.message}`);
    } else {
      setResellers((resellerRes.data || []) as Reseller[]);
    }

    if (priceRes.error) {
      console.error("Gagal mengambil harga reseller:", priceRes.error);
      alert(`Gagal mengambil harga reseller: ${priceRes.error.message}`);
    } else {
      const tersimpan: Record<string, number> = {};
      const input: Record<string, string> = {};

      ((priceRes.data || []) as PriceRow[]).forEach((p) => {
        const kunci = `${p.category}|${p.tier_id}`;
        tersimpan[kunci] = Number(p.price);
        input[kunci] = String(Number(p.price));
      });

      setHargaTersimpan(tersimpan);
      setHargaInput(input);
    }
    // Statistik pembelian tiap reseller
    if (ordersRes.error || itemsRes.error) {
      console.error(
        "Gagal mengambil statistik reseller:",
        ordersRes.error || itemsRes.error
      );
    } else {
      const peng: Record<string, number> = {};

      (settingRes.data || []).forEach((s: { key: string; value: string }) => {
        const n = parseInt(s.value, 10);
        if (!Number.isNaN(n)) peng[s.key] = n;
      });

      const batasBaru = {
        warning: peng["reseller_warning_months"] ?? 3,
        inactive: peng["reseller_inactive_months"] ?? 5,
        dropshipPcs: peng["dropship_target_pcs"] ?? 12,
        dropshipMonths: peng["dropship_target_months"] ?? 2,
      };

      setBatas(batasBaru);

      const sekarang = new Date();
      const awalTarget = new Date(sekarang);
      awalTarget.setMonth(awalTarget.getMonth() - batasBaru.dropshipMonths);
      const awalTahun = new Date(sekarang);
      awalTahun.setFullYear(awalTahun.getFullYear() - 1);

      const peta: Record<string, Stat> = {};

      const ambil = (id: string): Stat => {
        if (!peta[id]) {
          peta[id] = {
            last: null,
            orders12: 0,
            total12: 0,
            piutang: 0,
            jatuhTempo: false,
            pcsTarget: 0,
          };
        }
        return peta[id];
      };

      ((ordersRes.data || []) as OrderStat[]).forEach((o) => {
        const s = ambil(o.reseller_id);
        const tgl = new Date(o.created_at);

        if (!s.last || tgl > s.last) s.last = tgl;

        if (tgl >= awalTahun) {
          s.orders12 += 1;
          s.total12 += Number(o.total_amount);
        }

        if (o.on_credit) {
          const sisa = Number(o.total_amount) - Number(o.paid_amount);

          if (sisa > 0) {
            s.piutang += sisa;

            if (o.due_date && new Date(`${o.due_date}T23:59:59`) < sekarang) {
              s.jatuhTempo = true;
            }
          }
        }
      });

      (
        (itemsRes.data || []) as unknown as {
          quantity: number;
          orders: { reseller_id: string; created_at: string };
        }[]
      ).forEach((it) => {
        if (new Date(it.orders.created_at) >= awalTarget) {
          ambil(it.orders.reseller_id).pcsTarget += Number(it.quantity);
        }
      });

      setStats(peta);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  // ================================
  // BANTUAN TAMPILAN
  // ================================
  const namaKelas = (tierId: number | null) =>
    tiers.find((t) => t.id === tierId)?.name ?? "Belum ada kelas";

  const formatTanggal = (tanggal: string) =>
    new Date(tanggal).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const linkWa = (phone: string) => {
    const digit = phone.replace(/\D/g, "");
    if (digit.startsWith("0")) return `https://wa.me/62${digit.slice(1)}`;
    if (digit.startsWith("8")) return `https://wa.me/62${digit}`;
    return `https://wa.me/${digit}`;
  };

  const kelasClass = (name: string) => {
    switch (name) {
      case "Gold":
        return "bg-amber-100 text-amber-700";
      case "Silver":
        return "bg-slate-200 text-slate-700";
      case "Bronze":
        return "bg-orange-100 text-orange-700";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

    // ================================
  // STATUS CRM (berdasarkan pembelian terakhir)
  // ================================
  const statusKeaktifan = (r: Reseller): StatusKeaktifan => {
    const last = stats[r.id]?.last;
    if (!last) return "belum";

    const batasPerhatian = new Date();
    batasPerhatian.setMonth(batasPerhatian.getMonth() - batas.warning);
    const batasTidakAktif = new Date();
    batasTidakAktif.setMonth(batasTidakAktif.getMonth() - batas.inactive);

    if (last >= batasPerhatian) return "aktif";
    if (last >= batasTidakAktif) return "perhatian";
    return "tidak_aktif";
  };

  const tampilanStatus: Record<
    StatusKeaktifan,
    { teks: string; kelas: string }
  > = {
    aktif: { teks: "Aktif", kelas: "bg-green-100 text-green-700" },
    perhatian: { teks: "Perlu perhatian", kelas: "bg-amber-100 text-amber-700" },
    tidak_aktif: { teks: "Tidak aktif", kelas: "bg-red-100 text-red-700" },
    belum: { teks: "Belum ada pembelian", kelas: "bg-gray-100 text-gray-600" },
  };

  const rupiah = (v: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(v);

  // Usulan: reseller Silver yang bergabung 5 tahun atau lebih layak naik ke Gold
  const layakGold = (r: Reseller) =>
    namaKelas(r.tier_id) === "Silver" &&
    (Date.now() - new Date(r.joined_at).getTime()) /
      (365.25 * 24 * 3600 * 1000) >=
      5;

  // Dropship (Bronze) yang belum mencapai target pembelian
  const bawahTarget = (r: Reseller) =>
    namaKelas(r.tier_id) === "Bronze" &&
    (stats[r.id]?.pcsTarget ?? 0) < batas.dropshipPcs;

  // Angka ringkasan CRM
  const hitung = { aktif: 0, perhatian: 0, tidak_aktif: 0, belum: 0 };
  let totalPiutang = 0;
  let jumlahHutang = 0;
  let jumlahLayakGold = 0;
  let jumlahBawahTarget = 0;

  resellers.forEach((r) => {
    hitung[statusKeaktifan(r)] += 1;

    const p = stats[r.id]?.piutang ?? 0;
    if (p > 0) {
      totalPiutang += p;
      jumlahHutang += 1;
    }

    if (layakGold(r)) jumlahLayakGold += 1;
    if (bawahTarget(r)) jumlahBawahTarget += 1;
  });

  // ================================
  // DAFTAR YANG DITAMPILKAN
  // ================================
  const tampil = useMemo(() => {
    const kata = cari.trim().toLowerCase();
    const kataDigit = kata.replace(/\D/g, "");

    return resellers.filter((r) => {
      const cocokKelas =
        !filterKelas ||
        (filterKelas === "kosong"
          ? r.tier_id === null
          : String(r.tier_id) === filterKelas);

      const cocokCari =
        !kata ||
        r.name.toLowerCase().includes(kata) ||
        (kataDigit.length > 0 &&
          r.phone.replace(/\D/g, "").includes(kataDigit));

            const cocokStatus =
        !filterStatus ||
        (filterStatus === "hutang"
          ? (stats[r.id]?.piutang ?? 0) > 0
          : filterStatus === "layak_gold"
          ? layakGold(r)
          : filterStatus === "bawah_target"
          ? bawahTarget(r)
          : statusKeaktifan(r) === filterStatus);

      return cocokKelas && cocokCari && cocokStatus;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resellers, cari, filterKelas, filterStatus, stats, batas, tiers]);

  const jumlahPerKelas = (tierId: number) =>
    resellers.filter((r) => r.tier_id === tierId).length;

  const tanpaKelas = resellers.filter((r) => r.tier_id === null).length;

  // ================================
  // FORM TAMBAH / EDIT
  // ================================
  const bukaTambah = () => {
    setEditId(null);
    setForm(formKosong());
    setFormError("");
    setFormTerbuka(true);
  };

  const bukaEdit = (r: Reseller) => {
    setEditId(r.id);
    setForm({
      name: r.name,
      phone: r.phone,
      tier_id: r.tier_id ? String(r.tier_id) : "",
      joined_at: r.joined_at,
      notes: r.notes ?? "",
    });
    setFormError("");
    setFormTerbuka(true);
  };

  const tutupForm = () => {
    if (menyimpan) return;
    setFormTerbuka(false);
  };

  const simpan = async (e: FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!form.name.trim()) {
      setFormError("Nama reseller wajib diisi.");
      return;
    }

    const digit = form.phone.replace(/\D/g, "");
    if (digit.length < 9 || digit.length > 15) {
      setFormError("Nomor WhatsApp tidak valid. Contoh: 081234567890.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      tier_id: form.tier_id ? Number(form.tier_id) : null,
      joined_at: form.joined_at || hariIni(),
      notes: form.notes.trim() || null,
    };

    setMenyimpan(true);

    const { error } = editId
      ? await supabase.from("resellers").update(payload).eq("id", editId)
      : await supabase.from("resellers").insert([payload]);

    setMenyimpan(false);

    if (error) {
      console.error("Gagal menyimpan reseller:", error);

      if (error.code === "23505") {
        setFormError(
          "Nomor WhatsApp ini sudah terdaftar sebagai reseller lain."
        );
      } else {
        setFormError(`Gagal menyimpan: ${error.message}`);
      }
      return;
    }

    setFormTerbuka(false);
    await loadAll();
  };

  // ================================
  // GANTI KELAS LANGSUNG DI TABEL
  // ================================
  const gantiKelas = async (resellerId: string, nilai: string) => {
    const tierId = nilai ? Number(nilai) : null;

    const { error } = await supabase
      .from("resellers")
      .update({ tier_id: tierId })
      .eq("id", resellerId);

    if (error) {
      console.error("Gagal mengganti kelas:", error);
      alert(`Gagal mengganti kelas: ${error.message}`);
      return;
    }

    setResellers((sekarang) =>
      sekarang.map((r) =>
        r.id === resellerId ? { ...r, tier_id: tierId } : r
      )
    );
  };

  // ================================
  // HAPUS RESELLER
  // ================================
  const hapus = async (r: Reseller) => {
    const yakin = window.confirm(
      `Hapus reseller "${r.name}"?\n\nCatatan tindak lanjutnya ikut terhapus. Pesanan lama tetap tersimpan.`
    );
    if (!yakin) return;

    const { error } = await supabase
      .from("resellers")
      .delete()
      .eq("id", r.id);

    if (error) {
      console.error("Gagal menghapus reseller:", error);
      alert(`Gagal menghapus reseller: ${error.message}`);
      return;
    }

    setResellers((sekarang) => sekarang.filter((x) => x.id !== r.id));
  };

  // ================================
  // SIMPAN HARGA RESELLER
  // ================================
  const simpanHarga = async () => {
    setHargaPesan("");

    const upserts: PriceRow[] = [];
    const hapusKunci: string[] = [];

    for (const kategori of CATEGORIES) {
      for (const t of tiers) {
        const kunci = `${kategori}|${t.id}`;
        const teks = (hargaInput[kunci] ?? "").trim();

        if (teks === "") {
          if (kunci in hargaTersimpan) hapusKunci.push(kunci);
          continue;
        }

        const nilai = Number(teks);
        if (Number.isNaN(nilai) || nilai < 0) {
          setHargaPesan(
            `Harga ${kategori} kelas ${t.name} harus berupa angka 0 atau lebih.`
          );
          return;
        }

        upserts.push({ category: kategori, tier_id: t.id, price: nilai });
      }
    }

    setHargaMenyimpan(true);

    if (upserts.length > 0) {
      const { error } = await supabase
        .from("category_tier_prices")
        .upsert(upserts, { onConflict: "category,tier_id" });

      if (error) {
        console.error("Gagal menyimpan harga:", error);
        setHargaPesan(`Gagal menyimpan harga: ${error.message}`);
        setHargaMenyimpan(false);
        return;
      }
    }

    for (const kunci of hapusKunci) {
      const [kategori, tierId] = kunci.split("|");

      const { error } = await supabase
        .from("category_tier_prices")
        .delete()
        .eq("category", kategori)
        .eq("tier_id", Number(tierId));

      if (error) {
        console.error("Gagal menghapus harga:", error);
        setHargaPesan(`Gagal menghapus harga ${kategori}: ${error.message}`);
        setHargaMenyimpan(false);
        return;
      }
    }

    const tersimpanBaru: Record<string, number> = {};
    upserts.forEach((p) => {
      tersimpanBaru[`${p.category}|${p.tier_id}`] = p.price;
    });

    setHargaTersimpan(tersimpanBaru);
    setHargaMenyimpan(false);
    setHargaPesan(
      `Harga tersimpan (${upserts.length} harga terisi, ${
        CATEGORIES.length * tiers.length - upserts.length
      } memakai harga umum).`
    );
  };

  // ================================
  // DETAIL RESELLER: RIWAYAT, HUTANG, CATATAN
  // ================================
  const muatDetail = async (r: Reseller) => {
    setLoadingDetail(true);

    const [o, f] = await Promise.all([
      supabase
        .from("orders")
        .select(
          "id, created_at, total_amount, status, on_credit, paid_amount, due_date"
        )
        .eq("reseller_id", r.id)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("reseller_followups")
        .select("id, note, created_at")
        .eq("reseller_id", r.id)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    if (o.error || f.error) {
      console.error("Gagal memuat detail:", o.error || f.error);
      alert(`Gagal memuat detail: ${(o.error || f.error)?.message}`);
    }

    setDetailOrders((o.data || []) as DetailOrder[]);
    setFollowups((f.data || []) as Followup[]);
    setLoadingDetail(false);
  };

  const bukaDetail = (r: Reseller) => {
    setDetail(r);
    setCatatanBaru("");
    setDetailOrders([]);
    setFollowups([]);
    muatDetail(r);
  };

  const simpanHutang = async (
    o: DetailOrder,
    onCredit: boolean,
    paid: string,
    due: string
  ) => {
    const terbayar = Number(paid || 0);

    if (Number.isNaN(terbayar) || terbayar < 0) {
      alert("Jumlah terbayar tidak valid.");
      return;
    }

    const { error } = await supabase
      .from("orders")
      .update({
        on_credit: onCredit,
        paid_amount: terbayar,
        due_date: due || null,
      })
      .eq("id", o.id);

    if (error) {
      console.error("Gagal menyimpan hutang:", error);
      alert(`Gagal menyimpan: ${error.message}`);
      return;
    }

    if (detail) await muatDetail(detail);
    await loadAll();
  };

  const tambahCatatan = async (teks?: string) => {
    const isi = (teks ?? catatanBaru).trim();
    if (!detail || !isi) return;

    const { error } = await supabase
      .from("reseller_followups")
      .insert([{ reseller_id: detail.id, note: isi }]);

    if (error) {
      console.error("Gagal menyimpan catatan:", error);
      alert(`Gagal menyimpan catatan: ${error.message}`);
      return;
    }

    setCatatanBaru("");
    await muatDetail(detail);
  };

  return (
    <main className="min-h-screen bg-[#f8f5ef] text-[#2f241c]">
      <section className="mx-auto max-w-7xl px-6 py-10">
        {/* JUDUL */}

        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="font-serif text-3xl font-bold">
              Reseller (CRM)
            </h1>

            <p className="mt-2 text-sm text-[#2f241c]/60">
              Kelola data reseller dan kelasnya. Reseller dikenali dari
              nomor WhatsApp saat checkout.
            </p>
          </div>

          <button
            type="button"
            onClick={bukaTambah}
            className="rounded-full bg-[#2f241c] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#a27b3f]"
          >
            + Tambah Reseller
          </button>
        </div>

        {/* RINGKASAN */}

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-xs text-[#2f241c]/50">Total reseller</p>
            <p className="mt-2 text-3xl font-bold">{resellers.length}</p>
          </div>

          {tiers.map((t) => (
            <div key={t.id} className="rounded-2xl bg-white p-5 shadow-sm">
              <p className="text-xs text-[#2f241c]/50">Kelas {t.name}</p>
              <p className="mt-2 text-3xl font-bold">
                {jumlahPerKelas(t.id)}
              </p>
            </div>
          ))}

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-xs text-[#2f241c]/50">Belum ada kelas</p>
            <p className="mt-2 text-3xl font-bold">{tanpaKelas}</p>
          </div>
        </div>

                {/* STATUS CRM */}

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { judul: "Reseller aktif", nilai: String(hitung.aktif), ket: `Membeli dalam ${batas.warning} bulan`, bg: "bg-green-50", teks: "text-green-700" },
            { judul: "Perlu perhatian", nilai: String(hitung.perhatian), ket: `${batas.warning}–${batas.inactive} bulan tanpa pembelian`, bg: "bg-amber-50", teks: "text-amber-700" },
            { judul: "Tidak aktif", nilai: String(hitung.tidak_aktif), ket: `Lebih dari ${batas.inactive} bulan tanpa pembelian`, bg: "bg-red-50", teks: "text-red-700" },
            { judul: "Belum ada pembelian tercatat", nilai: String(hitung.belum), ket: "Riwayat sebelum sistem ini belum tercatat", bg: "bg-white", teks: "text-[#2f241c]" },
            { judul: "Total piutang", nilai: rupiah(totalPiutang), ket: `${jumlahHutang} reseller berhutang`, bg: "bg-white", teks: "text-red-600" },
            { judul: "Layak naik ke Gold", nilai: String(jumlahLayakGold), ket: "Silver, bergabung 5 tahun atau lebih", bg: "bg-white", teks: "text-[#a27b3f]" },
            { judul: "Dropship di bawah target", nilai: String(jumlahBawahTarget), ket: `Target ${batas.dropshipPcs} pcs per ${batas.dropshipMonths} bulan`, bg: "bg-white", teks: "text-amber-700" },
          ].map((k) => (
            <div key={k.judul} className={`rounded-2xl p-5 shadow-sm ${k.bg}`}>
              <p className={`text-xs ${k.teks}`}>{k.judul}</p>
              <p className={`mt-2 text-2xl font-bold ${k.teks}`}>{k.nilai}</p>
              <p className={`mt-1 text-xs ${k.teks} opacity-70`}>{k.ket}</p>
            </div>
          ))}
        </div>

        {/* HARGA RESELLER PER KATEGORI */}
<div className="mt-8 rounded-3xl bg-white p-4 shadow-sm sm:p-6">
  <h2 className="font-serif text-xl font-bold">
    Harga reseller per kategori
  </h2>

  <p className="mt-1 text-sm text-[#2f241c]/60">
    Isi harga per pcs dalam rupiah penuh, misalnya 145000. Kolom yang
    dikosongkan memakai harga umum produk.
  </p>

  {/* TAMPILAN MOBILE */}
<div className="mt-5 space-y-3 sm:hidden">
  {CATEGORIES.map((kategori) => (
    <details
      key={kategori}
      className="group overflow-hidden rounded-2xl border border-[#2f241c]/10 bg-white"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 bg-[#e5ded3]/50 px-4 py-4">
        <span className="text-sm font-bold text-[#2f241c]">
          {kategori}
        </span>

        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-[#2f241c] transition-transform group-open:rotate-180">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m19 9-7 7-7-7"
            />
          </svg>
        </span>
      </summary>

      <div className="space-y-3 border-t border-[#2f241c]/10 p-4">
        {tiers.map((t) => {
          const kunci = `${kategori}|${t.id}`;

          return (
            <div key={t.id}>
              <label className="mb-1 block text-xs font-medium text-[#2f241c]/70">
                {t.name}
              </label>

              <input
                type="number"
                min="0"
                step="any"
                inputMode="numeric"
                value={hargaInput[kunci] ?? ""}
                onChange={(e) =>
                  setHargaInput((sekarang) => ({
                    ...sekarang,
                    [kunci]: e.target.value,
                  }))
                }
                placeholder="Harga umum"
                className="w-full rounded-xl border border-[#2f241c]/20 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#a27b3f]"
              />
            </div>
          );
        })}
      </div>
    </details>
  ))}
</div>

  {/* TAMPILAN DESKTOP */}
  <div className="mt-5 hidden overflow-x-auto sm:block">
    <table className="w-full min-w-[520px]">
      <thead>
        <tr className="border-b border-[#2f241c]/10 bg-[#e5ded3] text-left text-sm">
          <th className="px-4 py-3">Kategori</th>
          {tiers.map((t) => (
            <th key={t.id} className="px-4 py-3">
              {t.name}
            </th>
          ))}
        </tr>
      </thead>

      <tbody>
        {CATEGORIES.map((kategori) => (
          <tr
            key={kategori}
            className="border-b border-[#2f241c]/10 last:border-b-0"
          >
            <td className="px-4 py-3 text-sm font-medium">
              {kategori}
            </td>

            {tiers.map((t) => {
              const kunci = `${kategori}|${t.id}`;

              return (
                <td key={t.id} className="px-4 py-2">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    inputMode="numeric"
                    value={hargaInput[kunci] ?? ""}
                    onChange={(e) =>
                      setHargaInput((sekarang) => ({
                        ...sekarang,
                        [kunci]: e.target.value,
                      }))
                    }
                    placeholder="Harga umum"
                    className="w-full min-w-[110px] rounded-xl border border-[#2f241c]/20 bg-white px-3 py-2 text-sm outline-none focus:border-[#a27b3f]"
                  />
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  </div>

  <button
    type="button"
    onClick={simpanHarga}
    disabled={hargaMenyimpan || tiers.length === 0}
    className="mt-5 w-full rounded-full bg-[#2f241c] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#a27b3f] disabled:opacity-50 sm:w-auto"
  >
    {hargaMenyimpan ? "Menyimpan..." : "Simpan harga"}
  </button>

  {hargaPesan && (
    <p className="mt-4 text-sm text-[#a27b3f]">{hargaPesan}</p>
  )}
</div>

        {/* PENCARIAN */}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            placeholder="Cari nama atau nomor WhatsApp"
            className="w-full rounded-xl border border-[#2f241c]/20 bg-white px-4 py-3 text-sm outline-none focus:border-[#a27b3f] sm:max-w-sm"
          />

          <select
            value={filterKelas}
            onChange={(e) => setFilterKelas(e.target.value)}
            className="rounded-xl border border-[#2f241c]/20 bg-white px-4 py-3 text-sm outline-none focus:border-[#a27b3f]"
          >
            <option value="">Semua kelas</option>
            {tiers.map((t) => (
              <option key={t.id} value={String(t.id)}>
                {t.name}
              </option>
            ))}
            <option value="kosong">Belum ada kelas</option>
          </select>
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-xl border border-[#2f241c]/20 bg-white px-4 py-3 text-sm outline-none focus:border-[#a27b3f]"
          >
            <option value="">Semua status</option>
            <option value="aktif">Aktif</option>
            <option value="perhatian">Perlu perhatian</option>
            <option value="tidak_aktif">Tidak aktif</option>
            <option value="belum">Belum ada pembelian</option>
            <option value="hutang">Berhutang</option>
            <option value="layak_gold">Layak naik ke Gold</option>
            <option value="bawah_target">Dropship di bawah target</option>
          </select>
        </div>

        {/* TABEL RESELLER */}

        
<div className="mt-4 overflow-hidden rounded-3xl bg-white shadow-sm">
  {loading ? (
    <div className="p-8 text-center text-sm text-[#2f241c]/60">
      Memuat data reseller...
    </div>
  ) : resellers.length === 0 ? (
    <div className="p-10 text-center">
      <h2 className="font-serif text-2xl font-bold">
        Belum ada reseller
      </h2>
      <p className="mt-2 text-sm text-[#2f241c]/60">
        Tambahkan reseller pertama dengan tombol di kanan atas.
      </p>
    </div>
  ) : tampil.length === 0 ? (
    <div className="p-8 text-center text-sm text-[#2f241c]/60">
      Tidak ada reseller yang cocok dengan pencarian.
    </div>
  ) : (
    <>
      {/* ====================================== */}
      {/* TAMPILAN MOBILE */}
      {/* ====================================== */}

      <div className="space-y-3 p-3 sm:hidden">
        {tampil.map((r) => (
          <details
            key={r.id}
            className="group overflow-hidden rounded-2xl border border-[#2f241c]/10"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 bg-[#e5ded3]/40 p-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-[#2f241c]">
                  {r.name}
                </p>
                <p className="mt-1 text-xs text-[#2f241c]/50">
                  {namaKelas(r.tier_id) || "Belum ada kelas"}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <span
                  className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                    tampilanStatus[statusKeaktifan(r)].kelas
                  }`}
                >
                  {tampilanStatus[statusKeaktifan(r)].teks}
                </span>

                <span className="text-xs transition-transform group-open:rotate-180">
                  ▼
                </span>
              </div>
            </summary>

            <div className="space-y-4 border-t border-[#2f241c]/10 p-4">
              {/* WhatsApp */}
              <div>
                <p className="text-xs text-[#2f241c]/50">
                  WhatsApp
                </p>
                <a
                  href={linkWa(r.phone)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[#a27b3f] hover:underline"
                >
                  {r.phone}
                </a>
              </div>

              {/* Kelas reseller */}
              <div>
                <p className="mb-1 text-xs text-[#2f241c]/50">
                  Kelas reseller
                </p>
                <select
                  value={r.tier_id ?? ""}
                  onChange={(e) => gantiKelas(r.id, e.target.value)}
                  className={`w-full rounded-xl border-0 px-3 py-2 text-xs font-semibold outline-none ${kelasClass(
                    namaKelas(r.tier_id)
                  )}`}
                >
                  <option value="">Belum ada kelas</option>
                  {tiers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tanggal bergabung dan pembelian terakhir */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-[#2f241c]/50">
                    Bergabung
                  </p>
                  <p className="mt-1 text-sm font-medium">
                    {formatTanggal(r.joined_at)}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-[#2f241c]/50">
                    Pembelian terakhir
                  </p>
                  <p className="mt-1 text-sm font-medium">
                    {stats[r.id]?.last
                      ? formatTanggal(stats[r.id].last!.toISOString())
                      : "–"}
                  </p>
                </div>
              </div>

              {/* Belanja 12 bulan */}
              <div className="rounded-xl bg-[#e5ded3]/40 p-3">
                <p className="text-xs text-[#2f241c]/50">
                  Belanja 12 bulan
                </p>

                {stats[r.id] ? (
                  <>
                    <p className="mt-1 text-sm font-bold">
                      {rupiah(stats[r.id].total12)}
                    </p>
                    <p className="text-xs text-[#2f241c]/50">
                      {stats[r.id].orders12} pesanan
                    </p>
                  </>
                ) : (
                  <p className="mt-1 text-sm">–</p>
                )}
              </div>

              {/* Status dan target */}
              {layakGold(r) && (
                <p className="text-xs text-[#a27b3f]">
                  Layak naik ke Gold
                </p>
              )}

              {namaKelas(r.tier_id) === "Bronze" && (
                <p
                  className={`text-xs ${
                    bawahTarget(r)
                      ? "text-amber-700"
                      : "text-green-700"
                  }`}
                >
                  Target: {stats[r.id]?.pcsTarget ?? 0}/
                  {batas.dropshipPcs} pcs
                </p>
              )}

              {/* Hutang */}
              <div>
                <p className="text-xs text-[#2f241c]/50">
                  Hutang
                </p>

                {(stats[r.id]?.piutang ?? 0) > 0 ? (
                  <>
                    <p className="mt-1 text-sm font-bold text-red-600">
                      {rupiah(stats[r.id].piutang)}
                    </p>

                    {stats[r.id].jatuhTempo && (
                      <p className="text-xs text-red-600">
                        Lewat jatuh tempo
                      </p>
                    )}
                  </>
                ) : (
                  <p className="mt-1 text-sm text-[#2f241c]/40">
                    Tidak ada hutang
                  </p>
                )}
              </div>

              {/* Tombol aksi */}
              <div className="grid grid-cols-3 gap-2 border-t border-[#2f241c]/10 pt-3">
                <button
                  type="button"
                  onClick={() => bukaDetail(r)}
                  className="rounded-full bg-[#2f241c] px-2 py-2 text-xs font-medium text-white transition hover:bg-[#a27b3f]"
                >
                  Detail
                </button>

                <button
                  type="button"
                  onClick={() => bukaEdit(r)}
                  className="rounded-full border border-[#2f241c]/20 px-2 py-2 text-xs font-medium transition hover:bg-[#e5ded3]"
                >
                  Edit
                </button>

                <button
                  type="button"
                  onClick={() => hapus(r)}
                  className="rounded-full border border-red-200 px-2 py-2 text-xs font-medium text-red-600 transition hover:bg-red-50"
                >
                  Hapus
                </button>
              </div>
            </div>
          </details>
        ))}
      </div>

      {/* ====================================== */}
      {/* TAMPILAN DESKTOP */}
      {/* ====================================== */}

      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[1150px]">
          <thead>
            <tr className="border-b border-[#2f241c]/10 bg-[#e5ded3] text-left text-sm">
              <th className="px-6 py-4">Reseller</th>
              <th className="px-6 py-4">WhatsApp</th>
              <th className="px-6 py-4">Kelas</th>
              <th className="px-6 py-4">Bergabung</th>
              <th className="px-6 py-4">Pembelian terakhir</th>
              <th className="px-6 py-4">Belanja 12 bulan</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Hutang</th>
              <th className="px-6 py-4 text-center">Aksi</th>
            </tr>
          </thead>

          <tbody>
            {tampil.map((r) => (
              <tr
                key={r.id}
                className="border-b border-[#2f241c]/10 last:border-b-0"
              >
                <td className="px-6 py-5">
                  <p className="font-semibold">{r.name}</p>
                  {r.notes && (
                    <p className="mt-1 max-w-xs truncate text-xs text-[#2f241c]/50">
                      {r.notes}
                    </p>
                  )}
                </td>

                <td className="px-6 py-5">
                  <a
                    href={linkWa(r.phone)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[#a27b3f] hover:underline"
                  >
                    {r.phone}
                  </a>
                </td>

                <td className="px-6 py-5">
                  <select
                    value={r.tier_id ?? ""}
                    onChange={(e) => gantiKelas(r.id, e.target.value)}
                    className={`rounded-full border-0 px-3 py-2 text-xs font-semibold outline-none ${kelasClass(
                      namaKelas(r.tier_id)
                    )}`}
                  >
                    <option value="">Belum ada kelas</option>
                    {tiers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </td>

                <td className="px-6 py-5 text-sm text-[#2f241c]/60">
                  {formatTanggal(r.joined_at)}
                </td>

                <td className="px-6 py-5 text-sm text-[#2f241c]/60">
                  {stats[r.id]?.last
                    ? formatTanggal(stats[r.id].last!.toISOString())
                    : "–"}
                </td>

                <td className="px-6 py-5 text-sm">
                  {stats[r.id] ? (
                    <>
                      <p className="font-medium">
                        {rupiah(stats[r.id].total12)}
                      </p>
                      <p className="text-xs text-[#2f241c]/50">
                        {stats[r.id].orders12} pesanan
                      </p>
                    </>
                  ) : (
                    "–"
                  )}
                </td>

                <td className="px-6 py-5">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      tampilanStatus[statusKeaktifan(r)].kelas
                    }`}
                  >
                    {tampilanStatus[statusKeaktifan(r)].teks}
                  </span>

                  {layakGold(r) && (
                    <p className="mt-1 text-xs text-[#a27b3f]">
                      Layak naik ke Gold
                    </p>
                  )}

                  {namaKelas(r.tier_id) === "Bronze" && (
                    <p
                      className={`mt-1 text-xs ${
                        bawahTarget(r)
                          ? "text-amber-700"
                          : "text-green-700"
                      }`}
                    >
                      Target: {stats[r.id]?.pcsTarget ?? 0}/
                      {batas.dropshipPcs} pcs
                    </p>
                  )}
                </td>

                <td className="px-6 py-5 text-sm">
                  {(stats[r.id]?.piutang ?? 0) > 0 ? (
                    <>
                      <p className="font-semibold text-red-600">
                        {rupiah(stats[r.id].piutang)}
                      </p>

                      {stats[r.id].jatuhTempo && (
                        <p className="text-xs text-red-600">
                          Lewat jatuh tempo
                        </p>
                      )}
                    </>
                  ) : (
                    <span className="text-[#2f241c]/40">–</span>
                  )}
                </td>

                <td className="px-6 py-5">
                  <div className="flex justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => bukaDetail(r)}
                      className="rounded-full bg-[#2f241c] px-4 py-2 text-sm text-white transition hover:bg-[#a27b3f]"
                    >
                      Detail
                    </button>

                    <button
                      type="button"
                      onClick={() => bukaEdit(r)}
                      className="rounded-full border border-[#2f241c]/20 px-4 py-2 text-sm transition hover:bg-[#e5ded3]"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => hapus(r)}
                      className="rounded-full border border-red-200 px-4 py-2 text-sm text-red-600 transition hover:bg-red-50"
                    >
                      Hapus
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )}
</div>

<p className="mt-3 text-xs text-[#2f241c]/50">
  Menampilkan {tampil.length} dari {resellers.length} reseller.
</p>

      </section>

            {/* DETAIL RESELLER */}

      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6 py-8 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-[#f8f5ef] p-7 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-serif text-2xl font-bold">{detail.name}</h2>

                <a
                  href={linkWa(detail.phone)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[#a27b3f] hover:underline"
                >
                  {detail.phone}
                </a>

                <p className="mt-1 text-xs text-[#2f241c]/60">
                  Kelas {namaKelas(detail.tier_id)} · bergabung{" "}
                  {formatTanggal(detail.joined_at)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setDetail(null)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#2f241c]/20 text-lg transition hover:bg-[#e5ded3]"
              >
                ×
              </button>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-2xl bg-white p-3">
                <p className="text-xs text-[#2f241c]/50">Status</p>
                <p className="mt-1 text-sm font-semibold">
                  {tampilanStatus[statusKeaktifan(detail)].teks}
                </p>
              </div>

              <div className="rounded-2xl bg-white p-3">
                <p className="text-xs text-[#2f241c]/50">Belanja 12 bulan</p>
                <p className="mt-1 text-sm font-semibold">
                  {rupiah(stats[detail.id]?.total12 ?? 0)}
                </p>
              </div>

              <div className="rounded-2xl bg-white p-3">
                <p className="text-xs text-[#2f241c]/50">Piutang</p>
                <p className="mt-1 text-sm font-semibold text-red-600">
                  {rupiah(stats[detail.id]?.piutang ?? 0)}
                </p>
              </div>
            </div>

            <h3 className="mt-6 font-serif text-lg font-bold">
              Riwayat pesanan dan hutang
            </h3>

            {loadingDetail ? (
              <p className="mt-3 text-sm text-[#2f241c]/60">Memuat...</p>
            ) : detailOrders.length === 0 ? (
              <p className="mt-3 text-sm text-[#2f241c]/60">
                Belum ada pesanan dari reseller ini.
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                {detailOrders.map((o) => (
                  <BarisHutang
                    key={`${o.id}-${o.on_credit}-${o.paid_amount}-${o.due_date}`}
                    order={o}
                    onSimpan={simpanHutang}
                  />
                ))}
              </div>
            )}

            <h3 className="mt-6 font-serif text-lg font-bold">
              Catatan tindak lanjut
            </h3>

            <textarea
              value={catatanBaru}
              onChange={(e) => setCatatanBaru(e.target.value)}
              rows={3}
              placeholder="Contoh: sudah dihubungi, akan order minggu depan"
              className="mt-3 w-full resize-none rounded-xl border border-[#2f241c]/20 bg-white px-4 py-3 text-sm outline-none focus:border-[#a27b3f]"
            />

            <div className="mt-3 flex gap-3">
              <button
                type="button"
                onClick={() => tambahCatatan()}
                className="rounded-full bg-[#2f241c] px-5 py-2 text-sm text-white transition hover:bg-[#a27b3f]"
              >
                Simpan catatan
              </button>

              <button
                type="button"
                onClick={() => tambahCatatan("Sudah dihubungi via WhatsApp")}
                className="rounded-full border border-[#2f241c]/20 px-5 py-2 text-sm transition hover:bg-[#e5ded3]"
              >
                Tandai sudah dihubungi
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {followups.map((f) => (
                <div key={f.id} className="rounded-xl bg-white px-4 py-3 text-sm">
                  <p>{f.note}</p>
                  <p className="mt-1 text-xs text-[#2f241c]/50">
                    {formatTanggal(f.created_at)}
                  </p>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setDetail(null)}
              className="mt-6 w-full rounded-full border border-[#2f241c]/20 px-5 py-3 text-sm font-medium transition hover:bg-[#e5ded3]"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* FORM TAMBAH / EDIT */}

      {formTerbuka && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6 py-8 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-[#f8f5ef] p-7 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <h2 className="font-serif text-2xl font-bold">
                {editId ? "Edit Reseller" : "Tambah Reseller"}
              </h2>

              <button
                type="button"
                onClick={tutupForm}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#2f241c]/20 text-lg transition hover:bg-[#e5ded3]"
              >
                ×
              </button>
            </div>

            <form onSubmit={simpan} className="mt-6 space-y-5">
              <div>
                <label className="text-sm font-medium">Nama reseller</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Contoh: Toko Berkah"
                  required
                  className="mt-2 w-full rounded-xl border border-[#2f241c]/20 bg-white px-4 py-3 text-sm outline-none focus:border-[#a27b3f]"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Nomor WhatsApp</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="Contoh: 081234567890"
                  required
                  className="mt-2 w-full rounded-xl border border-[#2f241c]/20 bg-white px-4 py-3 text-sm outline-none focus:border-[#a27b3f]"
                />
                <p className="mt-2 text-xs text-[#2f241c]/50">
                  Format 0812..., +62812..., atau 62812... dianggap sama.
                </p>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Kelas</label>
                  <select
                    value={form.tier_id}
                    onChange={(e) =>
                      setForm({ ...form, tier_id: e.target.value })
                    }
                    className="mt-2 w-full rounded-xl border border-[#2f241c]/20 bg-white px-4 py-3 text-sm outline-none focus:border-[#a27b3f]"
                  >
                    <option value="">Belum ada kelas</option>
                    {tiers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium">
                    Tanggal bergabung
                  </label>
                  <input
                    type="date"
                    value={form.joined_at}
                    onChange={(e) =>
                      setForm({ ...form, joined_at: e.target.value })
                    }
                    className="mt-2 w-full rounded-xl border border-[#2f241c]/20 bg-white px-4 py-3 text-sm outline-none focus:border-[#a27b3f]"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Catatan</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={3}
                  placeholder="Opsional"
                  className="mt-2 w-full resize-none rounded-xl border border-[#2f241c]/20 bg-white px-4 py-3 text-sm outline-none focus:border-[#a27b3f]"
                />
              </div>

              {formError && (
                <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                  {formError}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={tutupForm}
                  className="w-full rounded-full border border-[#2f241c]/20 px-5 py-3 text-sm font-medium transition hover:bg-[#e5ded3]"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={menyimpan}
                  className="w-full rounded-full bg-[#2f241c] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#a27b3f] disabled:opacity-50"
                >
                  {menyimpan ? "Menyimpan..." : "Simpan reseller"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}


// Satu baris pesanan di jendela detail: tandai hutang, catat pembayaran, jatuh tempo
function BarisHutang({
  order,
  onSimpan,
}: {
  order: DetailOrder;
  onSimpan: (
    o: DetailOrder,
    onCredit: boolean,
    paid: string,
    due: string
  ) => void;
}) {
  const [onCredit, setOnCredit] = useState(order.on_credit);
  const [paid, setPaid] = useState(String(order.paid_amount));
  const [due, setDue] = useState(order.due_date ?? "");

  const rp = (v: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(v);

  const sisa = Number(order.total_amount) - Number(order.paid_amount);
  const dihitung = ["confirmed", "processing", "completed"].includes(
    order.status
  );

  return (
    <div className="rounded-2xl bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">
            {new Date(order.created_at).toLocaleDateString("id-ID", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}{" "}
            · {order.id.slice(0, 8)}
          </p>

          <p className="text-xs text-[#2f241c]/50">Status: {order.status}</p>
        </div>

        <p className="font-semibold text-[#a27b3f]">
          {rp(Number(order.total_amount))}
        </p>
      </div>

      {dihitung ? (
        <div className="mt-3 flex flex-wrap items-end gap-3 text-xs">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={onCredit}
              onChange={(e) => setOnCredit(e.target.checked)}
            />
            Hutang
          </label>

          {onCredit && (
            <>
              <label>
                Terbayar (Rp)
                <input
                  type="number"
                  min="0"
                  value={paid}
                  onChange={(e) => setPaid(e.target.value)}
                  className="mt-1 block w-32 rounded-lg border border-[#2f241c]/20 px-2 py-1"
                />
              </label>

              <label>
                Jatuh tempo
                <input
                  type="date"
                  value={due}
                  onChange={(e) => setDue(e.target.value)}
                  className="mt-1 block rounded-lg border border-[#2f241c]/20 px-2 py-1"
                />
              </label>
            </>
          )}

          <button
            type="button"
            onClick={() => onSimpan(order, onCredit, paid, due)}
            className="rounded-full bg-[#2f241c] px-4 py-2 text-white transition hover:bg-[#a27b3f]"
          >
            Simpan
          </button>

          {order.on_credit && sisa > 0 && (
            <span className="text-red-600">Sisa {rp(sisa)}</span>
          )}

          {order.on_credit && sisa <= 0 && (
            <span className="text-green-700">Lunas</span>
          )}
        </div>
      ) : (
        <p className="mt-2 text-xs text-[#2f241c]/50">
          Pesanan ini belum atau tidak dihitung sebagai pembelian.
        </p>
      )}
    </div>
  );
}