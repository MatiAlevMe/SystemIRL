import type { PlayerState } from "../types";
import { TOWER_FLOORS, combatStats, floorInfo } from "../lib/rpg";

interface Props {
  player: PlayerState;
  onGrind: () => void;
  onFightBoss: () => void;
}

export default function TowerPanel({ player, onGrind, onFightBoss }: Props) {
  const { floor: currentFloor, damage } = player.tower;
  const current = floorInfo(currentFloor);
  const currentHp = current ? current.hp : 0;
  const pct = current && currentHp > 0 ? Math.min(100, Math.round((damage / currentHp) * 100)) : 100;
  const conquered = !!current && damage >= currentHp;
  const { maxHp, maxMp } = combatStats(player);
  const hpPct = Math.round((player.battle.hp / maxHp) * 100);
  const mpPct = Math.round((player.battle.mp / maxMp) * 100);

  return (
    <section className="tower">
      <div className="section-head">
        <h2>La Torre del Sistema</h2>
        <span className="quest-source gemini">Piso {currentFloor}/{TOWER_FLOORS.length}</span>
      </div>

      {current && (
        <div className="tower-boss">
          <div className="tower-boss-name">
            {conquered ? "✓" : "⚔"} {current.boss}
          </div>
          <div className="tower-hp-bar">
            <div className="tower-hp-fill" style={{ width: `${pct}%` }} />
          </div>
          <div className="tower-boss-meta">
            <span>{damage}/{currentHp} daño</span>
            <span>Recompensa: 💰 {current.reward}</span>
          </div>
          <div className="tower-battle-status">
            <span className="tower-hp">
              <span className="mini-bar">
                <span className="mini-fill hp" style={{ width: `${hpPct}%` }} />
              </span>
              {player.battle.hp}/{maxHp} HP
            </span>
            <span className="tower-mp">
              <span className="mini-bar">
                <span className="mini-fill mp" style={{ width: `${mpPct}%` }} />
              </span>
              {player.battle.mp}/{maxMp} MP
            </span>
          </div>
          <div className="tower-actions">
            <button className="ghost-btn" onClick={onGrind}>⚔ Luchar</button>
            <button className="primary-btn" onClick={onFightBoss} disabled={conquered}>
              {conquered ? "✓ Conquistado" : "👹 Luchar contra jefe"}
            </button>
          </div>
        </div>
      )}

      <div className="tower-ladder">
        {[...TOWER_FLOORS].reverse().map((f) => {
          const isCurrent = f.floor === currentFloor;
          const isDone = f.floor < currentFloor;
          return (
            <div
              key={f.floor}
              className={`tower-floor ${isCurrent ? "current" : ""} ${isDone ? "done" : ""}`}
            >
              <span className="tower-floor-num">{f.floor}</span>
              <div className="tower-floor-body">
                <div className="tower-floor-name">{f.name}</div>
                <div className="tower-floor-boss">
                  {isDone ? "✓ " : "👹 "}
                  {f.boss}
                </div>
              </div>
              {isCurrent && <span className="tower-floor-tag">AQUÍ</span>}
            </div>
          );
        })}
      </div>

      <p className="panel-note">
        Cada quest completada daña al jefe del piso actual y cura un poco de HP. Luchar es por turnos:
        probá elementos para revelar la debilidad de cada monstruo (One More). Si caes, quedás con 1 HP.
      </p>
    </section>
  );
}
