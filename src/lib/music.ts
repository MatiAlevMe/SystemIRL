// Música ambiente generativa con WebAudio (sin assets): un pad de acordes con
// scheduler lookahead. El master gain controla el mute (persistido en localStorage).
// Los navegadores exigen una interacción previa: `startMusic()` se llama en el
// primer click/tecla de la app.

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let timer: number | null = null;
let chordIdx = 0;
let nextTime = 0;
let mode: "base" | "raid" = "base";

const CHORD_DUR = 4;

// Progresiones: base (cálida) y raid (más tensa, la pista premium).
const BASE_CHORDS: number[][] = [
  [220.0, 261.63, 329.63, 392.0], // Am
  [174.61, 220.0, 261.63, 349.23], // F
  [196.0, 246.94, 293.66, 392.0], // G
  [164.81, 207.65, 246.94, 329.63], // Em
];

const RAID_CHORDS: number[][] = [
  [233.08, 277.18, 349.23, 466.16], // Bbm
  [207.65, 246.94, 311.13, 415.3], // G#m
  [220.0, 261.63, 329.63, 392.0], // Am
  [246.94, 293.66, 369.99, 493.88], // Bm
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

export function setMusicMode(m: "base" | "raid"): void {
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
  g.gain.linearRampToValueAtTime(gain, start + dur * 0.2);
  g.gain.linearRampToValueAtTime(0.0001, start + dur);
  osc.connect(g);
  g.connect(master);
  osc.start(start);
  osc.stop(start + dur + 0.1);
}

function scheduleChord(chords: number[][], start: number, dur: number): void {
  const chord = chords[chordIdx % chords.length];
  chordIdx++;
  padTone(chord[0] / 2, start, dur, 0.13, "sine"); // bajo
  chord.forEach((f) => padTone(f, start, dur, 0.045, "triangle"));
}

function tick(): void {
  if (!ctx) return;
  const horizon = ctx.currentTime + 0.5;
  while (nextTime < horizon) {
    scheduleChord(mode === "raid" ? RAID_CHORDS : BASE_CHORDS, nextTime, CHORD_DUR);
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
  master.gain.value = isMusicOn() ? 0.5 : 0;
}

export function toggleMusic(): boolean {
  ensure();
  if (!ctx || !master) return isMusicOn();
  if (ctx.state === "suspended") void ctx.resume();
  startScheduler();
  const on = master.gain.value === 0;
  const t = ctx.currentTime;
  master.gain.cancelScheduledValues(t);
  master.gain.setTargetAtTime(on ? 0.5 : 0, t, 0.3);
  localStorage.setItem("musicOn", on ? "1" : "0");
  return on;
}
