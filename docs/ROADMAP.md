# Roadmap SystemIRL — The Realtime Hackathon by Portal

**Equipo:** Ragnarok · **Participante:** Matías Alé (Discord: `lightsky723`)
**Evento:** 7–9 ago 2026 · **Entrega:** dom 9 10:00 UTC-5

> Estrategia: construir una base sólida demo-first en el menor tiempo posible y luego iterar. Regla de oro: **si algo se atrasa, se corta la feature, nunca el deploy ni el video.**

## Checklist global (entregas)

- [x] Registrarse en el hackathon
- [x] Definir idea (Sistema IRL — Solo Leveling para la vida real)
- [x] Crear repo público `MatiAlevMe/SystemIRL`
- [x] Implementar MVP (scaffold + core: quests IA, XP/niveles, party en vivo)
- [x] Live deploy a Vercel (`https://system-irl.vercel.app`) — ✅ verificado en vivo
- [x] Configurar keys en Vercel (publishable + secret + Gemini) ✅
- [x] Party en vivo verificada (con bots del God Mode + 2 pestañas)
- [x] Crear pitch (≤280 caracteres) — draft en README
- [ ] Grabar demo (≤1:30) y subir a YouTube público — guion en `docs/DEMO.md`
- [x] README con explicación de Portal (+ snippet real y diagrama del flujo)
- [ ] Completar formulario de entrega (nombre equipo, Discord, pitch, URL live, URL demo, URL repo, explicación Portal)

## Línea de tiempo de construcción

| Bloque | Estado | Qué |
|--------|--------|-----|
| 0. Setup (repo, Vite, deps, env, serverless) | ✅ | `feat/setup` mergeado |
| 1. Núcleo UI (estética Sistema, quests, XP bar) | ✅ | parte de `feat/core` |
| 2. Motor (completar → XP/niveles/stats/streak/IndexedDB) | ✅ | `feat/core` |
| 3. Party en vivo (canal, presencia, leaderboard, notificaciones) | ✅ | `feat/core` |
| 4. Polish demo (animaciones, level-up modal, flujo 2 pestañas) | ✅ | `feat/core` |
| 5. Deploy Vercel + config Portal | ✅ | live en `system-irl.vercel.app`, config desplegada |
| 6. Entregables (README, pitch, video, formulario) | 🔜 | docs listas, falta video + formulario |
| 7. Post-MVP: God Mode + bots, 5 quests, toasts, raid grupal, combate, shop, torre, sonido | ✅ | commits `feat(demo/quests/party/rpg/shop/tower/ux)` |

## Pasos manuales que debes hacer tú

### 1. Keys de Portal (hack.useportal.co)
- En el dashboard crea/abre un proyecto y ve a **API Keys**.
- Copia la **publishable key** (`pk_...`) → va como `VITE_PORTAL_PUBLISHABLE_KEY`.
- (Opcional) copia la **secret key** (`sk_...`) → va como `PORTAL_SECRET`.

### 2. Keys de Gemini (aistudio.google.com/apikey)
- Genera una API key gratis → va como `GEMINI_API_KEY`.

### 3. Deploy en Vercel (igual que FireGuard)
1. Entra a https://vercel.com/new → **Import Git Repository** → selecciona `MatiAlevMe/SystemIRL`.
2. Vercel detecta Vite solo. No cambies el build por defecto.
3. **Environment Variables** (Settings → Environment Variables, o al importar):
   - `VITE_PORTAL_PUBLISHABLE_KEY` = tu `pk_...`
   - `GEMINI_API_KEY` = tu key de Gemini (o `KILO_API_KEY` / `ZEN_API_KEY` como alternativas)
   - `PORTAL_SECRET` = tu `sk_...` (opcional)
   - `QUEST_PROVIDER` = `auto` (default: usa el primero que tenga key)
4. **Deploy**. En ~1 min queda live. Cada push a `main` re-despliega.

### 4. Desplegar config de Portal (opcional)
```bash
cd SystemIRL
export PORTAL_SECRET=sk_...
npm run portal:deploy
```
Los canales `party-*` ya aceptan anónimos por defecto, así que no es bloqueante.

### 5. Probar la demo en vivo (ahora con God Mode)
1. Abre `https://system-irl.vercel.app/#demo` (el `#demo` activa el panel de demo).
2. Crea tu jugador y entra a una party con el código `RAGNAROK`.
3. En el panel **GOD MODE** (abajo a la derecha):
   - **Spawn bots** → Jinwoo y Cha entran con presencia real al leaderboard.
   - **Bot quest / Bot level-up / Bot raid** → llenan el feed en vivo (verás los toasts desde la pestaña Quests).
   - **+60 XP / Subir nivel / +500 oro / Nuevo día** → controlás la progresión del video.
   - **Victoria forzada / Hechizo garantizado** → el combate siempre sale espectacular.
   - **Golpear jefe / Piso 2 / Piso 5** → controlás La Torre.

## Backlog — demo boosters (hechos en el post-MVP)
- [x] **God mode / Demo panel** (`#demo`): bots con presencia real (clientes de Portal propios), +XP, level-up, oro, streak, nuevo día, provider forzado, combate forzado y control de la Torre. → la demo es autónoma y reproducible en video.
- [x] **RPG layer**: combate + monstruos por dificultad + hechizos + loot (oro y drops de armas).
- [x] **Shop demo**: títulos/colores/armas con bonos; equipamiento visible en perfil y leaderboard.
- [x] **La Torre del Sistema**: 5 pisos con jefes, daño por quests, recompensas y piso final.
- [x] **5 quests/día** (antes 3), skeleton loading, feed en vivo con toasts en cualquier pestaña, raid con progreso grupal, sonido WebAudio, copiar código de party, +XP flotante.

## Post-hackathon (ver planning/docs/sistema-irl.md)
- [ ] **Tokens identificados**: conectar `/api/portal-token` (ya mintéa tokens, `PORTAL_SECRET` configurado) → presencia con identidad verificada y anti-suplantación. No aporta al video (los nombres ya salen vía metadata), por eso quedó fuera del sprint de la demo.
- [ ] Notificaciones push (inbox de Portal) cuando alguien sube de nivel.
- [ ] PWA instalable (manifest + service worker, como FireGuard).
- [ ] Leaderboards semanales, módulos finanzas/hábitos, shop curado con IA.
