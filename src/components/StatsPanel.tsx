import { CATEGORY_ICON, CATEGORY_LABEL, type QuestCategory } from "../types";

interface Props {
  stats: Record<QuestCategory, number>;
}

const ORDER: QuestCategory[] = ["strength", "intelligence", "vitality", "gold"];

// Cada 25 puntos de una stat = un rango (E → S), como el Sistema de Solo Leveling.
const TIER_SIZE = 25;
const TIER_RANKS = ["E", "D", "C", "B", "A", "S"];

function tierInfo(value: number): { rank: string; inTier: number; pct: number } {
  const idx = Math.min(Math.floor(value / TIER_SIZE), TIER_RANKS.length - 1);
  const inTier = value % TIER_SIZE;
  return { rank: TIER_RANKS[idx], inTier, pct: Math.round((inTier / TIER_SIZE) * 100) };
}

export default function StatsPanel({ stats }: Props) {
  return (
    <section className="stats-panel">
      {ORDER.map((c) => {
        const info = tierInfo(stats[c]);
        return (
          <div className="stat" key={c}>
            <span className="stat-icon">{CATEGORY_ICON[c]}</span>
            <div className="stat-body">
              <div className="stat-label">
                {CATEGORY_LABEL[c]} <em>· Rango {info.rank}</em>
              </div>
              <div className="stat-bar">
                <div className="stat-fill" style={{ width: `${info.pct}%` }} />
              </div>
              <div className="stat-tier-ticks">
                {Array.from({ length: TIER_SIZE + 1 }, (_, i) => (
                  <span key={i} className={`stat-tier-tick ${i % 5 === 0 ? "major" : ""}`} />
                ))}
              </div>
            </div>
            <span className="stat-value">
              {stats[c]} <small>/ {info.inTier}</small>
            </span>
          </div>
        );
      })}
      <p className="panel-note">
        Cada 25 puntos de una stat subís de rango (E→S). Crece +1 por quest completada de esa categoría.
      </p>
    </section>
  );
}
