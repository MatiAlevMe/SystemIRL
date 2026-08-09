// Nivel de poder: curva de XP acumulada por nivel.
// Nivel 1 = 0 XP. Subir del nivel n al n+1 cuesta 100 + (n-1)*50 XP.
// 1→2: 100 · 2→3: 150 · 3→4: 200 … así los primeros level-ups llegan rápido (demo).

export function xpForLevel(level: number): number {
  let total = 0;
  for (let i = 2; i <= level; i++) total += 100 + (i - 2) * 50;
  return total;
}

export function levelFromXp(xp: number): number {
  let level = 1;
  while (xp >= xpForLevel(level + 1)) level++;
  return level;
}

export function exLevelFor(exXp: number): number {
  let lvl = 1;
  let req = 40;
  let accum = 0;
  while (lvl < 99 && exXp >= accum + req) {
    accum += req;
    lvl++;
    req = Math.floor(40 + lvl * 2);
  }
  return lvl;
}

export interface XpProgress {
  level: number;
  current: number;
  needed: number;
  ratio: number; // 0..1
}

export function xpProgress(xp: number): XpProgress {
  const level = levelFromXp(xp);
  const base = xpForLevel(level);
  const next = xpForLevel(level + 1);
  const current = xp - base;
  const needed = next - base;
  return { level, current, needed, ratio: needed > 0 ? current / needed : 1 };
}

export function yesterdayKey(now = new Date()): string {
  const d = new Date(now);
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function todayKey(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}
