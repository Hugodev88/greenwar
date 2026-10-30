// js/core/inimigo.js — Núcleo: posição dos exércitos e a IA do inimigo (planos, reforços).
function nearestAllowed(g, side, from, ph){
  const seen = new Set([from]); let frontier = [from];
  while (frontier.length){
    const next = [];
    for (const f of frontier) for (const n of ADJ[f]) if (!seen.has(n)){ seen.add(n); next.push(n); }
    const ok = next.filter(n => armyAllowed(g, side, n, ph));
    if (ok.length) return ok.sort((a, b) => (sideOf(g, g.control[b], ph) === side) - (sideOf(g, g.control[a], ph) === side) || UF_WEIGHT[b] - UF_WEIGHT[a] || (a < b ? -1 : 1))[0];
    frontier = next;
  }
  return null;
}
// Mantém exércitos em território possível após mudanças de mapa da história, fim de guerra etc.
function normalizeArmies(g, R){
  if (!g.armies) return;
  const ph = phaseOf(g);
  if (ph.noArmies && g.armies.some(a => a.side === "player")){ g.armies = g.armies.filter(a => a.side !== "player"); if (R) R("Suas unidades voltaram à cadeia de comando regular: nesta fase você não comanda exércitos.", "info"); }
  for (const a of [...g.armies]){
    if (a.str < 3){ removeArmy(g, a); continue; }
    a.org = Math.min(a.org, maxOrg(g, a.side));
    if (armyAllowed(g, a.side, a.uf, ph)) continue;
    const to = nearestAllowed(g, a.side, a.uf, ph);
    if (to){ a.uf = to; if (a.order && a.order.type !== "reforcar") a.order = null; }
    else { removeArmy(g, a); if (R && a.side === "player") R(`${a.name} foi desmobilizado: não há território seguro para ele.`, "bad"); }
  }
}
function spawnWarArmies(g){
  const C = scOf(g).campaign, ph = phaseOf(g), cfg = armyCfg(g);
  const hot = n => { const s = sideOf(g, g.control[n], ph); return s === "player" || s === "contested"; };
  const enemyUFs = Object.keys(g.control).filter(uf => sideOf(g, g.control[uf], ph) === "enemy");
  const cand = enemyUFs.slice().sort((a, b) => (ADJ[b].some(hot) - ADJ[a].some(hot)) || UF_WEIGHT[b] - UF_WEIGHT[a] || (a < b ? -1 : 1));
  const n = clamp(Math.round(enemyUFs.length * 0.2 + (C.enemyPower ?? 1)), 2, 5);
  const have = armiesOf(g, "enemy").length;
  for (let i = 0; i < n - have && i < cand.length; i++) newArmy(g, "enemy", cand[i], (cfg.enemyStr ?? 5 + 5 * (C.enemyBase || 2)) + ri(g, 0, 5), { fac: g.control[cand[i]] });
}
// Chamado após qualquer mudança de mapa fora das batalhas (história, revoltas, adesões) e ao entrar num nó
function syncMilitary(g, before){
  if (!g.armies || MIL_QUIET) return;
  const ph = phaseOf(g), C = scOf(g).campaign;
  if (g.milPhase !== ph.id){ g.milPhase = ph.id; if (ph.war) spawnWarArmies(g); }
  else if (ph.war && before){
    let n = 0;
    for (const uf of Object.keys(g.control)){
      if (n >= 3 || armiesOf(g, "enemy").length >= ARMY_CAP.enemy) break;
      if (g.control[uf] !== before[uf] && sideOf(g, g.control[uf], ph) === "enemy" && sideOf(g, before[uf], ph) !== "enemy" && !armiesOf(g, "enemy", uf).length){
        newArmy(g, "enemy", uf, 10 + 5 * (C.enemyBase || 2), { fac: g.control[uf] }); n++; }
    }
  }
  normalizeArmies(g);
  if (ph.war) planEnemy(g, true); else g.enemyPlans = [];
}
function threatAt(g, uf){ return [uf, ...ADJ[uf]].reduce((s, n) => s + armiesOf(g, "player", n).reduce((t, a) => t + armyPow(a), 0), 0); }
function enemyOrderValid(g, a, p){
  const ph = phaseOf(g);
  if (p.type === "defender") return true;
  if (!ADJ[a.uf].includes(p.to)) return false;
  const s = sideOf(g, g.control[p.to], ph);
  return p.type === "mover" ? s === "enemy" : (s === "player" || s === "contested");
}
function stepToward(g, a, goal){
  const ph = phaseOf(g), prev = { [a.uf]: null }; let frontier = [a.uf];
  while (frontier.length){
    const next = [];
    for (const f of frontier){
      if (f !== a.uf && ADJ[f].some(goal)){ let s = f; while (prev[s] !== a.uf) s = prev[s]; return s; }
      for (const n of ADJ[f]) if (!(n in prev) && sideOf(g, g.control[n], ph) === "enemy"){ prev[n] = f; next.push(n); }
    }
    frontier = next;
  }
  return null;
}
// IA inimiga: ataca estados fracos ou em disputa, guarda as capitais, avança para a frente
function planEnemy(g, keep){
  const ph = phaseOf(g), C = scOf(g).campaign;
  if (!g.armies || !ph.war || g.ended){ g.enemyPlans = []; return; }
  const hot = uf => { const s = sideOf(g, g.control[uf], ph); return s === "player" || s === "contested"; };
  const plans = keep ? (g.enemyPlans || []).filter(p => { const a = armyById(g, p.id); return a && a.side === "enemy" && enemyOrderValid(g, a, p); }) : [];
  const planned = new Set(plans.map(p => p.id));
  const limit = clamp(Math.round((C.enemyPower ?? 1) * 0.8 + foreignFoes(g) * 0.5 + (g.enemyBoost || 0) * 0.3 - malusNow(g)), 1, 4);
  let attacks = new Set(plans.filter(p => p.type === "atacar").map(p => p.to)).size;
  const free = () => armiesOf(g, "enemy").filter(a => !planned.has(a.id));
  const caps = enemyCapitals(g);
  for (const cap of caps) if (threatAt(g, cap) > 0 && !armiesOf(g, "enemy", cap).length){
    const d = free().filter(a => ADJ[a.uf].includes(cap) && sideOf(g, g.control[a.uf], ph) === "enemy" && !caps.includes(a.uf)).sort((x, y) => armyPow(y) - armyPow(x))[0];
    if (d){ plans.push({ id: d.id, type: "mover", to: cap }); planned.add(d.id); }
  }
  const targets = {};
  for (const a of free()){
    if (a.org < 35 || a.str < 8 || sideOf(g, g.control[a.uf], ph) === "contested") continue;
    if (caps.includes(a.uf) && threatAt(g, a.uf) > armyPow(a) * 0.6 && armiesOf(g, "enemy", a.uf).length <= 1) continue;
    for (const t of ADJ[a.uf]) if (hot(t)) (targets[t] ||= []).push(a);
  }
  const pcap = capitalOf(g, "player");
  const scored = Object.entries(targets).map(([t, arr]) => {
    arr.sort((x, y) => armyPow(y) - armyPow(x));
    let grp = [], o = null; for (const a of arr){ grp.push(a); o = battleOdds(g, "enemy", grp, t); if (o.ratio >= 1.35) break; }
    return { t, grp, ratio: o.ratio, score: Math.min(o.ratio, 3) * 6 + UF_WEIGHT[t] * 0.5 + (sideOf(g, g.control[t], ph) === "contested" ? 3 : 0) + (t === pcap ? 2 : 0) + rnd(g) * 2 };
  }).filter(x => x.ratio >= 1.15).sort((a, b) => b.score - a.score);
  for (const s of scored){
    if (attacks >= limit || g.ceasefire > 0) break;
    const grp = s.grp.filter(a => !planned.has(a.id)); if (!grp.length || battleOdds(g, "enemy", grp, s.t).ratio < 1.15) continue;
    for (const a of grp){ plans.push({ id: a.id, type: "atacar", to: s.t }); planned.add(a.id); }
    attacks++;
  }
  for (const a of free()){
    if (sideOf(g, g.control[a.uf], ph) !== "contested" && !ADJ[a.uf].some(hot) && a.org >= 30){
      const step = stepToward(g, a, hot);
      if (step){ plans.push({ id: a.id, type: "mover", to: step }); planned.add(a.id); continue; }
    }
    plans.push({ id: a.id, type: "defender" }); planned.add(a.id);
  }
  g.enemyPlans = plans;
}
function enemyReinforce(g, R){
  const C = scOf(g).campaign, ph = phaseOf(g);
  const inc = Math.max(0, (C.enemyPower ?? 1) * 5 + foreignFoes(g) * 3 + (g.enemyBoost || 0) * 2 - malusNow(g) * 4);
  g.enemyPool = Math.min(60, (g.enemyPool || 0) + inc);
  const hot = uf => { const s = sideOf(g, g.control[uf], ph); return s === "player" || s === "contested"; };
  for (let guard = 0; g.enemyPool >= STR_UNIT && guard < 8; guard++){
    const mine = armiesOf(g, "enemy");
    const weak = mine.filter(a => a.str <= ARMY_MAX - STR_UNIT && supplied(g, "enemy", a.uf)).sort((a, b) => a.str - b.str)[0];
    if ((!weak || weak.str >= 30) && mine.length < ARMY_CAP.enemy && g.enemyPool >= 20){
      const sites = Object.keys(g.control).filter(uf => sideOf(g, g.control[uf], ph) === "enemy" && !armiesOf(g, "enemy", uf).length)
        .sort((a, b) => (ADJ[b].some(hot) - ADJ[a].some(hot)) || UF_WEIGHT[b] - UF_WEIGHT[a] || (a < b ? -1 : 1));
      if (sites.length){ const a = newArmy(g, "enemy", sites[0], 20, { fac: g.control[sites[0]], org: 50, xp: 5 }); g.enemyPool -= 20;
        R(`Inteligência: o inimigo formou uma nova força — ${a.name}, em ${MAP_DATA.states[sites[0]].name}.`, "bad"); continue; }
    }
    if (!weak) break;
    weak.str += STR_UNIT; g.enemyPool -= STR_UNIT;
  }
}
