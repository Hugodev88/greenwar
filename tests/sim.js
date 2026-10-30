// Simulação headless das campanhas: joga partidas completas com IA aleatória, gulosa e "radical"
// (radical = joga como a gulosa, mas na história prefere a última opção, em geral a mais dura)
// em cada cenário e verifica falhas, invariantes, finais alcançáveis e equilíbrio.
// "golpista" segue o roteiro do golpe sem se preocupar com o Sul; "pacificador" segue o mesmo roteiro, mas usa as
// ações e escolhas que baixam a Tensão no Sul (mede se dá para evitar a rebelião da Liga do Sul).
// Uso: node tests/sim.js [partidas_por_IA=300] [cenário] [--dif=facil|normal|dificil] [--rapida] [--conselheira]
// --conselheira (automático no Fácil) acrescenta a IA "conselheira": história como a iniciante e, no resto, só aperta "Fazer isso" nas dicas.
// --golpe acrescenta a IA "golpista_conselheira" (até o golpe só segue as dicas da conselheira na linha do golpe, inclusive nas
//   escolhas da história; depois joga como a golpista) e imprime a linha "golpe:" (reunião, tentativa, golpe consumado, fracasso, recuo).
// --notas imprime a distribuição da nota final (S/A/B/C) e das conquistas por IA (automático fora do Normal).
// Sem --dif/--rapida joga o modo Normal, campanha completa (o jogo original) e grava sim-resultados.json.
const fs = require("fs");
const JOGO = require("./carregar.js");
const code = JOGO.codigo;
const API = new Function(code + `; return { SCENARIOS, MAP_DATA, convertMoney, apFor, moneyCap, newCampaign, queueChoices, choose, endTurn, visibleActions, actionState, doAction,
  mapActions, doMapAction, factionAction, allowedReqs, allowedOffs, dealScore, dealCheck, proposeDeal, acceptCounter, diploMission,
  phaseOf, sideOf, sideCounts, playerUFs, findEvent, fxSummary, incomeFor, monthLabel, OFF_TYPES,
  focusTree, focusStatus, focusCheck, startFocus, focusDef,
  ADJ, ARMY_MAX, SAVE_VERSION, armiesOf, armyById, armyTargets, setOrder, recruitArmy, battleOdds, commandLimit, ordersUsed,
  reinforceCost, recruitCost, armyAllowed, sideStr, frontMode, frontAdvice, setFrontPosture, frontAutoSplit, setFrontSplit, offensiveState, launchOffensive, setFrontGeneral, frontReport, frontPool, FRONT_POSTURES, migrateSave, knownIntents, battleReport, choicePreview, advisorTips, advisorDo, coupState, coupStoryTip, coupReadiness, endingGrade, earnedAchievements, CONQUISTAS,
  ...(typeof southFactors === "function" ? { southFactors, southRate, southEta, autoOrders, clearOrders, setAutoOrders, nodeView } : {}) };`)();
const ARGS = process.argv.slice(2).filter(a => !a.startsWith("--")), FLAGS = process.argv.slice(2).filter(a => a.startsWith("--"));
const OPTS = { diff: ((FLAGS.find(a => a.startsWith("--dif=")) || "").split("=")[1]) || "normal", quick: FLAGS.includes("--rapida") };
const ADV = FLAGS.includes("--conselheira") || OPTS.diff === "facil"; // IA que só segue as dicas da conselheira
const NOTAS = FLAGS.includes("--notas");
const GOLPE = FLAGS.includes("--golpe"); // IA golpista com conselheira + linha "golpe:"
const VARIANT = OPTS.diff !== "normal" || OPTS.quick || ADV; // modo diferente do original: imprime a taxa de vitória e não grava o JSON
const N = +ARGS[0] || 300;
let fails = 0;
const fail = (m) => { fails++; if (fails < 25) console.log("  ✗ " + m); };

