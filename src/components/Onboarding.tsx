import { useState } from "react";

interface Props {
  onSubmit: (name: string) => void;
}

export default function Onboarding({ onSubmit }: Props) {
  const [name, setName] = useState("");

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
      <form
        className="name-form"
        onSubmit={(e) => {
          e.preventDefault();
          const n = name.trim();
          if (n) onSubmit(n);
        }}
      >
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre de jugador"
          maxLength={24}
        />
        <button type="submit" disabled={!name.trim()}>
          Despertar ▸
        </button>
      </form>
      <p className="hint">Selecciona un nombre. La demo brilla con una segunda pestaña abierta.</p>
    </div>
  );
}
