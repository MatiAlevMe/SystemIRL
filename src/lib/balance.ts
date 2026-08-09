// Módulo de balance centralizado para SystemIRL
import type { PlayerClass } from "../types";

export interface ClassStats {
  baseAgility: number;
  mainStat: "strength" | "intelligence" | "vitality";
  baseHp: number;
  baseMp: number;
  baseAtk: number;
  baseDef: number;
  defaultElement: string;
}

export const CLASS_BALANCE: Record<PlayerClass, ClassStats> = {
  cazador: {
    baseAgility: 60,
    mainStat: "strength",
    baseHp: 100,
    baseMp: 30,
    baseAtk: 18,
    baseDef: 8,
    defaultElement: "eléctrico",
  },
  guerrero: {
    baseAgility: 45,
    mainStat: "strength",
    baseHp: 130,
    baseMp: 25,
    baseAtk: 15,
    baseDef: 12,
    defaultElement: "fuego",
  },
  sabio: {
    baseAgility: 40,
    mainStat: "intelligence",
    baseHp: 90,
    baseMp: 60,
    baseAtk: 12,
    baseDef: 6,
    defaultElement: "sagrado",
  },
  guardia: {
    baseAgility: 35,
    mainStat: "vitality",
    baseHp: 150,
    baseMp: 20,
    baseAtk: 10,
    baseDef: 16,
    defaultElement: "físico",
  },
};

// Límites de agilidad para Bosses (máx 1.4x el aliado más lento)
export const BOSS_SPEED_CAP_MULT = 1.4;

// Energía Diaria
export const MAX_TOWER_ENERGY = 8;
export const MAX_ARENA_1V1_ENERGY = 2;
export const MAX_ARENA_TOURNAMENT_ENERGY = 1;

// EX Progression (Cap 99)
export const MAX_EX_LEVEL = 99;
export function exXpForLevel(level: number): number {
  return Math.floor(40 + level * 2);
}
export function exEffectMultiplier(exLevel: number): number {
  return 1 + 0.03 * (exLevel - 1);
}

// Caps de daño pasivo de meta diaria por tier de raid (% del HP total del boss)
export const RAID_META_DAMAGE_PCT = 0.035; // 3.5% por jugador/día
export const RAID_META_PASSIVE_CAPS: Record<number | string, number> = {
  1: 0.50, // Tier 1: máx 50% de HP con metas pasivas
  2: 0.50,
  3: 0.50,
  4: 0.50,
  5: 0.25, // Tier 5: máx 25% de HP
  "MAX-Solo": 0.15, // MAX-Solo: máx 15%
  "MAX-Party": 0.15, // MAX-Party: máx 15%
};

// Caps de daño en batalla de raid por jugador por intento
export const RAID_BATTLE_DAMAGE_CAPS: Record<number | string, number> = {
  1: 0.15,
  2: 0.15,
  3: 0.15,
  4: 0.15,
  5: 0.20, // Con RS5 el cap sube a 20% en party / 100% en solo tiers 1-5
  "MAX-Solo": 0.50,
  "MAX-Party": 0.10,
};

// Drop rates base de auras por tier de raid
export const RAID_DROP_RATES_BASE: Record<number | string, number> = {
  1: 0.05,
  2: 0.10,
  3: 0.20,
  4: 0.30,
  5: 0.40,
  "MAX-Solo": 0.70,
  "MAX-Party": 0.55,
};

export interface RaidSkillDef {
  name: string;
  passiveDesc: string;
  activeName: string;
  activeDesc: string;
}

// Raid Skill: sube al matar jefes de raid. L1 = base, L5 = máximo.
// Kills acumuladas requeridas por nivel (1/2/4/6 → L2/L3/L4/L5).
export const RAID_SKILL_KILLS: Record<number, number> = { 1: 0, 2: 1, 3: 2, 4: 4, 5: 6 };
export const MAX_RAID_SKILL = 5;

export function raidSkillLevelFor(kills: number): number {
  let lvl = 1;
  for (let i = 1; i <= MAX_RAID_SKILL; i++) {
    if (kills >= RAID_SKILL_KILLS[i]) lvl = i;
  }
  return lvl;
}

// Bonus pasivo por nivel de Raid Skill: +4% por nivel por encima de L1.
export function raidSkillBonus(level: number): number {
  return 0.04 * (level - 1);
}

export const RAID_SKILLS: Record<PlayerClass, RaidSkillDef> = {
  guerrero: {
    name: "Sangre del Monarca",
    passiveDesc: "+4% de daño vs jefes global por nivel.",
    activeName: "Filo del Monarca",
    activeDesc: "Próximo ataque vs jefe +50% daño (+10%/nivel).",
  },
  guardia: {
    name: "Baluarte de la Colmena",
    passiveDesc: "-4% de daño recibido global por nivel.",
    activeName: "Muro Irrompible",
    activeDesc: "Reducción del 50% de daño a toda la party este turno.",
  },
  sabio: {
    name: "Gracia del Sistema",
    passiveDesc: "+4% a la eficacia de curación global por nivel.",
    activeName: "Absolución",
    activeDesc: "Sanación masiva e inmune a debilidades 1 turno.",
  },
  cazador: {
    name: "Instinto del Cazador",
    passiveDesc: "+4% de crítico vs jefes global por nivel.",
    activeName: "Tiro de Sombra",
    activeDesc: "Disparo crítico garantizado que ignora 50% de defensa.",
  },
};

export function exMilestoneBonus(exLevel: number): { regenPct: number; crit: number; hpPct: number } {
  return {
    regenPct: exLevel >= 10 ? 0.10 : 0,
    crit: exLevel >= 25 ? 0.05 : 0,
    hpPct: exLevel >= 75 ? 0.05 : 0,
  };
}

// ---- Raid por tier (1–5) --------------------------------------
export const MAX_RAID_TIER = 5;
export const RAID_TIER_HP: Record<number, number> = { 1: 1200, 2: 1800, 3: 2600, 4: 3600, 5: 5000 };

// El tier más alto disponible está atado a la Raid Skill del jugador.
export function maxRaidTierFor(raidSkillLevel: number): number {
  return Math.min(MAX_RAID_TIER, Math.max(1, raidSkillLevel));
}

// Límite de intentos de raid por día (1).
export const RAID_ATTEMPTS_PER_DAY = 1;

// Drop rate base de aura por tier, con stack de +5% al llegar a RS5.
export function raidAuraDropRate(tier: number, raidSkillLevel: number): number {
  const base = RAID_DROP_RATES_BASE[tier] ?? RAID_DROP_RATES_BASE[1];
  const stack = raidSkillLevel >= MAX_RAID_SKILL ? 0.05 : 0;
  return Math.min(0.95, base + stack);
}
