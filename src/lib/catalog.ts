// Catálogo del shop: títulos/colores/armas (deterministas, sin IA) + armaduras,
// reliquias, pociones y auras. Todo se paga con oro y se equipa/usar en el perfil.

export interface ShopItem {
  id: string;
  name: string;
  kind: "title" | "color" | "weapon" | "armor" | "trinket" | "aura" | "potion" | "music" | "boots" | "gem" | "lens";
  price: number;
  desc: string;
  color?: string;
  bonus?: {
    xpPct?: number;
    dmg?: number;
    def?: number;
    hp?: number;
    mp?: number;
    ex?: number;
    crit?: number;
    hpPct?: number;
    mpPct?: number;
    atkPct?: number;
    defPct?: number;
    coinPct?: number;
    dropPct?: number;
    agi?: number;
    exRegenPct?: number;
    energy?: number;
    raidAttempts?: number;
    rankBias?: number;
  };
}

export const TITLES: ShopItem[] = [
  { id: "t-despertar", name: "El Despertar", kind: "title", price: 200, desc: "El primer título del Sistema." },
  { id: "t-cazador", name: "Cazador de Niveles", kind: "title", price: 500, desc: "Subes de nivel a diario." },
  { id: "t-herrero", name: "Herrero de Sombras", kind: "title", price: 900, desc: "Forja tu propio camino." },
  { id: "t-monarca", name: "Monarca de la Torre", kind: "title", price: 1500, desc: "Solo los que escalan lo logran." },
];

export const COLORS: ShopItem[] = [
  { id: "c-cian", name: "Cian del Sistema", kind: "color", price: 120, color: "#3ddad7", desc: "Color de arranque." },
  { id: "c-azul", name: "Azul Arcano", kind: "color", price: 300, color: "#4f7cff", desc: "Energía arcana." },
  { id: "c-oro", name: "Oro del Rey", kind: "color", price: 600, color: "#ffd166", desc: "Un nombre digno de leyenda." },
  { id: "c-llama", name: "Llama Carmesí", kind: "color", price: 1000, color: "#ff4f7b", desc: "Tu nombre arde." },
];

export const WEAPON_ITEMS: ShopItem[] = [
  { id: "w-daga", name: "Daga de Iniciado", kind: "weapon", price: 80, desc: "+2 de daño.", bonus: { dmg: 2 } },
  { id: "w-espada", name: "Espada de Sombras", kind: "weapon", price: 450, desc: "+5 de daño.", bonus: { dmg: 5 } },
  { id: "w-cuchillas", name: "Cuchillas del Cazador", kind: "weapon", price: 850, desc: "+10 de daño.", bonus: { dmg: 10 } },
  { id: "w-llave", name: "Llave del Destino", kind: "weapon", price: 1400, desc: "+15 de daño y +10% XP.", bonus: { dmg: 15, xpPct: 0.1 } },
];

export const MUSIC_ITEMS: ShopItem[] = [
  {
    id: "mus-abismo",
    name: "Banda Sonora del Abismo",
    kind: "music",
    price: 800,
    desc: "Pista premium del Sistema: más tenue, más profunda. Toca en todo el juego.",
  },
];

export const ARMOR_ITEMS: ShopItem[] = [
  { id: "a-cuero", name: "Armadura de Cuero", kind: "armor", price: 220, desc: "+3 de defensa.", bonus: { def: 3 } },
  { id: "a-malla", name: "Cota de Malla", kind: "armor", price: 500, desc: "+6 de defensa.", bonus: { def: 6 } },
  { id: "a-placas", name: "Placas del Sistema", kind: "armor", price: 950, desc: "+10 de defensa.", bonus: { def: 10 } },
  { id: "a-monarca", name: "Armadura de Monarca", kind: "armor", price: 1600, desc: "+15 de defensa y +20 HP.", bonus: { def: 15, hp: 20 } },
];

export const TRINKETS: ShopItem[] = [
  { id: "rk-suerte", name: "Amuleto de la Suerte", kind: "trinket", price: 400, desc: "+5% de crítico.", bonus: { crit: 0.05 } },
  { id: "rk-mana", name: "Orbe de Maná", kind: "trinket", price: 450, desc: "+10 de maná máximo.", bonus: { mp: 10 } },
  { id: "rk-ambicion", name: "Reliquia de Ambición", kind: "trinket", price: 700, desc: "Las quests tienden a rangos más altos.", bonus: { rankBias: 1 } },
  { id: "rk-cazador", name: "Foco del Cazador", kind: "trinket", price: 900, desc: "+8% de crítico.", bonus: { crit: 0.08 } },
];

export const POTIONS: ShopItem[] = [
  { id: "p-pocion", name: "Poción Menor", kind: "potion", price: 90, desc: "Restaura 30 HP en combate.", bonus: { hp: 30 } },
  { id: "p-eter", name: "Éter", kind: "potion", price: 100, desc: "Restaura 15 MP en combate.", bonus: { mp: 15 } },
  { id: "p-elixir", name: "Elixir EX", kind: "potion", price: 140, desc: "Carga 50 del gauge EX.", bonus: { ex: 50 } },
  { id: "p-mayor", name: "Poción Mayor", kind: "potion", price: 240, desc: "Restaura 80 HP en combate.", bonus: { hp: 80 } },
];

// Auras pasivas: recompensas exclusivas del raid (no se compran).
export const RAID_AURAS: ShopItem[] = [
  { id: "u-aliento", name: "Aura del Aliento", kind: "aura", price: 0, desc: "+10% HP máximo.", bonus: { hpPct: 0.1 } },
  { id: "u-furia", name: "Aura de Furia", kind: "aura", price: 0, desc: "+10% de ataque.", bonus: { atkPct: 0.1 } },
  { id: "u-eco", name: "Aura del Eco", kind: "aura", price: 0, desc: "+5% de crítico.", bonus: { crit: 0.05 } },
];

export const SHOP_ITEMS: ShopItem[] = [...TITLES, ...COLORS, ...WEAPON_ITEMS, ...ARMOR_ITEMS, ...TRINKETS, ...POTIONS, ...MUSIC_ITEMS];

export function itemById(id: string | null | undefined): ShopItem | undefined {
  if (!id) return undefined;
  return [...SHOP_ITEMS, ...RAID_AURAS].find((i) => i.id === id);
}

export function buyableInShop(item: ShopItem): boolean {
  return item.kind !== "aura";
}
