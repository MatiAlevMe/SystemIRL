// SystemIRL — quest generator (Vercel Serverless Function)
// POST /api/quests
// Body: { history: string[], playerLevel: number, streak: number, count?: number }
// Returns personalized daily quests using Gemini. Falls back to a canned pool
// when the API key is missing or Gemini fails, so the app always works.

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

interface QuestsBody {
  history?: string[];
  playerLevel?: number;
  streak?: number;
  count?: number;
}

export default async function handler(
  req: Request & { query?: Record<string, string> },
  res: {
    status: (code: number) => { json: (body: unknown) => void };
    json: (body: unknown) => void;
  },
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  let body: QuestsBody = {};
  try {
    const raw = await new Response(req.body).text();
    body = raw ? JSON.parse(raw) : {};
  } catch {
    body = {};
  }

  const history = Array.isArray(body.history) ? body.history : [];
  const playerLevel = Math.max(1, Number(body.playerLevel) || 1);
  const streak = Math.max(0, Number(body.streak) || 0);
  const count = Math.min(6, Math.max(3, Number(body.count) || 3));

  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
    try {
      const quests = await generateWithGemini(apiKey, { history, playerLevel, streak, count });
      if (quests && quests.length > 0) {
        return res.status(200).json({ source: "gemini", quests });
      }
    } catch (err) {
      console.error("Gemini failed, falling back to canned pool:", err);
    }
  }

  return res.status(200).json({ source: "fallback", quests: fallbackQuests({ playerLevel, streak, count }) });
}

const MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

async function generateWithGemini(
  apiKey: string,
  opts: { history: string[]; playerLevel: number; streak: number; count: number },
): Promise<Quest[] | null> {
  const { history, playerLevel, streak, count } = opts;

  const recent = history.slice(-15).map((h) => `- ${h}`).join("\n") || "- (nuevo jugador)";

  const prompt = [
    `Eres "El Sistema", el agente que asigna quests a un jugador para mejorar su vida real.`,
    `Nivel del jugador: ${playerLevel}. Racha actual (días seguidos): ${streak}.`,
    `Historial reciente de quests completadas:\n${recent}`,
    ``,
    `Genera exactamente ${count} quests diarias NUEVAS para hoy (no repitas las del historial),`,
    `adaptadas al nivel del jugador (más difíciles/mayor XP si es nivel alto).`,
    `Cada quest debe ser concreta, accionable y realista (fitness, hábitos, finanzas, lectura, enfoque).`,
    `Responde SOLO con JSON:`,
    `{"quests":[{"title":"...","description":"...","category":"strength|intelligence|vitality|gold","difficulty":"F|E|D|C|B","xp":25}]}`,
    `- xp entre 25 y 80, coherente con difficulty y nivel.`,
    `- description: instrucción breve de qué hacer (máx 1 frase).`,
  ].join("\n");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: "Eres El Sistema. Siempre respondes JSON válido, sin markdown." }],
        },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.9,
          responseMimeType: "application/json",
        },
      }),
    },
  );

  if (!res.ok) {
    throw new Error(`Gemini HTTP ${res.status}: ${await res.text()}`);
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  const json = extractJson(text);
  if (!json) return null;

  const rawQuests = json.quests;
  if (!Array.isArray(rawQuests)) return null;

  const quests: Quest[] = rawQuests
    .slice(0, count)
    .map((q: Record<string, unknown>, i: number) => sanitizeQuest(q, i))
    .filter((q: Quest | null): q is Quest => q !== null);

  return quests.length > 0 ? quests : null;
}

