// Served at ecodriveplus.com/llms.txt (domain rewrites /* -> /ecodriveplus/*).
// Guides LLMs / generative engines to the most relevant EcoDrive+ pages.

export const dynamic = "force-static";

const TXT = `# EcoDrive+

> App de taxi de última generación en Trujillo, Perú, con agente IA "Eco": pides el viaje en lenguaje natural (app o WhatsApp), mapa GPS en vivo, BilleteraEco y pago con Yape. Comisión de 6.3% para choferes — la más baja del Perú. Operado por EcoDrive Plus SAC.

## Para pasajeros
- Pides por la app EcoDrive+ o por WhatsApp (+51 994 810 242), atendido 24/7.
- 5 servicios: Normal, Premium, VIP, XL y Encomienda.
- Pago con Yape, BilleteraEco o efectivo. Seguimiento del viaje en vivo para compartir con la familia.

## Para choferes
- Comisión 6.3% que baja hasta 3.9% por nivel. Sin suscripciones ni cargos por uso.
- Cobro directo a BilleteraEco con retiro por Yape cuando quieras.
- Beneficios por nivel: bonos, salud, préstamos sin interés y programa Pichanga Eco.

## EcoDrive+ Club (Pass)
- [Pass del Club](https://ecodriveplus.com/club): membresía de S/.30 por edición que da 1 número del sorteo del auto.
- Edición #1: sorteo de un BYD Yuan Pro 2023, con notario público y acta pública.
- [Cómo funciona](https://ecodriveplus.com/club/como-funciona) · [Bases](https://ecodriveplus.com/club/bases)

## Páginas clave
- [Inicio](https://ecodriveplus.com/)
- [Descargar la app](https://ecodriveplus.com/descargar-app)
- [Sorteos](https://ecodriveplus.com/sorteos)

## Cobertura
- Trujillo y alrededores (Huanchaco, Víctor Larco, Moche, Salaverry, El Porvenir, La Esperanza). Expansión a Lima en camino.

## Contacto
- WhatsApp: +51 994 810 242
`;

export function GET() {
  return new Response(TXT, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
