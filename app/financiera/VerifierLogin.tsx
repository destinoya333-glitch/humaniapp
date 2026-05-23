"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function VerifierLogin() {
  const router = useRouter();
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/ecodrive/financiera/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user, pass }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Error de autenticación");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0A0908] p-6 text-[#F5EFE7]">
      <div className="w-full max-w-md">
        <header className="text-center mb-10">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="h-16 w-16 bg-[url('/ecodriveplus/icon.png')] bg-contain bg-no-repeat bg-center" role="img" aria-label="EcoDrive+" />
            <div className="text-left leading-none">
              <div className="text-3xl font-bold">
                EcoDrive<span className="text-[#E08821]">+</span>
              </div>
              <div className="mt-1.5 text-[10px] uppercase tracking-[0.22em] text-[#7A7367]">
                Portal Verificador
              </div>
            </div>
          </div>
          <p className="text-sm text-[#C8C0B5] max-w-xs mx-auto leading-relaxed">
            Acceso exclusivo para entidades financieras aliadas. Verificación de conductores afiliados y constancias de ingresos.
          </p>
        </header>

        <form onSubmit={submit} className="bg-[#131110] border border-white/10 rounded-2xl p-6 md:p-8 space-y-4 shadow-xl">
          <label className="block">
            <span className="text-xs uppercase tracking-widest text-[#7A7367]">Usuario</span>
            <input
              type="text"
              required
              value={user}
              onChange={(e) => setUser(e.target.value)}
              placeholder="Su usuario asignado"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              data-1p-ignore
              data-lpignore="true"
              className="mt-1.5 w-full rounded-lg bg-[#0A0908] border border-white/10 px-3 py-2.5 text-[#F5EFE7] outline-none focus:border-[#E08821] transition"
            />
          </label>

          <label className="block">
            <span className="text-xs uppercase tracking-widest text-[#7A7367]">Contraseña</span>
            <input
              type="password"
              required
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              autoComplete="new-password"
              data-1p-ignore
              data-lpignore="true"
              className="mt-1.5 w-full rounded-lg bg-[#0A0908] border border-white/10 px-3 py-2.5 text-[#F5EFE7] outline-none focus:border-[#E08821] transition"
            />
          </label>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={busy || !user || !pass}
            className="w-full rounded-lg bg-[#E08821] hover:bg-[#F3A852] disabled:opacity-50 text-[#0A0908] font-semibold py-2.5 uppercase tracking-widest text-xs transition"
          >
            {busy ? "Verificando..." : "Ingresar"}
          </button>

          <p className="text-[11px] text-[#7A7367] text-center pt-2">
            Acceso restringido. Toda consulta queda registrada en auditoría.
          </p>
        </form>

        <p className="mt-8 text-center text-[11px] text-[#7A7367] leading-relaxed">
          ECO DRIVE PLUS S.A.C. · RUC 20613413228 · Trujillo, La Libertad — Perú<br />
          ¿No tiene credenciales? Solicítelas a{" "}
          <a href="mailto:projas@ecodriveplus.com" className="text-[#E08821] hover:underline">
            projas@ecodriveplus.com
          </a>
        </p>
      </div>
    </main>
  );
}