function extractJson(text: string): { quests?: unknown } | null {
  const cleaned = text.replace(/```(?:json)?/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1)) as { quests?: unknown };
  } catch {
    return null;
  }
}

const CATEGORIES: QuestCategory[] = ["strength", "intelligence", "vitality", "gold"];
const DIFFICULTIES: QuestDifficulty[] = ["F", "E", "D", "C", "B"];

function sanitizeQuest(q: Record<string, unknown>, i: number): Quest | null {
  const title = typeof q.title === "string" ? q.title.trim().slice(0, 120) : "";
  if (!title) return null;
  const description = typeof q.description === "string" ? q.description.trim().slice(0, 200) : "";
  const category = CATEGORIES.includes(q.category as QuestCategory) ? (q.category as QuestCategory) : "vitality";
  const difficulty = DIFFICULTIES.includes(q.difficulty as QuestDifficulty) ? (q.difficulty as QuestDifficulty) : "E";
  const xp = Math.max(20, Math.min(100, Number(q.xp) || 40));
  return { id: `q-${Date.now().toString(36)}-${i}`, title, description, category, difficulty, xp };
}

// ---- Canned fallback pool ------------------------------------
interface PoolQuest {
  title: string;
  description: string;
  category: QuestCategory;
  difficulty: QuestDifficulty;
  xp: number;
}

const POOL: PoolQuest[] = [
  { title: "3x10 press de banca", description: "3 series de 10 repeticiones. Fuerza en serio.", category: "strength", difficulty: "D", xp: 50 },
  { title: "Corre 5 km", description: "5 km sin parar. Tu cardio te lo agradecerá.", category: "vitality", difficulty: "D", xp: 55 },
  { title: "Lee 10 páginas", description: "10 páginas de cualquier libro. Sin pantallas.", category: "intelligence", difficulty: "E", xp: 35 },
  { title: "Gasta menos de $10 en almuerzo", description: "Presupuesto estricto hoy. Oro a salvo.", category: "gold", difficulty: "E", xp: 40 },
  { title: "100 flexiones repartidas", description: "100 flexiones en series durante el día.", category: "strength", difficulty: "C", xp: 65 },
  { title: "Sin carbs procesados", description: "Todo el día sin azúcar ni carbs procesados.", category: "vitality", difficulty: "C", xp: 60 },
  { title: "1 hora de estudio profundo", description: "Una hora enfocado en una habilidad. Teléfono lejos.", category: "intelligence", difficulty: "D", xp: 55 },
  { title: "Medita 10 minutos", description: "10 minutos de mindfulness. Nada más.", category: "vitality", difficulty: "F", xp: 25 },
  { title: "Entrena boxeo 45 min", description: "Saco, sombra y técnica. 45 minutos.", category: "strength", difficulty: "C", xp: 70 },
  { title: "Ahorra $20", description: "Aparta $20 sin tocarlos. El oro se acumula.", category: "gold", difficulty: "D", xp: 50 },
  { title: "Escribe 500 palabras", description: "Journaling o tu proyecto. 500 palabras.", category: "intelligence", difficulty: "E", xp: 40 },
  { title: "Sin redes sociales hasta las 18:00", description: "Cero doomscrolling en la mañana.", category: "intelligence", difficulty: "D", xp: 45 },
  { title: "Pesas: full body 45 min", description: "Rutina full body. 45 minutos.", category: "strength", difficulty: "C", xp: 65 },
  { title: "Prepárate la comida del día", description: "Cocina tu almuerzo y cena en casa.", category: "gold", difficulty: "E", xp: 45 },
  { title: "5 km de caminata rápida", description: "Paso ligero, 5 km. Activo pero sin exigirte.", category: "vitality", difficulty: "E", xp: 30 },
  { title: "Revisa tu presupuesto 15 min", description: "15 minutos con tus finanzas. Sin excusas.", category: "gold", difficulty: "F", xp: 25 },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function fallbackQuests(opts: { playerLevel: number; streak: number; count: number }): Quest[] {
  const boost = opts.playerLevel >= 4 ? 1.2 : 1;
  return shuffle(POOL)
    .slice(0, opts.count)
    .map((p, i) => ({
      id: `q-fb-${Date.now().toString(36)}-${i}`,
      title: p.title,
      description: p.description,
      category: p.category,
      difficulty: p.difficulty,
      xp: Math.round(p.xp * boost / 5) * 5,
    }));
}
