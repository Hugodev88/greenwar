// js/core/frentes.js — Núcleo: guerra de 2022 por EXÉRCITOS nas regiões do IBGE — frentes abertas, reforços, recrutamento, ofensiva, mês de guerra. Sem DOM.
/* Só vale quando o cenário tem "frentes" (js/data/2022/frentes.js). O 1964 segue com exércitos por estado (js/core/ordens.js).
   Estado salvo em g.war (save v12):
     reserve  tropas fora da guerra (antes de ela começar ficam em Brasília; viram exércitos quando a primeira frente abre)
     armies   exércitos nas regiões (js/core/tropas.js)      seq  contador de ids      epool  { facção: reforço acumulado }
     fronts   [{ id (facção inimiga), opened, n (estados dela) }] — uma "frente" por inimigo com território
     gens     { idDoGeneral: idDoExército }      offAt  mês a partir do qual a ofensiva especial está liberada
     log      batalhas dos últimos meses (relatórios)      hist  território mês a mês (tendência)      months  meses de combate
   Política e agitação continuam por estado; o dono de um estado é quem tem a maioria das regiões dele (js/core/regioes.js).
   Em modo frentes, g.armies fica vazio e as funções antigas (sideStr, addPlayerStrength, recruitArmy, syncMilitary, planEnemy…)
   desviam para cá. Vitória: tomar a região de Recife. Derrota: perder a de Brasília. Porto Alegre derruba a Liga do Sul. */
function frontCfg(g){ const sc = g && scOf(g); return (sc && sc.frentes) || null; }
function frontMode(g){ return !!(g && g.war && frontCfg(g)); }
function frontFala(g, grp, k){ const F = frontCfg(g).falas; return (F[grp] && F[grp][k]) || k; }
function frontName(g, f){ return frontFala(g, "nome", f.id || f); }
function frontNew(g, reserve){ return { reserve: Math.max(0, Math.round(reserve || 0)), armies: [], seq: 0, epool: {}, fronts: [], gens: {}, offAt: null, log: [] }; }
function frontPool(g){ const W = g.war; return W ? W.reserve + tpTotal(g, "player") : 0; }
function frontById(g, id){ return (g.war && g.war.fronts.find(f => f.id === id)) || null; }
function frontEnemyScale(g){ const K = frontCfg(g), C = scOf(g).campaign; return (C.enemyPower ?? K.poderBase) / K.poderBase; }
function frontMaxMorale(g){ const M = frontCfg(g).moralMax, K = scOf(g).campaign.keys, mil = g.stats[K.mil] ?? 50;
  return Math.round(clamp(M.base + natLoyalty(g) * M.lealdade + (mil - 50) * M.militar, M.min, 100)); }
