import LeadForm from "./LeadForm";

export const metadata = {
  title: "Únete a EcoDrive+ — Pasajero verificado",
  description: "Solo 30 segundos. DNI + selfie. La IA valida tus datos al toque.",
};

export default function SePasajeroEcoPage() {
  return (
    <main className="min-h-screen bg-zinc-50">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <div className="inline-block bg-[#E1811B] text-white text-xs font-bold px-3 py-1 rounded-full mb-3">
            EcoDrive+ Trujillo
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-zinc-900 mb-3">
            Pide tu viaje seguro
          </h1>
          <p className="text-lg text-zinc-600">
            Choferes verificados, tarifa justa. Tu app en WhatsApp, sin descargar nada.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-10">
          {[
            { t: "Chofer ya conocido", d: "Sabes quién maneja antes de subir al carro." },
            { t: "Mapa en vivo", d: "Tu familia ve tu ruta cuando viajas de noche." },
            { t: "Inscripción 30 seg", d: "Solo DNI y selfie. La IA valida al toque." },
          ].map((b) => (
            <div key={b.t} className="bg-white rounded-xl p-5 shadow-sm">
              <div className="font-bold text-zinc-900 mb-1">{b.t}</div>
              <div className="text-sm text-zinc-600">{b.d}</div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
          <h2 className="text-2xl font-bold mb-2">Inscríbete en 30 segundos</h2>
          <p className="text-zinc-600 mb-6">
            Te mandamos un mensaje a tu WhatsApp. Subes tu DNI + selfie. La IA
            valida y quedas activo al toque.
          </p>
          <LeadForm />
        </div>

        <div className="text-center mt-8 text-sm text-zinc-500">
          Hecho con ✦ en Perú
        </div>
      </div>
    </main>
  );
}
