// Pool de actividades rotativas para la raid semanal.
// La raid se reinicia cada lunes (semana ISO calendario).
export const WEEKLY_RAIDS = [
  "Corran 5 km en equipo",
  "100 flexiones grupales (50 cada uno)",
  "Un día sin azúcar (ambos jugadores)",
  "10.000 pasos cada uno",
  "1 hora de estudio profundo",
  "Presupuesto estricto: límite de gastos del día",
  "Entrenen juntos (cualquier deporte)",
  "Medita 20 minutos hoy",
  "Cocinen una comida saludable",
  "Sin redes sociales en 2 horas",
];

export const RAID_TARGET = 4;

// ---- Clave ISO de semana (lunes–domingo) ---------------------------------
// Se usa como clave de persistencia para saber si ya se completó la raid
// y si el HP del jefe debe reiniciarse. Formato: "2026-W32"
export function isoWeekKey(now = new Date()): string {
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, "0")}`;
}

// ---- Actividad diaria del día (para mostrar la meta del día) -------------
// Rota dentro del pool semana a semana y día a día, para que sea variado
// pero el mismo para toda la party el mismo día.
export function weeklyRaidGoal(now = new Date()): string {
  const week = parseInt(isoWeekKey(now).split("W")[1], 10);
  const dayOfWeek = ((now.getDay() + 6) % 7); // 0=lunes, 6=domingo
  const idx = (week * 7 + dayOfWeek) % WEEKLY_RAIDS.length;
  return WEEKLY_RAIDS[idx];
}

// weekRaid() = alias de isoWeekKey para compatibilidad con el código existente
// que lo usa como clave de persistencia del canal/mensajes.
export function weekRaid(now = new Date()): string {
  return isoWeekKey(now);
}

// Días que faltan para que empiece el próximo ciclo (próximo lunes)
export function getDaysLeftInRaidCycle(now = new Date()): number {
  const day = now.getDay(); // 0 es domingo
  const daysUntilMonday = day === 0 ? 1 : 8 - day;
  return daysUntilMonday;
}

// Devuelve el timestamp (ms) del próximo lunes a las 00:00:00 UTC
export function nextMondayTs(now = new Date()): number {
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const dayNum = d.getUTCDay() || 7; // 1=lunes … 7=domingo
  const daysToMonday = dayNum === 1 ? 7 : 8 - dayNum;
  d.setUTCDate(d.getUTCDate() + daysToMonday);
  return d.getTime();
}
