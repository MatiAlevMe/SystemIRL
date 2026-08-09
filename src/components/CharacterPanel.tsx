import { CATEGORY_ICON, CATEGORY_LABEL, CLASS_ICON, CLASS_LABEL, type PlayerState } from "../types";
import { itemById } from "../lib/catalog";
import { xpProgress } from "../lib/xp";
import {
  combatStats,
  exProgress,
  EX_SKILLS,
  classEvolved,
  spellsFor,
  ELEMENT_ICON,
  SPELLS,
} from "../lib/rpg";

interface Props {
  player: PlayerState;
}

const BASE_ORDER = ["strength", "intelligence", "vitality", "gold"] as const;

function fmtCrit(crit: number): string {
  return `${Math.round(crit * 100)}%`;
}

export default function CharacterPanel({ player }: Props) {
  const progress = xpProgress(player.xp);
  const cs = combatStats(player);
  const evolved = classEvolved(player);
  const ex = EX_SKILLS[player.cls];
  const exInfo = exProgress(player.battle.exXp);
  const spells = spellsFor(progress.level, player.elements);
  const weapon = itemById(player.weapon);
  const armor = itemById(player.armor);
  const trinket = itemById(player.trinket);
  const aura = itemById(player.aura);
  const boots = itemById(player.boots);

  const gear: Array<{ label: string; value: string }> = [
    { label: "Arma", value: weapon ? `${weapon.name} (+${weapon.bonus?.dmg ?? 0} dmg)` : "—" },
    { label: "Armadura", value: armor ? `${armor.name} (+${armor.bonus?.def ?? 0} def)` : "—" },
    { label: "Reliquia", value: trinket ? trinket.name : "—" },
    { label: "Aura", value: aura ? aura.name : "—" },
    { label: "Botas", value: boots ? `${boots.name} (+${boots.bonus?.agi ?? 0} agilidad)` : "—" },
  ];

  return (
    <section className="character">
      <div className="section-head">
        <h2>
          {CLASS_ICON[player.cls]} Personaje
        </h2>
        <span className="quest-source gemini">Nv {progress.level}</span>
      </div>

      <div className="char-class-card">
        <div className="char-class-icon">{CLASS_ICON[player.cls]}</div>
        <div>
          <div className="char-class-name">
            {CLASS_LABEL[player.cls]} {evolved ? "· EVOLUCIONADO" : ""}
          </div>
          <div className="char-class-desc">
            {ex.icon} <strong>{ex.name}</strong> — {ex.desc}
          </div>
          <div className="char-class-meta">
            EX nivel {exInfo.level}/{99} · <span className="ex-bar">
              <span className="ex-bar-fill" style={{ width: `${Math.round(exInfo.ratio * 100)}%` }} />
            </span>{" "}
            {exInfo.current}/{exInfo.needed} XP de EX
          </div>
          <p className="panel-note">
            La habilidad EX escala +3% de daño/cura por nivel. Hitos: L10 +10% regen de MP · L25 +5% crítico · L75
            +5% HP máx.
          </p>
          {!evolved && <p className="panel-note">Evoluciona al llegar al nivel 5 o al piso 4 de la Torre.</p>}
        </div>
      </div>

      <div className="char-grid">
        <div className="panel char-panel">
          <h3>Stats base</h3>
          {BASE_ORDER.map((c) => (
            <div className="char-stat" key={c}>
              <span className="char-stat-icon">{CATEGORY_ICON[c]}</span>
              <span className="char-stat-label">{CATEGORY_LABEL[c]}</span>
              <span className="char-stat-value">{player.stats[c]}</span>
            </div>
          ))}
          <p className="panel-note">
            Crecen +1 por quest de esa categoría. Al subir de nivel, la stat principal de tu clase sube +1.
          </p>
        </div>

        <div className="panel char-panel">
          <h3>Stats de combate</h3>
          <div className="char-stat">
            <span className="char-stat-icon">❤️</span>
            <span className="char-stat-label">HP máx</span>
            <span className="char-stat-value">{cs.maxHp}</span>
          </div>
          <div className="char-stat">
            <span className="char-stat-icon">💙</span>
            <span className="char-stat-label">MP máx</span>
            <span className="char-stat-value">{cs.maxMp}</span>
          </div>
          <div className="char-stat">
            <span className="char-stat-icon">⚔️</span>
            <span className="char-stat-label">Ataque</span>
            <span className="char-stat-value">{cs.atk}</span>
          </div>
          <div className="char-stat">
            <span className="char-stat-icon">🛡️</span>
            <span className="char-stat-label">Defensa</span>
            <span className="char-stat-value">{cs.def}</span>
          </div>
          <div className="char-stat">
            <span className="char-stat-icon">🎯</span>
            <span className="char-stat-label">Crítico</span>
            <span className="char-stat-value">{fmtCrit(cs.crit)}</span>
          </div>
          <div className="char-stat">
            <span className="char-stat-icon">✨</span>
            <span className="char-stat-label">Poder mágico</span>
            <span className="char-stat-value">{cs.magic}</span>
          </div>
          <p className="panel-note">
            La clase multiplica stats: guerrero +20% ataque, guardia +25% HP/+20% defensa, sabio +30% MP, cazador
            +50% crítico.
          </p>
        </div>
      </div>

      <div className="panel char-panel">
        <h3>Equipo</h3>
        <div className="char-gear">
          {gear.map((g) => (
            <div className="char-gear-row" key={g.label}>
              <span className="char-gear-label">{g.label}</span>
              <span className="char-gear-value">{g.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="panel char-panel">
        <h3>Hechizos</h3>
        {spells.length === 0 ? (
          <p className="empty">Llega al nivel {SPELLS[0].level} para desbloquear {SPELLS[0].name}.</p>
        ) : (
          <div className="spell-list">
            {spells.map((sp) => (
              <div className="spell-row" key={sp.id}>
                <span className="spell-ico">{ELEMENT_ICON[sp.element]}</span>
                <div className="spell-body">
                  <span className="spell-name">
                    {sp.name} <em>· {sp.cost} MP</em>
                  </span>
                  {sp.dmg && <span className="spell-dmg">{sp.dmg} dmg + poder mágico</span>}
                  {sp.heal && <span className="spell-dmg">{sp.heal} curación</span>}
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="panel-note">Los hechizos golpean con elementos; probá la debilidad de cada monstruo.</p>
      </div>
    </section>
  );
}
