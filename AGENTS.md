# AGENTS.md — SystemIRL

Contexto para agentes de IA (opencode y otros). Esta app es el entregable de **The Realtime Hackathon by Portal** (7–9 ago 2026), equipo **Ragnarok**. Antes de proponer o cambiar código, lee en este orden.

## Orden de lectura
1. `README.md` — arquitectura, stack, cómo se usó Portal (entregable) y deploy.
2. `docs/ROADMAP.md` — estado, checklist de entregas y backlog.
3. `docs/DEMO.md` — guion del video (lo que la demo debe mostrar).
4. `api/quests.ts` y `api/portal-token.ts` — las 2 serverless functions.
5. `src/App.tsx`, `src/portal.ts`, `src/lib/*` — cliente React, estado, Portal.

Para el contexto multi-repo completo (incl. la referencia de FireGuard, otra hackathon), ver `docs/ai-reference.md` en el repo privado `MatiAlevMe/planning`.

## Qué es
"El Sistema" = tu vida real como RPG. La IA genera quests diarias (entrenamiento, hábitos, finanzas) → XP, niveles, 4 stats (Strength/Intelligence/Vitality/Gold), streak, combate táctico, clases/EX y Torre. El jugador elige intereses y rango que personalizan el prompt de la IA. Party en vivo con Portal: canal `party-<código>`, presencia → leaderboard automático, feed de actividad, raid semanal (jefe con HP compartido) y modal de level-up.

## Arquitectura (30 seg)
- **SPA** Vite + React 19 + TS (strict). Estado en IndexedDB via `idb-keyval` (`src/lib/storage.ts`). XP/niveles en `src/lib/xp.ts`.
- **Realtime**: Portal SDK (`src/portal.ts` + `useChannel` en `App.tsx`). Config de canales en `portal.config.ts`.
- **Backend**: 2 serverless de Vercel en `api/`.
  - `POST /api/quests` → genera quests con IA multi-provider (ver abajo). Body: `history`, `playerLevel`, `streak`, `count`, `tags` (intereses del jugador), `rankBias` (-1 bajar rango / +1 reliquia de ambición) y `forceRank` (god mode). El cliente cachea por día en IndexedDB (`force` la saltea para regenerar).
  - `POST /api/portal-token` → mintéa un JWT de Portal con `PORTAL_SECRET` (opcional; el app funciona anónimo sin él).

## IA multi-provider (`api/quests.ts`)
Orden según `QUEST_PROVIDER` (default `auto`): prueba los proveedores que tengan key en orden `gemini → kilo → zen`; si ninguno responde, cae a un pool offline (la app nunca rompe).
- `GEMINI_API_KEY` (+ `GEMINI_MODEL`): API REST de Google (`generateContent`). Cadena de modelos free: `gemini-3.6-flash → gemini-2.5-flash → gemini-2.0-flash`.
- `KILO_API_KEY` (+ `KILO_MODEL`): Kilo Gateway, OpenAI-compatible (`/chat/completions`). Free: `nvidia/nemotron-3-super-120b-a12b:free`.
- `ZEN_API_KEY` (+ `ZEN_MODEL`): OpenCode Zen, OpenAI-compatible. Free: `big-pickle`, `deepseek-v4-flash-free`.
- Timeout 8s por llamada (`AbortSignal.timeout`) y `export const maxDuration = 30`.
- El prompt incluye los `tags` del jugador y un **guardrail** (nunca sugerir acciones peligrosas/ilegales/autodestructivas); el rango de dificultad se ajusta por `rankBias` y `forceRank` (clamped server-side).

## Comandos
```bash
npm run dev              # local :5173
npm run build            # tsc -b (typecheck app + api/) + vite build
npm run preview
npm run portal:deploy    # despliega portal.config.ts (usa PORTAL_SECRET)
npx vercel --prod        # deploy a Vercel (proyecto: system-irl)
npx vercel logs system-irl.vercel.app
```
URL live: https://system-irl.vercel.app

