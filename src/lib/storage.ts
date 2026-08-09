import { get, set } from "idb-keyval";
import type { PlayerState, Quest } from "../types";
import { todayKey, yesterdayKey, levelFromXp } from "./xp";

const PLAYER_KEY = "player";
const QUEST_CACHE = "quests:";
const DONE_KEY = "done:";

export function emptyPlayer(name: string): PlayerState {
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
    tower: { floor: 1, bossHp: 0 },
  };
}

// Campos nuevos agregados después del MVP: los jugadores guardados en IndexedDB
// no los tienen, así que se normalizan con defaults para que nunca rompan.
export function normalizePlayer(p: Partial<PlayerState> | null | undefined): PlayerState | null {
  if (!p || typeof p.name !== "string") return null;
  const base = emptyPlayer(p.name);
  return {
    ...base,
    ...p,
    name: p.name,
    stats: { ...base.stats, ...p.stats },
    tower: { ...base.tower, ...p.tower },
    owned: Array.isArray(p.owned) ? p.owned : [],
    history: Array.isArray(p.history) ? p.history : [],
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

  const stats: PlayerState["stats"] = {
    ...p.stats,
    [quest.category]: p.stats[quest.category] + quest.xp,
  };

  const xp = p.xp + quest.xp;
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
  const level = levelFromXp(xp);
  return result(next, prevLevel, quest.xp, level);
}

// God mode: otorga XP sin quest real (solo para la demo / pruebas).
export async function grantXp(p: PlayerState, amount: number): Promise<CompleteResult> {
  const prevLevel = levelFromXp(p.xp);
  const now = new Date();
  const xp = p.xp + Math.max(0, amount);
  const next: PlayerState = {
    ...p,
    xp,
    streak: nextStreak(p, now),
    lastActiveDate: todayKey(now),
  };
  await savePlayer(next);
  const level = levelFromXp(xp);
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
