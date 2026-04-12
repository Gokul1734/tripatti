const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
let ctx: AudioContext | null = null;

function getCtx() {
  if (!ctx) ctx = new AudioCtx();
  return ctx;
}

function playTone(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.08) {
  try {
    const c = getCtx();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = volume;
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start();
    osc.stop(c.currentTime + duration);
  } catch {}
}

export const sounds = {
  tap: () => playTone(800, 0.06, 'sine', 0.05),
  success: () => {
    playTone(523, 0.1, 'sine', 0.06);
    setTimeout(() => playTone(659, 0.1, 'sine', 0.06), 80);
    setTimeout(() => playTone(784, 0.15, 'sine', 0.06), 160);
  },
  add: () => playTone(660, 0.12, 'sine', 0.06),
  remove: () => playTone(330, 0.15, 'sine', 0.04),
  navigate: () => playTone(600, 0.05, 'sine', 0.03),
  error: () => playTone(200, 0.2, 'triangle', 0.06),
};
