import { useEffect, useRef } from "react";
import type { PlayerState } from "../types";
import { CLASS_LABEL } from "../types";
import { itemById } from "../lib/catalog";
import {
  ELEMENT_ICON,
  EX_SKILLS,
  SPELLS,
  spellsFor,
  type BattleAction,
  type BattleResult,
  type BattleState,
} from "../lib/rpg";
import { playHit } from "../lib/sound";

interface Props {
  battle: BattleState;
  player: PlayerState;
  result?: BattleResult | null;
  onAction: (action: BattleAction) => void;
  onClose: () => void;
}

const MODE_LABEL: Record<BattleState["mode"], string> = {
  grind: "GRIND",
  boss: "JEFE DE TORRE",
  raid: "RAID",
};

const POTION_IDS = ["p-pocion", "p-eter", "p-elixir", "p-mayor"];

export default function BattleModal({ battle, player, result, onAction, onClose }: Props) {
  const logRef = useRef<HTMLDivElement>(null);
  const enemy = battle.enemies[0];
  const me = battle.party.find((m) => m.id === "player") ?? battle.party[0];
  const mySpells = spellsFor(me.level);
  const ex = EX_SKILLS[me.cls];
  const potions = POTION_IDS.map((id) => ({ id, item: itemById(id), count: player.inventory[id] ?? 0 })).filter(
    (p) => p.item && p.count > 0,
  );

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [battle.log.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && battle.result) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [battle.result, onClose]);

  const act = (action: BattleAction) => {
    if (battle.result) return;
    onAction(action);
    playHit();
  };

  const mePct = me.maxHp > 0 ? Math.round((me.hp / me.maxHp) * 100) : 0;
  const mpPct = me.maxMp > 0 ? Math.round((me.mp / me.maxMp) * 100) : 0;
  const enemyPct = enemy.maxHp > 0 ? Math.round((enemy.hp / enemy.maxHp) * 100) : 0;

  return (
    <div className="modal-backdrop" onClick={() => battle.result && onClose()}>
      <div className="battle-modal" onClick={(e) => e.stopPropagation()}>
        <div className="battle-head">
          <span className="battle-kicker">COMBATE · {MODE_LABEL[battle.mode]}</span>
          <span className="battle-turn">Turno {battle.turn}</span>
        </div>

        <div className="battle-field">
          <div className="enemy-card">
            <div className="enemy-ico">{enemy.icon}</div>
            <div className="enemy-name">{enemy.name}</div>
            <div className="enemy-race">{enemy.race}</div>
            {enemy.revealed.length > 0 && (
              <div className="enemy-weak" title="Debilidad revelada">
                {enemy.revealed.map((el) => (
                  <span key={el}>{ELEMENT_ICON[el]}</span>
                ))}
                <span className="enemy-weak-label">debilidad</span>
              </div>
            )}
            <div className="battle-hp-bar">
              <div className="battle-hp-fill" style={{ width: `${enemyPct}%` }} />
            </div>
            <div className="battle-nums">
              {enemy.hp}/{enemy.maxHp}
            </div>
          </div>

          <div className="party-card">
            <span className="party-ico">{me.icon}</span>
            <div className="party-name">
              {me.name} <em>· {CLASS_LABEL[me.cls]}</em>
            </div>
            <div className="battle-hp-bar">
              <div className="battle-hp-fill" style={{ width: `${mePct}%` }} />
            </div>
            <div className="battle-mp-bar">
              <div className="battle-mp-fill" style={{ width: `${mpPct}%` }} />
            </div>
            <div className="battle-gauge">
              <div className="battle-gauge-fill" style={{ width: `${Math.round(me.gauge)}%` }} />
            </div>
            <div className="battle-nums">
              {me.hp}/{me.maxHp} HP · {me.mp}/{me.maxMp} MP · EX {Math.round(me.gauge)}%
            </div>
          </div>
        </div>

        <div className="battle-log" ref={logRef}>
          {battle.log.length === 0 ? (
            <div className="battle-log-empty">El Sistema te observa…</div>
          ) : (
            battle.log.map((l) => (
              <div key={l.id} className={`log-line ${l.kind}`}>
                {l.text}
              </div>
            ))
          )}
        </div>

        {battle.result ? (
          <div className={`battle-verdict ${battle.result}`}>
            <div className="verdict-title">
              {battle.result === "victory" ? "VICTORIA" : battle.result === "defeat" ? "DERROTA" : "HUISTE"}
            </div>
            {battle.result === "defeat" && <div className="verdict-sub">El Sistema te descuenta HP. Quedas con 1 HP.</div>}
            {result && (
              <div className="combat-loot">
                {result.coins > 0 && <div className="loot-line">💰 +{result.coins} oro</div>}
                {result.exXpGained > 0 && <div className="loot-line">✨ +{result.exXpGained} XP de EX</div>}
                {result.drop && (
                  <div className="loot-line">
                    🗡️ Drop: <strong>{result.drop.name}</strong> (+{result.drop.bonus?.dmg ?? 0} dmg)
                  </div>
                )}
                {battle.mode === "raid" && battle.damageDealt > 0 && (
                  <div className="loot-line">👹 {battle.damageDealt} de daño al jefe de raid</div>
                )}
                {!result.coins && !result.drop && result.exXpGained === 0 && (
                  <div className="loot-line">Sin botín esta vez.</div>
                )}
              </div>
            )}
            <button className="primary-btn" onClick={onClose} autoFocus>
              Continuar ▸
            </button>
          </div>
        ) : (
          <>
            {battle.oneMore && <div className="one-more-banner">🎯 ¡ONE MORE!</div>}
            <div className="battle-actions">
              <button className="battle-act primary-btn" onClick={() => act({ type: "attack", target: enemy.id })}>
                ⚔ Atacar
              </button>
              <button className="battle-act" onClick={() => act({ type: "defend" })}>
                🛡 Defender
              </button>
              <button
                className={`battle-act ${me.gauge >= 100 ? "ex-ready" : ""}`}
                disabled={me.gauge < 100}
                title={ex.desc}
                onClick={() => act({ type: "ex", target: enemy.id })}
              >
                ⭐ {ex.name}
              </button>
              <button className="battle-act" onClick={() => act({ type: "flee" })}>
                🏃 Huir
              </button>
            </div>

            <div className="battle-sub-actions">
              <div className="sub-row">
                <span className="sub-label">Hechizos</span>
                <div className="sub-items">
                  {mySpells.length === 0 ? (
                    <span className="sub-empty">Llega al nivel {SPELLS[0].level} para el primer hechizo.</span>
                  ) : (
                    mySpells.map((sp) => (
                      <button
                        key={sp.id}
                        className="battle-act small"
                        disabled={me.mp < sp.cost}
                        title={`${ELEMENT_ICON[sp.element]} ${sp.name} · ${sp.cost} MP`}
                        onClick={() => act({ type: "spell", spellId: sp.id, target: enemy.id })}
                      >
                        {ELEMENT_ICON[sp.element]} {sp.name} ({sp.cost} MP)
                      </button>
                    ))
                  )}
                </div>
              </div>
              <div className="sub-row">
                <span className="sub-label">Ítems</span>
                <div className="sub-items">
                  {potions.length === 0 ? (
                    <span className="sub-empty">Sin pociones. Comprá en el shop.</span>
                  ) : (
                    potions.map((p) => (
                      <button
                        key={p.id}
                        className="battle-act small"
                        title={p.item?.desc}
                        onClick={() => act({ type: "item", itemId: p.id! })}
                      >
                        🧪 {p.item?.name} ×{p.count}
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
