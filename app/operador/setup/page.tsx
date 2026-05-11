/**
 * Página /operador/setup?token=X
 *
 * Vista que recibe el operador franquicia tras pagar la 1ra renta y ser
 * activado automáticamente por el MacroDroid de Percy. Le muestra todo
 * lo que necesita para empezar a vender:
 *  - URL webhook MacroDroid única (para detectar Yapes de SUS alumnos)
 *  - Tutorial cómo configurar MacroDroid en su Android
 *  - Cómo conseguir y registrar su chip WhatsApp Business
 *  - Sus links de referido únicos
 *  - Material marketing pre-armado
 *
 * Auth: por el token único en URL (48 chars hex). El operador lo recibe
 * en el WhatsApp de bienvenida. Cualquiera con el token puede ver la página
 * de SU operador (security through obscurity — equivale a su sesión).
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/activosya/db";
import { ACTIVOS_FRANQUICIABLES, PLANES, type Plan, type ActivoSlug } from "@/lib/activosya/operadores";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type SetupData = {
  id: string;
  name: string;
  whatsapp_personal: string;
  yape_numero: string;
  referral_code: string;
  macrodroid_token: string;
  plan: Plan;
  monthly_fee_pen: number;
  fecha_proxima_renta: string | null;
  ultima_renta_pagada_at: string | null;
  status: string;
  city: string;
  assets: Array<{
    asset_slug: ActivoSlug;
    status: string;
    meta_phone_id: string | null;
    meta_phone_display: string | null;
    setup_completed_at: string | null;
  }>;
};

async function loadSetup(token: string): Promise<SetupData | null> {
  const { data: tenant } = await supabaseAdmin
    .from("ay_tenants")
    .select(
      "id, name, whatsapp_personal, yape_numero, referral_code, macrodroid_token, plan, monthly_fee_pen, fecha_proxima_renta, ultima_renta_pagada_at, status, city",
    )
    .eq("macrodroid_token", token)
    .eq("type", "operador")
    .maybeSingle();

  if (!tenant) return null;

  const { data: assets } = await supabaseAdmin
    .from("ay_tenant_assets")
    .select("asset_slug, status, meta_phone_id, meta_phone_display, setup_completed_at")
    .eq("tenant_id", tenant.id);

  return { ...tenant, assets: (assets || []) as SetupData["assets"] };
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("es-PE", { day: "2-digit", month: "long", year: "numeric" });
  } catch {
    return "—";
  }
}

function StatusBadge({ ok, pendingLabel = "Pendiente", okLabel = "Listo" }: { ok: boolean; pendingLabel?: string; okLabel?: string }) {
  return ok ? (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
      ✓ {okLabel}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 border border-amber-500/30 text-amber-400">
      ⏳ {pendingLabel}
    </span>
  );
}

function CopyableField({ label, value }: { label: string; value: string }) {
  // Server component compatible: input readonly con select-all (1 click selecciona todo el texto)
  return (
    <div>
      <div className="text-xs text-zinc-400 uppercase tracking-widest font-semibold mb-1.5">{label}</div>
      <input
        readOnly
        defaultValue={value}
        className="w-full px-3 py-2.5 rounded-lg bg-black/40 border border-white/10 font-mono text-sm text-amber-300 select-all"
      />
    </div>
  );
}

export default async function OperadorSetupPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!token) notFound();
  const op = await loadSetup(token);
  if (!op) notFound();

  const planInfo = PLANES[op.plan];
  const webhookUrl = `https://activosya.com/api/yape-detect/${op.macrodroid_token}`;
  const adminWA = "https://wa.me/51998102258";

  // Asset principal (V1 = 1 asset por operador)
  const principalAsset = op.assets[0];
  const activoInfo = principalAsset ? ACTIVOS_FRANQUICIABLES[principalAsset.asset_slug] : null;
  const referralPath = principalAsset?.asset_slug === "tudestinoya" ? "r" : "sofia/r";
  const referralUrl = `https://activosya.com/${referralPath}/${op.referral_code}`;

  // Estado del setup
  const macrodroidConfigurado = !!principalAsset?.setup_completed_at; // se setea cuando operador hace healthcheck GET de su token
  const phoneVinculado = !!principalAsset?.meta_phone_id;
  const setupCompleto = macrodroidConfigurado && phoneVinculado;

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white relative overflow-hidden">
      <div aria-hidden className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-amber-500/15 blur-[120px]" />
        <div className="absolute top-1/2 -right-40 w-[500px] h-[500px] rounded-full bg-orange-500/10 blur-[100px]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#0A0A0A]/70 backdrop-blur-xl">
        <div className="mx-auto max-w-5xl px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 grid place-items-center font-bold text-black">A</div>
            <span className="font-bold tracking-tight">ActivosYA</span>
          </Link>
          <a href={adminWA} target="_blank" rel="noopener noreferrer" className="text-sm text-zinc-400 hover:text-white transition">
            Soporte WhatsApp →
          </a>
        </div>
      </header>

      <section className="relative px-6 py-12">
        <div className="mx-auto max-w-4xl">
          {/* Hero */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold tracking-widest uppercase mb-6">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
              Cuenta activa
            </div>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight">
              Bienvenido,{" "}
              <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-orange-500 bg-clip-text text-transparent">
                {op.name.split(" ")[0]}
              </span>
            </h1>
            <p className="mt-4 text-zinc-400 max-w-xl mx-auto">
              Tu operador franquicia <strong className="text-white">{activoInfo?.name ?? op.assets[0]?.asset_slug}</strong> está activo. Completa los siguientes pasos para empezar a vender HOY.
            </p>
          </div>

          {/* Resumen plan */}
          <div className="rounded-3xl border border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent p-6 mb-10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center md:text-left">
              <div>
                <div className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Plan</div>
                <div className="text-lg font-bold text-amber-400">{planInfo.label}</div>
                <div className="text-xs text-zinc-500">{planInfo.max_alumnos} alumnos máx</div>
              </div>
              <div>
                <div className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Renta</div>
                <div className="text-lg font-bold">S/ {op.monthly_fee_pen}</div>
                <div className="text-xs text-zinc-500">mensual</div>
              </div>
              <div>
                <div className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Próximo cobro</div>
                <div className="text-lg font-bold">{fmtDate(op.fecha_proxima_renta)}</div>
                <div className="text-xs text-zinc-500">a tu Yape Percy</div>
              </div>
              <div>
                <div className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Activo</div>
                <div className="text-lg font-bold">{activoInfo?.name ?? "—"}</div>
                <div className="text-xs text-zinc-500">{op.city}</div>
              </div>
            </div>
          </div>

          {/* Progreso del setup */}
          <div className="mb-10">
            <h2 className="text-2xl font-bold mb-4">📋 Tu progreso de setup</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
                <div>
                  <div className="font-semibold">1. Pago primera renta</div>
                  <div className="text-sm text-zinc-400">Confirmado el {fmtDate(op.ultima_renta_pagada_at)}</div>
                </div>
                <StatusBadge ok={true} okLabel="Listo" />
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-white/[0.02]">
                <div>
                  <div className="font-semibold">2. Configurar MacroDroid en tu Android</div>
                  <div className="text-sm text-zinc-400">Para detectar pagos de tus alumnos automáticamente</div>
                </div>
                <StatusBadge ok={macrodroidConfigurado} pendingLabel="Pendiente" />
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-white/[0.02]">
                <div>
                  <div className="font-semibold">3. Vincular tu chip WhatsApp Business</div>
                  <div className="text-sm text-zinc-400">Lo agregamos nosotros a Meta — solo envíanos el chip</div>
                </div>
                <StatusBadge ok={phoneVinculado} pendingLabel="Pendiente" />
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-white/[0.02]">
                <div>
                  <div className="font-semibold">4. Empezar a captar alumnos</div>
                  <div className="text-sm text-zinc-400">Comparte tu link, lanza ads, networking</div>
                </div>
                <StatusBadge ok={setupCompleto} pendingLabel="Tras los pasos 2 y 3" />
              </div>
            </div>
          </div>

          {/* PASO 2: MacroDroid */}
          <div className="rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-xl p-8 mb-8">
            <div className="flex items-start gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 grid place-items-center text-amber-400 font-bold flex-shrink-0">2</div>
              <div>
                <h3 className="text-xl font-bold mb-1">Configurar MacroDroid 📱</h3>
                <p className="text-sm text-zinc-400">Esto detecta los pagos Yape de tus alumnos automáticamente y los registra en tu cuenta.</p>
              </div>
            </div>

            <div className="space-y-5">
              <CopyableField label="Tu webhook único MacroDroid" value={webhookUrl} />

              <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                <div className="text-sm font-semibold text-amber-400 mb-3">Pasos en tu celular Android (5 min):</div>
                <ol className="text-sm text-zinc-300 space-y-2 list-decimal list-inside">
                  <li>Descarga <strong className="text-white">MacroDroid</strong> desde Play Store (gratis)</li>
                  <li>Abre la app → permite acceso a notificaciones</li>
                  <li>Crea una macro nueva:
                    <ul className="ml-6 mt-1 space-y-1 list-disc list-inside text-zinc-400">
                      <li>Disparador (Trigger): <strong>Notificación</strong> → app <strong>Yape</strong></li>
                      <li>Acción (Action): <strong>HTTP POST</strong> al URL de arriba</li>
                      <li>Body: <code className="text-amber-300 font-mono text-xs">[notification_text]</code></li>
                    </ul>
                  </li>
                  <li>Guarda y activa la macro</li>
                  <li>Para verificar: pídele a alguien que te yapee S/0.10 → debería notificarte 1-2 segundos después</li>
                </ol>
                <div className="mt-4 text-xs text-zinc-500">
                  ¿Te pierdes? Manda WhatsApp al{" "}
                  <a href={adminWA} className="text-amber-400 hover:underline" target="_blank" rel="noopener noreferrer">
                    soporte
                  </a>{" "}
                  y te guiamos paso a paso por video.
                </div>
              </div>

              <a
                href={`${webhookUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm transition"
              >
                Probar webhook (debe responder JSON con tu nombre) →
              </a>
            </div>
          </div>

          {/* PASO 3: Chip WhatsApp Business */}
          <div className="rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-xl p-8 mb-8">
            <div className="flex items-start gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 grid place-items-center text-amber-400 font-bold flex-shrink-0">3</div>
              <div>
                <h3 className="text-xl font-bold mb-1">Vincular tu chip WhatsApp Business 📲</h3>
                <p className="text-sm text-zinc-400">El chip donde tus alumnos te van a escribir. Nosotros lo conectamos a Meta Cloud (Sofia/Destino respondiendo como tu marca).</p>
              </div>
            </div>

            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 mb-5">
              <div className="text-sm text-amber-300 font-semibold mb-2">⚠️ Requisitos del chip</div>
              <ul className="text-sm text-zinc-300 space-y-1.5 list-disc list-inside">
                <li>Chip <strong>nuevo o dedicado</strong> SOLO para tu negocio (no tu personal)</li>
                <li>Operador peruano (Claro/Movistar/Entel/Bitel)</li>
                <li>Que pueda recibir SMS y llamadas para verificación Meta</li>
                <li>NO debe estar usado en WhatsApp personal ni Business actualmente</li>
              </ul>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/30 p-5">
              <div className="text-sm font-semibold text-amber-400 mb-3">Pasos:</div>
              <ol className="text-sm text-zinc-300 space-y-2 list-decimal list-inside">
                <li>Compra/libera el chip nuevo (~S/. 5 con saldo S/. 0)</li>
                <li>Toma una foto al chip (con el número visible)</li>
                <li>
                  Envía la foto al WhatsApp de soporte:{" "}
                  <a href={adminWA} className="text-amber-400 font-mono hover:underline" target="_blank" rel="noopener noreferrer">
                    +51 998 102 258
                  </a>
                </li>
                <li>Te confirmamos en menos de 4h cuando esté agregado a Meta Cloud</li>
                <li>A partir de ahí cualquier alumno que te escriba a ese número será atendido por <strong>{activoInfo?.name}</strong> automáticamente</li>
              </ol>
            </div>

            <a
              href={`${adminWA}?text=${encodeURIComponent(`Hola, soy ${op.name} (operador ${op.referral_code}). Te envío mi chip para vincularlo a Meta.`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 block w-full text-center px-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-bold transition"
            >
              Enviar mi chip por WhatsApp →
            </a>
          </div>

          {/* PASO 4: Tu link de referido */}
          <div className="rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-xl p-8 mb-8">
            <div className="flex items-start gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 grid place-items-center text-amber-400 font-bold flex-shrink-0">4</div>
              <div>
                <h3 className="text-xl font-bold mb-1">Tu link único de referido 🔗</h3>
                <p className="text-sm text-zinc-400">Comparte este link en redes, WhatsApp, ads. Cualquiera que entre por aquí queda atribuido a tu cuenta.</p>
              </div>
            </div>

            <CopyableField label="Tu URL de referido" value={referralUrl} />

            <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`Conoce ${activoInfo?.name ?? "ActivosYA"} 🚀\n\n${referralUrl}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-center px-4 py-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-sm font-semibold transition"
              >
                Compartir por WhatsApp
              </a>
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-center px-4 py-3 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 text-sm font-semibold transition"
              >
                Compartir en Facebook
              </a>
              <a
                href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(referralUrl)}&text=${encodeURIComponent(`Conoce ${activoInfo?.name ?? "ActivosYA"} 🚀`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-center px-4 py-3 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-400 text-sm font-semibold transition"
              >
                Compartir en X
              </a>
            </div>
          </div>

          {/* PASO 5: Material marketing */}
          <div className="rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-xl p-8 mb-8">
            <div className="flex items-start gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 grid place-items-center text-amber-400 font-bold flex-shrink-0">5</div>
              <div>
                <h3 className="text-xl font-bold mb-1">Material de marketing 🎨</h3>
                <p className="text-sm text-zinc-400">Plantillas listas para usar — solo agrega tu link de referido.</p>
              </div>
            </div>

            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5">
              <div className="text-sm text-amber-300 font-semibold mb-2">⏳ Próximamente</div>
              <p className="text-sm text-zinc-300">
                Estamos preparando: 10 plantillas Canva editables (flyers cuadrados, historias IG, banners FB), 5 scripts para anuncios FB Ads, y 3 videos cortos para TikTok/Reels. Disponible en las próximas 48h.
              </p>
              <p className="text-sm text-zinc-400 mt-3">
                Mientras tanto, comparte tu link de referido directamente con frases como:{" "}
                <em className="text-amber-300">
                  &quot;Mira lo que estoy ofreciendo en mi zona — atención IA 24/7 con tarifas locales: {referralUrl}&quot;
                </em>
              </p>
            </div>
          </div>

          {/* Estado de tu negocio */}
          <div className="rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-xl p-8 mb-8">
            <h3 className="text-xl font-bold mb-4">📊 Tu negocio en números</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 rounded-xl bg-black/30 border border-white/10">
                <div className="text-3xl font-bold text-amber-400">0</div>
                <div className="text-xs text-zinc-500 mt-1 uppercase tracking-widest">Alumnos</div>
              </div>
              <div className="p-4 rounded-xl bg-black/30 border border-white/10">
                <div className="text-3xl font-bold text-emerald-400">S/ 0</div>
                <div className="text-xs text-zinc-500 mt-1 uppercase tracking-widest">Ingresos mes</div>
              </div>
              <div className="p-4 rounded-xl bg-black/30 border border-white/10">
                <div className="text-3xl font-bold text-blue-400">{planInfo.max_alumnos}</div>
                <div className="text-xs text-zinc-500 mt-1 uppercase tracking-widest">Cupo plan</div>
              </div>
            </div>
            <Link
              href="/operador/dashboard"
              className="mt-5 block w-full text-center px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm transition"
            >
              Ver dashboard completo →
            </Link>
          </div>

          {/* Footer */}
          <div className="text-center text-sm text-zinc-500 mt-12">
            <p>
              ¿Dudas? Escribe a{" "}
              <a href={adminWA} className="text-amber-400 hover:underline" target="_blank" rel="noopener noreferrer">
                soporte WhatsApp
              </a>{" "}
              · Próxima renta: <strong>{fmtDate(op.fecha_proxima_renta)}</strong>
            </p>
            <p className="mt-2 text-xs text-zinc-600">
              Guarda esta página: tu link contiene tu token único. No lo compartas con nadie.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
