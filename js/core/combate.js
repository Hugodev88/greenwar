// js/core/combate.js — Núcleo: batalhas, relatório de batalha e resolução militar do mês.
function battleOdds(g, side, attackers, uf){
  const foe = side === "player" ? "enemy" : "player", def = defendersAt(g, foe, uf);
  const ma = modsMult(milMods(g, side, uf, "att", attackers)), md = modsMult(milMods(g, foe, uf, "def", def));
  const pa = attackers.reduce((s, a) => s + armyPow(a), 0) * ma, pd = def.reduce((s, a) => s + armyPow(a), 0) * md;
  return { ratio: pd > 0 ? pa / pd : 99, pa: Math.round(pa), pd: Math.round(pd), def };
}
// Uma batalha em rodadas. A e B: { side, role: "att"|"def", units: [exércitos ou milícias] } (mutados)
function fight(g, uf, A, B, kind){
  const S = [A, B], mods = S.map(x => milMods(g, x.side, uf, x.role, x.units)), mult = mods.map(modsMult);
  const total = x => x.units.reduce((s, u) => s + u.str, 0);
  const pow = i => S[i].units.reduce((s, u) => s + armyPow(u), 0) * mult[i];
  const avgOrg = x => { const t = total(x); return t > 0 ? x.units.reduce((s, u) => s + u.org * u.str, 0) / t : 0; };
  const hurt = (x, dmg) => { const t = total(x) || 1; for (const u of x.units){ u.str = Math.max(0, u.str - dmg * 0.4 * u.str / t); u.org = Math.max(0, u.org - dmg / t * 90); } };
  const rec = { uf, kind, month: g.month, rounds: [],
    sides: S.map((x, i) => ({ side: x.side, role: x.role, mult: Math.round(mult[i] * 100) / 100, mods: mods[i],
      units: x.units.map(u => ({ id: u.id || null, name: u.name, gen: u.gen || null, fac: u.fac || null, militia: !!u.militia, str0: Math.round(u.str), org0: Math.round(u.org), xp: Math.round(u.xp || 0) })) })) };
  const rolls = [[], []];
  rec.pow = [Math.round(pow(0)), Math.round(pow(1))]; rec.defEdge = B.role === "def" ? 1.1 : 1;
  for (let r = 0; r < 5; r++){
    const p0 = pow(0), p1 = pow(1); if (p0 < 0.5 || p1 < 0.5) break;
    const k0 = 0.75 + rnd(g) * 0.5, k1 = 0.75 + rnd(g) * 0.5;   // k0: sorte do lado 1 (dano que ele causa); k1: do lado 0
    rolls[1].push(k0); rolls[0].push(k1);
    const d0 = p1 * 0.15 * k0, d1 = p0 * 0.15 * k1;
    hurt(S[0], d0); hurt(S[1], d1);
    rec.rounds.push({ hit: [Math.round(d0 * 10) / 10, Math.round(d1 * 10) / 10], u: S.map(x => x.units.map(u => [Math.round(u.str * 10) / 10, Math.round(u.org)])) });
    if (avgOrg(S[0]) < 20 || avgOrg(S[1]) < 20) break;
  }
  const p0 = pow(0), p1 = pow(1), b0 = avgOrg(S[0]) < 20 || p0 < 0.5, b1 = avgOrg(S[1]) < 20 || p1 < 0.5;
  const win = b1 && !b0 ? 0 : b0 && !b1 ? 1 : (p0 > p1 * (B.role === "def" ? 1.1 : 1) ? 0 : 1);
  rec.win = win;
  rec.powEnd = [Math.round(p0), Math.round(p1)]; rec.broke = [b0, b1];
  rec.luck = rolls.map(a => a.length ? Math.round(a.reduce((t, x) => t + x, 0) / a.length * 100) / 100 : 1);
  rec.margin = Math.round(clamp(Math.abs(p0 - p1) / Math.max(1, p0 + p1) + ((win === 0 ? b1 : b0) ? 0.25 : 0), 0, 1) * 100) / 100;
  rec.loss = S.map((x, i) => Math.round(rec.sides[i].units.reduce((s, u) => s + u.str0, 0) - total(x)));
  for (let i = 0; i < 2; i++) for (const u of S[i].units) if (!u.militia){ u.xp = Math.min(100, (u.xp || 0) + (i === win ? 8 : 5)); u.str = Math.round(u.str * 10) / 10; }
  return rec;
}
// Relatório pós-batalha (puro, sem DOM): fatores com valor e quem favoreceram, baixas, frase-resumo e dicas.
// Funciona com registros antigos (sem rolagens) e com a previsão (sem rodadas).
const BR_KEYS = { terreno: "Terreno", posicao: "Posições preparadas", apoio: "Apoio local", comando: "Comando e lealdade militar", supr: "Suprimentos",
  armas: "Armas estrangeiras", qual: "Qualidade das tropas", mob: "Mobilização" };
