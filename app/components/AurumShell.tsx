import Navbar from "./Navbar";
import Footer from "./Footer";
import SmoothScroll from "../_design/SmoothScroll";

/**
 * Envoltura uniforme del sitio ActivosYA: aplica el sistema Aurum
 * (.aurum), smooth-scroll, Navbar fija y Footer compartido a cualquier
 * subpágina. El contenido legacy hereda el tema vía overrides de aurum.css.
 */
export default function AurumShell({
  children,
  footer = true,
}: {
  children: React.ReactNode;
  footer?: boolean;
}) {
  return (
    <div className="aurum min-h-screen">
      <SmoothScroll />
      <Navbar />
      <div className="pt-16">{children}</div>
      {footer && <Footer />}
    </div>
  );
}
