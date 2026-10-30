// js/core/frentes.js — Núcleo: guerra por frentes (2022, estilo Victoria 3 simplificado): linha de frente, posturas, tropas, generais, ofensiva especial. Sem DOM.
/* Só vale quando o cenário tem "frentes" (js/data/2022/frentes.js). O 1964 segue com exércitos e ordens (js/core/ordens.js).
   Estado salvo em g.war (save v8):
     reserve  tropas sem frente (fora da guerra ficam na capital)
     fronts   [{ id (facção inimiga), troops, posture, morale, supply, enemy, emorale, eposture, progress, special, n, last }]
     gens     { idDoGeneral: idDaFrente }      offAt  mês a partir do qual a ofensiva especial está liberada
     log      relatórios dos últimos meses (o "por que a linha andou")
   Em modo frentes, g.armies fica vazio e as funções antigas (sideStr, addPlayerStrength, recruitArmy, syncMilitary, planEnemy…)
   desviam para cá. A linha anda pela razão de forças; a cada ±100 de avanço um estado muda de lado. */
const FRONT_POSTURES = ["avancar", "segurar", "recuar"];
function frontCfg(g){ const sc = g && scOf(g); return (sc && sc.frentes) || null; }
function frontMode(g){ return !!(g && g.war && frontCfg(g)); }
function frontFala(g, grp, k){ const F = frontCfg(g).falas; return (F[grp] && F[grp][k]) || k; }
function frontName(g, f){ return frontFala(g, "nome", f.id || f); }
function frontNew(g, reserve){ return { reserve: Math.max(0, Math.round(reserve || 0)), fronts: [], gens: {}, offAt: null, log: [] }; }
function frontPool(g){ const W = g.war; return W ? W.reserve + W.fronts.reduce((s, f) => s + f.troops, 0) : 0; }
function frontById(g, id){ return (g.war && g.war.fronts.find(f => f.id === id)) || null; }
function frontEnemyScale(g){ const K = frontCfg(g), C = scOf(g).campaign; return (C.enemyPower ?? K.poderBase) / K.poderBase; }
function frontMaxMorale(g){ const M = frontCfg(g).moralMax, K = scOf(g).campaign.keys, mil = g.stats[K.mil] ?? 50;
  return Math.round(clamp(M.base + natLoyalty(g) * M.lealdade + (mil - 50) * M.militar, M.min, 100)); }
