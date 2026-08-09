export type QuestCategory = "strength" | "intelligence" | "vitality" | "gold";
export type QuestDifficulty = "F" | "E" | "D" | "C" | "B";
export type PlayerClass = "guerrero" | "guardia" | "sabio" | "cazador";

export interface Quest {
  id: string;
  title: string;
  description: string;
  category: QuestCategory;
  difficulty: QuestDifficulty;
  xp: number;
}

export interface PlayerState {
  name: string;
  xp: number;
  stats: Record<QuestCategory, number>;
  streak: number;
  lastActiveDate: string | null;
  history: string[];
  coins: number;
  title: string | null;
  color: string | null;
  weapon: string | null;
  owned: string[];
  tower: { floor: number; damage: number };
  cls: PlayerClass;
  armor: string | null;
  trinket: string | null;
  aura: string | null;
  inventory: Record<string, number>;
  battle: { hp: number; mp: number; ex: number; exLevel: number; exXp: number };
  prefs: string[];
}

export interface PartyMessage {
  kind: "levelup" | "done" | "raid" | "join" | "raidHit";
  name: string;
  level?: number;
  xp?: number;
  quest?: string;
  raid?: string;
  dmg?: number;
}

export interface PartyMeta {
  name: string;
  level: number;
  xp: number;
  streak: number;
  title?: string;
  color?: string;
  cls?: PlayerClass;
}

export const CATEGORY_LABEL: Record<QuestCategory, string> = {
  strength: "Strength",
  intelligence: "Intelligence",
  vitality: "Vitality",
  gold: "Gold",
};

export const CATEGORY_ICON: Record<QuestCategory, string> = {
  strength: "💪",
  intelligence: "🧠",
  vitality: "❤️",
  gold: "💰",
};

export const CLASS_LABEL: Record<PlayerClass, string> = {
  guerrero: "Guerrero",
  guardia: "Guardia",
  sabio: "Sabio",
  cazador: "Cazador",
};

export const CLASS_ICON: Record<PlayerClass, string> = {
  guerrero: "⚔️",
  guardia: "🛡️",
  sabio: "✨",
  cazador: "🏹",
};
