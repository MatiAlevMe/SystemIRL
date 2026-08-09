import { useMemo } from "react";
import { DIFFICULTY_COLOR } from "../lib/quests";
import { CATEGORY_ICON, type Quest } from "../types";

interface Props {
  quests: Quest[];
  completed: Set<string>;
  busy: boolean;
  onComplete: (q: Quest) => void;
  source: string;
  loading?: boolean;
}

const SKELETON_COUNT = 5;

export default function QuestList({ quests, completed, busy, onComplete, source, loading }: Props) {
  const isAI = source === "gemini" || source === "kilo" || source === "zen";
  const sorted = useMemo(
    () => [...quests].sort((a, b) => Number(completed.has(a.id)) - Number(completed.has(b.id))),
    [quests, completed],
  );

  const allDone = quests.length > 0 && quests.every((q) => completed.has(q.id));

  return (
    <section className="quest-list">
      <div className="section-head">
        <h2>Quests de hoy</h2>
        <span className={`quest-source ${isAI ? "gemini" : source}`}>
          {isAI ? "⚡ generadas por IA" : source === "offline" ? "modo offline" : "El Sistema"}
        </span>
      </div>

      {loading && (
        <div className="quest-grid">
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <article className="quest-card skeleton" key={i}>
              <div className="skeleton-line w40" />
              <div className="skeleton-line w80" />
              <div className="skeleton-line w60" />
              <div className="skeleton-line w100" />
            </article>
          ))}
        </div>
      )}

      {allDone && (
        <div className="all-done">
          <div className="all-done-icon">⌁</div>
          <div className="all-done-title">Todas las quests completadas</div>
          <div className="all-done-sub">El Sistema reconoce tu poder. Vuelve mañana.</div>
        </div>
      )}

      <div className="quest-grid">
        {sorted.map((q) => {
          const done = completed.has(q.id);
          return (
            <article className={`quest-card ${done ? "done" : ""}`} key={q.id} data-category={q.category}>
              <div className="quest-top">
                <span className="quest-cat">{CATEGORY_ICON[q.category]}</span>
                <span className="quest-diff" style={{ color: DIFFICULTY_COLOR[q.difficulty] }}>
                  {q.difficulty}
                </span>
              </div>
              <h3>{q.title}</h3>
              <p>{q.description}</p>
              <div className="quest-bottom">
                <span className="quest-xp">+{q.xp} XP</span>
                <button
                  className="complete-btn"
                  disabled={done || busy}
                  onClick={() => onComplete(q)}
                >
                  {done ? "✓ Completada" : "Completar"}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
