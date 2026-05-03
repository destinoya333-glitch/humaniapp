/**
 * Registro central de flows por tenant.
 * Importar y registrar cada flow nuevo aquí.
 */
import { registerFlow } from "../wa-flows-platform/registry";
import ecodriveHelloTest from "./ecodrive/flows/hello-test";
import ecodriveTrackingViaje from "./ecodrive/flows/tracking-viaje";

// Registrar todos los flows disponibles
registerFlow(ecodriveHelloTest);
registerFlow(ecodriveTrackingViaje);

export {};
