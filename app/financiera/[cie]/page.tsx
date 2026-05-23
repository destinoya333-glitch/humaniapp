import type { Metadata } from "next";
import Link from "next/link";
import { getGarajeClient } from "@/lib/ecodrive/garaje";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Verificación de Constancia — ECO DRIVE PLUS S.A.C.",
  description:
    "Verificación pública de Constancia de Ingresos emitida por ECO DRIVE PLUS S.A.C.",
  robots: { index: false, follow: false },
};

interface CertificateData {
  id: string;
  driver_id: string;
  period_start: string;
  period_end: string;
  status: string;
  total_trips: number | null;
  total_net_after_commission: number | null;
  signed_by: string | null;
  generated_at: string | null;
  expires_at: string | null;
  pdf_hash: string | null;
  recipient_entity: string | null;
}

async function lookupByCertNo(cie: string): Promise<CertificateData | null> {
  const sb = getGarajeClient();
  const cleaned = cie.trim().toUpperCase();
  const m = cleaned.match(/^CIE-([0-9A-F]{8})$/);
  if (m) {
    const idPrefix = m[1].toLowerCase();
    const { data } = await sb
      .from("v2_driver_certificate_requests")
      .select(
        "id,driver_id,period_start,period_end,status,total_trips,total_net_after_commission,signed_by,generated_at,expires_at,pdf_hash,recipient_entity",
      )
      .ilike("id", `${idPrefix}%`)
      .maybeSingle();
    if (data) return data as CertificateData;
  }
  return null;
}

/** Constancias OFICIALES de muestra con datos del demo Juan Pérez. Cuando el QR
 *  apunta a uno de estos códigos legacy, renderizamos la constancia completa
 *  online en vez del badge "muestra" — para que la Caja escanee y vea
 *  exactamente el mismo documento online que en papel. */
// Datos ya REDONDEADOS a enteros para que las sumas mostradas coincidan
// exactamente con el TOTAL. Los meses son enteros independientes; los totales
// se calculan como suma de los enteros (no como round del decimal original).
const SAMPLE_MESES = [
  { mes: "Dic 2025", viajes: 580, bruto: 5510, comision: 347, neto: 5163 },
  { mes: "Ene 2026", viajes: 590, bruto: 5605, comision: 353, neto: 5252 },
  { mes: "Feb 2026", viajes: 555, bruto: 5273, comision: 332, neto: 4941 },
  { mes: "Mar 2026", viajes: 595, bruto: 5653, comision: 356, neto: 5297 },
  { mes: "Abr 2026", viajes: 600, bruto: 5700, comision: 359, neto: 5341 },
  { mes: "May 2026", viajes: 565, bruto: 5368, comision: 338, neto: 5030 },
];

const SAMPLE_TOTALS = SAMPLE_MESES.reduce(
  (acc, m) => ({
    viajes: acc.viajes + m.viajes,
    bruto: acc.bruto + m.bruto,
    comision: acc.comision + m.comision,
    neto: acc.neto + m.neto,
  }),
  { viajes: 0, bruto: 0, comision: 0, neto: 0 },
);

function makeSample(opts: { cie: string; caja: string; ciudad: string; cajaSlug: string }): SampleCertificate {
  return {
    ...opts,
    emitida: "22/05/2026",
    rango: "22/11/2025 — 22/05/2026 (6 meses)",
    viajesTotales: SAMPLE_TOTALS.viajes,
    bruto: SAMPLE_TOTALS.bruto,
    comision: SAMPLE_TOTALS.comision,
    neto: SAMPLE_TOTALS.neto,
    meses: SAMPLE_MESES,
  };
}

const SAMPLE_DATASETS: Record<string, SampleCertificate> = {
  "CIE-TRU-2026-00187": makeSample({
    cie: "CIE-TRU-2026-00187",
    caja: "Caja Municipal de Ahorro y Crédito de Trujillo",
    ciudad: "Trujillo",
    cajaSlug: "caja-trujillo",
  }),
  "CIE-AQP-2026-00188": makeSample({
    cie: "CIE-AQP-2026-00188",
    caja: "Caja Municipal de Ahorro y Crédito de Arequipa",
    ciudad: "Arequipa",
    cajaSlug: "caja-arequipa",
  }),
  "CIE-HCO-2026-00189": makeSample({
    cie: "CIE-HCO-2026-00189",
    caja: "Caja Municipal de Ahorro y Crédito de Huancayo",
    ciudad: "Huancayo",
    cajaSlug: "caja-huancayo",
  }),
};

