"use client";
import { useState } from "react";

export default function MiCuentaClient() {
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setInfo(""); setLoading(true);
    const normalized = phone.replace(/\D/g, "");
    const final = normalized.startsWith("51") ? normalized : "51" + normalized;
    try {
      const r = await fetch("/api/ecodrive/auth/otp-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: final }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Error enviando código");
      setPhone(final);
      setInfo("📲 Código enviado a tu WhatsApp. Revísalo y pégalo aquí.");
      setStep("code");
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally { setLoading(false); }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const r = await fetch("/api/ecodrive/auth/otp-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Código inválido");
      window.location.reload();
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally { setLoading(false); }
  }

  return (
    <section className="relative px-6 py-20">
      <div className="mx-auto max-w-md">
        <div className="text-center mb-10">
          <div className="text-xs text-orange-400 uppercase tracking-widest font-semibold">Mi cuenta</div>
          <h1 className="mt-3 text-4xl font-bold tracking-tight">Ingresa con WhatsApp</h1>
          <p className="mt-3 text-zinc-400">Sin contraseña. Te mandamos un código por WhatsApp.</p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-xl p-8">
          {step === "phone" ? (
            <form onSubmit={sendCode} className="space-y-5">
              <div>
                <label className="block text-xs text-zinc-400 uppercase tracking-widest font-semibold mb-2">
                  Tu número de WhatsApp
                </label>
                <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 focus-within:border-orange-500/50 transition">
                  <span className="text-zinc-500">🇵🇪 +51</span>
                  <input
                    type="tel"
                    value={phone.replace(/^51/, "")}
                    onChange={(e) => setPhone("51" + e.target.value.replace(/\D/g, ""))}
                    placeholder="9XX XXX XXX"
                    className="flex-1 bg-transparent outline-none text-lg tracking-wider"
                    maxLength={9}
                    required
                  />
                </div>
              </div>
              {error && <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">{error}</div>}
              <button
                type="submit"
                disabled={loading || phone.length < 11}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-[#25D366] hover:bg-[#22C35E] disabled:opacity-50 text-white font-bold transition"
              >
                {loading ? "Enviando..." : "📲 Enviar código por WhatsApp"}
              </button>
            </form>
          ) : (
            <form onSubmit={verifyCode} className="space-y-5">
              {info && <div className="text-sm text-orange-300 bg-orange-500/10 border border-orange-500/30 rounded-lg px-3 py-2">{info}</div>}
              <div>
                <label className="block text-xs text-zinc-400 uppercase tracking-widest font-semibold mb-2">
                  Código de 6 dígitos
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="123456"
                  className="w-full px-5 py-4 rounded-xl border border-white/10 bg-white/5 outline-none text-2xl tracking-[0.5em] font-mono text-center focus:border-orange-500/50 transition"
                  maxLength={6}
                  required
                  autoFocus
                />
              </div>
              {error && <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">{error}</div>}
              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-black font-bold transition"
              >
                {loading ? "Verificando..." : "Ingresar →"}
              </button>
              <button
                type="button"
                onClick={() => { setStep("phone"); setCode(""); setError(""); }}
                className="w-full text-sm text-zinc-500 hover:text-orange-400 transition"
              >
                ← Cambiar número
              </button>
            </form>
          )}
        </div>

        <div className="mt-6 text-center text-xs text-zinc-500">
          🔒 Sin contraseña. Sin app que descargar.<br />
          Solo tu WhatsApp registrado en EcoDrive+.
        </div>
      </div>
    </section>
  );
}
