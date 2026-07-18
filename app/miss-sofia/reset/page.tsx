"use client";

/**
 * Miss Sofia — Restablecer contraseña.
 *
 * Aterriza aquí el enlace del correo de recuperación (Supabase
 * resetPasswordForEmail con redirectTo=https://activosya.com/miss-sofia/reset).
 *
 * Supabase puede mandar el token de dos formas:
 *   1) Hash:  #access_token=...&type=recovery     (verify server-side, implícito)
 *   2) Query: ?token_hash=...&type=recovery       (hay que canjearlo con /verify)
 * Soportamos ambas. Con el access_token, hacemos PUT /auth/v1/user para fijar
 * la nueva clave. Luego el usuario vuelve a la app e inicia sesión.
 */
import { useEffect, useState } from "react";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

type Phase = "loading" | "form" | "done" | "error";

export default function MissSofiaResetPage() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const hash = window.location.hash.replace(/^#/, "");
        const hashParams = new URLSearchParams(hash);
        const queryParams = new URLSearchParams(window.location.search);

        // Error explícito de Supabase (enlace vencido/usado)
        const errDesc =
          hashParams.get("error_description") || queryParams.get("error_description");
        if (errDesc) {
          setError(decodeURIComponent(errDesc.replace(/\+/g, " ")));
          setPhase("error");
          return;
        }

        // 1) Token directo en el hash
        const at = hashParams.get("access_token");
        if (at) {
          setToken(at);
          setPhase("form");
          return;
        }

        // 2) token_hash en el query → canjear por sesión
        const tokenHash = queryParams.get("token_hash");
        const type = queryParams.get("type") || "recovery";
        if (tokenHash) {
          const res = await fetch(`${SUPABASE_URL}/auth/v1/verify`, {
            method: "POST",
            headers: { apikey: SUPABASE_ANON, "Content-Type": "application/json" },
            body: JSON.stringify({ type, token_hash: tokenHash }),
          });
          const data = await res.json();
          if (res.ok && data.access_token) {
            setToken(data.access_token);
            setPhase("form");
            return;
          }
          setError(data.msg || data.error_description || "El enlace ya venció o fue usado.");
          setPhase("error");
          return;
        }

        setError("Enlace inválido. Pide un correo nuevo desde la app.");
        setPhase("error");
      } catch {
        setError("No pude leer el enlace. Pide uno nuevo desde la app.");
        setPhase("error");
      }
    })();
  }, []);

  async function submit() {
    setError(null);
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (!token) {
      setError("Falta el token del enlace. Pide un correo nuevo desde la app.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        method: "PUT",
        headers: {
          apikey: SUPABASE_ANON,
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          data.msg || data.error_description || data.message || "No se pudo actualizar la contraseña. El enlace pudo vencer."
        );
      }
      setPhase("done");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-zinc-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <img
            src="/sofia-avatar.jpg"
            alt="Miss Sofia"
            className="w-20 h-20 rounded-full object-cover mx-auto border-2 border-amber-400/40 mb-3"
            onError={(e) => ((e.currentTarget.style.display = "none"))}
          />
          <h1 className="text-xl font-bold">Miss Sofia</h1>
          <p className="text-sm text-zinc-500">Restablecer contraseña</p>
        </div>

        {phase === "loading" && (
          <p className="text-center text-zinc-400">Validando tu enlace…</p>
        )}

        {phase === "form" && (
          <div className="card-surface rounded-2xl p-6 border border-amber-400/30 bg-amber-400/5">
            <label className="block mb-3">
              <span className="text-xs text-zinc-400 mb-1.5 block">Nueva contraseña</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500/50"
              />
            </label>
            <label className="block mb-4">
              <span className="text-xs text-zinc-400 mb-1.5 block">Repite la contraseña</span>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Otra vez"
                onKeyDown={(e) => e.key === "Enter" && submit()}
                className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500/50"
              />
            </label>
            <button
              onClick={submit}
              disabled={submitting}
              className="w-full bg-amber-500 text-black rounded-xl py-3 font-bold hover:bg-amber-400 disabled:bg-zinc-700"
            >
              {submitting ? "Guardando…" : "Guardar nueva contraseña"}
            </button>
            {error && (
              <p className="mt-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm p-2 rounded-lg">
                {error}
              </p>
            )}
          </div>
        )}

        {phase === "done" && (
          <div className="card-surface rounded-2xl p-6 border border-emerald-500/30 bg-emerald-500/5 text-center">
            <h2 className="text-lg font-bold mb-2">✅ ¡Listo!</h2>
            <p className="text-zinc-300 text-sm">
              Tu contraseña se actualizó. Vuelve a la app <b>Miss Sofia</b> e inicia sesión con tu
              nueva contraseña.
            </p>
          </div>
        )}

        {phase === "error" && (
          <div className="card-surface rounded-2xl p-6 border border-rose-500/30 bg-rose-500/5 text-center">
            <h2 className="text-lg font-bold mb-2">Enlace no válido</h2>
            <p className="text-zinc-300 text-sm mb-1">{error}</p>
            <p className="text-zinc-500 text-xs mt-3">
              Abre la app Miss Sofia → &quot;¿Olvidaste tu contraseña?&quot; y pide un correo nuevo
              (los enlaces vencen en ~1 hora).
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
