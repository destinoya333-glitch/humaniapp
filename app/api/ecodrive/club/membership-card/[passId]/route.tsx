import { ImageResponse } from "next/og";
import { getClubClient } from "@/lib/ecodrive/club";
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Datos demo para previsualizar el carnet sin necesidad de un Pass real en BD.
// Activar con ?demo=1 en la URL.
const DEMO = {
  nombre: "Percy Manuel Rojas Rubio",
  dni: "18213129",
  numero_pass_en_dni: 1,
  fecha_inicio: "2026-05-25",
  fecha_fin: "2027-05-25",
  estado: "activo" as const,
  tipo_perfil: "interno_conductor" as const,
  ediciones_consumidas: 0,
};

type PassData = {
  numero_pass_en_dni: number;
  fecha_inicio: string;
  fecha_fin: string;
  estado: string;
  ediciones_consumidas: number;
  miembro: { nombre: string; dni: string; tipo_perfil: string } | null;
};

async function loadLogoDataUri(origin: string): Promise<string> {
  try {
    const r = await fetch(
      "https://rfpmvnoaqibqiqxrmheb.supabase.co/storage/v1/object/public/brand-assets/ecodrive/logo-final-naranja-trim.png",
      { cache: "force-cache" },
    );
    if (!r.ok) return "";
    const buf = await r.arrayBuffer();
    return `data:image/png;base64,${Buffer.from(buf).toString("base64")}`;
  } catch {
    void origin;
    return "";
  }
}

async function loadStarDataUri(origin: string): Promise<string> {
  try {
    const r = await fetch(`${origin}/ecodriveplus/icon.png`, { cache: "force-cache" });
    if (!r.ok) return "";
    const buf = await r.arrayBuffer();
    return `data:image/png;base64,${Buffer.from(buf).toString("base64")}`;
  } catch {
    return "";
  }
}

async function getPass(passId: string): Promise<PassData | null> {
  const sb = getClubClient();
  const { data } = await sb
    .from("club_pass")
    .select(
      "numero_pass_en_dni,fecha_inicio,fecha_fin,estado,ediciones_consumidas,club_miembros(nombre,dni,tipo_perfil)",
    )
    .eq("id", passId)
    .maybeSingle();
  if (!data) return null;
  const d = data as unknown as PassData & { club_miembros: PassData["miembro"] };
  return {
    numero_pass_en_dni: d.numero_pass_en_dni,
    fecha_inicio: d.fecha_inicio,
    fecha_fin: d.fecha_fin,
    estado: d.estado,
    ediciones_consumidas: d.ediciones_consumidas,
    miembro: d.club_miembros,
  };
}

