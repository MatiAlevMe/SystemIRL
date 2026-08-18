// Preferencias del jugador: tags de interés que guían a la IA al generar quests.
// Se eligen como chips en el onboarding (2-3) y viajan al prompt de /api/quests.

import type { QuestCategory } from "../types";

export interface QuestTag {
  id: string;
  label: string;
  icon: string;
  category: QuestCategory;
}

export const QUEST_TAGS: QuestTag[] = [
  { id: "gym", label: "Gimnasio", icon: "🏋️", category: "strength" },
  { id: "boxeo", label: "Boxeo", icon: "🥊", category: "strength" },
  { id: "lectura", label: "Lectura", icon: "📚", category: "intelligence" },
  { id: "idiomas", label: "Idiomas", icon: "🗣️", category: "intelligence" },
  { id: "correr", label: "Correr", icon: "🏃", category: "vitality" },
  { id: "meditar", label: "Meditación", icon: "🧘", category: "vitality" },
  { id: "finanzas", label: "Finanzas", icon: "💸", category: "gold" },
  { id: "cocinar", label: "Cocinar", icon: "🍳", category: "gold" },
];

export const MAX_PREF_TAGS = 3;
export const MIN_PREF_TAGS = 2;

export function tagLabel(id: string): string {
  return QUEST_TAGS.find((t) => t.id === id)?.label ?? id;
}

// Categorías de interés derivadas de los tags elegidos. Se mandan al server
// para sesgar el rank hacia arriba SIN limitar la cobertura de categorías.
export function categoriesForTags(tags: string[]): QuestCategory[] {
  const cats = new Set<QuestCategory>();
  for (const t of tags) {
    const c = QUEST_TAGS.find((x) => x.id === t)?.category;
    if (c) cats.add(c);
  }
  return [...cats];
}
