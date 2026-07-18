import SmoothScroll from "../_design/SmoothScroll";

export default function ChoferyaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="brand brand-chofer">
      <SmoothScroll />
      {children}
    </div>
  );
}
