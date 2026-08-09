// RPG layer — Fase 1: combate táctico por turnos.
// El Sistema te enfrenta a monstruos escalados. Acciones: Atacar / Hechizo /
// Defender / Ítem / EX / Huir. Las debilidades de raza están ocultas y se revelan
// al golpear (One More), el MP se regenera cada turno y el gauge EX carga con la
// pelea. No hay auto-heal tras la batalla: las curas vienen de quests, pociones
// y level-up (restaura todo). Sin assets: solo DOM/CSS.

import type { PlayerClass, PlayerState, Quest, QuestCategory, QuestDifficulty } from "../types";
import { CLASS_ICON } from "../types";
import { xpProgress } from "./xp";
import { itemById, WEAPON_ITEMS, type ShopItem } from "./catalog";
import { CLASS_BALANCE, BOSS_SPEED_CAP_MULT } from "./balance";

// ---- La Torre del Sistema ------------------------------------
// Pisos con jefe: completar quests daña al jefe del piso actual; al caer,
// recompensa en oro y subes un piso.

export interface TowerFloor {
  floor: number;
  name: string;
  boss: string;
  hp: number;
  reward: number;
}

const TOWER_NAMES = [
  "Cámara del Olvido",
  "Corredor de Sombras",
  "Sala de los Susurros",
  "Puente de Cenizas",
  "Abismo Arcano",
  "Santuario de Titanio",
  "Cima de la Torre",
];

const TOWER_BOSSES = [
  "Guardián Roto",
  "Espectro del Vacío",
  "Bruja del Eco",
  "Caballero de Ceniza",
  "Gólem Arcano",
  "Monarca del Sistema",
];

export function floorInfo(floor: number): TowerFloor {
  const nameIdx = (floor - 1) % TOWER_NAMES.length;
  const bossIdx = (floor - 1) % TOWER_BOSSES.length;
  const hp = Math.round(40 * Math.pow(1 + 0.35 * (floor - 1), 1.4));
  const reward = Math.round(60 * Math.pow(1 + 0.25 * (floor - 1), 1.2));

  return {
    floor,
    name: `${TOWER_NAMES[nameIdx]} — Nivel ${floor}`,
    boss: `${TOWER_BOSSES[bossIdx]} ${floor > 5 ? `(Rango ${Math.floor(floor / 5)})` : ""}`.trim(),
    hp,
    reward,
  };
}

export interface TowerResult {
  floor: number;
  damage: number;
  coins: number;
  reward: number;
  cleared: boolean;
  conquered: boolean;
}

function towerDamage(player: PlayerState, quest: Quest): number {
  const { level } = xpProgress(player.xp);
  const stat = player.stats[quest.category] ?? 0;
  const weapon = itemById(player.weapon);
  return 6 + level * 2 + Math.floor(stat / 10) + (weapon?.bonus?.dmg ?? 0) * 2;
}

export function advanceTower(player: PlayerState, quest: Quest): TowerResult {
  const info = floorInfo(player.tower.floor);
  if (!info) {
    return { floor: player.tower.floor, damage: player.tower.damage, coins: 0, reward: 0, cleared: false, conquered: false };
  }
  let damage = player.tower.damage + towerDamage(player, quest);
  let floor = player.tower.floor;
  let coins = 0;
  let reward = 0;
  let cleared = false;
  let conquered = false;

  if (damage >= info.hp) {
    const nextInfo = floorInfo(floor + 1);
    if (nextInfo) {
      floor += 1;
      damage = 0;
      coins = info.reward;
      reward = info.reward;
      cleared = true;
    } else {
      damage = info.hp;
      conquered = true;
    }
  }
  return { floor, damage, coins, reward, cleared, conquered };
}

// Oro que da completar una quest en la vida real (el oro ya no viene del auto-combate).
const QUEST_COINS: Record<QuestDifficulty, number> = { F: 5, E: 8, D: 12, C: 18, B: 25 };

export function questCoins(difficulty: QuestDifficulty): number {
  return QUEST_COINS[difficulty];
}

export function grindDifficulty(floor: number): QuestDifficulty {
  if (floor >= 5) return "B";
  if (floor === 4) return "C";
  if (floor === 3) return "D";
  if (floor === 2) return "E";
  return "F";
}

