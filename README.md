# ⚡ SystemIRL — El Sistema

> **Tu vida real, convertida en RPG.** Un agente de IA ("El Sistema") te asigna quests diarias de entrenamiento, hábitos y finanzas. Completa misiones, gana XP y sube de nivel — **en tiempo real con tu party** gracias a Portal.

[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=Vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Portal](https://img.shields.io/badge/Portal-3DDAD7?style=for-the-badge&logo=websocket&logoColor=black)](https://useportal.co)

Proyecto para **The Realtime Hackathon by Portal** (7–9 ago 2026). Equipo **Ragnarok**.

---

## 🎮 Qué hace

- **Quests diarias con IA**: El Sistema genera cada día 5 quests personalizadas (Gemini, con fallback a Kilo/Zen y a un pool offline) según tu historial, nivel y racha.
- **XP, niveles, stats y RPG**: Completar quests dispara un **combate** contra un monstruo escalado a la dificultad (daño según tus stats y tu arma). La victoria da **oro**, a veces dropea armas, y cada quest daña al jefe de tu piso en **La Torre del Sistema**.
- **Shop**: gastá tu oro en títulos, colores de perfil y armas que potencian tu daño y tu XP. Lo que equipás se ve en tu perfil y en el leaderboard de la party.
- **Party en vivo (Portal)**: únete a un canal de party y ve en tiempo real quién está online, el leaderboard de niveles, la actividad de tus amigos (incluso como toasts desde cualquier pestaña) y la **raid semanal** con progreso grupal.
- **Raid semanal**: un objetivo grupal con barra de progreso compartida; cuando alguien la completa, toda la party lo ve y el contador sube en vivo.

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

4. **Raid con progreso grupal** — los mensajes `raid` del canal se agrupan por nombre y semana: cada miembro ve cuántos jugadores ya completaron la raid y la barra de progreso avanza en vivo.

5. **Escalable sin infraestructura** — No hay servidor propio: el realtime, la presencia, el historial y el orden de mensajes los maneja la plataforma de Portal. Nuestro "backend" son dos serverless functions de Vercel (una para mintear la identidad si quisiéramos, otra para generar quests con IA).

```
flujo realtime (sin backend propio):
  jugador ──setMetadata──▶ canal party-<código> ──▶ leaderboard (presencia)
  jugador ──send(done/levelup/raid)──▶ canal      ──▶ feed + toasts en la party
```

> **God mode (demo)**: con `#demo` al final de la URL se activa un panel de demo con bots de party (clientes de Portal propios, con presencia real), +XP, level-up forzado, oro, control de la Torre y toggles de combate. Ideal para grabar el video sin depender de otra persona.

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
│   ├── quests.ts         # Gemini: genera quests personalizadas (+ fallback)
│   └── portal-token.ts   # (opcional) mintéa identidad identificada con sk_
├── src/
│   ├── App.tsx           # orquestación: jugador, quests, party, combate, modales
│   ├── portal.ts         # cliente Portal (publishable key)
│   ├── lib/              # XP/niveles, IndexedDB, quests, combate, shop, torre, sonido, bots
│   └── components/       # Onboarding, QuestList, StatsPanel, PartyPanel, ShopPanel,
│                         # TowerPanel, CombatModal, LevelUp, DemoPanel (god mode)
├── portal.config.ts      # canales party-* (Portal)
└── docs/
    └── ROADMAP.md        # plan de ejecución + entregables
```

## 📋 Entregables

- **Pitch (280):** *"Tu vida real convertida en RPG: un agente de IA te asigna quests diarias de entrenamiento, hábitos y finanzas. Completá misiones, derrotá monstruos, subí de nivel y tu party lo celebra en vivo con Portal. IA + tiempo real, sin infraestructura."*
- **Demo (1:30):** [enlace] — ver guion en [`docs/DEMO.md`](docs/DEMO.md)

## 🔗 Enlaces

- Repo: https://github.com/MatiAlevMe/SystemIRL
- Live: https://system-irl.vercel.app
- Hackathon: [The Realtime Hackathon by Portal](https://hack.useportal.co)
