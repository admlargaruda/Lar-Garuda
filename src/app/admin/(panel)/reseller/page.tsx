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
    const [tierRes, resellerRes, priceRes] = await Promise.all([
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

      return cocokKelas && cocokCari;
    });
  }, [resellers, cari, filterKelas]);

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

        {/* HARGA RESELLER PER KATEGORI */}

        <div className="mt-8 rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="font-serif text-xl font-bold">
            Harga reseller per kategori
          </h2>

          <p className="mt-1 text-sm text-[#2f241c]/60">
            Isi harga per pcs dalam rupiah penuh, misalnya 145000. Kolom yang
            dikosongkan memakai harga umum produk.
          </p>

          <div className="mt-5 overflow-x-auto">
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
            className="mt-5 rounded-full bg-[#2f241c] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#a27b3f] disabled:opacity-50"
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
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px]">
                <thead>
                  <tr className="border-b border-[#2f241c]/10 bg-[#e5ded3] text-left text-sm">
                    <th className="px-6 py-4">Reseller</th>
                    <th className="px-6 py-4">WhatsApp</th>
                    <th className="px-6 py-4">Kelas</th>
                    <th className="px-6 py-4">Bergabung</th>
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

                      <td className="px-6 py-5">
                        <div className="flex justify-center gap-2">
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
          )}
        </div>

        <p className="mt-3 text-xs text-[#2f241c]/50">
          Menampilkan {tampil.length} dari {resellers.length} reseller.
        </p>
      </section>

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