const FRONT_DIST = {};
function frontDist(from){ // distância (em estados) de cada UF até "from"
  if (FRONT_DIST[from]) return FRONT_DIST[from];
  const d = { [from]: 0 }, q = [from];
  while (q.length){ const u = q.shift(); for (const n of ADJ[u]) if (!(n in d)){ d[n] = d[u] + 1; q.push(n); } }
  return (FRONT_DIST[from] = d);
}
// A que frente pertence um estado em disputa: a do inimigo com mais vizinhos (empate: a primeira frente aberta)
function frontOfUF(g, uf){
  const W = g.war; if (!W || !W.fronts.length) return null;
  let best = W.fronts[0].id, bn = 0;
  for (const f of W.fronts){ const n = ADJ[uf].filter(x => g.control[x] === f.id).length; if (n > bn){ bn = n; best = f.id; } }
  return best;
}
function frontSide(g, uf){ return sideOf(g, g.control[uf], phaseOf(g)); }
// Estados do seu lado encostados nesta frente (onde as tropas ficam) e do lado inimigo encostados em você
function frontBorder(g, f, side){
  const C = scOf(g).campaign, ph = phaseOf(g), mine = [], theirs = [];
  for (const uf in g.control){
    const s = sideOf(g, g.control[uf], ph);
    const isF = n => g.control[n] === f.id || (g.control[n] === C.contested && frontOfUF(g, n) === f.id);
    if (s === "player" && ADJ[uf].some(isF)) mine.push(uf);
    else if (isF(uf) && ADJ[uf].some(n => sideOf(g, g.control[n], ph) === "player")) theirs.push(uf);
  }
  return side === "enemy" ? theirs : mine;
}
// Próximo estado a mudar de lado: dir +1 (você avança, rumo ao reduto inimigo) ou −1 (o inimigo avança, rumo à sua capital)
function frontTarget(g, f, dir){
  const K = frontCfg(g), C = scOf(g).campaign, ph = phaseOf(g);
  const pl = n => sideOf(g, g.control[n], ph) === "player";
  const cont = uf => g.control[uf] === C.contested && frontOfUF(g, uf) === f.id;
  const all = Object.keys(g.control);
  const byW = (a, b) => (UF_WEIGHT[b] || 1) - (UF_WEIGHT[a] || 1) || (a < b ? -1 : 1);
  if (dir > 0){
    const D = frontDist(K.frentes[f.id].reduto);
    let c = all.filter(uf => (cont(uf) || g.control[uf] === f.id) && ADJ[uf].some(pl));
    if (!c.length) c = all.filter(cont);
    if (!c.length) c = all.filter(uf => g.control[uf] === f.id && ADJ[uf].some(cont));
    return c.sort((a, b) => (D[a] ?? 99) - (D[b] ?? 99) || cont(b) - cont(a) || byW(a, b))[0] || null;
  }
  const D = frontDist(K.capital);
  let c = all.filter(uf => cont(uf) && ADJ[uf].some(n => g.control[n] === f.id));
  if (!c.length) c = all.filter(uf => pl(uf) && ADJ[uf].some(n => g.control[n] === f.id || cont(n)));
  return c.sort((a, b) => (D[a] ?? 99) - (D[b] ?? 99) || (a < b ? -1 : 1))[0] || null;
}
function frontTerrain(uf){ const T = uf && TERRAIN_TYPES[TERRAIN[uf]]; return T && T.def ? T.def : 0; }
/* ---------- Abrir / fechar frentes conforme o mapa ---------- */
function syncFronts(g){
  const W = g.war, K = frontCfg(g), ph = phaseOf(g);
  if (!W || !K) return;
  if (ph.noArmies){ W.reserve = 0; W.fronts = []; W.gens = {}; return; }
  if (!ph.war){ if (W.fronts.length){ W.reserve += W.fronts.reduce((s, f) => s + f.troops, 0); W.fronts = []; W.gens = {}; } return; }
  for (const fac of Object.keys(K.frentes)){
    if (!(ph.enemy || []).includes(fac)) continue;
    const n = Object.values(g.control).filter(x => x === fac).length, f = frontById(g, fac);
    if (n && !f) frontOpen(g, fac, n);
    else if (!n && f) frontClose(g, f);
    else if (f && n > f.n){ f.enemy = Math.round(f.enemy + (n - f.n) * K.frentes[fac].porEstado * frontEnemyScale(g)); f.n = n; }
    else if (f) f.n = n;
  }
}
function frontOpen(g, fac, n, troops){
  const W = g.war, K = frontCfg(g), D = K.frentes[fac], first = !W.fronts.length;
  const pool = frontPool(g), take = first ? W.reserve : Math.round(pool * 0.35);
  const f = { id: fac, troops: 0, posture: "segurar", morale: Math.min(70, frontMaxMorale(g)), supply: 80,
    enemy: Math.round(troops ?? (D.tropas + D.porEstado * n) * frontEnemyScale(g)), emorale: 65, eposture: "segurar",
    progress: 0, special: false, n, opened: g.month, last: null };
  if (first){ W.reserve = 0; f.troops = take; }
  else { let left = take; for (const o of W.fronts){ const d = Math.round(take * o.troops / Math.max(1, pool - W.reserve)); o.troops -= d; left -= d; } f.troops = take - left; }
  W.fronts.push(f);
  if (W.offAt == null) W.offAt = g.month + K.ofensiva.primeira;
  const free = K.generais.find(x => !W.gens[x.id] && (x.traco === (fac === "separatista" ? "defensivo" : "agressivo"))) || K.generais.find(x => !W.gens[x.id]);
  if (free) W.gens[free.id] = fac;
  frontPlan(g);
  (g.warNews ||= []).push(gfmt(frontFala(g, "eventos", "abriu"), frontName(g, f), frontFala(g, "inimigo", fac)));
  return f;
}
function frontClose(g, f){
  const W = g.war; W.fronts = W.fronts.filter(x => x !== f);
  if (W.fronts.length) W.fronts[0].troops += f.troops; else W.reserve += f.troops;
  for (const id in W.gens) if (W.gens[id] === f.id){ const other = W.fronts.find(x => !frontGen(g, x)); W.gens[id] = other ? other.id : null; }
  (g.warNews ||= []).push(gfmt(frontFala(g, "eventos", "fechou"), frontName(g, f)));
}
/* ---------- Tropas ---------- */
function frontAdd(g, n, morale){ // reparte tropas novas entre as frentes (proporcional ao que cada uma já tem)
  const W = g.war; if (!W || !n) return 0;
  if (n < 0){ let left = -n; const tot = W.fronts.reduce((s, f) => s + f.troops, 0);
    for (const f of W.fronts){ const d = Math.min(f.troops, Math.round(-n * f.troops / Math.max(1, tot))); f.troops -= d; left -= d; }
    if (left > 0){ const d = Math.min(W.reserve, left); W.reserve -= d; left -= d; }
    for (const f of W.fronts) if (left > 0){ const d = Math.min(f.troops, left); f.troops -= d; left -= d; }
    return n;
  }
  if (phaseOf(g).noArmies) return 0;
  if (!W.fronts.length){ W.reserve += n; return n; }
  const tot = W.fronts.reduce((s, f) => s + f.troops, 0); let left = n;
  W.fronts.forEach((f, i) => { const d = i === W.fronts.length - 1 ? left : Math.round(n * (tot ? f.troops / tot : 1 / W.fronts.length)); left -= d;
    if (morale != null && f.troops + d > 0) f.morale = Math.round((f.morale * f.troops + morale * d) / (f.troops + d)); f.troops += d; });
  return n;
}
// Divisão das tropas entre 2 frentes: pct = % da primeira frente
function setFrontSplit(g, pct){
  const W = g.war; if (!W || W.fronts.length < 2) return { ok: false, msg: "Só há uma frente." };
  const tot = W.fronts.reduce((s, f) => s + f.troops, 0), p = clamp(Math.round(pct / 5) * 5, 10, 90);
  W.fronts[0].troops = Math.round(tot * p / 100); W.fronts[1].troops = tot - W.fronts[0].troops;
  return { ok: true, msg: `Tropas divididas: ${p}% / ${100 - p}%.` };
}
function frontSplitPct(g){ const W = g.war; if (!W || W.fronts.length < 2) return 100; const tot = W.fronts.reduce((s, f) => s + f.troops, 0); return tot ? Math.round(W.fronts[0].troops / tot * 100) : 50; }
// Divisão sugerida: proporcional à força inimiga de cada frente
function frontAutoSplit(g){
  const W = g.war; if (!W || W.fronts.length < 2) return { ok: false, msg: "Só há uma frente." };
  const e = W.fronts.map(f => enemyForce(g, f, "segurar").total * (f.eposture === "avancar" ? 1.15 : 1));
  return setFrontSplit(g, e[0] / Math.max(1, e[0] + e[1]) * 100);
}
/* ---------- Generais ---------- */
function frontGen(g, f){ const K = frontCfg(g), W = g.war; const x = K.generais.find(x => W.gens[x.id] === f.id); return x || null; }
function setFrontGeneral(g, frontId, genId){
  const W = g.war, K = frontCfg(g), f = frontById(g, frontId), gen = K.generais.find(x => x.id === genId);
  if (!f || !gen) return { ok: false, msg: "General indisponível." };
  const cur = frontGen(g, f), from = W.gens[genId];
  if (cur && cur.id === genId) return { ok: true };
  if (cur) W.gens[cur.id] = from && from !== frontId ? from : null; // troca: o general atual vai para a frente de onde o outro saiu
  W.gens[genId] = frontId;
  return { ok: true, msg: `${(scOf(g).retratos.pessoas[gen.retrato] || {}).nome || gen.id} assume a ${frontName(g, f)}.` };
}
function frontGenName(g, gen){ const P = scOf(g).retratos && scOf(g).retratos.pessoas[gen.retrato]; return P ? P.nome : gen.id; }
/* ---------- Força ---------- */
// Seu poder numa frente com uma postura. rows: fatores multiplicativos (para o relatório)
function frontForce(g, f, posture, special){
  const K = frontCfg(g), C = scOf(g).campaign, KK = C.keys, rows = [];
  const add = (k, v) => { if (Math.abs(v - 1) >= 0.005) rows.push({ k, v }); return v; };
  let P = Math.max(0, f.troops);
  P *= add("moral", 0.4 + 0.6 * clamp(f.morale, 0, 100) / 100);
  P *= add("supr", 0.6 + 0.4 * clamp(f.supply, 0, 100) / 100);
  const gen = frontGen(g, f), T = gen ? K.tracos[gen.traco] : null;
  if (T) P *= add("general", 1 + (T[posture] || 0));
  P *= add("postura", posture === "segurar" ? K.defesaSegurar : posture === "recuar" ? 0.8 : 1);
  let m = 0;
  m += add("comando", 1 + clamp(((g.stats[KK.mil] ?? 50) - 50) / 200 + (natLoyalty(g) - 50) / 300, -0.3, 0.3)) - 1;
  m += add("apoio", 1 + clamp(((g.stats[KK.pop] ?? 50) - 50) / 150, -0.2, 0.2)) - 1;
  m += add("armas", 1 + armsAid(g)) - 1;
  m += add("cofres", g.money < 0 ? 0.8 : 1) - 1;
  if (special) m += add("ofensiva", K.ofensiva.mult) - 1;
  P *= Math.max(0.3, 1 + m);
  return { total: P, rows };
}
function enemyForce(g, f, posture){
  const K = frontCfg(g), D = K.frentes[f.id], C = scOf(g).campaign, rows = [];
  const add = (k, v) => { if (Math.abs(v - 1) >= 0.005) rows.push({ k, v }); return v; };
  let E = Math.max(0, f.enemy);
  E *= add("moral", 0.4 + 0.6 * clamp(f.emorale, 0, 100) / 100);
  const T = K.tracos[D.traco]; if (T) E *= add("general", 1 + (T[posture] || 0));
  if (f.eSpecial && posture === "avancar") E *= add("ofensiva", K.ofensiva.inimiga.mult);
  if (posture === "recuar") E *= add("postura", 0.8);
  let m = 0;
  m += add("dificuldade", 1 + ((C.enemyPower ?? 1) - 1) * 0.3) - 1;
  if (f.id === (phaseOf(g).enemyMain || f.id)) m += add("estrangeiro", 1 + 0.12 * foreignFoes(g) + 0.05 * (g.enemyBoost || 0)) - 1;
  m += add("sancoes", 1 - 0.15 * malusNow(g)) - 1;
  E *= Math.max(0.3, 1 + m);
  return { total: E, rows };
}
// Plano do inimigo para o próximo mês (fica visível para você reagir)
function frontPlan(g){
  if (!frontMode(g)) return;
  const K = frontCfg(g);
  for (const f of g.war.fronts){
    const D = K.frentes[f.id], P = frontForce(g, f, "segurar").total, E = enemyForce(g, f, "avancar").total, r = E / Math.max(1, P);
    f.eposture = f.emorale < 28 ? "recuar" : r >= D.ataca || (r >= D.ataca * 0.9 && rnd(g) < 0.3) ? "avancar" : "segurar";
    const O = K.ofensiva.inimiga; f.eSpecial = false;
    if (O && !(g.ceasefire > 0) && f.emorale >= 40 && g.month >= (f.eOffAt ?? (f.opened || 0) + O.primeira) && r >= O.minRazao && rnd(g) < O.chance){
      f.eposture = "avancar"; f.eSpecial = true; f.eOffAt = g.month + O.intervalo; }
  }
}
// Sugestão (usada pela conselheira, pelo comando automático e pela tela)
function frontAdvice(g, f){
  const K = frontCfg(g);
  if (f.morale < 25 || ((f.morale < 38 || f.supply < 30) && f.eposture !== "avancar")) return { posture: "recuar", why: "moral" };
  if (f.eSpecial) return { posture: "segurar", why: "ofensivaInimiga", ratio: frontForce(g, f, "segurar").total / Math.max(1, enemyForce(g, f, "avancar").total) };
  const tgt = frontTarget(g, f, 1), red = tgt && tgt === K.frentes[f.id].reduto ? K.reduto : 1;
  const Pa = frontForce(g, f, "avancar").total, Ea = enemyForce(g, f, f.eposture === "recuar" ? "recuar" : "segurar").total * (f.eposture === "avancar" ? 1 : K.defesaInimiga * (1 + frontTerrain(tgt)) * red);
  if (Pa / Math.max(1, Ea) >= 1.15 && f.morale >= 42 && f.supply >= 30) return { posture: "avancar", why: "forte", ratio: Pa / Math.max(1, Ea) };
  return { posture: "segurar", why: "fraco", ratio: Pa / Math.max(1, Ea) };
}
function setFrontPosture(g, id, p){
  const f = frontById(g, id); if (!f || !FRONT_POSTURES.includes(p)) return { ok: false, msg: "Postura inválida." };
  if (f.special && p !== "avancar") return { ok: false, msg: "Cancele a ofensiva especial antes de mudar a postura." };
  f.posture = p; return { ok: true, msg: `${frontName(g, f)}: ${frontFala(g, "postura", p)}.` };
}
// Comando automático (modo simples / "ordens automáticas"): postura sugerida em cada frente e divisão das tropas
function frontAuto(g, mode){
  if (!frontMode(g)) return { ok: true, n: 0 };
  let n = 0;
  if ((mode || "auto") === "auto" && g.war.fronts.length > 1) frontAutoSplit(g);
  for (const f of g.war.fronts){ if (f.special) continue; let p = frontAdvice(g, f).posture; if (mode === "defender" && p === "avancar") p = "segurar"; if (f.posture !== p){ f.posture = p; n++; } }
  return { ok: true, n };
}
/* ---------- Recrutar e ofensiva especial ---------- */
function frontRecruitState(g){
  const K = frontCfg(g).recruta, ph = phaseOf(g);
  if (g.ended) return { ok: false, msg: "Partida encerrada." };
  if (g.queue.length) return { ok: false, msg: "Resolva os eventos pendentes na aba História." };
  if (ph.noArmies) return { ok: false, msg: "Nesta fase você não comanda tropas." };
  if ((+g.used._recruit || 0) >= K.porMes) return { ok: false, msg: `Já recrutou ${K.porMes} vezes neste mês. Encerre o mês para recrutar de novo.` };
  if (g.money < K.custo) return { ok: false, msg: `Faltam recursos: precisa de ${K.custo} (tem ${Math.floor(g.money)}).` };
  return { ok: true, cost: K.custo };
}
function frontRecruit(g){
  const st = frontRecruitState(g); if (!st.ok) return st;
  const K = frontCfg(g).recruta;
  g.money -= st.cost; g.used._recruit = (+g.used._recruit || 0) + 1;
  frontAdd(g, K.forca, K.moral);
  return { ok: true, msg: `+${K.forca} de tropas recrutadas (−${st.cost}). Elas entram nas frentes já neste mês.` };
}
function offensiveState(g, id){
  const K = frontCfg(g).ofensiva, f = frontById(g, id);
  if (!f || !phaseOf(g).war) return { ok: false, msg: "Sem frente ativa." };
  if (g.war.fronts.some(x => x.special)) return { ok: false, msg: "Já há uma ofensiva especial marcada para este mês." };
  if (g.ceasefire > 0) return { ok: false, msg: "Trégua em vigor." };
  if (g.month < (g.war.offAt ?? 0)) return { ok: false, wait: g.war.offAt - g.month, msg: `Disponível em ${g.war.offAt - g.month} ${g.war.offAt - g.month === 1 ? "mês" : "meses"}.` };
  if (f.morale < 30) return { ok: false, msg: "Moral baixa demais para uma ofensiva." };
  if (g.money < K.custo) return { ok: false, msg: `Faltam recursos: precisa de ${K.custo}.` };
  return { ok: true, cost: K.custo };
}
function launchOffensive(g, id){
  const st = offensiveState(g, id); if (!st.ok) return st;
  const f = frontById(g, id); g.money -= st.cost; f.special = true; f.prevPosture = f.posture; f.posture = "avancar";
  return { ok: true, msg: gfmt(frontFala(g, "eventos", "ofensiva"), frontName(g, f)) };
}
function cancelOffensive(g, id){
  const f = frontById(g, id); if (!f || !f.special) return { ok: false };
  f.special = false; f.posture = f.prevPosture || "segurar"; g.money += frontCfg(g).ofensiva.custo; return { ok: true, msg: "Ofensiva cancelada (recursos devolvidos)." };
}
/* ---------- O mês na frente ---------- */
function frontFlip(g, f, uf, dir){
  const C = scOf(g).campaign, ph = phaseOf(g), from = g.control[uf];
  const to = dir > 0 ? (ph.playerMain || ph.player[0]) : (from === C.contested ? f.id : C.contested);
  setControl(g, uf, to); if (dir < 0) g.war.lostAt = g.month;
  return { uf, from, to, side: dir > 0 ? "player" : "enemy" };
}
function frontClash(g, f, R){
  const K = frontCfg(g), D = K.frentes[f.id], PO = K.posturas;
  const p = f.special ? "avancar" : f.posture, e = f.eposture || "segurar";
  const tgtA = frontTarget(g, f, 1), tgtD = frontTarget(g, f, -1);
  const FP = frontForce(g, f, p, f.special), FE = enemyForce(g, f, e);
  let Pe = FP.total, Ee = FE.total;
  const rowsSit = [];
  const pA = p === "avancar", eA = e === "avancar";
  if (pA && !eA){ const t = 1 + frontTerrain(tgtA), red = tgtA === D.reduto ? K.reduto : 1, x = (e === "segurar" ? K.defesaInimiga : 1) * t * red;
    Ee *= x; rowsSit.push({ k: "terreno", side: "e", v: t * (e === "segurar" ? K.defesaInimiga : 1) }); if (red > 1) rowsSit.push({ k: "reduto", side: "e", v: red }); }
  if (eA && !pA){ const t = 1 + frontTerrain(tgtD), red = tgtD === K.capital ? K.reduto : 1;
    Pe *= t * red; rowsSit.push({ k: "terreno", side: "p", v: t }); if (red > 1) rowsSit.push({ k: "reduto", side: "p", v: red }); }
  const lr = Math.log(Math.max(1, Pe) / Math.max(1, Ee));
  const gen = frontGen(g, f), T = gen ? K.tracos[gen.traco] : {};
  const recuo = K.recuo - (T.recuo || 0);
  let d, why;
  if (pA && eA){ d = K.k * lr; why = "choque"; }
  else if (pA){ d = K.k * lr + (lr > 0 ? K.bonusAvanco : 0) + (e === "recuar" ? 10 : 0); d = Math.max(d, -8);
    why = e === "recuar" ? "inimigoRecuou" : d >= 40 ? "avancouForte" : d > 5 ? "avancouApertado" : "avancoTravado"; }
  else if (eA){ d = K.k * lr - (lr < 0 ? K.bonusAvanco : 0);
    if (p === "segurar"){ d = Math.min(d, 8); why = d >= -5 ? "segurou" : "segurouCedeu"; }
    else { d = Math.min(d, 0) - recuo; why = "recuouAtacado"; } }
  else { d = (p === "recuar" ? -recuo / 2 : 0) + (e === "recuar" ? K.recuo / 2 : 0); why = p === "recuar" ? "recuou" : e === "recuar" ? "inimigoRecuou" : "parado"; }
  const luck = (rnd(g) * 2 - 1) * K.ruido; d += luck;
  if (f.special){ if (d > 0) d *= K.ofensiva.avanco; why = d > 15 ? "ofensivaOk" : "ofensivaFalhou"; }
  d = Math.round(d); if (d <= -20) g.war.lostAt = g.month; // derrota feia também conta como "perdemos" (evento de pânico)
  // baixas e desgaste
  const rP = clamp(Ee / Math.max(1, Pe), 0.5, 2), rE = clamp(Pe / Math.max(1, Ee), 0.5, 2);
  let lossP = Math.round(f.troops * (PO[p].perdas + (eA ? 0.03 : 0)) * rP), lossE = Math.round(f.enemy * (PO[e].perdas + (pA ? 0.03 : 0)) * rE);
  const mx = frontMaxMorale(g);
  f.morale = clamp(f.morale + PO[p].moral + (pA ? (T.moralAtk || 0) : 0) + (d > 15 ? 4 : d < -25 ? -6 : 0), 5, Math.max(mx, Math.min(f.morale, 100)));
  if (f.morale > mx && PO[p].moral > 0) f.morale = Math.max(mx, f.morale - PO[p].moral);
  f.supply = clamp(f.supply + PO[p].supr + (T.supr || 0) + (g.money < 0 ? -15 : 0) + (armsAid(g) > 0 ? 5 : 0), 10, 100);
  if (f.special && why === "ofensivaFalhou"){ f.morale = clamp(f.morale + K.ofensiva.falhaMoral, 5, 100); lossP += Math.round(f.troops * K.ofensiva.falhaPerdas); }
  f.emorale = clamp(f.emorale + PO[e].moral * 0.8 + (d < -15 ? 4 : d > 25 ? -7 : 0), 10, 80);
  f.troops = Math.max(0, f.troops - lossP); f.enemy = Math.max(5, f.enemy - lossE);
  // a linha anda
  const prog0 = f.progress, moved = [];
  f.progress = clamp(f.progress + d, -150, 150);
  if (f.progress >= 100){ const uf = frontTarget(g, f, 1); if (uf){ moved.push(frontFlip(g, f, uf, 1)); f.progress = Math.min(f.progress - 100, 40); f.supply = Math.max(10, f.supply - 8); } else f.progress = 100; }
  else if (f.progress <= -100){ const uf = frontTarget(g, f, -1); if (uf){ moved.push(frontFlip(g, f, uf, -1)); f.progress = Math.max(f.progress + 100, -40); } else f.progress = -100; }
  const rows = [{ k: "tropas", p: Math.round(f.troops + lossP), e: Math.round(f.enemy + lossE) }];
  const merge = (list, side) => list.forEach(r => { let x = rows.find(y => y.k === r.k); if (!x){ x = { k: r.k }; rows.push(x); } x[side] = r.v; });
  merge(FP.rows, "p"); merge(FE.rows, "e");
  rowsSit.forEach(r => { let x = rows.find(y => y.k === r.k); if (!x){ x = { k: r.k }; rows.push(x); } x[r.side] = (x[r.side] || 1) * r.v; });
  if (Math.abs(luck) >= 1) rows.push({ k: "sorte", luck: Math.round(luck) });
  const rec = { month: g.month, front: f.id, p, e, special: !!f.special, P: Math.round(Pe), E: Math.round(Ee), d, prog0: Math.round(prog0), prog: Math.round(f.progress),
    moved, lossP, lossE, why, rows, troops: Math.round(f.troops), enemy: Math.round(f.enemy), morale: Math.round(f.morale), supply: Math.round(f.supply), gen: gen ? gen.id : null };
  if (f.eSpecial){ rec.eSpecial = true; if (d > -10){ f.emorale = clamp(f.emorale + K.ofensiva.inimiga.falhaMoral, 10, 80); if (R) R(gfmt(frontFala(g, "eventos", "ofensivaInimigaFalhou"), frontName(g, f)), "good"); } f.eSpecial = false; }
  f.last = rec; f.special = false; if (f.prevPosture){ f.posture = f.prevPosture; delete f.prevPosture; }
  if (R){
    R(`${frontName(g, f)}: ${frontFala(g, "postura", p)} × ${frontFala(g, "posturaCurta", e).toLowerCase()} inimigo — linha ${d >= 0 ? "+" : ""}${d} (agora ${rec.prog}/100). Baixas: suas ${lossP}, inimigas ${lossE}.`, d > 5 ? "good" : d < -5 ? "bad" : "info");
    for (const m of moved) R(gfmt(frontFala(g, "eventos", m.side === "player" ? "tomou" : "perdeu"), MAP_DATA.states[m.uf].name, (scOf(g).story.factions[m.to] || {}).label || m.to), m.side === "player" ? "good" : "bad");
  }
  return rec;
}
// Mês de guerra no modo frentes (substitui ordens, batalhas e IA inimiga dos exércitos)
function frontWarMonth(g, R){
  const K = frontCfg(g), C = scOf(g).campaign, KK = C.keys, ph = phaseOf(g), W = g.war;
  syncFronts(g);
  const ev = { month: g.month, war: !!ph.war, control0: Object.assign({}, g.control), battles: [], flips: [], moves: [], start: [], orders: [], fronts: [] };
  g.mil = ev;
  if (!ph.war || !W.fronts.length){ g.warNews = []; return ev; }
  if (g.autoOrders && g.autoOrders !== "off"){ const r = frontAuto(g, g.autoOrders); if (r.n) R(`Comando automático: ${r.n} ${r.n === 1 ? "frente mudou" : "frentes mudaram"} de postura.`); }
  const cf = g.ceasefire > 0;
  if (cf){ g.ceasefire--; R("Trégua em vigor: sem combates neste mês. As tropas descansam.", "good");
    for (const f of W.fronts){ f.morale = Math.min(Math.max(f.morale, frontMaxMorale(g)), f.morale + 8); f.supply = Math.min(100, f.supply + 10); if (f.special){ f.special = false; f.posture = f.prevPosture || "segurar"; delete f.prevPosture; g.money += K.ofensiva.custo; } } }
  else {
    MIL_QUIET = true;
    for (const f of W.fronts.slice()){ if (!frontById(g, f.id)) continue; const rec = frontClash(g, f, R); ev.fronts.push(rec); for (const m of rec.moved) ev.flips.push(m); }
    MIL_QUIET = false;
    syncFronts(g);
    if (ev.fronts.some(r => r.p === "avancar" || r.e === "avancar")) g.stat.battles = (g.stat.battles || 0) + 1;
    W.log = W.log.concat(ev.fronts).slice(-24);
    if (ev.fronts.some(r => r.special)) W.offAt = g.month + K.ofensiva.intervalo;
    // fim da guerra pela linha: capital perdida / reduto tomado
    const cap = g.control[K.capital];
    if (sideOf(g, cap, phaseOf(g)) === "enemy"){ W.end = { to: "fim_restauracao", why: frontFala(g, "eventos", "derrota") }; R(W.end.why, "bad"); }
    else if (sideOf(g, cap, phaseOf(g)) === "contested") R(frontFala(g, "eventos", "capitalRisco"), "bad");
    for (const fac in K.frentes){
      const D = K.frentes[fac]; if (!ev.flips.some(m => m.uf === D.reduto && m.side === "player")) continue;
      if (D.vitoria && !W.end){ W.end = { to: D.vitoria, why: frontFala(g, "eventos", "vitoria") }; R(W.end.why, "good"); }
      else if (!D.vitoria) frontCrush(g, fac, R);
    }
    // reforços dos dois lados
    const mob = mobilization(g); frontAdd(g, mob); R(gfmt(frontFala(g, "eventos", "mobiliza"), mob), "good");
    const sc = frontEnemyScale(g);
    for (const f of W.fronts){
      const D = K.frentes[f.id], n = Object.values(g.control).filter(x => x === f.id).length;
      const add = Math.max(0, (D.reforco + 0.25 * n) * sc + (f.id === ph.enemyMain ? foreignFoes(g) * 1.5 + (g.enemyBoost || 0) : 0) - malusNow(g) * 2);
      f.enemy = Math.round(Math.min(260 * sc + 40, f.enemy + add));
      f.emorale = Math.min(80, f.emorale + 3);
    }
    const sides = sideCounts(g), tot = sides.wPlayer + sides.wEnemy + sides.wContested, share = tot ? sides.wPlayer / tot : 1;
    if (share > 0.65) applyStats(g, { [KK.mil]: 1 }); else if (share < 0.35){ applyStats(g, { [KK.mil]: -2 }); R("Você controla pouco território: o moral das tropas cai.", "bad"); }
    if (sides.contested >= 3) applyStats(g, { [KK.pop]: -1 });
  }
  g.enemyBoost = Math.max(0, (g.enemyBoost || 0) - 0.25);
  for (const t of (g.warNews || [])) R(t, "bad"); g.warNews = [];
  return ev;
}
// Reduto da Liga tomado: os estados separatistas voltam para você e a frente fecha
function frontCrush(g, fac, R){
  const ph = phaseOf(g), before = Object.assign({}, g.control);
  for (const uf in g.control) if (g.control[uf] === fac) g.control[uf] = ph.playerMain || ph.player[0];
  noteChanges(g, before);
  if (southOn(g) && fac === southCfg(g).fac){ g.south.state = "esmagada"; if (!g.flags.includes("sul_esmagado")) g.flags.push("sul_esmagado"); }
  if (R) R(frontFala(g, "eventos", "ligaCaiu"), "good");
}
/* ---------- Efeitos de eventos (fx.front, fx.org, fx.enemyLoss) ---------- */
function frontFx(g, fx){
  const W = g.war; if (!W || !W.fronts.length) return;
  if (fx.front) for (const f of W.fronts) f.progress = clamp(f.progress + fx.front, -95, 95);
  if (fx.org) for (const f of W.fronts) f.morale = fx.org > 0 ? Math.min(Math.max(f.morale, frontMaxMorale(g)), f.morale + fx.org) : Math.max(5, f.morale + fx.org);
  if (fx.enemyLoss){ const f = W.fronts.slice().sort((a, b) => b.enemy - a.enemy)[0]; f.enemy = Math.max(5, f.enemy - fx.enemyLoss); }
}
// Força por estado (agitação, revoltas): capital fica com a reserva; na guerra as tropas ficam nos estados da frente
function frontStr(g, side, uf){
  const W = g.war; if (!W) return 0;
  if (uf === undefined) return side === "player" ? frontPool(g) : W.fronts.reduce((s, f) => s + f.enemy, 0);
  let s = side === "player" && uf === frontCfg(g).capital ? W.reserve : 0;
  for (const f of W.fronts){ const B = frontBorder(g, f, side); if (B.includes(uf)) s += (side === "player" ? f.troops : f.enemy) / B.length; }
  return s;
}
// Save v7 → v8: exércitos viram tropas das frentes (2022). Outros cenários só sobem a versão.
function migrateFronts(g){
  if (!frontCfg(g) || !Array.isArray(g.armies)) return;
  const mine = g.armies.filter(a => a.side === "player").reduce((s, a) => s + a.str, 0);
  const foes = {}; for (const a of g.armies.filter(a => a.side === "enemy")){ const fac = a.fac || phaseOf(g).enemyMain; foes[fac] = (foes[fac] || 0) + a.str; }
  g.war = frontNew(g, phaseOf(g).noArmies ? 0 : mine);
  g.armies = []; g.enemyPlans = [];
  syncFronts(g);
  for (const f of g.war.fronts) if (foes[f.id]) f.enemy = Math.round(Math.max(f.enemy * 0.6, foes[f.id] + f.n * 2));
  g.warNews = [];
}
/* ---------- Relatório "por que a linha andou" (tela de relatório e testes) ---------- */
function frontReport(g, rec){
  const K = frontCfg(g), L = K.falas.fatores, rows = [];
  for (const r of rec.rows){
    if (r.k === "sorte"){ rows.push({ k: r.k, label: L.sorte, p: r.luck > 0 ? `+${r.luck}` : "—", e: r.luck < 0 ? `+${-r.luck}` : "—", fav: r.luck > 0 ? "player" : "enemy", w: Math.abs(r.luck) / 10 }); continue; }
    if (r.k === "tropas"){ rows.push({ k: r.k, label: L.tropas, p: String(r.p), e: String(r.e), fav: r.p > r.e * 1.05 ? "player" : r.e > r.p * 1.05 ? "enemy" : null, w: Math.abs(Math.log(Math.max(1, r.p) / Math.max(1, r.e))) }); continue; }
    const p = r.p ?? 1, e = r.e ?? 1, lr = Math.log(p / e), pc = v => v === 1 ? "—" : `${v > 1 ? "+" : "−"}${Math.round(Math.abs(v - 1) * 100)}%`;
    rows.push({ k: r.k, label: L[r.k] || r.k, p: pc(p), e: pc(e), fav: lr > 0.01 ? "player" : lr < -0.01 ? "enemy" : null, w: Math.abs(lr) });
  }
  const P = frontCfg(g).falas.porque, top = rows.filter(r => r.fav).sort((a, b) => b.w - a.w).slice(0, 2);
  const tips = [], f = frontById(g, rec.front);
  if (["avancoTravado", "segurouCedeu", "recuouAtacado", "ofensivaFalhou"].includes(rec.why)) tips.push("fraco");
  if (rec.morale < 35 || rec.supply < 30) tips.push("moral");
  if (rec.P > rec.E * 1.3 && rec.p !== "avancar") tips.push("forte");
  if (f && offensiveState(g, f.id).ok) tips.push("ofensiva");
  if (g.war && g.war.fronts.length > 1) tips.push("dividir");
  if (!tips.length) tips.push("general");
  return { summary: P[rec.why] || "", top, rows, tips: tips.slice(0, 2).map(k => K.falas.dicas[k]), power: { p: rec.P, e: rec.E }, won: rec.d > 0, d: rec.d };
}
