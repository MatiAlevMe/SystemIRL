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

- **Post-MVP (Refinamientos & Endgame)**:
  - **Fase 1 (Agilidad y Turnos)**: Motor por turnos ATB-lite basado en `agility`, tope de velocidad de bosses (1.4×) y equipamiento de Botas.
  - **Fase 2 (EX 99 & Raid Skill)**: Escalado de habilidad EX hasta nivel 99 e hitos pasivos (10/25/50/75/99). Sistema de Raid Skills (L1-LMAX/Suprema) por clase.
  - **Fase 3 (Pociones % & Títulos)**: Pociones de restauración porcentual en combate y títulos equipables con pasivas de XP, oro, ataque y defensa.
  - **Fase 4 (Torre Procedural)**: Torre de 100+ pisos generados procedimentalmente con escalado infinito y recompensas acumulativas.
  - **Fase 5 (Elementos & Gemas)**: Hechizos filtrados por elementos desbloqueados mediante Gemas Elementales en la tienda.
  - **Fase 6 (Raid Semanal ISO)**: Ciclo semanal atado a la semana calendario ISO (lunes-domingo). Botón de combate deshabilitado tras la derrota del jefe y meta diaria con daño pasivo porcentual acotado por tier.
  - **Fase 7 (Quests 6/día)**: Grilla de 6 quests diarias y regeneración que preserva únicamente las quests no completadas.
  - **Fase 8 (Arena de Entrenamiento)**: Pestaña de Arena para duelos 1v1 (2 energía/día) y Torneo de 16 gladiadores (1 energía/día).
- Detalles y próximos pasos en `docs/ROADMAP.md`.
