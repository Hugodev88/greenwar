// js/core/regioes.js — Núcleo: guerra por REGIÕES (2022). Na guerra o mapa se divide nas 133 regiões intermediárias do IBGE
// (js/data/mapa-regioes.js); fora dela tudo continua por estado. Sem DOM.
/* Estado salvo (save v10+): g.reg = { idDaRegião: facção }. Regras:
   - Na guerra, os exércitos (js/core/tropas.js) tomam regiões vizinhas em batalhas; nada de pular regiões.
   - O dono de um ESTADO é quem tem a maioria das regiões dele; empate: quem tem a região da capital. Não existe "em disputa".
   - Fora da guerra (ou quando a história/um evento muda um estado inteiro) as regiões copiam o estado: regSync pinta todas.
   - Vitória/derrota em regiões: a região de Recife (reduto da resistência), a de Porto Alegre (Liga do Sul) e o Distrito Federal (sua capital).
   - regPath/regFaltam: caminho mais curto (BFS por regiões do defensor) até a capital inimiga — o "Faltam N regiões até Recife". */
const REG_IDS = Object.keys(REG_DATA.regs);
const REG_UF = {}; for (const id of REG_IDS) (REG_UF[REG_DATA.regs[id].uf] ||= []).push(id);
function regOn(g){ return !!(g && frontCfg(g)); }
function regName(id){ const r = REG_DATA.regs[id]; return r ? r.n : id; }
function regLabel(id){ const r = REG_DATA.regs[id]; return r ? `${r.n} (${r.uf})` : id; }
// Dono do estado pelas regiões: maioria; empate → quem tem a região da capital
function regOwnerUF(g, uf){
  const n = {}; for (const id of REG_UF[uf]) n[g.reg[id]] = (n[g.reg[id]] || 0) + 1;
  let best = null, bn = -1;
  for (const k in n) if (n[k] > bn){ best = k; bn = n[k]; }
  const cap = g.reg[REG_DATA.cap[uf]];
  return n[cap] === bn ? cap : best;
}
// Regiões acompanham o estado: cria g.reg e repinta todo estado cujo dono (pelas regiões) não bate com g.control.
// Fora da guerra as regiões sempre copiam o estado.
function regSync(g){
  if (!regOn(g)) return null;
  const war = !!phaseOf(g).war;
  if (!g.reg){ g.reg = {}; for (const id of REG_IDS) g.reg[id] = g.control[REG_DATA.regs[id].uf]; }
  for (const uf in REG_UF){
    if (war && regOwnerUF(g, uf) === g.control[uf]) continue;
    for (const id of REG_UF[uf]) g.reg[id] = g.control[uf];
  }
  return g.reg;
}
// Uma região muda de dono; o estado muda junto se a maioria virar. Devolve { id, uf, from, to, side, state? }
function regTake(g, id, fac, side){
  const uf = REG_DATA.regs[id].uf, from = g.reg[id];
  g.reg[id] = fac;
  const o = regOwnerUF(g, uf), out = { id, uf, from, to: fac, side };
  if (o !== g.control[uf]){ out.state = { uf, from: g.control[uf], to: o, side }; setControl(g, uf, o); }
  return out;
}
const REG_DIST = {};
function regDist(from){ // distância (em regiões) de cada região até "from"
  if (REG_DIST[from]) return REG_DIST[from];
  const d = { [from]: 0 }, q = [from];
  while (q.length){ const u = q.shift(); for (const n of REG_DATA.regs[u].adj) if (!(n in d)){ d[n] = d[u] + 1; q.push(n); } }
  return (REG_DIST[from] = d);
}
function regCount(g, fac){ let n = 0; for (const id of REG_IDS) if (g.reg[id] === fac) n++; return n; }
function regSideCount(g, side){ const ph = phaseOf(g); let n = 0; for (const id of REG_IDS) if (sideOf(g, g.reg[id], ph) === side) n++; return n; }
// Alvo final de cada lado: reduto inimigo (dir +1) ou a sua capital (dir −1)
function regGoal(g, f, dir){ const K = frontCfg(g); return REG_DATA.cap[dir > 0 ? K.frentes[f.id || f].reduto : K.capital]; }
// Lados de uma frente numa direção: dir +1 = você ataca (defensor = o inimigo desta frente); dir −1 = o inimigo ataca você
function regSides(g, f, dir, reg){
  const ph = phaseOf(g), fid = f.id || f, M = reg || g.reg, pl = id => sideOf(g, M[id], ph) === "player", en = id => M[id] === fid;
  return dir > 0 ? { atk: pl, def: en } : { atk: en, def: pl };
}
// Caminho mais curto da linha até o alvo final andando só por regiões do defensor: [primeira região além da linha, …, alvo].
// É o "Faltam N regiões até Recife" e a rota do rompimento. null se o alvo não é do defensor ou não há caminho.
function regPath(g, f, dir){
  const goal = regGoal(g, f, dir); if (!goal || !g.reg) return null;
  const { atk, def } = regSides(g, f, dir); if (!def(goal)) return null;
  const prev = { [goal]: null }, q = [goal];
  while (q.length){
    const u = q.shift();
    if (REG_DATA.regs[u].adj.some(atk)){ const path = []; for (let x = u; x; x = prev[x]) path.push(x); return path; }
    for (const n of REG_DATA.regs[u].adj) if (!(n in prev) && def(n)){ prev[n] = u; q.push(n); }
  }
  return null;
}
// "Faltam N regiões até Recife": regiões do defensor entre a linha e o alvo, contando o alvo (null sem caminho)
function regFaltam(g, f, dir){ const P = regPath(g, f, dir); return P ? P.length : null; }
// Nome do alvo de uma direção: Recife / Porto Alegre (dir +1) ou a sua capital, "Brasília" (dir −1)
function regGoalName(g, f, dir){ const K = frontCfg(g); return dir < 0 && K.capitalNome ? K.capitalNome : regName(regGoal(g, f, dir)); }
// Regiões nos dois lados da linha de uma frente (para o desenho e a força por estado)
function regBorder(g, f){
  const ph = phaseOf(g), mine = [], theirs = [];
  for (const id of REG_IDS){
    const adj = REG_DATA.regs[id].adj;
    if (sideOf(g, g.reg[id], ph) === "player"){ if (adj.some(n => g.reg[n] === f.id)) mine.push(id); }
    else if (g.reg[id] === f.id && adj.some(n => sideOf(g, g.reg[n], ph) === "player")) theirs.push(id);
  }
  return { mine, theirs };
}
// Placar de território de uma frente: suas regiões × regiões deste inimigo, e o saldo do último mês nesta frente
function regTally(g, f){
  const fid = f.id || f, ph = phaseOf(g), last = (g.mil && g.mil.regs) || [];
  const got = last.filter(m => m.front === fid && m.side === "player").length, lost = last.filter(m => m.front === fid && m.side === "enemy").length;
  return { p: regSideCount(g, "player"), e: regCount(g, fid), total: REG_IDS.length, got, lost, enemyAll: REG_IDS.filter(id => sideOf(g, g.reg[id], ph) === "enemy").length };
}
// Histórico mensal do território (para a tendência): [{ m, p, e: { facção: n } }]
// Parcela do território (pelo peso dos estados, repartido entre as regiões de cada um) do seu lado
function regShare(g){
  const ph = phaseOf(g); let p = 0, t = 0;
  for (const id of REG_IDS){ const uf = REG_DATA.regs[id].uf, w = (UF_WEIGHT[uf] || 1) / REG_UF[uf].length, s = sideOf(g, g.reg[id], ph);
    if (s === "player") p += w; if (s === "player" || s === "enemy") t += w; }
  return t ? p / t : 1;
}
function regHistPush(g){
  const W = g.war; if (!W) return;
  const e = {}; for (const f of W.fronts) e[f.id] = regCount(g, f.id);
  W.hist = (W.hist || []).filter(h => h.m !== g.month).concat([{ m: g.month, p: regSideCount(g, "player"), e }]).slice(-18);
}
// Metade das regiões de um estado (as encostadas em quem ganha primeiro) passa para "fac". O estado só muda se a maioria virar.
// Usado na guerra no lugar do antigo "em disputa": revolta num estado seu, governador convencido num estado inimigo.
function regHalf(g, uf, fac, side, why){
  regSync(g);
  const near = id => REG_DATA.regs[id].adj.filter(n => g.reg[n] === fac).length;
  const ids = REG_UF[uf].filter(id => g.reg[id] !== fac).sort((a, b) => near(b) - near(a) || (a < b ? -1 : 1));
  const out = [], n = Math.max(1, Math.ceil(REG_UF[uf].length / 2));
  for (const id of ids.slice(0, n)){ const m = regTake(g, id, fac, side); m.front = side === "enemy" ? fac : m.from; m.why = why; out.push(m); }
  (g.regPend ||= []).push(...out);
  return out;
}
// História (onEnter/escolha "split": { UF: facção }): metade das regiões do estado (arredondada para baixo, as mais perto de
// quem recebe) passa para a facção; o estado continua com quem tinha (maioria ou capital). É o "estado dividido" do golpe.
function regSplit(g, spec){
  regSync(g);
  for (const uf in spec){
    const fac = spec[uf], near = id => REG_DATA.regs[id].adj.filter(n => g.reg[n] === fac).length;
    for (let k = Math.floor(REG_UF[uf].length / 2); k > 0; k--){ // uma a uma: o pedaço dividido fica contínuo
      const ids = REG_UF[uf].filter(id => g.reg[id] !== fac && id !== REG_DATA.cap[uf]).sort((a, b) => near(b) - near(a) || (a < b ? -1 : 1));
      if (!ids.length) break; g.reg[ids[0]] = fac; }
  }
}
// Revolta num estado seu durante a guerra: metade das regiões dele passa para o inimigo vizinho (ou o principal)
function regRevolt(g, uf){
  const ph = phaseOf(g); regSync(g);
  const cnt = {}; for (const id of REG_UF[uf]) for (const n of REG_DATA.regs[id].adj) if (sideOf(g, g.reg[n], ph) === "enemy") cnt[g.reg[n]] = (cnt[g.reg[n]] || 0) + 1;
  const fac = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0] || ph.enemyMain || (ph.enemy || [])[0];
  if (!fac) return [];
  const out = regHalf(g, uf, fac, "enemy", "revolta");
  if (g.war) g.war.lostAt = g.month;
  return out;
}
// Saves: "em disputa" não existe mais no 2022. Cada estado em disputa vai para o lado da maioria dos vizinhos (empate: seu lado).
function dropContested(g){
  const S = scOf(g).story, valid = k => !!S.factions[k];
  const fix = ctl => { if (!ctl) return; for (const uf in ctl) if (!valid(ctl[uf])){
    const n = {}; for (const x of ADJ[uf] || []) if (valid(ctl[x])) n[ctl[x]] = (n[ctl[x]] || 0) + 1;
    const ph = phaseOf(g), pick = Object.keys(n).sort((a, b) => n[b] - n[a] || (sideOf(g, b, ph) === "player") - (sideOf(g, a, ph) === "player"))[0];
    ctl[uf] = pick || (ph.playerMain || (ph.player || [])[0] || S.defaultFaction); } };
  fix(g.control);
  if (g.mil && g.mil.control0) fix(g.mil.control0);
  g.lastMapChanges = (g.lastMapChanges || []).filter(c => valid(c.to));
}
// Save v9 → v10: cria as regiões a partir dos estados; a linha de cada frente vira "progresso até a próxima região"
function migrateRegions(g){
  if (!regOn(g)) return;
  dropContested(g);
  for (const uf in g.uf) if (g.uf[uf]) g.uf[uf].progress = 0;
  g.reg = null; regSync(g);
  if (g.war){ for (const f of g.war.fronts) f.progress = clamp(Math.round(f.progress || 0), -90, 90); g.war.hist = []; if (phaseOf(g).war && g.war.fronts.length) regHistPush(g); }
}
// Save v10 → v11: frentes ganham eixo (f.axis) e rompimento (f.rompe), que começam vazios; o cerco antigo é limitado ao novo máximo.
// Guerra já em andamento contra a resistência: Recife já é a capital dela (marca a flag sem repetir o anúncio).
function migrateV11(g){
  if (!regOn(g) || !g.war) return;
  for (const f of g.war.fronts){ f.axis = {}; delete f.rompe; }
  for (const f of g.war.fronts){ const fl = frontCfg(g).frentes[f.id].capitalFlag; if (fl && !g.flags.includes(fl)) g.flags.push(fl); }
}