function rng(seed){ let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const pick = (r, arr) => arr[Math.floor(r() * arr.length)];

function invariants(g, sc){
  const facs = Object.keys(sc.story.factions);
  for (const k in g.stats) if (!(g.stats[k] >= 0 && g.stats[k] <= 100)) return `stat ${k}=${g.stats[k]}`;
  if (!Number.isFinite(g.money)) return "money NaN";
  if (g.money > API.moneyCap(g)) return `Recursos acima do teto (${g.money})`;
  if (!Number.isFinite(g.ap) || g.ap < 0) return "ap inválido";
  if ("reserve" in g) return "campo antigo g.reserve ainda presente";
  if (!Array.isArray(g.armies)) return "sem lista de exércitos";
  const ids = new Set();
  for (const a of g.armies){
    if (ids.has(a.id)) return "id de exército duplicado " + a.id; ids.add(a.id);
    if (a.side !== "player" && a.side !== "enemy") return "lado inválido " + a.id;
    if (!API.ADJ[a.uf]) return `exército ${a.id} em UF inválida ${a.uf}`;
    if (!(a.str >= 3 && a.str <= API.ARMY_MAX)) return `força inválida ${a.name}=${a.str}`;
    if (!(a.org >= 0 && a.org <= 100) || !Number.isFinite(a.xp)) return `organização/xp inválido ${a.name}`;
    if (a.order) return `ordem não limpa após o turno: ${a.name}`;
    if (!g.ended && !API.armyAllowed(g, a.side, a.uf)) return `exército ${a.side} ${a.name} em território impossível ${a.uf} (${g.control[a.uf]})`;
  }
  if (API.armiesOf(g, "player").length > 8 || API.armiesOf(g, "enemy").length > 8) return "exércitos acima do limite";
  for (const p of (g.enemyPlans || [])) if (!API.armyById(g, p.id)) return "plano inimigo para exército inexistente";
  for (const uf in g.uf){ const u = g.uf[uf];
    if (!facs.includes(g.control[uf])) return `controle inválido ${uf}=${g.control[uf]}`;
    for (const k of ["unrest","enemy","progress","sway"]) if (!Number.isFinite(u[k])) return `uf ${uf}.${k} NaN`;
    if ("force" in u) return `campo antigo force em ${uf}`;
    if (u.enemy < 0) return `forças negativas em ${uf}`; }
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
    const q0 = g.queue[0];
    if (q0.type === "story" && q0.node === "decreto" && g.simDecMil === undefined) g.simDecMil = g.stats.militar;
    if (greedy === "golpista_conselheira" && q0.type === "story"){ // segue o conselho da Marta nas escolhas da história
      const t = API.coupStoryTip(g, API.coupState(g));
      if (t && ok.includes(t.act.i)){ if (!API.choose(g, t.act.i)) return "choose falhou"; continue; }
    }
    if (greedy === "pacificador"){ // evita a rebelião: escolhas conciliadoras com o Sul
      const want = q0.type === "story" ? PAC[q0.node] : q0.id === "e_sul_cupula" || q0.id === "n_liga_proposta" || q0.id === "f_liga_exige" ? 0 : undefined;
      if (want !== undefined && ok.includes(want)){ if (!API.choose(g, want)) return "choose falhou"; continue; }
    }
    if (g.simNovice && q0.type === "story"){ // iniciante: escolhe ao acaso, mas evita o que o aviso do modo Fácil marca como derrota
      const safe = ok.filter(i => { const p = API.choicePreview(g, i); return !p || p.outcome !== "derrota"; });
      if (!API.choose(g, pick(r, safe.length ? safe : ok))) return "choose falhou"; continue;
    }
    const GP = COUPISH(greedy) && g.queue[0].type === "story" && sc.campaign.coupScript && sc.campaign.coupScript[g.queue[0].node];
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
    const liga = g.focus.done.length % 2 ? "c_liga_esmagar" : "c_liga_pacto";
    const pref = COUPISH(greedy) ? { ruptura: 20 } : greedy === "radical" ? { ruptura: 12, jurid: 4, democ: -2 } : { ruptura: -15, democ: 5, jurid: 2 };
    F = av.map(F => ({ F, v: scoreFx(g, sc, F.fx) + (pref[F.branch] || 0) - (F.cost || 0) * 0.3 - F.months * 0.4 + (F.reqAny || F.req ? 0 : 1) + ((greedy === "golpista" || greedy === "golpista_conselheira") && F.id === liga ? 40 : 0) /* golpista decide a Liga do Sul: esmagar ou pactuar (metade cada) */ + (COUPISH(greedy) ? -Math.min(30, ((FC[sc.id] || {})[F.id] || 0) / 4) : 0) /* roteiro de cobertura: prefere focos pouco vistos */ + r() * (COUPISH(greedy) ? 30 : 4) })).sort((a, b) => b.v - a.v)[0].F;
  }
  if (F) API.startFocus(g, F.id);
}
function spendAP(g, sc, r, greedy){
  const C = sc.campaign;
  // Caixa político (2022): facções pagas só em Recursos e conversão Recursos → ação
  if (C.facMoney && !g.queue.length && !g.ended){
    const E = g.simEco || {};
    if (greedy){
      const war = API.phaseOf(g).war || COUPISH(greedy), reserve = war ? 35 : 6;
      for (const f of C.factions.filter(f => g.fac[f.id].loyalty < (war ? 22 : 45) && g.fac[f.id].influence >= (war ? 25 : 20)).sort((a, b) => g.fac[a.id].loyalty - g.fac[b.id].loyalty))
        if (g.money >= C.facMoney.agradar + reserve && API.factionAction(g, f.id, "agradar").ok) E.facPaid = (E.facPaid || 0) + 1;
      if (C.convert && !g.simple && g.money >= C.convert.cost + reserve + 10 && API.convertMoney(g).ok) E.conv = (E.conv || 0) + 1;
    } else {
      if (r() < 0.5){ const f = pick(r, C.factions); if (API.factionAction(g, f.id, r() < 0.8 ? "agradar" : "pressionar").ok) E.facPaid = (E.facPaid || 0) + 1; }
      if (C.convert && !g.simple && r() < 0.3 && API.convertMoney(g).ok) E.conv = (E.conv || 0) + 1;
    }
  }
  pickFocus(g, sc, r, greedy);
  if (greedy === "pacificador") calmSouth(g);
  for (let tries = 0; tries < 25 && g.ap > 0 && !g.ended && !g.queue.length; tries++){
    const ph = API.phaseOf(g), roll = r();
    if (greedy){
      // 1) crise de facção iminente
      const weak = C.factions.filter(f => g.fac[f.id].loyalty < 25 && g.fac[f.id].influence >= 25 && !g.used["fac_agradar_" + f.id]).sort((a, b) => g.fac[a.id].loyalty - g.fac[b.id].loyalty)[0];
      if (weak && !C.facMoney && g.money >= 4 && roll < 0.8){ if (API.factionAction(g, weak.id, "agradar").ok) continue; }
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
// Ordens militares (não gastam PA). Gulosa: ataques com boa chance, reforços, marcha para a frente.
// Guerra por frentes (2022): posturas, divisão das tropas, recrutamento e ofensiva especial — não há ordens a exércitos
function frontOrders(g, sc, r, greedy){
  const ph = API.phaseOf(g), W = g.war; if (!ph.war || ph.noArmies) return;
  if (g.simple){ if (g.money >= API.recruitCost(g) + (greedy ? 15 : 0) && r() < (greedy ? 0.5 : 0.15)) API.recruitArmy(g); return; } // modo simples: comando automático
  if (!greedy){ // aleatória/iniciante: posturas ao acaso, às vezes recruta, mexe na divisão ou lança a ofensiva
    for (const f of W.fronts){ const x = r(); if (x < 0.55){ API.setFrontPosture(g, f.id, x < 0.25 ? "avancar" : x < 0.45 ? "segurar" : "recuar"); g.stat.orders++; } }
    if (W.fronts.length > 1 && r() < 0.3) API.setFrontSplit(g, 20 + Math.floor(r() * 13) * 5);
    if (r() < 0.15) API.recruitArmy(g);
    if (r() < 0.1 && W.fronts.length){ const f = pick(r, W.fronts); if (API.offensiveState(g, f.id).ok) API.launchOffensive(g, f.id); }
    return;
  }
  for (let k = 0; k < 2 && g.money >= API.recruitCost(g) + 15; k++) if (!API.recruitArmy(g).ok) break;
  if (W.fronts.length > 1) API.frontAutoSplit(g);
  for (const f of W.fronts){
    const a = API.frontAdvice(g, f); if (f.posture !== a.posture){ API.setFrontPosture(g, f.id, a.posture); g.stat.orders++; }
    if (a.posture === "avancar" && a.ratio >= 1.3 && g.money >= 25 && API.offensiveState(g, f.id).ok) API.launchOffensive(g, f.id);
  }
}
function giveOrders(g, sc, r, greedy){
  if (g.ended || g.queue.length) return;
  if (API.frontMode(g)) return frontOrders(g, sc, r, greedy);
  const ph = API.phaseOf(g), mine = API.armiesOf(g, "player");
  if (g.simple){ if (ph.war && g.money >= API.recruitCost(g) + (greedy ? 15 : 0) && r() < (greedy ? 0.5 : 0.15)) API.recruitArmy(g); return; } // interface simples: só ordens automáticas
  if (!greedy){
    for (const a of mine){ const roll = r();
      if (roll < 0.5){ const t = API.armyTargets(g, a); if (t.length){ const x = pick(r, t); if (API.setOrder(g, a.id, x.type, x.uf).ok) g.stat.orders++; } }
      else if (roll < 0.62) API.setOrder(g, a.id, "reforcar"); else if (roll < 0.8) API.setOrder(g, a.id, "defender"); }
    if (ph.war && r() < 0.15) API.recruitArmy(g);
    return;
  }
  const war = ph.war && !(g.ceasefire > 0);
  if (war && g.money >= API.recruitCost(g) + 15 && mine.length < 4) API.recruitArmy(g);
  const used = new Set();
  if (war){
    // alvos: estados inimigos/em disputa vizinhos; reúne exércitos até a razão ser boa
    const tg = {};
    for (const a of API.armiesOf(g, "player")) if (a.org >= 35 && a.str >= 10) for (const t of API.armyTargets(g, a)) if (t.type === "atacar") (tg[t.uf] ||= []).push(a);
    const opts = Object.entries(tg).map(([uf, arr]) => { arr.sort((x, y) => y.str - x.str); let grp = [], o; for (const a of arr){ grp.push(a); o = API.battleOdds(g, "player", grp, uf); if (o.ratio >= 1.4) break; }
      return { uf, grp, o, v: Math.min(o.ratio, 3) * 5 + (API.sideOf(g, g.control[uf]) === "contested" ? 3 : 0) + r() }; }).filter(x => x.o.ratio >= (greedy === "radical" || COUPISH(greedy) ? 1.0 : 1.2)).sort((a, b) => b.v - a.v);
    for (const x of opts){
      if (API.ordersUsed(g) >= API.commandLimit(g)) break;
      const grp = x.grp.filter(a => !used.has(a.id)); if (!grp.length) continue;
      for (const a of grp){ if (API.ordersUsed(g) >= API.commandLimit(g)) break; if (API.setOrder(g, a.id, "atacar", x.uf).ok){ used.add(a.id); g.stat.orders++; } }
    }
  }
  const front = uf => API.ADJ[uf].some(n => API.sideOf(g, g.control[n]) !== "player") || API.sideOf(g, g.control[uf]) === "contested";
  for (const a of API.armiesOf(g, "player")){
    if (used.has(a.id)) continue;
    if (war && a.str <= 40 && g.money >= API.reinforceCost(g) + 12 && API.setOrder(g, a.id, "reforcar").ok) continue;
    if (war && !front(a.uf) && API.ordersUsed(g) < API.commandLimit(g)){
      const t = API.armyTargets(g, a).filter(t => t.type === "mover" && front(t.uf))[0];
      if (t && API.setOrder(g, a.id, "mover", t.uf).ok){ g.stat.orders++; continue; }
    }
    API.setOrder(g, a.id, "defender");
  }
}
// Pacificador: gasta AP/Recursos para manter a Tensão no Sul baixa e, se der, fecha o Pacto Federativo
function calmSouth(g){
  const st = g.south; if (!st || g.ended || g.queue.length || !["calmo", "revolta"].includes(st.state)) return;
  const tryAct = id => { const a = API.visibleActions(g).find(x => x.id === id); return a && API.actionState(g, a).ok && API.doAction(g, id).ok; };
  if (tryAct("s_pacto")) return;
  const rate = API.southRate ? API.southRate(g) * 3 : 12;
  if (st.t + rate > 30 || !g.flags.includes("sul_cupula")) tryAct("s_cupula");
  if (st.t + rate > 45) tryAct("s_fiscal");
  if (st.t + rate > 70 || st.state === "revolta") tryAct("s_autonomia");
  if (st.t + rate > 60) tryAct("s_investir");
}
// IA conselheira: aperta "Fazer isso" na primeira dica que dá para fazer até não sobrar dica útil (como clicar no cartão várias vezes)
function followAdvisor(g){
  for (let k = 0; k < 15 && !g.ended && !g.queue.length; k++){
    const t = API.advisorTips(g, { tab: "historia" }).find(t => t.act.k !== "tab" && t.act.k !== "end");
    if (!t || API.advisorDo(g, t).ok === false) break;
    g.simAdvN = (g.simAdvN || 0) + 1;
  }
}
function play(sc, seed, greedy, novice, advisor){
  const r = rng(seed * 7919 + (greedy === "golpista_conselheira" ? 5 : greedy === "pacificador" ? 4 : greedy === "golpista" ? 3 : greedy === "radical" ? 2 : greedy ? 1 : 0));
  const g = API.newCampaign(sc, seed, OPTS);
  g.stat.orders = 0; if (novice) g.simNovice = true; if (advisor) g.simAdvisor = true;
  const E = g.simEco = { turns: 0, apSum: 0, moneySum: 0, moneyMax: g.money, rich: 0, facPaid: 0, conv: 0 };
  const SS = g.simSouth = { rebel: false, peak: 0 };
  const W = g.simWar = { months: 0, bat: 0, won: 0, att: 0, attWon: 0, peak: 0, recruits: 0, statesStart: null, statesEnd: null };
  let turns = 0;
  while (!g.ended){
    const e1 = resolveQueue(g, sc, r, greedy); if (e1) return { err: e1, g };
    if (g.ended) break;
    E.turns++; E.apSum += g.ap;
    if (g.simAdvisor || (greedy === "golpista_conselheira" && API.coupState(g))) followAdvisor(g);
    else { spendAP(g, sc, r, greedy); giveOrders(g, sc, r, greedy); }
    const e2 = resolveQueue(g, sc, r, greedy); if (e2) return { err: e2, g };
    if (g.ended) break;
    const nArm0 = g.armySeq || 0, mine0 = new Set(API.armiesOf(g, "player").map(a => a.id));
    if (!API.endTurn(g)) return { err: "endTurn recusou com fila vazia", g };
    if (Object.values(g.control).includes("separatista")) SS.rebel = true;
    if (g.south) SS.peak = Math.max(SS.peak, g.south.t);
    E.moneySum += g.money; E.moneyMax = Math.max(E.moneyMax, g.money); if (g.money >= 60) E.rich++;
    if (g.mil && g.mil.war){
      W.months++; if (W.statesStart === null) W.statesStart = API.sideCounts(g).player;
      for (const b of g.mil.battles){ const pi = b.sides[0].side === "player" ? 0 : 1; W.bat++; if (b.win === pi) W.won++; if (b.sides[0].side === "player" && b.attack){ W.att++; if (b.win === 0) W.attWon++; } }
      for (const f of (g.mil.fronts || [])){ if (f.p !== "avancar" && f.e !== "avancar") continue; W.bat++; if (f.d > 0) W.won++; if (f.p === "avancar"){ W.att++; if (f.d > 0) W.attWon++; } }
      W.peak = Math.max(W.peak, API.sideStr(g, "player")); W.statesEnd = API.sideCounts(g).player;
    }
    // relatório pós-batalha: toda batalha precisa gerar um relatório coerente (sem NaN, com resumo e dica)
    if (g.mil) for (const b of g.mil.battles){ const R = API.battleReport(b);
      if (!R.summary || !R.tips.length || !R.rows.length || !Number.isFinite(R.power.p + R.power.e + R.loss.p + R.loss.e) || R.rows.some(x => !Number.isFinite(x.lr)) || R.won !== (b.win === R.pi)) return { err: `relatório de batalha inválido em ${b.uf}`, g }; }
    if (g.mil && g.mil.fronts) for (const f of g.mil.fronts){ const R = API.frontReport(g, f);
      if (!R.summary || !R.tips.length || !R.rows.length || !Number.isFinite(R.power.p + R.power.e + f.d + f.lossP + f.lossE) || !Number.isFinite(f.prog)) return { err: `relatório de frente inválido (${f.front})`, g }; }
    if (g.war){ const W = g.war; if (!(W.reserve >= 0) || W.fronts.some(f => !(f.troops >= 0) || !(f.enemy >= 0) || !(f.morale >= 0 && f.morale <= 100) || !(f.supply >= 0 && f.supply <= 100) || !API.FRONT_POSTURES.includes(f.posture) || !Number.isFinite(f.progress))) return { err: "estado das frentes inválido", g };
      if (W.fronts.length > 2 || new Set(W.fronts.map(f => f.id)).size !== W.fronts.length) return { err: "frentes duplicadas", g };
      if ((g.armies || []).length) return { err: "exércitos no modo frentes", g }; }
    if (g.battleLog && g.battleLog.length > 30) return { err: "battleLog acima de 30", g };
    const inv = invariants(g, sc); if (inv) return { err: inv, g };
    if (++turns > 400) return { err: "partida não termina (400 turnos)", g };
    JSON.parse(JSON.stringify(g)); // save serializável
  }
  return { g };
}

const report = {}, FC = {};
// Roteiro de cobertura (não entra na comparação de balanceamento): segue o caminho do golpe na história
const COUP = { brasil2022: { apuracao: 3, sondagem: 1, expurgo: 0, decreto: 0, racha_militar: 0, guerra: 0, golpe_inicial: 1 } }; // guerra 0 = ofensiva final (mede a vitória); golpe_inicial 1 = intervenção federal (linha dura)
const PAC = { golpe_inicial: 0, reacao_internacional: 0 };
function COUPISH(m){ return m === "golpista" || m === "pacificador" || m === "golpista_conselheira"; }
for (const sc of API.SCENARIOS){
  if (sc.soon || !sc.campaign) continue;
  if (ARGS[1] && sc.id !== ARGS[1]) continue;
  if (sc.locked && ARGS[1] !== sc.id) continue; // cenário bloqueado: só roda se pedido explicitamente (node sim.js N brasil1964)
  const endings = Object.entries(sc.story.nodes).filter(([, n]) => n.ending).map(([id]) => id);
  console.log(`\n[${sc.year}] ${sc.title}${VARIANT ? ` — dificuldade ${OPTS.diff}${OPTS.quick ? ", partida rápida" : ""}` : ""}${sc.locked ? " (bloqueado — teste de integridade)" : ""}`);
  const R = report[sc.id] = {}; FC[sc.id] = {}; const EVC = {};
  for (const mode of ["aleatoria", ...(OPTS.diff === "facil" || ADV ? ["iniciante"] : []), ...(ADV ? ["conselheira"] : []), "gulosa", "radical", ...(COUP[sc.id] ? ["golpista", ...(GOLPE && sc.golpe ? ["golpista_conselheira"] : []), ...(sc.campaign.south ? ["pacificador"] : [])] : [])]){
    if (COUPISH(mode)) sc.campaign.coupScript = COUP[sc.id];
    const dist = {}, turnsArr = [], monthsArr = [], via = { historia: 0, campanha: 0 }; let crashes = 0, deals = 0, battles = 0, focusDone = 0, orders = 0, evN = 0, evMonths = 0, evMaxGap = 0;
    const ES = { turns: 0, ap: 0, money: 0, max: 0, maxAll: 0, rich: 0, endMoney: 0, fac: 0, conv: 0 };
    const SU = { war: 0, rebel: 0, peak: 0, ally: 0, truce: 0, crushed: 0 };
    const GR = { S: 0, A: 0, B: 0, C: 0 }, ACH = {}, GO = {}, GL = { reuniao: 0, tentou: 0, consumado: 0, fracassou: 0, recuou: 0, regime: 0, mil: 0, milN: 0, pront: 0 };
    const WS = { n: 0, months: 0, bat: 0, won: 0, att: 0, attWon: 0, peak: 0, s0: 0, s1: 0, gained: 0, end: {} };
    for (let i = 1; i <= N; i++){
      let res;
      try { res = play(sc, i, mode === "aleatoria" || mode === "iniciante" || mode === "conselheira" ? false : mode === "gulosa" ? true : mode, mode === "iniciante" || mode === "conselheira", mode === "conselheira"); } catch (e) { crashes++; fail(`${sc.id}/${mode}#${i}: exceção ${e.stack.split("\n").slice(0,2).join(" ")}`); continue; }
      if (res.err){ crashes++; fail(`${sc.id}/${mode}#${i}: ${res.err} em ${API.monthLabel(res.g.month)}`); continue; }
      const g = res.g;
      { const V = g.visited; if (V.includes("sondagem")) GL.reuniao++; if (V.includes("decreto")) GL.tentou++; if (V.includes("golpe_inicial")) GL.consumado++; if (V.includes("golpe_fracassa")) GL.fracassou++;
        if (V.includes("sondagem") && !V.includes("decreto")) GL.recuou++; if (g.ended.node === "fim_regime") GL.regime++; if (g.simDecMil !== undefined){ GL.mil += g.simDecMil; GL.milN++; } }
      dist[g.ended.node] = (dist[g.ended.node] || 0) + 1;
      { const gr = API.endingGrade(g); GR[gr.letter]++; (GO[gr.outcome] = GO[gr.outcome] || { S: 0, A: 0, B: 0, C: 0 })[gr.letter]++;
        if (!"SABC".includes(gr.letter) || !Number.isFinite(gr.score) || gr.score < 0 || gr.score > 100) fail(`${sc.id}/${mode}#${i}: nota inválida ${gr.letter} ${gr.score}`);
        for (const id of API.earnedAchievements(g)) ACH[id] = (ACH[id] || 0) + 1; }
      turnsArr.push(g.turn); monthsArr.push(g.month - g.startMonth);
      via[g.ended.why ? "campanha" : "historia"]++; deals += g.stat.deals; battles += g.stat.battles; orders += g.stat.orders || 0;
      { const E = g.simEco; ES.turns += E.turns; ES.ap += E.apSum; ES.money += E.moneySum; ES.max += E.moneyMax; ES.maxAll = Math.max(ES.maxAll, E.moneyMax); ES.rich += E.rich; ES.endMoney += g.money; ES.fac += E.facPaid || 0; ES.conv += E.conv || 0; }
      if (g.simWar.months){ SU.war++; if (g.simSouth.rebel) SU.rebel++; SU.peak += g.simSouth.peak; if (g.flags.includes("sul_aliado")) SU.ally++; if (g.flags.includes("sul_armisticio")) SU.truce++; if (g.flags.includes("sul_esmagado")) SU.crushed++; }
      if (g.simWar.months){ WS.n++; WS.months += g.simWar.months; WS.bat += g.simWar.bat; WS.won += g.simWar.won; WS.att += g.simWar.att; WS.attWon += g.simWar.attWon; WS.peak += g.simWar.peak; WS.s0 += g.simWar.statesStart; WS.s1 += g.simWar.statesEnd; if (g.simWar.statesEnd > g.simWar.statesStart) WS.gained++; WS.end[g.ended.node] = (WS.end[g.ended.node] || 0) + 1; }
      { const evs = g.history.filter(h => h.ev); evN += evs.length; evMonths += g.month - g.startMonth;
        for (const id in g.eventSeen) EVC[id] = (EVC[id] || 0) + 1;
        let last = g.startMonth; for (const h of evs){ evMaxGap = Math.max(evMaxGap, h.m - last); last = h.m; } }
      if (g.focus){ focusDone += g.focus.done.length; for (const id of g.focus.done) FC[sc.id][id] = (FC[sc.id][id] || 0) + 1; }
    }
    const avg = a => a.length ? (a.reduce((s, x) => s + x, 0) / a.length).toFixed(1) : "-";
    const sorted = Object.entries(dist).sort((a, b) => b[1] - a[1]);
    console.log(`  IA ${mode}${mode === "iniciante" ? " (aleatória, mas lê os avisos de derrota do modo Fácil)" : mode === "conselheira" ? " (história como a iniciante; no resto só segue as dicas da conselheira)" : mode === "golpista" ? " (roteiro do golpe, ignora o Sul)" : mode === "golpista_conselheira" ? " (até o golpe segue a Marta; depois joga como a golpista)" : mode === "pacificador" ? " (roteiro do golpe + evita a rebelião do Sul)" : ""}: ${N} partidas · falhas ${crashes} · turnos médios ${avg(turnsArr)} (min ${Math.min(...turnsArr)}, máx ${Math.max(...turnsArr)}) · meses médios ${avg(monthsArr)} · acordos/partida ${(deals/N).toFixed(1)} · ordens/partida ${(orders/N).toFixed(1)} · batalhas/partida ${(battles/N).toFixed(1)} · fim por estado da campanha ${via.campanha}`);
    console.log(`    economia: AP médio/turno ${(ES.ap / Math.max(1, ES.turns)).toFixed(2)} · ${sc.campaign.money.short} médio ${(ES.money / Math.max(1, ES.turns)).toFixed(0)} · pico médio ${(ES.max / N).toFixed(0)} (máx. ${ES.maxAll}) · turnos com 60+ ${Math.round(100 * ES.rich / Math.max(1, ES.turns))}% · saldo final médio ${(ES.endMoney / N).toFixed(0)} · ações de facção/partida ${(ES.fac / N).toFixed(1)} · conversões/partida ${(ES.conv / N).toFixed(1)}`);
    if (sc.campaign.focus) console.log(`    focos concluídos/partida: ${(focusDone / N).toFixed(1)}`);
    console.log(`    eventos/partida: ${(evN / N).toFixed(1)} (1 a cada ${(evMonths / Math.max(1, evN)).toFixed(1)} meses; maior intervalo ${evMaxGap} meses)`);
    console.log("    " + sorted.map(([k, v]) => `${k} ${(100*v/N).toFixed(0)}%`).join(" · "));
    if (VARIANT || NOTAS){ console.log(`    nota: S ${(100*GR.S/N).toFixed(0)}% · A ${(100*GR.A/N).toFixed(0)}% · B ${(100*GR.B/N).toFixed(0)}% · C ${(100*GR.C/N).toFixed(0)}%` + Object.entries(GO).map(([k, v]) => ` | ${k}: ` + "SABC".split("").map(l => l + v[l]).join(" ")).join(""));
      console.log("    conquistas: " + API.CONQUISTAS.filter(c => ACH[c.id]).map(c => `${c.id} ${(100*ACH[c.id]/N).toFixed(0)}%`).join(" · ")); }
    if (GOLPE && COUPISH(mode)){ const pc = a => (100 * a / N).toFixed(0) + "%";
      console.log(`    golpe: reunião secreta ${pc(GL.reuniao)} · tentou (decreto) ${pc(GL.tentou)} · golpe consumado ${pc(GL.consumado)} · fracassou ${pc(GL.fracassou)} · recuou ${pc(GL.recuou)} · sucesso quando tentou ${GL.tentou ? Math.round(100 * GL.consumado / GL.tentou) + "%" : "-"} · Apoio Militar médio no decreto ${GL.milN ? (GL.mil / GL.milN).toFixed(0) : "-"} · regime venceu a guerra (fim_regime) ${pc(GL.regime)}`); }
    if (VARIANT){ const T = { vitoria: 0, parcial: 0, derrota: 0 }; for (const k in dist) T[sc.story.nodes[k].outcome || "parcial"] += dist[k]; // outcome dos finais (historia.js)
      console.log(`    resultado: vitória ${(100 * T.vitoria / N).toFixed(0)}% · intermediário ${(100 * T.parcial / N).toFixed(0)}% · derrota ${(100 * T.derrota / N).toFixed(0)}% · meses médios ${avg(monthsArr)}`); }
    if (WS.n){
      const pc = (a, b) => b ? Math.round(100 * a / b) + "%" : "-";
      console.log(`    guerra: ${WS.n} partidas com guerra · ${(WS.months / WS.n).toFixed(1)} meses · batalhas vencidas ${pc(WS.won, WS.bat)} (seus ataques ${pc(WS.attWon, WS.att)}) · força máx. média ${(WS.peak / WS.n).toFixed(0)} · estados ${(WS.s0 / WS.n).toFixed(1)} → ${(WS.s1 / WS.n).toFixed(1)} (ganhou território em ${pc(WS.gained, WS.n)}) · finais: ${Object.entries(WS.end).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + " " + pc(v, WS.n)).join(", ")}`);
    }
    if (SU.war){ const pc = (a, b) => b ? Math.round(100 * a / b) + "%" : "-";
      console.log(`    Sul: rebelião da Liga do Sul em ${pc(SU.rebel, SU.war)} das partidas com guerra · tensão máx. média ${(SU.peak / SU.war).toFixed(0)} · Sul aliado ${pc(SU.ally, SU.war)} · armistício ${pc(SU.truce, SU.war)} · revolta esmagada ${pc(SU.crushed, SU.war)} · vitória (fim_regime) ${pc((dist.fim_regime || 0), N)}`); }
    R[mode] = { south: SU, eco: { ap: +(ES.ap / Math.max(1, ES.turns)).toFixed(2), moneyAvg: +(ES.money / Math.max(1, ES.turns)).toFixed(1), peakAvg: +(ES.max / N).toFixed(1), peakMax: ES.maxAll, rich60: +(ES.rich / Math.max(1, ES.turns)).toFixed(3), endMoney: +(ES.endMoney / N).toFixed(1), facPerGame: +(ES.fac / N).toFixed(1), convPerGame: +(ES.conv / N).toFixed(1) }, events: +(evN / N).toFixed(1), orders: +(orders / N).toFixed(1), battles: +(battles / N).toFixed(1), focusPerGame: +(focusDone / N).toFixed(2), dist, crashes, turns: avg(turnsArr), months: avg(monthsArr), viaCampanha: via.campanha, war: WS };
  }
  const reached = new Set([...Object.keys(R.aleatoria.dist), ...Object.keys(R.gulosa.dist), ...Object.keys(R.radical.dist), ...Object.keys((R.golpista || {}).dist || {}), ...Object.keys((R.pacificador || {}).dist || {})]);
  const missing = endings.filter(e => !reached.has(e));
  console.log(`  Finais alcançados: ${reached.size}/${endings.length}${missing.length ? " — não alcançados: " + missing.join(", ") : ""}`);
  R.missing = missing;
  { const all = (sc.campaign.events || []).map(e => e.id), never = all.filter(id => !EVC[id]);
    console.log(`  Eventos que apareceram em alguma partida: ${all.length - never.length}/${all.length}${never.length ? " — nunca: " + never.join(", ") : ""}`);
    R.eventCoverage = EVC; R.eventNever = never;
    // só aviso: crises de facção (lealdade < 15) e eventos presos a focos raros (flags fo_*)
    const soft = e => e.crisisOf || ((e.if || {}).flags || []).some(f => f.startsWith("fo_"));
    const hard = never.filter(id => !soft(sc.campaign.events.find(e => e.id === id) || {}));
    if (never.length > hard.length) console.log(`  (aviso, não é falha: crises de facção e eventos de focos raros não vistos: ${never.filter(id => !hard.includes(id)).join(", ")})`);
    if (hard.length && !sc.locked && !VARIANT) fail(`${sc.id}: eventos nunca disparados: ${hard.join(", ")}`); }
  if (sc.campaign.focus){
    const never = sc.campaign.focus.nodes.filter(F => !FC[sc.id][F.id]).map(F => F.id);
    const top = Object.entries(FC[sc.id]).sort((a, b) => b[1] - a[1]);
    console.log(`  Focos concluídos em alguma partida: ${sc.campaign.focus.nodes.length - never.length}/${sc.campaign.focus.nodes.length}${never.length ? " — nunca: " + never.join(", ") : ""}`);
    console.log(`  Mais comuns: ${top.slice(0, 6).map(([k, v]) => `${k} ${v}`).join(", ")} · mais raros: ${top.slice(-5).map(([k, v]) => `${k} ${v}`).join(", ")}`);
    R.focusCoverage = FC[sc.id]; R.focusNever = never;
    if (never.length && !VARIANT) fail(`${sc.id}: focos nunca concluídos: ${never.join(", ")}`);
  }
}
if (!ARGS[1] && !VARIANT && !GOLPE) fs.writeFileSync(JOGO.RAIZ + "/sim-resultados.json", JSON.stringify(report, null, 1));
console.log(fails ? `\n${fails} falha(s).` : "\nSimulação OK: nenhuma falha.");
process.exitCode = fails ? 1 : 0;
