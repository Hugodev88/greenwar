// Gera js/data/mapa-regioes.js: as 133 regiões geográficas intermediárias do IBGE (2017), na MESMA projeção do mapa dos estados
// (tools/build-map.js), com fronteiras compartilhadas simplificadas uma vez só (sem frestas entre vizinhos), vizinhança e capitais.
// Fonte: IBGE — API de malhas v3 (qualidade mínima) e API de localidades v1. Uso:
//   curl -o tools/ibge-ri.json "https://servicodados.ibge.gov.br/api/v3/malhas/paises/BR?intrarregiao=regiao-intermediaria&qualidade=minima&formato=application/vnd.geo%2Bjson"
//   curl -o tools/ibge-ri-nomes.json "https://servicodados.ibge.gov.br/api/v1/localidades/regioes-intermediarias"
//   node tools/build-regioes.js        (os dois .json baixados não vão para o repositório)
const fs = require("fs"), path = require("path");
const G = JSON.parse(fs.readFileSync(process.argv[2] || path.join(__dirname, "ibge-ri.json"), "utf8"));
const NAMES = JSON.parse(fs.readFileSync(process.argv[3] || path.join(__dirname, "ibge-ri-nomes.json"), "utf8"));
const K = 15, C = Math.cos(14*Math.PI/180), X0 = -74.2, Y0 = 5.6, TOL = +(process.env.TOL || 0.45);
const proj = ([lon,lat]) => [(lon - X0)*K*C, (Y0 - lat)*K];
// capitais estaduais (lon, lat): a região que contém a capital desempata o controle do estado
const CAPS = { AC:[-67.81,-9.975], AL:[-35.735,-9.665], AP:[-51.07,0.034], AM:[-60.022,-3.119], BA:[-38.51,-12.97], CE:[-38.52,-3.73], DF:[-47.88,-15.79],
  ES:[-40.34,-20.32], GO:[-49.25,-16.68], MA:[-44.30,-2.53], MT:[-56.10,-15.60], MS:[-54.62,-20.47], MG:[-43.94,-19.92], PA:[-48.50,-1.456], PB:[-34.86,-7.12],
  PR:[-49.27,-25.43], PE:[-34.88,-8.05], PI:[-42.80,-5.09], RJ:[-43.17,-22.91], RN:[-35.21,-5.79], RS:[-51.23,-30.03], RO:[-63.90,-8.76], RR:[-60.67,2.82],
  SC:[-48.55,-27.59], SP:[-46.63,-23.55], SE:[-37.07,-10.91], TO:[-48.33,-10.18] };
const nameOf = {}, ufOf = {}; for (const r of NAMES){ nameOf[r.id] = r.nome; ufOf[r.id] = r.UF.sigla; }
const pk = p => p[0] + "," + p[1];
const rings = []; // { id, pts:[[lon,lat]] }
for (const f of G.features){ const id = String(f.properties.codarea); const polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
  for (const poly of polys){ let r = poly[0].slice(); if (pk(r[0]) === pk(r[r.length-1])) r.pop(); rings.push({ id, pts: r }); } }
// dono de cada aresta (não orientada)
const ek = (a, b) => { const x = pk(a), y = pk(b); return x < y ? x + "|" + y : y + "|" + x; };
const own = new Map();
for (const R of rings) for (let i = 0; i < R.pts.length; i++){ const k = ek(R.pts[i], R.pts[(i+1) % R.pts.length]); if (!own.has(k)) own.set(k, new Set()); own.get(k).add(R.id); }
const ownS = (a, b) => [...own.get(ek(a, b))].sort().join(",");
function dp(pts, tol){ if (pts.length < 3) return pts;
  const a = pts[0], b = pts[pts.length-1]; let md = 0, mi = 0;
  for (let i = 1; i < pts.length-1; i++){ const p = pts[i], dx = b[0]-a[0], dy = b[1]-a[1], L = Math.hypot(dx, dy);
    const d = L < 1e-9 ? Math.hypot(p[0]-a[0], p[1]-a[1]) : Math.abs(dy*p[0]-dx*p[1]+b[0]*a[1]-b[1]*a[0])/L; if (d > md){ md = d; mi = i; } }
  if (md <= tol) return [a, b];
  return dp(pts.slice(0, mi+1), tol).slice(0, -1).concat(dp(pts.slice(mi), tol)); }
