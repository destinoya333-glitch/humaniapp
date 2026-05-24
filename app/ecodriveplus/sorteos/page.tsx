import { redirect } from "next/navigation";

// La pagina /ecodriveplus/sorteos pertenecia al modelo viejo (sorteo diario S/.20 con
// tabla sorteos_diarios). El programa de sorteos vive ahora en /ecodriveplus/club
// (membresia Club Pass anual). Redirect permanente para URLs cacheadas.
export default function SorteosLegacyRedirect(): never {
  redirect("/ecodriveplus/club");
}