// ---- Elementos y razas ----------------------------------------
export type Element = "fisico" | "fuego" | "hielo" | "electrico" | "sagrado" | "sombra";
export type Race = "bestia" | "no-muerto" | "demonio" | "constructo" | "cazador";

export const ELEMENT_ICON: Record<Element, string> = {
  fisico: "⚔️",
  fuego: "🔥",
  hielo: "❄️",
  electrico: "⚡",
  sagrado: "✨",
  sombra: "🌑",
};

// Debilidad = x1.6 · resistencia = x0.6. La debilidad se revela al golpear.
export const RACE_WEAKNESS: Record<Race, Element> = {
  bestia: "fuego",
  "no-muerto": "sagrado",
  demonio: "sagrado",
  constructo: "electrico",
  cazador: "fisico",
};

export const RACE_RESIST: Record<Race, Element> = {
  bestia: "hielo",
  "no-muerto": "sombra",
  demonio: "fuego",
  constructo: "fisico",
  cazador: "sagrado",
};

const WEAK_MULT = 1.6;
const RESIST_MULT = 0.6;
const MP_REGEN = 3;
const EX_MAX_LEVEL = 5;

export function exLevelFor(exXp: number): number {
  return Math.min(EX_MAX_LEVEL, 1 + Math.floor(exXp / 40));
}

export function classEvolved(player: PlayerState): boolean {
  return xpProgress(player.xp).level >= 5 || player.tower.floor >= 4;
}

// ---- Hechizos --------------------------------------------------
export interface Spell {
  id: string;
  name: string;
  element: Element;
  level: number;
  cost: number;
  dmg?: number;
  heal?: number;
}

export const SPELLS: Spell[] = [
  { id: "sp-fuego", name: "Bola de Fuego", element: "fuego", level: 2, cost: 5, dmg: 22 },
  { id: "sp-rayo", name: "Rayo", element: "electrico", level: 3, cost: 6, dmg: 26 },
  { id: "sp-cura", name: "Cura", element: "sagrado", level: 4, cost: 5, heal: 25 },
  { id: "sp-hielo", name: "Lanza de Hielo", element: "hielo", level: 5, cost: 8, dmg: 30 },
  { id: "sp-sombra", name: "Colmillo de Sombra", element: "sombra", level: 7, cost: 9, dmg: 32 },
  { id: "sp-sagrada", name: "Explosión Sagrada", element: "sagrado", level: 9, cost: 11, dmg: 38 },
];

export function spellsFor(level: number, unlockedElements?: string[]): Spell[] {
  return SPELLS.filter((s) => {
    if (level < s.level) return false;
    if (!unlockedElements || unlockedElements.length === 0) return true;
    return unlockedElements.includes(s.element);
  });
}

// ---- Habilidades EX por clase ---------------------------------
export interface ExSkill {
  cls: PlayerClass;
  name: string;
  icon: string;
  desc: string;
  kind: "attack" | "guard" | "heal" | "multi";
  dmg?: number;
  healPct?: number;
}

export const EX_SKILLS: Record<PlayerClass, ExSkill> = {
  guerrero: { cls: "guerrero", name: "Filo del Sistema", icon: "⚔️", kind: "attack", dmg: 3, desc: "Golpe físico 3× tu ataque." },
  guardia: { cls: "guardia", name: "Muro del Sistema", icon: "🛡️", kind: "guard", desc: "La party recibe -70% de daño este turno." },
  sabio: { cls: "sabio", name: "Luz del Sistema", icon: "✨", kind: "heal", healPct: 0.6, desc: "Cura 60% del HP máximo de toda la party." },
  cazador: { cls: "cazador", name: "Aluvión del Sistema", icon: "🏹", kind: "multi", dmg: 1, desc: "3 impactos a todos los enemigos." },
};

// ---- Stats derivadas ------------------------------------------
export interface CombatStats {
  maxHp: number;
  maxMp: number;
  atk: number;
  def: number;
  crit: number;
  magic: number;
  agility: number;
}

