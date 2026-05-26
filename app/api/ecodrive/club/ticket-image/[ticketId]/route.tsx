import { ImageResponse } from "next/og";
import { getClubClient } from "@/lib/ecodrive/club";
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Carga el logo estrella como data URL para embeber en ImageResponse
async function loadStarDataUri(origin: string): Promise<string> {
  try {
    const r = await fetch(`${origin}/ecodriveplus/icon.png`);
    if (!r.ok) return "";
    const buf = await r.arrayBuffer();
    const b64 = Buffer.from(buf).toString("base64");
    return `data:image/png;base64,${b64}`;
  } catch {
    return "";
  }
}

type TicketData = {
  id: string;
  numero_correlativo: number;
  paid_at: string | null;
  created_at: string;
  edicion: {
    numero_edicion: number;
    nombre: string;
    premio_descripcion: string | null;
  } | null;
  miembro: {
    nombre: string;
    dni: string;
    whatsapp: string;
  } | null;
};

async function getTicket(ticketId: string): Promise<TicketData | null> {
  const sb = getClubClient();
  const { data } = await sb
    .from("club_tickets")
    .select(
      "id,numero_correlativo,paid_at,created_at,club_ediciones(numero_edicion,nombre,premio_descripcion),club_miembros(nombre,dni,whatsapp)",
    )
    .eq("id", ticketId)
    .maybeSingle();
  if (!data) return null;
  const d = data as unknown as {
    id: string;
    numero_correlativo: number;
    paid_at: string | null;
    created_at: string;
    club_ediciones: TicketData["edicion"];
    club_miembros: TicketData["miembro"];
  };
  return {
    id: d.id,
    numero_correlativo: d.numero_correlativo,
    paid_at: d.paid_at,
    created_at: d.created_at,
    edicion: d.club_ediciones,
    miembro: d.club_miembros,
  };
}

// Mock data para demo (preview del boleto sin necesidad de ticket real en BD).
// Activar con ?demo=1
const DEMO_TICKET: TicketData = {
  id: "00000000-0000-0000-0000-000000000042",
  numero_correlativo: 42,
  paid_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  edicion: {
    numero_edicion: 1,
    nombre: "BYD Yuan Pro 2023 — 320 km autonomía",
    premio_descripcion: "BYD Yuan Pro 2023, SUV 100% eléctrica, autonomía 320 km",
  },
  miembro: {
    nombre: "Percy Manuel Rojas Rubio",
    dni: "18213129",
    whatsapp: "51998102258",
  },
};

