// js/ui/mapa-regioes.js — Interface: mapa da guerra por REGIÕES (2022): regiões pintadas por dono, linha de frente entre regiões,
// regiões tomadas/perdidas no último mês piscando, setinhas de captura, placar de território e mini-gráfico da tendência.
/* Só vale na guerra do 2022 (regMapOn). Fora da guerra o mapa continua por estado, como sempre.
   Desempenho: os caminhos das regiões vêm prontos (js/data/mapa-regioes.js); fronteiras entre regiões são calculadas uma vez e guardadas. */
function regMapOn(g){ return !!(g && g.reg && regOn(g) && !phaseOf(g).noArmies && phaseOf(g).war); }
const REG_RINGS = {}, REG_BORDER = {};
function regRings(id){ return REG_RINGS[id] || (REG_RINGS[id] = REG_DATA.regs[id].d.split("M").filter(Boolean).map(r => r.replace(/Z/g, "").split("L").map(p => p.trim()))); }
// Fronteira comum de duas regiões: os vértices são idênticos dos dois lados (malha simplificada sem buracos), então basta achar as sequências repetidas
function regSharedBorder(a, b){
  const k = a < b ? a + "|" + b : b + "|" + a; if (k in REG_BORDER) return REG_BORDER[k];
  const B = new Set(regRings(b).flat()); let d = "";
  for (const ring of regRings(a)){
    const n = ring.length, inB = ring.map(p => B.has(p)); if (!inB.some(Boolean)) continue;
    let start = inB.findIndex(x => !x); if (start < 0){ d += "M" + ring.join("L") + "Z"; continue; }
    let run = [];
    for (let i = 1; i <= n; i++){ const j = (start + i) % n; if (inB[j]) run.push(ring[j]); else { if (run.length >= 2) d += "M" + run.join("L"); run = []; } }
    if (run.length >= 2) d += "M" + run.join("L");
  }
  return (REG_BORDER[k] = d);
}
// Mudanças de região do último mês (para piscar e para as setinhas)
function regChanges(g){ return (g && g.mil && g.mil.regs) || []; }
function regionLayerSVG(g, reg, opts){
  const chg = {}; if (!opts.static || opts.regChg) for (const m of (opts.regChg || regChanges(g))) chg[m.id] = m.side;
  let s = `<g class="regs">`;
  for (const id of REG_IDS){ const r = REG_DATA.regs[id];
    s += `<path class="uf rg" data-uf="${r.uf}" data-rg="${id}" d="${r.d}" fill="${facFill(reg[id])}"></path>`; }
  s += `<path class="rsb" d="${REG_DATA.sb}"/>`;
  const ids = Object.keys(chg);
  if (ids.length) s += `<g class="rflash">${ids.map(id => `<path class="rchg ${chg[id] === "player" ? "p" : "e"}" d="${REG_DATA.regs[id].d}"/>`).join("")}</g>`;
  return s + `</g>`;
}
// Linha de frente: fronteiras entre regiões suas e regiões inimigas
function regFrontLinesSVG(g, reg){
  const ph = phaseOf(g), side = id => sideOf(g, reg[id], ph); let s = "";
  for (const a of REG_IDS){ if (side(a) !== "player") continue;
    for (const b of REG_DATA.regs[a].adj) if (side(b) === "enemy"){ const d = regSharedBorder(a, b); if (d) s += `<path class="frontcase" d="${d}"/><path class="front" d="${d}"/>`; } }
  return s;
}
// Setinhas: de uma região vizinha de quem tomou até a região tomada (no máximo 16, para não poluir)
function regArrowsSVG(g, list){
  list = (list || regChanges(g)).slice(0, 16); if (!list.length) return "";
  const reg = g.reg, ph = phaseOf(g); let s = "";
  for (const m of list){
    const r = REG_DATA.regs[m.id], took = id => m.side === "player" ? sideOf(g, reg[id], ph) === "player" : reg[id] === m.to;
    const from = r.adj.filter(took).sort((a, b) => Math.hypot(REG_DATA.regs[a].lx - r.lx, REG_DATA.regs[a].ly - r.ly) - Math.hypot(REG_DATA.regs[b].lx - r.lx, REG_DATA.regs[b].ly - r.ly))[0];
    if (from) s += arrowSVG(from, m.id, (m.side === "player" ? "pl" : "en") + " rarw", true);
  }
  return s;
}
// Placar de território (texto curto, usado no placar do mapa, no cartão e no relatório)
function regTallyText(g, f){ const T = regTally(g, f); return gfmt(frontFala(g, "regioes", "placar"), T.p, T.e); }
function regDeltaHTML(T){ return `<span class="rdelta"><b class="good">+${T.got}</b> / <b class="bad">−${T.lost}</b></span>`; }
// Mini-gráfico (sparkline) do território: suas regiões e as do inimigo desta frente nos últimos meses
function regSparkSVG(g, f, w, h){
  const H = ((g.war && g.war.hist) || []).slice(-12); w = w || 160; h = h || 34;
  if (H.length < 2) return `<small class="muted">${esc(frontFala(g, "regioes", "semHistorico"))}</small>`;
  const fid = f && (f.id || f), ps = H.map(x => x.p), es = H.map(x => (fid && x.e[fid]) || 0), max = Math.max(1, ...ps, ...es), min = Math.min(...ps, ...es.filter(v => v > 0), max);
  const lo = Math.max(0, min - 3), span = Math.max(4, max - lo), X = i => (2 + i * (w - 4) / (H.length - 1)).toFixed(1), Y = v => (h - 3 - (v - lo) / span * (h - 6)).toFixed(1);
  const line = (arr, cls) => `<polyline class="${cls}" points="${arr.map((v, i) => X(i) + "," + Y(v)).join(" ")}"/>`;
  const lbl = `${frontFala(g, "regioes", "tendencia")}: ${ps.join(" → ")}`;
  return `<svg class="rspark" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${esc(lbl)}"><title>${esc(lbl)}</title>${line(es, "e")}${line(ps, "p")}<circle class="p" cx="${X(H.length - 1)}" cy="${Y(ps[ps.length - 1])}" r="2.4"/></svg>`;
}
function regTrendHTML(g, f){
  const T = regTally(g, f);
  return `<div class="rtally"><div class="rtop"><b>${esc(gfmt(frontFala(g, "regioes", "placar"), T.p, T.e))}</b>${regDeltaHTML(T)}</div>
    <div class="rtrend"><small>${esc(frontFala(g, "regioes", "tendencia"))}</small>${regSparkSVG(g, f)}</div></div>`;
}
// Legenda extra do mapa de regiões
function regLegendHTML(g){
  return `<span><b style="color:#f3e2b8">34 × 21</b>&nbsp;${esc(frontFala(g, "regioes", "legPlacar"))}</span>
    <span><svg viewBox="0 0 22 12" width="22" height="12"><rect x="1" y="1" width="20" height="10" fill="#2a5d93" stroke="#f3c969" stroke-width="2"/></svg>${esc(frontFala(g, "regioes", "legTomada"))}</span>
    <span><svg viewBox="0 0 22 12" width="22" height="12"><rect x="1" y="1" width="20" height="10" fill="#a3301f" stroke="#ff6a52" stroke-width="2" stroke-dasharray="3 2"/></svg>${esc(frontFala(g, "regioes", "legPerdida"))}</span>
    <span><svg viewBox="0 0 22 10" width="22" height="10"><path d="M2,5H15" stroke="#f3c969" stroke-width="2"/><path d="M14,1.5L20,5L14,8.5z" fill="#f3c969"/></svg>${esc(frontFala(g, "regioes", "legSeta"))}</span>`;
}