export function combatStats(p: PlayerState): CombatStats {
  const { level } = xpProgress(p.xp);
  const weapon = itemById(p.weapon);
  const armor = itemById(p.armor);
  const trinket = itemById(p.trinket);
  const aura = itemById(p.aura);
  const boots = itemById(p.boots);
  const s = p.stats;

  let maxHp = 50 + s.vitality * 2 + level * 10;
  let maxMp = 25 + s.intelligence * 1.5 + level * 4;
  let atk = 10 + s.strength * 1.5 + level * 3 + (weapon?.bonus?.dmg ?? 0);
  let def = 5 + s.vitality * 0.5 + level * 2 + (armor?.bonus?.def ?? 0);
  let crit = 0.05 + p.coins * 0.002 + (trinket?.bonus?.crit ?? 0);
  const magic = s.intelligence * 0.5;

  let agility = (p.agility ?? 45) + level + (boots?.bonus?.agi ?? 0);

  if (p.cls === "guerrero") atk *= 1.2;
  if (p.cls === "guardia") {
    maxHp *= 1.25;
    def *= 1.2;
  }
  if (p.cls === "sabio") maxMp *= 1.3;
  if (p.cls === "cazador") crit *= 1.5;

  maxHp += armor?.bonus?.hp ?? 0;
  maxMp += trinket?.bonus?.mp ?? 0;
  maxHp += maxHp * (aura?.bonus?.hpPct ?? 0);
  atk += atk * (aura?.bonus?.atkPct ?? 0);
  crit += aura?.bonus?.crit ?? 0;

  return {
    maxHp: Math.round(maxHp),
    maxMp: Math.round(maxMp),
    atk: Math.round(atk),
    def: Math.round(def),
    crit: Math.min(0.5, crit),
    magic: Math.round(magic),
    agility: Math.round(agility),
  };
}

// Curas fuera del combate.
export const RANK_HP: Record<QuestDifficulty, number> = { F: 10, E: 15, D: 20, C: 25, B: 30 };

export function healFromQuest(player: PlayerState, difficulty: QuestDifficulty): PlayerState {
  const { maxHp } = combatStats(player);
  const amount = RANK_HP[difficulty];
  return { ...player, battle: { ...player.battle, hp: Math.min(maxHp, player.battle.hp + amount) } };
}

export function restoreFull(player: PlayerState): PlayerState {
  const { maxHp, maxMp } = combatStats(player);
  return { ...player, battle: { ...player.battle, hp: maxHp, mp: maxMp } };
}

// ---- Enemigos --------------------------------------------------
export interface Enemy {
  id: string;
  name: string;
  race: Race;
  attackElement: Element;
  icon: string;
  hp: number;
  atk: number;
  def: number;
  coinsMin: number;
  coinsMax: number;
  exXp: number;
  dropChance: number;
  isBoss?: boolean;
}

export const GRIND_MONSTERS: Record<QuestDifficulty, Enemy[]> = {
  F: [
    { id: "f-lobo", name: "Lobo Gris", race: "bestia", attackElement: "fisico", icon: "🐺", hp: 16, atk: 6, def: 2, coinsMin: 10, coinsMax: 20, exXp: 2, dropChance: 0.06 },
    { id: "f-slime", name: "Slime Oscuro", race: "no-muerto", attackElement: "sombra", icon: "🟣", hp: 14, atk: 5, def: 1, coinsMin: 8, coinsMax: 18, exXp: 2, dropChance: 0.08 },
  ],
  E: [
    { id: "e-esbirro", name: "Esbirro del Sistema", race: "constructo", attackElement: "fisico", icon: "🗿", hp: 24, atk: 9, def: 3, coinsMin: 16, coinsMax: 30, exXp: 3, dropChance: 0.1 },
    { id: "e-cuervo", name: "Cuervo Espectral", race: "no-muerto", attackElement: "sombra", icon: "🐦", hp: 22, atk: 8, def: 2, coinsMin: 14, coinsMax: 28, exXp: 3, dropChance: 0.12 },
  ],
  D: [
    { id: "d-guardia", name: "Guardia de Hierro", race: "constructo", attackElement: "fisico", icon: "🛡️", hp: 36, atk: 13, def: 5, coinsMin: 28, coinsMax: 48, exXp: 5, dropChance: 0.16 },
    { id: "d-golem", name: "Golem de Piedra", race: "constructo", attackElement: "fisico", icon: "🗿", hp: 40, atk: 12, def: 6, coinsMin: 30, coinsMax: 52, exXp: 5, dropChance: 0.14 },
  ],
  C: [
    { id: "c-caballero", name: "Caballero Corrupto", race: "no-muerto", attackElement: "sombra", icon: "⚔️", hp: 56, atk: 18, def: 7, coinsMin: 45, coinsMax: 75, exXp: 8, dropChance: 0.22 },
    { id: "c-matrona", name: "Matriarca Arácnida", race: "bestia", attackElement: "fisico", icon: "🕷️", hp: 52, atk: 17, def: 5, coinsMin: 42, coinsMax: 70, exXp: 8, dropChance: 0.24 },
  ],
  B: [
    { id: "b-jefe", name: "Jefe de Dungeon", race: "demonio", attackElement: "fuego", icon: "👹", hp: 90, atk: 26, def: 9, coinsMin: 80, coinsMax: 130, exXp: 12, dropChance: 0.35 },
    { id: "b-reina", name: "Reina Sombría", race: "no-muerto", attackElement: "sombra", icon: "👑", hp: 96, atk: 25, def: 8, coinsMin: 90, coinsMax: 140, exXp: 12, dropChance: 0.38 },
  ],
};

