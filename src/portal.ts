import { Portal } from "@portalsdk/core";

// La publishable key (pk_...) es segura de exponer en el bundle del navegador.
// Solo permite identidad anónima y unirse a canales con anonymous: true.
const API_KEY = import.meta.env.VITE_PORTAL_PUBLISHABLE_KEY as string | undefined;

export const portalClient = API_KEY ? new Portal({ apiKey: API_KEY }) : null;
export const PORTAL_API_KEY = API_KEY;
