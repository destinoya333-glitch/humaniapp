import { ImageResponse } from "next/og";
import { getClubClient } from "@/lib/ecodrive/club";
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TicketData = {
  id: string;
  numero_correlativo: number;
  paid_at: string | null;
  created_at: string;
  edicion: { numero_edicion: number; nombre: string; premio_descripcion: string | null } | null;
  miembro: { nombre: string; dni: string; whatsapp: string } | null;
};

const DEMO_TICKET: TicketData = {
  id: "00000000-0000-0000-0000-000000000042",
  numero_correlativo: 42,
  paid_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  edicion: {
    numero_edicion: 1,
    nombre: "BYD Yuan Pro 2023",
    premio_descripcion: "SUV 100% eléctrica · 320 km autonomía",
  },
  miembro: {
    nombre: "Percy Manuel Rojas Rubio",
    dni: "18213129",
    whatsapp: "51998102258",
  },
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

const FONT = "system-ui, -apple-system, sans-serif";

export async function GET(req: NextRequest, ctx: { params: Promise<{ ticketId: string }> }) {
  const { ticketId } = await ctx.params;
  const isDemo = req.nextUrl.searchParams.get("demo") === "1";
  const t = isDemo ? DEMO_TICKET : await getTicket(ticketId);
  if (!t) return new Response("ticket not found", { status: 404 });

  const origin = req.nextUrl.origin;
  const verifyUrl = `${origin}/club?verify=${t.id}`;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(verifyUrl)}&bgcolor=ffffff&color=0a0908`;

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
        {/* HEADER */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 52, fontWeight: 700, letterSpacing: -1 }}>
              EcoDrive<span style={{ color: "#E08821" }}>+</span>
            </div>
            <div style={{ display: "flex", fontSize: 22, color: "#E08821", marginTop: 4, fontStyle: "italic" }}>
              Club
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <div style={{ display: "flex", fontSize: 14, color: "#9a8f7a", letterSpacing: 3 }}>
              BOLETO OFICIAL · EDICION #{edicionN}
            </div>
            <div style={{ display: "flex", fontSize: 16, color: "#E08821", marginTop: 6, letterSpacing: 2 }}>
              N° BOLETO {t.id.slice(0, 8).toUpperCase()}
            </div>
          </div>
        </div>

        {/* SEPARADOR */}
        <div style={{ display: "flex", height: 2, background: "#E08821", marginTop: 40, marginBottom: 50, opacity: 0.7 }} />

        {/* NUMERO GIGANTE */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ display: "flex", fontSize: 18, color: "#9a8f7a", letterSpacing: 4 }}>
            TU NUMERO DE SOCIO
          </div>
          <div style={{ display: "flex", fontSize: 240, fontWeight: 800, color: "#E08821", lineHeight: 1, marginTop: 12, letterSpacing: -8 }}>
            #{numero}
          </div>
        </div>

        {/* DATOS */}
        <div style={{ display: "flex", flexDirection: "column", marginTop: 50, gap: 18 }}>
          <div style={{ display: "flex", flexDirection: "row", gap: 24 }}>
            <div style={{ display: "flex", width: 200, fontSize: 14, color: "#9a8f7a", letterSpacing: 2 }}>
              TITULAR
            </div>
            <div style={{ display: "flex", fontSize: 28, color: "#F5EFE7", fontWeight: 600 }}>
              {t.miembro?.nombre ?? "—"}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "row", gap: 24 }}>
            <div style={{ display: "flex", width: 200, fontSize: 14, color: "#9a8f7a", letterSpacing: 2 }}>
              DNI
            </div>
            <div style={{ display: "flex", fontSize: 24, color: "#F5EFE7", letterSpacing: 2 }}>
              {t.miembro?.dni ?? "—"}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "row", gap: 24 }}>
            <div style={{ display: "flex", width: 200, fontSize: 14, color: "#9a8f7a", letterSpacing: 2 }}>
              PREMIO
            </div>
            <div style={{ display: "flex", fontSize: 24, color: "#FFA84A" }}>
              {t.edicion?.nombre ?? "BYD Yuan Pro 2023"}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "row", gap: 24 }}>
            <div style={{ display: "flex", width: 200, fontSize: 14, color: "#9a8f7a", letterSpacing: 2 }}>
              COMPRA
            </div>
            <div style={{ display: "flex", fontSize: 22, color: "#F5EFE7" }}>{fechaCompra}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "row", gap: 24 }}>
            <div style={{ display: "flex", width: 200, fontSize: 14, color: "#9a8f7a", letterSpacing: 2 }}>
              ENTREGA
            </div>
            <div style={{ display: "flex", fontSize: 22, color: "#F5EFE7" }}>
              Trujillo, La Libertad
            </div>
          </div>
        </div>

        {/* FOOTER + QR */}
        <div
          style={{
            display: "flex",
            marginTop: "auto",
            paddingTop: 30,
            borderTop: "1px solid #3a2a18",
            justifyContent: "space-between",
            alignItems: "flex-end",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 13, color: "#7a6f5a", letterSpacing: 2 }}>
              ECO DRIVE PLUS S.A.C. · RUC 20613413228
            </div>
            <div style={{ display: "flex", marginTop: 8, fontSize: 14, color: "#C8C0B5", maxWidth: 600 }}>
              Sorteo presencial con notario público y casino oficial. Conserva este boleto.
            </div>
            <div style={{ display: "flex", marginTop: 12, fontSize: 13, color: "#E08821", letterSpacing: 2 }}>
              ECODRIVEPLUS.COM/CLUB
            </div>
          </div>
          <div style={{ display: "flex", padding: 10, background: "#F5EFE7", borderRadius: 12 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrSrc} width={130} height={130} alt="" />
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