function frontTerrain(uf){ const T = uf && TERRAIN_TYPES[TERRAIN[uf]]; return T && T.def ? T.def : 0; }
/* ---------- Abrir / fechar frentes conforme o mapa ---------- */
function syncFronts(g){
  const W = g.war, K = frontCfg(g), ph = phaseOf(g);
  if (!W || !K) return;
  W.armies ||= []; W.epool ||= {};
  if (ph.noArmies){ W.reserve = 0; W.fronts = []; W.gens = {}; W.armies = []; return; }
  if (!ph.war){ regSync(g); if (W.armies.length || W.fronts.length){ W.reserve += tpTotal(g, "player"); W.armies = []; W.fronts = []; W.gens = {}; } return; }
  regSync(g);
  for (const fac of Object.keys(K.frentes)){
    if (!(ph.enemy || []).includes(fac)) continue;
    const n = Object.values(g.control).filter(x => x === fac).length, nr = regCount(g, fac), f = frontById(g, fac);
    if (nr && !f) frontOpen(g, fac, Math.max(1, n));
    else if (!nr && f) frontClose(g, f);
    else if (f && n > f.n){ W.epool[fac] = (W.epool[fac] || 0) + (n - f.n) * K.frentes[fac].porEstado * frontEnemyScale(g); f.n = n; }
    else if (f) f.n = n;
  }
  // inimigo sem frente aberta (fora da guerra, armistício) não tem exércitos
  W.armies = W.armies.filter(a => a.side === "player" || frontById(g, a.fac));
  if (W.fronts.length && !tpArmies(g, "player").length && W.reserve > 0) frontDeploy(g);
  tpFix(g);
}
// Primeira frente: a reserva vira K.tropas.inicio exércitos na linha (um no caminho até a capital inimiga, os outros perto de Brasília)
function frontDeploy(g){
  const W = g.war, T = tpK(g), f = W.fronts[0]; if (!f) return;
  const total = W.reserve, n = clamp(Math.floor(total / 12), 1, T.inicio);
  const B = regBorder(g, f).mine, cap = tpCapReg(g), DC = regDist(cap), P = regPath(g, f, 1);
  const first = P ? B.filter(id => REG_DATA.regs[id].adj.includes(P[0])).sort((a, b) => (DC[a] ?? 40) - (DC[b] ?? 40))[0] : null;
  const picks = first ? [first] : [];
  for (const id of B.slice().sort((a, b) => (DC[a] ?? 40) - (DC[b] ?? 40) || (a < b ? -1 : 1))){
    if (picks.length >= n) break;
    if (!picks.includes(id) && !picks.some(p => REG_DATA.regs[p].adj.includes(id))) picks.push(id);
  }
  if (!picks.length) picks.push(cap);
  const each = total / picks.length, mor = Math.min(70, frontMaxMorale(g));
  picks.forEach(id => tpNew(g, "player", null, id, each, mor));
  W.reserve = 0;
  // generais: o agressivo no exército do caminho, os outros nos seguintes
  const order = ["agressivo", "defensivo", "logistico"];
  tpArmies(g, "player").forEach((a, i) => { const gen = frontCfg(g).generais.find(x => x.traco === order[i]) ; if (gen && !W.gens[gen.id]) W.gens[gen.id] = a.id; });
}
// Exércitos inimigos de uma frente nova: um guarda a capital deles, os outros na linha, mais perto de Brasília
function frontSpawn(g, fac, total){
  const T = tpK(g), D = frontCfg(g).frentes[fac], f = frontById(g, fac);
  const n = clamp(Math.round(total / T.porExercito), 2, D.exercitos);
  const home = tpHome(g, "enemy", fac), DC = regDist(tpCapReg(g));
  const B = regBorder(g, f).theirs.sort((a, b) => (DC[a] ?? 40) - (DC[b] ?? 40) || (a < b ? -1 : 1));
  const picks = [];
  if (g.reg[home] === fac && n >= 3 && !B.includes(home)) picks.push(home);
  for (const id of B){ if (picks.length >= n) break; if (!picks.includes(id) && !picks.some(p => REG_DATA.regs[p].adj.includes(id))) picks.push(id); }
  for (const id of B){ if (picks.length >= n) break; if (!picks.includes(id)) picks.push(id); }
  if (!picks.length){ const any = REG_IDS.find(id => g.reg[id] === fac); if (any) picks.push(any); }
  const w = picks.map(id => id === home ? 0.6 : 1), sw = w.reduce((s, x) => s + x, 0);
  picks.forEach((id, i) => tpNew(g, "enemy", fac, id, total * w[i] / sw, D.moral));
}
function frontOpen(g, fac, n){
  const W = g.war, K = frontCfg(g), D = K.frentes[fac];
  const f = { id: fac, n, opened: g.month };
  W.fronts.push(f);
  frontSpawn(g, fac, (D.tropas + D.porEstado * n) * frontEnemyScale(g));
  if (W.offAt == null) W.offAt = g.month + K.ofensiva.primeira;
  if (!tpArmies(g, "player").length && W.reserve > 0) frontDeploy(g);
  tpAI(g, tpArmies(g, "enemy").filter(a => a.fac === fac), { thr: D.ataca, attack: true });
  (g.warNews ||= []).push(gfmt(frontFala(g, "eventos", "abriu"), frontName(g, f), frontFala(g, "inimigo", fac)));
  // a capital do inimigo desta frente é anunciada uma vez (Recife: grande evento "capital da Resistência")
  if (D.capitalFlag && !g.flags.includes(D.capitalFlag)){ g.flags.push(D.capitalFlag); if (D.capitalNews) g.warNews.push(frontFala(g, "eventos", D.capitalNews)); }
  return f;
}
function frontClose(g, f){
  const W = g.war; W.fronts = W.fronts.filter(x => x !== f);
  W.armies = W.armies.filter(a => !(a.side === "enemy" && a.fac === f.id)); delete W.epool[f.id];
  (g.warNews ||= []).push(gfmt(frontFala(g, "eventos", "fechou"), frontName(g, f)));
}
/* ---------- Tropas novas (alistamento, eventos, aliados) ---------- */
// Reforço do jogador: dividido entre os seus exércitos (sem exércitos, vai para a reserva em Brasília). n < 0 tira de todos.
function frontAdd(g, n, morale){
  const W = g.war; if (!W || !n) return 0;
  const mine = tpArmies(g, "player");
  if (n < 0){
    let left = -n; const tot = mine.reduce((s, a) => s + a.str, 0);
    for (const a of mine){ const d = Math.min(a.str, Math.round(-n * a.str / Math.max(1, tot))); a.str -= d; left -= d; }
    if (left > 0){ const d = Math.min(W.reserve, left); W.reserve -= d; left -= d; }
    for (const a of mine) if (left > 0){ const d = Math.min(a.str, left); a.str -= d; left -= d; }
    tpFix(g); return n;
  }
  if (phaseOf(g).noArmies) return 0;
  if (!mine.length){ W.reserve += n; return n; }
  // poucos exércitos: um reforço grande forma um exército novo na linha
  const T = tpK(g); let left = n;
  while (left >= 12 && tpArmies(g, "player").length < T.inicio && W.fronts.length){
    const spot = frontNewSpot(g); if (!spot) break;
    const d = Math.min(left, T.porExercito); tpNew(g, "player", null, spot, d, morale ?? Math.min(65, frontMaxMorale(g))); left -= d;
  }
  if (left <= 0) return n;
  n = left;
  mine.slice().sort((a, b) => a.str - b.str).forEach((a, i, L) => { const d = i === L.length - 1 ? left : Math.round(n / L.length); left -= d; tpAddTo(a, d, morale); });
  return n;
}
// Reforço inimigo do mês: metade completa os exércitos dele, metade junta para formar um novo (numa capital de estado dele)
function frontEnemyAdd(g, fac, add){
  const W = g.war, T = tpK(g), D = frontCfg(g).frentes[fac], list = tpArmies(g, "enemy").filter(a => a.fac === fac);
  const full = list.length >= D.exercitos, now = full ? add : add / 2;
  W.epool[fac] = (W.epool[fac] || 0) + add - now;
  list.slice().sort((a, b) => a.str - b.str).forEach((a, i, L) => tpAddTo(a, now / L.length, D.moral));
  if (!list.length) W.epool[fac] += now;
  if (W.epool[fac] >= T.novo && !full){
    const reg = frontSpawnReg(g, "enemy", fac);
    if (reg){ const at = tpAt(g, "enemy", reg); if (at) tpAddTo(at, W.epool[fac], D.moral); else tpNew(g, "enemy", fac, reg, W.epool[fac], D.moral); W.epool[fac] = 0; }
  }
}
// Lugar para um exército novo do jogador: região sua na linha, sem exército seu nem vizinho, a mais perto de Brasília
function frontNewSpot(g){
  const mine = tpArmies(g, "player"), DC = regDist(tpCapReg(g)), L = tpLineDist(g, "player");
  const c = REG_IDS.filter(id => L[id] === 0 && !tpAt(g, "player", id));
  const far = c.filter(id => !mine.some(a => REG_DATA.regs[a.reg].adj.includes(id)));
  return (far.length ? far : c).sort((a, b) => (DC[a] ?? 40) - (DC[b] ?? 40) || (a < b ? -1 : 1))[0] || frontSpawnReg(g, "player");
}
// Onde nasce um exército novo: capital de estado (ou a capital do lado) sob controle, sem exército, a mais perto da linha
function frontSpawnReg(g, side, fac){
  const L = tpLineDist(g, side, fac), own = id => side === "player" ? tpRegSide(g, id) === "player" : g.reg[id] === fac;
  const caps = [...new Set(Object.values(REG_DATA.cap).concat([tpHome(g, side, fac)]))].filter(id => REG_DATA.regs[id] && own(id));
  const free = caps.filter(id => !tpAt(g, side, id)), pool = free.length ? free : caps;
  return pool.sort((a, b) => (L[a] ?? 50) - (L[b] ?? 50) || (a < b ? -1 : 1))[0] || null;
}
/* ---------- Comando automático e plano inimigo ---------- */
function frontPlan(g){ if (frontMode(g) && g.war.armies) tpEnemyPlan(g); }
// "auto": ataca onde a chance é boa e leva a retaguarda até a linha; "defender": nunca ataca. Só mexe em quem está sem ordem.
function frontAuto(g, mode){
  if (!frontMode(g) || !phaseOf(g).war) return { ok: true, n: 0 };
  const n = tpAI(g, tpArmies(g, "player"), { thr: tpK(g).autoChance, attack: (mode || "auto") === "auto" });
  return { ok: true, n, msg: n ? gfmt(frontFala(g, "tropas", n === 1 ? "autoUma" : "autoVarias"), n) : frontFala(g, "tropas", "autoNada") };
}
/* ---------- Recrutar e ofensiva especial ---------- */
// Recruta numa região sua que seja capital de estado (ou Brasília) ou que já tenha um exército seu
function frontRecruitRegs(g){
  if (!g.reg) return [];
  const caps = new Set(Object.values(REG_DATA.cap));
  return REG_IDS.filter(id => tpRegSide(g, id) === "player" && (caps.has(id) || tpAt(g, "player", id)));
}
function frontRecruitState(g, reg){
  const K = frontCfg(g).recruta, ph = phaseOf(g), T = tpK(g);
  if (g.ended) return { ok: false, msg: "Partida encerrada." };
  if (g.queue.length) return { ok: false, msg: "Resolva os eventos pendentes na aba História." };
  if (ph.noArmies) return { ok: false, msg: "Nesta fase você não comanda tropas." };
  if ((+g.used._recruit || 0) >= K.porMes) return { ok: false, msg: `Já recrutou ${K.porMes} vezes neste mês. Encerre o mês para recrutar de novo.` };
  if (g.money < K.custo) return { ok: false, msg: `Faltam recursos: precisa de ${K.custo} (tem ${Math.floor(g.money)}).` };
  if (reg && (!ph.war || !g.war.fronts.length)) reg = null;
  if (reg){
    if (!frontRecruitRegs(g).includes(reg)) return { ok: false, msg: frontFala(g, "tropas", "recrutaOnde") };
    if (!tpAt(g, "player", reg) && tpArmies(g, "player").length >= T.max) return { ok: false, msg: gfmt(frontFala(g, "tropas", "limite"), T.max) };
  }
  return { ok: true, cost: K.custo, reg };
}
// Região sugerida para recrutar: o seu exército mais ameaçado (ou o mais fraco na linha); sem exército, Brasília
function frontRecruitPick(g){
  const mine = tpArmies(g, "player"); if (!mine.length) return tpCapReg(g);
  if (mine.length <= tpK(g).inicio){ const r = frontSpawnReg(g, "player"); if (r && !tpAt(g, "player", r)) return r; }
  const L = tpLineDist(g, "player"), foe = tpArmies(g, "enemy");
  const threat = a => foe.filter(e => e.order && e.order.type === "atacar" && e.order.to === a.reg).reduce((s, e) => s + e.str, 0);
  return mine.slice().sort((a, b) => threat(b) - threat(a) || (L[a.reg] ?? 9) - (L[b.reg] ?? 9) || a.str - b.str)[0].reg;
}
function frontRecruit(g, reg){
  const ph = phaseOf(g), war = ph.war && g.war.fronts.length;
  if (war && !reg) reg = frontRecruitPick(g);
  const st = frontRecruitState(g, reg); if (!st.ok) return st;
  const K = frontCfg(g).recruta;
  g.money -= st.cost; g.used._recruit = (+g.used._recruit || 0) + 1;
  if (!st.reg){ frontAdd(g, K.forca, K.moral); return { ok: true, msg: `+${K.forca} de tropas recrutadas (−${st.cost}).` }; }
  const at = tpAt(g, "player", st.reg);
  if (at){ tpAddTo(at, K.forca, K.moral); return { ok: true, msg: gfmt(frontFala(g, "tropas", "msgReforca"), tpName(g, at), K.forca, st.cost) }; }
  const a = tpNew(g, "player", null, st.reg, K.forca, K.moral);
  return { ok: true, msg: gfmt(frontFala(g, "tropas", "msgNovo"), tpName(g, a), regName(st.reg), st.cost), id: a.id };
}
// Ofensiva especial: UM exército com ordem de ataque ganha ×mult de poder neste mês (custa recursos; intervalo entre usos)
function offensiveState(g, id){
  const K = frontCfg(g).ofensiva, a = id ? tpById(g, id) : null, F = k => frontFala(g, "tropas", k);
  if (!phaseOf(g).war || !g.war.fronts.length) return { ok: false, msg: "Sem frente ativa." };
  if (tpArmies(g, "player").some(x => x.special)) return { ok: false, msg: F("ofensivaJa") };
  if (g.ceasefire > 0) return { ok: false, msg: "Trégua em vigor." };
  if (g.month < (g.war.offAt ?? 0)) return { ok: false, wait: g.war.offAt - g.month, msg: `Disponível em ${g.war.offAt - g.month} ${g.war.offAt - g.month === 1 ? "mês" : "meses"}.` };
  if (g.money < K.custo) return { ok: false, msg: `Faltam recursos: precisa de ${K.custo}.` };
  if (a && !(a.order && a.order.type === "atacar")) return { ok: false, msg: F("ofensivaSemAtaque") };
  if (a && a.morale < 30) return { ok: false, msg: "Moral baixa demais para uma ofensiva." };
  return { ok: true, cost: K.custo };
}
function launchOffensive(g, id){
  const st = offensiveState(g, id); if (!st.ok) return st;
  const a = tpById(g, id); if (!a) return { ok: false, msg: frontFala(g, "tropas", "ofensivaSemAtaque") };
  g.money -= st.cost; a.special = true;
  return { ok: true, msg: gfmt(frontFala(g, "eventos", "ofensiva"), tpName(g, a), regName(a.order.to)) };
}
function cancelOffensive(g, id){
  const a = tpById(g, id); if (!a || !a.special) return { ok: false };
  a.special = false; g.money += frontCfg(g).ofensiva.custo; return { ok: true, msg: "Ofensiva cancelada (recursos devolvidos)." };
}
/* ---------- O mês de guerra ---------- */
// Cansaço da guerra: depois de WAR_WEARY_FROM meses de combate, as batalhas ficam mais sangrentas e o apoio cai devagar.
const WAR_WEARY_FROM = 12;
function frontWeary(g){ const m = (g.war && g.war.months) || 0; return Math.min(1.5, Math.max(0, (m - WAR_WEARY_FROM) / 18)); }
function frontWarMonth(g, R){
  const K = frontCfg(g), T = tpK(g), C = scOf(g).campaign, KK = C.keys, ph = phaseOf(g), W = g.war;
  syncFronts(g);
  const ev = { month: g.month, war: !!ph.war, control0: Object.assign({}, g.control), reg0: g.reg ? Object.assign({}, g.reg) : null,
    battles: [], flips: [], regs: [], moves: [], merges: [], start: [], orders: [] };
  g.mil = ev; if (g.regPend){ ev.regs.push(...g.regPend); delete g.regPend; }
  if (!ph.war || !W.fronts.length){ g.warNews = []; return ev; }
  if (g.autoOrders && g.autoOrders !== "off"){ const r = frontAuto(g, g.autoOrders); if (r.n) R(gfmt(frontFala(g, "tropas", r.n === 1 ? "autoLogUma" : "autoLog"), r.n)); }
  ev.start = W.armies.map(a => ({ id: a.id, n: a.n, side: a.side, fac: a.fac, reg: a.reg, str: a.str }));
  ev.orders = W.armies.filter(a => a.order).map(a => ({ id: a.id, side: a.side, from: a.reg, type: a.order.type, to: a.order.to, path: [a.reg].concat(a.order.path || []), special: !!a.special }));
  const cf = g.ceasefire > 0;
  if (cf){ g.ceasefire--; R("Trégua em vigor: sem combates neste mês. As tropas descansam.", "good");
    for (const a of W.armies) if (a.special){ a.special = false; g.money += K.ofensiva.custo; } }
  else {
    W.months = (W.months || 0) + 1;
    const wm = W.months - WAR_WEARY_FROM;
    if (wm > 0 && wm % 3 === 0){ applyStats(g, { [KK.pop]: -1 }); R(gfmt(frontFala(g, "tropas", "cansaco"), W.months), "bad"); }
  }
  MIL_QUIET = true;
  tpResolve(g, ev);
  MIL_QUIET = false;
  for (const b of ev.battles){ if (b.took){ ev.regs.push(b.took); if (b.took.state) ev.flips.push(b.took.state); } }
  syncFronts(g);
  if (ev.battles.length) g.stat.battles = (g.stat.battles || 0) + 1;
  W.log = (W.log || []).concat(ev.battles).slice(-40);
  if (ev.battles.some(b => b.special)) W.offAt = g.month + K.ofensiva.intervalo;
  // registro do mês
  const won = ev.battles.filter(b => b.took && b.side === "player"), lost = ev.battles.filter(b => b.took && b.side === "enemy");
  const held = ev.battles.filter(b => !b.win && b.side === "enemy"), fail = ev.battles.filter(b => !b.win && b.side === "player");
  if (ev.battles.length) R(gfmt(frontFala(g, "tropas", "resumoMes"), ev.battles.length, won.length, lost.length), won.length > lost.length ? "good" : lost.length > won.length ? "bad" : "info");
  if (won.length) R(gfmt(frontFala(g, "regioes", "listaGanhou"), won.map(b => regName(b.reg)).join(", ")), "good");
  if (lost.length) R(gfmt(frontFala(g, "regioes", "listaPerdeu"), "", lost.map(b => regName(b.reg)).join(", ")), "bad");
  if (held.length) R(gfmt(frontFala(g, "tropas", "logSegurou"), held.map(b => regName(b.reg)).join(", ")), "good");
  if (fail.length) R(gfmt(frontFala(g, "tropas", "logFalhou"), fail.map(b => regName(b.reg)).join(", ")), "bad");
  for (const b of ev.battles) for (const x of b.lost) R(gfmt(frontFala(g, "tropas", x.side === "player" ? "logDestruido" : "logDestruiuInimigo"), tpName(g, x)), x.side === "player" ? "bad" : "good");
  for (const m of ev.flips) R(gfmt(frontFala(g, "eventos", m.side === "player" ? "tomou" : "perdeu"), MAP_DATA.states[m.uf].name, (scOf(g).story.factions[m.to] || {}).label || m.to), m.side === "player" ? "good" : "bad");
  if (lost.length >= 2 || ev.flips.some(m => m.side === "enemy")) W.lostAt = g.month;
  // fim da guerra: região da sua capital perdida / região-capital do reduto inimigo tomada
  const capR = tpCapReg(g);
  if (tpRegSide(g, capR) === "enemy"){ W.end = { to: "fim_restauracao", why: frontFala(g, "eventos", "derrota") }; R(W.end.why, "bad"); }
  else if (tpArmies(g, "enemy").some(e => REG_DATA.regs[capR].adj.includes(e.reg))) R(frontFala(g, "eventos", "capitalRisco"), "bad");
  for (const fac in K.frentes){
    const D = K.frentes[fac]; if (!ev.regs.some(m => m.id === REG_DATA.cap[D.reduto] && m.side === "player")) continue;
    if (D.vitoria && !W.end){ W.end = { to: D.vitoria, why: frontFala(g, "eventos", "vitoria") }; R(W.end.why, "good"); }
    else if (!D.vitoria) frontCrush(g, fac, R);
  }
  if (!cf){
    // reforços dos dois lados
    const mob = mobilization(g); frontAdd(g, mob); R(gfmt(frontFala(g, "eventos", "mobiliza"), mob), "good");
    const sc = frontEnemyScale(g);
    for (const f of W.fronts){
      const D = K.frentes[f.id], n = Object.values(g.control).filter(x => x === f.id).length;
      const cap = (D.teto || 260) * sc + 40, have = tpTotal(g, "enemy", f.id) + (W.epool[f.id] || 0);
      const tired = 1 - Math.min(0.6, Math.max(0, W.months - WAR_WEARY_FROM) * 0.04); // o inimigo também cansa: menos reforços depois de um ano
      const add = Math.min(Math.max(0, cap - have), Math.max(0, ((D.reforco + 0.25 * n) * sc + (f.id === ph.enemyMain ? foreignFoes(g) * 1.5 + (g.enemyBoost || 0) : 0)) * tired - malusNow(g) * 2));
      if (add > 0) frontEnemyAdd(g, f.id, add);
    }
    const share = regShare(g);
    if (share > 0.65) applyStats(g, { [KK.mil]: 1 }); else if (share < 0.35){ applyStats(g, { [KK.mil]: -2 }); R("Você controla pouco território: o moral das tropas cai.", "bad"); }
  }
  // moral: quem não lutou descansa
  const mx = frontMaxMorale(g), M = T.moral;
  for (const a of W.armies){
    if (a.fought) continue;
    const gen = tpGen(g, a), extra = gen && K.tracos[gen.traco] ? (K.tracos[gen.traco].moral || 0) : 0;
    const top = a.side === "player" ? mx : (K.frentes[a.fac] || {}).moral || 65;
    if (a.morale < top) a.morale = Math.min(top, a.morale + M.descanso + extra);
  }
  for (const a of W.armies){ delete a.moved; delete a.fought; }
  regHistPush(g);
  g.enemyBoost = Math.max(0, (g.enemyBoost || 0) - 0.25);
  if (!W.end) frontPlan(g);
  for (const t of (g.warNews || [])) R(t, "bad"); g.warNews = [];
  return ev;
}
// Reduto da Liga tomado: os estados separatistas voltam para você e a frente fecha
function frontCrush(g, fac, R){
  const ph = phaseOf(g), before = Object.assign({}, g.control);
  const to = ph.playerMain || ph.player[0];
  for (const uf in g.control) if (g.control[uf] === fac) g.control[uf] = to;
  if (g.reg) for (const id in g.reg) if (g.reg[id] === fac){ g.reg[id] = to; if (g.mil) (g.mil.regs ||= []).push({ id, uf: REG_DATA.regs[id].uf, from: fac, to, side: "player", front: fac }); }
  if (g.war) g.war.armies = g.war.armies.filter(a => !(a.side === "enemy" && a.fac === fac));
  noteChanges(g, before);
  if (southOn(g) && fac === southCfg(g).fac){ g.south.state = "esmagada"; if (!g.flags.includes("sul_esmagado")) g.flags.push("sul_esmagado"); }
  if (R) R(frontFala(g, "eventos", "ligaCaiu"), "good");
}
/* ---------- Efeitos de eventos (fx.front, fx.org, fx.enemyLoss) ---------- */
// fx.front > 0: o inimigo perde moral (e você ganha um pouco); < 0, o contrário. fx.org: moral dos seus exércitos.
function frontFx(g, fx){
  const W = g.war; if (!W || !W.armies || !W.armies.length) return;
  const mx = frontMaxMorale(g), up = (a, v) => { a.morale = v > 0 ? Math.min(Math.max(a.morale, a.side === "player" ? mx : 80), a.morale + v) : Math.max(5, a.morale + v); };
  if (fx.front) for (const a of W.armies) up(a, a.side === "player" ? fx.front / 2 : -fx.front);
  if (fx.org) for (const a of tpArmies(g, "player")) up(a, fx.org);
  if (fx.enemyLoss){ const a = tpArmies(g, "enemy").sort((x, y) => y.str - x.str)[0]; if (a){ a.str = Math.max(1, a.str - fx.enemyLoss); } }
}
// Força por estado (agitação, revoltas): soma dos exércitos nas regiões do estado (a reserva fica em Brasília)
function frontStr(g, side, uf){
  const W = g.war; if (!W) return 0;
  if (uf === undefined) return (side === "player" ? W.reserve : 0) + tpTotal(g, side);
  let s = side === "player" && uf === frontCfg(g).capital ? W.reserve : 0;
  for (const a of tpArmies(g, side)) if (REG_DATA.regs[a.reg] && REG_DATA.regs[a.reg].uf === uf) s += a.str;
  return s;
}
// Save v7 → v8: exércitos viram tropas das frentes (formato antigo; o v12 converte de novo em exércitos por região)
function migrateFronts(g){
  if (!frontCfg(g) || !Array.isArray(g.armies)) return;
  const ph = phaseOf(g), mine = g.armies.filter(a => a.side === "player").reduce((s, a) => s + a.str, 0);
  const foes = {}; for (const a of g.armies.filter(a => a.side === "enemy")){ const fac = a.fac || ph.enemyMain; foes[fac] = (foes[fac] || 0) + a.str; }
  g.war = { reserve: ph.noArmies ? 0 : mine, fronts: [], gens: {}, offAt: null, log: [] };
  g.armies = []; g.enemyPlans = [];
  if (ph.war && !ph.noArmies) for (const fac of Object.keys(frontCfg(g).frentes)){
    if (!(ph.enemy || []).includes(fac) || !Object.values(g.control).includes(fac)) continue;
    const D = frontCfg(g).frentes[fac], n = Object.values(g.control).filter(x => x === fac).length;
    const f = { id: fac, troops: 0, enemy: Math.round(Math.max((D.tropas + D.porEstado * n) * 0.6, (foes[fac] || 0) + n * 2)), n, opened: g.month, progress: 0 };
    if (!g.war.fronts.length){ f.troops = g.war.reserve; g.war.reserve = 0; }
    g.war.fronts.push(f);
  }
  g.warNews = [];
}
// Save v11 → v12: a força de cada frente vira exércitos nas regiões da linha (os seus do seu lado, os do inimigo do lado dele)
function migrateV12(g){
  if (!regOn(g) || !g.war) return;
  const W = g.war, old = W.fronts || [], ph = phaseOf(g), K = frontCfg(g);
  const gens = W.gens || {};
  Object.assign(W, { armies: [], seq: 0, epool: {}, log: [], gens: {} });
  delete W.siege;
  regSync(g);
  W.fronts = [];
  if (ph.war && !ph.noArmies){
    let mine = 0;
    for (const f of old){
      if (!regCount(g, f.id)) { mine += f.troops || 0; continue; }
      const nf = { id: f.id, n: f.n || 1, opened: f.opened ?? g.month }; W.fronts.push(nf);
      frontSpawn(g, f.id, Math.max(10, f.enemy || 0));
      for (const a of tpArmies(g, "enemy").filter(a => a.fac === f.id)) a.morale = clamp(Math.round(f.emorale ?? 60), 20, 80);
      mine += f.troops || 0;
    }
    W.reserve = (W.reserve || 0) + mine;
    if (W.fronts.length) frontDeploy(g);
    for (const a of tpArmies(g, "player")) a.morale = clamp(Math.round(old[0] && old[0].morale != null ? old[0].morale : 60), 20, 90);
    // generais antigos (por frente) vão para exércitos, na ordem
    const mineA = tpArmies(g, "player"); let i = 0;
    for (const id in gens) if (gens[id] && mineA[i]) W.gens[id] = mineA[i++].id;
    if (W.fronts.length) tpEnemyPlan(g);
  } else W.reserve = (W.reserve || 0) + old.reduce((s, f) => s + (f.troops || 0), 0);
  if (g.mil) g.mil = null;
  g.warNews = [];
}
/* ---------- Relatório de uma batalha ("por que ganhou / perdeu") ---------- */
function frontReport(g, rec){
  const L = frontCfg(g).falas.fatores, rows = [];
  const pc = v => v == null || Math.abs(v - 1) < 0.005 ? "—" : `${v > 1 ? "+" : "−"}${Math.round(Math.abs(v - 1) * 100)}%`;
  for (const r of rec.rows){
    if (r.kind === "n") rows.push({ k: r.k, label: L[r.k] || r.k, p: r.p == null ? "—" : String(r.p), e: r.e == null ? "—" : String(r.e), fav: (r.p || 0) > (r.e || 0) * 1.05 ? "player" : (r.e || 0) > (r.p || 0) * 1.05 ? "enemy" : null, w: Math.abs(Math.log(Math.max(1, r.p || 0) / Math.max(1, r.e || 0))) });
    else { const lr = Math.log((r.p ?? 1) / (r.e ?? 1)); rows.push({ k: r.k, label: L[r.k] || r.k, p: pc(r.p), e: pc(r.e), fav: lr > 0.01 ? "player" : lr < -0.01 ? "enemy" : null, w: Math.abs(lr) }); }
  }
  const top = rows.filter(r => r.fav && r.k !== "poder").sort((a, b) => b.w - a.w).slice(0, 2);
  const D = frontCfg(g).falas.dicasTropas, tips = [];
  const mineWon = rec.side === "player" ? rec.win : !rec.win;
  if (!mineWon) tips.push(rec.side === "player" ? (rec.chance < 50 ? "juntar" : "azar") : "defender");
  if (rec.rows.some(r => r.k === "terreno" || r.k === "reduto")) tips.push("terreno");
  if (rec.side === "player" && !rec.special) tips.push("ofensiva");
  tips.push("recrutar");
  const pPow = rec.side === "player" ? rec.A : rec.D, ePow = rec.side === "player" ? rec.D : rec.A;
  return { summary: frontFala(g, "porque", rec.why), top, rows, tips: [...new Set(tips)].slice(0, 2).map(k => D[k]), power: { p: pPow, e: ePow }, won: mineWon, chance: rec.side === "player" ? rec.chance : 100 - rec.chance };
}
