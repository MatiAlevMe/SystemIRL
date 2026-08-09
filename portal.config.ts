import { defineConfig } from "@portalsdk/config";

export default defineConfig({
  channels: {
    // Una party es un canal: party-<codigo>. Todos comparten la misma sala.
    "party-*": {
      anonymous: true,
      // Cada mensaje de party queda en el historial para late-joiners.
      // El leaderboard se arma desde presence metadata (name/level/xp).
    },
  },
});