const arcCache = new Map(), arcs = []; // arcs: { pts(xy simplificados), owners }
function arcFor(raw){ // raw: [[lon,lat]...] (orientado); devolve pontos simplificados na mesma orientação
  const f = pk(raw[0]), l = pk(raw[raw.length-1]);
  let rev = f > l || (f === l && pk(raw[1]) > pk(raw[raw.length-2]));
  const can = rev ? raw.slice().reverse() : raw, key = can.map(pk).join(";").length + ":" + pk(can[0]) + ";" + pk(can[1]) + ";" + pk(can[can.length-1]);
  let A = arcCache.get(key);
  if (!A){ const xy = can.map(proj); let s;
    if (f === l){ const h = Math.floor(xy.length / 2); s = dp(xy.slice(0, h+1), TOL).slice(0, -1).concat(dp(xy.slice(h), TOL)); }
    else s = dp(xy, TOL);
    A = { pts: s, owners: ownS(can[0], can[1]) }; arcCache.set(key, A); arcs.push(A); }
  return rev ? A.pts.slice().reverse() : A.pts;
}
const area = r => { let s = 0; for (let i = 0; i < r.length; i++){ const [x1,y1] = r[i], [x2,y2] = r[(i+1) % r.length]; s += x1*y2 - x2*y1; } return s / 2; };
const out = {}; let maxX = 0, maxY = 0;
const big = {}; // maior anel de cada região (xy, para rótulo e capital)
for (const R of rings){
  const P = R.pts, n = P.length; const sig = i => ownS(P[i], P[(i+1) % n]);
  const junc = []; for (let i = 0; i < n; i++) if (sig((i - 1 + n) % n) !== sig(i)) junc.push(i);
  let pieces = [];
  if (!junc.length) pieces.push(P.concat([P[0]]));
  else for (let j = 0; j < junc.length; j++){ const a = junc[j], b = junc[(j+1) % junc.length]; const seg = []; for (let i = a; ; i = (i+1) % n){ seg.push(P[i]); if (i === b && seg.length > 1) break; } pieces.push(seg); }
  let ring = []; for (const s of pieces){ const q = arcFor(s); ring = ring.concat(ring.length ? q.slice(1) : q); }
  if (ring.length > 1 && pk(ring[0]) === pk(ring[ring.length-1])) ring.pop();
  const xyFull = P.map(proj), A = Math.abs(area(xyFull));
  if (!big[R.id] || A > big[R.id].A) big[R.id] = { A, ring: xyFull };
  if (ring.length < 3) continue;
  const o = (out[R.id] ||= { n: nameOf[R.id], uf: ufOf[R.id], d: "", A: 0 });
  if (A < 2 && rings.filter(x => x.id === R.id).length > 1) continue; // ilhotas
  o.d += "M" + ring.map(p => p[0].toFixed(1) + "," + p[1].toFixed(1)).join("L") + "Z"; o.A += A;
  ring.forEach(([x, y]) => { maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); });
}
const inside = (p, r) => { let c = false; for (let i = 0, j = r.length-1; i < r.length; j = i++){ const [xi,yi] = r[i], [xj,yj] = r[j]; if ((yi > p[1]) !== (yj > p[1]) && p[0] < (xj-xi)*(p[1]-yi)/(yj-yi)+xi) c = !c; } return c; };
const dseg = (p, a, b) => { const dx = b[0]-a[0], dy = b[1]-a[1], L = dx*dx+dy*dy; let u = L ? ((p[0]-a[0])*dx+(p[1]-a[1])*dy)/L : 0; u = Math.max(0, Math.min(1, u)); return Math.hypot(a[0]+u*dx-p[0], a[1]+u*dy-p[1]); };
// rótulo: ponto interno mais longe da borda (grade simples no maior anel)
for (const id in out){ const r = big[id].ring; let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; r.forEach(([x,y]) => { x0 = Math.min(x0,x); y0 = Math.min(y0,y); x1 = Math.max(x1,x); y1 = Math.max(y1,y); });
  let best = null, bd = -1; const st = Math.max(0.4, Math.min(x1-x0, y1-y0) / 24);
  for (let x = x0; x <= x1; x += st) for (let y = y0; y <= y1; y += st){ if (!inside([x,y], r)) continue; let d = 1e9; for (let i = 0; i < r.length; i++) d = Math.min(d, dseg([x,y], r[i], r[(i+1)%r.length])); if (d > bd){ bd = d; best = [x,y]; } }
  best = best || r[0]; out[id].lx = +best[0].toFixed(1); out[id].ly = +best[1].toFixed(1); }
