# ⚡ SystemIRL — El Sistema

> **Tu vida real, convertida en RPG.** Un agente de IA ("El Sistema") te asigna quests diarias de entrenamiento, hábitos y finanzas. Completa misiones, gana XP y sube de nivel — **en tiempo real con tu party** gracias a Portal.

[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=Vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Portal](https://img.shields.io/badge/Portal-3DDAD7?style=for-the-badge&logo=websocket&logoColor=black)](https://useportal.co)

https://github.com/user-attachments/assets/23f62132-5be8-4b20-97c9-f4e850367226

Proyecto para **The Realtime Hackathon by Portal** (7–9 ago 2026). Desarrollo individual por **nightstar73**.

---

## 🎮 Qué hace

- **Quests diarias con IA (6/día)**: El Sistema genera cada día **6 quests** personalizadas (Gemini, con fallback a Kilo/Zen y a un pool offline). En el onboarding eliges **intereses** (gimnasio, lectura, finanzas…) y las quests se alinean a ellos; puedes **regenerar** hasta 2 veces por día (preserva las ya completadas) o bajar el rango de dificultad.
- **RPG con combate táctico ATB-lite**: Completar quests dispara un **combate por turnos** con orden por agilidad. Atacas, lanzas hechizos (elementos con debilidades ocultas → ONE MORE), defiendes, gastas MP y acumulas el **gauge EX** (hasta nivel 99 con +3% de efectividad por nivel). La victoria da **oro**, dropea armas, y daña al jefe de tu piso en **La Torre del Sistema**.
- **Clases y evolución**: elige clase (Guerrero/Guardia/Sabio/Cazador), cambiala en el shop, y evoluciona. Cada clase tiene **agilidad propia**, **Raid Skill** exclusiva (pasiva global + activa) y elemento de magia predeterminado.
- **Shop**: gastá tu oro en títulos (con pasivas de XP/oro/ataque), colores, armas, armaduras, reliquias, **pociones porcentuales** (cura 30% HP) y auras de raid. Lo que equipás se ve en el perfil y el leaderboard.
- **Party en vivo (Portal)**: únete a un canal de party y ve en tiempo real quién está online, el leaderboard de niveles, la actividad de tus amigos y la **raid semanal**: un jefe con HP compartido entre toda la party.
- **Raid semanal ISO (lunes–domingo)**: jefes por tier (T1: 1200 HP → T5: 5000 HP) con HP compartido. Se reinicia cada semana ISO; el tier máximo disponible lo desbloquea tu **Raid Skill**. El botón de pelea se **deshabilita tras derrotarlo** hasta el próximo lunes. Completar la meta diaria hace **3.5% de daño porcentual** al jefe (1×/jugador/día; cap de daño pasivo acumulado por tier).
- **La Torre del Sistema (100+ pisos)**: generación procedural infinita con escalado de dificultad, recompensas acumulativas y jefes únicos.
- **Arena de Entrenamiento**: combates 1v1 (2/día) y Torneo de 16 participantes (1/día) contra bots de la party.

## 🔮 Cómo se usó Portal (requisito de entrega)

Portal es el corazón del modo multiplayer. Todo lo que se ve en vivo —presencia, feed, toasts, raid grupal— corre sobre un canal de Portal por party:

1. **Canales en tiempo real** — Cada party es un canal `party-<código>` (definido en [`portal.config.ts`](portal.config.ts)). Todos los miembros comparten un stream secuenciado de mensajes a través de un único WebSocket, manejado por `@portalsdk/react`:

   ```tsx
   // App.tsx — un solo hook conecta toda la sala
   const party = useChannel<PartyMessage>({
     channelId: partyCode ? `party-${partyCode}` : undefined,
     history: 40,
   });

   // Publicar actividad de la party (sin backend)
   void party.send({ content: { kind: "done", name, quest: q.title } });
   ```

2. **Presencia → leaderboard sin servidor** — Cada sesión publica su identidad como *presence metadata* con `setMetadata({ name, level, xp, streak, title, color })`. El leaderboard **se arma solo**: agrupa a los participantes presentes y los ordena por nivel/XP. Al cerrar la pestaña, el jugador desaparece en vivo.

   ```tsx
   party.setMetadata({ name: player.name, level, xp: player.xp, streak: player.streak });
   ```

3. **Notificaciones en tiempo real** — Completar una quest publica `done`/`levelup` al canal; la party lo recibe y lo muestra como toast desde cualquier pestaña, además del feed de actividad (nivel, raid, joins, bots de la demo).

4. **Raid con progreso grupal** — los mensajes `raidHit` del canal son el **estado del jefe**: cada golpe suma daño compartido en vivo (con regeneración si nadie golpea en 24h) y el feed muestra quién pegó. Completar la meta diaria aplica **3.5% de daño porcentual** al jefe (1×/jugador/día; limitado por cap de daño pasivo según el tier). La recompensa (aura) es exclusiva de quienes contribuyeron.

5. **Escalable sin infraestructura** — No hay servidor propio: el realtime, la presencia, el historial y el orden de mensajes los maneja la plataforma de Portal. Nuestro "backend" son dos serverless functions de Vercel (una para mintear la identidad si quisiéramos, otra para generar quests con IA).

```
flujo realtime (sin backend propio):
  jugador ──setMetadata──▶ canal party-<código> ──▶ leaderboard (presencia)
  jugador ──send(done/levelup/raid)──▶ canal      ──▶ feed + toasts en la party
```

> **God mode (demo)**: con `#demo` al final de la URL se activa un panel de demo con bots de party (clientes de Portal propios, con presencia real), **autopilot** de quests, +XP, level-up forzado, oro, control de la Torre, **forzar rango**, **revelar debilidades** en combate y toggles de IA. Ideal para grabar el video sin depender de otra persona.

## 🛠️ Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19 + Vite 8 + TypeScript (strict) |
| Tiempo real | **Portal** (`@portalsdk/core` + `@portalsdk/react`) |
| IA | Gemini / Kilo Gateway / OpenCode Zen (cualquiera con key; fallback offline) |
| RPG | Combate + loot + shop + La Torre (client-side, sin assets) |
| Persistencia | IndexedDB (`idb-keyval`) — perfil, XP, quests del día, items, torre |
| Deploy | Vercel (SPA + serverless functions `api/*.ts`) |

## ⚙️ Setup local

### Requisitos
- Node.js ≥ 20
- Cuenta en [Portal](https://hack.useportal.co) y una **publishable key** (`pk_...`)
- (Opcional) una **API key de Gemini** en [aistudio.google.com](https://aistudio.google.com/apikey) para quests generadas por IA

### Pasos
```bash
git clone https://github.com/MatiAlevMe/SystemIRL.git
cd SystemIRL
npm install
cp .env.template .env   # completa tus keys
npm run dev             # http://localhost:5173
```

La app funciona sin Gemini (usa el pool offline) y sin tokens identificados (modo anónimo de Portal, cero backend).

### Variables de entorno (`.env.template`)
```env
# Navegador (segura de exponer)
VITE_PORTAL_PUBLISHABLE_KEY=pk_...
# Server-side (solo en Vercel / CLI)
PORTAL_SECRET=sk_...
GEMINI_API_KEY=...            # IA para quests (modelos free: gemini-3.6-flash)
QUEST_PROVIDER=auto           # auto | gemini | kilo | zen (auto = el que tenga key)
KILO_API_KEY=...              # (opcional) Kilo Gateway free ~200 req/hr
ZEN_API_KEY=...               # (opcional) OpenCode Zen free (big-pickle, deepseek-v4-flash-free)
```

> La generación de quests intenta los proveedores en orden (`gemini` → `kilo` → `zen`), y si ninguno responde cae a un pool offline. Con configurar **una** key la IA ya funciona.

> **Seguridad**: las keys reales viven en las variables de entorno de Vercel, nunca en el repo. `.env` está en `.gitignore`.

## ☁️ Deploy a Vercel

1. Importa el repo `MatiAlevMe/SystemIRL` en [vercel.com/new](https://vercel.com/new) (Vercel detecta Vite solo).
2. En **Settings → Environment Variables** agrega:
   - `VITE_PORTAL_PUBLISHABLE_KEY` (valor `pk_...`)
   - `GEMINI_API_KEY` (opcional)
   - `PORTAL_SECRET` (opcional, solo si usas `/api/portal-token`)
3. Deploy. Cada push a `main` despliega automáticamente.
4. (Opcional) Desplegar la config de canales:
   ```bash
   export PORTAL_SECRET=sk_...
   npm run portal:deploy   # npx @portalsdk/cli deploy
   ```

**URL live:** https://system-irl.vercel.app

## 📁 Estructura

```
├── api/
│   ├── quests.ts         # Gemini: genera quests personalizadas (+ fallback, tags, rango)
│   └── portal-token.ts   # (opcional) mintéa identidad identificada con sk_
├── src/
│   ├── App.tsx           # orquestación: jugador, quests, party, combate, modales
│   ├── portal.ts         # cliente Portal (publishable key)
│   ├── lib/              # XP/niveles, IndexedDB, quests, prefs, combate, shop, torre, sonido, bots
│   └── components/       # Onboarding, QuestList, StatsPanel, CharacterPanel, PartyPanel,
│                         # ShopPanel, TowerPanel, BattleModal, LevelUp, DemoPanel (god mode)
├── portal.config.ts      # canales party-* (Portal)
└── docs/
    ├── ROADMAP.md        # plan de ejecución + entregables
    └── DEMO.md           # guion del video de la demo
```

## 📋 Entregables

- **Pitch (280):** *"Tu vida real convertida en RPG: un agente de IA te asigna quests diarias de entrenamiento y hábitos. Completá misiones, derrotá monstruos, subí de nivel y tu party lo celebra en vivo con Portal. IA + tiempo real, sin infraestructura."*
- **Demo (1:30):** [enlace] — ver guion en [`docs/DEMO.md`](docs/DEMO.md)

## 🔗 Enlaces de interés

- 🚀 Deploy: https://system-irl.vercel.app
- 🎬 Demo: https://youtu.be/abEFfYC2CoM
- 🌐 The Realtime Hackathon by Portal (2026): https://hack.useportal.co