export function pickEnemy(difficulty: QuestDifficulty): Enemy {
  const pool = GRIND_MONSTERS[difficulty] ?? GRIND_MONSTERS.F;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function pickEnemies(difficulty: QuestDifficulty, count: number): Enemy[] {
  const out: Enemy[] = [];
  for (let i = 0; i < count; i++) {
    const e = pickEnemy(difficulty);
    out.push({ ...e, id: `${e.id}-${i}` });
  }
  return out;
}

const FLOOR_RACES: Race[] = ["bestia", "no-muerto", "demonio", "constructo", "cazador"];

export function bossEnemyForFloor(info: TowerFloor, hp?: number): Enemy {
  const race = FLOOR_RACES[(info.floor - 1) % FLOOR_RACES.length];
  return {
    id: `boss-f${info.floor}`,
    name: info.boss,
    race,
    attackElement: "fisico",
    icon: "💀",
    hp: hp ?? info.hp,
    atk: 8 + info.floor * 5,
    def: 2 + info.floor * 2,
    coinsMin: Math.round(info.reward * 0.5),
    coinsMax: Math.round(info.reward * 0.8),
    exXp: 10 + info.floor * 5,
    dropChance: 0.4,
    isBoss: true,
  };
}

export const RAID_BOSS_HP = 500;
export const RAID_BOSS_NAME = "Monarca de la Colmena";

export function raidBossEnemy(currentHp: number): Enemy {
  return {
    id: "raid-boss",
    name: RAID_BOSS_NAME,
    race: "demonio",
    attackElement: "fuego",
    icon: "👹",
    hp: Math.max(1, currentHp),
    atk: 32,
    def: 10,
    coinsMin: 150,
    coinsMax: 300,
    exXp: 40,
    dropChance: 0.5,
    isBoss: true,
  };
}

// ---- Estado de batalla ----------------------------------------
export interface Member {
  id: string;
  name: string;
  icon: string;
  cls: PlayerClass;
  isBot: boolean;
  level: number;
  maxHp: number;
  hp: number;
  maxMp: number;
  mp: number;
  atk: number;
  def: number;
  crit: number;
  magic: number;
  gauge: number;
  defending: boolean;
  evolved: boolean;
  agility: number;
  agenda: number;
}

export interface EnemyState {
  id: string;
  name: string;
  race: Race;
  attackElement: Element;
  icon: string;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  coins: number;
  exXp: number;
  dropChance: number;
  isBoss: boolean;
  revealed: Element[];
}

export interface LogEntry {
  id: number;
  kind: "player" | "enemy" | "system" | "crit" | "weak" | "ex" | "heal";
  text: string;
}

export type BattleMode = "grind" | "boss" | "raid";
export type BattleOutcome = "victory" | "defeat" | "fled";

export interface BattleState {
  id: string;
  mode: BattleMode;
  party: Member[];
  enemies: EnemyState[];
  log: LogEntry[];
  turn: number;
  phase: "player" | "enemy";
  oneMore: boolean;
  shield: boolean;
  result: BattleOutcome | null;
  damageDealt: number;
  usedItems: string[];
}

export interface BattleResult {
  victory: boolean;
  fled: boolean;
  coins: number;
  drop: ShopItem | null;
  exXpGained: number;
  damageDealt: number;
}

export type BattleAction =
  | { type: "attack"; target: string }
  | { type: "spell"; spellId: string; target: string }
  | { type: "defend" }
  | { type: "item"; itemId: string }
  | { type: "ex"; target: string }
  | { type: "flee" };

export function buildParty(player: PlayerState, bots: Array<{ name: string; cls: PlayerClass; level: number }> = []): Member[] {
  const cs = combatStats(player);
  const level = xpProgress(player.xp).level;
  const team: Member[] = [
    {
      id: "player",
      name: player.name,
      icon: CLASS_ICON[player.cls],
      cls: player.cls,
      isBot: false,
      level,
      maxHp: cs.maxHp,
      hp: Math.min(cs.maxHp, player.battle.hp),
      maxMp: cs.maxMp,
      mp: Math.min(cs.maxMp, player.battle.mp),
      atk: cs.atk,
      def: cs.def,
      crit: cs.crit,
      magic: cs.magic,
      gauge: 0,
      defending: false,
      evolved: classEvolved(player),
      agility: cs.agility,
      agenda: 0,
    },
  ];
  for (const b of bots) {
    const baseAgi = CLASS_BALANCE[b.cls]?.baseAgility ?? 45;
    team.push({
      id: `bot-${b.name}`,
      name: b.name,
      icon: CLASS_ICON[b.cls],
      cls: b.cls,
      isBot: true,
      level: b.level,
      maxHp: 40 + b.level * 10,
      hp: 40 + b.level * 10,
      maxMp: 20 + b.level * 3,
      mp: 20 + b.level * 3,
      atk: 8 + b.level * 3,
      def: 3 + b.level * 2,
      crit: 0.05,
      magic: Math.round(4 + b.level * 1.5),
      gauge: 0,
      defending: false,
      evolved: b.level >= 5,
      agility: baseAgi + b.level,
      agenda: 0,
    });
  }
  return team;
}

export function buildBattle(mode: BattleMode, enemies: Enemy[], party: Member[]): BattleState {
  return {
    id: `b-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
    mode,
    party,
    enemies: enemies.map((e) => ({
      id: e.id,
      name: e.name,
      race: e.race,
      attackElement: e.attackElement,
      icon: e.icon,
      hp: e.hp,
      maxHp: e.hp,
      atk: e.atk,
      def: e.def,
      coins: e.coinsMin + Math.floor(Math.random() * (e.coinsMax - e.coinsMin + 1)),
      exXp: e.exXp,
      dropChance: e.dropChance,
      isBoss: !!e.isBoss,
      revealed: [],
    })),
    log: [],
    turn: 1,
    phase: "player",
    oneMore: false,
    shield: false,
    result: null,
    damageDealt: 0,
    usedItems: [],
  };
}

export function startGrindBattle(player: PlayerState, floor: number): BattleState {
  const count = 2 + Math.floor(Math.random() * 2); // 2-3 enemigos
  return buildBattle("grind", pickEnemies(grindDifficulty(floor), count), buildParty(player));
}

export function startBossBattle(player: PlayerState): BattleState {
  const info = floorInfo(player.tower.floor);
  if (!info) return startGrindBattle(player, 1);
  const remaining = Math.max(1, info.hp - player.tower.damage);
  return buildBattle("boss", [bossEnemyForFloor(info, remaining)], buildParty(player));
}

export function startRaidBattle(
  player: PlayerState,
  currentHp: number,
  bots: Array<{ name: string; cls: PlayerClass; level: number }> = [],
): BattleState {
  return buildBattle("raid", [raidBossEnemy(currentHp)], buildParty(player, bots));
}

// ---- Motor de combate ------------------------------------------
function clone<T>(o: T): T {
  return structuredClone(o);
}

function rand(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function pushLog(s: BattleState, kind: LogEntry["kind"], text: string): void {
  s.log.push({ id: s.log.length, kind, text });
}

function livingEnemies(s: BattleState): EnemyState[] {
  return s.enemies.filter((e) => e.hp > 0);
}

function livingParty(s: BattleState): Member[] {
  return s.party.filter((m) => m.hp > 0);
}

function effMultiplier(enemy: EnemyState, element: Element): { mult: number; weak: boolean } {
  if (RACE_WEAKNESS[enemy.race] === element) {
    if (!enemy.revealed.includes(element)) enemy.revealed.push(element);
    return { mult: WEAK_MULT, weak: true };
  }
  if (RACE_RESIST[enemy.race] === element) return { mult: RESIST_MULT, weak: false };
  return { mult: 1, weak: false };
}

function hitEnemy(s: BattleState, attacker: Member, enemy: EnemyState, element: Element, baseDmg: number): { weak: boolean; crit: boolean } {
  const crit = Math.random() < attacker.crit;
  const { mult, weak } = effMultiplier(enemy, element);
  let dmg = (baseDmg - (element === "fisico" ? enemy.def : 0)) * mult;
  if (crit) dmg *= 2;
  dmg = Math.max(1, Math.round(dmg));
  enemy.hp = Math.max(0, enemy.hp - dmg);
  if (s.mode !== "grind") s.damageDealt += dmg;
  attacker.gauge = Math.min(100, attacker.gauge + 20);
  const tag = crit ? " ¡CRÍTICO!" : weak ? " ¡DÉBIL!" : "";
  pushLog(s, crit ? "crit" : weak ? "weak" : "player", `${attacker.name} golpeó a ${enemy.name}: -${dmg}${tag}`);
  if (enemy.hp <= 0) pushLog(s, "enemy", `💀 ${enemy.name} cayó.`);
  return { weak, crit };
}

function useItem(s: BattleState, p: Member, itemId: string): void {
  const item = itemById(itemId);
  if (!item || item.kind !== "potion") return;
  s.usedItems.push(item.id);
  const b = item.bonus ?? {};
  const parts: string[] = [];
  if (b.hpPct || b.hp) {
    const rawPct = b.hpPct ?? 0;
    const rawVal = b.hp ?? 0;
    const targetVal = rawPct > 0 ? Math.round(p.maxHp * rawPct) : rawVal;
    const amount = Math.min(targetVal, p.maxHp - p.hp);
    p.hp += amount;
    parts.push(`+${amount} HP`);
  }
  if (b.mpPct || b.mp) {
    const rawPct = b.mpPct ?? 0;
    const rawVal = b.mp ?? 0;
    const targetVal = rawPct > 0 ? Math.round(p.maxMp * rawPct) : rawVal;
    const amount = Math.min(targetVal, p.maxMp - p.mp);
    p.mp += amount;
    parts.push(`+${amount} MP`);
  }
  if (b.ex) {
    p.gauge = Math.min(100, p.gauge + Math.round(b.ex));
    parts.push(`EX +${b.ex}%`);
  }
  pushLog(s, "heal", `${p.name} usó ${item.name} (${parts.join(" · ")})`);
}

function useEx(s: BattleState, p: Member, ex: ExSkill, targetId?: string): void {
  const targets = livingEnemies(s);
  const target = targets.find((e) => e.id === targetId) ?? targets[0];
  p.gauge = 0;
  if (ex.kind === "attack") {
    if (target) hitEnemy(s, p, target, "fisico", p.atk * (ex.dmg ?? 1));
    pushLog(s, "ex", `⭐ ¡${ex.name}!`);
  } else if (ex.kind === "guard") {
    s.shield = true;
    pushLog(s, "ex", `🛡️ ¡${ex.name}! ${p.name} levanta el Muro del Sistema.`);
  } else if (ex.kind === "heal") {
    for (const m of s.party) {
      if (m.hp <= 0) continue;
      m.hp = Math.min(m.maxHp, m.hp + Math.round(m.maxHp * (ex.healPct ?? 0.5)));
    }
    pushLog(s, "heal", `✨ ¡${ex.name}! La party fue sanada.`);
  } else if (ex.kind === "multi") {
    for (const e of targets) {
      for (let i = 0; i < 3; i++) hitEnemy(s, p, e, "fisico", p.atk * (ex.dmg ?? 1));
    }
    pushLog(s, "ex", `🏹 ¡${ex.name}! ${targets.length} enemigo(s) alcanzado(s).`);
  }
}

function playerTurn(s: BattleState, action: BattleAction): { weakness: boolean } {
  const p = s.party[0];
  const enemies = livingEnemies(s);
  let weakness = false;

  switch (action.type) {
    case "attack": {
      const enemy = enemies.find((e) => e.id === action.target) ?? enemies[0];
      if (enemy) weakness = hitEnemy(s, p, enemy, "fisico", p.atk).weak;
      break;
    }
    case "spell": {
      const spell = SPELLS.find((sp) => sp.id === action.spellId);
      if (!spell) break;
      if (p.mp < spell.cost) {
        pushLog(s, "system", "No tienes MP suficiente.");
        break;
      }
      p.mp -= spell.cost;
      p.gauge = Math.min(100, p.gauge + 15);
      if (spell.heal) {
        const target = s.party.find((m) => m.id === action.target && m.hp > 0) ?? p;
        const amount = Math.round((spell.heal ?? 0) + p.magic * (p.cls === "sabio" ? 1.3 : 1));
        target.hp = Math.min(target.maxHp, target.hp + amount);
        pushLog(s, "heal", `${p.name} lanzó ${spell.name}: +${amount} HP a ${target.name}`);
      } else {
        const enemy = enemies.find((e) => e.id === action.target) ?? enemies[0];
        if (enemy) weakness = hitEnemy(s, p, enemy, spell.element, (spell.dmg ?? 0) + p.magic).weak;
      }
      break;
    }
    case "defend": {
      p.defending = true;
      p.gauge = Math.min(100, p.gauge + 15);
      pushLog(s, "player", `${p.name} se defiende.`);
      break;
    }
    case "item": {
      useItem(s, p, action.itemId);
      break;
    }
    case "ex": {
      useEx(s, p, EX_SKILLS[p.cls], action.target);
      break;
    }
    case "flee": {
      if (Math.random() < 0.5) {
        s.result = "fled";
        pushLog(s, "system", `${p.name} huyó de la batalla.`);
      } else {
        pushLog(s, "system", "No pudiste huir.");
        p.gauge = Math.min(100, p.gauge + 5);
      }
      break;
    }
  }
  return { weakness };
}

function autoAct(s: BattleState, bot: Member): void {
  const enemies = livingEnemies(s);
  if (enemies.length === 0) return;
  const low = bot.hp / bot.maxHp < 0.35;
  const healSpell = spellsFor(bot.level).find((sp) => sp.heal);

  if (bot.gauge >= 100) {
    useEx(s, bot, EX_SKILLS[bot.cls], enemies[0].id);
    return;
  }
  if (low && healSpell && bot.mp >= healSpell.cost) {
    bot.mp -= healSpell.cost;
    bot.gauge = Math.min(100, bot.gauge + 15);
    const amount = Math.round((healSpell.heal ?? 0) + bot.magic * (bot.cls === "sabio" ? 1.3 : 1));
    bot.hp = Math.min(bot.maxHp, bot.hp + amount);
    pushLog(s, "heal", `${bot.name} se curó con ${healSpell.name} (+${amount} HP)`);
    return;
  }
  if (low && Math.random() < 0.5) {
    bot.defending = true;
    bot.gauge = Math.min(100, bot.gauge + 15);
    pushLog(s, "player", `${bot.name} se defiende.`);
    return;
  }
  const known = enemies.find((e) => e.revealed.length > 0)?.revealed[0];
  if (known) {
    const sp = spellsFor(bot.level).find((x) => x.element === known && !x.heal && bot.mp >= x.cost);
    if (sp) {
      bot.mp -= sp.cost;
      bot.gauge = Math.min(100, bot.gauge + 15);
      hitEnemy(s, bot, enemies[0], sp.element, (sp.dmg ?? 0) + bot.magic);
      return;
    }
  }
  hitEnemy(s, bot, enemies[0], "fisico", bot.atk);
}

function enemyPhase(s: BattleState): void {
  for (const e of s.enemies) {
    if (e.hp <= 0) continue;
    const alive = livingParty(s);
    if (alive.length === 0) break;
    const target = alive[Math.floor(Math.random() * alive.length)];
    let dmg = e.atk - target.def + rand(0, 3);
    if (target.defending) dmg *= 0.5;
    if (s.shield) dmg *= 0.3;
    dmg = Math.max(1, Math.round(dmg));
    target.hp = Math.max(0, target.hp - dmg);
    target.gauge = Math.min(100, target.gauge + 10);
    pushLog(s, "enemy", `${e.icon} ${e.name} atacó a ${target.name}: -${dmg}`);
    if (target.hp <= 0) pushLog(s, "enemy", `💀 ${target.name} cayó.`);
  }
  for (const m of s.party) m.defending = false;
  s.shield = false;
}

function regenMp(s: BattleState): void {
  for (const m of s.party) {
    if (m.hp <= 0) continue;
    m.mp = Math.min(m.maxMp, m.mp + MP_REGEN);
  }
}

function buildResult(s: BattleState, kind: BattleOutcome): BattleResult {
  const dead = s.enemies.filter((e) => e.hp <= 0);
  const coins = dead.reduce((a, e) => a + e.coins, 0);
  const exXpGained = dead.reduce((a, e) => a + e.exXp, 0);
  let drop: ShopItem | null = null;
  if (kind === "victory") {
    const dropper = s.enemies.filter((e) => e.isBoss)[0] ?? dead[dead.length - 1];
    if (dropper && Math.random() < dropper.dropChance) {
      drop = WEAPON_ITEMS[Math.floor(Math.random() * WEAPON_ITEMS.length)] ?? null;
    }
  }
  return {
    victory: kind === "victory",
    fled: kind === "fled",
    coins,
    drop,
    exXpGained,
    damageDealt: s.damageDealt,
  };
}

// Una acción del jugador → avanza los turnos determinísticamente según agilidad (ATB-lite).
export function act(state: BattleState, action: BattleAction): { state: BattleState; result: BattleResult | null } {
  if (state.result) return { state, result: null };
  const s = clone(state);

  const aliveParty = livingParty(s);
  const minPartyAgi = aliveParty.length > 0 ? Math.min(...aliveParty.map((m) => m.agility)) : 40;
  const maxBossAgi = Math.round(minPartyAgi * BOSS_SPEED_CAP_MULT);

  const p = s.party[0];
  if (p && p.hp > 0) {
    const { weakness } = playerTurn(s, action);
    if (s.result === "fled") return { state: s, result: buildResult(s, "fled") };
    if (weakness && !s.oneMore) {
      s.oneMore = true;
      pushLog(s, "system", "✨ ¡ONE MORE! Tienes un turno extra.");
    } else {
      s.oneMore = false;
    }
  }

  for (const bot of s.party.slice(1)) {
    if (bot.hp > 0 && livingEnemies(s).length > 0) {
      autoAct(s, bot);
    }
  }

  if (livingEnemies(s).length === 0) {
    s.result = "victory";
    pushLog(s, "system", "🏆 ¡Victoria! El área ha sido purgada.");
    return { state: s, result: buildResult(s, "victory") };
  }

  for (const enemy of s.enemies) {
    if (enemy.isBoss && enemy.atk > 0) {
      const effAgi = Math.min(enemy.atk * 2, maxBossAgi);
      enemy.def = Math.max(enemy.def, Math.round(effAgi * 0.1));
    }
  }

  enemyPhase(s);
  regenMp(s);

  if (livingParty(s).length === 0) {
    s.result = "defeat";
    pushLog(s, "system", "💀 Tu party ha sido derrotada.");
    return { state: s, result: buildResult(s, "defeat") };
  }

  s.turn += 1;
  return { state: s, result: null };
}

// Aplica el resultado de la batalla al jugador guardado.
export function battlePersist(player: PlayerState, battle: BattleState, result: BattleResult): PlayerState {
  const inventory = { ...player.inventory };
  for (const id of battle.usedItems) {
    const n = (inventory[id] ?? 0) - 1;
    if (n <= 0) delete inventory[id];
    else inventory[id] = n;
  }
  const exXp = player.battle.exXp + result.exXpGained;
  const next: PlayerState = {
    ...player,
    coins: player.coins + result.coins,
    inventory,
    battle: {
      ...player.battle,
      exXp,
      exLevel: exLevelFor(exXp),
      hp: result.victory ? battle.party[0].hp : result.fled ? player.battle.hp : 1,
      mp: battle.party[0].mp,
      ex: 0,
    },
  };
  if (result.drop && !next.owned.includes(result.drop.id)) {
    next.owned = [...next.owned, result.drop.id];
  }
  return next;
}

export type { QuestCategory };
