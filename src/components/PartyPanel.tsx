import { useMemo, useState } from "react";
import type { AggregatePresence, ChannelStatus, DetailedPresence, Message } from "@portalsdk/core";
import type { PartyMessage } from "../types";
import { RAID_TARGET } from "../lib/raids";

interface Props {
  partyCode: string;
  onJoin: (code: string) => void;
  playerName: string;
  presence: DetailedPresence | AggregatePresence | undefined;
  meId: string | undefined;
  messages: readonly Message<PartyMessage>[];
  status: ChannelStatus;
  raid: string;
  raidClaimed: boolean;
  onClaimRaid: () => void;
}

interface BoardRow {
  id: string;
  name: string;
  level: number;
  xp: number;
}

export default function PartyPanel({
  partyCode,
  onJoin,
  playerName,
  presence,
  meId,
  messages,
  status,
  raid,
  raidClaimed,
  onClaimRaid,
}: Props) {
  const [draft, setDraft] = useState("");

  const board = useMemo<BoardRow[]>(() => {
    if (!presence || presence.kind !== "detailed") return [];
    return presence.participants
      .filter((p) => p.metadata && typeof p.metadata.name === "string")
      .map((p) => ({
        id: p.id,
        name: String(p.metadata!.name),
        level: Number(p.metadata?.level ?? 1),
        xp: Number(p.metadata?.xp ?? 0),
      }))
      .sort((a, b) => b.level - a.level || b.xp - a.xp)
      .slice(0, 12);
  }, [presence]);

  const feed = useMemo(
    () =>
      messages
        .filter((m): m is Message<PartyMessage> => {
          const c = m.content as { kind?: unknown } | null;
          return !!c && typeof c === "object" && typeof c.kind === "string";
        })
        .slice(-40)
        .reverse(),
    [messages],
  );

  const onlineCount = presence ? presence.count : 0;

  const raidProgress = useMemo(() => {
    const raiders = new Set<string>();
    for (const m of messages) {
      const c = m.content as { kind?: unknown; name?: unknown; raid?: unknown } | null;
      if (c && c.kind === "raid" && c.raid === raid && typeof c.name === "string") raiders.add(c.name);
    }
    return raiders.size;
  }, [messages, raid]);

  const raidPct = Math.min(100, Math.round((raidProgress / RAID_TARGET) * 100));

  return (
    <section className="party">
      {!partyCode ? (
        <div className="join-card">
          <div className="system-brand small"><span className="brand-glyph">◈</span> PARTY</div>
          <h2>Únete a tu party</h2>
          <p>
            Un canal en tiempo real conecta a todos los jugadores: presencia, notificaciones de
            nivel y raid semanal. Abre esta app en una segunda pestaña o comparte el código.
          </p>
          <form
            className="name-form"
            onSubmit={(e) => {
              e.preventDefault();
              const c = draft.trim().toUpperCase();
              if (c) onJoin(c);
            }}
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Código de party (ej. RAGNAROK)"
              maxLength={16}
            />
            <button type="submit" disabled={!draft.trim()}>Entrar ▸</button>
          </form>
        </div>
      ) : (
        <div className="party-live">
          <div className="party-head">
            <div>
              <div className="party-title">PARTY — {partyCode}</div>
              <div className="party-sub">
                <span className={`status-dot ${status}`} />
                {onlineCount} jugador{onlineCount === 1 ? "" : "es"} conectado{onlineCount === 1 ? "" : "s"} en vivo
              </div>
            </div>
            <button className="ghost-btn" onClick={() => onJoin("")}>Salir</button>
          </div>

          <div className="party-grid">
            <div className="panel leaderboard">
              <h3>Leaderboard en vivo</h3>
              {board.length === 0 ? (
                <p className="empty">Abriendo la party…</p>
              ) : (
                <ol className="board">
                  {board.map((r, i) => (
                    <li key={r.id} className={r.id === meId ? "me" : ""}>
                      <span className="rank">{i + 1}</span>
                      <span className="b-name">
                        {r.name}
                        {r.id === meId && <em>(tú)</em>}
                      </span>
                      <span className="b-level">Nv {r.level}</span>
                      <span className="b-xp">{r.xp} XP</span>
                    </li>
                  ))}
                </ol>
              )}
              <p className="panel-note">Se actualiza solo vía presence de Portal. Sin recargar.</p>
            </div>

            <div className="panel feed">
              <h3>Actividad en vivo</h3>
              {feed.length === 0 ? (
                <p className="empty">Sin actividad todavía. Completa una quest para que la party lo vea al instante.</p>
              ) : (
                <ul className="feed-list">
                  {feed.map((m) => {
                    const c = m.content;
                    if (c.kind === "levelup") {
                      return (
                        <li key={m.id} className="feed-item levelup">
                          <span className="f-ico">⚡</span>
                          <span><strong>{c.name}</strong> alcanzó el nivel <strong>{c.level}</strong></span>
                        </li>
                      );
                    }
                    if (c.kind === "done") {
                      return (
                        <li key={m.id} className="feed-item done">
                          <span className="f-ico">▸</span>
                          <span><strong>{c.name}</strong> completó: {c.quest}</span>
                        </li>
                      );
                    }
                    if (c.kind === "raid") {
                      return (
                        <li key={m.id} className="feed-item raid">
                          <span className="f-ico">⌁</span>
                          <span><strong>{c.name}</strong> completó la raid de la semana 🏆</span>
                        </li>
                      );
                    }
                    return (
                      <li key={m.id} className="feed-item join">
                        <span className="f-ico">◈</span>
                        <span><strong>{c.name}</strong> se unió a la party</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="panel raid">
              <h3>Raid de la semana</h3>
              <div className="raid-body">
                <div className="raid-icon">⌁</div>
                <div className="raid-title">{raid}</div>
                <p>Objetivo grupal. Un jugador completa la raid y toda la party lo ve en tiempo real.</p>
                <div className="raid-progress">
                  <div className="raid-progress-bar">
                    <div className="raid-progress-fill" style={{ width: `${raidPct}%` }} />
                  </div>
                  <span className="raid-progress-label">
                    {raidProgress}/{RAID_TARGET} jugadores
                  </span>
                </div>
                <button className="primary-btn" disabled={raidClaimed} onClick={onClaimRaid}>
                  {raidClaimed ? "✓ Raid completada" : "Completar raid"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <p className="panel-note center">{playerName ? `Conectado como ${playerName}` : ""}</p>
    </section>
  );
}
