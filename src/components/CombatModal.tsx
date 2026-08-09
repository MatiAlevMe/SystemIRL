import { useEffect, useState } from "react";
import type { CombatResult, TowerResult } from "../lib/rpg";

interface Props {
  result: CombatResult;
  onClose: () => void;
  tower?: TowerResult | null;
}

export default function CombatModal({ result, onClose, tower }: Props) {
  const { monster, victory, damage, coins, drop, spell } = result;
  const [showLoot, setShowLoot] = useState(false);

  useEffect(() => {
    const lootT = setTimeout(() => setShowLoot(true), 1400);
    const closeT = setTimeout(onClose, 3600);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(lootT);
      clearTimeout(closeT);
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const hpPct = Math.max(0, Math.min(100, Math.round((1 - damage / monster.hp) * 100)));

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="combat-modal" onClick={(e) => e.stopPropagation()}>
        <div className="combat-kicker">COMBATE</div>
        <div className="combat-monster">
          <span className="combat-monster-ico">👹</span>
          <div className="combat-monster-name">{monster.name}</div>
          <div className="combat-hp-bar">
            <div className="combat-hp-fill" style={{ width: `${hpPct}%` }} />
          </div>
        </div>

        {spell && (
          <div className="combat-spell">⚡ Lanzaste <strong>{spell}</strong> (+{damage})</div>
        )}

        <div className={`combat-verdict ${victory ? "win" : "lose"}`}>
          {victory ? "VICTORIA" : "DERROTA"}
        </div>

        {showLoot && victory && (
          <div className="combat-loot">
            {coins > 0 && <div className="loot-line">💰 +{coins} oro</div>}
            {drop && <div className="loot-line">🗡️ Drop: <strong>{drop.name}</strong> (+{drop.bonus?.dmg ?? 0} dmg)</div>}
            {tower?.cleared && (
              <div className="loot-line">🏰 Piso {tower.floor} conquistado +{tower.reward} oro</div>
            )}
            {tower?.conquered && <div className="loot-line">🏆 Torre dominada. El Sistema te reconoce.</div>}
            {!drop && !tower?.cleared && coins === 0 && <div className="loot-line">Sin botín esta vez.</div>}
          </div>
        )}

        <button className="primary-btn" onClick={onClose} autoFocus>
          Continuar ▸
        </button>
      </div>
    </div>
  );
}
