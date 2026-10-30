// js/ui/mapa-frentes.js — Interface: mapa de guerra por frentes (2022) no estilo Victoria 3 — placar de força na linha,
// lados sombreados perto da frente, estados em disputa listrados, setas do último mês, capital e redutos marcados.
/* Só desenha quando mapSVG recebe opts.fronts (aba Mapa no modo frentes). Tudo é SVG simples (sem filtros pesados) para rodar bem no celular. */
const FMAP_COL = () => SET.cb ? { p: "#0072B2", e: "#D55E00", pl: "#9fd3ff", el: "#ffc499" } : { p: "#2a5d93", e: "#a3301f", pl: "#9cc3ea", el: "#f0a493" };
const FBADGE_K = () => MOBILE_MAP() ? 1.55 : 1.3;
// Geometria de uma frente: trechos de fronteira entre os seus estados e os do inimigo dela
function frontGeom(g, f){
  const mine = frontBorder(g, f, "player"), theirs = frontBorder(g, f, "enemy"), segs = [], pts = [];
  for (const a of mine) for (const b of theirs) if (ADJ[a].includes(b)){ const d = sharedBorder(a, b); if (d){ segs.push(d); for (const m of d.matchAll(/(-?\d+\.?\d*),(-?\d+\.?\d*)/g)) pts.push([+m[1], +m[2]]); } }
  if (!pts.length) return null;
  const avg = l => l.reduce((s, p) => [s[0] + p[0] / l.length, s[1] + p[1] / l.length], [0, 0]);
  const c = avg(pts), mid = pts.reduce((b, p) => Math.hypot(p[0] - c[0], p[1] - c[1]) < Math.hypot(b[0] - c[0], b[1] - c[1]) ? p : b, pts[0]);
  const ctr = l => avg(l.map(uf => [MAP_DATA.states[uf].lx, MAP_DATA.states[uf].ly]));
  const A = ctr(mine), B = ctr(theirs); let vx = B[0] - A[0], vy = B[1] - A[1]; const L = Math.hypot(vx, vy) || 1; vx /= L; vy /= L;
  // pontos ao longo da linha (ordenados na direção perpendicular ao avanço) para as setas do mês
  const along = pts.slice().sort((p, q) => (p[0] * -vy + p[1] * vx) - (q[0] * -vy + q[1] * vx));
  return { mine, theirs, d: segs.join(""), mid, v: [vx, vy], along };
}
function frontPowers(g, f){
  return { P: Math.round(frontForce(g, f, f.special ? "avancar" : f.posture, f.special).total), E: Math.round(enemyForce(g, f, f.eposture || "segurar").total) };
}
// Texto (leitor de tela e dica) com os números da frente
function frontBadgeLabel(g, f, pw){
  const p = Math.round(f.progress), d = f.last ? Math.round(f.last.d) : 0, post = f.special ? "avancar" : f.posture;
  const mv = !f.last ? "sem combate ainda" : d >= 3 ? `no último mês a linha avançou ${d}` : d <= -3 ? `no último mês a linha recuou ${-d}` : "no último mês a linha quase não mexeu";
  return `${frontName(g, f)}: sua força ${pw.P} contra ${pw.E} do inimigo · linha ${p > 0 ? "+" : ""}${p} de 100 · postura: ${frontFala(g, "postura", post)} · ${mv}`;
}
function frontBadgeSVG(g, f, G0, w){
  const pw = frontPowers(g, f), k = FBADGE_K(), C = FMAP_COL(), p = Math.max(-100, Math.min(100, Math.round(f.progress)));
  const x = Math.max(60 * k, Math.min(w - 60 * k, G0.mid[0])), y = Math.max(16 * k, Math.min(MAP_DATA.size[1] - 28 * k, G0.mid[1]));
  const post = f.special ? "avancar" : f.posture, gen = frontGen(g, f), GP = gen && portraitOf("pessoas", gen.retrato);
  const d = f.last ? f.last.d : 0, mk = p * 0.26, lbl = frontBadgeLabel(g, f, pw), fav = pw.P >= pw.E * 1.15 ? "p" : pw.E >= pw.P * 1.15 ? "e" : "n";
  const marker = d >= 3 ? `<path class="fmk" d="M${(mk - 3).toFixed(1)},11.5L${(mk + 3.5).toFixed(1)},14L${(mk - 3).toFixed(1)},16.5z"/>`
    : d <= -3 ? `<path class="fmk" d="M${(mk + 3).toFixed(1)},11.5L${(mk - 3.5).toFixed(1)},14L${(mk + 3).toFixed(1)},16.5z"/>` : `<circle class="fmk" cx="${mk.toFixed(1)}" cy="14" r="2.4"/>`;
  return `<g class="fbadge fav-${fav}" data-front="${f.id}" tabindex="0" role="button" aria-label="${esc(lbl)}" transform="translate(${x.toFixed(1)},${y.toFixed(1)}) scale(${k})"><title>${esc(lbl)}</title>
    <path class="fhalf" fill="${C.p}" d="M0,-10H-28A10,10 0 0 0 -28,10H0z"/><path class="fhalf" fill="${C.e}" d="M0,-10H28A10,10 0 0 1 28,10H0z"/>
    <rect class="fpill" x="-38" y="-10" width="76" height="20" rx="10"/>
    <rect class="fsym" x="-35" y="-3" width="7" height="5.5"/><path class="fsym" d="M-35,-3L-28,2.5M-35,2.5L-28,-3"/>
    <text class="fnum" x="-15.5" y="0.5">${pw.P}</text><path class="fvs" d="M-3,-4L3,4M3,-4L-3,4"/><text class="fnum" x="15.5" y="0.5">${pw.E}</text>
    <path class="fsym" d="M31.5,-4.5L35.5,-0.5L31.5,3.5L27.5,-0.5z"/>
    <rect class="ftug" x="-26" y="12" width="52" height="4" rx="2"/><rect class="ftugf ${p >= 0 ? "up" : "down"}" x="${Math.min(0, mk).toFixed(1)}" y="12" width="${Math.abs(mk).toFixed(1)}" height="4"/><path class="ftick" d="M0,11V17"/>${marker}
    <text class="fprog" x="0" y="23">${p > 0 ? "+" : ""}${p}</text>
    <g class="fpost ${post}${f.special ? " sp" : ""}" transform="translate(-49,0)"><circle r="8.5"/><text y="0.8">${f.special ? "💥" : POSTURE_ICON[post]}</text></g>
    ${GP ? `<g class="fgen2" transform="translate(49,0)"><circle r="9"/>${GP.img ? `<image href="assets/retratos/${GP.img}.webp" x="-8" y="-8" width="16" height="16" clip-path="url(#fpclip)" preserveAspectRatio="xMidYMid slice"/>` : `<text y="0.8">★</text>`}</g>` : ""}</g>`;
}
// Setas do último mês: para onde a linha andou
function frontPushSVG(f, G0){
  if (!f.last || Math.abs(f.last.d) < 3) return "";
  const s = f.last.d > 0 ? 1 : -1, vx = G0.v[0] * s, vy = G0.v[1] * s, ang = Math.atan2(vy, vx) * 180 / Math.PI, n = G0.along.length;
  const at = [G0.along[Math.floor(n * 0.2)], G0.along[Math.floor(n * 0.8)]].filter((p, i, a) => p && (i === 0 || Math.hypot(p[0] - a[0][0], p[1] - a[0][1]) > 40));
  return at.map(p => `<g class="fpush ${s > 0 ? "up" : "down"}" transform="translate(${p[0].toFixed(1)},${p[1].toFixed(1)}) rotate(${ang.toFixed(0)})">${[-7, 0, 7].map((o, i) => `<path class="ch c${i}" d="M${o - 3},-5L${o + 3},0L${o - 3},5"/>`).join("")}</g>`).join("");
}
// Camadas extras do mapa de frentes: { under, over, defs }
function frontMapLayers(g, control, w){
  const ph = phaseOf(g), W = g.war, C = FMAP_COL(), K = frontCfg(g), out = { defs: "", under: "", over: "", badges: "" };
  const hatch = (id, col, ang, sw, gap, op) => `<pattern id="${id}" width="${gap}" height="${gap}" patternUnits="userSpaceOnUse" patternTransform="rotate(${ang})"><rect width="${gap}" height="${gap}" fill="none"/><path d="M0,0V${gap}" stroke="${col}" stroke-width="${sw}" stroke-opacity="${op}"/></pattern>`;
  out.defs += hatch("fhP", C.p, 45, 2, 5, .85) + hatch("fhE", C.e, -45, 2, 5, .85) + `<clipPath id="fpclip" clipPathUnits="objectBoundingBox"><circle cx=".5" cy=".5" r=".5"/></clipPath>`;
  // estados em disputa: listras na cor de quem avança sobre eles (o inimigo daquela frente)
  for (const uf in control) if (ph.war && sideOf(g, control[uf], ph) === "contested"){
    const fid = frontOfUF(g, uf), fc = STORY.factions[fid]; if (!fc) continue;
    if (!out.defs.includes(`id="fhC-${fid}"`)) out.defs += hatch("fhC-" + fid, fc.color, 35, 3, 8, .9);
    out.under += `<path class="foccup" d="${MAP_DATA.states[uf].d}" fill="url(#fhC-${fid})"/>`;
  }
  if (!ph.war || !W || !W.fronts.length) return out;
  for (const f of W.fronts){
    const G0 = frontGeom(g, f); if (!G0) continue;
    // faixa sombreada dos dois lados, só perto da linha (traço largo recortado pelos estados de cada lado)
    out.defs += `<clipPath id="fcp-${f.id}">${G0.mine.map(uf => `<path d="${MAP_DATA.states[uf].d}"/>`).join("")}</clipPath><clipPath id="fce-${f.id}">${G0.theirs.map(uf => `<path d="${MAP_DATA.states[uf].d}"/>`).join("")}</clipPath>`;
    out.under += `<path class="fband p" d="${G0.d}" stroke="url(#fhP)" clip-path="url(#fcp-${f.id})"/><path class="fband e" d="${G0.d}" stroke="url(#fhE)" clip-path="url(#fce-${f.id})"/>`;
    out.over += frontPushSVG(f, G0);
    out.badges += frontBadgeSVG(g, f, G0, w);
  }
  // capital (estrela) e redutos inimigos das frentes abertas (alvo)
  const mark = (uf, cls, lbl) => { const s = MAP_DATA.states[uf]; if (!s) return ""; const x = s.lx + (LABEL_POS[uf] ? 0 : 11), y = s.ly - (LABEL_POS[uf] ? 0 : 9);
    return `<g class="fgoal ${cls}" transform="translate(${x.toFixed(1)},${y.toFixed(1)})"><title>${esc(lbl)}</title>${cls === "cap" ? `<path d="M0,-6.5L1.9,-2L6.6,-2L2.8,1L4.2,5.8L0,3L-4.2,5.8L-2.8,1L-6.6,-2L-1.9,-2z"/>` : `<circle r="5.6"/><circle r="3.2"/><circle class="dot" r="1.2"/>`}</g>`; };
  if (K.capital && sideOf(g, control[K.capital], ph) === "player") out.over += mark(K.capital, "cap", `${K.capital}: sua capital — se cair, o regime cai`);
  for (const f of W.fronts){ const r = K.frentes[f.id] && K.frentes[f.id].reduto; if (r && control[r] !== undefined && sideOf(g, control[r], ph) !== "player") out.over += mark(r, "goal", `${r}: reduto inimigo — ${frontName(g, f)}`); }
  return out;
}
function frontLegendHTML(){
  const C = FMAP_COL();
  return `<div class="milleg fleg" aria-hidden="true">
    <span><svg viewBox="0 0 30 10" width="30" height="10"><path d="M2,5H28" stroke="#1a0b06" stroke-width="7"/><path d="M2,5H28" stroke="#ff6a3d" stroke-width="3.6" stroke-dasharray="5 3"/></svg>linha de frente</span>
    <span><svg viewBox="0 0 22 12" width="22" height="12"><defs><pattern id="lgP" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0,0V4" stroke="${C.p}" stroke-width="2"/></pattern><pattern id="lgE" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)"><path d="M0,0V4" stroke="${C.e}" stroke-width="2"/></pattern></defs><rect width="11" height="12" fill="url(#lgP)"/><rect x="11" width="11" height="12" fill="url(#lgE)"/></svg>seu lado / lado inimigo</span>
    <span><svg viewBox="-35 -11 70 22" width="48" height="15"><path fill="${C.p}" d="M0,-10H-24A10,10 0 0 0 -24,10H0z"/><path fill="${C.e}" d="M0,-10H24A10,10 0 0 1 24,10H0z"/><rect x="-34" y="-10" width="68" height="20" rx="10" fill="none" stroke="#f3e2b8" stroke-width="1.5"/><text x="-13" y="1" fill="#fff" font-size="11" font-weight="800" text-anchor="middle" dominant-baseline="middle">120</text><text x="13" y="1" fill="#fff" font-size="11" font-weight="800" text-anchor="middle" dominant-baseline="middle">95</text></svg>força: você ■ / inimigo ◆ (toque para abrir)</span>
    <span><svg viewBox="0 0 26 12" width="26" height="12"><path d="M3,1L9,6L3,11M11,1L17,6L11,11M19,1L25,6L19,11" fill="none" stroke="#f3c969" stroke-width="2.2"/></svg>para onde a linha andou</span>
    <span><svg viewBox="-7 -7 14 14" width="13" height="13"><path d="M0,-6.5L1.9,-2L6.6,-2L2.8,1L4.2,5.8L0,3L-4.2,5.8L-2.8,1L-6.6,-2L-1.9,-2z" fill="#f3c969" stroke="#1a1408"/></svg>sua capital</span>
    <span><svg viewBox="-7 -7 14 14" width="13" height="13"><circle r="5.6" fill="#fff" stroke="#1a1408"/><circle r="3.2" fill="#c0392b"/><circle r="1.2" fill="#fff"/></svg>reduto inimigo (vitória)</span>
    <span><svg viewBox="0 0 30 10" width="30" height="10"><path d="M2,5H24" stroke="#f3c969" stroke-width="3"/><path d="M22,1L29,5L22,9z" fill="#f3c969"/></svg>você avança</span>
    <span><svg viewBox="0 0 30 10" width="30" height="10"><path d="M2,5H24" stroke="#ff6a52" stroke-width="2.6" stroke-dasharray="4 3"/><path d="M22,1L29,5L22,9z" fill="#ff6a52"/></svg>ataque inimigo previsto</span></div>`;
}
