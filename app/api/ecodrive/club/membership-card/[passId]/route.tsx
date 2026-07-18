import { ImageResponse } from "next/og";
import { getClubClient } from "@/lib/ecodrive/club";
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEMO = {
  nombre: "Percy Manuel Rojas Rubio",
  dni: "18213129",
  numero_pass_en_dni: 1,
  fecha_inicio: "2026-05-25",
  fecha_fin: "2027-05-25",
  estado: "activo" as const,
  tipo_perfil: "interno_conductor" as const,
};

type PassData = {
  numero_pass_en_dni: number;
  fecha_inicio: string;
  fecha_fin: string;
  estado: string;
  miembro: { nombre: string; dni: string; tipo_perfil: string } | null;
};

async function getPass(passId: string): Promise<PassData | null> {
  const sb = getClubClient();
  const { data } = await sb
    .from("club_pass")
    .select("numero_pass_en_dni,fecha_inicio,fecha_fin,estado,club_miembros(nombre,dni,tipo_perfil)")
    .eq("id", passId)
    .maybeSingle();
  if (!data) return null;
  const d = data as unknown as PassData & { club_miembros: PassData["miembro"] };
  return {
    numero_pass_en_dni: d.numero_pass_en_dni,
    fecha_inicio: d.fecha_inicio,
    fecha_fin: d.fecha_fin,
    estado: d.estado,
    miembro: d.club_miembros,
  };
}

function fmtFecha(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("es-PE", { day: "2-digit", month: "long", year: "numeric" });
  } catch {
    return iso;
  }
}

function tipoLabel(tipo: string): string {
  if (tipo === "interno_conductor") return "Socio Conductor";
  if (tipo === "interno_pasajero") return "Socio Pasajero";
  return "Socio del Club";
}

const FONT = "system-ui, -apple-system, sans-serif";

const LOGO_URL =
  "https://rfpmvnoaqibqiqxrmheb.supabase.co/storage/v1/object/public/brand-assets/ecodrive/logo-oficial-tight.png";
let _logoCache: string | null = null;
async function getLogoSrc(): Promise<string | null> {
  if (_logoCache) return _logoCache;
  try {
    const r = await fetch(LOGO_URL);
    if (!r.ok) return null;
    const b = Buffer.from(await r.arrayBuffer()).toString("base64");
    _logoCache = "data:image/png;base64," + b;
    return _logoCache;
  } catch {
    return null;
  }
}

const STAR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M50 2 L61.76 33.82 L95.65 35.17 L69.02 56.18 L78.21 88.83 L50 70 L21.79 88.83 L30.98 56.18 L4.35 35.17 L38.24 33.82 Z" fill="#E08821" stroke="#E08821" stroke-width="7" stroke-linejoin="round"/></svg>`;
const STAR_SRC = "data:image/svg+xml;base64," + Buffer.from(STAR_SVG).toString("base64");

