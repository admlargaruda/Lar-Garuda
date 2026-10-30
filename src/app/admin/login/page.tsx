"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AdminLogin() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError("Email atau password salah.");
      setLoading(false);
      return;
    }

    router.push("/admin");
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f8f5ef] px-6">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-sm">

        <div className="text-center">
          <h1 className="font-serif text-3xl font-bold">
            LAR GURDA
          </h1>

          <p className="mt-2 text-sm text-[#2f241c]/60">
            Admin Dashboard
          </p>
        </div>

        <form onSubmit={handleLogin} className="mt-8 space-y-5">

          <div>
            <label className="text-sm font-medium">
              Email
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Masukkan email admin"
              required
              className="mt-2 w-full rounded-xl border border-[#2f241c]/20 px-4 py-3 outline-none focus:border-[#a27b3f]"
            />
          </div>

          <div>
            <label className="text-sm font-medium">
              Password
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan password"
              required
              className="mt-2 w-full rounded-xl border border-[#2f241c]/20 px-4 py-3 outline-none focus:border-[#a27b3f]"
            />
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-[#2f241c] px-6 py-3 font-medium text-white transition hover:bg-[#a27b3f] disabled:opacity-50"
          >
            {loading ? "Memproses..." : "Login Admin"}
          </button>

        </form>

        <div className="mt-6 text-center">
          <a
            href="/"
            className="text-sm text-[#2f241c]/60 transition hover:text-[#a27b3f]"
          >
            ← Kembali ke website
          </a>
        </div>

      </div>
    </main>
  );
}