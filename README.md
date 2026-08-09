# ⚡ SystemIRL — El Sistema

> **Tu vida real, convertida en RPG.** Un agente de IA ("El Sistema") te asigna quests diarias de entrenamiento, hábitos y finanzas. Completa misiones, gana XP y sube de nivel — **en tiempo real con tu party** gracias a Portal.

[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=Vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Portal](https://img.shields.io/badge/Portal-3DDAD7?style=for-the-badge&logo=websocket&logoColor=black)](https://useportal.co)

Proyecto para **The Realtime Hackathon by Portal** (7–9 ago 2026). Equipo **Ragnarok**.

---

## 🎮 Qué hace

- **Quests diarias con IA**: El Sistema genera cada día 3 quests personalizadas (Gemini) según tu historial, nivel y racha. Si la API falla, hay fallback offline.
- **XP, niveles y stats**: Completar quests suma XP a 4 stats (Strength, Intelligence, Vitality, Gold), sube tu nivel y mantiene una racha (streak) diaria.
- **Party en vivo (Portal)**: únete a un canal de party y ve en tiempo real quién está online, el leaderboard de niveles y la actividad de tus amigos. Cuando alguien sube de nivel, toda la party lo ve al instante.
- **Raid semanal**: un objetivo grupal que cualquiera puede completar y se celebra en vivo.

## 🔮 Cómo se usó Portal (requisito de entrega)

Portal es el corazón del modo multiplayer:

1. **Canales en tiempo real** — Cada party es un canal `party-<código>` (definido en [`portal.config.ts`](portal.config.ts)). Todos los miembros comparten un stream secuenciado de mensajes a través de un único WebSocket, manejado por el SDK `@portalsdk/react` (`useChannel`).
2. **Presencia** — Cada sesión publica su identidad como *presence metadata* (`{ name, level, xp, streak }` vía `setMetadata`). El **leaderboard se arma solo**: la app agrupa a los participantes presentes y los ordena por nivel/XP, sin backend y sin recargar. Al cerrar la pestaña, el jugador desaparece en vivo.
3. **Notificaciones de nivel en tiempo real** — Cuando completas una quest, tu cliente publica un mensaje `done`/`levelup` al canal; los demás miembros lo reciben y el feed de actividad lo anima al instante (nivel, raid, joins).
4. **Escalable sin infraestructura** — No hay servidor propio: el realtime, la presencia, el historial y el orden de mensajes los maneja la plataforma de Portal. Nuestro "backend" son dos serverless functions de Vercel (una para mintear la identidad si quisiéramos, otra para generar quests con Gemini).

## 🛠️ Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19 + Vite 8 + TypeScript (strict) |
| Tiempo real | **Portal** (`@portalsdk/core` + `@portalsdk/react`) |
| IA | Gemini / Kilo Gateway / OpenCode Zen (cualquiera con key; fallback offline) |
| Persistencia | IndexedDB (`idb-keyval`) — perfil, XP, quests del día |
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

**URL live:** https://systemirl.vercel.app

## 📁 Estructura

```
├── api/
│   ├── quests.ts         # Gemini: genera quests personalizadas (+ fallback)
│   └── portal-token.ts   # (opcional) mintéa identidad identificada con sk_
├── src/
│   ├── App.tsx           # orquestación: jugador, quests, party, modal level-up
│   ├── portal.ts         # cliente Portal (publishable key)
│   ├── lib/              # XP/niveles, IndexedDB, generación de quests
│   └── components/       # Onboarding, QuestList, StatsPanel, PartyPanel, LevelUp
├── portal.config.ts      # canales party-* (Portal)
└── docs/
    └── ROADMAP.md        # plan de ejecución + entregables
```

## 📋 Entregables

- **Pitch (280):** *"El Sistema convierte tu vida real en un RPG: un agente de IA te asigna quests diarias de entrenamiento, hábitos y finanzas; ganas XP, subes de nivel y tu party lo ve en vivo. IA + tiempo real con Portal."*
- **Demo (1:30):** [enlace] — ver guion en [`docs/DEMO.md`](docs/DEMO.md)

## 🔗 Enlaces

- Repo: https://github.com/MatiAlevMe/SystemIRL
- Live: https://systemirl.vercel.app
- Hackathon: [The Realtime Hackathon by Portal](https://hack.useportal.co)