function fmtFecha(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("es-PE", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function tipoLabel(tipo: string): string {
  if (tipo === "interno_conductor") return "Socio Conductor EcoDrive+";
  if (tipo === "interno_pasajero") return "Socio Pasajero EcoDrive+";
  return "Socio del Club";
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ passId: string }> }) {
  const { passId } = await ctx.params;
  const isDemo = req.nextUrl.searchParams.get("demo") === "1";
  const origin = req.nextUrl.origin;

  let pass: PassData | null = null;
  if (isDemo) {
    pass = {
      numero_pass_en_dni: DEMO.numero_pass_en_dni,
      fecha_inicio: DEMO.fecha_inicio,
      fecha_fin: DEMO.fecha_fin,
      estado: DEMO.estado,
      ediciones_consumidas: DEMO.ediciones_consumidas,
      miembro: { nombre: DEMO.nombre, dni: DEMO.dni, tipo_perfil: DEMO.tipo_perfil },
    };
  } else {
    pass = await getPass(passId);
  }
  if (!pass || !pass.miembro) return new Response("pass not found", { status: 404 });

  const [logoData, starData] = await Promise.all([loadLogoDataUri(origin), loadStarDataUri(origin)]);
  const verifyUrl = `${origin}/club/mi-cuenta?pass=${isDemo ? "demo" : passId.slice(0, 8)}`;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(verifyUrl)}&bgcolor=ffffff&color=0a0908`;
  const perfilLabel = tipoLabel(pass.miembro.tipo_perfil);
  const isInterno = pass.miembro.tipo_perfil !== "publico";

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          background:
            "radial-gradient(85% 70% at 18% 18%, rgba(255, 168, 74, 0.40), transparent 60%), radial-gradient(80% 70% at 85% 95%, rgba(184, 106, 18, 0.55), transparent 70%), linear-gradient(135deg, #1a0f05 0%, #0A0908 100%)",
          padding: 56,
          color: "#F5EFE7",
          fontFamily: "serif",
          position: "relative",
        }}
      >
        {/* Estrella sigilo de fondo */}
        {starData && (
          <img
            src={starData}
            alt=""
            width={500}
            height={500}
            style={{
              position: "absolute",
              top: "30%",
              left: "50%",
              transform: "translate(-50%, -50%) rotate(15deg)",
              opacity: 0.08,
            }}
          />
        )}

        {/* HEADER con logo */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {logoData ? (
            <img src={logoData} alt="" width={300} height={70} style={{ objectFit: "contain" }} />
          ) : (
            <div style={{ fontSize: 36, fontWeight: 700, color: "#E08821" }}>EcoDrive+ Club</div>
          )}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              fontFamily: "monospace",
            }}
          >
            <div style={{ fontSize: 12, color: "#7A7367", letterSpacing: "0.22em", textTransform: "uppercase" }}>
              CARNET DE SOCIO
            </div>
            <div
              style={{
                fontSize: 14,
                color: "#E08821",
                letterSpacing: "0.18em",
                marginTop: 4,
              }}
            >
              N° {String(pass.numero_pass_en_dni).padStart(3, "0")} · {String(pass.miembro.dni).slice(-4)}
            </div>
          </div>
        </div>

        {/* SEPARADOR DORADO */}
        <div style={{ display: "flex", height: 2, background: "linear-gradient(90deg, transparent, #E08821, transparent)", marginTop: 36, marginBottom: 36 }} />

        {/* NOMBRE GRANDE */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 13,
              color: "#7A7367",
              letterSpacing: "0.24em",
              textTransform: "uppercase",
              fontFamily: "monospace",
              marginBottom: 8,
            }}
          >
            Socio del Club EcoDrive+
          </div>
          <div
            style={{
              fontSize: 64,
              fontWeight: 700,
              color: "#F5EFE7",
              lineHeight: 1.0,
              letterSpacing: "-0.02em",
              maxWidth: 920,
            }}
          >
            {pass.miembro.nombre}
          </div>
          <div
            style={{
              marginTop: 16,
              fontSize: 22,
              color: "#E08821",
              fontFamily: "serif",
              fontStyle: "italic",
            }}
          >
            {perfilLabel}
          </div>
        </div>

        {/* CHIPS BENEFICIOS */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 32 }}>
          {isInterno && pass.miembro.tipo_perfil === "interno_conductor" && (
            <div style={{ display: "flex", background: "rgba(224,136,33,0.18)", border: "1px solid rgba(224,136,33,0.55)", borderRadius: 999, padding: "8px 18px", color: "#FFA84A", fontSize: 16, fontFamily: "monospace" }}>
              ◆ 18 viajes/mes con 0% comisión
            </div>
          )}
          {isInterno && pass.miembro.tipo_perfil === "interno_pasajero" && (
            <div style={{ display: "flex", background: "rgba(224,136,33,0.18)", border: "1px solid rgba(224,136,33,0.55)", borderRadius: 999, padding: "8px 18px", color: "#FFA84A", fontSize: 16, fontFamily: "monospace" }}>
              ◆ Cashback 10% por 1 mes
            </div>
          )}
          <div style={{ display: "flex", background: "rgba(245,239,231,0.06)", border: "1px solid rgba(245,239,231,0.18)", borderRadius: 999, padding: "8px 18px", color: "#C8C0B5", fontSize: 16, fontFamily: "monospace" }}>
            ◆ Sorteo BYD Yuan Pro
          </div>
          <div style={{ display: "flex", background: "rgba(245,239,231,0.06)", border: "1px solid rgba(245,239,231,0.18)", borderRadius: 999, padding: "8px 18px", color: "#C8C0B5", fontSize: 16, fontFamily: "monospace" }}>
            ◆ Bonus lealtad +1 N° por edición
          </div>
        </div>

        {/* VIGENCIA + QR */}
        <div
          style={{
            display: "flex",
            marginTop: "auto",
            paddingTop: 36,
            borderTop: "1px solid rgba(245,239,231,0.10)",
            alignItems: "flex-end",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", maxWidth: 600 }}>
            <div style={{ display: "flex", gap: 48 }}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ fontSize: 12, color: "#7A7367", letterSpacing: "0.22em", textTransform: "uppercase", fontFamily: "monospace", marginBottom: 6 }}>
                  Activo desde
                </div>
                <div style={{ fontSize: 22, color: "#F5EFE7", fontFamily: "serif" }}>
                  {fmtFecha(pass.fecha_inicio)}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ fontSize: 12, color: "#7A7367", letterSpacing: "0.22em", textTransform: "uppercase", fontFamily: "monospace", marginBottom: 6 }}>
                  Válido hasta
                </div>
                <div style={{ fontSize: 22, color: "#E08821", fontFamily: "serif", fontWeight: 600 }}>
                  {fmtFecha(pass.fecha_fin)}
                </div>
              </div>
            </div>
            <div style={{ marginTop: 24, fontSize: 12, color: "#7A7367", letterSpacing: "0.18em", textTransform: "uppercase", fontFamily: "monospace" }}>
              Eco Drive Plus S.A.C. · RUC 20613413228 · ecodriveplus.com/club
            </div>
          </div>

          {/* QR + sello */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ display: "flex", padding: 8, background: "#F5EFE7", borderRadius: 12 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrSrc} width={110} height={110} alt="" />
            </div>
            <div style={{ marginTop: 10, fontSize: 11, color: "#7A7367", letterSpacing: "0.20em", fontFamily: "monospace", textTransform: "uppercase" }}>
              Verificar socio
            </div>
          </div>
        </div>

        {/* SELLO ESQUINA - estado */}
        <div
          style={{
            display: "flex",
            position: "absolute",
            top: 56,
            right: 80,
            transform: "rotate(8deg)",
            border: "3px solid rgba(74, 222, 128, 0.45)",
            color: "rgba(74, 222, 128, 0.85)",
            padding: "8px 22px",
            fontSize: 22,
            letterSpacing: "0.28em",
            fontFamily: "monospace",
            textTransform: "uppercase",
            background: "rgba(0,0,0,0.20)",
          }}
        >
          {pass.estado}
        </div>

        {isDemo && (
          <div
            style={{
              display: "flex",
              position: "absolute",
              bottom: 24,
              right: 24,
              fontSize: 11,
              color: "rgba(245,239,231,0.35)",
              letterSpacing: "0.2em",
              fontFamily: "monospace",
            }}
          >
            DEMO · NO ES UN CARNET REAL
          </div>
        )}
      </div>
    ),
    { width: 1080, height: 1350 },
  );
}
