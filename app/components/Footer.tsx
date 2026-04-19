import Logo from "./Logo";

export default function Footer() {
  return (
    <footer className="border-t border-[#2A2A2A] py-12 px-6">
      <div className="mx-auto max-w-6xl">
        <div className="grid md:grid-cols-4 gap-8 mb-10">
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-3">
              <Logo size={52} />
              <span className="text-2xl font-bold">
                <span className="gold-gradient">Humani</span>
                <span className="text-white">App</span>
              </span>
            </div>
            <p className="text-zinc-400 text-sm leading-relaxed max-w-xs">
              La plataforma IA más humana. Servicios directos y soluciones
              white-label para emprendedores en Latinoamérica.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-4 text-zinc-300">Servicios</h4>
            <ul className="flex flex-col gap-2 text-sm text-zinc-500">
              <li><a href="#servicios" className="hover:text-amber-400 transition-colors">DestinoYA</a></li>
              <li><a href="#servicios" className="hover:text-amber-400 transition-colors">Mi Novia IA</a></li>
              <li><a href="#servicios" className="hover:text-amber-400 transition-colors">Próximos servicios</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-4 text-zinc-300">Empresa</h4>
            <ul className="flex flex-col gap-2 text-sm text-zinc-500">
              <li><a href="#plataformas" className="hover:text-amber-400 transition-colors">Para emprendedores</a></li>
              <li><a href="#por-que" className="hover:text-amber-400 transition-colors">Tecnología</a></li>
              <li><a href="#contacto" className="hover:text-amber-400 transition-colors">Contacto</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-[#2A2A2A] pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-600">
          <span>© 2026 HumaniApp. Todos los derechos reservados.</span>
          <span>Hecho con ✦ en Perú</span>
        </div>
      </div>
    </footer>
  );
}
