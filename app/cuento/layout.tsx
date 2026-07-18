import SmoothScroll from "../_design/SmoothScroll";

export default function CuentoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="brand brand-cuento">
      <SmoothScroll />
      {children}
    </div>
  );
}
