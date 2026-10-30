// js/ui/mapa-zoom.js — Interface: zoom e arraste do mapa principal (aba Mapa), em paz e em guerra: roda do mouse (rumo ao cursor),
// pinça e arraste com um dedo no celular, arrastar no computador, botões + / − / ⟲ e "Ir para Recife", teclas + − 0 e setas.
/* O zoom mexe só no viewBox do SVG; o estado fica em MAPZ (por cenário) e sobrevive às re-renderizações de cada mês.
   Rótulos, placares, contadores e estrelas são "contra-escalados" para continuar legíveis; os traços não engrossam
   (vector-effect no CSS css/mapa-zoom.css). Com zoom alto aparecem os nomes das regiões (guerra por regiões, 2022).
   Clique × arraste: um arraste de mais de 6 px não vira clique, para os cliques em estados, regiões e placares continuarem valendo. */
const MAPZ = {};                 // { cenário: { k, cx, cy, from } }
const MAPZ_MIN = 1, MAPZ_MAX = 6, MAPZ_NAMES = 2.4, MAPZ_DRAG = 6;
function mapZoomState(){ const id = (typeof SCEN !== "undefined" && SCEN && SCEN.id) || "_"; return MAPZ[id] || (MAPZ[id] = { k: 1, cx: null, cy: null }); }
function mapZoomReset(){ const S = mapZoomState(); S.k = 1; S.cx = S.cy = null; }
// limita o zoom e o centro: o mapa nunca some da tela
function mapZoomClamp(S, W, H){
  S.k = Math.max(MAPZ_MIN, Math.min(MAPZ_MAX, S.k || 1));
  const hw = W / S.k / 2, hh = H / S.k / 2;
  S.cx = Math.max(hw, Math.min(W - hw, S.cx ?? W / 2)); S.cy = Math.max(hh, Math.min(H - hh, S.cy ?? H / 2));
  return S;
}
// aproxima um ponto do mapa (coordenadas do SVG) com animação suave; usado pelos placares e pelo "Ir para Recife"
function mapZoomTo(x, y, k){
  const S = mapZoomState(); S.from = { k: S.k, cx: S.cx, cy: S.cy }; S.k = k; S.cx = x; S.cy = y;
}  // a próxima renderização do mapa anima até aqui
function mapZoomAttach(el, opts){
  const svg = el.querySelector("svg"); if (!svg) return;
  const vb = svg.viewBox.baseVal, W = vb.width, H = vb.height, S = mapZoomState(), g = opts && opts.g;
  svg.classList.add("zoomable");
  // nomes das regiões (só aparecem com zoom alto)
  if (g && typeof regMapOn === "function" && regMapOn(g) && opts.mode !== "agitacao")
    (svg.querySelector("g.tarw, g.tchip, g.tpct, g.cnt, g.fgoal") || { insertAdjacentHTML: (w, h) => svg.insertAdjacentHTML("beforeend", h) }).insertAdjacentHTML("beforebegin", `<g class="rgnames" aria-hidden="true">${REG_IDS.map(id => { const r = REG_DATA.regs[id]; return `<text x="${r.lx}" y="${r.ly}">${esc(r.n)}</text>`; }).join("")}</g>`);
  // elementos contra-escalados: grupos com transform (placares, contadores, estrelas) e textos soltos (siglas dos estados)
  const inv = [...svg.querySelectorAll("g.tchip, g.tpct, g.cnt, g.fgoal")].map(n => ({ n, t0: n.getAttribute("transform") || "" }))
    .concat([...svg.querySelectorAll("text")].filter(t => !t.closest("g.tchip, g.tpct, g.cnt, g.fgoal, defs, title")).map(n => ({ n, x: +n.getAttribute("x") || 0, y: +n.getAttribute("y") || 0 })));
  const set = (k, cx, cy) => {
    svg.setAttribute("viewBox", `${(cx - W / k / 2).toFixed(2)} ${(cy - H / k / 2).toFixed(2)} ${(W / k).toFixed(2)} ${(H / k).toFixed(2)}`);
    const s = 1 / Math.pow(k, 0.85);
    for (const o of inv) o.n.setAttribute("transform", o.t0 !== undefined ? (k > 1.01 ? `${o.t0} scale(${s.toFixed(3)})` : o.t0) : (k > 1.01 ? `translate(${o.x},${o.y}) scale(${s.toFixed(3)}) translate(${-o.x},${-o.y})` : ""));
    svg.classList.toggle("zoomed", k > 1.01); svg.classList.toggle("znames", k >= MAPZ_NAMES);
    svg.style.touchAction = k > 1.01 ? "none" : "pan-y";
    const lv = el.querySelector(".mapzoom .zlv"); if (lv) lv.textContent = Math.round(k * 100) + "%";
  };
  let raf = 0;
  const apply = animate => {
    mapZoomClamp(S, W, H); cancelAnimationFrame(raf);
    const F = S.from; delete S.from;
    if (!animate || !F || F.cx == null || reduceMotion()) return set(S.k, S.cx, S.cy);
    const t0 = performance.now(), D = 260, to = { k: S.k, cx: S.cx, cy: S.cy };
    const step = t => { const u = Math.max(0, Math.min(1, (t - t0) / D)), e = 1 - Math.pow(1 - u, 3);
      set(F.k + (to.k - F.k) * e, F.cx + (to.cx - F.cx) * e, F.cy + (to.cy - F.cy) * e); if (u < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
  };
  // ponto do SVG sob a posição da tela
  const at = (clientX, clientY) => { const r = svg.getBoundingClientRect(), v = svg.viewBox.baseVal; return [v.x + (clientX - r.left) / r.width * v.width, v.y + (clientY - r.top) / r.height * v.height]; };
  // zoom mantendo o ponto (px, py) parado na tela
  const zoomAround = (k, px, py, animate) => { mapZoomClamp(S, W, H); const k2 = Math.max(MAPZ_MIN, Math.min(MAPZ_MAX, k)), f = S.k / k2;
    if (animate) S.from = { k: S.k, cx: S.cx, cy: S.cy };
    S.cx = px + (S.cx - px) * f; S.cy = py + (S.cy - py) * f; S.k = k2; apply(animate); };
  const step = dir => zoomAround(S.k * (dir > 0 ? 1.5 : 1 / 1.5), S.cx ?? W / 2, S.cy ?? H / 2, true);
  const pan = (dx, dy) => { S.cx -= dx; S.cy -= dy; apply(false); };
  // botões (+, −, ⟲ e "Ir para Recife" na guerra por regiões)
  const goal = g && g.reg && g.war && phaseOf(g).war ? (g.war.fronts || []).map(f => ({ f, r: REG_DATA.regs[regGoal(g, f, 1)] })).find(x => x.r && x.f.id === "resistencia") : null;
  el.insertAdjacentHTML("beforeend", `<div class="mapzoom" role="group" aria-label="Zoom do mapa">
    <button type="button" data-z="in" title="Aproximar o mapa" aria-label="Aproximar o mapa">+</button><span class="zlv" aria-hidden="true">100%</span>
    <button type="button" data-z="out" title="Afastar o mapa" aria-label="Afastar o mapa">−</button>
    <button type="button" data-z="reset" title="Centralizar o mapa" aria-label="Centralizar o mapa">⟲</button>
    ${goal ? `<button type="button" class="zgo" data-z="goal" title="Ir para ${esc(goal.r.n)}" aria-label="Ir para ${esc(goal.r.n)}">🎯 <span>Ir para ${esc(goal.r.n)}</span></button>` : ""}</div>`);
  el.querySelectorAll(".mapzoom [data-z]").forEach(b => b.onclick = e => { e.stopPropagation(); const z = b.dataset.z;
    if (z === "in") step(1); else if (z === "out") step(-1);
    else if (z === "reset"){ S.from = { k: S.k, cx: S.cx, cy: S.cy }; S.k = 1; S.cx = W / 2; S.cy = H / 2; apply(true); }
    else if (z === "goal" && goal){ S.from = { k: S.k, cx: S.cx, cy: S.cy }; S.k = Math.max(S.k, 2.6); S.cx = goal.r.lx; S.cy = goal.r.ly; apply(true); } });
  // roda do mouse: zoom rumo ao cursor
  svg.addEventListener("wheel", e => { e.preventDefault(); const [px, py] = at(e.clientX, e.clientY);
    zoomAround(S.k * Math.exp(-Math.max(-120, Math.min(120, e.deltaY * (e.deltaMode === 1 ? 33 : 1))) * 0.0022), px, py, false); }, { passive: false });
  // arrastar (mouse ou um dedo) e pinça (dois dedos)
  const P = new Map(); let drag = null, pinch = null;
  svg.addEventListener("pointerdown", e => { if (e.button > 0) return; P.set(e.pointerId, [e.clientX, e.clientY]);
    if (P.size === 1) drag = { x: e.clientX, y: e.clientY, moved: false };
    else if (P.size === 2){ const [a, b] = [...P.values()]; const [px, py] = at((a[0] + b[0]) / 2, (a[1] + b[1]) / 2); pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]) || 1, k: S.k, px, py }; if (drag) drag.moved = true; } });
  svg.addEventListener("pointermove", e => { if (!P.has(e.pointerId)) return; const prev = P.get(e.pointerId); P.set(e.pointerId, [e.clientX, e.clientY]);
    if (pinch && P.size >= 2){ const [a, b] = [...P.values()]; zoomAround(pinch.k * Math.hypot(a[0] - b[0], a[1] - b[1]) / pinch.d, pinch.px, pinch.py, false); return; }
    if (!drag || S.k <= 1.01) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < MAPZ_DRAG) return;
    if (!drag.moved){ drag.moved = true; try { svg.setPointerCapture(e.pointerId); } catch(err){} svg.classList.add("dragging"); }
    const r = svg.getBoundingClientRect(), v = svg.viewBox.baseVal; pan((e.clientX - prev[0]) / r.width * v.width, (e.clientY - prev[1]) / r.height * v.height); });
  const up = e => { P.delete(e.pointerId); if (P.size < 2) pinch = null;
    if (!P.size){ if (drag && drag.moved) el.__mzDragged = Date.now(); drag = null; svg.classList.remove("dragging"); } };
  svg.addEventListener("pointerup", up); svg.addEventListener("pointercancel", up); svg.addEventListener("pointerleave", e => { if (e.pointerType === "mouse") up(e); });
  el.__mz = { apply };
  if (!el.__mzOnce){ el.__mzOnce = true;
    // um arraste não vira clique (captura no contêiner, antes dos cliques do mapa)
    el.addEventListener("click", e => { if (el.__mzDragged && Date.now() - el.__mzDragged < 350 && e.target.closest("svg")){ e.stopPropagation(); e.preventDefault(); el.__mzDragged = 0; } }, true);
    // teclado (mapa ou um estado com foco): + / − / 0 e setas
    el.addEventListener("keydown", e => { if (!e.target.closest || !e.target.closest("svg, .mapzoom") || e.altKey || e.ctrlKey || e.metaKey) return;
      const M = el.__mz; if (!M) return; const s = MAPZ_STEP_KEYS[e.key]; if (!s) return; e.preventDefault(); M.key(s); }); }
  el.__mz.key = s => { if (s === "in") step(1); else if (s === "out") step(-1); else if (s === "reset"){ S.from = { k: S.k, cx: S.cx, cy: S.cy }; S.k = 1; apply(true); }
    else { const v = svg.viewBox.baseVal, d = 0.15; pan(s[0] * v.width * d, s[1] * v.height * d); } };
  apply(!!S.from);
}
const MAPZ_STEP_KEYS = { "+": "in", "=": "in", "-": "out", "_": "out", "0": "reset", ArrowLeft: [1, 0], ArrowRight: [-1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] };
