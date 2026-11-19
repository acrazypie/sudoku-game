// sound.js — tiny synthesized sounds (no audio files to download).

let ctx = null;
let enabled = true;

export function setSound(on) {
    enabled = on;
}

function tone(freq, dur = 0.08, type = "sine", gain = 0.05, delay = 0) {
    if (!enabled) return;
    try {
        ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
        if (ctx.state === "suspended") ctx.resume();
        const t = ctx.currentTime + delay;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, t);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(gain, t + 0.008);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        osc.connect(g).connect(ctx.destination);
        osc.start(t);
        osc.stop(t + dur + 0.02);
    } catch (e) {}
}

export const sfx = {
    tap: () => tone(660, 0.05, "sine", 0.03),
    note: () => tone(880, 0.04, "triangle", 0.025),
    place: () => tone(523, 0.09, "sine", 0.05),
    wrong: () => {
        tone(196, 0.16, "square", 0.025);
        tone(185, 0.18, "square", 0.02, 0.06);
    },
    unit: () => [659, 784, 988].forEach((f, k) => tone(f, 0.12, "sine", 0.04, k * 0.06)),
    win: () => [523, 659, 784, 1047, 1319].forEach((f, k) => tone(f, 0.22, "triangle", 0.045, k * 0.09)),
    lose: () => [392, 330, 262].forEach((f, k) => tone(f, 0.25, "triangle", 0.04, k * 0.12)),
    hint: () => [880, 1175].forEach((f, k) => tone(f, 0.1, "sine", 0.035, k * 0.07)),
};
