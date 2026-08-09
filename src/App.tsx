import { clear as clearIdb } from "idb-keyval";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Message } from "@portalsdk/core";
import { useChannel } from "@portalsdk/react";
import Onboarding from "./components/Onboarding";
import QuestList from "./components/QuestList";
import StatsPanel from "./components/StatsPanel";
import CharacterPanel from "./components/CharacterPanel";
import PartyPanel from "./components/PartyPanel";
import ArenaPanel from "./components/ArenaPanel";
import LevelUpModal from "./components/LevelUpModal";
import BattleModal from "./components/BattleModal";
import DemoPanel from "./components/DemoPanel";
import ShopPanel from "./components/ShopPanel";
import TowerPanel from "./components/TowerPanel";
import { portalClient } from "./portal";
import {
  clearDoneToday,
  clearRegens,
  completeQuest,
  emptyPlayer,
  grantXp,
  loadDoneToday,
  loadPlayer,
  loadRegens,
  saveDoneToday,
  savePlayer,
  saveQuestCache,
  saveRegens,
} from "./lib/storage";
import { fetchDailyQuests } from "./lib/quests";
import { todayKey, xpForLevel, xpProgress } from "./lib/xp";
import { botManager } from "./lib/bots";
import {
  act,
  advanceTower,
  battlePersist,
  floorInfo,
  healFromQuest,
  questCoins,
  RAID_BOSS_HP,
  restoreFull,
  startBossBattle,
  startGrindBattle,
  startRaidBattle,
  type BattleAction,
  type BattleResult,
  type BattleState,
} from "./lib/rpg";
import { itemById, RAID_AURAS, type ShopItem } from "./lib/catalog";
import { weekRaid, weeklyRaidGoal } from "./lib/raids";
import { RAID_META_DAMAGE_PCT, MAX_TOWER_ENERGY, MAX_ARENA_1V1_ENERGY, MAX_ARENA_TOURNAMENT_ENERGY } from "./lib/balance";
import { playComplete, playDefeat, playLevelUp, playVictory } from "./lib/sound";
import { startMusic, toggleMusic, isMusicOn, setMusicMode } from "./lib/music";
import type { PartyMessage, PlayerClass, PlayerState, Quest } from "./types";

function weekRaidKey(): string {
  return "raid:" + weekRaid();
}

function raidContribKey(): string {
  return "raid-contrib:" + weekRaid();
}

const TOAST_ICON: Record<string, string> = {
  levelup: "⚡",
  done: "▸",
  raid: "⌁",
  join: "◈",
  raidHit: "⚔",
};

function toastText(content: Partial<PartyMessage>): string {
  switch (content.kind) {
    case "levelup":
      return `${content.name} alcanzó el nivel ${content.level}`;
    case "done":
      return `${content.name} completó: ${content.quest}`;
    case "raid":
      return `${content.name} completó la raid de la semana 🏆`;
    case "join":
      return `${content.name} se unió a la party`;
    case "raidHit":
      return content.dmg && content.dmg > 0
        ? `⚔ ${content.name} golpeó al jefe de raid (-${content.dmg})`
        : `🛡 ${content.name} hizo retroceder al jefe de raid`;
    default:
      return "";
  }
}

interface RaidState {
  hp: number;
  contributors: Set<string>;
  lastHitAt: number;
}

// El HP del jefe de raid es el estado de la party: suma de mensajes raidHit.
// Sin golpes en 24h, el jefe se regenera un 30% del daño hecho.
function computeRaidState(messages: readonly Message<PartyMessage>[], raid: string): RaidState {
  let dmg = 0;
  const contributors = new Set<string>();
  let lastHitAt = 0;
  for (const m of messages) {
    const c = m.content as Partial<PartyMessage> | null;
    if (!c || c.kind !== "raidHit" || c.raid !== raid) continue;
    if (typeof c.dmg === "number") dmg += c.dmg;
    if (typeof c.name === "string") contributors.add(c.name);
    lastHitAt = Math.max(lastHitAt, m.timestamp);
  }
  const idleMs = 24 * 3600 * 1000;
  if (lastHitAt > 0 && Date.now() - lastHitAt > idleMs) {
    dmg = Math.max(0, Math.round(dmg * 0.7));
  }
  return { hp: Math.max(0, RAID_BOSS_HP - dmg), contributors, lastHitAt };
}

