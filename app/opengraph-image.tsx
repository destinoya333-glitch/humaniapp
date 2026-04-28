import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "ActivosYA — Compra negocios digitales que ya facturan";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #0a0a0a 0%, #1a0d20 50%, #0a0a0a 100%)",
          padding: 70,
          color: "white",
          fontFamily: "system-ui",
          position: "relative",
        }}
      >
        {/* Cosmic orb */}
        <div
          style={{
            position: "absolute",
            top: -150,
            right: -150,
            width: 600,
            height: 600,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(245,158,11,0.15) 0%, transparent 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -100,
            left: -100,
            width: 400,
            height: 400,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(168,85,247,0.10) 0%, transparent 70%)",
          }}
        />

        {/* Logo / brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: 14,
              background: "linear-gradient(135deg, #f59e0b, #ea580c)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 36,
              fontWeight: 900,
              color: "#0a0a0a",
            }}
          >
            A
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -1 }}>ActivosYA</div>
            <div style={{ fontSize: 14, color: "#a1a1aa" }}>activosya.com</div>
          </div>
        </div>

        {/* Headline */}
        <div style={{ marginTop: 80, display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 68,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: -2,
              maxWidth: 950,
            }}
          >
            Compra negocios digitales que <span style={{ color: "#f59e0b" }}>ya facturan</span>
          </div>
          <div
            style={{
              marginTop: 30,
              fontSize: 24,
              color: "#a1a1aa",
              lineHeight: 1.4,
              maxWidth: 850,
            }}
          >
            Marketplace de activos SaaS llave-en-mano · Renta o compra · Soporte 24/7 · Garantía 30
            días
          </div>
        </div>

        {/* Footer chips */}
        <div
          style={{
            position: "absolute",
            bottom: 60,
            left: 70,
            right: 70,
            display: "flex",
            gap: 14,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <Chip label="Miss Sofia" />
          <Chip label="TuDestinoYa" />
          <Chip label="TuNoviaIA" />
          <Chip label="TuPedidoYa" />
          <Chip label="TuReservaYa" />
          <Chip label="EcoDrive+" />
        </div>
      </div>
    ),
    { ...size }
  );
}

function Chip({ label }: { label: string }) {
  return (
    <div
      style={{
        padding: "10px 20px",
        borderRadius: 999,
        border: "1px solid rgba(245,158,11,0.25)",
        background: "rgba(245,158,11,0.05)",
        color: "#fbbf24",
        fontSize: 18,
        fontWeight: 500,
      }}
    >
      {label}
    </div>
  );
}
