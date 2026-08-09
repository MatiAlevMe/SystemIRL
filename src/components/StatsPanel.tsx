import { CATEGORY_ICON, CATEGORY_LABEL, type QuestCategory } from "../types";

interface Props {
  stats: Record<QuestCategory, number>;
}

const ORDER: QuestCategory[] = ["strength", "intelligence", "vitality", "gold"];

export default function StatsPanel({ stats }: Props) {
  const max = Math.max(1, ...ORDER.map((c) => stats[c]));

  return (
    <section className="stats-panel">
      {ORDER.map((c) => (
        <div className="stat" key={c}>
          <span className="stat-icon">{CATEGORY_ICON[c]}</span>
          <div className="stat-body">
            <div className="stat-label">{CATEGORY_LABEL[c]}</div>
            <div className="stat-bar">
              <div className="stat-fill" style={{ width: `${Math.round((stats[c] / max) * 100)}%` }} />
            </div>
          </div>
          <span className="stat-value">{stats[c]}</span>
        </div>
      ))}
    </section>
  );
}
