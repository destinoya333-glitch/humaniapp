/**
 * Registro central de flows por tenant.
 * Importar y registrar cada flow nuevo aquí.
 */
import { registerFlow } from "../wa-flows-platform/registry";
import ecodriveTrackingHello from "./ecodrive/flows/hello-test";

// Registrar todos los flows disponibles
registerFlow(ecodriveTrackingHello);

export {};