interface SampleCertificate {
  cie: string;
  caja: string;
  ciudad: string;
  cajaSlug: string;
  emitida: string;
  rango: string;
  viajesTotales: number;
  bruto: number;
  comision: number;
  neto: number;
  meses: Array<{ mes: string; viajes: number; bruto: number; comision: number; neto: number }>;
}

function fmt(n: number): string {
  // Montos siempre enteros — Percy pidió quitar decimales para que las cifras
  // del resumen no se corten/desborden en mobile.
  return Math.round(n).toLocaleString("es-PE");
}

export default async function VerificarCiePage({
  params,
  searchParams,
}: {
  params: Promise<{ cie: string }>;
  searchParams: Promise<{ print?: string }>;
}) {
  const { cie } = await params;
  const { print } = await searchParams;
  const cleaned = decodeURIComponent(cie).trim().toUpperCase();
  const autoPrint = print === "1";

  // Sample data: render constancia completa
  const sample = SAMPLE_DATASETS[cleaned];
  if (sample) {
    return <SampleConstancia data={sample} autoPrint={autoPrint} />;
  }

  // Fallback: real DB lookup or "no encontrado"
  const cert = await lookupByCertNo(cleaned);
  const isExpired =
    cert?.expires_at && new Date(cert.expires_at).getTime() < Date.now();
  const status: "verified" | "expired" | "notfound" = cert && !isExpired
    ? "verified"
    : cert && isExpired
    ? "expired"
    : "notfound";

  return <BadgeView cleaned={cleaned} cert={cert} status={status} />;
}

