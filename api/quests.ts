// SystemIRL — quest generator (Vercel Serverless Function)
// POST /api/quests
// Body: { history: string[], playerLevel: number, streak: number, count?: number,
//         tags?: string[], rankBias?: number, forceRank?: "F"|"E"|"D"|"C"|"B" }
// Returns personalized daily quests from the first AI provider with a key
// (Gemini, Kilo Gateway or OpenCode Zen; QUEST_PROVIDER can force one), falling
// back to a canned pool so the app always works.

// Named HTTP export = Vercel Web API signature. The previous `export default`
// handler returned a Response that Vercel ignored, so the function hung.
export const maxDuration = 30;

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
  tags?: string[];
  rankBias?: number;
  forceRank?: QuestDifficulty;
}

export async function POST(request: Request): Promise<Response> {
  let body: QuestsBody = {};
  try {
    body = (await request.json()) as QuestsBody;
  } catch {
    body = {};
  }

  const history = Array.isArray(body.history) ? body.history : [];
  const playerLevel = Math.max(1, Number(body.playerLevel) || 1);
  const streak = Math.max(0, Number(body.streak) || 0);
  const count = Math.min(6, Math.max(3, Number(body.count) || 3));
  const tags = Array.isArray(body.tags)
    ? body.tags.filter((t): t is string => typeof t === "string").slice(0, 6)
    : [];
  const rankBias = Math.max(-2, Math.min(3, Math.round(Number(body.rankBias) || 0)));
  const forceRank = DIFFICULTIES.includes(body.forceRank as QuestDifficulty)
    ? (body.forceRank as QuestDifficulty)
    : undefined;

  const rank = rankRange(rankBias);
  for (const source of providerOrder()) {
    const quests = await trySource(source, { history, playerLevel, streak, count, tags, rank, forceRank });
    if (quests && quests.length > 0) {
      return json({ source, quests });
    }
  }

  return json({
    source: "fallback",
    quests: fallbackQuests({ playerLevel, streak, count, rank, forceRank }),
  });
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// ---- Provider selection --------------------------------------
export type QuestSource = "gemini" | "kilo" | "zen";

interface QuestOpts {
  history: string[];
  playerLevel: number;
  streak: number;
  count: number;
  tags: string[];
  rank: [QuestDifficulty, QuestDifficulty];
  forceRank?: QuestDifficulty;
}

const FETCH_TIMEOUT_MS = 8000;

// QUEST_PROVIDER=auto (default): prueba en orden gemini -> kilo -> zen
// los que tengan key. Con QUEST_PROVIDER=gemini|kilo|zen ese va primero
// y el resto sigue como respaldo si tiene key.
function providerOrder(): QuestSource[] {
  const forced = process.env.QUEST_PROVIDER;
  const available: QuestSource[] = [];
  if (process.env.GEMINI_API_KEY) available.push("gemini");
  if (process.env.KILO_API_KEY) available.push("kilo");
  if (process.env.ZEN_API_KEY) available.push("zen");

  if (forced === "gemini" || forced === "kilo" || forced === "zen") {
    return [forced, ...available.filter((p) => p !== forced)];
  }
  return available;
}

async function trySource(source: QuestSource, opts: QuestOpts): Promise<Quest[] | null> {
  try {
    const quests =
      source === "gemini"
        ? await generateWithGemini(opts)
        : await generateOpenAICompatible(source, opts);
    if (quests && quests.length > 0) return quests;
  } catch (err) {
    console.error(`[${source}] failed:`, err);
  }
  return null;
}

// ---- Gemini (Google generateContent) -------------------------
// gemini-2.0-flash is retired from the free tier (limit 0), so newer flash
// models go first. GEMINI_MODEL overrides and goes first.
const GEMINI_MODELS = process.env.GEMINI_MODEL
  ? [process.env.GEMINI_MODEL, "gemini-3.6-flash", "gemini-2.5-flash"]
  : ["gemini-3.6-flash", "gemini-2.5-flash", "gemini-2.0-flash"];

async function generateWithGemini(opts: QuestOpts): Promise<Quest[] | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  for (const model of GEMINI_MODELS) {
    try {
      const quests = await callGemini(apiKey, model, opts);
      if (quests && quests.length > 0) return quests;
    } catch (err) {
      console.error(`Gemini ${model} failed:`, err);
    }
  }
  return null;
}

