import { ImageResponse } from "next/og";

export const alt = "EcoDrive+ — Pides tu carro como pides delivery";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #0A0A0A 0%, #1a0a00 60%, #2a1500 100%)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: 80,
          color: "white",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Badge superior */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            padding: "10px 24px",
            border: "1px solid rgba(245, 158, 11, 0.3)",
            background: "rgba(245, 158, 11, 0.05)",
            borderRadius: 999,
            color: "#f59e0b",
            fontSize: 22,
            marginBottom: 36,
          }}
        >
          <div
            style={{
              display: "flex",
              width: 12,
              height: 12,
              borderRadius: 999,
              background: "#f59e0b",
            }}
          />
          <div style={{ display: "flex" }}>Activo en Trujillo · 88 conductores · 231 clientes</div>
        </div>

        {/* Título línea 1 */}
        <div
          style={{
            display: "flex",
            fontSize: 96,
            fontWeight: 800,
            lineHeight: 1,
            letterSpacing: -2,
            marginBottom: 8,
          }}
        >
          Pides tu carro como
        </div>

        {/* Título línea 2 */}
        <div
          style={{
            display: "flex",
            fontSize: 96,
            fontWeight: 800,
            lineHeight: 1,
            letterSpacing: -2,
            color: "#f59e0b",
            marginBottom: 40,
          }}
        >
          pides delivery
        </div>

        {/* Subtítulo línea 1 */}
        <div
          style={{
            display: "flex",
            fontSize: 32,
            color: "#a1a1aa",
            textAlign: "center",
          }}
        >
          El primer servicio de viajes 100% por WhatsApp en Perú.
        </div>

        {/* Subtítulo línea 2 */}
        <div
          style={{
            display: "flex",
            fontSize: 32,
            color: "#a1a1aa",
            textAlign: "center",
            marginTop: 8,
          }}
        >
          Sin app, sin descargas. Solo dile Hola al bot.
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            position: "absolute",
            bottom: 40,
            color: "#71717a",
            fontSize: 22,
          }}
        >
          ecodriveplus.com
        </div>
      </div>
    ),
    { ...size }
  );
}
