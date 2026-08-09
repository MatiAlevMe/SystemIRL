import { useReducer, useState } from "react";
import { botManager, BOT_DEFS } from "../lib/bots";

interface Props {
  playerName: string;
  partyCode: string;
  raid: string;
  onGrantXp: (amount: number) => void;
  onForceLevelUp: () => void;
  onGrantCoins: (amount: number) => void;
  onAddStreak: () => void;
  onNewDay: () => void;
  onSetSource: (source: string) => void;
  onTowerHit: () => void;
  onTowerFloor: (floor: number) => void;
  onFullHeal: () => void;
  onKillRaid: () => void;
  onResetAll: () => void;
  onRechargeEnergy: () => void;
  autopilot: boolean;
  onToggleAutopilot: () => void;
  revealWeakness: boolean;
  onToggleRevealWeakness: () => void;
}

export default function DemoPanel({
  playerName,
  partyCode,
  raid,
  onGrantXp,
  onForceLevelUp,
  onGrantCoins,
  onAddStreak,
  onNewDay,
  onSetSource,
  onTowerHit,
  onTowerFloor,
  onFullHeal,
  onKillRaid,
  onResetAll,
  onRechargeEnergy,
  autopilot,
  onToggleAutopilot,
  revealWeakness,
  onToggleRevealWeakness,
}: Props) {
  const [open, setOpen] = useState(true);
  // botManager es un singleton mutable fuera de React: esta versión fuerza el
  // re-render tras spawn/clear para que el label de bots y los botones se activen.
  const [, forceRender] = useReducer((x: number) => x + 1, 0);

  const botCount = botManager.count;
  const firstBotName = botManager.names()[0];

  const spawnBots = () => {
    if (!partyCode) return;
    BOT_DEFS.forEach((b) => botManager.spawn(partyCode, b.name, { name: b.name, level: b.level, xp: b.xp, streak: 1, cls: b.cls }));
    forceRender();
  };

  return (
    <div className={`demo-panel ${open ? "open" : "closed"}`}>
      <div className="demo-head">
        <span className="demo-badge">GOD MODE</span>
        <button className="demo-toggle" onClick={() => setOpen(!open)}>
          {open ? "▾" : "▴"}
        </button>
      </div>
      {open && (
        <div className="demo-body">
          <div className="demo-group" data-label="Jugador">
            <button className="demo-btn" onClick={() => onGrantXp(60)}>+60 XP</button>
            <button className="demo-btn" onClick={onForceLevelUp}>Subir nivel</button>
            <button className="demo-btn" onClick={() => onGrantCoins(500)}>+500 oro</button>
            <button className="demo-btn" onClick={onAddStreak}>+1 streak</button>
            <button className="demo-btn" onClick={onNewDay}>Nuevo día</button>
            <button className={`demo-btn ${autopilot ? "danger" : ""}`} onClick={onToggleAutopilot}>
              {autopilot ? "■ Autopilot ON" : "Autopilot quests"}
            </button>
            <button className="demo-btn danger" onClick={onResetAll}>Reset total</button>
          </div>
          <div className="demo-group" data-label="Torre">
            <button className="demo-btn" onClick={onTowerHit}>Golpear jefe</button>
            <button className="demo-btn" onClick={() => onTowerFloor(2)}>Piso 2</button>
            <button className="demo-btn" onClick={() => onTowerFloor(5)}>Piso 5</button>
          </div>
          <div className="demo-group" data-label="Combate">
            <button className="demo-btn" onClick={onFullHeal}>Rellenar HP/MP</button>
            <button className="demo-btn" disabled={!partyCode} onClick={onKillRaid}>Matar jefe raid</button>
            <button className="demo-btn" onClick={onRechargeEnergy}>Recargar energías</button>
            <button className={`demo-btn ${revealWeakness ? "danger" : ""}`} onClick={onToggleRevealWeakness}>
              {revealWeakness ? "👁 Debilidades visibles" : "Revelar debilidades"}
            </button>
          </div>
          <div className="demo-group" data-label="IA">
            <button className="demo-btn" onClick={() => onSetSource("gemini")}>Fuente: IA</button>
            <button className="demo-btn" onClick={() => onSetSource("fallback")}>Fuente: fallback</button>
          </div>
          <div className="demo-group" data-label={`Bots (${botCount})`}>
            <button className="demo-btn" disabled={!partyCode} onClick={spawnBots}>
              Spawn bots
            </button>
            <button
              className="demo-btn"
              disabled={!firstBotName}
              onClick={() => firstBotName && botManager.complete(firstBotName)}
            >
              Bot quest
            </button>
            <button
              className="demo-btn"
              disabled={!firstBotName}
              onClick={() => firstBotName && botManager.levelUp(firstBotName)}
            >
              Bot level-up
            </button>
            <button
              className="demo-btn"
              disabled={!firstBotName}
              onClick={() => firstBotName && botManager.raid(firstBotName, raid)}
            >
              Bot raid
            </button>
            <button
              className="demo-btn"
              disabled={botCount === 0}
              onClick={() => {
                botManager.clear();
                forceRender();
              }}
            >
              Limpiar bots
            </button>
          </div>
          <div className="demo-note">Conectado como {playerName} · party {partyCode || "sin party"}</div>
        </div>
      )}
    </div>
  );
}
