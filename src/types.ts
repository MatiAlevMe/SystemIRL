export type QuestCategory = "strength" | "intelligence" | "vitality" | "gold";
export type QuestDifficulty = "F" | "E" | "D" | "C" | "B";

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
  tower: { floor: number; bossHp: number };
}

export interface PartyMessage {
  kind: "levelup" | "done" | "raid" | "join";
  name: string;
  level?: number;
  xp?: number;
  quest?: string;
  raid?: string;
}

export interface PartyMeta {
  name: string;
  level: number;
  xp: number;
  streak: number;
  title?: string;
  color?: string;
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