export async function GET(req: NextRequest, ctx: { params: Promise<{ passId: string }> }) {
  const { passId } = await ctx.params;
  const isDemo = req.nextUrl.searchParams.get("demo") === "1";

  let pass: PassData | null = null;
  if (isDemo) {
    pass = {
      numero_pass_en_dni: DEMO.numero_pass_en_dni,
      fecha_inicio: DEMO.fecha_inicio,
      fecha_fin: DEMO.fecha_fin,
      estado: DEMO.estado,
      miembro: { nombre: DEMO.nombre, dni: DEMO.dni, tipo_perfil: DEMO.tipo_perfil },
    };
  } else {
    pass = await getPass(passId);
  }
  if (!pass || !pass.miembro) return new Response("pass not found", { status: 404 });

  const logoSrc = await getLogoSrc();
  const origin = req.nextUrl.origin;
  const verifyUrl = `${origin}/club/mi-cuenta`;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(verifyUrl)}&bgcolor=ffffff&color=0a0908`;
  const perfilLabel = tipoLabel(pass.miembro.tipo_perfil);
  const tipo = pass.miembro.tipo_perfil;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #1a0f05 0%, #2a1500 50%, #0A0908 100%)",
          padding: 60,
          color: "#F5EFE7",
          fontFamily: FONT,
        }}
      >
        {/* MARCA DE AGUA — estrella oficial al centro */}
        <div
          style={{
            display: "flex",
            position: "absolute",
            top: -60,
            left: -60,
            width: 1080,
            height: 1350,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={STAR_SRC} width={800} height={800} style={{ opacity: 0.07 }} alt="" />
        </div>

        {/* HEADER */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {logoSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoSrc} width={300} height={73} alt="EcoDrive+" />
            ) : (
              <div style={{ display: "flex", fontSize: 52, fontWeight: 700, letterSpacing: -1 }}>
                EcoDrive<span style={{ color: "#E08821" }}>+</span>
              </div>
            )}
            <div style={{ display: "flex", fontSize: 22, color: "#E08821", marginTop: 10, fontStyle: "italic", letterSpacing: 1 }}>
              Club
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <div style={{ display: "flex", fontSize: 14, color: "#9a8f7a", letterSpacing: 3 }}>
              CARNET DE SOCIO
            </div>
            <div style={{ display: "flex", fontSize: 16, color: "#E08821", marginTop: 6, letterSpacing: 2 }}>
              N° {String(pass.numero_pass_en_dni).padStart(3, "0")} · {String(pass.miembro.dni).slice(-4)}
            </div>
          </div>
        </div>

        {/* SEPARADOR */}
        <div style={{ display: "flex", height: 2, background: "#E08821", marginTop: 40, marginBottom: 40, opacity: 0.7 }} />

        {/* NOMBRE */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 16, color: "#9a8f7a", letterSpacing: 3, marginBottom: 14 }}>
            SOCIO ACREDITADO
          </div>
          <div style={{ display: "flex", fontSize: 68, fontWeight: 700, lineHeight: 1, letterSpacing: -1 }}>
            {pass.miembro.nombre}
          </div>
          <div style={{ display: "flex", fontSize: 28, color: "#E08821", marginTop: 18, fontStyle: "italic" }}>
            {perfilLabel} · EcoDrive+
          </div>
        </div>

        {/* BENEFICIOS */}
        <div style={{ display: "flex", flexDirection: "column", marginTop: 50, gap: 12 }}>
          <div style={{ display: "flex", fontSize: 16, color: "#9a8f7a", letterSpacing: 3 }}>
            BENEFICIOS INCLUIDOS
          </div>
          {tipo === "interno_conductor" && (
            <div style={{ display: "flex", flexDirection: "row", alignItems: "center", fontSize: 22, color: "#FFA84A" }}>
              <div style={{ display: "flex", color: "#E08821", marginRight: 14 }}>•</div>
              <div style={{ display: "flex" }}>18 primeros viajes del mes con 0% comisión</div>
            </div>
          )}
          {tipo === "interno_pasajero" && (
            <div style={{ display: "flex", flexDirection: "row", alignItems: "center", fontSize: 22, color: "#FFA84A" }}>
              <div style={{ display: "flex", color: "#E08821", marginRight: 14 }}>•</div>
              <div style={{ display: "flex" }}>Cashback al 10% durante 1 mes</div>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "row", alignItems: "center", fontSize: 22, color: "#C8C0B5" }}>
            <div style={{ display: "flex", color: "#E08821", marginRight: 14 }}>•</div>
            <div style={{ display: "flex" }}>Participación en sorteo de auto eléctrico</div>
          </div>
          <div style={{ display: "flex", flexDirection: "row", alignItems: "center", fontSize: 22, color: "#C8C0B5" }}>
            <div style={{ display: "flex", color: "#E08821", marginRight: 14 }}>•</div>
            <div style={{ display: "flex" }}>Bonus de lealtad: +1 N° por edición consumida</div>
          </div>
          <div style={{ display: "flex", flexDirection: "row", alignItems: "center", fontSize: 22, color: "#C8C0B5" }}>
            <div style={{ display: "flex", color: "#E08821", marginRight: 14 }}>•</div>
            <div style={{ display: "flex" }}>Acceso a Pichanga Eco (fútbol/vóley/billar)</div>
          </div>
        </div>

        {/* FOOTER: vigencia + QR */}
        <div
          style={{
            display: "flex",
            marginTop: "auto",
            paddingTop: 40,
            borderTop: "1px solid #3a2a18",
            justifyContent: "space-between",
            alignItems: "flex-end",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", gap: 60 }}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", fontSize: 14, color: "#9a8f7a", letterSpacing: 2, marginBottom: 6 }}>
                  ACTIVO DESDE
                </div>
                <div style={{ display: "flex", fontSize: 22, color: "#F5EFE7" }}>
                  {fmtFecha(pass.fecha_inicio)}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", fontSize: 14, color: "#9a8f7a", letterSpacing: 2, marginBottom: 6 }}>
                  VALIDO HASTA
                </div>
                <div style={{ display: "flex", fontSize: 22, color: "#E08821", fontWeight: 600 }}>
                  {fmtFecha(pass.fecha_fin)}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", fontSize: 14, color: "#9a8f7a", letterSpacing: 2, marginBottom: 6 }}>
                  ESTADO
                </div>
                <div style={{ display: "flex", fontSize: 22, color: "#4ade80", fontWeight: 600, textTransform: "uppercase" }}>
                  {pass.estado}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", marginTop: 30, fontSize: 13, color: "#7a6f5a", letterSpacing: 2 }}>
              ECO DRIVE PLUS S.A.C. · RUC 20613413228
            </div>
            <div style={{ display: "flex", marginTop: 6, fontSize: 13, color: "#7a6f5a", letterSpacing: 2 }}>
              ECODRIVEPLUS.COM/CLUB
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ display: "flex", padding: 10, background: "#F5EFE7", borderRadius: 12 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrSrc} width={130} height={130} alt="" />
            </div>
            <div style={{ display: "flex", marginTop: 8, fontSize: 12, color: "#9a8f7a", letterSpacing: 2 }}>
              VERIFICAR SOCIO
            </div>
          </div>
        </div>

        {isDemo && (
          <div style={{ display: "flex", position: "absolute", top: 18, left: 0, right: 0, justifyContent: "center", fontSize: 12, color: "#9a8f7a", letterSpacing: 4 }}>
            DEMO · MOCKUP DE PREVIEW
          </div>
        )}
      </div>
    ),
    { width: 1080, height: 1350 },
  );
}
