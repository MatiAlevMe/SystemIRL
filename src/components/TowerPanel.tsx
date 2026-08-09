import type { PlayerState } from "../types";
import { TOWER_FLOORS, floorInfo } from "../lib/rpg";

interface Props {
  player: PlayerState;
}

export default function TowerPanel({ player }: Props) {
  const { floor: currentFloor, damage } = player.tower;
  const current = floorInfo(currentFloor);
  const currentHp = current ? current.hp : 0;
  const pct = current && currentHp > 0 ? Math.min(100, Math.round((damage / currentHp) * 100)) : 100;
  const conquered = !!current && damage >= currentHp;

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
        Cada quest completada daña al jefe del piso actual. Al derrotarlo ganas oro y la Torre
        desbloquea el siguiente piso.
      </p>
    </section>
  );
}
