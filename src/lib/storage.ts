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
  };
}

export async function loadPlayer(): Promise<PlayerState | null> {
  try {
    const p = await get<PlayerState | undefined>(PLAYER_KEY);
    if (!p || typeof p.name !== "string") return null;
    return p;
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

export async function completeQuest(p: PlayerState, quest: Quest): Promise<CompleteResult> {
  const prevLevel = levelFromXp(p.xp);
  const now = new Date();
  const today = todayKey(now);
  const yesterday = yesterdayKey(now);

  let streak = p.streak;
  if (p.lastActiveDate === today) {
    streak = Math.max(1, streak); // ya sumó hoy
  } else if (p.lastActiveDate === yesterday) {
    streak += 1;
  } else {
    streak = 1;
  }

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
    streak,
    lastActiveDate: today,
    history,
  };

  await savePlayer(next);
  const level = levelFromXp(xp);
  return { player: next, xpGained: quest.xp, leveledUp: level > prevLevel, level };
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
