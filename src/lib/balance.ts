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