## Variables de entorno (nombres; los valores viven SOLO en Vercel / `.env` local gitignored)
| Var | Alcance | Uso |
|---|---|---|
| `VITE_PORTAL_PUBLISHABLE_KEY` | navegador | cliente de Portal |
| `PORTAL_SECRET` | server | CLI de Portal + `/api/portal-token` |
| `GEMINI_API_KEY` / `GEMINI_MODEL` | server | IA de quests |
| `KILO_API_KEY` / `KILO_MODEL` | server | IA de quests (alternativo) |
| `ZEN_API_KEY` / `ZEN_MODEL` | server | IA de quests (alternativo) |
| `QUEST_PROVIDER` | server | `auto` \| `gemini` \| `kilo` \| `zen` |

El canónico con comentarios es `.env.template`.

## Gotchas — no romper esto
1. **`api/*.ts` deben exportar métodos HTTP nombrados** (`export async function POST(...)`), NUNCA `export default handler(...)` que devuelve un `Response`: Vercel lo interpreta como firma legacy `(req, res)`, ignora el response y la función se cuelga (bug ya vivido y corregido).
2. **Gemini free 2026**: `gemini-2.0-flash` está retirado del free tier (HTTP 429 `limit: 0`). Mantener la cadena de modelos; no hardcodear un modelo viejo único.
3. **Nunca commitear `.env`** (gitignored). Las keys reales van solo en env vars de Vercel o `.env` local.
4. La config de canales vive en `portal.config.ts`; si cambia, hay que desplegarla con `npm run portal:deploy`.
5. Typecheck: `api/*.ts` está en `tsconfig.node.json` (`"types": ["node"]`), así que `npm run build` valida frontend y funciones.

## Cómo se usó Portal (narrativa de entrega — no alterar)
1. **Canales en tiempo real**: cada party es un canal `party-<código>`; `useChannel` comparte un stream secuenciado de mensajes vía un único WebSocket.
2. **Presencia**: cada sesión publica `{ name, level, xp, streak }` con `setMetadata`; el leaderboard se arma solo agrupando presencia (sin backend ni reload).
3. **Mensajes** `done`/`levelup`/`join`/`raid` → feed de actividad en vivo.
4. **Sin infra propia**: el realtime, presencia, historial y orden los maneja Portal; el "backend" son 2 serverless de Vercel.

## Estado actual
- MVP live y verificado en producción (quests IA, portal-token, canales party desplegados).
- **Post-MVP (sprint demo)**: God Mode con bots (URL `#demo`), 5 quests/día, toasts de feed, sonido WebAudio. `PlayerState` se normaliza al cargar (`normalizePlayer` en `src/lib/storage.ts`): los datos viejos de IndexedDB nunca rompen.
- **Fase 1 — combate táctico** (`src/lib/rpg.ts`): motor por turnos puro (atacar/hechizo/defender/ítem/EX/huir), debilidades ocultas por raza (ONE MORE), MP con regen, gauge EX y evolución por clase; `BattleModal.tsx` reemplaza a `CombatModal.tsx`; pestaña **Personaje** (`CharacterPanel.tsx`) con stats derivadas; raid semanal = jefe con HP compartido vía mensajes `raidHit` (mensajes = estado) y recompensa aura solo contribuyentes; shop ampliado (armaduras/reliquias/pociones/auras) con inventario.
- **Fase 2 — personalización** (`src/lib/prefs.ts`): 8 intereses (chips 2-3) en el onboarding que viajan al prompt de `/api/quests` (+ guardrail de seguridad); botón **Regenerar** (2/día, contador por fecha) y **Bajar rango** (`rankEasy` → `rankBias -1`; reliquia de la Ambición lo sube). God mode suma **autopilot** de quests, **revelar debilidades** y **forzar rango**.
- Detalles y próximos pasos en `docs/ROADMAP.md`.
