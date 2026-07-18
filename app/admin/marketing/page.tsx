// =====================================================================
// La Ventana de Publicidad — panel de control /admin/marketing
// Fase 1: análisis de efectividad de lo ya publicado (FB + IG).
// Auth: mismo passcode que /admin/ecodrive (ECODRIVE_ADMIN_PASSCODE).
// =====================================================================
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { topPosts, resumenGlobal, mejorHora, guardarPostConMetrica } from "@/lib/marketing/db";
import { fetchAllMeta } from "@/lib/marketing/meta";
import { fetchGA4Summary } from "@/lib/marketing/ga4";

export const dynamic = "force-dynamic";

const COOKIE = "marketing_admin";
const PATH = "/admin/marketing";
const REDES: Record<string, { e: string; c: string }> = {
  facebook: { e: "🔵", c: "#1877F2" },
  instagram: { e: "🟣", c: "#C13584" },
  tiktok: { e: "⚫", c: "#000" },
};

function passcode() {
  return process.env.ECODRIVE_ADMIN_PASSCODE;
}

async function isAuthorized(): Promise<boolean> {
  const expected = passcode();
  if (!expected) return false;
  const c = await cookies();
  return c.get(COOKIE)?.value === expected;
}

async function loginAction(formData: FormData): Promise<void> {
  "use server";
  const expected = passcode();
  const submitted = String(formData.get("p") || "");
  if (expected && submitted === expected) {
    const c = await cookies();
    c.set(COOKIE, expected, { httpOnly: true, sameSite: "lax", path: "/", secure: true });
  }
  redirect(PATH);
}

async function logoutAction(): Promise<void> {
  "use server";
  const c = await cookies();
  c.delete({ name: COOKIE, path: "/" });
  redirect(PATH);
}

async function syncAction(): Promise<void> {
  "use server";
  const { posts } = await fetchAllMeta();
  for (const p of posts) await guardarPostConMetrica(p);
  revalidatePath(PATH);
}

const card: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #eee",
  borderRadius: 12,
  padding: 16,
  boxShadow: "0 1px 3px rgba(0,0,0,.06)",
};

function recorta(s: string | null, n = 70): string {
  if (!s) return "(sin texto)";
  const c = s.replace(/\s+/g, " ").trim();
  return c.length > n ? c.slice(0, n) + "…" : c;
}