async function callGemini(apiKey: string, model: string, opts: QuestOpts): Promise<Quest[] | null> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
        contents: [{ role: "user", parts: [{ text: buildPrompt(opts) }] }],
        generationConfig: { temperature: 0.9, responseMimeType: "application/json" },
      }),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    },
  );

  if (!res.ok) throw new Error(`Gemini HTTP ${res.status}: ${await res.text()}`);

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  return parseQuests(text, opts.count, { rank: opts.rank, forceRank: opts.forceRank });
}

// ---- Kilo Gateway / OpenCode Zen (OpenAI-compatible) ---------
interface OpenAICompatConfig {
  apiKey: string;
  baseUrl: string;
  models: string[];
}

function openAICompatConfig(source: "kilo" | "zen"): OpenAICompatConfig {
  if (source === "kilo") {
    return {
      apiKey: process.env.KILO_API_KEY ?? "",
      baseUrl: "https://api.kilo.ai/api/gateway",
      models: process.env.KILO_MODEL
        ? [process.env.KILO_MODEL, "nvidia/nemotron-3-super-120b-a12b:free", "inclusionai/ling-3.0-flash:free"]
        : ["nvidia/nemotron-3-super-120b-a12b:free", "inclusionai/ling-3.0-flash:free"],
    };
  }
  return {
    apiKey: process.env.ZEN_API_KEY ?? "",
    baseUrl: "https://opencode.ai/zen/v1",
    models: process.env.ZEN_MODEL
      ? [process.env.ZEN_MODEL, "big-pickle", "deepseek-v4-flash-free"]
      : ["big-pickle", "deepseek-v4-flash-free"],
  };
}

async function generateOpenAICompatible(source: "kilo" | "zen", opts: QuestOpts): Promise<Quest[] | null> {
  const config = openAICompatConfig(source);
  if (!config.apiKey) return null;
  for (const model of config.models) {
    try {
      const quests = await callOpenAICompatible(source, config, model, opts);
      if (quests && quests.length > 0) return quests;
    } catch (err) {
      console.error(`${source} ${model} failed:`, err);
    }
  }
  return null;
}

async function callOpenAICompatible(
  source: "kilo" | "zen",
  config: OpenAICompatConfig,
  model: string,
  opts: QuestOpts,
): Promise<Quest[] | null> {
  const res = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM_INSTRUCTION },
        { role: "user", content: buildPrompt(opts) },
      ],
      temperature: 0.9,
    }),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!res.ok) throw new Error(`${source} HTTP ${res.status}: ${await res.text()}`);

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = data.choices?.[0]?.message?.content ?? "";
  return parseQuests(text, opts.count, { rank: opts.rank, forceRank: opts.forceRank });
}

// ---- Shared prompt / parsing ----------------------------------
const SYSTEM_INSTRUCTION = "Eres El Sistema. Siempre respondes JSON válido, sin markdown.";

function buildPrompt(opts: QuestOpts): string {
  const { history, playerLevel, streak, count, tags, rank, forceRank } = opts;
  const recent = history.slice(-15).map((h) => `- ${h}`).join("\n") || "- (nuevo jugador)";
  const interests =
    tags.length > 0
      ? `Intereses del jugador (prioriza quests alineadas con estos tags):\n${tags.map((t) => `- ${t}`).join("\n")}`
      : "Intereses: sin preferencias marcadas, usa variedad.";
  const rankRule = forceRank
    ? `Genera todas las quests con dificultad EXACTA ${forceRank}.`
    : rank[0] === "F" && rank[1] === "B"
      ? ""
      : `Las quests deben tener dificultad entre ${rank[0]} y ${rank[1]} (rango ${rank[0] === "D" ? "endurecido" : "suavizado"}).`;

  return [
    `Eres "El Sistema", el agente que asigna quests a un jugador para mejorar su vida real.`,
    `Nivel del jugador: ${playerLevel}. Racha actual (días seguidos): ${streak}.`,
    `Historial reciente de quests completadas:\n${recent}`,
    interests,
    ``,
    `Genera exactamente ${count} quests diarias NUEVAS para hoy (no repitas las del historial),`,
    `adaptadas al nivel del jugador (más difíciles/mayor XP si es nivel alto).`,
    rankRule,
    `Cada quest debe ser concreta, accionable y realista (fitness, hábitos, finanzas, lectura, enfoque).`,
    `GUARDRAIL: NUNCA sugieras acciones peligrosas, ilegales, autodestructivas ni que pongan en riesgo`,
    `la salud física o mental. Si un interés del jugador entra en conflicto, deriva hacia algo seguro y constructivo.`,
    `Responde SOLO con JSON:`,
    `{"quests":[{"title":"...","description":"...","category":"strength|intelligence|vitality|gold","difficulty":"F|E|D|C|B","xp":25}]}`,
    `- xp entre 25 y 80, coherente con difficulty y nivel.`,
    `- description: instrucción breve de qué hacer (máx 1 frase).`,
  ].join("\n");
}

