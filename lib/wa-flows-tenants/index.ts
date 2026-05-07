/**
 * Registro central de flows por tenant.
 * Importar y registrar cada flow nuevo aquí.
 */
import { registerFlow } from "../wa-flows-platform/registry";
import ecodriveHelloTest from "./ecodrive/flows/hello-test";
import ecodriveTrackingViaje from "./ecodrive/flows/tracking-viaje";
import ecodriveInscripcionChofer from "./ecodrive/flows/inscripcion-chofer";
import ecodriveInscripcionPasajero from "./ecodrive/flows/inscripcion-pasajero";
import ecodrivePedirViaje from "./ecodrive/flows/pedir-viaje";
import ecodriveAceptarViaje from "./ecodrive/flows/aceptar-viaje";
import sofiaPactoCuna from "./miss-sofia/flows/pacto-cuna";
import sofiaPlanEstudio from "./miss-sofia/flows/plan-estudio";
import sofiaPago from "./miss-sofia/flows/pago";
import sofiaProgreso from "./miss-sofia/flows/progreso";
import sofiaPronunciacion from "./miss-sofia/flows/pronunciacion";
import destinoyaPago from "./destinoya/flows/pago";
import destinoyaMenu from "./destinoya/flows/menu";
import destinoyaVip from "./destinoya/flows/vip";
import destinoyaSubmenu from "./destinoya/flows/submenu";

// Registrar todos los flows disponibles
registerFlow(ecodriveHelloTest);
registerFlow(ecodriveTrackingViaje);
registerFlow(ecodriveInscripcionChofer);
registerFlow(ecodriveInscripcionPasajero);
registerFlow(ecodrivePedirViaje);
registerFlow(ecodriveAceptarViaje);
registerFlow(sofiaPactoCuna);
registerFlow(sofiaPlanEstudio);
registerFlow(sofiaPago);
registerFlow(sofiaProgreso);
registerFlow(sofiaPronunciacion);
registerFlow(destinoyaPago);
registerFlow(destinoyaMenu);
registerFlow(destinoyaVip);
registerFlow(destinoyaSubmenu);

export {};
