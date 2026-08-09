import { useState } from "react";
import { CLASS_ICON, CLASS_LABEL, type PlayerClass } from "../types";
import { MAX_PREF_TAGS, MIN_PREF_TAGS, QUEST_TAGS } from "../lib/prefs";

interface Props {
  onSubmit: (name: string, cls: PlayerClass, tags: string[]) => void;
}

const CLASSES: Array<{ id: PlayerClass; desc: string }> = [
  { id: "guerrero", desc: "+20% ataque · Filo del Sistema" },
  { id: "guardia", desc: "+25% HP / +20% def · Muro del Sistema" },
  { id: "sabio", desc: "+30% MP y curación · Luz del Sistema" },
  { id: "cazador", desc: "+50% crítico · Aluvión del Sistema" },
];

export default function Onboarding({ onSubmit }: Props) {
  const [name, setName] = useState("");
  const [cls, setCls] = useState<PlayerClass>("guerrero");
  const [tags, setTags] = useState<string[]>([]);

  const toggleTag = (id: string) => {
    setTags((cur) => {
      if (cur.includes(id)) return cur.filter((t) => t !== id);
      if (cur.length >= MAX_PREF_TAGS) return cur;
      return [...cur, id];
    });
  };

  return (
    <div className="onboarding">
      <div className="system-brand">
        <span className="brand-glyph">◈</span> EL SISTEMA
      </div>
      <h1>Tu vida real,<br />convertida en RPG.</h1>
      <p className="lead">
        Un agente de IA te asigna quests diarias de entrenamiento, hábitos y finanzas.
        Completa misiones, gana XP y sube de nivel — en tiempo real con tu party.
      </p>
      <div className="class-select">
        {CLASSES.map((c) => (
          <button
            key={c.id}
            className={`class-option ${cls === c.id ? "active" : ""}`}
            type="button"
            onClick={() => setCls(c.id)}
          >
            <span className="class-option-icon">{CLASS_ICON[c.id]}</span>
            <span className="class-option-body">
              <span className="class-option-name">{CLASS_LABEL[c.id]}</span>
              <span className="class-option-desc">{c.desc}</span>
            </span>
          </button>
        ))}
      </div>
      <div className="pref-block">
        <div className="pref-title">
          Intereses <em>(elige {MIN_PREF_TAGS} a {MAX_PREF_TAGS})</em>
        </div>
        <div className="pref-chips">
          {QUEST_TAGS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`chip ${tags.includes(t.id) ? "active" : ""}`}
              onClick={() => toggleTag(t.id)}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>
      <form
        className="name-form"
        onSubmit={(e) => {
          e.preventDefault();
          const n = name.trim();
          if (n && tags.length >= MIN_PREF_TAGS) onSubmit(n, cls, tags);
        }}
      >
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre de jugador"
          maxLength={24}
        />
        <button type="submit" disabled={!name.trim() || tags.length < MIN_PREF_TAGS}>
          Despertar ▸
        </button>
      </form>
      <p className="hint">Elegí tu clase y tus intereses: la IA arma tus quests a partir de eso.</p>
    </div>
  );
}
