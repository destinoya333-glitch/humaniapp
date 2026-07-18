// Served at activosya.com/llms.txt — guides LLMs / generative engines to the
// most relevant, citable pages. Format per https://llmstxt.org/.

export const dynamic = "force-static";

const TXT = `# ActivosYA

> Marketplace de activos digitales en LATAM. Plataformas SaaS llave-en-mano (white-label) con flujo de caja verificado: las compras o las rentas y empiezas a cobrar suscripciones desde el día 1. Operado por EcoDrive Plus SAC (Trujillo, Perú). Atiende Perú, México, Colombia y Chile.

## Qué ofrece
- Compra o renta de plataformas SaaS operativas con métricas verificables (MRR, retención, margen).
- Entrega llave-en-mano: código fuente, dominio propio, pagos (Stripe), base de datos (Supabase), mensajería (Twilio).
- White-label completo: tu marca, tu dominio, tus colores. 90 días de soporte 24/7. Garantía de 30 días.

## Activos disponibles
- [Miss Sofia](https://activosya.com/activos/miss-sofia): asistente/compañera IA conversacional.
- [TuDestinoYa](https://activosya.com/activos/tu-destino-ya): plataforma de viajes y reservas.
- [TuNoviaIA](https://activosya.com/activos/tu-novia-ia): compañera IA conversacional.
- [TuPedidoYa](https://activosya.com/activos/tu-pedido-ya): pedidos y delivery.
- [TuReservaYa](https://activosya.com/activos/tu-reserva-ya): reservas para negocios.
- [EcoDrive+](https://activosya.com/activos/ecodrive-plus): app de movilidad con agente IA (ver https://ecodriveplus.com).

## Páginas clave
- [Comparativa](https://activosya.com/comparativa): ActivosYA frente a otras opciones.
- [Calculadora de ROI](https://activosya.com/calculadora-roi): estima el retorno de un activo.
- [Casos de éxito](https://activosya.com/casos-exito): resultados reales de operadores.
- [Agendar](https://activosya.com/agendar): reunión con un asesor.

## Contacto
- Email: destinoya333@gmail.com
- Facebook: https://www.facebook.com/Destinoya.pe
`;

export function GET() {
  return new Response(TXT, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
