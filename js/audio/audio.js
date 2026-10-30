// js/audio/audio.js — Som: trilha e efeitos gerados no navegador (Web Audio), botão de som.
/* ---------- Trilha sonora e efeitos (Web Audio, gerados no navegador; nenhum arquivo externo) ---------- */
const AUDIO = (() => {
  let ctx = null, master, mus, fx, verb, theme = null, want = "calm", timer = null, step = 0, nextT = 0, unlocked = false;
  const N = n => 440 * Math.pow(2, (n - 69) / 12);
  // progressões (MIDI): ambiente político (ré menor, lento) e guerra (mais rápido, percussão e metais)
  const TH = {
    calm: { bpm: 54, chords: [[50, 57, 62, 65], [46, 53, 62, 65], [43, 55, 58, 62], [45, 52, 61, 64]], drums: false, bell: [74, 77, 81, 79, 77, 74, 72, 69] },
    war:  { bpm: 80, chords: [[38, 50, 57, 62, 65], [34, 46, 53, 58, 62], [36, 48, 55, 60, 64], [33, 45, 52, 57, 61]], drums: true, bell: [62, 65, 69, 67, 65, 62, 61, 57] },
    tense:{ bpm: 66, chords: [[40, 52, 58, 63], [41, 53, 59, 64], [40, 52, 58, 63], [39, 51, 57, 62]], drums: true, bell: [76, 75, 76, 70, 71, 70, 64, 63] }
  };
  function init(){
    if (ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
    ctx = new AC(); master = ctx.createGain(); mus = ctx.createGain(); fx = ctx.createGain();
    // "sala": eco curto com realimentação, só na música
    verb = ctx.createDelay(1); verb.delayTime.value = 0.32; const fb = ctx.createGain(); fb.gain.value = 0.35; const vl = ctx.createBiquadFilter(); vl.type = "lowpass"; vl.frequency.value = 1800;
    mus.connect(master); mus.connect(verb); verb.connect(vl); vl.connect(fb); fb.connect(verb); vl.connect(master);
    fx.connect(master); master.connect(ctx.destination); master.gain.value = 0;
    setVol(true); return true;
  }
  function setVol(fadeIn){
    if (!ctx) return; const t = ctx.currentTime, on = SET.muted ? 0 : 1;
    master.gain.cancelScheduledValues(t); master.gain.setValueAtTime(master.gain.value, t); master.gain.linearRampToValueAtTime(on, t + (fadeIn ? 3 : 0.15));
    mus.gain.setTargetAtTime(SET.music * 0.32, t, 0.1); fx.gain.setTargetAtTime(SET.sfx * 0.55, t, 0.05);
    if (SET.muted || SET.music <= 0) stopLoop(); else startLoop();
  }
  function env(g, t, a, peak, d){ g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
  function pad(notes, t, dur, bright){
    for (const n of notes){ for (const det of [-6, 5]){
      const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      o.type = "sawtooth"; o.frequency.value = N(n); o.detune.value = det; f.type = "lowpass"; f.frequency.value = bright ? 1100 : 700; f.Q.value = 0.6;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.022, t + dur * 0.35); g.gain.exponentialRampToValueAtTime(0.0001, t + dur * 1.05);
      o.connect(f); f.connect(g); g.connect(mus); o.start(t); o.stop(t + dur * 1.1);
    } }
    const b = ctx.createOscillator(), bg = ctx.createGain(); b.type = "sine"; b.frequency.value = N(notes[0] - 12); env(bg, t, 0.05, 0.12, dur * 0.9); b.connect(bg); bg.connect(mus); b.start(t); b.stop(t + dur);
  }
  function bell(n, t, v){ const o = ctx.createOscillator(), g = ctx.createGain(); o.type = "triangle"; o.frequency.value = N(n); env(g, t, 0.01, v || 0.05, 1.6); o.connect(g); g.connect(mus); o.start(t); o.stop(t + 1.8); }
  function noise(dur){ const b = ctx.createBuffer(1, Math.max(1, ctx.sampleRate * dur), ctx.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; const s = ctx.createBufferSource(); s.buffer = b; return s; }
  function drum(t, out, v, lo){ const o = ctx.createOscillator(), g = ctx.createGain(); o.type = "sine"; o.frequency.setValueAtTime(lo ? 110 : 160, t); o.frequency.exponentialRampToValueAtTime(lo ? 38 : 60, t + 0.35); env(g, t, 0.005, v, 0.5); o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.6); }
  function snare(t, out, v){ const s = noise(0.2), f = ctx.createBiquadFilter(), g = ctx.createGain(); f.type = "bandpass"; f.frequency.value = 1800; env(g, t, 0.003, v, 0.15); s.connect(f); f.connect(g); g.connect(out); s.start(t); }
  function brass(notes, t, dur){ for (const n of notes){ const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain(); o.type = "sawtooth"; o.frequency.value = N(n); f.type = "lowpass"; f.frequency.setValueAtTime(300, t); f.frequency.linearRampToValueAtTime(1400, t + 0.12); f.frequency.linearRampToValueAtTime(500, t + dur); env(g, t, 0.06, 0.03, dur); o.connect(f); f.connect(g); g.connect(mus); o.start(t); o.stop(t + dur + 0.1); } }
  function tick(){
    const T = TH[theme] || TH.calm, beat = 60 / T.bpm;
    while (nextT < ctx.currentTime + 0.4){
      const bar = Math.floor(step / 8), pos = step % 8, ch = T.chords[bar % T.chords.length];
      if (pos === 0){ pad(ch, nextT, beat * 4, theme !== "calm"); if (theme === "war" && bar % 2 === 0) brass(ch.slice(1, 4), nextT, beat * 0.9); }
      if (T.drums){ if (pos === 0 || pos === 4) drum(nextT, mus, theme === "war" ? 0.22 : 0.12, true); if (theme === "war" && (pos === 6 || pos === 7)) snare(nextT, mus, 0.035); if (theme === "war" && pos === 3) drum(nextT, mus, 0.08, false); }
      if ((theme === "calm" ? pos % 4 === 2 && Math.random() < 0.6 : pos % 2 === 1 && Math.random() < 0.45)) bell(T.bell[(step + bar) % T.bell.length], nextT, theme === "calm" ? 0.035 : 0.03);
      nextT += beat / 2; step++;
    }
  }
  function startLoop(){ if (!ctx || timer || !unlocked) return; theme = want; nextT = ctx.currentTime + 0.1; step = 0; timer = setInterval(tick, 120); }
  function stopLoop(){ if (timer){ clearInterval(timer); timer = null; } }
  function setTheme(t){ if (t === want) return; want = t; if (timer){ stopLoop(); theme = t; if (ctx){ nextT = ctx.currentTime + 0.15; step = 0; } startLoop(); } }
  function unlock(){ if (unlocked) return; if (!init()) return; unlocked = true; if (ctx.state === "suspended") ctx.resume(); setVol(true); }
  function sfx(kind){
    if (!ctx || !unlocked || SET.muted || SET.sfx <= 0) return; const t = ctx.currentTime + 0.01;
    const tone = (n, at, d, type, v) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type || "triangle"; o.frequency.value = N(n); env(g, at, 0.008, v || 0.12, d); o.connect(g); g.connect(fx); o.start(at); o.stop(at + d + 0.05); };
    if (kind === "click") tone(84, t, 0.05, "sine", 0.05);
    else if (kind === "order"){ tone(69, t, 0.1, "square", 0.05); tone(76, t + 0.08, 0.16, "square", 0.05); }
    else if (kind === "turn"){ const s = noise(0.9), f = ctx.createBiquadFilter(), g = ctx.createGain(); f.type = "bandpass"; f.Q.value = 2; f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(2400, t + 0.7); env(g, t, 0.25, 0.18, 0.6); s.connect(f); f.connect(g); g.connect(fx); s.start(t); drum(t + 0.6, fx, 0.4, true); }
    else if (kind === "boom"){ drum(t, fx, 0.7, true); const s = noise(1.2), f = ctx.createBiquadFilter(), g = ctx.createGain(); f.type = "lowpass"; f.frequency.setValueAtTime(1600, t); f.frequency.exponentialRampToValueAtTime(120, t + 1); env(g, t, 0.005, 0.5, 1.1); s.connect(f); f.connect(g); g.connect(fx); s.start(t); }
    else if (kind === "win"){ [62, 66, 69, 74].forEach((n, i) => tone(n, t + i * 0.11, 0.5, "triangle", 0.1)); }
    else if (kind === "lose"){ [69, 65, 62, 57].forEach((n, i) => tone(n, t + i * 0.16, 0.6, "sawtooth", 0.05)); }
    else if (kind === "sting"){ drum(t, fx, 0.6, true); [50, 51, 56, 62, 63].forEach(n => tone(n, t, 2.2, "sawtooth", 0.035)); snare(t + 0.02, fx, 0.15); }
    else if (kind === "alert"){ tone(81, t, 0.12, "square", 0.04); tone(81, t + 0.18, 0.12, "square", 0.04); }
  }
  return { unlock, setVol, setTheme, sfx, get on(){ return unlocked && !SET.muted; } };
})();
function sndBtn(){ const b = document.getElementById("btnSnd"); if (!b) return; const on = !SET.muted; b.textContent = on ? "🔊" : "🔇"; b.setAttribute("aria-pressed", on ? "false" : "true"); b.setAttribute("aria-label", on ? "Som ligado (clique para silenciar)" : "Som desligado (clique para ligar)"); b.title = b.getAttribute("aria-label"); }
// o áudio só começa depois do primeiro toque/tecla do usuário (regra dos navegadores e pedido do design)
["pointerdown", "keydown"].forEach(ev => document.addEventListener(ev, () => AUDIO.unlock(), { once: false, passive: true }));
document.addEventListener("click", e => { const b = e.target.closest && e.target.closest("button.tab, button.choice, .seg button, #btnSet, .ecocell"); if (b) AUDIO.sfx("click"); }, true);
