import { useState } from "react";
import { CLASS_ICON, CLASS_LABEL, type PlayerClass, type PlayerState } from "../types";
import {
  ARMOR_ITEMS,
  COLORS,
  POTIONS,
  RAID_AURAS,
  SHOP_ITEMS,
  TITLES,
  TRINKETS,
  WEAPON_ITEMS,
  type ShopItem,
} from "../lib/catalog";
import { xpProgress } from "../lib/xp";

interface Props {
  player: PlayerState;
  onBuy: (item: ShopItem) => void;
  onEquip: (item: ShopItem) => void;
  onChangeClass: (cls: PlayerClass) => void;
}

const CLASS_ORDER: PlayerClass[] = ["guerrero", "guardia", "sabio", "cazador"];

function equippedId(player: PlayerState, kind: ShopItem["kind"]): string | null {
  if (kind === "title") return player.title;
  if (kind === "color") return player.color;
  if (kind === "weapon") return player.weapon;
  if (kind === "armor") return player.armor;
  if (kind === "trinket") return player.trinket;
  if (kind === "aura") return player.aura;
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
  const count = player.inventory[item.id] ?? 0;
  const equipped = equippedId(player, item.kind) === item.id;
  const affordable = player.coins >= item.price;

  return (
    <article className={`shop-item ${owned || count > 0 ? "owned" : ""} ${equipped ? "equipped" : ""}`}>
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
          {item.bonus.def ? `+${item.bonus.def} def` : ""}
          {item.bonus.hp ? `+${item.bonus.hp} HP` : ""}
          {item.bonus.mp ? `+${item.bonus.mp} MP` : ""}
          {item.bonus.crit ? `+${Math.round(item.bonus.crit * 100)}% crítico` : ""}
          {item.bonus.hpPct ? `+${Math.round(item.bonus.hpPct * 100)}% HP` : ""}
          {item.bonus.atkPct ? `+${Math.round(item.bonus.atkPct * 100)}% ataque` : ""}
          {item.bonus.xpPct ? `+${Math.round(item.bonus.xpPct * 100)}% XP` : ""}
          {item.bonus.ex ? `EX +${item.bonus.ex}` : ""}
        </div>
      )}
      <div className="shop-item-bottom">
        <span className="shop-item-price">💰 {item.price}</span>
        {item.kind === "potion" ? (
          count > 0 ? (
            <span className="shop-btn equipped">×{count}</span>
          ) : (
            <button className="shop-btn" disabled={!affordable} onClick={() => onBuy(item)}>
              {affordable ? "Comprar" : "Sin oro"}
            </button>
          )
        ) : item.kind === "aura" ? (
          <span className="shop-btn equipped">{owned ? "✓ Obtenida" : "Raid"}</span>
        ) : !owned ? (
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

export default function ShopPanel({ player, onBuy, onEquip, onChangeClass }: Props) {
  const [confirmClass, setConfirmClass] = useState<PlayerClass | null>(null);
  const { level } = xpProgress(player.xp);
  const classCost = 1000 + level * 200;

  const sections: Array<{ label: string; items: ShopItem[] }> = [
    { label: "Títulos", items: TITLES },
    { label: "Colores de perfil", items: COLORS },
    { label: "Armas", items: WEAPON_ITEMS },
    { label: "Armaduras", items: ARMOR_ITEMS },
    { label: "Reliquias", items: TRINKETS },
    { label: "Pociones", items: POTIONS },
    { label: "Auras de raid", items: RAID_AURAS },
  ];

  return (
    <section className="shop">
      <div className="section-head">
        <h2>Shop del Sistema</h2>
        <span className="quest-source gemini">💰 {player.coins} oro</span>
      </div>

      <div className="shop-section">
        <h3>Cambiar de clase</h3>
        <div className="class-change-grid">
          {CLASS_ORDER.map((cls) => {
            const active = player.cls === cls;
            return (
              <div className={`class-change-card ${active ? "active" : ""}`} key={cls}>
                <span className="class-change-icon">{CLASS_ICON[cls]}</span>
                <span className="class-change-name">{CLASS_LABEL[cls]}</span>
                {active ? (
                  <span className="shop-btn equipped">✓ Activa</span>
                ) : (
                  <button
                    className="shop-btn"
                    disabled={player.coins < classCost}
                    onClick={() => setConfirmClass(cls)}
                  >
                    {player.coins < classCost ? `Faltan 💰${classCost - player.coins}` : `Cambiar (💰${classCost})`}
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <p className="panel-note">Cambiar de clase cuesta 1000 + nivel × 200. Tu EX reinicia.</p>
      </div>

      {confirmClass && (
        <div className="modal-backdrop" onClick={() => setConfirmClass(null)}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>
              ¿Cambiar a {CLASS_ICON[confirmClass]} {CLASS_LABEL[confirmClass]}?
            </h3>
            <p>Cuesta 💰{classCost}. Tu clase multiplica stats y determina tu habilidad EX.</p>
            <div className="confirm-actions">
              <button className="ghost-btn" onClick={() => setConfirmClass(null)}>
                Cancelar
              </button>
              <button
                className="primary-btn"
                onClick={() => {
                  onChangeClass(confirmClass);
                  setConfirmClass(null);
                }}
              >
                Cambiar ▸
              </button>
            </div>
          </div>
        </div>
      )}

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
        El oro se gana en combate y quests. Lo que equipas se ve en tu perfil y en la party. Las pociones se usan en
        batalla.
      </p>
    </section>
  );
}
