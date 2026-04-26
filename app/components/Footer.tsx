import Logo from "./Logo";

export default function Footer() {
  return (
    <footer className="border-t border-[#2A2A2A] py-14 px-6">
      <div className="mx-auto max-w-6xl">
        <div className="grid md:grid-cols-4 gap-10 mb-12">
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <Logo size={52} />
              <span className="text-2xl font-bold">
                <span className="gold-gradient">Activos</span>
                <span className="text-white">YA</span>
              </span>
            </div>
            <p className="text-zinc-400 text-sm leading-relaxed max-w-sm">
              Marketplace de activos digitales en LATAM. Compramos, operamos y
              vendemos plataformas SaaS con flujo de caja verificado.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="text-xs px-2.5 py-1 rounded-full border border-emerald-400/20 bg-emerald-400/10 text-emerald-400">
                ● Operando en Perú
              </span>
              <span className="text-xs px-2.5 py-1 rounded-full border border-[#2A2A2A] text-zinc-400">
                Próx. expansión LATAM
              </span>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-4 text-zinc-300">Catálogo</h4>
            <ul className="flex flex-col gap-2 text-sm text-zinc-500">
              <li><a href="#catalogo" className="hover:text-amber-400 transition-colors">Miss Sofia English</a></li>
              <li><a href="#catalogo" className="hover:text-amber-400 transition-colors">TuDestinoYa</a></li>
              <li><a href="#catalogo" className="hover:text-amber-400 transition-colors">TuNoviaIA</a></li>
              <li><a href="#catalogo" className="hover:text-amber-400 transition-colors">TuPedidoYa</a></li>
              <li><a href="#catalogo" className="hover:text-amber-400 transition-colors">TuReservaYa</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-4 text-zinc-300">Empresa</h4>
            <ul className="flex flex-col gap-2 text-sm text-zinc-500">
              <li><a href="#como-funciona" className="hover:text-amber-400 transition-colors">Cómo funciona</a></li>
              <li><a href="#por-que" className="hover:text-amber-400 transition-colors">Por qué ActivosYA</a></li>
              <li><a href="#contacto" className="hover:text-amber-400 transition-colors">Solicitar data room</a></li>
              <li><a href="#contacto" className="hover:text-amber-400 transition-colors">Contacto</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-[#2A2A2A] pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-600">
          <span>© 2026 ActivosYA. Todos los derechos reservados.</span>
          <span>Hecho con ✦ en Perú · Activos operativos en producción</span>
        </div>
      </div>
    </footer>
  );
}
