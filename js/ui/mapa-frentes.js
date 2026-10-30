// js/ui/mapa-frentes.js — Interface: mapa da guerra de 2022 com EXÉRCITOS nas regiões do IBGE — fichas OTAN com a força,
// destinos destacados com a chance de vitória (%), setas grossas das suas ordens e do plano inimigo, faixa da linha de frente,
// sua capital, a capital inimiga e o caminho mais curto até ela ("Faltam N regiões até Recife").
/* Só desenha quando mapSVG recebe opts.fronts (aba Mapa e animação do fim do mês). Tudo é SVG simples (sem filtros pesados) para rodar bem no celular.
   As fichas (g.tchip) e as etiquetas de chance (g.tpct) são contra-escaladas no zoom (js/ui/mapa-zoom.js): continuam legíveis de longe e de perto. */
const FMAP_COL = () => SET.cb ? { p: "#0072B2", e: "#D55E00", pl: "#9fd3ff", el: "#ffc499" } : { p: "#2a5d93", e: "#a3301f", pl: "#9cc3ea", el: "#f0a493" };
const TCHIP_K = () => MOBILE_MAP() ? 1.75 : 1.15;
// Geometria de uma frente: trechos de fronteira entre os seus estados e os do inimigo dela
function frontGeom(g, f){
  const RG = regMapOn(g), RB = RG ? regBorder(g, f) : null, mine = RG ? RB.mine : frontBorder(g, f, "player"), theirs = RG ? RB.theirs : frontBorder(g, f, "enemy"), segs = [], pts = [];
  const adj = (a, b) => RG ? REG_DATA.regs[a].adj.includes(b) : ADJ[a].includes(b), shared = (a, b) => RG ? regSharedBorder(a, b) : sharedBorder(a, b);
  for (const a of mine) for (const b of theirs) if (adj(a, b)){ const d = shared(a, b); if (d){ segs.push(d); for (const m of d.matchAll(/(-?\d+\.?\d*),(-?\d+\.?\d*)/g)) pts.push([+m[1], +m[2]]); } }
  if (!pts.length) return null;
  const avg = l => l.reduce((s, p) => [s[0] + p[0] / l.length, s[1] + p[1] / l.length], [0, 0]);
  const c = avg(pts), mid = pts.reduce((b, p) => Math.hypot(p[0] - c[0], p[1] - c[1]) < Math.hypot(b[0] - c[0], b[1] - c[1]) ? p : b, pts[0]);
  const at = k => RG ? REG_DATA.regs[k] : MAP_DATA.states[k], ctr = l => avg(l.map(k => [at(k).lx, at(k).ly]));
  const A = ctr(mine), B = ctr(theirs); let vx = B[0] - A[0], vy = B[1] - A[1]; const L = Math.hypot(vx, vy) || 1; vx /= L; vy /= L;
  // pontos ao longo da linha (ordenados na direção perpendicular ao avanço) para as setas do mês
  const along = pts.slice().sort((p, q) => (p[0] * -vy + p[1] * vx) - (q[0] * -vy + q[1] * vx));
  return { mine, theirs, d: segs.join(""), mid, v: [vx, vy], along, shape: k => at(k).d };
}
// Camadas extras do mapa de frentes: { under, over, defs }
function frontMapLayers(g, control, w, opts){
  opts = opts || {};
  const ph = phaseOf(g), W = g.war, C = FMAP_COL(), K = frontCfg(g), out = { defs: "", under: "", over: "", badges: "" };
  const hatch = (id, col, ang, sw, gap, op) => `<pattern id="${id}" width="${gap}" height="${gap}" patternUnits="userSpaceOnUse" patternTransform="rotate(${ang})"><rect width="${gap}" height="${gap}" fill="none"/><path d="M0,0V${gap}" stroke="${col}" stroke-width="${sw}" stroke-opacity="${op}"/></pattern>`;
  out.defs += hatch("fhP", C.p, 45, 2, 5, .85) + hatch("fhE", C.e, -45, 2, 5, .85) + `<clipPath id="fpclip" clipPathUnits="objectBoundingBox"><circle cx=".5" cy=".5" r=".5"/></clipPath>`;
  if (!ph.war || !W || !W.fronts.length) return out;
  for (const f of W.fronts){
    const G0 = frontGeom(g, f); if (!G0) continue;
    // faixa sombreada dos dois lados, só perto da linha (traço largo recortado pelos estados de cada lado)
    out.defs += `<clipPath id="fcp-${f.id}">${G0.mine.map(k => `<path d="${G0.shape(k)}"/>`).join("")}</clipPath><clipPath id="fce-${f.id}">${G0.theirs.map(k => `<path d="${G0.shape(k)}"/>`).join("")}</clipPath>`;
    out.under += `<path class="fband p" d="${G0.d}" stroke="url(#fhP)" clip-path="url(#fcp-${f.id})"/><path class="fband e" d="${G0.d}" stroke="url(#fhE)" clip-path="url(#fce-${f.id})"/>`;
  }
  // caminho mais curto até a capital inimiga (seta tracejada discreta, região por região) — o "Faltam N regiões até Recife"
  if (g.reg && !opts.static) for (const f of W.fronts){
    const P = regPath(g, f, 1); if (!P || !P.length) continue;
    const { atk } = regSides(g, f, 1), R0 = REG_DATA.regs[P[0]], from = R0.adj.filter(atk).map(k => REG_DATA.regs[k]).sort((a, b) => Math.hypot(a.lx - R0.lx, a.ly - R0.ly) - Math.hypot(b.lx - R0.lx, b.ly - R0.ly))[0];
    const pts = (from ? [from] : []).concat(P.map(k => REG_DATA.regs[k])).map(r => `${r.lx.toFixed(1)},${r.ly.toFixed(1)}`);
    if (pts.length > 1) out.over += `<polyline class="frota" points="${pts.join(" ")}" marker-end="url(#frotaArr)"><title>${esc(gfmt(frontFala(g, "regioes", "rota"), regGoalName(g, f, 1)))}</title></polyline>`;
  }
  out.defs += `<marker id="frotaArr" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="#ffe08a"/></marker>`;
  // capital (estrela dourada) e capitais inimigas das frentes abertas (estrela vermelha grande + nome: "Recife — capital da Resistência")
  const STAR = "M0,-6.5L1.9,-2L6.6,-2L2.8,1L4.2,5.8L0,3L-4.2,5.8L-2.8,1L-6.6,-2L-1.9,-2z";
  const mark = (uf, cls, lbl, name) => { const s = MAP_DATA.states[uf]; if (!s) return ""; const R = g.reg && REG_DATA.regs[REG_DATA.cap[uf]];
    const x = R ? R.lx : s.lx + (LABEL_POS[uf] ? 0 : 11), y = R ? R.ly : s.ly - (LABEL_POS[uf] ? 0 : 9); if (R) lbl = lbl.replace(uf + ":", `${R.n} (${uf}):`);
    const right = x > w * 0.62, t = name ? `<text class="fglbl" x="${right ? -11 : 11}" y="1" text-anchor="${right ? "end" : "start"}">${esc(name)}</text>` : "";
    return `<g class="fgoal ${cls}" transform="translate(${x.toFixed(1)},${y.toFixed(1)})"><title>${esc(lbl)}</title><g class="zinv">${cls === "cap" ? `<path d="${STAR}"/>` : `<path class="big" d="${STAR}" transform="scale(1.45)"/>`}${t}</g></g>`; };
  const own = uf => g.reg && REG_DATA.cap[uf] ? g.reg[REG_DATA.cap[uf]] : control[uf];
  if (K.capital && sideOf(g, own(K.capital), ph) === "player") out.over += mark(K.capital, "cap", `${K.capital}: sua capital — se cair, o regime cai`, g.reg ? frontFala(g, "regioes", "capitalSua") : "");
  for (const f of W.fronts){ const r = K.frentes[f.id] && K.frentes[f.id].reduto; if (r && control[r] !== undefined && sideOf(g, own(r), ph) !== "player") out.over += mark(r, "goal", `${r}: capital inimiga — ${frontName(g, f)}`, g.reg ? frontFala(g, "reduto", f.id) : ""); }
  // exércitos: destinos do selecionado (com a chance), setas das ordens e as fichas por cima de tudo
  const L = tpMapLayers(g, opts);
  out.over += L.targets + L.arrows; out.badges += L.chips;
  return out;
}
/* ---------- Exércitos no mapa ---------- */
// cor da chance: verde (boa), amarela (arriscada), vermelha (ruim)
function tpChanceCls(c){ return c >= 60 ? "good" : c >= 40 ? "mid" : "bad"; }
function tpChipLabel(g, a){
  const F = k => frontFala(g, "tropas", k), o = a.order;
  const ord = a.side !== "player" ? "" : o ? ` · ${F(o.type === "atacar" ? "ordemAtaca" : "ordemVai")} ${regName(o.to)}` : ` · ${F("semOrdemCurta")}`;
  return `${tpName(g, a)} · ${regName(a.reg)} · ${F("forca")} ${Math.round(a.str)} · ${F("moral")} ${Math.round(a.morale ?? 60)}${ord}`;
}
// Ficha OTAN: retângulo azul com X (seu) ou losango vermelho (inimigo), força em número grande e barra de moral embaixo
function tpChipSVG(g, a, o){
  const R = REG_DATA.regs[a.reg]; if (!R) return "";
  const k = TCHIP_K(), P = a.side === "player", gen = g.war && g.war.gens && P ? tpGen(g, a) : null, lbl = tpChipLabel(g, a);
  const mor = Math.max(0.05, Math.min(1, (a.morale ?? 60) / 100));
  const sym = P ? `<rect class="sym" x="-16" y="-5.5" width="10" height="8"/><path class="sym" d="M-16,-5.5L-6,2.5M-16,2.5L-6,-5.5"/>`
    : `<path class="sym" d="M-11,-7L-5,-1.5L-11,4L-17,-1.5z"/><path class="sym" d="M-14,-4.3L-8,1.2M-14,1.2L-8,-4.3"/>`;
  const cls = `tchip ${P ? "p" : "e"}${o.sel === a.id ? " sel" : ""}${P && a.order ? " ord" : ""}${a.special ? " sp" : ""}${o.dim && o.sel && o.sel !== a.id && P ? " dim" : ""}`;
  return `<g class="${cls}" data-army="${a.id}" data-rg="${a.reg}" data-uf="${R.uf}" tabindex="0" role="button" aria-label="${esc(lbl)}" transform="translate(${R.lx.toFixed(1)},${R.ly.toFixed(1)}) scale(${k})"><title>${esc(lbl)}</title>
    ${o.sel === a.id ? `<rect class="ring" x="-22" y="-14" width="44" height="28" rx="6"/>` : ""}<rect class="bg" x="-19" y="-10" width="38" height="20" rx="3"/>${sym}
    <text class="cn" x="6.5" y="0.5">${Math.round(a.str)}</text><rect class="mb0" x="-16" y="5.2" width="32" height="2.2" rx="1"/><rect class="mb" x="-16" y="5.2" width="${(32 * mor).toFixed(1)}" height="2.2" rx="1"/>
    ${gen ? `<g class="gs" transform="translate(17,-9)"><circle r="4.6"/><text y="0.6">★</text></g>` : ""}${P && a.order ? `<path class="ordmk" d="M-19,-10L-12,-10L-19,-3z"/>` : ""}${a.special ? `<text class="spk" x="-21" y="-9">💥</text>` : ""}</g>`;
}
// Seta grossa por um caminho de regiões (pts = ids); a ponta para antes do centro do destino
function tpArrowSVG(pts, cls, title){
  const P = pts.map(id => REG_DATA.regs[id]).filter(Boolean).map(r => [r.lx, r.ly]); if (P.length < 2) return "";
  const cut = (a, b, d) => { const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, t = Math.min(0.45, d / L); return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; };
  const s = cut(P[0], P[1], 9), n = P.length, e = cut(P[n - 1], P[n - 2], 8), pts2 = [s].concat(P.slice(1, -1), [e]);
  let d = `M${s[0].toFixed(1)},${s[1].toFixed(1)}`;
  if (pts2.length === 2){ const [x1, y1] = s, [x2, y2] = e, dx = x2 - x1, dy = y2 - y1; d += ` Q${((x1 + x2) / 2 - dy * 0.2).toFixed(1)},${((y1 + y2) / 2 + dx * 0.2).toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}`; }
  else for (let i = 1; i < pts2.length; i++) d += `L${pts2[i][0].toFixed(1)},${pts2[i][1].toFixed(1)}`;
  return `<g class="tarw ${cls}">${title ? `<title>${esc(title)}</title>` : ""}<path class="cs" d="${d}"/><path class="ln" d="${d}" marker-end="url(#tah-${cls.split(" ")[0]})"/></g>`;
}
const TARW_DEFS = `${[["pl", "#f3c969"], ["mv", "#cfe3f5"], ["en", "#ff5a42"], ["pv", "#fff2b0"]].map(([id, c]) => `<marker id="tah-${id}" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="3.2" markerHeight="3.2" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="${c}" stroke="#140c06" stroke-width="1"/></marker>`).join("")}`;
// Setas padrão: suas ordens (amarelo = ataque, azul-claro = movimento) e os ataques planejados pelo inimigo (vermelho tracejado)
function tpArrowList(g){
  const out = [], F = k => frontFala(g, "tropas", k);
  for (const a of tpArmies(g)){ const o = a.order; if (!o || !o.to) continue;
    if (a.side === "enemy" && o.type !== "atacar") continue;
    out.push({ id: a.id, pts: [a.reg].concat(o.path && o.path.length ? o.path : [o.to]), cls: a.side === "enemy" ? "en" : o.type === "atacar" ? "pl" : "mv",
      title: `${tpName(g, a)}: ${F(o.type === "atacar" ? "ordemAtaca" : "ordemVai")} ${regName(o.to)}` }); }
  return out;
}
// Camadas dos exércitos: { targets, arrows, chips }. opts: tpSel, tpPend, tpArmies (lista própria, na animação), tpArrows, tpHot (regiões em batalha)
function tpMapLayers(g, opts){
  const out = { targets: "", arrows: "", chips: "" }; if (!g.war || !g.war.armies) return out;
  const armies = opts.tpArmies || tpArmies(g), sel = opts.tpSel ? tpById(g, opts.tpSel) : null, k = TCHIP_K();
  if (opts.tpHot) for (const id of opts.tpHot){ const R = REG_DATA.regs[id]; if (R) out.targets += `<path class="thot" d="${R.d}"/>`; }
  if (sel && sel.side === "player" && !opts.static){
    const R0 = REG_DATA.regs[sel.reg]; if (R0) out.targets += `<path class="tsrc" d="${R0.d}"/>`;
    for (const t of tpTargets(g, sel)){
      const R = REG_DATA.regs[t.to], pend = opts.tpPend === t.to, atk = t.type === "atacar";
      const c = atk ? Math.round(tpChance(g, sel, t.to).chance * 100) : null, F = x => frontFala(g, "tropas", x);
      const lbl = `${regName(t.to)}: ${F(atk ? (t.empty ? "ocupar" : "atacar") : t.type)}${atk ? ` · ${F("chance")} ${c}%` : ""}`;
      out.targets += `<path class="uf rg ttg ${t.type}${pend ? " pend" : ""}" data-rg="${t.to}" data-uf="${R.uf}" d="${R.d}"><title>${esc(lbl)}</title></path>`;
      const busy = armies.some(a => a.reg === t.to), x = R.lx + (busy ? 30 * k : 0), y = R.ly + (busy ? 4 * k : 0);
      out.chips += `<g class="tpct ${atk ? tpChanceCls(c) : "mv"}${pend ? " pend" : ""}" data-rg="${t.to}" data-uf="${R.uf}" tabindex="0" role="button" aria-label="${esc(lbl)}" transform="translate(${x.toFixed(1)},${y.toFixed(1)}) scale(${k})"><title>${esc(lbl)}</title>
        <rect x="${atk ? -15 : -9}" y="-7.5" width="${atk ? 30 : 18}" height="15" rx="7.5"/><text y="0.6">${atk ? c + "%" : t.type === "juntar" ? "+" : "➜"}</text></g>`;
    }
    if (opts.tpPend){ const t = tpTargets(g, sel).find(x => x.to === opts.tpPend); if (t) out.arrows += tpArrowSVG([sel.reg].concat(t.path), "pv"); }
  }
  for (const A of (opts.tpArrows || tpArrowList(g))) if (!(sel && A.id === sel.id && opts.tpPend)) out.arrows += tpArrowSVG(A.pts, A.cls, A.title);
  // fichas: inimigas embaixo, as suas por cima; a selecionada por último
  const order = armies.slice().sort((a, b) => (a.side === "player") - (b.side === "player") || ((sel && a.id === sel.id) - (sel && b.id === sel.id)));
  const pct = out.chips; out.chips = "";
  for (const a of order) out.chips += tpChipSVG(g, a, { sel: sel && sel.id, dim: !!sel });
  out.chips += pct;
  return out;
}
function frontLegendHTML(g){
  const F = k => frontFala(g, "tropas", k), arw = (c, dash) => `<svg viewBox="0 0 30 12" width="30" height="12"><path d="M2,6H22" stroke="#140c06" stroke-width="6"/><path d="M2,6H22" stroke="${c}" stroke-width="3.6"${dash ? ' stroke-dasharray="5 3"' : ""}/><path d="M21,1L29,6L21,11z" fill="${c}"/></svg>`;
  return `<div class="milleg fleg" aria-hidden="true">
    <span><svg viewBox="-20 -11 40 22" width="34" height="18"><g class="tchip p"><rect class="bg" x="-19" y="-10" width="38" height="20" rx="3"/><rect class="sym" x="-16" y="-5.5" width="10" height="8"/><path class="sym" d="M-16,-5.5L-6,2.5M-16,2.5L-6,-5.5"/><text class="cn" x="6.5" y="0.5">40</text></g></svg>${esc(F("legSeu"))}</span>
    <span><svg viewBox="-20 -11 40 22" width="34" height="18"><g class="tchip e"><rect class="bg" x="-19" y="-10" width="38" height="20" rx="3"/><path class="sym" d="M-11,-7L-5,-1.5L-11,4L-17,-1.5z"/><text class="cn" x="6.5" y="0.5">35</text></g></svg>${esc(F("legInimigo"))}</span>
    <span><svg viewBox="-16 -8 32 16" width="30" height="15"><g class="tpct good"><rect x="-15" y="-7.5" width="30" height="15" rx="7.5"/><text y="0.6">65%</text></g></svg>${esc(F("legAlvo"))}</span>
    <span>${arw("#f3c969")}${esc(F("atacar"))}</span><span>${arw("#cfe3f5")}${esc(F("mover"))}</span><span>${arw("#ff5a42", true)}${esc(F("legPlano"))}</span>
    <span><svg viewBox="0 0 30 10" width="30" height="10"><path d="M2,5H28" stroke="#1a0b06" stroke-width="7"/><path d="M2,5H28" stroke="#ff6a3d" stroke-width="3.6" stroke-dasharray="5 3"/></svg>linha de frente</span>
    <span><svg viewBox="-7 -7 14 14" width="13" height="13"><path d="M0,-6.5L1.9,-2L6.6,-2L2.8,1L4.2,5.8L0,3L-4.2,5.8L-2.8,1L-6.6,-2L-1.9,-2z" fill="#f3c969" stroke="#1a1408"/></svg>sua capital</span>
    <span><svg viewBox="-10 -10 20 20" width="15" height="15"><path d="M0,-9.4L2.8,-2.9L9.6,-2.9L4.1,1.5L6.1,8.4L0,4.4L-6.1,8.4L-4.1,1.5L-9.6,-2.9L-2.8,-2.9z" fill="#e0412f" stroke="#fff" stroke-width="1.4"/></svg>capital inimiga (vitória)</span>
    <span><svg viewBox="0 0 30 10" width="30" height="10"><path d="M2,5H23" stroke="#ffe08a" stroke-width="1.8" stroke-dasharray="3 3"/><path d="M22,1.5L29,5L22,8.5z" fill="#ffe08a"/></svg>caminho mais curto até a capital inimiga</span>
    ${g && g.reg ? regLegendHTML(g) : ""}</div>`;
}
