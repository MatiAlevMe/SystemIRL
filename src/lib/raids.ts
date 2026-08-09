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

export function weekRaid(now = new Date()): string {
  const start = new Date(now.getFullYear(), 0, 1);
  const days = Math.floor((now.getTime() - start.getTime()) / 86400000);
  const week = Math.floor(days / 7) % WEEKLY_RAIDS.length;
  return WEEKLY_RAIDS[week];
}
