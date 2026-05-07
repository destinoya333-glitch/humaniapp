"use client";
import { useState } from "react";

export default function LeadForm() {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<null | { ok: boolean; msg: string }>(null);

  const submit = async () => {
    setLoading(true);
    setDone(null);
    try {
      const res = await fetch("/api/ecodrive/chofer-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wa_id: phone }),
      });
      const json = await res.json();
      if (res.ok) {
        setDone({ ok: true, msg: "Listo. Revisa tu WhatsApp en unos segundos." });
        setPhone("");
      } else {
        setDone({ ok: false, msg: json.error || "Algo falló. Intenta de nuevo." });
      }
    } catch {
      setDone({ ok: false, msg: "Sin conexión. Intenta de nuevo." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium mb-1">Tu WhatsApp</label>
        <div className="flex gap-2">
          <span className="bg-zinc-100 border rounded-lg px-3 py-3 text-zinc-600 font-medium">
            +51
          </span>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 9))}
            className="flex-1 border rounded-lg px-4 py-3 text-lg"
            placeholder="999 999 999"
            inputMode="numeric"
          />
        </div>
        <p className="text-xs text-zinc-500 mt-1">
          Solo el número, sin código país. Te enviamos el formulario por WhatsApp.
        </p>
      </div>

      <button
        onClick={submit}
        disabled={phone.length < 9 || loading}
        className="w-full bg-[#E1811B] text-white font-bold py-4 rounded-lg hover:bg-[#c46b0e] disabled:opacity-50 transition"
      >
        {loading ? "Enviando..." : "Recibir formulario en WhatsApp"}
      </button>

      {done && (
        <div
          className={`p-3 rounded-lg text-sm ${
            done.ok
              ? "bg-green-50 text-green-800"
              : "bg-red-50 text-red-800"
          }`}
        >
          {done.msg}
        </div>
      )}
    </div>
  );
}