function battleReport(rec){
  const S = rec.sides, pi = Math.max(0, S.findIndex(s => s.side === "player")), ei = 1 - pi, P = S[pi], E = S[ei];
  const forecast = !rec.rounds || !rec.rounds.length || rec.win === undefined, won = !forecast && rec.win === pi;
  const sum = (s, f) => s.units.reduce((t, u) => t + f(u), 0), str = s => sum(s, u => u.str0 || 0);
  const wavg = (s, k) => { const t = str(s); return t ? sum(s, u => (u[k] || 0) * (u.str0 || 0)) / t : 0; };
  const mult = s => s.mult ?? modsMult(s.mods || []);
  const qO = o => 0.45 + 0.55 * o / 100, qX = x => 1 + x / 250, ln = x => Math.log(Math.max(1e-3, x));
  const sp = str(P), se = str(E), oP = wavg(P, "org0"), oE = wavg(E, "org0"), xP = wavg(P, "xp"), xE = wavg(E, "xp");
  const rows = [];
  const row = (k, label, p, e, lr, extra) => rows.push(Object.assign({ k, label, p, e, lr: Math.round(lr * 1000) / 1000, fav: Math.abs(lr) < 0.02 ? null : lr > 0 ? "player" : "enemy" }, extra || {}));
  const x = (a, b) => (b > 0 ? a / b : 9.9);
  row("tropas", "Tropas (força total)", Math.round(sp), Math.round(se), ln(Math.max(1, sp) / Math.max(1, se)), { ratio: sp >= se ? x(sp, se) : x(se, sp) });
  const both = sp > 0 && se > 0, nv = (t, v) => t > 0 ? Math.round(v) : "—";   // lado sem tropas: moral/xp não se comparam
  row("moral", "Moral / organização média", nv(sp, oP), nv(se, oE), both ? ln(qO(oP) / qO(oE)) : 0);
  row("xp", "Experiência média", nv(sp, xP), nv(se, xE), both ? ln(qX(xP) / qX(xE)) : 0);
  const pct = v => (v > 0 ? "+" : "") + Math.round(v * 100) + "%";
  const keys = [...new Set([...(P.mods || []), ...(E.mods || [])].map(m => m.k))];
  for (const k of keys){
    const mp = (P.mods || []).filter(m => m.k === k), me = (E.mods || []).filter(m => m.k === k);
    const vp = mp.reduce((t, m) => t + m.v, 0), ve = me.reduce((t, m) => t + m.v, 0);
    row(k, BR_KEYS[k] || (mp[0] || me[0]).label, vp ? pct(vp) : "—", ve ? pct(ve) : "—", vp / mult(P) - ve / mult(E),
      { hint: [...mp, ...me].map(m => m.label).join(" · "), vp, ve });
  }
  const defI = S.findIndex(s => s.role === "def");
  if (defI >= 0 && S[1 - defI].role === "att" && !forecast) row("defensor", "Vantagem do defensor (atacante precisa de +10%)", defI === pi ? "+10%" : "—", defI === ei ? "+10%" : "—", (defI === pi ? 1 : -1) * ln(1.1));
  if (rec.luck && !forecast) row("sorte", "Sorte nas rolagens (dano causado)", "×" + rec.luck[pi].toFixed(2), "×" + rec.luck[ei].toFixed(2), ln(rec.luck[pi] / rec.luck[ei]));
  const powP = rec.pow ? rec.pow[pi] : Math.round(sum(P, u => armyPow({ str: u.str0, org: u.org0, xp: u.xp })) * mult(P));
  const powE = rec.pow ? rec.pow[ei] : Math.round(sum(E, u => armyPow({ str: u.str0, org: u.org0, xp: u.xp })) * mult(E));
  const loss = rec.loss ? { p: rec.loss[pi], e: rec.loss[ei] } : null;
  // frase-resumo: fatores que pesaram a favor do vencedor (na previsão: de quem está à frente)
  const goal = forecast ? (powP >= powE ? "player" : "enemy") : (won ? "player" : "enemy");
  const main = rows.filter(r => r.fav === goal && Math.abs(r.lr) >= 0.04).sort((a, b) => Math.abs(b.lr) - Math.abs(a.lr)).slice(0, 2);
  const fmt = v => v.toFixed(1).replace(".", ",");
  const phrase = r => {
    const pl = r.fav === "player";
    switch (r.k){
      case "tropas": if (!r.p || !r.e) return pl ? "o inimigo não tinha tropas lá" : "você não tinha tropas lá";
        return r.ratio >= 1.3 ? `${pl ? "você tinha" : "o inimigo tinha"} ${fmt(r.ratio)}× mais tropas` : `${pl ? "você tinha" : "o inimigo tinha"} um pouco mais de tropas`;
      case "moral": return `${pl ? "sua moral estava mais alta" : "a moral do inimigo estava mais alta"} (${pl ? r.p : r.e} × ${pl ? r.e : r.p})`;
      case "xp": return pl ? "suas tropas eram mais experientes" : "as tropas inimigas eram mais experientes";
      case "terreno": return `${pl ? "você tinha" : "o inimigo tinha"} bônus de terreno (${pl ? r.p : r.e})`;
      case "posicao": return pl ? "você estava em posições preparadas" : "o inimigo estava entrincheirado";
      case "apoio": return pl ? "a população local apoiou você" : "o apoio local estava contra você";
      case "comando": return pl ? "seu comando e a lealdade militar estavam fortes" : "seu comando e a lealdade militar estavam fracos";
      case "supr": return pl ? "o inimigo estava com problemas de suprimento" : "suas tropas estavam com problemas de suprimento";
      case "armas": return pl ? "você recebeu armas estrangeiras" : "o inimigo recebeu armas estrangeiras";
      case "qual": return pl ? "as tropas inimigas são de pior qualidade" : "as tropas inimigas são de melhor qualidade";
      case "mob": return pl ? "o inimigo estava desmobilizado" : "o inimigo estava em plena mobilização";
      case "defensor": return pl ? "o defensor (você) tem vantagem no desempate" : "o defensor tem vantagem no desempate";
      case "sorte": return pl ? "a sorte ajudou você" : "a sorte ajudou o inimigo";
      default: return `${r.label.toLowerCase()} favoreceu ${pl ? "você" : "o inimigo"}`;
    }
  };
  const why = main.length ? main.map(phrase).join(" e ") : "";
  const summary = forecast
    ? (why ? `${powP >= powE ? "Você está em vantagem" : "O inimigo está em vantagem"} principalmente porque ${why}.` : "Forças equilibradas.")
    : (why ? `${won ? "Você venceu" : "Você perdeu"} principalmente porque ${why}.` : `${won ? "Você venceu" : "Você perdeu"} uma batalha equilibrada, decidida nos detalhes.`);
  let how = "";
  if (!forecast){
    const n = rec.rounds.length, br = rec.broke;
    const pBroke = br ? br[pi] : false, eBroke = br ? br[ei] : false;
    how = `${n} rodada${n > 1 ? "s" : ""}. ` + (eBroke && !pBroke ? "A moral inimiga caiu abaixo de 20 e ele recuou."
      : pBroke && !eBroke ? "A moral das suas tropas caiu abaixo de 20 e elas recuaram."
      : `Ninguém quebrou: venceu quem tinha mais poder de combate no fim${rec.powEnd ? ` (${rec.powEnd[pi]} × ${rec.powEnd[ei]})` : ""}${defI >= 0 && S[1 - defI].role === "att" ? "; o atacante precisava de 10% a mais" : ""}.`);
  }
  const TIP = {
    tropas: "Junte mais força: vários exércitos atacando o mesmo estado somam tropas. Use “＋ Recrutar tropas” ou “Reforçar” antes de atacar.",
    moral: "Dê a ordem Defender por um mês para recuperar a moral antes de atacar de novo.",
    xp: "Exércitos ganham experiência a cada batalha: use os veteranos na ponta.",
    terreno: "Estados de serra, selva ou metrópole defendem melhor: ataque com ao menos 1,3× na previsão ou escolha terreno aberto.",
    posicao: "Ele estava entrincheirado: ataque com vários exércitos ou por outro estado vizinho.",
    defensor: "Quem ataca precisa de vantagem clara: confira a previsão (chance “favorável”) antes de mandar o ataque.",
    apoio: "Suba o apoio popular e a simpatia do estado (ações do mapa) antes da ofensiva.",
    comando: "Suba o atributo militar e a lealdade dos militares (Decisões e Facções).",
    supr: "Ataque a partir de estados vizinhos aos seus e mantenha os cofres positivos.",
    armas: "Na Diplomacia, peça armas para você ou tente reduzir o apoio estrangeiro ao inimigo.",
    qual: "As tropas dele são melhores: compense com número e ataques combinados.",
    mob: "O inimigo está mobilizado: concentre forças num ponto fraco em vez de atacar em vários estados.",
    sorte: "Foi azar: com as mesmas forças, um novo ataque tem boa chance."
  };
  let tips;
  if (forecast) tips = powP >= powE * 1.3 ? ["Boa chance: mande o ataque com estes exércitos."] : [TIP.tropas, TIP.defensor];
  else if (won) tips = [rec.margin < 0.15 ? "Vitória apertada: reforce e deixe a moral subir antes de avançar." : "Seus exércitos que lutaram perderam moral: dê um mês de Defender antes do próximo ataque, se puder."];
  else tips = rows.filter(r => r.fav === "enemy" && TIP[r.k]).sort((a, b) => Math.abs(b.lr) - Math.abs(a.lr)).slice(0, 3).map(r => TIP[r.k]);
  if (!tips.length) tips = [TIP.tropas];
  return { pi, won, forecast, rows, summary, how, tips, loss, power: { p: powP, e: powE } };
}
function logBattles(g, list){
  if (!list || !list.length) return;
  g.battleLog = (g.battleLog || []).concat(list).slice(-30);
}
function flipState(g, uf, fac, side, ev){
  const from = g.control[uf]; if (from === fac) return;
  setControl(g, uf, fac);
  const u = g.uf[uf];
  if (side === "player"){ u.enemy = 0; u.unrest = Math.max(u.unrest, 50); }
  ev.flips.push({ uf, from, to: fac, side });
}
function retreatArmy(g, a, from, ev, R){
  const ph = phaseOf(g), own = a.side;
  const opts = ADJ[from].filter(n => sideOf(g, g.control[n], ph) === own);
  const alt = opts.length ? opts : ADJ[from].filter(n => n !== from && armyAllowed(g, own, n, ph) && !armiesOf(g, own === "player" ? "enemy" : "player", n).length);
  if (!alt.length){ removeArmy(g, a); ev.lost.push({ id: a.id, name: a.name, side: a.side, uf: from }); R(`${a.name} foi cercado em ${MAP_DATA.states[from].name} e se rendeu.`, a.side === "player" ? "bad" : "good"); return; }
  const to = alt.sort((x, y) => armiesOf(g, own, y).length - armiesOf(g, own, x).length || UF_WEIGHT[y] - UF_WEIGHT[x] || (x < y ? -1 : 1))[0];
  a.uf = to; a.org = Math.max(5, a.org - 10);
  ev.moves.push({ id: a.id, side: a.side, from, to, type: "recuo" });
}
function cleanupArmies(g, ev, R){
  for (const a of [...g.armies]) if (a.str < 3){ removeArmy(g, a); ev.lost.push({ id: a.id, name: a.name, side: a.side, uf: a.uf }); R(`${a.name} foi dispersado.`, a.side === "player" ? "bad" : "good"); }
}
function battleText(rec){
  const S = rec.sides, name = MAP_DATA.states[rec.uf].name, att = S[0], win = S[rec.win];
  const who = x => x.units.filter(u => !u.militia).map(u => u.name).join(" + ") || x.units.map(u => u.name).join(" + ");
  if (rec.kind === "frente") return `Batalha em ${name}: ${win.side === "player" ? "vantagem sua" : "vantagem inimiga"} (baixas: suas ${rec.loss[S[0].side === "player" ? 0 : 1]}, inimigas ${rec.loss[S[0].side === "player" ? 1 : 0]}).`;
  const pl = att.side === "player";
  return `${pl ? "Ataque seu" : "Ataque inimigo"} em ${name} (${who(att)}): ${rec.win === 0 ? (pl ? "vitória" : "o inimigo venceu") : (pl ? "repelido" : "repelido pelas suas defesas")}.`;
}
function resolveAttack(g, side, att, uf, ev, R, fought){
  const ph = phaseOf(g), C = scOf(g).campaign, foe = side === "player" ? "enemy" : "player", u = g.uf[uf];
  const ts = sideOf(g, g.control[uf], ph), from = att.map(a => a.uf), name = MAP_DATA.states[uf].name;
  const defA = armiesOf(g, foe, uf).filter(a => !fought.has(a.id)), mil = militia(g, foe, uf);
  const defU = defA.concat(mil ? [mil] : []);
  att.forEach(a => fought.add(a.id)); defA.forEach(a => fought.add(a.id));
  g.stat.battles++;
  const main = side === "player" ? ph.playerMain : enemyFacOf(g, att[0]);
  if (!defU.length){
    att.forEach((a, i) => { ev.moves.push({ id: a.id, side, from: from[i], to: uf, type: "ocupar" }); a.uf = uf; });
    const dir0 = side === "player" ? 1 : -1;
    if (ts === "contested" && Math.abs(u.progress = clamp(u.progress + dir0 * 60, -100, 100)) < 100){
      R(`${side === "player" ? "Suas tropas avançaram" : "O inimigo avançou"} em ${name} sem encontrar resistência organizada (frente ${u.progress > 0 ? "+" : ""}${u.progress}).`, side === "player" ? "good" : "bad");
      return;
    }
    flipState(g, uf, main, side, ev);
    R(`${side === "player" ? "Suas tropas ocuparam" : "O inimigo ocupou"} ${name} sem resistência.`, side === "player" ? "good" : "bad");
    return;
  }
  const rec = fight(g, uf, { side, role: "att", units: att }, { side: foe, role: "def", units: defU }, ts === "contested" ? "frente" : "ataque");
  rec.from = from; rec.attack = true;
  if (mil && foe === "enemy") u.enemy = Math.max(0, Math.round(mil.str / GARRISON_K));
  const dir = side === "player" ? 1 : -1;
  let result;
  if (rec.win === 0){
    for (const d of defA) if (g.armies.includes(d)) retreatArmy(g, d, uf, ev, R);
    const left = militia(g, foe, uf);
    let flip;
    if (ts === "contested"){ u.progress = clamp(u.progress + dir * Math.round(45 + 60 * rec.margin), -100, 100); flip = Math.abs(u.progress) >= 100 || !left || left.str < 3; }
    else flip = side === "player" && (rec.margin >= 0.6 || !left || left.str < 3);   // o inimigo só abre frentes em território seu
    att.forEach((a, i) => { if (g.armies.includes(a) && a.str >= 3){ ev.moves.push({ id: a.id, side, from: from[i], to: uf, type: "avanço" }); a.uf = uf; } });
    if (flip){ flipState(g, uf, main, side, ev); result = side === "player" ? `${name} conquistado` : `${name} perdido para o inimigo`; }
    else if (ts !== "contested"){ const f0 = g.control[uf]; setControl(g, uf, C.contested); g.uf[uf].progress = dir * Math.round(30 + 50 * rec.margin); if (side === "enemy") g.uf[uf].enemy = Math.max(g.uf[uf].enemy, 1); ev.flips.push({ uf, from: f0, to: C.contested, side }); result = `${name} entrou em disputa`; }
    else result = `avanço em ${name} (frente ${g.uf[uf].progress > 0 ? "+" : ""}${g.uf[uf].progress})`;
  } else {
    if (ts === "contested") u.progress = clamp(u.progress - dir * Math.round(20 + 40 * rec.margin), -100, 100);
    result = "ataque repelido";
  }
  rec.result = result; rec.control = g.control[uf];
  ev.battles.push(rec);
  R(battleText(rec) + ` Baixas: ${rec.loss[0]} × ${rec.loss[1]}.`, (rec.win === 0) === (side === "player") ? "good" : "bad");
  cleanupArmies(g, ev, R);
}
function resolveFront(g, uf, ev, R, fought){
  const ph = phaseOf(g), u = g.uf[uf], name = MAP_DATA.states[uf].name;
  const P = armiesOf(g, "player", uf).filter(a => !fought.has(a.id)), E = armiesOf(g, "enemy", uf).filter(a => !fought.has(a.id));
  if (rnd(g) < 0.25 + 0.08 * foreignFoes(g)) u.enemy = Math.min(9, u.enemy + 1);
  const pm = militia(g, "player", uf), em = militia(g, "enemy", uf);
  g.stat.battles++;
  if (!P.length && !E.length){
    u.progress = clamp(u.progress + Math.round(((pm ? pm.str : 0) - (em ? em.str : 0)) * 0.6 + (rnd(g) * 24 - 12)), -100, 100);
  } else {
    P.concat(E).forEach(a => fought.add(a.id));
    const PU = P.concat(pm ? [pm] : []), EU = E.concat(em ? [em] : []);
    if (!EU.length) u.progress = 100;
    else if (!PU.length) u.progress = -100;
    else {
      const rec = fight(g, uf, { side: "player", role: "att", units: PU }, { side: "enemy", role: "att", units: EU }, "frente");
      if (em) u.enemy = Math.max(0, Math.round(em.str / GARRISON_K));
      const pw = rec.win === 0, sh = Math.round(30 + 60 * rec.margin);
      u.progress = clamp(u.progress + (pw ? sh : -sh), -100, 100);
      if (rec.margin >= 0.25) for (const a of (pw ? E : P)) if (g.armies.includes(a)) retreatArmy(g, a, uf, ev, R);
      rec.result = `${pw ? "vantagem sua" : "vantagem inimiga"} (frente ${u.progress > 0 ? "+" : ""}${u.progress})`;
      ev.battles.push(rec);
      R(battleText(rec), pw ? "good" : "bad");
    }
  }
  if (u.progress >= 100){ flipState(g, uf, ph.playerMain, "player", ev); R(`Vitória: ${name} agora está sob seu controle.`, "good"); }
  else if (u.progress <= -100){ flipState(g, uf, enemyFacOf(g, E[0]), "enemy", ev); R(`Derrota: ${name} caiu nas mãos do inimigo.`, "bad"); }
  cleanupArmies(g, ev, R);
}
function moveOk(g, a, to){ const ph = phaseOf(g), s = sideOf(g, g.control[to], ph); return ADJ[a.uf].includes(to) && (s === a.side || (a.side === "player" && !ph.war && s === "contested")); }
// Resolução mensal: movimentos → ataques → frentes em disputa → recuperação
function militaryMonth(g, R, combat){
  const ph = phaseOf(g), war = !!ph.war && combat !== false;
  const ev = g.mil = { month: g.month, war, control0: Object.assign({}, g.control), moves: [], battles: [], flips: [], lost: [],
    start: g.armies.map(a => ({ id: a.id, side: a.side, uf: a.uf, str: Math.round(a.str), name: a.name, fac: a.fac })) };
  const plans = [];
  for (const a of g.armies) if (a.side === "player" && a.order) plans.push({ a, type: a.order.type, to: a.order.to });
  for (const p of (g.enemyPlans || [])){ const a = armyById(g, p.id); if (a && a.side === "enemy") plans.push({ a, type: p.type, to: p.to }); }
  ev.orders = plans.filter(p => p.to).map(p => ({ id: p.a.id, side: p.a.side, from: p.a.uf, to: p.to, type: p.type }));
  const fought = new Set();
  MIL_QUIET = true;
  try {
    for (const p of plans){
      const a = p.a;
      if ((p.type === "mover" || p.type === "recuar") && moveOk(g, a, p.to)){ ev.moves.push({ id: a.id, side: a.side, from: a.uf, to: p.to, type: p.type }); a.uf = p.to; a.org = Math.max(0, a.org - 3); }
      else if (p.type === "reforcar"){ a.str = Math.min(ARMY_MAX, a.str + STR_UNIT); a.org = Math.min(maxOrg(g, a.side), a.org + 5); }
    }
    if (war){
      const groups = new Map();
      for (const p of plans) if (p.type === "atacar"){ const k = p.a.side + ">" + p.to; if (!groups.has(k)) groups.set(k, { side: p.a.side, to: p.to, armies: [] }); groups.get(k).armies.push(p.a); }
      const bySide = s => [...groups.values()].filter(x => x.side === s).sort((x, y) => UF_WEIGHT[y.to] - UF_WEIGHT[x.to] || (x.to < y.to ? -1 : 1));
      const P = bySide("player"), E = bySide("enemy"), order = [];
      for (let i = 0; i < Math.max(P.length, E.length); i++){ if (P[i]) order.push(P[i]); if (E[i]) order.push(E[i]); }
      for (const grp of order){
        const att = grp.armies.filter(a => g.armies.includes(a) && ADJ[a.uf].includes(grp.to) && !fought.has(a.id) && a.str >= 3);
        if (!att.length) continue;
        const ts = sideOf(g, g.control[grp.to], ph);
        const hostile = grp.side === "player" ? (ts === "enemy" || ts === "contested") : (ts === "player" || ts === "contested");
        if (!hostile) continue;
        if (ts === "contested") for (const a of armiesOf(g, grp.side, grp.to)) if (!att.includes(a) && !fought.has(a.id)) att.push(a);
        resolveAttack(g, grp.side, att, grp.to, ev, R, fought);
      }
      for (const uf of Object.keys(g.control)) if (sideOf(g, g.control[uf], ph) === "contested" && !ev.battles.some(b => b.uf === uf)) resolveFront(g, uf, ev, R, fought);
    }
  } finally { MIL_QUIET = false; }
  for (const a of g.armies){
    if (!fought.has(a.id)) a.org = Math.min(maxOrg(g, a.side), a.org + 12 + (a.order && a.order.type === "defender" ? 6 : 0) - (supplied(g, a.side, a.uf) ? 0 : 10));
    a.org = Math.max(0, Math.round(a.org)); a.order = null;
  }
  g.enemyPlans = [];
  logBattles(g, ev.battles);
  normalizeArmies(g, R);
  for (const m of ev.moves) if (m.type === "mover" && m.side === "player") R(`${(armyById(g, m.id) || {}).name || "Exército"} deslocou-se para ${MAP_DATA.states[m.to].name}.`);
  return ev;
}
