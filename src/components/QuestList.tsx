import { useMemo } from "react";
import { DIFFICULTY_COLOR } from "../lib/quests";
import { CATEGORY_ICON, type Quest } from "../types";

interface Props {
  quests: Quest[];
  completed: Set<string>;
  busy: boolean;
  onComplete: (q: Quest) => void;
  source: string;
}

export default function QuestList({ quests, completed, busy, onComplete, source }: Props) {
  const sorted = useMemo(
    () => [...quests].sort((a, b) => Number(completed.has(a.id)) - Number(completed.has(b.id))),
    [quests, completed],
  );

  const allDone = quests.length > 0 && quests.every((q) => completed.has(q.id));

  return (
    <section className="quest-list">
      <div className="section-head">
        <h2>Quests de hoy</h2>
        <span className={`quest-source ${source}`}>
          {source === "gemini" ? "⚡ generadas por IA" : source === "offline" ? "modo offline" : "El Sistema"}
        </span>
      </div>

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
