// Música ambiente generativa con WebAudio (sin assets): un pad de acordes con
// scheduler lookahead. Master gain bajo y notas graves: "menos es más". El
// master gain controla el mute (persistido en localStorage). Los navegadores
// exigen una interacción previa: `startMusic()` se llama en el primer click.

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let timer: number | null = null;
let chordIdx = 0;
let nextTime = 0;
let mode: "base" | "raid" | "premium" = "base";

const CHORD_DUR = 6;
const MASTER_GAIN = 0.28;

// Progresiones menores, graves y lentas (vibe Persona 4, no ruidoso).
// Base: Am → Em → Dm → E. Sutil y ominosa.
const BASE_CHORDS: number[][] = [
  [110.0, 164.81, 196.0, 220.0], // Am2 (bajo profundo)
  [82.41, 123.47, 164.81, 196.0], // Em (E grave)
  [73.42, 110.0, 146.83, 174.61], // Dm
  [82.41, 123.47, 164.81, 207.65], // E
];

// Raid: un peldaño más tenso, mismo registro grave.
const RAID_CHORDS: number[][] = [
  [92.5, 138.59, 174.61, 233.08], // Bbm
  [82.41, 123.47, 164.81, 220.0], // Em
  [87.31, 130.81, 174.61, 207.65], // Fm
  [92.5, 138.59, 184.0, 246.94], // Bm
];

// Premium (comprable en shop): aún más tenue, respira más, casi ambience.
const PREMIUM_CHORDS: number[][] = [
  [110.0, 130.81, 164.81, 196.0], // Am9 (abierto)
  [87.31, 130.81, 174.61, 207.65], // Fmaj7
  [82.41, 123.47, 146.83, 174.61], // Dm
  [98.0, 130.81, 164.81, 196.0], // G
];

function ensure(): void {
  if (ctx) return;
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
  } catch {
    ctx = null;
    master = null;
  }
}

export type MusicMode = "base" | "raid" | "premium";

export function setMusicMode(m: MusicMode): void {
  mode = m;
}

export function isMusicOn(): boolean {
  return typeof localStorage !== "undefined" ? localStorage.getItem("musicOn") !== "0" : true;
}

function padTone(freq: number, start: number, dur: number, gain: number, type: OscillatorType): void {
  if (!ctx || !master) return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, start);
  g.gain.linearRampToValueAtTime(gain, start + dur * 0.25);
  g.gain.linearRampToValueAtTime(0.0001, start + dur);
  osc.connect(g);
  g.connect(master);
  osc.start(start);
  osc.stop(start + dur + 0.1);
}

function scheduleChord(chords: number[][], start: number, dur: number): void {
  const chord = chords[chordIdx % chords.length];
  chordIdx++;
  // Solo bajo + un tono: sin stack de triángulos, nada de frecuencias altas.
  padTone(chord[0] / 2, start, dur, 0.16, "sine"); // sub bajo
  padTone(chord[1], start, dur, 0.05, "sine"); // fundamental
  padTone(chord[3] / 2, start, dur, 0.03, "triangle"); // color grave
}

function tick(): void {
  if (!ctx) return;
  const horizon = ctx.currentTime + 0.5;
  while (nextTime < horizon) {
    scheduleChord(mode === "raid" ? RAID_CHORDS : mode === "premium" ? PREMIUM_CHORDS : BASE_CHORDS, nextTime, CHORD_DUR);
    nextTime += CHORD_DUR;
  }
}

function startScheduler(): void {
  if (timer !== null) return;
  timer = window.setInterval(tick, 200);
}

// Llama en la primera interacción del usuario (requisito de AudioContext).
export function startMusic(): void {
  ensure();
  if (!ctx || !master) return;
  if (ctx.state === "suspended") void ctx.resume();
  nextTime = ctx.currentTime + 0.1;
  startScheduler();
  master.gain.value = isMusicOn() ? MASTER_GAIN : 0;
}

export function toggleMusic(): boolean {
  ensure();
  if (!ctx || !master) return isMusicOn();
  if (ctx.state === "suspended") void ctx.resume();
  startScheduler();
  const on = master.gain.value === 0;
  const t = ctx.currentTime;
  master.gain.cancelScheduledValues(t);
  master.gain.setTargetAtTime(on ? MASTER_GAIN : 0, t, 0.3);
  localStorage.setItem("musicOn", on ? "1" : "0");
  return on;
}
