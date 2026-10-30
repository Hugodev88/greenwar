// js/core/efeitos.js — Núcleo: aplica efeitos (fx) nos indicadores, facções, atores e no mapa.
/* ---------- Efeitos ---------- */
function applyStats(g, eff, viaStory){
  const sc = scOf(g), C = sc.campaign;
  for (const k in (eff||{})){
    if (!(k in g.stats)) continue;
    const before = g.stats[k];
    g.stats[k] = clamp(before + eff[k], 0, 100);
    const d = g.stats[k] - before;
    g.lastDelta[k] = (g.lastDelta[k]||0) + d;
    if (!d) continue;
    for (const f of C.factions) if (f.links && f.links[k]) bumpFac(g, f.id, d * f.links[k]);
    if (viaStory && C.actorStat) for (const aid in C.actorStat) if (C.actorStat[aid] === k) g.actors[aid].opinion = clamp(g.actors[aid].opinion + d*2, -100, 100);
  }
}
function bumpFac(g, id, d){ const f = g.fac[id]; if (f) f.loyalty = clamp(Math.round((f.loyalty + d) * 10) / 10, 0, 100); }
function bumpActor(g, id, d){ const a = g.actors[id]; if (a) a.opinion = clamp(Math.round(a.opinion + d), -100, 100); }
function syncActorStats(g){ const C = scOf(g).campaign; if (C.actorStat) for (const aid in C.actorStat){ const k = C.actorStat[aid]; if (k in g.stats) g.stats[k] = clamp(Math.round((g.actors[aid].opinion + 100) / 2), 0, 100); } }
function playerUFs(g){ const ph = phaseOf(g); return Object.keys(g.control).filter(uf => sideOf(g, g.control[uf], ph) === "player"); }
function applyFx(g, fx, rep){
  if (!fx) return;
  if (fx.s) applyStats(g, fx.s);
  if (fx.money) g.money = Math.round(g.money + fx.money);
  if (fx.reserve) addPlayerStrength(g, fx.reserve * STR_UNIT);
  if (fx.fac) for (const id in fx.fac) bumpFac(g, id, fx.fac[id]);
  if (fx.infl) for (const id in fx.infl) if (g.fac[id]) g.fac[id].influence = clamp(g.fac[id].influence + fx.infl[id], 5, 100);
  if (fx.unrest) for (const uf of playerUFs(g)) g.uf[uf].unrest = clamp(g.uf[uf].unrest + fx.unrest, 0, 100);
  if (fx.unrestAll) for (const uf in g.uf) g.uf[uf].unrest = clamp(g.uf[uf].unrest + fx.unrestAll, 0, 100);
  if (fx.unrestUF) for (const uf in fx.unrestUF) g.uf[uf].unrest = clamp(g.uf[uf].unrest + fx.unrestUF[uf], 0, 100);
  if (fx.act) for (const id in fx.act) bumpActor(g, id, fx.act[id]);
  if (fx.actAll) for (const id in g.actors) bumpActor(g, id, fx.actAll);
  if (fx.enemy) g.enemyBoost = Math.max(0, g.enemyBoost + fx.enemy);
  if (fx.flag && !g.flags.includes(fx.flag)) g.flags.push(fx.flag);
  if (fx.map) mapChange(g, { map: fx.map });
  if (fx.ap) g.ap = Math.max(0, g.ap + fx.ap);
  if (fx.ceasefire) g.ceasefire = Math.max(g.ceasefire, fx.ceasefire);
  if (fx.malus){ g.enemyMalus = Math.max(g.month <= g.malusUntil ? g.enemyMalus : 0, fx.malus.v); g.malusUntil = Math.max(g.malusUntil, g.month + fx.malus.months); }
  // efeitos de guerra usados pelos eventos: frentes, moral dos seus exércitos, perdas inimigas
  if (frontMode(g)) frontFx(g, fx);
  else {
  if (fx.front && g.armies){ const ph = phaseOf(g); for (const uf in g.control) if (sideOf(g, g.control[uf], ph) === "contested") g.uf[uf].progress = clamp(g.uf[uf].progress + fx.front, -100, 100); }
  if (fx.org && g.armies) for (const a of armiesOf(g, "player")) a.org = fx.org > 0 ? Math.min(Math.max(a.org, maxOrg(g, "player")), a.org + fx.org) : Math.max(5, a.org + fx.org);
  if (fx.enemyLoss && g.armies){ let left = fx.enemyLoss;
    while (left > 0){ const a = armiesOf(g, "enemy").sort((x, y) => y.str - x.str)[0]; if (!a) break; const d = Math.min(left, a.str); a.str -= d; left -= d; if (a.str < 3) removeArmy(g, a); } }
  }
  // desdobramento: o evento encadeado chega alguns meses depois (se a condição dele ainda valer)
  if (fx.chain) for (const c of [].concat(fx.chain)) (g.chains ||= []).push({ id: c.id, due: g.month + (c.in || 1) });
  if (fx.south) southAdd(g, fx.south);
  if (fx.opp && typeof focusOpenOpp === "function") focusOpenOpp(g, focusDef(g, fx.opp), rep ? (t, k) => rep.push({ t, k: k || "info" }) : null, "aberta por um evento");
  if (fx.southAlly) southAlly(g, rep ? (t, k) => rep.push({ t, k: k || "info" }) : null);
  syncActorStats(g);
}
function fxSummary(g, fx){
  if (!fx) return "";
  const sc = scOf(g), S = sc.story, C = sc.campaign, out = [], sg = v => (v > 0 ? "+" : "") + v;
  if (fx.south && g.south && ["calmo", "revolta"].includes(g.south.state)) out.push(`Tensão no Sul ${sg(fx.south)}`);
  if (fx.southAlly) out.push(`O Sul vira aliado (+1 exército de ${C.south ? C.south.allyStr : 20})`);
  if (fx.s) for (const k in fx.s) out.push(`${S.stats[k] ? S.stats[k].label : k} ${sg(fx.s[k])}`);
  if (fx.money) out.push(`${C.money.short} ${sg(fx.money)}`);
  if (fx.reserve) out.push(`Força militar ${sg(fx.reserve * STR_UNIT)}`);
  if (fx.fac) for (const id in fx.fac){ const f = C.factions.find(x => x.id === id); out.push(`${f ? f.short || f.name : id} ${sg(fx.fac[id])}`); }
  if (fx.infl) for (const id in fx.infl){ const f = C.factions.find(x => x.id === id); out.push(`Influência ${f ? f.short || f.name : id} ${sg(fx.infl[id])}`); }
  if (fx.unrest) out.push(`Agitação nos seus estados ${sg(fx.unrest)}`);
  if (fx.unrestAll) out.push(`Agitação geral ${sg(fx.unrestAll)}`);
  if (fx.act) for (const id in fx.act){ const a = C.actors.find(x => x.id === id); out.push(`Opinião ${a ? a.short || a.name : id} ${sg(fx.act[id])}`); }
  if (fx.actAll) out.push(`Opinião de todos os atores ${sg(fx.actAll)}`);
  if (fx.enemy) out.push(`Força inimiga ${sg(fx.enemy)}`);
  if (fx.unrestUF) out.push(`Agitação em ${Object.keys(fx.unrestUF).join("/")} ${sg(Object.values(fx.unrestUF)[0])}`);
  if (fx.ceasefire) out.push(`Trégua de ${fx.ceasefire} ${fx.ceasefire === 1 ? "mês" : "meses"}`);
  if (fx.malus) out.push(`Inimigo enfraquecido por ${fx.malus.months} meses`);
  if (fx.front) out.push(`Frentes ${sg(fx.front)}`);
  if (fx.org) out.push(`Moral dos seus exércitos ${sg(fx.org)}`);
  if (fx.enemyLoss) out.push(`Força inimiga −${fx.enemyLoss}`);
  if (fx.chain) out.push("Pode ter desdobramentos");
  if (fx.opp) out.push(`Abre a oportunidade “${focusName(g, fx.opp)}”`);
  return out.join(" · ");
}

/* ---------- Mapa ---------- */
function mapChange(g, spec){
  if (!spec) return;
  const before = Object.assign({}, g.control);
  if (spec.resolve) for (const uf in g.control) if (spec.resolve[g.control[uf]]) g.control[uf] = spec.resolve[g.control[uf]];
  if (spec.map) Object.assign(g.control, spec.map);
  noteChanges(g, before);
  if (spec.split && regOn(g)) regSplit(g, spec.split); // 2022: estado dividido ao meio (regiões), sem "em disputa"
}
function noteChanges(g, before){
  for (const uf in g.control) if (g.control[uf] !== before[uf]){
    const ex = g.lastMapChanges.find(c => c.uf === uf);
    if (ex) ex.to = g.control[uf]; else g.lastMapChanges.push({ uf, from: before[uf], to: g.control[uf] });
    const u = g.uf[uf]; u.progress = 0; u.sway = 0;
  }
  g.lastMapChanges = g.lastMapChanges.filter(c => c.from !== c.to);
  prepContested(g);
  syncMilitary(g, before);
}
function setControl(g, uf, fac){ const before = Object.assign({}, g.control); g.control[uf] = fac; noteChanges(g, before); }
