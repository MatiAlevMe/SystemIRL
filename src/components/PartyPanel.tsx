import { useMemo, useState } from "react";
import type { AggregatePresence, ChannelStatus, DetailedPresence, Message } from "@portalsdk/core";
import type { PartyMessage } from "../types";
import { RAID_BOSS_HP, RAID_BOSS_NAME } from "../lib/rpg";

interface Props {
  partyCode: string;
  onJoin: (code: string) => void;
  playerName: string;
  presence: DetailedPresence | AggregatePresence | undefined;
  meId: string | undefined;
  messages: readonly Message<PartyMessage>[];
  status: ChannelStatus;
  raid: string;
  raidHp: number;
  raidClaimed: boolean;
  onFightRaid: () => void;
}

interface BoardRow {
  id: string;
  name: string;
  title?: string;
  color?: string;
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
  raidHp,
  raidClaimed,
  onFightRaid,
}: Props) {
  const [draft, setDraft] = useState("");
  const [copied, setCopied] = useState(false);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(partyCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard no disponible */
    }
  };

  const board = useMemo<BoardRow[]>(() => {
    if (!presence || presence.kind !== "detailed") return [];
    return presence.participants
      .filter((p) => p.metadata && typeof p.metadata.name === "string")
      .map((p) => ({
        id: p.id,
        name: String(p.metadata!.name),
        title: typeof p.metadata?.title === "string" ? p.metadata.title : undefined,
        color: typeof p.metadata?.color === "string" ? p.metadata.color : undefined,
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

  const raidContributors = useMemo(() => {
    const raiders = new Set<string>();
    for (const m of messages) {
      const c = m.content as Partial<PartyMessage> | null;
      if (c && c.kind === "raidHit" && c.raid === raid && typeof c.name === "string") raiders.add(c.name);
    }
    return raiders.size;
  }, [messages, raid]);

  const raidPct = Math.min(100, Math.max(0, Math.round((1 - raidHp / RAID_BOSS_HP) * 100)));
  const raidDead = raidHp <= 0;

  return (
    <section className="party">
      {!partyCode ? (
        <div className="join-card">
          <div className="system-brand small"><span className="brand-glyph">◈</span> PARTY</div>
          <h2>Únete a tu party</h2>
          <p>
            Un canal en tiempo real conecta a todos los jugadores: presencia, notificaciones de
            nivel y raid de la semana. Abre esta app en una segunda pestaña o comparte el código.
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
              <div className="party-title">
                PARTY — {partyCode}
                <button className="copy-code" onClick={copyCode} title="Copiar código">
                  {copied ? "✓" : "⧉"}
                </button>
              </div>
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
                      <span className="b-name" style={{ color: r.color ?? undefined }}>
                        {r.title ? `${r.title} — ` : ""}
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
                    if (c.kind === "raidHit") {
                      return (
                        <li key={m.id} className="feed-item raid">
                          <span className="f-ico">⚔</span>
                          <span>
                            <strong>{c.name}</strong>{" "}
                            {c.dmg && c.dmg > 0 ? `golpeó al jefe de raid (-${c.dmg})` : "hizo retroceder al jefe de raid"}
                          </span>
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
                <div className="raid-icon">👹</div>
                <div className="raid-title">{raid}</div>
                <p>
                  {RAID_BOSS_NAME} tiene <strong>{RAID_BOSS_HP} HP</strong> compartidos. El daño de toda la party
                  viaja en tiempo real; el HP es el estado del canal.
                </p>
                <div className="raid-progress">
                  <div className="raid-progress-bar">
                    <div className="raid-progress-fill" style={{ width: `${raidPct}%` }} />
                  </div>
                  <span className="raid-progress-label">
                    {raidDead ? "Derrotado" : `${Math.max(0, Math.ceil(raidHp))}/${RAID_BOSS_HP} HP`} · {raidContributors}{" "}
                    contribuyente{raidContributors === 1 ? "" : "s"}
                  </span>
                </div>
                <button className="primary-btn" disabled={raidClaimed} onClick={onFightRaid}>
                  {raidClaimed ? "✓ Aura obtenida" : raidDead ? "Reclamar (reaparece)" : "⚔ Luchar vs jefe de raid"}
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
