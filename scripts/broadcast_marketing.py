"""
Broadcast Marketing — envía templates Meta MARKETING a clientes por servicio.

Servicios soportados:
  - club        → club_miembros (filtra Pass activo)
  - sofia       → TODO (tabla sofia_users / similar)
  - destino     → TODO (tabla destinoya_users / similar)
  - operadores  → TODO (operadores ActivosYA)

Uso:
  python scripts/broadcast_marketing.py \
      --service club \
      --template club_pass_renovacion_v2 \
      --body-params "Percy" "S/.79" "3" \
      --dry

Sin --dry, envía de verdad. Con --dry solo lista los WhatsApp que enviaría.

Requiere env vars (pull de Vercel con `vercel env pull .env`):
  - NEXT_PUBLIC_SUPABASE_URL
  - SUPABASE_SERVICE_ROLE_KEY
  - ECODRIVE_META_PHONE_ID
  - ECODRIVE_META_ACCESS_TOKEN

IMPORTANTE — Opt-out:
  Antes de cada envío se filtran números presentes en `marketing_opt_out`.
  Cada template MARKETING DEBE terminar con "Responde STOP para no recibir mas"
  (los nuestros club_*_v2 NO lo dicen explícitamente — REVISAR antes de bombardear).

NO ejecutar hasta que Percy autorice campañas. Hoy = código en standby.
"""
from __future__ import annotations
import argparse, json, os, sys, time
from urllib import request as urlreq, parse as urlparse, error as urlerr

SUPA_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
SRK = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
META_PHONE_ID = os.environ.get("ECODRIVE_META_PHONE_ID", "")
META_TOKEN = os.environ.get("ECODRIVE_META_ACCESS_TOKEN", "")


def fail(msg: str) -> None:
    print(f"ERROR: {msg}", file=sys.stderr); sys.exit(1)


def supa(method: str, path: str, params: dict | None = None, body: dict | list | None = None):
    if not (SUPA_URL and SRK):
        fail("Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY")
    qs = ("?" + urlparse.urlencode(params)) if params else ""
    req = urlreq.Request(f"{SUPA_URL}/rest/v1{path}{qs}", method=method, headers={
        "apikey": SRK, "Authorization": f"Bearer {SRK}",
        "Content-Type": "application/json", "Accept": "application/json",
    })
    data = json.dumps(body).encode("utf-8") if body is not None else None
    with urlreq.urlopen(req, data=data, timeout=30) as r:
        return json.loads(r.read().decode("utf-8"))


def load_recipients(service: str) -> list[dict]:
    """Devuelve lista de {whatsapp, nombre} del servicio, excluye opt-outs."""
    opted_out = {r["whatsapp"] for r in supa("GET", "/marketing_opt_out", {"select": "whatsapp"})}
    if service == "club":
        # Solo miembros con Pass activo. Workaround: pull miembros + pull pass activos + join in-memory.
        miembros = supa("GET", "/club_miembros", {"select": "id,nombre,whatsapp"})
        pass_activos = supa("GET", "/club_pass", {"select": "miembro_id", "estado": "eq.activo"})
        ids_activos = {p["miembro_id"] for p in pass_activos}
        out = [m for m in miembros if m["id"] in ids_activos and m["whatsapp"] not in opted_out]
        return out
    if service in ("sofia", "destino", "operadores"):
        fail(f"servicio '{service}' aún no implementado — pendiente mapear tabla")
    fail(f"servicio desconocido: {service}")
    return []


def send_template(to: str, template: str, body_params: list[str], header_params: list[str] | None = None) -> tuple[bool, str]:
    if not (META_PHONE_ID and META_TOKEN):
        return False, "Falta ECODRIVE_META_PHONE_ID o ECODRIVE_META_ACCESS_TOKEN"
    components = []
    if header_params:
        components.append({"type": "header", "parameters": [{"type": "text", "text": p} for p in header_params]})
    if body_params:
        components.append({"type": "body", "parameters": [{"type": "text", "text": p} for p in body_params]})
    payload = {
        "messaging_product": "whatsapp", "recipient_type": "individual",
        "to": to.replace("+", "").replace(" ", ""),
        "type": "template",
        "template": {"name": template, "language": {"code": "es"}, **({"components": components} if components else {})},
    }
    req = urlreq.Request(
        f"https://graph.facebook.com/v21.0/{META_PHONE_ID}/messages",
        data=json.dumps(payload).encode("utf-8"), method="POST",
        headers={"Authorization": f"Bearer {META_TOKEN}", "Content-Type": "application/json"},
    )
    try:
        with urlreq.urlopen(req, timeout=30) as r:
            return True, r.read().decode("utf-8")[:200]
    except urlerr.HTTPError as e:
        return False, e.read().decode("utf-8")[:300]


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--service", required=True, choices=["club", "sofia", "destino", "operadores"])
    p.add_argument("--template", required=True, help="Nombre exacto del template Meta APPROVED")
    p.add_argument("--body-params", nargs="*", default=[], help="Parámetros del BODY ({{1}}, {{2}}, ...)")
    p.add_argument("--header-params", nargs="*", default=[], help="Parámetros del HEADER (si aplica)")
    p.add_argument("--throttle-ms", type=int, default=50, help="Pausa entre envíos para no pegar rate limit")
    p.add_argument("--dry", action="store_true", help="Lista lo que enviaría pero no envía")
    p.add_argument("--limit", type=int, default=0, help="Cap de destinatarios (0 = sin cap)")
    args = p.parse_args()

    recipients = load_recipients(args.service)
    if args.limit:
        recipients = recipients[:args.limit]

    print(f"Servicio: {args.service}")
    print(f"Template: {args.template}")
    print(f"Body params: {args.body_params}")
    print(f"Header params: {args.header_params}")
    print(f"Destinatarios (con opt-out filtrado): {len(recipients)}")
    print(f"Dry run: {args.dry}")
    print()

    if args.dry:
        for r in recipients[:20]:
            print(f"  [DRY] -> {r['whatsapp']:15s} {r.get('nombre','')}")
        if len(recipients) > 20:
            print(f"  ... + {len(recipients) - 20} más")
        return

    ok, fail_count = 0, 0
    for r in recipients:
        success, info = send_template(r["whatsapp"], args.template, args.body_params, args.header_params)
        status = "OK  " if success else "FAIL"
        print(f"  [{status}] {r['whatsapp']:15s} {info[:120]}")
        if success: ok += 1
        else: fail_count += 1
        time.sleep(args.throttle_ms / 1000)

    print(f"\nResultado: {ok} ok, {fail_count} fail de {len(recipients)}")


if __name__ == "__main__":
    main()
