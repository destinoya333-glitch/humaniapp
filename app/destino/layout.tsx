import SmoothScroll from "../_design/SmoothScroll";

export default function DestinoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="brand brand-destino">
      <SmoothScroll />
      {children}
    </div>
  );
}