export default async function MarketingAdmin() {
  if (!(await isAuthorized())) {
    return (
      <main style={{ maxWidth: 360, margin: "80px auto", fontFamily: "system-ui" }}>
        <h1 style={{ fontSize: 22 }}>📊 Ventana de Publicidad</h1>
        <p style={{ color: "#666", fontSize: 14 }}>Ingresa el passcode de administración.</p>
        <form action={loginAction} style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <input
            name="p"
            type="password"
            placeholder="passcode"
            style={{ flex: 1, padding: 10, border: "1px solid #ccc", borderRadius: 8 }}
          />
          <button style={{ padding: "10px 16px", background: "#E08821", color: "#fff", border: 0, borderRadius: 8 }}>
            Entrar
          </button>
        </form>
      </main>
    );
  }

  const [resumen, mejores, peores, horas, ga4] = await Promise.all([
    resumenGlobal(),
    topPosts(8, "mejores"),
    topPosts(5, "peores"),
    mejorHora(),
    fetchGA4Summary(28),
  ]);

  const sinDatos = resumen.totalPosts === 0;

  return (
    <main style={{ maxWidth: 1000, margin: "24px auto", padding: "0 16px", fontFamily: "system-ui", color: "#222" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: 24, margin: 0 }}>📊 Ventana de Publicidad</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <form action={syncAction}>
            <button style={{ padding: "8px 14px", background: "#E08821", color: "#fff", border: 0, borderRadius: 8 }}>
              🔄 Sincronizar ahora
            </button>
          </form>
          <form action={logoutAction}>
            <button style={{ padding: "8px 14px", background: "#eee", border: 0, borderRadius: 8 }}>Salir</button>
          </form>
        </div>
      </header>

      {sinDatos ? (
        <div style={{ ...card, marginTop: 20, background: "#FFF7ED", borderColor: "#FED7AA" }}>
          <strong>Aún no hay datos.</strong>
          <p style={{ color: "#92400E", fontSize: 14, marginTop: 8 }}>
            Configura <code>ECODRIVE_MARKETING_TOKEN</code> en Vercel (token de Meta con permisos de insights) y pulsa
            “Sincronizar ahora”. Mientras tanto el panel está listo y esperando datos.
          </p>
        </div>
      ) : (
        <>
          {/* Resumen */}
          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12, marginTop: 20 }}>
            <div style={card}>
              <div style={{ color: "#888", fontSize: 12 }}>POSTS ANALIZADOS</div>
              <div style={{ fontSize: 26, fontWeight: 700 }}>{resumen.totalPosts}</div>
            </div>
            <div style={card}>
              <div style={{ color: "#888", fontSize: 12 }}>ALCANCE TOTAL</div>
              <div style={{ fontSize: 26, fontWeight: 700 }}>{resumen.alcanceTotal.toLocaleString("es-PE")}</div>
            </div>
            <div style={card}>
              <div style={{ color: "#888", fontSize: 12 }}>ENGAGEMENT TOTAL</div>
              <div style={{ fontSize: 26, fontWeight: 700 }}>{resumen.engagementTotal.toLocaleString("es-PE")}</div>
            </div>
            <div style={card}>
              <div style={{ color: "#888", fontSize: 12 }}>SCORE PROMEDIO</div>
              <div style={{ fontSize: 26, fontWeight: 700 }}>{resumen.scorePromedio}</div>
            </div>
          </section>

          {/* Por red */}
          <section style={{ ...card, marginTop: 16 }}>
            <h2 style={{ fontSize: 16, marginTop: 0 }}>Por red</h2>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              {Object.entries(resumen.porRed).map(([red, r]) => (
                <div key={red} style={{ minWidth: 180 }}>
                  <strong>{REDES[red]?.e || "•"} {red}</strong>
                  <div style={{ fontSize: 13, color: "#555" }}>
                    {r.posts} posts · {r.alcance.toLocaleString("es-PE")} alcance · {r.engagement.toLocaleString("es-PE")} eng.
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* GA4 — tráfico y conversiones de la web */}
          {ga4 && (
            <section style={{ ...card, marginTop: 16 }}>
              <h2 style={{ fontSize: 16, marginTop: 0 }}>🌐 Web (Google Analytics · {ga4.rango})</h2>
              <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 12 }}>
                <div><div style={{ color: "#888", fontSize: 12 }}>USUARIOS</div><div style={{ fontSize: 22, fontWeight: 700 }}>{ga4.usuarios.toLocaleString("es-PE")}</div></div>
                <div><div style={{ color: "#888", fontSize: 12 }}>SESIONES</div><div style={{ fontSize: 22, fontWeight: 700 }}>{ga4.sesiones.toLocaleString("es-PE")}</div></div>
                <div><div style={{ color: "#888", fontSize: 12 }}>VISTAS</div><div style={{ fontSize: 22, fontWeight: 700 }}>{ga4.vistas.toLocaleString("es-PE")}</div></div>
                <div><div style={{ color: "#888", fontSize: 12 }}>CONVERSIONES</div><div style={{ fontSize: 22, fontWeight: 700, color: "#E08821" }}>{ga4.conversiones.toLocaleString("es-PE")}</div></div>
              </div>
              {ga4.porCanal.length > 0 && (
                <div style={{ fontSize: 13, color: "#555" }}>
                  <strong>Por canal:</strong>{" "}
                  {ga4.porCanal.map((c) => `${c.canal} (${c.sesiones})`).join(" · ")}
                </div>
              )}
            </section>
          )}

          {/* Mejor hora */}
          {horas.length > 0 && (
            <section style={{ ...card, marginTop: 16 }}>
              <h2 style={{ fontSize: 16, marginTop: 0 }}>⏰ Mejores horas para publicar (hora Lima)</h2>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {horas.slice(0, 6).map((h) => (
                  <span key={h.hora} style={{ background: "#FEF3C7", padding: "6px 10px", borderRadius: 8, fontSize: 13 }}>
                    {String(h.hora).padStart(2, "0")}:00 · {h.engagementProm} eng.
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Ranking */}
          <Ranking titulo="🏆 Mejores publicaciones" posts={mejores} />
          <Ranking titulo="⚠️ A mejorar / replantear" posts={peores} />
        </>
      )}

      <footer style={{ marginTop: 32, color: "#aaa", fontSize: 12 }}>
        Fase 1 = análisis. Fase 2 (publicación automática con aprobación por WhatsApp) pendiente. TikTok + GA4 pendientes
        de conexión.
      </footer>
    </main>
  );
}

function Ranking({ titulo, posts }: { titulo: string; posts: Awaited<ReturnType<typeof topPosts>> }) {
  if (!posts.length) return null;
  return (
    <section style={{ ...card, marginTop: 16 }}>
      <h2 style={{ fontSize: 16, marginTop: 0 }}>{titulo}</h2>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ textAlign: "left", color: "#888" }}>
            <th style={{ padding: "6px 4px" }}>Red</th>
            <th>Publicación</th>
            <th style={{ textAlign: "right" }}>Alcance</th>
            <th style={{ textAlign: "right" }}>Eng.</th>
            <th style={{ textAlign: "right" }}>Score</th>
          </tr>
        </thead>
        <tbody>
          {posts.map((p) => (
            <tr key={p.uid} style={{ borderTop: "1px solid #f0f0f0" }}>
              <td style={{ padding: "8px 4px" }}>{REDES[p.red]?.e || "•"}</td>
              <td>
                {p.permalink ? (
                  <a href={p.permalink} target="_blank" rel="noreferrer" style={{ color: "#0A66C2", textDecoration: "none" }}>
                    {recorta(p.caption)}
                  </a>
                ) : (
                  recorta(p.caption)
                )}
              </td>
              <td style={{ textAlign: "right" }}>{p.alcance.toLocaleString("es-PE")}</td>
              <td style={{ textAlign: "right" }}>{p.engagement.toLocaleString("es-PE")}</td>
              <td style={{ textAlign: "right", fontWeight: 700 }}>{p.score}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
