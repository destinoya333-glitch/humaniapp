// EcoDrive+ — Tipos compartidos

export type Role = "passenger" | "driver";

export type EcodriveUser = {
  id: string;
  celular: string;
  nombre: string | null;
  roles: Role[];
  status: "active" | "suspended" | "banned";
  city: string;
  created_at: string;
  last_seen: string;
};

export type ConversationMessage = {
  role: "user" | "assistant";
  content: string;
  ts?: string;
};

export type ConversationState = {
  intent?: "pidiendo_viaje" | "ofertando" | "registro_chofer" | "consulta" | null;
  active_request_id?: string | null;
  active_trip_id?: string | null;
};

export type TripMode =
  | "regular"
  | "eco"
  | "express"
  | "mujer"
  | "familia"
  | "mascotas"
  | "abuelo"
  | "empresa";
