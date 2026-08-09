// Sonidos con WebAudio (sin assets). Se crean con la primera interacción del usuario.

let ctx: AudioContext | null = null;

function ensureCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(c: AudioContext, freq: number, start: number, dur: number, type: OscillatorType = "sine", gain = 0.1): void {
  try {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, c.currentTime + start);
    g.gain.exponentialRampToValueAtTime(gain, c.currentTime + start + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + dur);
    osc.connect(g);
    g.connect(c.destination);
    osc.start(c.currentTime + start);
    osc.stop(c.currentTime + start + dur + 0.05);
  } catch {
    /* noop */
  }
}

export function playComplete(): void {
  const c = ensureCtx();
  if (!c) return;
  tone(c, 523.25, 0, 0.12);
  tone(c, 659.25, 0.09, 0.16);
}

export function playVictory(): void {
  const c = ensureCtx();
  if (!c) return;
  tone(c, 392, 0, 0.14, "triangle", 0.09);
  tone(c, 523.25, 0.1, 0.14, "triangle", 0.09);
  tone(c, 659.25, 0.2, 0.2, "triangle", 0.1);
}

export function playLevelUp(): void {
  const c = ensureCtx();
  if (!c) return;
  tone(c, 392, 0, 0.14, "triangle", 0.09);
  tone(c, 523.25, 0.12, 0.14, "triangle", 0.09);
  tone(c, 659.25, 0.24, 0.14, "triangle", 0.09);
  tone(c, 783.99, 0.36, 0.3, "triangle", 0.11);
}

export function playHit(): void {
  const c = ensureCtx();
  if (!c) return;
  tone(c, 220, 0, 0.08, "square", 0.06);
  tone(c, 180, 0.06, 0.1, "square", 0.05);
}

export function playDefeat(): void {
  const c = ensureCtx();
  if (!c) return;
  tone(c, 330, 0, 0.18, "sawtooth", 0.07);
  tone(c, 220, 0.18, 0.28, "sawtooth", 0.08);
  tone(c, 147, 0.4, 0.4, "sawtooth", 0.09);
}
