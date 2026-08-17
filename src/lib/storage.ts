import { get, set } from "idb-keyval";
import type { PlayerClass, PlayerState, Quest } from "../types";
import { todayKey, yesterdayKey, levelFromXp } from "./xp";
import { itemById } from "./catalog";
import { CLASS_BALANCE } from "./balance";

const PLAYER_KEY = "player";
const QUEST_CACHE = "quests:";
const DONE_KEY = "done:";
const REGEN_KEY = "regens:";

export function emptyPlayer(name: string, cls: PlayerClass = "guerrero"): PlayerState {
  return {
    name,
    xp: 0,
    stats: { strength: 0, intelligence: 0, vitality: 0, gold: 0 },
    streak: 0,
    lastActiveDate: null,
    history: [],
    coins: 0,
    title: null,
    color: null,
    weapon: null,
    owned: [],
    tower: { floor: 1, damage: 0 },
    cls,
    armor: null,
    trinket: null,
    aura: null,
    inventory: {},
    battle: { hp: 60, mp: 30, ex: 0, exLevel: 1, exXp: 0 },
    prefs: [],
    music: false,
    agility: CLASS_BALANCE[cls].baseAgility,
    boots: null,
    energy: { tower: 8, arena1v1: 2, arenaTourney: 1, lastReset: todayKey() },
    raidSkillLevel: 1,
    raidKills: 0,
    elements: [CLASS_BALANCE[cls].defaultElement],
  };
}

// Campos nuevos agregados después del MVP: los jugadores guardados en IndexedDB
// no los tienen, así que se normalizan con defaults para que nunca rompan.
export function normalizePlayer(p: Partial<PlayerState> | null | undefined): PlayerState | null {
  if (!p || typeof p.name !== "string") return null;
  const base = emptyPlayer(p.name, p.cls ?? undefined);
  const today = todayKey();
  const rawEnergy = p.energy;
  const energy = !rawEnergy || rawEnergy.lastReset !== today
    ? { tower: 8, arena1v1: 2, arenaTourney: 1, lastReset: today }
    : { ...base.energy!, ...rawEnergy };

  return {
    ...base,
    ...p,
    name: p.name,
    stats: { ...base.stats, ...p.stats },
    tower: { ...base.tower, ...p.tower },
    owned: Array.isArray(p.owned) ? p.owned : [],
    history: Array.isArray(p.history) ? p.history : [],
    cls: p.cls ?? base.cls,
    armor: p.armor ?? null,
    trinket: p.trinket ?? null,
    aura: p.aura ?? null,
    inventory: p.inventory && typeof p.inventory === "object" ? p.inventory : {},
    battle: { ...base.battle, ...p.battle },
    prefs: Array.isArray(p.prefs) ? p.prefs : [],
    music: Boolean(p.music),
    agility: typeof p.agility === "number" ? p.agility : (CLASS_BALANCE[p.cls ?? base.cls]?.baseAgility ?? 45),
    boots: p.boots ?? null,
    energy,
    raidSkillLevel: typeof p.raidSkillLevel === "number" ? p.raidSkillLevel : 1,
    raidKills: typeof p.raidKills === "number" ? p.raidKills : 0,
    duelWins: typeof p.duelWins === "number" ? p.duelWins : 0,
    elements: Array.isArray(p.elements) && p.elements.length > 0 ? p.elements : [CLASS_BALANCE[p.cls ?? base.cls]?.defaultElement ?? "fuego"],
  };
}

export async function loadPlayer(): Promise<PlayerState | null> {
  try {
    const p = await get<Partial<PlayerState> | undefined>(PLAYER_KEY);
    return normalizePlayer(p);
  } catch {
    return null;
  }
}

export async function savePlayer(p: PlayerState): Promise<void> {
  try {
    await set(PLAYER_KEY, p);
  } catch {
    /* idb unavailable: seguir en memoria */
  }
}

export interface CompleteResult {
  player: PlayerState;
  xpGained: number;
  leveledUp: boolean;
  level: number;
}

