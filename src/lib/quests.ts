import type { Quest, QuestCategory, QuestDifficulty } from "../types";
import { loadQuestCache, saveQuestCache } from "./storage";

export type AiSource = "gemini" | "kilo" | "zen";
export const AI_SOURCES: AiSource[] = ["gemini", "kilo", "zen"];

export interface QuestsResult {
  quests: Quest[];
  source: AiSource | "fallback" | "cached" | "offline";
}

export interface QuestsRequest {
  history: string[];
  playerLevel: number;
  streak: number;
  count?: number;
  tags?: string[];
  rankBias?: number;
  forceRank?: QuestDifficulty;
  /** Ignora la caché del día y regenera (tope por día controlado por la UI). */
  force?: boolean;
}

export async function fetchDailyQuests(req: QuestsRequest): Promise<QuestsResult> {
  const date = new Date().toISOString().slice(0, 10);

  const cached = req.force ? null : await loadQuestCache(date);
  let result: QuestsResult | null = null;

  try {
    const res = await fetch("/api/quests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        history: req.history,
        playerLevel: req.playerLevel,
        streak: req.streak,
        count: req.count ?? 3,
        tags: req.tags,
        rankBias: req.rankBias,
        forceRank: req.forceRank,
      }),
    });
    if (res.ok) {
      const data = (await res.json()) as { source?: string; quests?: Quest[] };
      if (data.quests && data.quests.length > 0) {
        const s = data.source as string;
        result = {
          quests: data.quests,
          source: AI_SOURCES.includes(s as AiSource) ? (s as AiSource) : "fallback",
        };
        await saveQuestCache(date, data.quests);
      }
    }
  } catch {
    // sin red o sin serverless local: usar caché o pool local
  }

  if (!result && cached) return { quests: cached, source: "cached" };
  if (!result) return { quests: clientFallback(req.count ?? 3), source: "offline" };
  return result;
}

// Pool local de respaldo: si no hay red ni API, el juego sigue.
const CLIENT_POOL: Array<Pick<Quest, "title" | "description" | "category" | "difficulty" | "xp">> = [
  { title: "Haz 30 flexiones", description: "3 series de 10. Fuerza sin gimnasio.", category: "strength", difficulty: "F", xp: 30 },
  { title: "Camina 5 km", description: "Paso ligero, 5 km al aire libre.", category: "vitality", difficulty: "E", xp: 35 },
  { title: "Lee 10 páginas", description: "10 páginas de cualquier libro.", category: "intelligence", difficulty: "E", xp: 35 },
  { title: "No gastes en comida afuera", description: "Prepara tu almuerzo en casa hoy.", category: "gold", difficulty: "E", xp: 40 },
  { title: "Medita 10 minutos", description: "Respira. 10 minutos sin pantallas.", category: "vitality", difficulty: "F", xp: 25 },
];

function clientFallback(count: number): Quest[] {
  const shuffled = [...CLIENT_POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length)).map((p, i) => ({
    ...p,
    id: `q-local-${Date.now().toString(36)}-${i}`,
  }));
}

export const DIFFICULTY_COLOR: Record<QuestDifficulty, string> = {
  F: "#7ea2c4",
  E: "#3ddad7",
  D: "#4f7cff",
  C: "#b34cff",
  B: "#ff4f7b",
};

export const DIFFICULTY_ORDER: QuestDifficulty[] = ["F", "E", "D", "C", "B"];

export function categoryBoost(category: QuestCategory): string {
  switch (category) {
    case "strength":
      return "+1 Fuerza";
    case "intelligence":
      return "+1 Inteligencia";
    case "vitality":
      return "+1 Vitalidad";
    case "gold":
      return "+1 Oro";
  }
}
