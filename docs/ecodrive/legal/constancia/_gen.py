"""Genera 3 constancias de ingresos (Trujillo, Arequipa, Huancayo) en HTML imprimible."""
import qrcode, io, base64, os

LOGO_URL = "https://rfpmvnoaqibqiqxrmheb.supabase.co/storage/v1/object/public/brand-assets/ecodrive/logo-final-naranja-trim.png"
NARANJA = "#E1811B"
NARANJA_DARK = "#B86A12"
VERDE = "#1a4e2b"
GRIS = "#666666"

CAJAS = [
    {
        "id": "TRU",
        "nombre_largo": "Caja Municipal de Ahorro y Crédito de Trujillo",
        "nombre_corto": "Caja Trujillo",
        "cie": "CIE-TRU-2026-00187",
    },
    {
        "id": "AQP",
        "nombre_largo": "Caja Municipal de Ahorro y Crédito de Arequipa",
        "nombre_corto": "Caja Arequipa",
        "cie": "CIE-AQP-2026-00188",
    },
    {
        "id": "HCO",
        "nombre_largo": "Caja Municipal de Ahorro y Crédito de Huancayo",
        "nombre_corto": "Caja Huancayo",
        "cie": "CIE-HCO-2026-00189",
    },
]

def qr_base64(url):
    qr = qrcode.QRCode(version=3, error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=8, border=2)
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#1a1a1a", back_color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode()

MESES = [
    ("Dic 2025", 580, 5510.00),
    ("Ene 2026", 590, 5605.00),
    ("Feb 2026", 555, 5272.50),
    ("Mar 2026", 595, 5652.50),
    ("Abr 2026", 600, 5700.00),
    ("May 2026", 565, 5367.50),
]
TOTAL_VIAJES = sum(m[1] for m in MESES)
TOTAL_BRUTO = sum(m[2] for m in MESES)
COM_PCT = 0.063
TOTAL_COMISION = round(TOTAL_BRUTO * COM_PCT, 2)
TOTAL_NETO = round(TOTAL_BRUTO - TOTAL_COMISION, 2)

def fmt(n):
    return f"{n:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")