export async function GET(req: NextRequest, ctx: { params: Promise<{ ticketId: string }> }) {
  const { ticketId } = await ctx.params;
  const isDemo = req.nextUrl.searchParams.get("demo") === "1";
  const origin = req.nextUrl.origin;
  const t = isDemo ? DEMO_TICKET : await getTicket(ticketId);
  if (!t) {
    return new Response("ticket not found", { status: 404 });
  }
  const starDataUri = await loadStarDataUri(origin);
  const verifyUrl = `${origin}/ecodriveplus/club?verify=${t.id}`;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(verifyUrl)}`;

  const fechaCompra = new Date(t.paid_at ?? t.created_at).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const numero = String(t.numero_correlativo).padStart(4, "0");
  const edicionN = String(t.edicion?.numero_edicion ?? 1).padStart(2, "0");

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          background:
            "radial-gradient(70% 60% at 12% 18%, rgba(224, 136, 33, 0.30), transparent 60%), radial-gradient(80% 70% at 50% 95%, rgba(184, 106, 18, 0.40), transparent 70%), #0A0908",
          padding: "48px 56px",
          color: "#F5EFE7",
          fontFamily: "serif",
          position: "relative",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {starDataUri && (
            <img src={starDataUri} alt="" width={68} height={68} style={{ objectFit: "contain" }} />
          )}
          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
            <div style={{ fontSize: 32, fontWeight: 600 }}>
              EcoDrive<span style={{ color: "#E08821" }}>+</span> Club
            </div>
            <div
              style={{
                fontSize: 13,
                color: "#7A7367",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                marginTop: 8,
                fontFamily: "monospace",
              }}
            >
              Boleto Oficial · Edicion #{edicionN}
            </div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <div
              style={{
                fontSize: 11,
                color: "#7A7367",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                fontFamily: "monospace",
              }}
            >
              N° boleto
            </div>
            <div
              style={{
                fontSize: 13,
                color: "#E08821",
                letterSpacing: "0.18em",
                marginTop: 4,
                fontFamily: "monospace",
              }}
            >
              {t.id.slice(0, 8).toUpperCase()}
            </div>
          </div>
        </div>

        {/* Linea separadora */}
        <div
          style={{
            display: "flex",
            height: 1,
            background: "rgba(224,136,33,0.5)",
            marginTop: 32,
            marginBottom: 32,
          }}
        />

        {/* NUMERO GIGANTE */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 14,
              color: "#7A7367",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              fontFamily: "monospace",
              marginBottom: 8,
            }}
          >
            Tu numero de la suerte
          </div>
          <div
            style={{
              fontSize: 220,
              fontWeight: 700,
              color: "#E08821",
              letterSpacing: "-0.04em",
              lineHeight: 1,
              marginTop: -8,
            }}
          >
            #{numero}
          </div>
        </div>

        {/* Datos del titular */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 32,
            gap: 14,
          }}
        >
          <Row label="Titular" value={t.miembro?.nombre ?? "—"} />
          <Row label="DNI" value={t.miembro?.dni ?? "—"} mono />
          <Row label="Premio" value={t.edicion?.nombre ?? "BYD Yuan Pro 2023"} />
          <Row label="Compra" value={fechaCompra} />
          <Row label="Entrega" value="Trujillo, La Libertad - Peru" />
        </div>

        {/* Footer con QR + RUC */}
        <div
          style={{
            display: "flex",
            marginTop: "auto",
            paddingTop: 24,
            borderTop: "1px solid rgba(245,239,231,0.08)",
            alignItems: "flex-end",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", maxWidth: 540 }}>
            <div
              style={{
                fontSize: 12,
                color: "#7A7367",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                fontFamily: "monospace",
                marginBottom: 6,
              }}
            >
              Eco Drive Plus S.A.C. · RUC 20613413228
            </div>
            <div style={{ fontSize: 14, color: "#C8C0B5", lineHeight: 1.4 }}>
              Sorteo presencial certificado por notario y fedatario.
              Trujillo, La Libertad. Conserva este boleto - vale para reclamar el premio.
            </div>
            <div
              style={{
                fontSize: 11,
                color: "#E08821",
                marginTop: 8,
                fontFamily: "monospace",
                letterSpacing: "0.16em",
              }}
            >
              ecodriveplus.com/club
            </div>
          </div>
          {/* QR */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: 8,
              background: "#F5EFE7",
              borderRadius: 8,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrSrc} width={120} height={120} alt="" />
          </div>
        </div>

        {/* Sello esquina */}
        <div
          style={{
            position: "absolute",
            bottom: 40,
            right: 200,
            transform: "rotate(-12deg)",
            border: "3px solid rgba(224,136,33,0.45)",
            color: "rgba(224,136,33,0.55)",
            padding: "6px 16px",
            fontSize: 18,
            letterSpacing: "0.22em",
            fontFamily: "monospace",
            textTransform: "uppercase",
            display: "flex",
          }}
        >
          Confirmado
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1350,
    },
  );
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 18 }}>
      <div
        style={{
          fontSize: 12,
          color: "#7A7367",
          letterSpacing: "0.20em",
          textTransform: "uppercase",
          fontFamily: "monospace",
          width: 140,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 26,
          color: "#F5EFE7",
          fontFamily: mono ? "monospace" : "serif",
          letterSpacing: mono ? "0.10em" : "-0.01em",
          flex: 1,
        }}
      >
        {value}
      </div>
    </div>
  );
}
