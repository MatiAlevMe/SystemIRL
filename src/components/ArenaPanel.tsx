import { useState } from "react";
import type { PlayerState } from "../types";
import { MAX_ARENA_1V1_ENERGY, MAX_ARENA_TOURNAMENT_ENERGY } from "../lib/balance";

interface Props {
  player: PlayerState;
  bots: Array<{ name: string; cls: any; level: number }>;
  onStart1v1: (botName: string) => void;
  onStartTournament: () => void;
}

export default function ArenaPanel({ player, bots, onStart1v1, onStartTournament }: Props) {
  const energy = player.energy ?? { tower: 8, arena1v1: 2, arenaTourney: 1, lastReset: "" };
  const [selectedBot, setSelectedBot] = useState(bots[0]?.name ?? "");

  return (
    <section className="panel arena-panel">
      <div className="section-head">
        <h2>Arena de Entrenamiento</h2>
        <div className="arena-energy-badges">
          <span className="quest-source gemini">1v1: {energy.arena1v1}/{MAX_ARENA_1V1_ENERGY}</span>
          <span className="quest-source offline">Torneo: {energy.arenaTourney}/{MAX_ARENA_TOURNAMENT_ENERGY}</span>
        </div>
      </div>

      <div className="arena-sections" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "1rem" }}>
        <div className="arena-card" style={{ padding: "1rem", background: "rgba(255,255,255,0.03)", borderRadius: "8px" }}>
          <h3>⚔ Combate Duelo 1v1</h3>
          <p className="panel-note">Enfréntate a un compañero de party en duelo táctico por turnos (consume 1 de energía 1v1).</p>
          <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem", flexDirection: "column" }}>
            <label>Seleccionar oponente:</label>
            <select
              value={selectedBot}
              onChange={(e) => setSelectedBot(e.target.value)}
              style={{ padding: "0.5rem", borderRadius: "4px", background: "#1e1e24", color: "#fff", border: "1px solid #333" }}
            >
              {bots.map((b) => (
                <option key={b.name} value={b.name}>
                  {b.name} (Nivel {b.level} · {b.cls})
                </option>
              ))}
            </select>
            <button
              className="primary-btn"
              onClick={() => selectedBot && onStart1v1(selectedBot)}
              disabled={energy.arena1v1 <= 0 || !selectedBot}
              style={{ marginTop: "0.5rem" }}
            >
              {energy.arena1v1 <= 0 ? "Sin energía 1v1 hoy" : "Iniciar Duelo 1v1"}
            </button>
          </div>
        </div>

        <div className="arena-card" style={{ padding: "1rem", background: "rgba(255,255,255,0.03)", borderRadius: "8px" }}>
          <h3>🏆 Torneo del Sistema (16 Gladiadores)</h3>
          <p className="panel-note">Torneo eliminatorio de 16 participantes (incluyendo la party y rivales del Sistema). Consume 1 de energía de torneo.</p>
          <div style={{ marginTop: "1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <button
              className="primary-btn"
              onClick={onStartTournament}
              disabled={energy.arenaTourney <= 0}
            >
              {energy.arenaTourney <= 0 ? "Sin energía de torneo hoy" : "Entrar al Torneo de 16"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
