// js/core/tropas.js — Núcleo: EXÉRCITOS da guerra de 2022 — fichas que andam pelas regiões intermediárias do IBGE. Sem DOM.
/* Como funciona (números em js/data/2022/frentes.js → tropas; o mês de guerra em js/core/frentes.js → frontWarMonth):
   - Exército: { id, side "player"|"enemy", fac (facção inimiga), n (número no nome), reg (região), str (força), morale, order }.
     Fica em g.war.armies (o g.armies do 1964 continua vazio no 2022). Um exército por região por lado: quem chega onde já
     há um exército seu se JUNTA a ele.
   - Ordens (de graça, uma por exército por mês):
       mover/juntar  até K.passos regiões andando SÓ pelo seu território (nada de atravessar o inimigo);
       atacar        uma região inimiga VIZINHA, com ou sem exército inimigo (sem exército, a luta é contra a guarnição local).
   - Batalha (fim do mês): chance = A^k / (A^k + D^k). A = poder dos atacantes; D = (defensores entrincheirados + guarnição)
     × terreno × reduto (Brasília, Recife e Porto Alegre). Quem vence o ataque toma a região e entra nela; o defensor recua
     para uma região vizinha sua — ou é destruído, se estiver cercado.
   - IA (inimigo e "comando automático"): defende a própria capital, ataca onde a chance passa do limite (preferindo o caminho
     até a capital do outro lado e os pontos fracos) e manda quem está na retaguarda andar até a linha. Sempre região vizinha. */
