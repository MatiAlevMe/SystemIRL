import type { PlayerState } from "../types";
import { COLORS, SHOP_ITEMS, TITLES, WEAPON_ITEMS, type ShopItem } from "../lib/catalog";

interface Props {
  player: PlayerState;
  onBuy: (item: ShopItem) => void;
  onEquip: (item: ShopItem) => void;
}

function equippedId(player: PlayerState, kind: ShopItem["kind"]): string | null {
  if (kind === "title") return player.title;
  if (kind === "color") return player.color;
  if (kind === "weapon") return player.weapon;
  return null;
}

function ItemCard({
  item,
  player,
  onBuy,
  onEquip,
}: {
  item: ShopItem;
  player: PlayerState;
  onBuy: (item: ShopItem) => void;
  onEquip: (item: ShopItem) => void;
}) {
  const owned = player.owned.includes(item.id);
  const equipped = equippedId(player, item.kind) === item.id;
  const affordable = player.coins >= item.price;

  return (
    <article className={`shop-item ${owned ? "owned" : ""} ${equipped ? "equipped" : ""}`}>
      <div className="shop-item-top">
        <span className="shop-item-name" style={item.color ? { color: item.color } : undefined}>
          {item.name}
        </span>
        {item.kind === "color" && item.color && (
          <span className="shop-swatch" style={{ background: item.color }} />
        )}
      </div>
      <p className="shop-item-desc">{item.desc}</p>
      {item.bonus && (
        <div className="shop-item-bonus">
          {item.bonus.dmg ? `+${item.bonus.dmg} dmg` : ""}
          {item.bonus.dmg && item.bonus.xpPct ? " · " : ""}
          {item.bonus.xpPct ? `+${Math.round(item.bonus.xpPct * 100)}% XP` : ""}
        </div>
      )}
      <div className="shop-item-bottom">
        <span className="shop-item-price">💰 {item.price}</span>
        {!owned ? (
          <button className="shop-btn" disabled={!affordable} onClick={() => onBuy(item)}>
            {affordable ? "Comprar" : "Sin oro"}
          </button>
        ) : equipped ? (
          <span className="shop-btn equipped">✓ Equipado</span>
        ) : (
          <button className="shop-btn equip" onClick={() => onEquip(item)}>
            Equipar
          </button>
        )}
      </div>
    </article>
  );
}

export default function ShopPanel({ player, onBuy, onEquip }: Props) {
  const sections: Array<{ label: string; items: ShopItem[] }> = [
    { label: "Títulos", items: TITLES },
    { label: "Colores de perfil", items: COLORS },
    { label: "Armas", items: WEAPON_ITEMS },
  ];

  return (
    <section className="shop">
      <div className="section-head">
        <h2>Shop del Sistema</h2>
        <span className="quest-source gemini">💰 {player.coins} oro</span>
      </div>
      {SHOP_ITEMS.length === 0 && <p className="empty">El shop está cerrado por mantenimiento.</p>}
      {sections.map((s) => (
        <div className="shop-section" key={s.label}>
          <h3>{s.label}</h3>
          <div className="shop-grid">
            {s.items.map((item) => (
              <ItemCard key={item.id} item={item} player={player} onBuy={onBuy} onEquip={onEquip} />
            ))}
          </div>
        </div>
      ))}
      <p className="panel-note">
        El oro se gana derrotando monstruos al completar quests. Lo que equipas se ve en tu perfil y en la party.
      </p>
    </section>
  );
}