function parseQuests(text: string, count: number, opts: Pick<QuestOpts, "rank" | "forceRank">): Quest[] | null {
  const json = extractJson(text);
  if (!json) return null;
  const rawQuests = json.quests;
  if (!Array.isArray(rawQuests)) return null;

  const quests: Quest[] = rawQuests
    .slice(0, count)
    .map((q: Record<string, unknown>, i: number) => sanitizeQuest(q, i, opts))
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

// Rango de dificultades según rankBias (preferencias del jugador).
// -1 "bajar rango": F..D · 0 normal: F..B · +1 (reliquia de ambición): E..B · ≥2: D..B
function rankRange(bias: number): [QuestDifficulty, QuestDifficulty] {
  if (bias <= -1) return ["F", "D"];
  if (bias === 1) return ["E", "B"];
  if (bias >= 2) return ["D", "B"];
  return ["F", "B"];
}

function clampRank(d: QuestDifficulty, lo: QuestDifficulty, hi: QuestDifficulty): QuestDifficulty {
  const i = DIFFICULTIES.indexOf(d);
  const min = DIFFICULTIES.indexOf(lo);
  const max = DIFFICULTIES.indexOf(hi);
  const c = Math.max(min, Math.min(max, i === -1 ? 2 : i));
  return DIFFICULTIES[c];
}

function sanitizeQuest(
  q: Record<string, unknown>,
  i: number,
  opts: Pick<QuestOpts, "rank" | "forceRank">,
): Quest | null {
  const title = typeof q.title === "string" ? q.title.trim().slice(0, 120) : "";
  if (!title) return null;
  const description = typeof q.description === "string" ? q.description.trim().slice(0, 200) : "";
  const category = CATEGORIES.includes(q.category as QuestCategory) ? (q.category as QuestCategory) : "vitality";
  let difficulty: QuestDifficulty = DIFFICULTIES.includes(q.difficulty as QuestDifficulty)
    ? (q.difficulty as QuestDifficulty)
    : "E";
  if (opts.forceRank) difficulty = opts.forceRank;
  else difficulty = clampRank(difficulty, opts.rank[0], opts.rank[1]);
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

function fallbackQuests(opts: {
  playerLevel: number;
  streak: number;
  count: number;
  rank: [QuestDifficulty, QuestDifficulty];
  forceRank?: QuestDifficulty;
}): Quest[] {
  const boost = opts.playerLevel >= 4 ? 1.2 : 1;
  const pool =
    opts.forceRank || opts.rank[0] !== "F" || opts.rank[1] !== "B"
      ? POOL.filter((p) => (opts.forceRank ? p.difficulty === opts.forceRank : rankInRange(p.difficulty, opts.rank)))
      : POOL;
  const base = shuffle(pool.length > 0 ? pool : POOL);
  const source = Array.from({ length: opts.count }, (_, i) => base[i % base.length]);
  return source.map((p, i) => ({
    id: `q-fb-${Date.now().toString(36)}-${i}`,
    title: p.title,
    description: p.description,
    category: p.category,
    difficulty: opts.forceRank ? opts.forceRank : p.difficulty,
    xp: Math.round((p.xp * boost) / 5) * 5,
  }));
}

function rankInRange(d: QuestDifficulty, rank: [QuestDifficulty, QuestDifficulty]): boolean {
  const i = DIFFICULTIES.indexOf(d);
  const min = DIFFICULTIES.indexOf(rank[0]);
  const max = DIFFICULTIES.indexOf(rank[1]);
  return i >= min && i <= max;
}
