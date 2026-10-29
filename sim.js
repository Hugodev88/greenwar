// Simulação headless das campanhas: joga partidas completas com IA aleatória, gulosa e "radical"
// (radical = joga como a gulosa, mas na história prefere a última opção, em geral a mais dura)
// em cada cenário e verifica falhas, invariantes, finais alcançáveis e equilíbrio.
// Uso: node sim.js [partidas_por_IA=300]
const fs = require("fs");
const html = fs.readFileSync(__dirname + "/index.html", "utf8");
const part = (a, b) => html.split(a)[1].split(b)[0];
const code = part("/*SCENARIOS_START*/", "/*SCENARIOS_END*/") + part("/*MAP_START*/", "/*MAP_END*/") + part("/*CORE_START*/", "/*CORE_END*/");
const API = new Function(code + `; return { SCENARIOS, MAP_DATA, newCampaign, queueChoices, choose, endTurn, visibleActions, actionState, doAction,
  mapActions, doMapAction, factionAction, allowedReqs, allowedOffs, dealScore, dealCheck, proposeDeal, acceptCounter, diploMission,
  phaseOf, sideOf, sideCounts, playerUFs, findEvent, fxSummary, incomeFor, monthLabel, OFF_TYPES,
  focusTree, focusStatus, focusCheck, startFocus, focusDef };`)();
const N = +process.argv[2] || 300;
let fails = 0;
const fail = (m) => { fails++; if (fails < 25) console.log("  ✗ " + m); };

