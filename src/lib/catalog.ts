// Catálogo del shop: títulos/colores/armas (deterministas, sin IA) + armaduras,
// reliquias, pociones y auras. Todo se paga con oro y se equipa/usar en el perfil.

export interface ShopItem {
  id: string;
  name: string;
  kind: "title" | "color" | "weapon" | "armor" | "trinket" | "aura" | "potion" | "music" | "boots" | "gem" | "lens";
  price: number;
  desc: string;
  color?: string;
  element?: string;
  hidden?: boolean;
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
    weakPct?: number;
  };
}

export const TITLES: ShopItem[] = [
  { id: "t-despertar", name: "El Despertar", kind: "title", price: 200, desc: "+3% XP ganada por quest.", bonus: { xpPct: 0.03 } },
  { id: "t-cazador", name: "Cazador de Niveles", kind: "title", price: 500, desc: "+5% de oro ganado.", bonus: { coinPct: 0.05 } },
  { id: "t-herrero", name: "Herrero de Sombras", kind: "title", price: 900, desc: "+5% de defensa.", bonus: { defPct: 0.05 } },
  { id: "t-monarca", name: "Monarca de la Torre", kind: "title", price: 1500, desc: "+10% de ataque.", bonus: { atkPct: 0.10 } },
  // Títulos de logro (no se compran; se otorgan solos).
  { id: "t-maestria", name: "Maestría de Elementos", kind: "title", price: 0, hidden: true, desc: "Los 5 elementos dominados. +15% de daño al golpear la debilidad.", bonus: { weakPct: 0.15 } },
  { id: "t-arena", name: "Gladiador del Sistema", kind: "title", price: 0, hidden: true, desc: "10 duelos 1v1 ganados. +5% XP ganada.", bonus: { xpPct: 0.05 } },
  { id: "t-torneo", name: "Campeón del Torneo", kind: "title", price: 0, hidden: true, desc: "Ganó un Torneo de 16. +10% de ataque.", bonus: { atkPct: 0.10 } },
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
  { id: "p-pocion", name: "Poción Menor", kind: "potion", price: 90, desc: "Restaura 30% HP en combate.", bonus: { hpPct: 0.30 } },
  { id: "p-eter", name: "Éter", kind: "potion", price: 100, desc: "Restaura 30% MP en combate.", bonus: { mpPct: 0.30 } },
  { id: "p-ex-menor", name: "Poción EX Menor", kind: "potion", price: 90, desc: "Carga 30% del gauge EX.", bonus: { ex: 30 } },
  { id: "p-elixir", name: "Elixir EX", kind: "potion", price: 140, desc: "Carga 50% del gauge EX.", bonus: { ex: 50 } },
  { id: "p-mayor", name: "Poción Mayor", kind: "potion", price: 240, desc: "Restaura 60% HP en combate.", bonus: { hpPct: 0.60 } },
  { id: "p-ex-mayor", name: "Poción EX Mayor", kind: "potion", price: 160, desc: "Carga 60% del gauge EX.", bonus: { ex: 60 } },
  { id: "p-ex-superior", name: "Poción EX Superior", kind: "potion", price: 240, desc: "Carga 85% del gauge EX.", bonus: { ex: 85 } },
];

// Auras pasivas: recompensas exclusivas del raid (no se compran).
export const RAID_AURAS: ShopItem[] = [
  { id: "u-aliento", name: "Aura del Aliento", kind: "aura", price: 0, desc: "+10% HP máximo.", bonus: { hpPct: 0.1 } },
  { id: "u-furia", name: "Aura de Furia", kind: "aura", price: 0, desc: "+10% de ataque.", bonus: { atkPct: 0.1 } },
  { id: "u-eco", name: "Aura del Eco", kind: "aura", price: 0, desc: "+5% de crítico.", bonus: { crit: 0.05 } },
];

export const BOOTS_ITEMS: ShopItem[] = [
  { id: "b-ligeras", name: "Botas Ligeras", kind: "boots", price: 250, desc: "+10 Agilidad.", bonus: { agi: 10 } },
  { id: "b-pesadas", name: "Botas Pesadas", kind: "boots", price: 300, desc: "+5 Defensa, -5 Agilidad.", bonus: { def: 5, agi: -5 } },
  { id: "b-viento", name: "Botas del Viento", kind: "boots", price: 750, desc: "+25 Agilidad.", bonus: { agi: 25 } },
];

export const GEM_ITEMS: ShopItem[] = [
  { id: "g-fuego", name: "Gema de Fuego", kind: "gem", price: 150, element: "fuego", desc: "Item de combate: 25 de daño de Fuego fijo a un enemigo (un solo uso).", bonus: { dmg: 25 } },
  { id: "g-hielo", name: "Gema de Hielo", kind: "gem", price: 150, element: "hielo", desc: "Item de combate: 25 de daño de Hielo fijo a un enemigo (un solo uso).", bonus: { dmg: 25 } },
  { id: "g-electrico", name: "Gema Eléctrica", kind: "gem", price: 150, element: "electrico", desc: "Item de combate: 25 de daño Eléctrico fijo a un enemigo (un solo uso).", bonus: { dmg: 25 } },
  { id: "g-sagrado", name: "Gema Sagrada", kind: "gem", price: 150, element: "sagrado", desc: "Item de combate: 25 de daño Sagrado fijo a un enemigo (un solo uso).", bonus: { dmg: 25 } },
  { id: "g-sombra", name: "Gema de Sombra", kind: "gem", price: 150, element: "sombra", desc: "Item de combate: 25 de daño de Sombra fijo a un enemigo (un solo uso).", bonus: { dmg: 25 } },
];

export const LENS_ITEM: ShopItem = {
  id: "item-lente",
  name: "Lente del Sistema",
  kind: "lens",
  price: 80,
  desc: "Item de combate: revela la debilidad de todos los enemigos por esta batalla (un solo uso).",
};

export const SHOP_ITEMS: ShopItem[] = [
  ...TITLES,
  ...COLORS,
  ...WEAPON_ITEMS,
  ...ARMOR_ITEMS,
  ...TRINKETS,
  ...POTIONS,
  ...MUSIC_ITEMS,
  ...BOOTS_ITEMS,
  ...GEM_ITEMS,
  LENS_ITEM,
];

export function itemById(id: string | null | undefined): ShopItem | undefined {
  if (!id) return undefined;
  return [...SHOP_ITEMS, ...RAID_AURAS].find((i) => i.id === id);
}

export function buyableInShop(item: ShopItem): boolean {
  return item.kind !== "aura";
}