// Rango efectivo de dificultad: bonus de reliquia de ambición.
function rankBiasOf(p: PlayerState): number {
  return itemById(p.trinket)?.bonus?.rankBias ?? 0;
}

const MAX_REGENS_PER_DAY = 2;

export default function App() {
  const [player, setPlayer] = useState<PlayerState | null | undefined>(undefined); // undefined = loading
  const [quests, setQuests] = useState<Quest[] | null>(null);
  const [questSource, setQuestSource] = useState("cached");
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set());
  const [completing, setCompleting] = useState(false);
  const [partyCode, setPartyCodeState] = useState<string>(() => localStorage.getItem("partyCode") ?? "");
  const [tab, setTab] = useState<"daily" | "party" | "shop" | "tower" | "personaje" | "arena">("daily");
  const [levelUp, setLevelUp] = useState<{ level: number } | null>(null);
  const [raidClaimed, setRaidClaimed] = useState(false);
  const [demoSource, setDemoSource] = useState<string | null>(null);
  const isDemo = typeof window !== "undefined" && window.location.hash.includes("demo");
  const [toast, setToast] = useState<{ id: string; text: string; kind: string } | null>(null);
  const lastMsgRef = useRef<string | null>(null);
  const [battle, setBattle] = useState<BattleState | null>(null);
  const [battleResult, setBattleResult] = useState<BattleResult | null>(null);
  const [xpFloat, setXpFloat] = useState<{ id: number; text: string } | null>(null);
  const floatIdRef = useRef(0);
  const [musicOn, setMusicOn] = useState(isMusicOn);
  const [regensLeft, setRegensLeft] = useState(0);
  const [autopilot, setAutopilot] = useState(false);
  const [revealWeakness, setRevealWeakness] = useState(false);

  const party = useChannel<PartyMessage>({
    channelId: partyCode ? `party-${partyCode}` : undefined,
    history: 40,
  });

  const raidState = useMemo(() => computeRaidState(party.messages, weekRaid()), [party.messages]);

  const joinedRef = useRef<string | null>(null);

  const setPartyCode = useCallback((code: string) => {
    setPartyCodeState(code);
    if (code) localStorage.setItem("partyCode", code);
    else {
      localStorage.removeItem("partyCode");
      botManager.clear();
    }
  }, []);

  const loadQuests = useCallback(async (p: PlayerState, force = false) => {
    setQuests(null);
    const res = await fetchDailyQuests({
      history: p.history,
      playerLevel: xpProgress(p.xp).level,
      streak: p.streak,
      count: 6,
      tags: p.prefs.length > 0 ? p.prefs : undefined,
      rankBias: rankBiasOf(p),
      force,
    });
    setQuests(res.quests);
    setQuestSource(res.source);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const p = await loadPlayer();
      if (!alive) return;
      setPlayer(p);
      if (p) {
        await loadQuests(p);
        const ids = await loadDoneToday(todayKey());
        const regens = await loadRegens(todayKey());
        if (alive) {
          setDoneIds(new Set(ids));
          setRegensLeft(Math.max(0, MAX_REGENS_PER_DAY - regens));
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [loadQuests]);

  useEffect(() => {
    const key = weekRaidKey();
    setRaidClaimed(localStorage.getItem(key) === "1");
  }, []);

  // Sincroniza presence metadata de la party con el estado del jugador.
  useEffect(() => {
    if (!player || !partyCode) return;
    const { level } = xpProgress(player.xp);
    party.setMetadata({
      name: player.name,
      level,
      xp: player.xp,
      streak: player.streak,
      title: player.title ?? undefined,
      color: player.color ?? undefined,
      cls: player.cls,
    });
  }, [partyCode, player?.name, player?.xp, player?.streak, player?.title, player?.color, player?.cls]);

  // Anuncia la llegada cuando la party queda conectada.
  useEffect(() => {
    if (!partyCode) {
      joinedRef.current = null;
      return;
    }
    if (party.status === "ready" && joinedRef.current !== partyCode && player) {
      joinedRef.current = partyCode;
      void party.send({ content: { kind: "join", name: player.name } });
    }
  }, [party.status, partyCode, player?.name]);

  // Toast del feed en vivo en cualquier pestaña (el realtime se ve sin cambiar de tab).
  useEffect(() => {
    const msgs = party.messages;
    if (!msgs || msgs.length === 0) return;
    const last = msgs[msgs.length - 1];
    if (last.id === lastMsgRef.current) return;
    lastMsgRef.current = last.id;
    const c = last.content as Partial<PartyMessage> | null;
    if (!c || typeof c.kind !== "string") return;
    const text = toastText(c);
    if (!text) return;
    setToast({ id: last.id, text, kind: c.kind });
  }, [party.messages]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!xpFloat) return;
    const t = setTimeout(() => setXpFloat(null), 1600);
    return () => clearTimeout(t);
  }, [xpFloat]);

  // La música arranca con la primera interacción (AudioContext lo exige).
  useEffect(() => {
    const kick = () => startMusic();
    window.addEventListener("pointerdown", kick, { once: true });
    window.addEventListener("keydown", kick, { once: true });
    return () => {
      window.removeEventListener("pointerdown", kick);
      window.removeEventListener("keydown", kick);
    };
  }, []);

  // Pista premium si el jugador la compró.
  useEffect(() => {
    setMusicMode(player?.music ? "premium" : "base");
  }, [player?.music]);

  // El HP del jefe de raid llega de la party: sincroniza una batalla raid abierta.
  useEffect(() => {
    if (raidState.hp <= 0) {
      setBattle((prev) =>
        prev && prev.mode === "raid" && !prev.result
          ? { ...prev, result: "victory", enemies: prev.enemies.map((e) => ({ ...e, hp: 0 })) }
          : prev,
      );
      return;
    }
    setBattle((prev) =>
      prev && prev.mode === "raid" && !prev.result && prev.damageDealt === 0
        ? { ...prev, enemies: prev.enemies.map((e) => ({ ...e, hp: Math.min(e.maxHp, raidState.hp) })) }
        : prev,
    );
  }, [raidState.hp]);

  // Claim explícito de la recompensa (aura) cuando el jefe de raid cae: solo contribuyentes.
  const handleClaimRaid = useCallback(async () => {
    if (!player || raidState.hp > 0 || raidClaimed) return;
    const contributed =
      raidState.contributors.has(player.name) || localStorage.getItem(raidContribKey()) === player.name;
    if (!contributed) return;
    localStorage.setItem(weekRaidKey(), "1");
    setRaidClaimed(true);
    const aura = RAID_AURAS[Math.floor(Math.random() * RAID_AURAS.length)];
    const next: PlayerState = {
      ...player,
      owned: player.owned.includes(aura.id) ? player.owned : [...player.owned, aura.id],
      aura: player.aura ?? aura.id,
    };
    setPlayer(next);
    void savePlayer(next);
    setToast({ id: `raid-award-${Date.now()}`, text: `🏆 ¡Jefe de raid derrotado! Recompensa: ${aura.name}`, kind: "raid" });
    if (partyCode) void party.send({ content: { kind: "raid", name: player.name, raid: weekRaid() } });
  }, [raidState.hp, raidClaimed, player, partyCode, party]);

  const handleOnboard = useCallback(
    async (name: string, cls: PlayerClass, tags: string[]) => {
      const p = emptyPlayer(name);
      const next = { ...p, cls, prefs: tags };
      await savePlayer(next);
      setPlayer(next);
      await loadQuests(next);
    },
    [loadQuests],
  );

  const handleRegenerate = useCallback(async () => {
    if (!player || regensLeft <= 0) return;
    const used = MAX_REGENS_PER_DAY - regensLeft + 1;
    await saveRegens(todayKey(), used);
    setRegensLeft(Math.max(0, MAX_REGENS_PER_DAY - used));
    // Solo se reemplazan las NO completadas: se piden nuevas y se fusionan con las
    // completadas, para que la recarga no pierda el progreso del día.
    const pending = (quests ?? []).filter((q) => !doneIds.has(q.id));
    const count = Math.max(1, pending.length);
    const res = await fetchDailyQuests({
      history: player.history,
      playerLevel: xpProgress(player.xp).level,
      streak: player.streak,
      count,
      tags: player.prefs.length > 0 ? player.prefs : undefined,
      rankBias: rankBiasOf(player),
      force: true,
    });
    const merged = [...(quests ?? []).filter((q) => doneIds.has(q.id)), ...res.quests];
    await saveQuestCache(todayKey(), merged);
    setQuests(merged);
    setQuestSource(res.source);
  }, [player, regensLeft, quests, doneIds]);

  const handleComplete = useCallback(
    async (q: Quest) => {
      if (!player || completing) return;
      setCompleting(true);
      try {
        const res = await completeQuest(player, q);
        const tower = advanceTower(res.player, q);
        let next = healFromQuest(res.player, q.difficulty);
        if (res.leveledUp) next = restoreFull(next);
        next = {
          ...next,
          tower: { floor: tower.floor, damage: tower.damage },
          coins: next.coins + tower.coins + questCoins(q.difficulty),
        };
        setPlayer(next);
        await savePlayer(next);
        const done = new Set(doneIds);
        done.add(q.id);
        setDoneIds(done);
        await saveDoneToday(todayKey(), [...done]);
        playComplete();
        if (res.leveledUp) playLevelUp();
        setXpFloat({
          id: ++floatIdRef.current,
          text: `+${res.xpGained} XP · +${tower.coins + questCoins(q.difficulty)} oro`,
        });

        if (partyCode) {
          void party.send({ content: { kind: "done", name: player.name, quest: q.title } });
          if (res.leveledUp) {
            void party.send({
              content: { kind: "levelup", name: player.name, level: res.level, xp: next.xp },
            });
          }
        }
        if (res.leveledUp) setLevelUp({ level: res.level });
      } finally {
        setCompleting(false);
      }
    },
    [player, completing, doneIds, partyCode],
  );

  // ---- Combate táctico (Torre + raid) ----
  const handleGrind = useCallback(() => {
    if (!player) return;
    setBattleResult(null);
    setBattle(startGrindBattle(player, player.tower.floor));
  }, [player]);

  const handleFightBoss = useCallback(() => {
    if (!player) return;
    setBattleResult(null);
    setBattle(startBossBattle(player));
  }, [player]);

  const handleFightRaid = useCallback(() => {
    if (!player || !partyCode) return;
    setBattleResult(null);
    setBattle(startRaidBattle(player, raidState.hp, botManager.members()));
  }, [player, partyCode, raidState.hp]);

  const handleBattleAction = useCallback(
    (action: BattleAction) => {
      if (!player || !battle || battle.result) return;
      const prevDamage = battle.damageDealt;
      const { state, result } = act(battle, action);
      setBattle(state);
      if (!result) return;

      let next = battlePersist(player, state, result);

      // Jefe de torre: el daño de la pelea se suma a la barra del piso.
      if (state.mode === "boss" && result.victory) {
        const info = floorInfo(player.tower.floor);
        if (info) {
          const newDamage = player.tower.damage + result.damageDealt;
          if (newDamage >= info.hp) {
            const nextInfo = floorInfo(info.floor + 1);
            next = {
              ...next,
              tower: nextInfo ? { floor: nextInfo.floor, damage: 0 } : { floor: info.floor, damage: info.hp },
              coins: next.coins + info.reward,
            };
            setToast({
              id: `tower-clear-${Date.now()}`,
              text: `🏰 ¡Piso ${info.floor} conquistado! +${info.reward} oro`,
              kind: "levelup",
            });
          } else {
            next = { ...next, tower: { floor: info.floor, damage: newDamage } };
          }
        }
      }

      // Raid: cada golpe viaja como mensaje raidHit (mensajes = estado del jefe).
      if (state.mode === "raid" && partyCode) {
        const delta = state.damageDealt - prevDamage;
        if (delta > 0) {
          localStorage.setItem(raidContribKey(), player.name);
          void party.send({ content: { kind: "raidHit", name: player.name, raid: weekRaid(), dmg: delta } });
        } else if (!result.victory && state.damageDealt > 0) {
          const regen = Math.round(state.damageDealt * 0.3);
          if (regen > 0) {
            void party.send({ content: { kind: "raidHit", name: player.name, raid: weekRaid(), dmg: -regen } });
          }
        }
      }

      if (result.victory) playVictory();
      else playDefeat();

      setBattleResult(result);
      setPlayer(next);
      void savePlayer(next);
    },
    [player, battle, partyCode, party],
  );

  const handleCloseBattle = useCallback(() => {
    setBattle(null);
    setBattleResult(null);
  }, []);

  // Autopilot (God Mode): completa las quests pendientes solas para la demo.
  useEffect(() => {
    if (!autopilot || !player || !quests || battle) return;
    const id = window.setInterval(() => {
      const nextQuest = quests.find((q) => !doneIds.has(q.id));
      if (nextQuest) void handleComplete(nextQuest);
    }, 2200);
    return () => window.clearInterval(id);
  }, [autopilot, player, quests, doneIds, battle, handleComplete]);

  // ---- God mode (demo, solo visible con #demo en la URL) ----
  const handleGrantXp = useCallback(
    async (amount: number) => {
      if (!player) return;
      const res = await grantXp(player, amount);
      setPlayer(res.player);
      if (res.leveledUp && partyCode) {
        void party.send({
          content: { kind: "levelup", name: player.name, level: res.level, xp: res.player.xp },
        });
      }
    },
    [player, partyCode, party],
  );

  const handleForceLevelUp = useCallback(async () => {
    if (!player) return;
    const { level } = xpProgress(player.xp);
    const nextXp = xpForLevel(level + 1) + 5;
    const res = await grantXp(player, Math.max(1, nextXp - player.xp));
    setPlayer(res.player);
    if (res.leveledUp) {
      setLevelUp({ level: res.level });
      playLevelUp();
      if (partyCode) {
        void party.send({
          content: { kind: "levelup", name: player.name, level: res.level, xp: res.player.xp },
        });
      }
    }
  }, [player, partyCode, party]);

  const handleGrantCoins = useCallback(
    async (amount: number) => {
      if (!player) return;
      const next = { ...player, coins: player.coins + amount };
      setPlayer(next);
      await savePlayer(next);
    },
    [player],
  );

  const handleAddStreak = useCallback(async () => {
    if (!player) return;
    const next = { ...player, streak: player.streak + 1 };
    setPlayer(next);
    await savePlayer(next);
  }, [player]);

  const handleNewDay = useCallback(async () => {
    if (!player) return;
    await clearDoneToday(todayKey());
    await clearRegens(todayKey());
    setDoneIds(new Set());
    setRegensLeft(MAX_REGENS_PER_DAY);
    await loadQuests(player);
  }, [player, loadQuests]);

  const handleSetSource = useCallback((source: string) => {
    setDemoSource(source);
  }, []);

  const handleFullHeal = useCallback(async () => {
    if (!player) return;
    const next = restoreFull(player);
    setPlayer(next);
    await savePlayer(next);
  }, [player]);

  const handleKillRaid = useCallback(async () => {
    if (!player) return;
    localStorage.setItem(raidContribKey(), player.name);
    await savePlayer(player);
    setToast({ id: `raid-kill-${Date.now()}`, text: "👹 El jefe de raid está en su último aliento…", kind: "raid" });
    void party.send({ content: { kind: "raidHit", name: player.name, raid: weekRaid(), dmg: raidState.hp } });
  }, [player, raidState.hp, party]);

  // Meta semanal: daño porcentual al jefe de raid (3.5% por jugador, con cap según tier)
  const handleWeeklyMeta = useCallback(async () => {
    if (!player || !partyCode || raidState.hp <= 0) return;
    const metaKey = `raid-meta:${weekRaid()}:${new Date().toISOString().slice(0, 10)}`;
    if (localStorage.getItem(metaKey) === player.name) {
      setToast({ id: `meta-done-${Date.now()}`, text: "✅ Ya completaste la meta hoy", kind: "done" });
      return;
    }
    const rawDmg = Math.round(RAID_BOSS_HP * RAID_META_DAMAGE_PCT);
    const dmg = Math.max(1, Math.min(rawDmg, raidState.hp));
    localStorage.setItem(metaKey, player.name);
    localStorage.setItem(raidContribKey(), player.name);
    void party.send({ content: { kind: "raidHit", name: player.name, raid: weekRaid(), dmg } });
    setToast({
      id: `meta-hit-${Date.now()}`,
      text: `🎯 Meta diaria completada — ${dmg} HP de daño al jefe de raid`,
      kind: "raid",
    });
  }, [player, partyCode, raidState.hp, party]);

  const handleResetAll = useCallback(async () => {
    await clearIdb();
    localStorage.removeItem("partyCode");
    botManager.clear();
    window.location.hash = "";
    window.location.reload();
  }, []);

  const handleRechargeEnergy = useCallback(async () => {
    if (!player) return;
    const next = {
      ...player,
      energy: { tower: MAX_TOWER_ENERGY, arena1v1: MAX_ARENA_1V1_ENERGY, arenaTourney: MAX_ARENA_TOURNAMENT_ENERGY, lastReset: todayKey() },
    };
    setPlayer(next);
    await savePlayer(next);
    setToast({ id: `recharge-${Date.now()}`, text: "⚡ Energías recargadas al máximo", kind: "levelup" });
  }, [player]);

  const handleBuy = useCallback(
    (item: ShopItem) => {
      if (!player || player.coins < item.price) return;
      if (item.kind === "potion") {
        const next = {
          ...player,
          coins: player.coins - item.price,
          inventory: { ...player.inventory, [item.id]: (player.inventory[item.id] ?? 0) + 1 },
        };
        setPlayer(next);
        void savePlayer(next);
        return;
      }
      if (player.owned.includes(item.id)) return;
      const next: PlayerState = {
        ...player,
        coins: player.coins - item.price,
        owned: [...player.owned, item.id],
      };
      if (item.kind === "title") next.title = item.id;
      else if (item.kind === "color") next.color = item.id;
      else if (item.kind === "weapon") next.weapon = item.id;
      else if (item.kind === "armor") next.armor = item.id;
      else if (item.kind === "trinket") next.trinket = item.id;
      else if (item.kind === "music") next.music = true;
      setPlayer(next);
      void savePlayer(next);
    },
    [player],
  );

  const handleEquip = useCallback(
    (item: ShopItem) => {
      if (!player || !player.owned.includes(item.id)) return;
      const next: PlayerState = { ...player };
      if (item.kind === "title") next.title = item.id;
      else if (item.kind === "color") next.color = item.id;
      else if (item.kind === "weapon") next.weapon = item.id;
      else if (item.kind === "armor") next.armor = item.id;
      else if (item.kind === "trinket") next.trinket = item.id;
      else if (item.kind === "aura") next.aura = item.id;
      else if (item.kind === "music") next.music = true;
      setPlayer(next);
      void savePlayer(next);
    },
    [player],
  );

  const handleChangeClass = useCallback(
    (cls: PlayerClass) => {
      if (!player || player.cls === cls) return;
      const cost = 1000 + xpProgress(player.xp).level * 200;
      if (player.coins < cost) return;
      const next = { ...player, coins: player.coins - cost, cls };
      setPlayer(next);
      void savePlayer(next);
    },
    [player],
  );

  const handleTowerHit = useCallback(async () => {
    if (!player) return;
    const dummy: Quest = {
      id: "god-tower",
      title: "Golpe del Sistema",
      description: "",
      category: "strength",
      difficulty: "C",
      xp: 40,
    };
    const res = advanceTower(player, dummy);
    const next = {
      ...player,
      tower: { floor: res.floor, damage: res.damage },
      coins: player.coins + res.coins,
    };
    setPlayer(next);
    await savePlayer(next);
  }, [player]);

  const handleTowerFloor = useCallback(
    async (floor: number) => {
      if (!player) return;
      if (!floorInfo(floor)) return;
      const next = { ...player, tower: { floor, damage: 0 } };
      setPlayer(next);
      await savePlayer(next);
    },
    [player],
  );

  // Pantalla de configuración si falta la publishable key.
  if (!portalClient) {
    return (
      <div className="setup-screen">
        <div className="system-brand"><span className="brand-glyph">◈</span> EL SISTEMA</div>
        <h1>Falta configurar Portal</h1>
        <p>
          Copia <code>.env.template</code> a <code>.env</code> y agrega tu{" "}
          <code>VITE_PORTAL_PUBLISHABLE_KEY</code> (publishable key de Portal). Luego reinicia{" "}
          <code>npm run dev</code>.
        </p>
      </div>
    );
  }

  if (player === undefined) {
    return <div className="loading-screen">Despertando a El Sistema…</div>;
  }

  if (!player) {
    return <Onboarding onSubmit={handleOnboard} />;
  }
  const progress = xpProgress(player.xp);
  // Roster local (tú + bots) como piso del contador online: la demo nunca depende
  // de que la plataforma cuente la presencia anónima de cada bot.
  const localRoster = 1 + botManager.count;
  const online = Math.max(localRoster, partyCode && party.presence ? party.presence.count : 0);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-glyph">◈</span>
          <span className="brand-text">EL SISTEMA</span>
        </div>

        <div className="player-chip">
          <div className="player-name" style={{ color: itemById(player.color)?.color ?? undefined }}>
            {player.title ? `${itemById(player.title)?.name ?? player.title} — ` : ""}
            {player.name}
          </div>
          <div className="level-badge">Nv {progress.level}</div>
          <div className="xp-track">
            <div className="xp-fill" style={{ width: `${Math.round(progress.ratio * 100)}%` }} />
          </div>
          <div className="xp-nums">
            {progress.current}/{progress.needed} XP
          </div>
        </div>

        <div className="head-meta">
          <button
            className="music-btn"
            onClick={() => setMusicOn(toggleMusic())}
            title={musicOn ? "Silenciar música" : "Activar música"}
          >
            {musicOn ? "🔊" : "🔇"}
          </button>
          <span className="streak" title="Días seguidos">🔥 {player.streak}</span>
          <span className="coins-chip" title="Oro">💰 {player.coins}</span>
          {partyCode ? (
            <span className={`party-chip ${online > 0 ? "live" : ""}`}>◈ {online} en party</span>
          ) : (
            <span className="party-chip muted">sin party</span>
          )}
        </div>
      </header>

      <nav className="tabs">
        <button className={tab === "daily" ? "active" : ""} onClick={() => setTab("daily")}>
          Quests
        </button>
        <button className={tab === "personaje" ? "active" : ""} onClick={() => setTab("personaje")}>
          Personaje
        </button>
        <button className={tab === "party" ? "active" : ""} onClick={() => setTab("party")}>
          Party{partyCode ? ` · ${partyCode}` : ""}
        </button>
        <button className={tab === "shop" ? "active" : ""} onClick={() => setTab("shop")}>
          Shop
        </button>
        <button className={tab === "tower" ? "active" : ""} onClick={() => setTab("tower")}>
          Torre
        </button>
        <button className={tab === "arena" ? "active" : ""} onClick={() => setTab("arena")}>
          Arena
        </button>
      </nav>

      <main>
        {tab === "daily" ? (
          <>
            <StatsPanel stats={player.stats} />
            <QuestList
              quests={quests ?? []}
              loading={quests === null}
              completed={doneIds}
              busy={completing}
              onComplete={handleComplete}
              source={demoSource ?? questSource}
              onRegenerate={handleRegenerate}
              regensLeft={regensLeft}
            />
          </>
        ) : tab === "personaje" ? (
          <CharacterPanel player={player} />
        ) : tab === "shop" ? (
          <ShopPanel
            player={player}
            onBuy={handleBuy}
            onEquip={handleEquip}
            onChangeClass={handleChangeClass}
          />
        ) : tab === "tower" ? (
          <TowerPanel player={player} onGrind={handleGrind} onFightBoss={handleFightBoss} />
        ) : tab === "arena" ? (
          <ArenaPanel
            player={player}
            bots={botManager.members()}
            onStart1v1={(botName) => {
              if (!player) return;
              const bot = botManager.members().find((b) => b.name === botName);
              if (!bot) return;
              setBattleResult(null);
              // Arena 1v1: consume 1 de energia arena1v1
              const energy = player.energy ?? { tower: 8, arena1v1: 2, arenaTourney: 1, lastReset: "" };
              if (energy.arena1v1 <= 0) return;
              const next = { ...player, energy: { ...energy, arena1v1: energy.arena1v1 - 1 } };
              setPlayer(next);
              void savePlayer(next);
              setBattle(startGrindBattle(next, next.tower.floor));
            }}
            onStartTournament={() => {
              if (!player) return;
              const energy = player.energy ?? { tower: 8, arena1v1: 2, arenaTourney: 1, lastReset: "" };
              if (energy.arenaTourney <= 0) return;
              const next = { ...player, energy: { ...energy, arenaTourney: energy.arenaTourney - 1 } };
              setPlayer(next);
              void savePlayer(next);
              setBattle(startGrindBattle(next, Math.max(3, next.tower.floor)));
            }}
          />
        ) : (
          <PartyPanel
            partyCode={partyCode}
            onJoin={setPartyCode}
            playerName={player.name}
            presence={party.presence}
            meId={party.me?.id}
            messages={party.messages}
            status={party.status}
            raid={weekRaid()}
            raidGoal={weeklyRaidGoal()}
            raidHp={raidState.hp}
            raidClaimed={raidClaimed}
            localRoster={localRoster}
            onFightRaid={handleFightRaid}
            onClaimRaid={handleClaimRaid}
            onWeeklyMeta={handleWeeklyMeta}
          />
        )}
      </main>

      <footer className="foot">
        SystemIRL · The Realtime Hackathon by Portal · IA + tiempo real con Portal
      </footer>

      {xpFloat && (
        <div key={xpFloat.id} className="xp-float">
          {xpFloat.text}
        </div>
      )}

      {toast && (
        <div key={toast.id} className={`party-toast ${toast.kind}`} onClick={() => setToast(null)}>
          <span className="toast-ico">{TOAST_ICON[toast.kind] ?? "◈"}</span>
          <span className="toast-text">{toast.text}</span>
        </div>
      )}

      {levelUp && <LevelUpModal level={levelUp.level} onClose={() => setLevelUp(null)} />}

      {battle && (
        <BattleModal
          battle={battle}
          player={player}
          result={battleResult}
          onAction={handleBattleAction}
          onClose={handleCloseBattle}
          revealWeakness={revealWeakness}
        />
      )}

      {isDemo && player && (
        <DemoPanel
          playerName={player.name}
          partyCode={partyCode}
          raid={weekRaid()}
          onGrantXp={handleGrantXp}
          onForceLevelUp={handleForceLevelUp}
          onGrantCoins={handleGrantCoins}
          onAddStreak={handleAddStreak}
          onNewDay={handleNewDay}
          onSetSource={handleSetSource}
          onTowerHit={handleTowerHit}
          onTowerFloor={handleTowerFloor}
          onFullHeal={handleFullHeal}
          onKillRaid={handleKillRaid}
          onResetAll={handleResetAll}
          onRechargeEnergy={handleRechargeEnergy}
          autopilot={autopilot}
          onToggleAutopilot={() => setAutopilot((v) => !v)}
          revealWeakness={revealWeakness}
          onToggleRevealWeakness={() => setRevealWeakness((v) => !v)}
        />
      )}
    </div>
  );
}
