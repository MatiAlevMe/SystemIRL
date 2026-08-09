import { useCallback, useEffect, useRef, useState } from "react";
import { useChannel } from "@portalsdk/react";
import Onboarding from "./components/Onboarding";
import QuestList from "./components/QuestList";
import StatsPanel from "./components/StatsPanel";
import PartyPanel from "./components/PartyPanel";
import LevelUpModal from "./components/LevelUpModal";
import { portalClient } from "./portal";
import {
  completeQuest,
  emptyPlayer,
  loadDoneToday,
  loadPlayer,
  saveDoneToday,
  savePlayer,
} from "./lib/storage";
import { fetchDailyQuests } from "./lib/quests";
import { todayKey, xpProgress } from "./lib/xp";
import type { PartyMessage, PlayerState, Quest } from "./types";

const WEEKLY_RAIDS = [
  "Corran 5 km en equipo",
  "100 flexiones grupales",
  "Un día sin azúcar (los dos)",
  "10.000 pasos cada uno",
  "1 hora de estudio profundo",
  "Presupuesto estricto: $15 máx",
  "Entrenen en pareja",
];

function weekRaid(now = new Date()): string {
  const start = new Date(now.getFullYear(), 0, 1);
  const days = Math.floor((now.getTime() - start.getTime()) / 86400000);
  const week = Math.floor(days / 7) % WEEKLY_RAIDS.length;
  return WEEKLY_RAIDS[week];
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

  const party = useChannel<PartyMessage>({
    channelId: partyCode ? `party-${partyCode}` : undefined,
    history: 40,
  });

  const joinedRef = useRef<string | null>(null);

  const setPartyCode = useCallback((code: string) => {
    setPartyCodeState(code);
    if (code) localStorage.setItem("partyCode", code);
    else localStorage.removeItem("partyCode");
  }, []);

  const loadQuests = useCallback(async (p: PlayerState) => {
    setQuests(null);
    const res = await fetchDailyQuests({
      history: p.history,
      playerLevel: xpProgress(p.xp).level,
      streak: p.streak,
      count: 3,
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
    const key = "raid:" + weekRaid();
    setRaidClaimed(localStorage.getItem(key) === "1");
  }, []);

  // Sincroniza presence metadata de la party con el estado del jugador.
  useEffect(() => {
    if (!player || !partyCode) return;
    const { level } = xpProgress(player.xp);
    party.setMetadata({ name: player.name, level, xp: player.xp, streak: player.streak });
  }, [partyCode, player?.name, player?.xp, player?.streak]);

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
        setPlayer(res.player);
        const next = new Set(doneIds);
        next.add(q.id);
        setDoneIds(next);
        await saveDoneToday(todayKey(), [...next]);

        if (partyCode) {
          void party.send({ content: { kind: "done", name: player.name, quest: q.title } });
          if (res.leveledUp) {
            void party.send({
              content: { kind: "levelup", name: player.name, level: res.level, xp: res.player.xp },
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
    localStorage.setItem("raid:" + weekRaid(), "1");
    setRaidClaimed(true);
    void party.send({ content: { kind: "raid", name: player.name, raid: weekRaid() } });
  }, [player, partyCode, raidClaimed]);

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
              completed={doneIds}
              busy={completing}
              onComplete={handleComplete}
              source={questSource}
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

      {levelUp && <LevelUpModal level={levelUp.level} onClose={() => setLevelUp(null)} />}
    </div>
  );
}
