import { useCallback, useEffect, useRef, useState } from "react";
import { useChannel } from "@portalsdk/react";
import Onboarding from "./components/Onboarding";
import QuestList from "./components/QuestList";
import StatsPanel from "./components/StatsPanel";
import PartyPanel from "./components/PartyPanel";
import LevelUpModal from "./components/LevelUpModal";
import CombatModal from "./components/CombatModal";
import DemoPanel from "./components/DemoPanel";
import { portalClient } from "./portal";
import {
  clearDoneToday,
  completeQuest,
  emptyPlayer,
  grantXp,
  loadDoneToday,
  loadPlayer,
  saveDoneToday,
  savePlayer,
} from "./lib/storage";
import { fetchDailyQuests } from "./lib/quests";
import { todayKey, xpForLevel, xpProgress } from "./lib/xp";
import { botManager } from "./lib/bots";
import { resolveCombat, type CombatResult } from "./lib/rpg";
import { weekRaid } from "./lib/raids";
import type { PartyMessage, PlayerState, Quest } from "./types";

function weekRaidKey(): string {
  return "raid:" + weekRaid();
}

const TOAST_ICON: Record<string, string> = {
  levelup: "⚡",
  done: "▸",
  raid: "⌁",
  join: "◈",
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
    default:
      return "";
  }
}

export default function App() {
  const [player, setPlayer] = useState<PlayerState | null | undefined>(undefined); // undefined = loading
  const [quests, setQuests] = useState<Quest[] | null>(null);
  const [questSource, setQuestSource] = useState("cached");
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set());
  const [completing, setCompleting] = useState(false);
  const [partyCode, setPartyCodeState] = useState<string>(() => localStorage.getItem("partyCode") ?? "");
  const [tab, setTab] = useState<"daily" | "party">("daily");
  const [levelUp, setLevelUp] = useState<{ level: number } | null>(null);
  const [raidClaimed, setRaidClaimed] = useState(false);
  const [demoSource, setDemoSource] = useState<string | null>(null);
  const isDemo = typeof window !== "undefined" && window.location.hash.includes("demo");
  const [toast, setToast] = useState<{ id: string; text: string; kind: string } | null>(null);
  const lastMsgRef = useRef<string | null>(null);
  const [combat, setCombat] = useState<CombatResult | null>(null);

  const party = useChannel<PartyMessage>({
    channelId: partyCode ? `party-${partyCode}` : undefined,
    history: 40,
  });

  const joinedRef = useRef<string | null>(null);

  const setPartyCode = useCallback((code: string) => {
    setPartyCodeState(code);
    if (code) localStorage.setItem("partyCode", code);
    else {
      localStorage.removeItem("partyCode");
      botManager.clear();
    }
  }, []);

  const loadQuests = useCallback(async (p: PlayerState) => {
    setQuests(null);
    const res = await fetchDailyQuests({
      history: p.history,
      playerLevel: xpProgress(p.xp).level,
      streak: p.streak,
      count: 5,
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
        if (alive) setDoneIds(new Set(ids));
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
    });
  }, [partyCode, player?.name, player?.xp, player?.streak, player?.title, player?.color]);

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

  const handleOnboard = useCallback(
    async (name: string) => {
      const p = emptyPlayer(name);
      await savePlayer(p);
      setPlayer(p);
      await loadQuests(p);
    },
    [loadQuests],
  );

  const handleComplete = useCallback(
    async (q: Quest) => {
      if (!player || completing) return;
      setCompleting(true);
      try {
        const res = await completeQuest(player, q);
        const combat = resolveCombat(res.player, q);
        let next = res.player;
        if (combat.victory && combat.coins > 0) next = { ...next, coins: next.coins + combat.coins };
        if (combat.drop && !next.owned.includes(combat.drop.id)) {
          next = { ...next, owned: [...next.owned, combat.drop.id] };
        }
        if (combat.victory) setCombat(combat);
        setPlayer(next);
        await savePlayer(next);
        const done = new Set(doneIds);
        done.add(q.id);
        setDoneIds(done);
        await saveDoneToday(todayKey(), [...done]);

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

  const handleClaimRaid = useCallback(() => {
    if (!player || !partyCode || raidClaimed) return;
    localStorage.setItem(weekRaidKey(), "1");
    setRaidClaimed(true);
    void party.send({ content: { kind: "raid", name: player.name, raid: weekRaid() } });
  }, [player, partyCode, raidClaimed]);

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

  const handleAddStreak = useCallback(
    async () => {
      if (!player) return;
      const next = { ...player, streak: player.streak + 1 };
      setPlayer(next);
      await savePlayer(next);
    },
    [player],
  );

  const handleNewDay = useCallback(async () => {
    if (!player) return;
    await clearDoneToday(todayKey());
    setDoneIds(new Set());
    await loadQuests(player);
  }, [player, loadQuests]);

  const handleSetSource = useCallback((source: string) => {
    setDemoSource(source);
  }, []);

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
  const online = partyCode && party.presence ? party.presence.count : 0;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-glyph">◈</span>
          <span className="brand-text">EL SISTEMA</span>
        </div>

        <div className="player-chip">
          <div className="player-name">{player.name}</div>
          <div className="level-badge">Nv {progress.level}</div>
          <div className="xp-track">
            <div className="xp-fill" style={{ width: `${Math.round(progress.ratio * 100)}%` }} />
          </div>
          <div className="xp-nums">
            {progress.current}/{progress.needed} XP
          </div>
        </div>

        <div className="head-meta">
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
        <button className={tab === "party" ? "active" : ""} onClick={() => setTab("party")}>
          Party{partyCode ? ` · ${partyCode}` : ""}
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
            />
          </>
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
            raidClaimed={raidClaimed}
            onClaimRaid={handleClaimRaid}
          />
        )}
      </main>

      <footer className="foot">
        SystemIRL · The Realtime Hackathon by Portal · IA + tiempo real con Portal
      </footer>

      {toast && (
        <div key={toast.id} className={`party-toast ${toast.kind}`} onClick={() => setToast(null)}>
          <span className="toast-ico">{TOAST_ICON[toast.kind] ?? "◈"}</span>
          <span className="toast-text">{toast.text}</span>
        </div>
      )}

      {levelUp && <LevelUpModal level={levelUp.level} onClose={() => setLevelUp(null)} />}

      {combat && <CombatModal result={combat} onClose={() => setCombat(null)} />}

      {isDemo && player && (
        <DemoPanel
          playerName={player.name}
          partyCode={partyCode}
          botCount={botManager.count}
          raid={weekRaid()}
          onGrantXp={handleGrantXp}
          onForceLevelUp={handleForceLevelUp}
          onGrantCoins={handleGrantCoins}
          onAddStreak={handleAddStreak}
          onNewDay={handleNewDay}
          onSetSource={handleSetSource}
        />
      )}
    </div>
  );
}
