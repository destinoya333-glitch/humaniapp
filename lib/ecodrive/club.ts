import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function getClubClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export type TipoPerfil = "publico" | "interno_pasajero" | "interno_conductor";
export type Modalidad = "ticket" | "pass";

export function normalizeWhatsapp(input: string): string {
  const digits = (input || "").replace(/\D/g, "");
  if (!digits) return "";
  return digits.startsWith("51") ? digits : `51${digits}`;
}

export function isValidDni(dni: string): boolean {
  return /^\d{8}$/.test((dni || "").trim());
}

export function maskNombre(nombre: string): string {
  const parts = (nombre || "").trim().split(/\s+/);
  if (parts.length === 0) return "—";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[1][0]}.`;
}

export async function getRandomAvailableNumbers(
  sb: SupabaseClient,
  edicionId: string,
  metaTickets: number,
  count = 5
): Promise<number[]> {
  const { data } = await sb
    .from("club_tickets")
    .select("numero_correlativo")
    .eq("edicion_id", edicionId);
  const { data: reservas } = await sb
    .from("club_reservas")
    .select("numero_correlativo")
    .eq("edicion_id", edicionId)
    .gt("expira_en", new Date().toISOString());
  const taken = new Set<number>([
    ...(data ?? []).map((r) => r.numero_correlativo as number),
    ...(reservas ?? []).map((r) => r.numero_correlativo as number),
  ]);
  const out: number[] = [];
  let attempts = 0;
  while (out.length < count && attempts < count * 50) {
    const n = 1 + Math.floor(Math.random() * metaTickets);
    if (!taken.has(n) && !out.includes(n)) out.push(n);
    attempts++;
  }
  return out.sort((a, b) => a - b);
}

export async function pricingFor(
  sb: SupabaseClient,
  modalidad: Modalidad,
  tipoPerfil: TipoPerfil,
  edicionId?: string
): Promise<{ precio: number; descripcion: string }> {
  const { data: prog } = await sb.from("club_programa").select("*").limit(1).single();
  const interno = tipoPerfil !== "publico";
  if (modalidad === "pass") {
    return {
      precio: interno ? Number(prog.pass_precio_interno) : Number(prog.pass_precio_publico),
      descripcion: interno
        ? "EcoDrive+ Club — Pass anual precio interno"
        : "EcoDrive+ Club — Pass anual precio público",
    };
  }
  if (edicionId) {
    const { data: ed } = await sb
      .from("club_ediciones")
      .select("ticket_precio_publico,ticket_precio_interno")
      .eq("id", edicionId)
      .single();
    if (ed?.ticket_precio_publico && ed?.ticket_precio_interno) {
      return {
        precio: interno ? Number(ed.ticket_precio_interno) : Number(ed.ticket_precio_publico),
        descripcion: interno ? "Ticket suelto interno EcoDrive+" : "Ticket suelto público",
      };
    }
  }
  return {
    precio: interno ? Number(prog.ticket_precio_interno) : Number(prog.ticket_precio_publico),
    descripcion: interno ? "Ticket suelto interno EcoDrive+" : "Ticket suelto público",
  };
}
