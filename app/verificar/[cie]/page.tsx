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
  // Formato esperado: CIE-XXXXXXXX (id slice 8) o CIE-TRU-2026-NNNNN (legacy/muestra)
  // Intentamos buscar por id (uuid) cuando los 8 chars match.
  const sb = getGarajeClient();

  // Match legacy CIE-XXX-YYYY-NNNNN o CIE-XXXXXXXX
  const cleaned = cie.trim().toUpperCase();

  // Strategy 1: si después de "CIE-" hay 8 chars hex, buscar por id
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

function StatusBadge({ status }: { status: "verified" | "sample" | "expired" | "notfound" }) {
  const cfg = {
    verified: { bg: "#10b981", text: "Auténtico verificado" },
    sample: { bg: "#E08821", text: "Documento de muestra" },
    expired: { bg: "#dc2626", text: "Documento expirado" },
    notfound: { bg: "#7A7367", text: "Código no encontrado" },
  }[status];
  return (
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
  );
}

export default async function VerificarCiePage({
  params,
}: {
  params: Promise<{ cie: string }>;
}) {
  const { cie } = await params;
  const cleaned = decodeURIComponent(cie).trim().toUpperCase();
  const isValidFormat = /^CIE-[0-9A-Z-]+$/.test(cleaned);

  if (!isValidFormat) {
    return (
      <main className="min-h-screen bg-[#0A0908] text-[#F5EFE7] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-[#131110] border border-white/10 rounded-2xl p-6 text-center">
          <StatusBadge status="notfound" />
          <h1 className="mt-4 text-2xl font-bold">Código no válido</h1>
          <p className="mt-3 text-sm text-[#C8C0B5]">
            El código <code className="font-mono text-[#E08821]">{cleaned}</code> no tiene el formato esperado de una Constancia EcoDrive+.
          </p>
          <p className="mt-4 text-xs text-[#7A7367]">
            Si recibió un documento con este código, contacte a{" "}
            <a href="mailto:projas@ecodriveplus.com" className="text-[#E08821] hover:underline">
              projas@ecodriveplus.com
            </a>
            .
          </p>
        </div>
      </main>
    );
  }

  const cert = await lookupByCertNo(cleaned);
  const isExpired =
    cert?.expires_at && new Date(cert.expires_at).getTime() < Date.now();
  const status: "verified" | "sample" | "expired" =
    cert && !isExpired ? "verified" : cert && isExpired ? "expired" : "sample";

  return (
    <main className="min-h-screen bg-[#0A0908] text-[#F5EFE7] p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
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
            <StatusBadge status={status} />
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
              Este documento fue emitido oficialmente por ECO DRIVE PLUS S.A.C. pero{" "}
              <strong className="text-[#dc2626]">expiró el{" "}
                {cert.expires_at
                  ? new Date(cert.expires_at).toLocaleDateString("es-PE")
                  : "—"}
              </strong>. Las Constancias de Ingresos tienen vigencia de 30 días desde su emisión. Solicite al conductor que genere una nueva constancia con datos actualizados.
            </p>
          )}

          {status === "sample" && (
            <>
              <p className="text-[#C8C0B5] leading-relaxed mb-4">
                Este código <strong className="font-mono text-[#E08821]">{cleaned}</strong> corresponde a una <strong>constancia de muestra</strong> que se entrega a entidades financieras aliadas para evaluar el formato del documento oficial (firma, sello, QR, hash SHA256).
              </p>
              <p className="text-[#C8C0B5] leading-relaxed">
                Para verificar una <strong>constancia real</strong> de un conductor afiliado, ingrese al portal de verificación con sus credenciales asignadas:
              </p>
              <div className="mt-5">
                <Link
                  href="/verificar"
                  className="inline-flex items-center gap-2 rounded-lg bg-[#E08821] hover:bg-[#F3A852] text-[#0A0908] font-semibold px-5 py-3 uppercase tracking-widest text-xs transition"
                >
                  Ir al portal verificador
                </Link>
              </div>
              <p className="mt-6 text-xs text-[#7A7367] leading-relaxed">
                ¿No tiene credenciales? Solicítelas a{" "}
                <a href="mailto:projas@ecodriveplus.com" className="text-[#E08821] hover:underline">
                  projas@ecodriveplus.com
                </a>{" "}
                indicando la entidad financiera que representa.
              </p>
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