function nextStreak(p: PlayerState, now = new Date()): number {
  const today = todayKey(now);
  const yesterday = yesterdayKey(now);
  if (p.lastActiveDate === today) return Math.max(1, p.streak);
  if (p.lastActiveDate === yesterday) return p.streak + 1;
  return 1;
}

function result(player: PlayerState, prevLevel: number, xpGained: number, level: number): CompleteResult {
  return { player, xpGained, leveledUp: level > prevLevel, level };
}

export async function completeQuest(p: PlayerState, quest: Quest): Promise<CompleteResult> {
  const prevLevel = levelFromXp(p.xp);
  const now = new Date();
  const today = todayKey(now);

  // Bono de XP del arma equipada (si tiene xpPct) + título equipado.
  const weapon = itemById(p.weapon);
  const title = itemById(p.title);
  const xpGain = Math.round(quest.xp * (1 + (weapon?.bonus?.xpPct ?? 0) + (title?.bonus?.xpPct ?? 0)));

  // Stats crecen +1 por quest completada de esa categoría (antes sumaban el XP completo).
  const stats: PlayerState["stats"] = {
    ...p.stats,
    [quest.category]: p.stats[quest.category] + 1,
  };

  const xp = p.xp + xpGain;
  const level = levelFromXp(xp);

  // Al subir de nivel, la stat principal de la clase sube +1 (guerrero/cazador fuerza,
  // sabio inteligencia, guardia vitalidad).
  if (level > prevLevel) {
    const mainStat = CLASS_BALANCE[p.cls].mainStat;
    stats[mainStat] = stats[mainStat] + 1;
  }

  const history = [...p.history, quest.title].slice(-20);

  const next: PlayerState = {
    ...p,
    xp,
    stats,
    streak: nextStreak(p, now),
    lastActiveDate: today,
    history,
  };

  await savePlayer(next);
  return result(next, prevLevel, xpGain, level);
}

// God mode: otorga XP sin quest real (solo para la demo / pruebas).
export async function grantXp(p: PlayerState, amount: number): Promise<CompleteResult> {
  const prevLevel = levelFromXp(p.xp);
  const now = new Date();
  const xp = p.xp + Math.max(0, amount);
  const level = levelFromXp(xp);
  const stats: PlayerState["stats"] = { ...p.stats };
  if (level > prevLevel) {
    const mainStat = CLASS_BALANCE[p.cls].mainStat;
    stats[mainStat] = stats[mainStat] + 1;
  }
  const next: PlayerState = {
    ...p,
    xp,
    stats,
    streak: nextStreak(p, now),
    lastActiveDate: todayKey(now),
  };
  await savePlayer(next);
  return result(next, prevLevel, amount, level);
}

export async function saveQuestCache(date: string, quests: Quest[]): Promise<void> {
  try {
    await set(QUEST_CACHE + date, quests);
  } catch {
    /* noop */
  }
}

export async function loadQuestCache(date: string): Promise<Quest[] | null> {
  try {
    const q = await get<Quest[] | undefined>(QUEST_CACHE + date);
    return q && q.length > 0 ? q : null;
  } catch {
    return null;
  }
}

export async function loadDoneToday(date: string): Promise<string[]> {
  try {
    const ids = await get<string[] | undefined>(DONE_KEY + date);
    return ids ?? [];
  } catch {
    return [];
  }
}

export async function saveDoneToday(date: string, ids: string[]): Promise<void> {
  try {
    await set(DONE_KEY + date, ids);
  } catch {
    /* noop */
  }
}

export async function clearDoneToday(date: string): Promise<void> {
  try {
    await set(DONE_KEY + date, []);
  } catch {
    /* noop */
  }
}

// Regenerar quests tiene un tope por día (2): contador por fecha en IndexedDB.
export async function loadRegens(date: string): Promise<number> {
  try {
    const n = await get<number | undefined>(REGEN_KEY + date);
    return typeof n === "number" ? n : 0;
  } catch {
    return 0;
  }
}

export async function saveRegens(date: string, count: number): Promise<void> {
  try {
    await set(REGEN_KEY + date, count);
  } catch {
    /* noop */
  }
}

export async function clearRegens(date: string): Promise<void> {
  try {
    await set(REGEN_KEY + date, 0);
  } catch {
    /* noop */
  }
}
