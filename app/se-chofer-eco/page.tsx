import LeadForm from "./LeadForm";

export const metadata = {
  title: "Sé chofer EcoDrive+ — Inscripción rápida",
  description: "Únete como chofer EcoDrive+. Inscripción 100% por WhatsApp. Manejas tu horario, conoces a tu pasajero antes.",
};

export default function SeChoferEcoPage() {
  return (
    <main className="min-h-screen bg-zinc-50">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <div className="inline-block bg-[#E1811B] text-white text-xs font-bold px-3 py-1 rounded-full mb-3">
            EcoDrive+ Trujillo
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-zinc-900 mb-3">
            Maneja con EcoDrive+
          </h1>
          <p className="text-lg text-zinc-600">
            Tu app, tu horario, tu pasajero ya conocido antes de subir al carro.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-10">
          {[
            { t: "Tarifa justa", d: "Cobramos solo 12% de comisión. Cobras 88%, no 70%." },
            { t: "Pasajero verificado", d: "Sabes quién sube a tu carro antes de aceptar." },
            { t: "Sin horarios", d: "Manejas cuando quieres. Sin cuotas semanales." },
          ].map((b) => (
            <div key={b.t} className="bg-white rounded-xl p-5 shadow-sm">
              <div className="font-bold text-zinc-900 mb-1">{b.t}</div>
              <div className="text-sm text-zinc-600">{b.d}</div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
          <h2 className="text-2xl font-bold mb-2">Inscripción en 2 minutos</h2>
          <p className="text-zinc-600 mb-6">
            Te mandamos un mensaje a tu WhatsApp con un formulario corto. Sin
            descargar nada. Aprobamos en menos de 24h.
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