// vizinhança: arestas compartilhadas com comprimento > 0,3 px (inclui vizinhos de outro estado)
const shared = {};
for (const [k, s] of own){ if (s.size < 2) continue; const [a, b] = k.split("|").map(t => proj(t.split(",").map(Number))); const L = Math.hypot(a[0]-b[0], a[1]-b[1]); const ids = [...s].sort(); const key = ids.join("|"); shared[key] = (shared[key] || 0) + L; }
for (const id in out) out[id].adj = [];
for (const key in shared){ if (shared[key] < 0.3) continue; const [a, b] = key.split("|"); if (out[a] && out[b]){ out[a].adj.push(b); out[b].adj.push(a); } }
for (const id in out) out[id].adj.sort();
// capital de cada estado
const capOf = {};
for (const uf in CAPS){ const p = proj(CAPS[uf]); let best = null, bd = 1e9;
  for (const id in out){ if (out[id].uf !== uf) continue; const rr = rings.filter(x => x.id === id).map(x => x.pts.map(proj));
    if (rr.some(r => inside(p, r))){ best = id; bd = 0; break; }
    for (const r of rr) for (let i = 0; i < r.length; i++){ const d = dseg(p, r[i], r[(i+1)%r.length]); if (d < bd){ bd = d; best = id; } } }
  capOf[uf] = best; }
// fronteiras estaduais e litoral (arcos entre regiões de estados diferentes, ou de uma região só) — desenhadas por cima na guerra
let sb = ""; for (const A of arcs){ const ow = A.owners.split(","); if (ow.length === 1 || ufOf[ow[0]] !== ufOf[ow[1]]) sb += "M" + A.pts.map(p => p[0].toFixed(1) + "," + p[1].toFixed(1)).join("L"); }
const regs = {}; for (const id of Object.keys(out).sort()){ const o = out[id]; regs[id] = { n: o.n, uf: o.uf, d: o.d, lx: o.lx, ly: o.ly, adj: o.adj }; }
const data = { size: [Math.ceil(maxX), Math.ceil(maxY)], regs, cap: capOf, sb };
const js = "// js/data/mapa-regioes.js — As 133 regiões geográficas intermediárias do IBGE (divisão regional de 2017), usadas só na GUERRA (2022).\n" +
  "// Fonte: IBGE — API de malhas v3 (regiao-intermediaria, qualidade mínima) e API de localidades v1. Mesma projeção de mapa-brasil.js.\n" +
  "// Gerada por tools/build-regioes.js. Não edite à mão. regs: { id: { n: nome, uf, d: caminho SVG, lx/ly: rótulo, adj: vizinhas } }, cap: região da capital de cada UF, sb: fronteiras estaduais.\n" +
  "const REG_DATA = " + JSON.stringify(data) + ";\n";
fs.writeFileSync(path.join(__dirname, "..", "js", "data", "mapa-regioes.js"), js);
console.log("regiões", Object.keys(regs).length, "arcos", arcs.length, "bytes", js.length, "size", data.size, "TOL", TOL);
console.log("capitais", JSON.stringify(capOf));
const iso = Object.keys(regs).filter(id => !regs[id].adj.length); if (iso.length) console.log("SEM VIZINHOS", iso);
