export const WEEKLY_RAIDS = [
  "Corran 5 km en equipo",
  "100 flexiones grupales",
  "Un día sin azúcar (los dos)",
  "10.000 pasos cada uno",
  "1 hora de estudio profundo",
  "Presupuesto estricto: $15 máx",
  "Entrenen en pareja",
];

export const RAID_TARGET = 4;

export function isoWeekKey(now = new Date()): string {
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, "0")}`;
}

export function getDaysLeftInRaidCycle(now = new Date()): number {
  const day = now.getDay(); // 0 es domingo
  const daysUntilMonday = day === 0 ? 1 : 8 - day;
  return daysUntilMonday;
}

export function weekRaid(now = new Date()): string {
  const start = new Date(now.getFullYear(), 0, 1);
  const days = Math.floor((now.getTime() - start.getTime()) / 86400000);
  const week = Math.floor(days / 7) % WEEKLY_RAIDS.length;
  // Rotar diariamente dentro del pool para tener metas diarias dinámicas
  const dailyIdx = (now.getDate() + week) % WEEKLY_RAIDS.length;
  return WEEKLY_RAIDS[dailyIdx];
}
