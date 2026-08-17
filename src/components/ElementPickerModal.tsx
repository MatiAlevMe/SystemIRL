import { ELEMENT_ICON, MAGIC_ELEMENTS } from "../lib/rpg";

interface Props {
  ownedElements: string[];
  onPick: (element: string) => void;
}

export default function ElementPickerModal({ ownedElements, onPick }: Props) {
  const available = MAGIC_ELEMENTS.filter((e) => !ownedElements.includes(e));

  return (
    <div className="modal-backdrop">
      <div className="levelup-modal" onClick={(e) => e.stopPropagation()}>
        <div className="levelup-glow" />
        <div className="levelup-kicker">EVOLUCIÓN</div>
        <div className="levelup-title">El Sistema te ofrece un nuevo elemento</div>
        <p>
          Elegí un elemento para desbloquear su hechizo activo. Los demás se desbloquean en los pisos
          10, 25 y 50 de la Torre.
        </p>
        <div className="evo-element-grid">
          {available.map((el) => (
            <button key={el} className="evo-element-card" onClick={() => onPick(el)}>
              <span className="evo-element-icon">{ELEMENT_ICON[el]}</span>
              <span className="evo-element-name">{el}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
