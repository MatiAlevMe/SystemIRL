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
- [ ] Verificar party en vivo con 2 pestañas (pendiente, para la demo)
- [x] Crear pitch (≤280 caracteres) — draft en README
- [ ] Grabar demo (≤1:30) y subir a YouTube público — guion en `docs/DEMO.md`
- [x] README con explicación de Portal
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

### 5. Probar la demo en vivo
1. Abre https://systemirl.vercel.app en **dos pestañas/ventanas**.
2. En cada una pon un nombre distinto (pestaña A: `Sung`, pestaña B: `Jinwoo`).
3. En ambas, **Party → código `RAGNAROK` → Entrar**.
4. En A completa una quest → en B deberías ver el feed y el leaderboard actualizarse **sin recargar**.
5. Completa varias quests en A hasta subir de nivel → el modal aparece y B ve el ⚡ level-up.

## Backlog — demo boosters (en orden de impacto, para la demo)
- [ ] **God mode / Demo panel** (dev-only, nunca visible en producción): spawn de bots en la party (presencia fake + mensajes `join`/`done`/`levelup`), avanzar día (streak + quests nuevas), forzar level-up y forzar provider de IA. → la demo se vuelve autónoma y controlada en el video, sin depender de otra persona ni de 2 pestañas coordinadas.
- [ ] **Shop demo**: gastar XP en títulos/colores de perfil (cierra el loop de progresión y da qué mostrar).
- [ ] **Tokens identificados**: conectar `/api/portal-token` (ya mintéa tokens) → presencia con nombres reales.
- [ ] Más stats/desbloqueos visuales por nivel.

## Post-hackathon (ver planning/docs/sistema-irl.md)
- Notificaciones push (inbox de Portal) cuando alguien sube de nivel.
- PWA instalable (manifest + service worker, como FireGuard).
- Leaderboards semanales, módulos finanzas/hábitos.
