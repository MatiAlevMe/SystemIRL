// RPG layer: al completar una quest, "El Sistema" invoca un monstruo escalado a la
// dificultad. El combate es determinista (stats + nivel + arma + hechizo) y da oro
// y a veces un item. Sin assets: solo DOM/CSS.

import type { PlayerState, Quest, QuestDifficulty } from "../types";
import { xpProgress } from "./xp";
import { itemById, WEAPON_ITEMS, type ShopItem } from "./catalog";

export interface Monster {
  name: string;
  hp: number;
  coinsMin: number;
  coinsMax: number;
  dropChance: number;
}

export interface CombatResult {
  monster: Monster;
  victory: boolean;
  damage: number;
  coins: number;
  drop: ShopItem | null;
  spell: string | null;
}

const MONSTERS: Record<QuestDifficulty, Monster[]> = {
  F: [
    { name: "Lobo Gris", hp: 14, coinsMin: 10, coinsMax: 20, dropChance: 0.06 },
    { name: "Slime Oscuro", hp: 12, coinsMin: 8, coinsMax: 18, dropChance: 0.08 },
  ],
  E: [
    { name: "Esbirro del Sistema", hp: 22, coinsMin: 16, coinsMax: 30, dropChance: 0.1 },
    { name: "Cuervo Espectral", hp: 20, coinsMin: 14, coinsMax: 28, dropChance: 0.12 },
  ],
  D: [
    { name: "Guardia de Hierro", hp: 34, coinsMin: 28, coinsMax: 48, dropChance: 0.16 },
    { name: "Golem de Piedra", hp: 38, coinsMin: 30, coinsMax: 52, dropChance: 0.14 },
  ],
  C: [
    { name: "Caballero Corrupto", hp: 52, coinsMin: 45, coinsMax: 75, dropChance: 0.22 },
    { name: "Matriarca Arácnida", hp: 48, coinsMin: 42, coinsMax: 70, dropChance: 0.24 },
  ],
  B: [
    { name: "Jefe de Dungeon", hp: 80, coinsMin: 80, coinsMax: 130, dropChance: 0.35 },
    { name: "Reina Sombría", hp: 88, coinsMin: 90, coinsMax: 140, dropChance: 0.38 },
  ],
};

const SPELL_POOL = [
  "Espada de Luz",
  "Escudo de Sombras",
  "Látigo de Fuego",
  "Maná Tormenta",
  "Golpe del Dragón",
  "Explosión Arcano",
];

const SPELL_DMG = 18;
const SPELL_CHANCE = 0.4;

// God mode: flags sticky para que la demo sea reproducible.
let forceWin = false;
let forceSpell = false;

export function setForceWin(v: boolean): void {
  forceWin = v;
}
export function setForceSpell(v: boolean): void {
  forceSpell = v;
}

export function pickMonster(difficulty: QuestDifficulty): Monster {
  const pool = MONSTERS[difficulty] ?? MONSTERS.F;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function resolveCombat(player: PlayerState, quest: Quest): CombatResult {
  const monster = pickMonster(quest.difficulty);
  const { level } = xpProgress(player.xp);
  const stat = player.stats[quest.category] ?? 0;
  const weapon = player.weapon ? itemById(player.weapon) : undefined;

  let damage = 12 + level * 3 + Math.floor(stat / 6) + (weapon?.bonus?.dmg ?? 0);
  let spell: string | null = null;
  if (forceSpell || Math.random() < SPELL_CHANCE) {
    spell = SPELL_POOL[Math.floor(Math.random() * SPELL_POOL.length)];
    damage += SPELL_DMG;
  }

  const victory = forceWin || damage >= monster.hp;
  const coins = victory
    ? monster.coinsMin + Math.floor(Math.random() * (monster.coinsMax - monster.coinsMin + 1))
    : 0;

  let drop: ShopItem | null = null;
  if (victory && Math.random() < monster.dropChance) {
    const pool = WEAPON_ITEMS.filter((w) => !player.owned.includes(w.id));
    const choice = pool[Math.floor(Math.random() * pool.length)];
    if (choice) drop = choice;
  }

  return { monster, victory, damage, coins, drop, spell };
}
