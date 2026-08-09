import { Portal, type ChannelHandle } from "@portalsdk/core";
import type { PartyMessage, PartyMeta, PlayerClass } from "../types";
import { PORTAL_API_KEY } from "../portal";

// God mode: cada bot es su propio cliente de Portal, así tiene presencia real
// (entra al leaderboard y al contador) y puede publicar mensajes como un jugador.
// Para evitar que la plataforma deduplique anónimos del mismo navegador, cada bot
// mintéa un token con un `anonId` único (identidad distinta).

const MINT_URL = "https://api.useportal.co/v1/tokens/anonymous";

async function mintBotToken(anonId: string): Promise<string> {
  const res = await fetch(MINT_URL, {
    method: "POST",
    headers: { "x-portal-key": PORTAL_API_KEY ?? "", "content-type": "application/json" },
    body: JSON.stringify({ anonId }),
  });
  if (!res.ok) throw new Error(`mint bot token ${res.status}`);
  const data = (await res.json()) as { token?: string };
  if (!data.token) throw new Error("no token minted");
  return data.token;
}

interface BotEntry {
  name: string;
  client: Portal;
  channel: ChannelHandle<PartyMessage>;
  level: number;
  xp: number;
  cls: PlayerClass;
}

export const BOT_DEFS: Array<{ name: string; cls: PlayerClass; level: number; xp: number }> = [
  { name: "Jinwoo", cls: "cazador", level: 2, xp: 130 },
  { name: "Cha", cls: "sabio", level: 1, xp: 45 },
  { name: "Igris", cls: "guardia", level: 1, xp: 70 },
];

const BOT_QUESTS = [
  "Entrenamiento de sombras",
  "Revisión de finanzas",
  "Lectura profunda",
  "Gimnasio 1 hora",
  "Hidratación constante",
];

const BOT_RAIDS = [
  "Corran 5 km en equipo",
  "100 flexiones grupales",
  "Un día sin azúcar (los dos)",
  "10.000 pasos cada uno",
  "1 hora de estudio profundo",
  "Presupuesto estricto: $15 máx",
  "Entrenen en pareja",
];

class BotManager {
  private bots = new Map<string, BotEntry>();

  get count(): number {
    return this.bots.size;
  }

  names(): string[] {
    return [...this.bots.keys()];
  }

  /** Descriptores para construir `Member[]` en batallas (torre/raid/arena). */
  members(): Array<{ name: string; cls: PlayerClass; level: number }> {
    return [...this.bots.values()].map((b) => ({ name: b.name, cls: b.cls, level: b.level }));
  }

  private channelFor(code: string, name: string, meta: PartyMeta): ChannelHandle<PartyMessage> {
    const client = new Portal({
      apiKey: PORTAL_API_KEY ?? "",
      token: () => mintBotToken(`systemirl-bot-${name.toLowerCase()}`),
    });
    const channel = client.channel<PartyMessage>(`party-${code}`, {
      metadata: { ...meta },
      history: "none",
    });
    channel.acquire();
    channel.setMetadata({ ...meta });
    this.bots.set(name, { name, client, channel, level: meta.level, xp: meta.xp, cls: meta.cls ?? "guerrero" });
    return channel;
  }

  spawn(code: string, name: string, meta: PartyMeta): boolean {
    if (!PORTAL_API_KEY || !code || this.bots.has(name)) return false;
    const channel = this.channelFor(code, name, meta);
    const announce = () => {
      void channel.send({ content: { kind: "join", name } }).catch(() => {});
    };
    // El join se publica cuando el canal está listo (la presencia ya quedó registrada),
    // no inmediatamente tras acquire().
    if (channel.status === "ready") {
      announce();
    } else {
      const unsub = channel.on("status", (s) => {
        if (s === "ready") {
          unsub();
          announce();
        }
      });
    }
    return true;
  }

  setMeta(name: string, meta: PartyMeta): void {
    const bot = this.bots.get(name);
    if (!bot) return;
    bot.level = meta.level;
    bot.xp = meta.xp;
    bot.channel.setMetadata({ ...meta });
  }

  act(name: string, content: PartyMessage): void {
    const bot = this.bots.get(name);
    if (bot) void bot.channel.send({ content });
  }

  complete(name: string): void {
    const bot = this.bots.get(name);
    if (!bot) return;
    const quest = BOT_QUESTS[Math.floor(Math.random() * BOT_QUESTS.length)];
    this.act(name, { kind: "done", name, quest });
  }

  levelUp(name: string): void {
    const bot = this.bots.get(name);
    if (!bot) return;
    const level = bot.level + 1;
    const xp = bot.xp + 120;
    this.setMeta(name, { name, level, xp, streak: bot.level > 1 ? 2 : 1, cls: bot.cls });
    this.act(name, { kind: "levelup", name, level, xp });
  }

  raid(name: string, raid?: string): void {
    this.act(name, { kind: "raid", name, raid: raid ?? BOT_RAIDS[Math.floor(Math.random() * BOT_RAIDS.length)] });
  }

  clear(): void {
    for (const bot of this.bots.values()) {
      try {
        bot.channel.release();
      } catch {
        /* noop */
      }
    }
    this.bots.clear();
  }
}

export const botManager = new BotManager();