function tpK(g){ return frontCfg(g).tropas; }
function tpArmies(g, side){ const W = g.war, L = (W && W.armies) || []; return side ? L.filter(a => a.side === side) : L; }
function tpById(g, id){ return tpArmies(g).find(a => a.id === id) || null; }
function tpAt(g, side, reg){ return tpArmies(g).find(a => a.side === side && a.reg === reg) || null; }
function tpRegSide(g, id){ return g.reg ? sideOf(g, g.reg[id], phaseOf(g)) : null; }
function tpOwn(g, a, id){ return a.side === "player" ? tpRegSide(g, id) === "player" : g.reg[id] === a.fac; }
function tpHostile(g, a, id){ return a.side === "player" ? tpRegSide(g, id) === "enemy" && !!frontById(g, g.reg[id]) : tpRegSide(g, id) === "player"; }
function tpName(g, a){ return gfmt(frontFala(g, "tropas", a.side === "player" ? "nomeSeu" : "nome_" + a.fac), a.n); }
function tpCapReg(g){ return REG_DATA.cap[frontCfg(g).capital]; }
// capital de quem defende uma região: sua (Brasília) ou o reduto da facção inimiga (Recife / Porto Alegre)
function tpHome(g, side, fac){ const K = frontCfg(g); return side === "player" ? tpCapReg(g) : REG_DATA.cap[K.frentes[fac].reduto]; }
function tpIsFort(g, reg){
  if (reg === tpCapReg(g)) return tpRegSide(g, reg) === "player";
  const D = frontCfg(g).frentes[g.reg[reg]]; return !!(D && REG_DATA.cap[D.reduto] === reg);
}
function tpTotal(g, side, fac){ return tpArmies(g, side).filter(a => !fac || a.fac === fac).reduce((s, a) => s + a.str, 0); }
/* ---------- Criar, juntar, remover ---------- */
function tpNew(g, side, fac, reg, str, morale){
  const W = g.war, used = new Set(tpArmies(g).filter(a => a.side === side && a.fac === fac).map(a => a.n));
  let n = 1; while (used.has(n)) n++;
  W.seq = (W.seq || 0) + 1;
  const a = { id: "t" + W.seq, side, fac: fac || null, n, reg, str: Math.max(1, Math.round(str)), morale: Math.round(morale ?? 60), order: null };
  W.armies.push(a);
  return a;
}
function tpRemove(g, a){ const W = g.war; W.armies = W.armies.filter(x => x !== a); for (const k in W.gens) if (W.gens[k] === a.id) W.gens[k] = null; }
function tpAddTo(a, str, morale){ if (morale != null && a.str + str > 0) a.morale = Math.round((a.morale * a.str + morale * str) / (a.str + str)); a.str = Math.round(a.str + str); }
// dois exércitos do mesmo lado na mesma região viram um só (o maior fica; o general passa se o maior não tiver)
function tpMerge(g, out){
  for (const side of ["player", "enemy"]){
    const seen = {};
    for (const a of tpArmies(g, side).slice().sort((x, y) => y.str - x.str || (x.id < y.id ? -1 : 1))){
      const b = seen[a.reg]; if (!b){ seen[a.reg] = a; continue; }
      const ga = tpGen(g, a), gb = tpGen(g, b);
      tpAddTo(b, a.str, a.morale); tpRemove(g, a);
      if (side === "player" && ga && !gb) g.war.gens[ga.id] = b.id;
      if (out) out.push({ id: a.id, into: b.id, reg: a.reg, side });
    }
  }
}
/* ---------- Generais ---------- */
// Seu general de um exército (um general por exército); os exércitos inimigos usam o traço do comandante da facção
function tpGen(g, a){
  const K = frontCfg(g);
  if (a.side !== "player"){ const D = K.frentes[a.fac]; return D ? { id: "e_" + a.fac, traco: D.traco, retrato: D.retrato } : null; }
  return K.generais.find(x => g.war.gens[x.id] === a.id) || null;
}
function tpSetGeneral(g, armyId, genId){
  const W = g.war, K = frontCfg(g), a = tpById(g, armyId);
  if (!a || a.side !== "player") return { ok: false, msg: frontFala(g, "tropas", "erroExercito") };
  const cur = tpGen(g, a);
  if (!genId){ if (cur) W.gens[cur.id] = null; return { ok: true }; }
  const gen = K.generais.find(x => x.id === genId); if (!gen) return { ok: false, msg: frontFala(g, "tropas", "erroGeneral") };
  if (cur && cur.id === genId) return { ok: true };
  const from = W.gens[genId];
  if (cur) W.gens[cur.id] = from && tpById(g, from) ? from : null; // troca: o atual vai para o exército de onde o outro saiu
  W.gens[genId] = a.id;
  return { ok: true, msg: gfmt(frontFala(g, "tropas", "generalAssume"), frontGenName(g, gen), tpName(g, a)) };
}
function frontGenName(g, gen){ const P = scOf(g).retratos && scOf(g).retratos.pessoas[gen.retrato]; return P ? P.nome : gen.id; }
/* ---------- Poder e chance ---------- */
// Modificadores do lado (multiplicam todos os exércitos dele). rows: fatores para o relatório
function tpMods(g, side, fac){
  const C = scOf(g).campaign, KK = C.keys, rows = []; let m = 0;
  const add = (k, v) => { if (Math.abs(v - 1) >= 0.005) rows.push({ k, v }); return v - 1; };
  if (side === "player"){
    m += add("comando", 1 + clamp(((g.stats[KK.mil] ?? 50) - 50) / 200 + (natLoyalty(g) - 50) / 300, -0.3, 0.3));
    m += add("apoio", 1 + clamp(((g.stats[KK.pop] ?? 50) - 50) / 150, -0.2, 0.2));
    m += add("armas", 1 + armsAid(g));
    m += add("cofres", g.money < 0 ? 0.8 : 1);
  } else {
    m += add("dificuldade", 1 + ((C.enemyPower ?? 1) - 1) * 0.3);
    if (fac === (phaseOf(g).enemyMain || fac)) m += add("estrangeiro", 1 + 0.12 * foreignFoes(g) + 0.05 * (g.enemyBoost || 0));
    m += add("sancoes", 1 - 0.15 * malusNow(g));
  }
  return { v: Math.max(0.3, 1 + m), rows };
}
function tpMoraleF(a){ return 0.4 + 0.6 * clamp(a.morale, 0, 100) / 100; }
function tpTrait(g, a, role){ const gen = tpGen(g, a), T = gen && frontCfg(g).tracos[gen.traco]; return T ? 1 + (T[role] || 0) : 1; }
function tpPow(g, a, role, mods){
  let p = Math.max(0, a.str) * tpMoraleF(a) * tpTrait(g, a, role);
  if (role === "ataque" && a.special) p *= frontCfg(g).ofensiva.mult;
  return p * (mods || tpMods(g, a.side, a.fac)).v;
}
// Guarnição local (milícia, polícia, voluntários) de uma região — luta mesmo sem exército
function tpGarrison(g, reg){
  const T = tpK(g), r = REG_DATA.regs[reg];
  let v = tpIsFort(g, reg) ? T.guarnicaoCapital : REG_DATA.cap[r.uf] === reg ? T.guarnicaoCapEstado : T.guarnicao;
  if (tpRegSide(g, reg) === "enemy") v *= frontEnemyScale(g);
  return v;
}
// Chance de um grupo de exércitos (do mesmo lado) tomar uma região
function tpOdds(g, atks, reg){
  const K = frontCfg(g), T = tpK(g), side = atks[0].side, dside = side === "player" ? "enemy" : "player";
  const am = tpMods(g, side, atks[0].fac);
  const A = atks.reduce((s, a) => s + tpPow(g, a, "ataque", am), 0);
  const defs = tpArmies(g, dside).filter(a => a.reg === reg);
  const dm = defs.length ? tpMods(g, dside, defs[0].fac) : null;
  const DA = defs.reduce((s, a) => s + tpPow(g, a, "defesa", dm) * (a.moved ? 1 : T.cavar), 0);
  const gar = tpGarrison(g, reg), terr = 1 + frontTerrain(REG_DATA.regs[reg].uf), red = tpIsFort(g, reg) ? K.reduto : 1;
  const D = (DA + gar) * terr * red, k = T.expoente;
  const chance = A <= 0 ? 0 : Math.pow(A, k) / (Math.pow(A, k) + Math.pow(Math.max(0.1, D), k));
  return { A, D, DA, gar, terr, red, chance, defs, am, dm };
}
// Chance mostrada antes de confirmar: este exército + os seus que já vão atacar o mesmo alvo
function tpChance(g, a, to){
  const grp = tpArmies(g, a.side).filter(x => x !== a && x.order && x.order.type === "atacar" && x.order.to === to);
  return Object.assign(tpOdds(g, [a].concat(grp), to), { with: grp.map(x => x.id) });
}
/* ---------- Alvos e ordens ---------- */
// Destinos válidos: até K.passos regiões pelo seu território (mover/juntar) e regiões inimigas vizinhas (atacar)
function tpTargets(g, a){
  const out = []; if (!a || !g.reg || !REG_DATA.regs[a.reg]) return out;
  const T = tpK(g), dist = { [a.reg]: 0 }, prev = {}, q = [a.reg];
  while (q.length){
    const u = q.shift(); if (dist[u] >= T.passos) continue;
    for (const n of REG_DATA.regs[u].adj) if (!(n in dist) && tpOwn(g, a, n)){
      dist[n] = dist[u] + 1; prev[n] = u; q.push(n);
      const path = []; for (let x = n; x !== a.reg; x = prev[x]) path.unshift(x);
      const o = tpAt(g, a.side, n); out.push({ to: n, type: o ? "juntar" : "mover", path, with: o ? o.id : null });
    }
  }
  if (!(g.ceasefire > 0)){
    const foe = a.side === "player" ? "enemy" : "player";
    for (const n of REG_DATA.regs[a.reg].adj) if (tpHostile(g, a, n)) out.push({ to: n, type: "atacar", path: [n], empty: !tpAt(g, foe, n) });
  }
  return out;
}
function tpGive(g, a, t){ a.order = { type: t.type === "atacar" ? "atacar" : "mover", to: t.to, path: t.path.slice() }; }
function tpOrderState(g){
  if (g.ended) return { ok: false, msg: "Partida encerrada." };
  if (g.queue.length) return { ok: false, msg: "Resolva os eventos pendentes na aba História." };
  if (!g.war || !phaseOf(g).war) return { ok: false, msg: frontFala(g, "tropas", "semGuerra") };
  return { ok: true };
}
// Ordem do jogador: to = região de destino (null ou a própria região desfaz a ordem)
function tpOrder(g, id, to){
  const st = tpOrderState(g); if (!st.ok) return st;
  const a = tpById(g, id), F = k => frontFala(g, "tropas", k);
  if (!a || a.side !== "player") return { ok: false, msg: F("erroExercito") };
  if (to == null || to === a.reg){ if (a.special) cancelOffensive(g, a.id); a.order = null; return { ok: true, msg: gfmt(F("ordemDesfeita"), tpName(g, a)) }; }
  const t = tpTargets(g, a).find(x => x.to === to);
  if (!t) return { ok: false, msg: F("alvoInvalido") };
  if (a.special && t.type !== "atacar") cancelOffensive(g, a.id);
  tpGive(g, a, t);
  if (t.type === "atacar") return { ok: true, msg: gfmt(F("msgAtaque"), tpName(g, a), regName(to), Math.round(tpChance(g, a, to).chance * 100)) };
  return { ok: true, msg: gfmt(F(t.type === "juntar" ? "msgJuntar" : "msgMover"), tpName(g, a), regName(to)) };
}
/* ---------- IA (inimigo e comando automático) ---------- */
// Distância (por regiões do lado) até a linha de frente: 0 = encostado no inimigo
function tpLineDist(g, side, fac){
  const own = id => side === "player" ? tpRegSide(g, id) === "player" : g.reg[id] === fac;
  const hostile = id => side === "player" ? tpRegSide(g, id) === "enemy" && !!frontById(g, g.reg[id]) : tpRegSide(g, id) === "player";
  const d = {}, q = [];
  for (const id of REG_IDS) if (own(id) && REG_DATA.regs[id].adj.some(hostile)){ d[id] = 0; q.push(id); }
  while (q.length){ const u = q.shift(); for (const n of REG_DATA.regs[u].adj) if (!(n in d) && own(n)){ d[n] = d[u] + 1; q.push(n); } }
  return d;
}
// opt: { thr: chance mínima para atacar, attack: pode atacar? }
// Ordem de prioridade: 1) capital (fica / volta para defender), 2) regiões ameaçadas, 3) ataques, 4) retaguarda até a linha
function tpAI(g, list, opt){
  if (!list.length || !g.reg) return 0;
  const side = list[0].side, fac = list[0].fac, foe = side === "player" ? "enemy" : "player", R = REG_DATA.regs;
  const free = new Set(list.filter(a => !a.order)); let n = 0;
  const give = (a, to) => { const t = tpTargets(g, a).find(x => x.to === to); if (!t) return false; tpGive(g, a, t); free.delete(a); n++; return true; };
  const reachers = to => [...free].filter(a => a.reg !== to && tpTargets(g, a).some(t => t.to === to && t.type !== "atacar")).sort((x, y) => y.str - x.str);
  const foes = tpArmies(g, foe), own = id => side === "player" ? tpRegSide(g, id) === "player" : g.reg[id] === fac;
  // 1) capital: quem está nela fica quando há inimigo por perto; o lado inimigo traz exércitos de volta se você chega perto de Recife
  const home = tpHome(g, side, fac); let recall = null;
  if (home && R[home] && own(home)){
    const Dh = regDist(home), near = Math.min(99, ...foes.map(e => Dh[e.reg] ?? 99));
    const at = tpAt(g, side, home);
    if (at && near <= (side === "player" ? 2 : 3)) free.delete(at);
    if (!at && near <= 2){ const c = reachers(home)[0]; if (c) give(c, home); }
    if (side === "enemy" && near <= 3) recall = Dh;
  }
  // 2) regiões ameaçadas: o jogador vê o plano inimigo (setas vermelhas); quem está na região ameaçada fica, e um vizinho vem ajudar
  if (side === "player"){
    const thr = {}; for (const e of foes) if (e.order && e.order.type === "atacar" && own(e.order.to)) (thr[e.order.to] ||= []).push(e);
    const imp = id => (id === home ? 3 : 0) + (REG_DATA.cap[R[id].uf] === id ? 1 : 0) + (tpAt(g, side, id) ? 0.5 : 0);
    for (const id of Object.keys(thr).sort((x, y) => imp(y) - imp(x) || (x < y ? -1 : 1))){
      const at = tpAt(g, side, id), ch = tpOdds(g, thr[id], id).chance;
      if (at){ if (ch > 0.25 && free.has(at) && !(opt.attack && at.str > thr[id].reduce((s, e) => s + e.str, 0) * 1.6)) free.delete(at); continue; }
      if (ch < 0.5 || imp(id) < 1) continue;
      const c = reachers(id).find(a => !Object.keys(thr).includes(a.reg)); if (c) give(c, id);
    }
  }
  // 3) ataques: o melhor alvo de cada vez (chance + valor), juntando vizinhos até passar do limite
  if (opt.attack && !(g.ceasefire > 0)){
    const goalD = {};
    const gd = t => { const goal = side === "player" ? tpHome(g, "enemy", g.reg[t]) : tpCapReg(g); return (regDist(goal)[t] ?? 30); };
    for (let guard = 0; guard < 16; guard++){
      let best = null; const cand = new Set();
      for (const a of free) for (const t of R[a.reg].adj) if (tpHostile(g, a, t)) cand.add(t);
      for (const t of cand){
        const already = list.filter(a => a.order && a.order.type === "atacar" && a.order.to === t);
        const near = [...free].filter(a => R[a.reg].adj.includes(t) && tpHostile(g, a, t) && !(recall && (recall[t] ?? 99) > 3 && (recall[a.reg] ?? 99) <= 4)).sort((x, y) => y.str - x.str);
        const goal = side === "player" ? tpHome(g, "enemy", g.reg[t]) : tpCapReg(g), thr = t === goal ? Math.min(opt.thr, tpK(g).alvoChance) : opt.thr;
        const pick = []; let ch = 0;
        for (const a of near){ pick.push(a); ch = tpOdds(g, already.concat(pick), t).chance; if (ch >= thr) break; }
        if (!pick.length || ch < thr) continue;
        const v = ch - 0.04 * (goalD[t] ??= gd(t)) + (t === goal ? 1 : 0) + (REG_DATA.cap[R[t].uf] === t ? 0.06 : 0) + (tpAt(g, foe, t) ? 0 : 0.08) + (recall && (recall[t] ?? 99) <= 3 ? 0.3 : 0);
        if (!best || v > best.v) best = { t, pick, v };
      }
      if (!best) break;
      for (const a of best.pick) give(a, best.t);
    }
  }
  // 4) retaguarda: anda até a linha (ou, no recuo, até a capital), sem empilhar à toa
  const L = tpLineDist(g, side, fac), G = side === "player" ? null : regDist(tpCapReg(g));
  const mainFoe = side === "player" ? (phaseOf(g).enemyMain && frontById(g, phaseOf(g).enemyMain) ? phaseOf(g).enemyMain : (g.war.fronts[0] || {}).id) : null;
  const goalR = side === "player" ? (mainFoe ? tpHome(g, "enemy", mainFoe) : null) : tpCapReg(g), GG = goalR && R[goalR] ? regDist(goalR) : null;
  for (const a of [...free]){
    if (recall && (recall[a.reg] ?? 99) <= 6 && (recall[a.reg] ?? 99) > 1){
      const o = tpTargets(g, a).filter(t => t.type !== "atacar" && (recall[t.to] ?? 99) < recall[a.reg]).sort((x, y) => recall[x.to] - recall[y.to] || (!!x.with - !!y.with))[0];
      if (o){ give(a, o.to); continue; }
    }
    const d0 = L[a.reg]; if (d0 === undefined) continue;
    if (d0 === 0){ // na linha e sem ataque: se a região não está ameaçada, desliza pela linha rumo ao objetivo (junta forças no eixo)
      if (!opt.attack || !GG) continue;
      const risk = foes.filter(e => R[a.reg].adj.includes(e.reg)).reduce((s, e) => s + e.str, 0);
      if (risk > a.str * 0.7 || (a.reg === home)) continue;
      const o = tpTargets(g, a).filter(t => t.type !== "atacar" && L[t.to] === 0 && (GG[t.to] ?? 99) < (GG[a.reg] ?? 99)).sort((x, y) => GG[x.to] - GG[y.to] || (x.to < y.to ? -1 : 1))[0];
      if (o) give(a, o.to);
      continue;
    }
    const opts = tpTargets(g, a).filter(t => t.type !== "atacar" && L[t.to] !== undefined && L[t.to] < d0);
    if (!opts.length) continue;
    opts.sort((x, y) => (!!x.with - !!y.with) || L[x.to] - L[y.to] || (G ? (G[x.to] ?? 30) - (G[y.to] ?? 30) : 0) || (x.to < y.to ? -1 : 1));
    give(a, opts[0].to);
  }
  return n;
}
// Plano do inimigo para o próximo mês (fica visível: setas vermelhas no mapa)
function tpEnemyPlan(g){
  const K = frontCfg(g);
  for (const a of tpArmies(g, "enemy")) a.order = null;
  for (const f of (g.war.fronts || [])){
    const D = K.frentes[f.id], list = tpArmies(g, "enemy").filter(a => a.fac === f.id);
    tpAI(g, list, { thr: D.ataca, attack: true });
  }
}
/* ---------- Batalha ---------- */
function tpRetreat(g, d, from){
  const home = tpHome(g, d.side, d.fac), H = home && REG_DATA.regs[home] ? regDist(home) : {};
  const c = REG_DATA.regs[from].adj.filter(x => x !== from && tpOwn(g, d, x));
  if (!c.length) return null;
  c.sort((x, y) => (!!tpAt(g, d.side, y) - !!tpAt(g, d.side, x)) || (H[x] ?? 40) - (H[y] ?? 40) || (x < y ? -1 : 1));
  return c[0];
}
function tpWhy(rec){
  const c = rec.chance, emp = !rec.def.length;
  if (rec.side === "player") return rec.win ? (emp ? "ocupou" : c >= 65 ? "venceuForte" : c >= 40 ? "venceuApertado" : "venceuSorte")
    : (c < 35 ? "perdeuFraco" : c < 60 ? "perdeuApertado" : "perdeuAzar");
  return rec.win ? (c >= 60 ? "caiuForte" : "caiuAzar") : (c >= 50 ? "segurouSorte" : "segurouForte");
}
function tpSnap(g, a, s0){ const gen = tpGen(g, a); return { id: a.id, n: a.n, side: a.side, fac: a.fac, str0: s0, str: a.str, morale: Math.round(a.morale), gen: a.side === "player" && gen ? gen.id : null }; }
function tpBattle(g, atks, reg){
  const K = frontCfg(g), T = tpK(g), side = atks[0].side, ph = phaseOf(g);
  const o = tpOdds(g, atks, reg), win = rnd(g) < o.chance;
  const r = o.A / Math.max(1, o.D), wf = 1 + frontWeary(g) * 0.5, L = T.perdas, M = T.moral;
  const s0A = atks.map(a => a.str), s0D = o.defs.map(a => a.str), spec = atks.some(a => a.special);
  const front = side === "player" ? g.reg[reg] : atks[0].fac;
  for (const a of atks){
    let loss = a.str * (win ? L.venceu * clamp(1 / r, 0.4, 1.5) : L.perdeu * clamp(1 / r, 0.6, 2)) * wf;
    if (a.special && !win) loss += a.str * K.ofensiva.falhaPerdas;
    a.str = Math.max(0, Math.round(a.str - loss)); a.fought = true;
    a.morale = clamp(a.morale + M.ataque + (win ? M.vitoria : M.derrota) + (a.special && !win ? K.ofensiva.falhaMoral : 0), 5, 100);
  }
  for (const d of o.defs){
    d.str = Math.max(0, Math.round(d.str - d.str * (win ? L.defPerdeu * clamp(r, 0.6, 2) : L.defVenceu * clamp(r, 0.4, 1.5)) * wf));
    d.morale = clamp(d.morale + (win ? M.derrota : M.vitoria), 5, 100);
  }
  const rec = { month: g.month, reg, uf: REG_DATA.regs[reg].uf, side, front, win, special: spec,
    atk: atks.map((a, i) => tpSnap(g, a, s0A[i])), def: o.defs.map((d, i) => tpSnap(g, d, s0D[i])),
    gar: Math.round(o.gar), A: Math.round(o.A), D: Math.round(o.D), chance: Math.round(o.chance * 100),
    terr: Math.round(o.terr * 100) / 100, red: o.red, rows: tpRows(g, o, atks, side), retreat: [], lost: [], took: null };
  if (win){
    for (const d of o.defs){
      const to = d.str > 0 ? tpRetreat(g, d, reg) : null;
      if (to){ rec.retreat.push({ id: d.id, n: d.n, side: d.side, fac: d.fac, to }); d.reg = to; d.order = null; d.moved = true; d.special = false; }
      else { rec.lost.push({ id: d.id, n: d.n, side: d.side, fac: d.fac }); tpRemove(g, d); }
    }
    const m = regTake(g, reg, side === "player" ? (ph.playerMain || ph.player[0]) : atks[0].fac, side); m.front = front; rec.took = m;
    const lead = atks.filter(a => a.str > 0).sort((x, y) => y.str - x.str)[0];
    if (lead){ lead.reg = reg; lead.moved = true; rec.into = lead.id; }
  }
  for (const a of atks.concat(o.defs)) if (a.str <= 0 && g.war.armies.includes(a)){ rec.lost.push({ id: a.id, n: a.n, side: a.side, fac: a.fac }); tpRemove(g, a); }
  tpMerge(g);
  rec.why = tpWhy(rec);
  return rec;
}
// Fatores da batalha do ponto de vista "você × inimigo" (para o relatório). v: multiplicador; n: número
function tpRows(g, o, atks, side){
  const rows = [], P = side === "player" ? "p" : "e", E = side === "player" ? "e" : "p";
  const put = (k, s, v, kind) => { let x = rows.find(y => y.k === k); if (!x){ x = { k, kind: kind || "x" }; rows.push(x); } x[s] = v; };
  put("tropas", P, atks.reduce((s, a) => s + a.str, 0), "n"); put("tropas", E, o.defs.reduce((s, a) => s + a.str, 0), "n");
  if (o.gar) put("guarnicao", E, Math.round(o.gar), "n");
  const avg = (L, f) => L.length ? L.reduce((s, a) => s + f(a) * a.str, 0) / Math.max(1, L.reduce((s, a) => s + a.str, 0)) : 1;
  put("moral", P, avg(atks, tpMoraleF)); if (o.defs.length) put("moral", E, avg(o.defs, tpMoraleF));
  const ga = avg(atks, a => tpTrait(g, a, "ataque")), gd = o.defs.length ? avg(o.defs, a => tpTrait(g, a, "defesa")) : 1;
  if (Math.abs(ga - 1) > 0.005) put("general", P, ga); if (Math.abs(gd - 1) > 0.005) put("general", E, gd);
  for (const r of o.am.rows) put(r.k, P, r.v);
  if (o.dm) for (const r of o.dm.rows) put(r.k, E, r.v);
  if (o.defs.some(a => !a.moved)) put("cavar", E, tpK(g).cavar);
  if (o.terr > 1.005) put("terreno", E, o.terr);
  if (o.red > 1) put("reduto", E, o.red);
  if (atks.some(a => a.special)) put("ofensiva", P, frontCfg(g).ofensiva.mult);
  put("poder", P, Math.round(o.A), "n"); put("poder", E, Math.round(o.D), "n");
  return rows;
}
// Exércitos fora do próprio território (revolta, história) vão para a região sua mais perto; sem nenhuma, são desfeitos
function tpFix(g, out){
  if (!g.reg || !g.war || !g.war.armies) return;
  for (const a of tpArmies(g).slice()){
    if (a.str <= 0){ tpRemove(g, a); continue; }
    if (REG_DATA.regs[a.reg] && tpOwn(g, a, a.reg)) continue;
    const D = REG_DATA.regs[a.reg] ? regDist(a.reg) : {};
    const c = REG_IDS.filter(id => tpOwn(g, a, id) && !tpAt(g, a.side, id)).sort((x, y) => (D[x] ?? 99) - (D[y] ?? 99) || (x < y ? -1 : 1))[0]
      || REG_IDS.filter(id => tpOwn(g, a, id)).sort((x, y) => (D[x] ?? 99) - (D[y] ?? 99))[0];
    if (c){ if (out) out.push({ id: a.id, side: a.side, from: a.reg, to: c, fix: true }); a.reg = c; a.order = null; }
    else tpRemove(g, a);
  }
  tpMerge(g);
}
// Movimentos e batalhas do mês. Devolve { moves, battles }
function tpResolve(g, ev){
  const W = g.war, T = tpK(g);
  for (const a of W.armies){ a.moved = false; a.fought = false; }
  // 1) movimentos (pelo próprio território, região vizinha a região vizinha)
  for (const a of W.armies.slice()){
    const o = a.order; if (!o || o.type !== "mover") continue;
    const p = o.path && o.path.length ? o.path : [o.to];
    let ok = p.length <= T.passos, at = a.reg;
    for (const x of p){ if (!ok) break; ok = REG_DATA.regs[at].adj.includes(x) && tpOwn(g, a, x); at = x; }
    if (ok){ ev.moves.push({ id: a.id, n: a.n, side: a.side, fac: a.fac, from: a.reg, to: o.to, path: [a.reg].concat(p) }); a.reg = o.to; a.moved = true; }
    a.order = null;
  }
  tpMerge(g, ev.merges);
  // 2) batalhas: ataques ao mesmo alvo se somam; os lados se alternam (a ordem muda a cada mês)
  if (!(g.ceasefire > 0)){
    const groups = {}; for (const a of W.armies) if (a.order && a.order.type === "atacar") (groups[a.side + ">" + a.order.to] ||= []).push(a);
    const all = Object.values(groups), shuffle = L => { for (let i = L.length - 1; i > 0; i--){ const j = Math.floor(rnd(g) * (i + 1)); [L[i], L[j]] = [L[j], L[i]]; } return L; };
    const P = shuffle(all.filter(x => x[0].side === "player")), E = shuffle(all.filter(x => x[0].side === "enemy")), seq = [];
    const first = rnd(g) < 0.5 ? [P, E] : [E, P];
    while (P.length || E.length){ if (first[0].length) seq.push(first[0].shift()); if (first[1].length) seq.push(first[1].shift()); }
    for (const grp of seq){
      const atks = grp.filter(a => W.armies.includes(a) && a.str > 0 && !a.fought && a.order && a.order.type === "atacar"
        && REG_DATA.regs[a.reg].adj.includes(a.order.to) && tpHostile(g, a, a.order.to));
      if (!atks.length) continue;
      const to = atks[0].order.to;
      ev.battles.push(tpBattle(g, atks.filter(a => a.order.to === to), to));
    }
  }
  for (const a of W.armies){ a.order = null; a.special = false; }
  tpFix(g, ev.moves);
}