def render(caja):
    url_verify = f"https://ecodriveplus.com/verificar/{caja['cie']}"
    qr_b64 = qr_base64(url_verify)
    detalle_rows = ""
    for mes, viajes, bruto in MESES:
        com = round(bruto * COM_PCT, 2)
        neto = round(bruto - com, 2)
        detalle_rows += f"""
<tr>
<td>{mes}</td><td>{viajes}</td><td>S/. {fmt(bruto)}</td><td>S/. {fmt(com)}</td><td>S/. {fmt(neto)}</td>
</tr>"""

    html = f"""<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8">
<title>Constancia de Ingresos — {caja['nombre_corto']}</title>
<style>
@page {{ size: A4; margin: 1.4cm; }}
@media print {{
  body {{ font-size: 9.5pt; }}
  .no-print {{ display: none !important; }}
  .watermark {{ display: block; }}
}}
body {{ font-family: 'Calibri', 'Helvetica', sans-serif; font-size: 10pt; line-height: 1.4; color: #1a1a1a; max-width: 19cm; margin: 30px auto; padding: 0 20px; position: relative; background: white; }}
.no-print {{ background: {NARANJA}; color: white; padding: 12px 16px; border-radius: 6px; margin-bottom: 22px; text-align: center; font-weight: bold; }}
.no-print button {{ background: white; color: {NARANJA}; border: 0; padding: 9px 20px; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 13px; margin-left: 10px; }}
.watermark {{ position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-25deg); font-size: 80pt; color: rgba(225, 129, 27, 0.07); font-weight: bold; z-index: 0; letter-spacing: 4px; pointer-events: none; }}
.content {{ position: relative; z-index: 1; }}
.header {{ display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid {NARANJA}; padding-bottom: 12px; margin-bottom: 18px; }}
.header img {{ max-width: 280px; height: auto; }}
.header .corp {{ text-align: right; font-size: 9pt; color: #444; line-height: 1.45; }}
.header .corp strong {{ color: #1a1a1a; }}
h1 {{ font-size: 20pt; color: {NARANJA}; margin: 4px 0 0; letter-spacing: 0.3px; }}
.subtitle {{ font-size: 10pt; color: #555; font-style: italic; }}
.cie-box {{ display: flex; justify-content: space-between; align-items: center; margin: 8px 0 18px; }}
.cie-box .cie {{ color: {NARANJA}; font-weight: bold; font-size: 11pt; }}
.cie-box .fecha {{ color: #666; font-size: 9.5pt; }}
.section-title {{ font-size: 9.5pt; font-weight: bold; color: #444; text-transform: uppercase; letter-spacing: 1px; margin-top: 14px; margin-bottom: 6px; border-bottom: 1px solid #eee; padding-bottom: 3px; }}
.field-row {{ display: flex; padding: 2px 0; font-size: 9.5pt; }}
.field-row .label {{ width: 38%; color: #666; }}
.field-row .value {{ font-weight: bold; color: #1a1a1a; }}
.resumen-box {{ background: rgba(225, 129, 27, 0.08); border: 1px solid rgba(225, 129, 27, 0.25); border-radius: 6px; padding: 14px 18px; margin: 8px 0 16px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; text-align: center; }}
.resumen-box .item .label {{ font-size: 8pt; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }}
.resumen-box .item .value {{ font-size: 15pt; font-weight: bold; color: {NARANJA_DARK}; margin-top: 3px; }}
.resumen-box .item .value.naranja {{ color: {NARANJA}; }}
table {{ width: 100%; border-collapse: collapse; margin: 6px 0 14px; font-size: 9.5pt; }}
thead {{ background: {NARANJA}; color: white; }}
th {{ padding: 7px 9px; text-align: left; font-weight: bold; }}
td {{ padding: 6px 9px; border-bottom: 1px solid #f0e0c8; }}
tbody tr:nth-child(even) {{ background: #fff8ed; }}
tfoot {{ background: {NARANJA_DARK}; color: white; font-weight: bold; }}
tfoot td {{ padding: 8px 9px; }}
.disclaimer {{ font-size: 9pt; color: #555; line-height: 1.45; margin: 10px 0 18px; }}
.bottom {{ display: flex; justify-content: space-between; align-items: flex-start; margin-top: 14px; }}
.qr-area {{ width: 42%; }}
.qr-area .qr-img {{ display: inline-block; vertical-align: middle; margin-right: 10px; }}
.qr-area .qr-img img {{ width: 90px; height: 90px; display: block; border: 1px solid #ddd; }}
.qr-area .qr-text {{ display: inline-block; vertical-align: middle; font-size: 9pt; color: #555; }}
.qr-area .qr-text strong {{ display: block; color: #1a1a1a; }}
.qr-area .qr-text code {{ font-size: 8pt; color: #888; word-break: break-all; }}
.firma-area {{ width: 55%; text-align: center; padding-top: 36px; }}
.firma-area .line {{ border-top: 1px solid #888; padding-top: 5px; }}
.firma-area .nombre {{ font-weight: bold; font-size: 11pt; color: #1a1a1a; text-transform: uppercase; }}
.firma-area .cargo {{ font-size: 9pt; color: #444; margin-top: 1px; }}
.firma-area .dni {{ font-size: 9pt; color: #666; }}
.firma-area .empresa {{ font-size: 9pt; color: {NARANJA_DARK}; font-weight: bold; margin-top: 3px; }}
.firma-area .nota {{ font-size: 7.5pt; color: #888; font-style: italic; margin-top: 4px; }}
.footer {{ margin-top: 18px; padding-top: 8px; border-top: 1px solid #ddd; font-size: 8.5pt; color: #666; text-align: center; }}
</style></head><body>
<div class="no-print">
  Ctrl+P → "Microsoft Print to PDF" para guardar como PDF.
  <button onclick="window.print()">Imprimir / Guardar PDF</button>
</div>

<div class="watermark">MUESTRA · NO VALIDO</div>

<div class="content">

<div class="header">
  <img src="{LOGO_URL}" alt="EcoDrive+">
  <div class="corp">
    <strong>ECO DRIVE PLUS S.A.C.</strong><br>
    RUC 20613413228<br>
    Trujillo, La Libertad, Perú<br>
    projas@ecodriveplus.com<br>
    https://ecodriveplus.com
  </div>
</div>

<h1>CONSTANCIA DE INGRESOS</h1>
<div class="subtitle">Conductor afiliado a la plataforma Eco Drive Plus S.A.C.</div>

<div class="cie-box">
  <div></div>
  <div style="text-align: right;">
    <div class="cie">N° {caja['cie']}</div>
    <div class="fecha">Emitida: 22/5/2026</div>
  </div>
</div>

<div class="section-title">Datos del conductor</div>
<div class="field-row"><span class="label">Nombre completo:</span><span class="value">Juan Pérez Ramírez</span></div>
<div class="field-row"><span class="label">DNI:</span><span class="value">12345678</span></div>
<div class="field-row"><span class="label">Licencia de conducir:</span><span class="value">Q12345678</span></div>
<div class="field-row"><span class="label">Placa vehículo:</span><span class="value">ABC-123</span></div>
<div class="field-row"><span class="label">Afiliado desde:</span><span class="value">1/5/2025</span></div>
<div class="field-row"><span class="label">Calificación promedio:</span><span class="value">4.87 / 5.00</span></div>

<div class="section-title">Periodo acreditado</div>
<div class="field-row"><span class="label">Rango:</span><span class="value">22/11/2025 — 22/5/2026 (6 meses)</span></div>
<div class="field-row"><span class="label">Destinado a:</span><span class="value">{caja['nombre_largo']}</span></div>
<div class="field-row"><span class="label">Finalidad:</span><span class="value">Acreditación de ingresos ante Caja Financiera</span></div>

<div class="section-title">Resumen de ingresos · Últimos 6 meses</div>
<div class="resumen-box">
  <div class="item"><div class="label">Viajes totales</div><div class="value">{TOTAL_VIAJES:,}</div></div>
  <div class="item"><div class="label">Ingreso bruto</div><div class="value">S/ {fmt(TOTAL_BRUTO)}</div></div>
  <div class="item"><div class="label">Comisión 6.3%</div><div class="value naranja">S/ {fmt(TOTAL_COMISION)}</div></div>
  <div class="item"><div class="label">Neto percibido</div><div class="value">S/ {fmt(TOTAL_NETO)}</div></div>
</div>
<div style="font-size: 9pt; color: #666; margin-top: -8px; margin-bottom: 14px;"><em>Promedio mensual neto:</em> <strong>S/ {fmt(TOTAL_NETO/6)}</strong> · <em>Promedio diario:</em> <strong>S/ {fmt(TOTAL_NETO/180)}</strong> (180 días)</div>

<div class="section-title">Detalle mensual</div>
<table>
  <thead><tr><th>MES</th><th>VIAJES</th><th>BRUTO (S/.)</th><th>COMISIÓN (S/.)</th><th>NETO (S/.)</th></tr></thead>
  <tbody>{detalle_rows}
  </tbody>
  <tfoot>
  <tr><td>TOTAL</td><td>{TOTAL_VIAJES:,}</td><td>S/. {fmt(TOTAL_BRUTO)}</td><td>S/. {fmt(TOTAL_COMISION)}</td><td>S/. {fmt(TOTAL_NETO)}</td></tr>
  </tfoot>
</table>

<div class="disclaimer">
Esta constancia es válida para acreditar ingresos como conductor afiliado a Eco Drive Plus S.A.C. (RUC 20613413228) ante entidades financieras, cajas municipales, bancos y autoridades. Verifique la autenticidad escaneando el código QR — el documento <strong>{caja['cie']}</strong> se valida en línea y expira a los 30 días desde la fecha de emisión.
</div>

<div class="bottom">
  <div class="qr-area">
    <div class="qr-img"><img src="data:image/png;base64,{qr_b64}" alt="QR"></div>
    <div class="qr-text">
      <strong>Escanee para verificar</strong>
      <code>{url_verify}</code>
    </div>
  </div>
  <div class="firma-area">
    <img src="https://rfpmvnoaqibqiqxrmheb.supabase.co/storage/v1/object/public/brand-assets/ecodrive/firma-sello-percy.png" alt="Firma y sello Percy Rojas - Gerente General Eco Drive Plus S.A.C." style="max-width: 230px; height: auto; display: block; margin: 0 auto;">
  </div>
</div>

<div class="footer">
  Emitido en Trujillo, 22 de mayo de 2026 · Documento {caja['cie']} · Hash SHA256 incluido en QR
</div>

</div>
</body></html>
"""
    return html

OUT_DIR = "C:/Users/ECO DRIVE PLUS SAC/humaniapp/docs/ecodrive/legal/constancia"
os.makedirs(OUT_DIR, exist_ok=True)
DOWNLOADS = "C:/Users/ECO DRIVE PLUS SAC/Downloads"

for caja in CAJAS:
    html = render(caja)
    fname = f"constancia_ingresos_{caja['nombre_corto'].replace(' ', '_').lower()}.html"
    out = f"{OUT_DIR}/{fname}"
    with open(out, "w", encoding="utf-8") as f:
        f.write(html)
    # copia a Downloads
    with open(f"{DOWNLOADS}/{fname}", "w", encoding="utf-8") as f:
        f.write(html)
    print(f"OK: {fname}  ({os.path.getsize(out)//1024} KB)")

print(f"\nTotal bruto 6 meses: S/. {fmt(TOTAL_BRUTO)} (~S/. {fmt(TOTAL_BRUTO/6)}/mes)")
print(f"Total neto 6 meses: S/. {fmt(TOTAL_NETO)} (~S/. {fmt(TOTAL_NETO/6)}/mes)")
