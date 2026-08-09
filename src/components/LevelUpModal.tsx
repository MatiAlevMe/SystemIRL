import { useEffect } from "react";

interface Props {
  level: number;
  onClose: () => void;
}

export default function LevelUpModal({ level, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="levelup-modal" onClick={(e) => e.stopPropagation()}>
        <div className="levelup-glow" />
        <div className="levelup-kicker">NIVEL ALCANZADO</div>
        <div className="levelup-number">{level}</div>
        <div className="levelup-title">El Sistema reconoce tu poder</div>
        <p>Tus stats aumentan. La party ya fue notificada en tiempo real.</p>
        <button className="primary-btn" onClick={onClose} autoFocus>
          Continuar ▸
        </button>
      </div>
    </div>
  );
}
