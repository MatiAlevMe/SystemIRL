// Catálogo fijo del shop (determinista, sin IA — ideal para la demo).
// títulos/colores/armas se compran con oro y se equipan en el perfil.

export interface ShopItem {
  id: string;
  name: string;
  kind: "title" | "color" | "weapon";
  price: number;
  desc: string;
  color?: string;
  bonus?: { xpPct?: number; dmg?: number };
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
  { id: "w-daga", name: "Daga de Iniciado", kind: "weapon", price: 150, desc: "+2 de daño por quest.", bonus: { dmg: 2 } },
  { id: "w-espada", name: "Espada de Sombras", kind: "weapon", price: 450, desc: "+5 de daño.", bonus: { dmg: 5 } },
  { id: "w-cuchillas", name: "Cuchillas del Cazador", kind: "weapon", price: 850, desc: "+10 de daño.", bonus: { dmg: 10 } },
  { id: "w-llave", name: "Llave del Destino", kind: "weapon", price: 1400, desc: "+15 de daño y +10% XP.", bonus: { dmg: 15, xpPct: 0.1 } },
];

export const SHOP_ITEMS: ShopItem[] = [...TITLES, ...COLORS, ...WEAPON_ITEMS];

export function itemById(id: string | null | undefined): ShopItem | undefined {
  if (!id) return undefined;
  return SHOP_ITEMS.find((i) => i.id === id);
}