// ───────────────────────────────────────────────────────────────────
// Render: constancia completa estilo identico al HTML offline
// ───────────────────────────────────────────────────────────────────
function SampleConstancia({ data, autoPrint = false }: { data: SampleCertificate; autoPrint?: boolean }) {
  const verifyUrl = `https://ecodriveplus.com/financiera/${data.cie}`;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(verifyUrl)}`;

  return (
    <main style={{ background: "#f5f3f0", minHeight: "100vh", padding: "24px 12px" }}>
      {autoPrint && (
        <script
          dangerouslySetInnerHTML={{
            __html: `window.addEventListener('load',function(){setTimeout(function(){window.print();},700);});`,
          }}
        />
      )}
      <div
        style={{
          maxWidth: 820,
          margin: "0 auto",
          background: "white",
          fontFamily: "'Calibri', 'Helvetica', sans-serif",
          fontSize: "10pt",
          color: "#1a1a1a",
          lineHeight: 1.45,
          padding: "30px 36px",
          boxShadow: "0 4px 28px rgba(0,0,0,0.08)",
          position: "relative",
        }}
      >
        {/* Watermark */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%) rotate(-25deg)",
            fontSize: "70pt",
            color: "rgba(225, 129, 27, 0.07)",
            fontWeight: "bold",
            zIndex: 0,
            letterSpacing: 4,
            pointerEvents: "none",
            whiteSpace: "nowrap",
          }}
        >
          MUESTRA · NO VALIDO
        </div>

        <div style={{ position: "relative", zIndex: 1 }}>
          {/* Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderBottom: "3px solid #E1811B",
              paddingBottom: 12,
              marginBottom: 16,
            }}
          >
            <img
              src="https://rfpmvnoaqibqiqxrmheb.supabase.co/storage/v1/object/public/brand-assets/ecodrive/logo-final-naranja-trim.png"
              alt="EcoDrive+"
              style={{ maxWidth: 260, height: "auto" }}
            />
            <div style={{ textAlign: "right", fontSize: "9pt", color: "#444" }}>
              <strong style={{ color: "#1a1a1a" }}>ECO DRIVE PLUS S.A.C.</strong>
              <br />
              RUC 20613413228
              <br />
              Trujillo, La Libertad, Perú
              <br />
              projas@ecodriveplus.com
              <br />
              https://ecodriveplus.com
            </div>
          </div>

          <h1 style={{ fontSize: "20pt", color: "#E1811B", margin: "4px 0 0" }}>
            CONSTANCIA DE INGRESOS
          </h1>
          <div style={{ fontSize: "10pt", color: "#555", fontStyle: "italic" }}>
            Conductor afiliado a la plataforma Eco Drive Plus S.A.C.
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              margin: "8px 0 18px",
            }}
          >
            <div style={{ textAlign: "right" }}>
              <div style={{ color: "#E1811B", fontWeight: "bold", fontSize: "11pt" }}>
                N° {data.cie}
              </div>
              <div style={{ color: "#666", fontSize: "9.5pt" }}>Emitida: {data.emitida}</div>
            </div>
          </div>

          <SectionTitle>Datos del conductor</SectionTitle>
          <FieldRow label="Nombre completo:" value="Juan Pérez Ramírez" />
          <FieldRow label="DNI:" value="12345678" />
          <FieldRow label="Licencia de conducir:" value="Q12345678" />
          <FieldRow label="Placa vehículo:" value="ABC-123" />
          <FieldRow label="Afiliado desde:" value="01/05/2025" />
          <FieldRow label="Calificación promedio:" value="4.87 / 5.00" />

          <SectionTitle>Periodo acreditado</SectionTitle>
          <FieldRow label="Rango:" value={data.rango} />
          <FieldRow label="Destinado a:" value={data.caja} />
          <FieldRow label="Finalidad:" value="Acreditación de ingresos ante Caja Financiera" />

          <SectionTitle>Resumen de ingresos · Últimos 6 meses</SectionTitle>
          <div
            style={{
              background: "rgba(225, 129, 27, 0.08)",
              border: "1px solid rgba(225, 129, 27, 0.25)",
              borderRadius: 6,
              padding: "14px 18px",
              margin: "8px 0 16px",
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 10,
              textAlign: "center",
            }}
          >
            <StatItem label="Viajes totales" value={data.viajesTotales.toLocaleString("es-PE")} />
            <StatItem label="Ingreso bruto" value={`S/ ${fmt(data.bruto)}`} />
            <StatItem label="Comisión 6.3%" value={`S/ ${fmt(data.comision)}`} />
            <StatItem label="Neto percibido" value={`S/ ${fmt(data.neto)}`} />
          </div>
          <div style={{ fontSize: "9pt", color: "#666", margin: "-8px 0 14px" }}>
            <em>Promedio mensual neto:</em>{" "}
            <strong>S/ {fmt(data.neto / 6)}</strong> ·{" "}
            <em>Promedio diario:</em> <strong>S/ {fmt(data.neto / 180)}</strong> (180 días)
          </div>

          <SectionTitle>Detalle mensual</SectionTitle>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              margin: "6px 0 14px",
              fontSize: "9.5pt",
            }}
          >
            <thead style={{ background: "#E1811B", color: "white" }}>
              <tr>
                <th style={th}>MES</th>
                <th style={th}>VIAJES</th>
                <th style={th}>BRUTO (S/.)</th>
                <th style={th}>COMISIÓN (S/.)</th>
                <th style={th}>NETO (S/.)</th>
              </tr>
            </thead>
            <tbody>
              {data.meses.map((m, i) => (
                <tr key={m.mes} style={{ background: i % 2 === 0 ? "#fff8ed" : "white" }}>
                  <td style={td}>{m.mes}</td>
                  <td style={td}>{m.viajes}</td>
                  <td style={td}>S/. {fmt(m.bruto)}</td>
                  <td style={td}>S/. {fmt(m.comision)}</td>
                  <td style={td}>S/. {fmt(m.neto)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot style={{ background: "#E1811B", color: "white", fontWeight: "bold" }}>
              <tr>
                <td style={td}>TOTAL</td>
                <td style={td}>{data.viajesTotales}</td>
                <td style={td}>S/. {fmt(data.bruto)}</td>
                <td style={td}>S/. {fmt(data.comision)}</td>
                <td style={td}>S/. {fmt(data.neto)}</td>
              </tr>
            </tfoot>
          </table>

          <div style={{ fontSize: "9pt", color: "#555", margin: "10px 0 18px", lineHeight: 1.45 }}>
            Esta constancia es válida para acreditar ingresos como conductor afiliado a Eco Drive Plus S.A.C. (RUC 20613413228) ante entidades financieras, cajas municipales, bancos y autoridades. Verifique la autenticidad escaneando el código QR — el documento <strong>{data.cie}</strong> se valida en línea y expira a los 30 días desde la fecha de emisión.
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginTop: 14, gap: 16 }}>
            <div style={{ width: "42%" }}>
              <div style={{ display: "inline-block", verticalAlign: "middle", marginRight: 10 }}>
                <img
                  src={qrSrc}
                  alt="QR de verificación"
                  style={{
                    width: 90,
                    height: 90,
                    display: "block",
                    border: "1px solid #ddd",
                    background: "white",
                  }}
                />
              </div>
              <div style={{ display: "inline-block", verticalAlign: "middle", fontSize: "9pt", color: "#555" }}>
                <strong style={{ display: "block", color: "#1a1a1a" }}>Escanee para verificar</strong>
                <code style={{ fontSize: "8pt", color: "#888", wordBreak: "break-all" }}>
                  {verifyUrl}
                </code>
              </div>
            </div>
            <div style={{ width: "55%", textAlign: "center" }}>
              {/* Sin paddingTop — firma alineada al borde superior del QR (90px) */}
              <img
                src="https://rfpmvnoaqibqiqxrmheb.supabase.co/storage/v1/object/public/brand-assets/ecodrive/firma-sello-percy.png"
                alt="Firma y sello Percy Rojas - Gerente General"
                style={{ maxWidth: 210, height: "auto", display: "block", margin: "0 auto" }}
              />
            </div>
          </div>

          <div style={{ marginTop: 18, paddingTop: 8, borderTop: "1px solid #ddd", fontSize: "8.5pt", color: "#666", textAlign: "center" }}>
            Emitido en Trujillo, {data.emitida} · Documento {data.cie} · Hash SHA256 incluido en QR
          </div>

          {/* Banner informativo (no se imprime, solo en pantalla) */}
          <div
            style={{
              marginTop: 24,
              padding: "12px 16px",
              background: "#fff8ee",
              border: "1px solid #E1811B",
              borderRadius: 8,
              fontSize: "9pt",
              color: "#5a3e10",
              lineHeight: 1.5,
            }}
          >
            <strong style={{ color: "#E1811B" }}>📋 Verificación online:</strong> Esta es la versión digital del documento físico. Para autenticar constancias <strong>reales</strong> de conductores afiliados (con datos del solicitante), ingrese al portal{" "}
            <Link href="/financiera" style={{ color: "#E1811B", fontWeight: "bold" }}>
              ecodriveplus.com/financiera
            </Link>{" "}
            con las credenciales asignadas a su entidad.
          </div>
        </div>
      </div>
    </main>
  );
}

// ───────────────────────────────────────────────────────────────────
// View fallback: badges (verified/expired/notfound) cuando NO es muestra
// ───────────────────────────────────────────────────────────────────
function BadgeView({
  cleaned,
  cert,
  status,
}: {
  cleaned: string;
  cert: CertificateData | null;
  status: "verified" | "expired" | "notfound";
}) {
  const cfg = {
    verified: { bg: "#10b981", text: "Auténtico verificado" },
    expired: { bg: "#dc2626", text: "Documento expirado" },
    notfound: { bg: "#7A7367", text: "Código no encontrado" },
  }[status];

  return (
    <main className="min-h-screen bg-[#0A0908] text-[#F5EFE7] p-6">
      <div className="max-w-2xl mx-auto">
        <header className="flex items-center gap-4 mb-8 pb-6 border-b border-white/10">
          <div className="h-14 w-14 bg-[url('/ecodriveplus/icon.png')] bg-contain bg-no-repeat bg-center shrink-0" role="img" aria-label="EcoDrive+" />
          <div className="leading-tight">
            <div className="text-2xl font-bold">
              EcoDrive<span className="text-[#E08821]">+</span>
            </div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-[#7A7367] mt-1">
              Verificación de Constancia · ECO DRIVE PLUS S.A.C.
            </div>
          </div>
        </header>

        <div className="bg-[#131110] border border-white/10 rounded-2xl p-6 md:p-8">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
            <div>
              <div className="text-xs uppercase tracking-widest text-[#7A7367] mb-1">N° de constancia</div>
              <div className="text-xl font-mono font-bold text-[#E08821]">{cleaned}</div>
            </div>
            <span
              style={{
                display: "inline-block",
                padding: "4px 12px",
                borderRadius: 999,
                background: cfg.bg,
                color: "white",
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
            >
              {cfg.text}
            </span>
          </div>

          {status === "verified" && cert && (
            <>
              <p className="text-[#C8C0B5] mb-6">
                Este documento fue emitido oficialmente por ECO DRIVE PLUS S.A.C. y se encuentra vigente.
              </p>
              <dl className="grid grid-cols-2 gap-y-4 text-sm">
                <DataField label="Estado">{cert.status}</DataField>
                <DataField label="Período">
                  {new Date(cert.period_start).toLocaleDateString("es-PE")} —{" "}
                  {new Date(cert.period_end).toLocaleDateString("es-PE")}
                </DataField>
                <DataField label="Total de viajes">{cert.total_trips ?? 0}</DataField>
                <DataField label="Ingreso neto">
                  S/. {Number(cert.total_net_after_commission ?? 0).toFixed(2)}
                </DataField>
                <DataField label="Firmado por">{cert.signed_by ?? "—"}</DataField>
                <DataField label="Emitida">
                  {cert.generated_at
                    ? new Date(cert.generated_at).toLocaleDateString("es-PE")
                    : "—"}
                </DataField>
                <DataField label="Expira">
                  {cert.expires_at
                    ? new Date(cert.expires_at).toLocaleDateString("es-PE")
                    : "—"}
                </DataField>
                {cert.recipient_entity && (
                  <DataField label="Destinatario">{cert.recipient_entity}</DataField>
                )}
              </dl>
            </>
          )}

          {status === "expired" && cert && (
            <p className="text-[#C8C0B5] leading-relaxed">
              Este documento fue emitido por ECO DRIVE PLUS S.A.C. pero{" "}
              <strong className="text-[#dc2626]">expiró el{" "}
                {cert.expires_at
                  ? new Date(cert.expires_at).toLocaleDateString("es-PE")
                  : "—"}
              </strong>. Las Constancias tienen vigencia de 30 días desde su emisión.
            </p>
          )}

          {status === "notfound" && (
            <>
              <p className="text-[#C8C0B5] leading-relaxed">
                El código <strong className="font-mono text-[#E08821]">{cleaned}</strong> no fue encontrado en nuestra base de datos.
              </p>
              <div className="mt-5">
                <Link
                  href="/financiera"
                  className="inline-flex items-center gap-2 rounded-lg bg-[#E08821] hover:bg-[#F3A852] text-[#0A0908] font-semibold px-5 py-3 uppercase tracking-widest text-xs transition"
                >
                  Ir al portal verificador
                </Link>
              </div>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-[11px] text-[#7A7367]">
          ECO DRIVE PLUS S.A.C. · RUC 20613413228 · Trujillo, La Libertad — Perú
        </p>
      </div>
    </main>
  );
}

function DataField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-widest text-[#7A7367]">{label}</dt>
      <dd className="mt-1 text-[#F5EFE7]">{children}</dd>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: "9.5pt",
        fontWeight: "bold",
        color: "#444",
        textTransform: "uppercase",
        letterSpacing: 1,
        marginTop: 14,
        marginBottom: 6,
        borderBottom: "1px solid #eee",
        paddingBottom: 3,
      }}
    >
      {children}
    </div>
  );
}

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", padding: "2px 0", fontSize: "9.5pt" }}>
      <span style={{ width: "38%", color: "#666" }}>{label}</span>
      <span style={{ fontWeight: "bold", color: "#1a1a1a" }}>{value}</span>
    </div>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: "8pt", color: "#666", textTransform: "uppercase", letterSpacing: "0.5px" }}>
        {label}
      </div>
      <div
        style={{
          fontSize: "15pt",
          fontWeight: "bold",
          color: "#E1811B",
          marginTop: 3,
        }}
      >
        {value}
      </div>
    </div>
  );
}

const th: React.CSSProperties = { padding: "7px 9px", textAlign: "left", fontWeight: "bold" };
const td: React.CSSProperties = { padding: "6px 9px", borderBottom: "1px solid #f0e0c8" };