function rng(seed){ let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const pick = (r, arr) => arr[Math.floor(r() * arr.length)];

function invariants(g, sc){
  const facs = Object.keys(sc.story.factions);
  for (const k in g.stats) if (!(g.stats[k] >= 0 && g.stats[k] <= 100)) return `stat ${k}=${g.stats[k]}`;
  if (!Number.isFinite(g.money)) return "money NaN";
  if (!(g.reserve >= 0) || !Number.isFinite(g.ap)) return "reserve/ap inválido";
  for (const uf in g.uf){ const u = g.uf[uf];
    if (!facs.includes(g.control[uf])) return `controle inválido ${uf}=${g.control[uf]}`;
    for (const k of ["unrest","force","enemy","progress","sway"]) if (!Number.isFinite(u[k])) return `uf ${uf}.${k} NaN`;
    if (u.force < 0 || u.enemy < 0) return `forças negativas em ${uf}`; }
  for (const id in g.fac) if (!Number.isFinite(g.fac[id].loyalty) || !Number.isFinite(g.fac[id].influence)) return "facção NaN " + id;
  for (const id in g.actors) if (!Number.isFinite(g.actors[id].opinion) || Math.abs(g.actors[id].opinion) > 100) return "ator inválido " + id;
  for (const q of g.queue){ if (q.type === "story" && !sc.story.nodes[q.node]) return "fila: nó inexistente " + q.node; if (q.type === "event" && !API.findEvent(g, q.id)) return "fila: evento inexistente " + q.id; }
  if (g.focus){ const T = sc.campaign.focus, ids = T.nodes.map(n => n.id);
    if (g.focus.active && !ids.includes(g.focus.active)) return "foco ativo inválido";
    if (new Set(g.focus.done).size !== g.focus.done.length) return "foco concluído duas vezes";
    for (const id of g.focus.done){ const F = T.nodes.find(n => n.id === id); if (!F) return "foco inexistente " + id;
      if ((F.excl||[]).some(x => g.focus.done.includes(x)) && !(T.grants && Object.values(T.grants).flat().some(z => z === id || (F.excl||[]).includes(z)))) return `exclusivos ambos concluídos: ${id}`; } }
  return null;
}

// Pontuação de uma escolha para a IA gulosa: sobe os atributos mais baixos.
function scoreFx(g, sc, fx, storyEff){
  let s = 0;
  const st = Object.assign({}, storyEff || {}, (fx && fx.s) || {});
  for (const k in st) s += st[k] * (g.stats[k] < 35 ? 2.2 : g.stats[k] > 70 ? 0.4 : 1);
  if (fx){ s += (fx.money || 0) * (g.money < 8 ? 0.8 : 0.3); s += (fx.reserve || 0) * 3;
    for (const id in (fx.fac||{})) s += fx.fac[id] * (g.fac[id] && g.fac[id].loyalty < 25 ? 0.6 : 0.15);
    s -= (fx.unrest || 0) * 0.1 + (fx.unrestAll || 0) * 0.2; }
  return s;
}
function resolveQueue(g, sc, r, greedy){
  let guard = 0;
  while (g.queue.length && !g.ended && guard++ < 50){
    const ch = API.queueChoices(g), ok = ch.map((c, i) => c.ok ? i : -1).filter(i => i >= 0);
    if (!ok.length) return "fila sem escolha válida: " + JSON.stringify(g.queue[0]);
    let idx;
    const GP = greedy === "golpista" && g.queue[0].type === "story" && sc.campaign.coupScript && sc.campaign.coupScript[g.queue[0].node];
    if (GP !== undefined && GP !== false && ok.includes(GP)) idx = GP;
    else if (greedy === "radical" && g.queue[0].type === "story" && r() < 0.75) idx = ok[ok.length - 1];
    else if (greedy && r() > 0.15){
      const q = g.queue[0];
      idx = ok.reduce((b, i) => { const c = ch[i]; const v = q.type === "story" ? scoreFx(g, sc, null, sc.story.nodes[q.node].choices[i].effects) + r() * 6 : scoreFx(g, sc, c.fx) + r() * 2; return v > b.v ? { i, v } : b; }, { i: ok[0], v: -1e9 }).i;
    } else idx = pick(r, ok);
    if (!API.choose(g, idx)) return "choose falhou";
  }
  return null;
}
// Escolha de foco nacional: aleatória, gulosa (evita a ruptura) ou radical (prefere a ruptura e o confronto)
function pickFocus(g, sc, r, greedy){
  const T = API.focusTree(g); if (!T || g.focus.active || g.queue.length || g.ended || g.ap < 1) return;
  const av = T.nodes.filter(F => !API.focusCheck(g, F.id));
  if (!av.length) return;
  let F;
  if (!greedy){ if (r() < 0.75) F = pick(r, av); }
  else {
    const pref = greedy === "golpista" ? { ruptura: 20 } : greedy === "radical" ? { ruptura: 12, jurid: 4, democ: -2 } : { ruptura: -15, democ: 5, jurid: 2 };
    F = av.map(F => ({ F, v: scoreFx(g, sc, F.fx) + (pref[F.branch] || 0) - (F.cost || 0) * 0.3 - F.months * 0.4 + (F.reqAny || F.req ? 0 : 1) + r() * (greedy === "golpista" ? 30 : 4) })).sort((a, b) => b.v - a.v)[0].F;
  }
  if (F) API.startFocus(g, F.id);
}
function spendAP(g, sc, r, greedy){
  const C = sc.campaign;
  pickFocus(g, sc, r, greedy);
  for (let tries = 0; tries < 25 && g.ap > 0 && !g.ended && !g.queue.length; tries++){
    const ph = API.phaseOf(g), roll = r();
    if (greedy){
      // 1) crise de facção iminente
      const weak = C.factions.filter(f => g.fac[f.id].loyalty < 25 && g.fac[f.id].influence >= 25 && !g.used["fac_agradar_" + f.id]).sort((a, b) => g.fac[a.id].loyalty - g.fac[b.id].loyalty)[0];
      if (weak && g.money >= 4 && roll < 0.8){ if (API.factionAction(g, weak.id, "agradar").ok) continue; }
      // 2) guerra: tropas nas frentes
      if (ph.war && g.reserve > 0){
        const fronts = Object.keys(g.control).filter(u => API.sideOf(g, g.control[u]) === "contested").sort((a, b) => g.uf[a].progress - g.uf[b].progress);
        const tgt = fronts[0] || API.playerUFs(g).filter(u => g.uf[u].unrest > 60)[0];
        if (tgt && API.doMapAction(g, tgt, "tropas").ok) continue;
      }
      // 3) diplomacia com acordo provável
      if (roll < 0.45){
        let best = null;
        for (const A of C.actors){ const ar = API.allowedReqs(g, A.id); if (!ar.length) continue;
          for (const rq of ar){ const offs = API.allowedOffs(g, A.id).filter(o => (A.interests[o]||0) >= 0.8 && !(o === "bases" && g.money > 20)).slice(0, 2);
            if (API.dealCheck(g, A.id, [rq], offs)) continue;
            const s = API.dealScore(g, A.id, [rq], offs).score + (rq === "reconhecimento" ? 12 : rq === "dinheiro" && g.money < 10 ? 10 : rq === "armas" && ph.war ? 8 : 0);
            if (s >= 0 && (!best || s > best.s)) best = { a: A.id, req: [rq], off: offs, s }; } }
        if (best){ const res = API.proposeDeal(g, best.a, best.req, best.off); if (res.result === "counter" && r() < 0.6) API.acceptCounter(g); continue; }
      }
      // 4) estado agitado
      const hot = API.playerUFs(g).sort((a, b) => g.uf[b].unrest - g.uf[a].unrest)[0];
      if (hot && g.uf[hot].unrest > 65 && roll < 0.7){ const k = g.money >= 5 ? "investir" : "propaganda"; if (API.doMapAction(g, hot, k).ok) continue; }
      // 5) ação que melhor sobe atributos baixos
      const acts = API.visibleActions(g).filter(a => API.actionState(g, a).ok).map(a => ({ a, v: scoreFx(g, sc, a.fx) - (a.cost||0) * (g.money < 10 ? 0.6 : 0.15) + r() * 3 })).sort((x, y) => y.v - x.v);
      if (acts.length){ API.doAction(g, acts[0].a.id); continue; }
      // 6) adesão de estados
      const tgt2 = Object.keys(g.control).find(u => (ph.flipTo||{})[g.control[u]] && API.sideOf(g, g.control[u]) !== "player");
      if (tgt2 && API.doMapAction(g, tgt2, "negociar").ok) continue;
      break;
    } else {
      const kind = Math.floor(roll * 5);
      if (kind === 0){ const acts = API.visibleActions(g).filter(a => API.actionState(g, a).ok); if (acts.length) API.doAction(g, pick(r, acts).id); }
      else if (kind === 1){ const uf = pick(r, Object.keys(g.control)); const ma = API.mapActions(g, uf).filter(a => a.ok); if (ma.length) API.doMapAction(g, uf, pick(r, ma).kind); }
      else if (kind === 2){ const A = pick(r, C.actors), ar = API.allowedReqs(g, A.id); if (ar.length){ const res = API.proposeDeal(g, A.id, [pick(r, ar)], API.allowedOffs(g, A.id).filter(() => r() < 0.35)); if (res.result === "counter" && r() < 0.5) API.acceptCounter(g); } }
      else if (kind === 3){ API.factionAction(g, pick(r, C.factions).id, r() < 0.8 ? "agradar" : "pressionar"); }
      else { API.diploMission(g, pick(r, C.actors).id); }
    }
  }
}
function play(sc, seed, greedy){
  const r = rng(seed * 7919 + (greedy === "golpista" ? 3 : greedy === "radical" ? 2 : greedy ? 1 : 0));
  const g = API.newCampaign(sc, seed);
  let turns = 0;
  while (!g.ended){
    const e1 = resolveQueue(g, sc, r, greedy); if (e1) return { err: e1, g };
    if (g.ended) break;
    spendAP(g, sc, r, greedy);
    const e2 = resolveQueue(g, sc, r, greedy); if (e2) return { err: e2, g };
    if (g.ended) break;
    if (!API.endTurn(g)) return { err: "endTurn recusou com fila vazia", g };
    const inv = invariants(g, sc); if (inv) return { err: inv, g };
    if (++turns > 400) return { err: "partida não termina (400 turnos)", g };
    JSON.parse(JSON.stringify(g)); // save serializável
  }
  return { g };
}

const report = {}, FC = {};
// Roteiro de cobertura (não entra na comparação de balanceamento): segue o caminho do golpe na história
const COUP = { brasil2022: { apuracao: 3, sondagem: 1, expurgo: 0, decreto: 0, racha_militar: 0 } };
for (const sc of API.SCENARIOS){
  if (sc.soon || !sc.campaign) continue;
  if (process.argv[3] && sc.id !== process.argv[3]) continue;
  const endings = Object.entries(sc.story.nodes).filter(([, n]) => n.ending).map(([id]) => id);
  console.log(`\n[${sc.year}] ${sc.title}`);
  const R = report[sc.id] = {}; FC[sc.id] = {};
  for (const mode of ["aleatoria", "gulosa", "radical", ...(COUP[sc.id] ? ["golpista"] : [])]){
    if (mode === "golpista") sc.campaign.coupScript = COUP[sc.id];
    const dist = {}, turnsArr = [], monthsArr = [], via = { historia: 0, campanha: 0 }; let crashes = 0, deals = 0, battles = 0, focusDone = 0;
    for (let i = 1; i <= N; i++){
      let res;
      try { res = play(sc, i, mode === "aleatoria" ? false : mode === "gulosa" ? true : mode); } catch (e) { crashes++; fail(`${sc.id}/${mode}#${i}: exceção ${e.stack.split("\n").slice(0,2).join(" ")}`); continue; }
      if (res.err){ crashes++; fail(`${sc.id}/${mode}#${i}: ${res.err} em ${API.monthLabel(res.g.month)}`); continue; }
      const g = res.g;
      dist[g.ended.node] = (dist[g.ended.node] || 0) + 1;
      turnsArr.push(g.turn); monthsArr.push(g.month - g.startMonth);
      via[g.ended.why ? "campanha" : "historia"]++; deals += g.stat.deals; battles += g.stat.battles;
      if (g.focus){ focusDone += g.focus.done.length; for (const id of g.focus.done) FC[sc.id][id] = (FC[sc.id][id] || 0) + 1; }
    }
    const avg = a => a.length ? (a.reduce((s, x) => s + x, 0) / a.length).toFixed(1) : "-";
    const sorted = Object.entries(dist).sort((a, b) => b[1] - a[1]);
    console.log(`  IA ${mode}: ${N} partidas · falhas ${crashes} · turnos médios ${avg(turnsArr)} (min ${Math.min(...turnsArr)}, máx ${Math.max(...turnsArr)}) · meses médios ${avg(monthsArr)} · acordos/partida ${(deals/N).toFixed(1)} · fim por estado da campanha ${via.campanha}`);
    if (sc.campaign.focus) console.log(`    focos concluídos/partida: ${(focusDone / N).toFixed(1)}`);
    console.log("    " + sorted.map(([k, v]) => `${k} ${(100*v/N).toFixed(0)}%`).join(" · "));
    R[mode] = { focusPerGame: +(focusDone / N).toFixed(2), dist, crashes, turns: avg(turnsArr), months: avg(monthsArr), viaCampanha: via.campanha };
  }
  const reached = new Set([...Object.keys(R.aleatoria.dist), ...Object.keys(R.gulosa.dist), ...Object.keys(R.radical.dist), ...Object.keys((R.golpista || {}).dist || {})]);
  const missing = endings.filter(e => !reached.has(e));
  console.log(`  Finais alcançados: ${reached.size}/${endings.length}${missing.length ? " — não alcançados: " + missing.join(", ") : ""}`);
  R.missing = missing;
  if (sc.campaign.focus){
    const never = sc.campaign.focus.nodes.filter(F => !FC[sc.id][F.id]).map(F => F.id);
    const top = Object.entries(FC[sc.id]).sort((a, b) => b[1] - a[1]);
    console.log(`  Focos concluídos em alguma partida: ${sc.campaign.focus.nodes.length - never.length}/${sc.campaign.focus.nodes.length}${never.length ? " — nunca: " + never.join(", ") : ""}`);
    console.log(`  Mais comuns: ${top.slice(0, 6).map(([k, v]) => `${k} ${v}`).join(", ")} · mais raros: ${top.slice(-5).map(([k, v]) => `${k} ${v}`).join(", ")}`);
    R.focusCoverage = FC[sc.id]; R.focusNever = never;
    if (never.length) fail(`${sc.id}: focos nunca concluídos: ${never.join(", ")}`);
  }
}
fs.writeFileSync(__dirname + "/sim-resultados.json", JSON.stringify(report, null, 1));
console.log(fails ? `\n${fails} falha(s).` : "\nSimulação OK: nenhuma falha.");
process.exitCode = fails ? 1 : 0;
