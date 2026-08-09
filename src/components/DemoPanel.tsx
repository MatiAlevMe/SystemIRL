import { useState } from "react";
import { botManager } from "../lib/bots";
import { setForceSpell, setForceWin } from "../lib/rpg";

interface Props {
  playerName: string;
  partyCode: string;
  botCount: number;
  raid: string;
  onGrantXp: (amount: number) => void;
  onForceLevelUp: () => void;
  onGrantCoins: (amount: number) => void;
  onAddStreak: () => void;
  onNewDay: () => void;
  onSetSource: (source: string) => void;
  onTowerHit: () => void;
  onTowerFloor: (floor: number) => void;
}

const BOT_DEFS = [
  { name: "Jinwoo", level: 2, xp: 130 },
  { name: "Cha", level: 1, xp: 45 },
];

export default function DemoPanel({
  playerName,
  partyCode,
  botCount,
  raid,
  onGrantXp,
  onForceLevelUp,
  onGrantCoins,
  onAddStreak,
  onNewDay,
  onSetSource,
  onTowerHit,
  onTowerFloor,
}: Props) {
  const [open, setOpen] = useState(true);
  const [win, setWin] = useState(false);
  const [spell, setSpell] = useState(false);

  const toggleWin = () => {
    setWin(!win);
    setForceWin(!win);
  };

  const toggleSpell = () => {
    setSpell(!spell);
    setForceSpell(!spell);
  };

  const spawnBots = () => {
    if (!partyCode) return;
    BOT_DEFS.forEach((b) => botManager.spawn(partyCode, b.name, { name: b.name, level: b.level, xp: b.xp, streak: 1 }));
  };

  const firstBot = () => botManager.names()[0];

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
          </div>
          <div className="demo-group" data-label="Torre">
            <button className="demo-btn" onClick={onTowerHit}>Golpear jefe</button>
            <button className="demo-btn" onClick={() => onTowerFloor(2)}>Piso 2</button>
            <button className="demo-btn" onClick={() => onTowerFloor(5)}>Piso 5</button>
          </div>
          <div className="demo-group" data-label="Combate">
            <label className="demo-check">
              <input type="checkbox" checked={win} onChange={toggleWin} />
              Victoria forzada
            </label>
            <label className="demo-check">
              <input type="checkbox" checked={spell} onChange={toggleSpell} />
              Hechizo garantizado
            </label>
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
              disabled={!firstBot()}
              onClick={() => firstBot() && botManager.complete(firstBot())}
            >
              Bot quest
            </button>
            <button
              className="demo-btn"
              disabled={!firstBot()}
              onClick={() => firstBot() && botManager.levelUp(firstBot())}
            >
              Bot level-up
            </button>
            <button
              className="demo-btn"
              disabled={!firstBot()}
              onClick={() => firstBot() && botManager.raid(firstBot(), raid)}
            >
              Bot raid
            </button>
            <button className="demo-btn" disabled={botCount === 0} onClick={() => botManager.clear()}>
              Limpiar bots
            </button>
          </div>
          <div className="demo-note">Conectado como {playerName} · party {partyCode || "sin party"}</div>
        </div>
      )}
    </div>
  );
}
