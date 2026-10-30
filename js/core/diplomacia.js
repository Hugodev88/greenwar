// js/core/diplomacia.js — Núcleo: diplomacia com outros países (pedidos, ofertas, acordos, missões).
/* ---------- Diplomacia ---------- */
function actorDef(g, id){ return scOf(g).campaign.actors.find(a => a.id === id); }
function dipLabels(g){ const C = scOf(g).campaign, ph = phaseOf(g); return { req: Object.assign({}, REQ_LABEL, C.reqLabels || {}, (ph.diplo||{}).reqLabels || {}), off: Object.assign({}, OFF_LABEL, C.offLabels || {}, (ph.diplo||{}).offLabels || {}) }; }
function allowedReqs(g, aid){
  const A = actorDef(g, aid), st = g.actors[aid], ph = phaseOf(g), allow = [...new Set([...((ph.diplo && ph.diplo.req) || REQ_TYPES), ...((g.focus && g.focus.req) || [])])];
  return allow.filter(r => (A.gives[r] || 0) > 0 && !(r === "reconhecimento" && st.recognized) && !(r === "sancoes" && !ph.war) && !(r === "armas" && !ph.war && !(ph.diplo && ph.diplo.armsInPeace)));
}
function allowedOffs(g, aid){ const ph = phaseOf(g), base = (ph.diplo && ph.diplo.off) || OFF_TYPES; return OFF_TYPES.filter(o => base.includes(o) || ((g.focus && g.focus.off) || []).includes(o)); }
function playerStrength(g){ const C = scOf(g).campaign; return ((g.stats[C.keys.pop] ?? 50) + (g.stats[C.keys.mil] ?? 50)) / 2; }
function dealScore(g, aid, req, off){
  const A = actorDef(g, aid), st = g.actors[aid], C = scOf(g).campaign, parts = [];
  const add = (lbl, v) => { v = Math.round(v); if (v) parts.push([lbl, v]); return v; };
  const L = dipLabels(g);
  let s = add("Opinião sobre você", st.opinion * 0.6);
  for (const r of req) s += add(`Pedido: ${L.req[r]}`, -REQ_BASE[r] / Math.max(0.2, A.gives[r] || 0));
  for (const o of off) s += add(`Oferta: ${L.off[o]}`, OFF_BASE[o] * (A.interests[o] || 0));
  s += add("Legitimidade do seu lado", (A.democracy || 0) * ((g.stats[C.keys.legit] ?? 50) - 50) * 0.5);
  s += add("Sua força na crise", (playerStrength(g) - 50) * 0.25);
  s += add("Acordos recentes", -st.deals * 6);
  s += add("Dependência (alavanca deles)", st.dependence * 0.1);
  if (g.focus && g.focus.dipBonus[aid]) s += add("Decisões nacionais", g.focus.dipBonus[aid]);
  return { score: Math.round(s), parts };
}
function dealHint(score){
  if (score >= 15) return { label: "Muito provável", cls: "good" };
  if (score >= 0) return { label: "Provável", cls: "good" };
  if (score >= -25) return { label: "Vão pedir algo em troca", cls: "mid" };
  return { label: "Improvável", cls: "bad" };
}
function dealCheck(g, aid, req, off){
  if (g.ended) return "Partida encerrada";
  if (g.queue.length) return "Resolva os eventos pendentes";
  if (g.dealtWith[aid]) return "Já negociou com este ator neste turno";
  if (g.ap < 1) return "Pontos de ação insuficientes";
  if (!req.length) return "Escolha ao menos um pedido";
  if (req.length > 2) return "No máximo 2 pedidos por acordo";
  if (off.length > 3) return "No máximo 3 ofertas";
  const ar = allowedReqs(g, aid), ao = allowedOffs(g, aid);
  if (req.some(r => !ar.includes(r)) || off.some(o => !ao.includes(o))) return "Item indisponível";
  return "";
}
function proposeDeal(g, aid, req, off){
  const bad = dealCheck(g, aid, req, off); if (bad) return { result: "error", msg: bad };
  g.ap--; g.dealtWith[aid] = true; g.counter = null;
  const A = actorDef(g, aid), { score } = dealScore(g, aid, req, off);
  if (score >= 0){ const msg = applyDeal(g, aid, req, off); return { result: "accept", msg: `${A.name} aceitou. ${msg}` }; }
  if (score >= -25){
    const ao = allowedOffs(g, aid).filter(o => !off.includes(o) && (A.interests[o] || 0) > 0)
      .sort((a, b) => (A.interests[b] || 0) * OFF_BASE[b] - (A.interests[a] || 0) * OFF_BASE[a]);
    for (const o of ao){ const n = [...off, o]; if (n.length <= 3 && dealScore(g, aid, req, n).score >= 0){ g.counter = { aid, req: [...req], off: n }; return { result: "counter", counter: g.counter, msg: `${A.name} faz uma contraproposta: aceita se você incluir “${dipLabels(g).off[o]}”.` }; } }
    if (req.length > 1){
      const keep = [...req].sort((a, b) => REQ_BASE[a] / (A.gives[a]||.2) - REQ_BASE[b] / (A.gives[b]||.2)).slice(0, 1);
      if (dealScore(g, aid, keep, off).score >= 0){ g.counter = { aid, req: keep, off: [...off] }; return { result: "counter", counter: g.counter, msg: `${A.name} faz uma contraproposta: aceita apenas “${dipLabels(g).req[keep[0]]}”.` }; }
    }
  }
  bumpActor(g, aid, -3);
  return { result: "refuse", msg: `${A.name} recusou a proposta.` };
}
function acceptCounter(g){
  const c = g.counter; if (!c || g.ended) return { ok: false, msg: "Sem contraproposta" };
  g.counter = null;
  return { ok: true, msg: `${actorDef(g, c.aid).name}: acordo fechado. ` + applyDeal(g, c.aid, c.req, c.off) };
}
function applyDeal(g, aid, req, off){
  const sc = scOf(g), C = sc.campaign, A = actorDef(g, aid), st = g.actors[aid], K = C.keys, out = [];
  st.deals++; g.stat.deals++;
  bumpActor(g, aid, 5);
  const rel = A.rel || {};
  for (const r of req){
    if (r === "dinheiro"){ const amt = C.loan || 15, due = g.month + 6; g.money += amt; g.debts.push({ aid, amount: Math.round(amt * 1.3), due }); out.push(`+${amt} ${C.money.short} (dívida de ${Math.round(amt*1.3)} vence em ${monthLabel(due)})`); }
    if (r === "armas"){ const got = addPlayerStrength(g, 2 * STR_UNIT); g.armsAid = { v: Math.min(0.3, armsAid(g) + 0.12), until: g.month + 6 }; applyStats(g, { [K.mil]: 4 }); st.dependence += 10; out.push(`${got ? `+${got} de força militar, ` : ""}armas estrangeiras (+${Math.round(g.armsAid.v * 100)}% em combate por 6 meses), ${sc.story.stats[K.mil].label} +4, dependência maior`); }
    if (r === "reconhecimento"){ st.recognized = true; applyStats(g, { [K.legit]: 8 }); for (const o in rel) if (rel[o] >= 0.5) bumpActor(g, o, 4); out.push(`reconhecimento obtido (${sc.story.stats[K.legit].label} +8)`); }
    if (r === "sancoes"){ g.enemyMalus = 1; g.malusUntil = g.month + 4; out.push("sanções enfraquecem o inimigo por 4 meses"); }
    if (r === "mediacao"){ if (isWar(g)) g.ceasefire = 2; applyFx(g, { unrestAll: -10, s: { [K.legit]: 3, [K.pop]: 2 } }); out.push(isWar(g) ? "trégua mediada de 2 meses, agitação −10" : "mediação reduz a agitação (−10)"); }
  }
  for (const o of off){
    if (o === "commodities"){ g.drains.push({ aid, amount: C.drain || 2, until: g.month + 6 }); out.push(`entrega de commodities: −${C.drain || 2} ${C.money.short}/mês por 6 meses`); }
    if (o === "bases"){ st.dependence += 20; for (const x in rel) if (rel[x] < 0) bumpActor(g, x, -15 * Math.abs(rel[x])); out.push("bases cedidas: rivais irritados, dependência maior"); }
    if (o === "onu"){ for (const x in rel) if (rel[x] < 0) bumpActor(g, x, -8 * Math.abs(rel[x])); bumpActor(g, aid, 5); }
    if (o === "concessoes"){ if (K.econ) applyStats(g, { [K.econ]: -2 }); }
    if (o === "alinhamento"){ st.aligned = true; bumpActor(g, aid, 10); for (const x in rel){ if (rel[x] < 0) bumpActor(g, x, -20 * Math.abs(rel[x])); else bumpActor(g, x, 8 * rel[x]); } if (A.reactions) for (const f in A.reactions) bumpFac(g, f, A.reactions[f] * 0.5); out.push("alinhamento anunciado: aliados aprovam, rivais reagem"); }
    if (C.offerFac && C.offerFac[o]) for (const f in C.offerFac[o]) bumpFac(g, f, C.offerFac[o][f]);
  }
  for (const x in rel) if (rel[x] <= -0.3) bumpActor(g, x, -8 * Math.abs(rel[x]));
  if (A.reactions) for (const f in A.reactions) bumpFac(g, f, A.reactions[f]);
  syncActorStats(g);
  return out.join("; ") + ".";
}
function diploMission(g, aid){
  if (g.queue.length || g.ended) return { ok: false, msg: "Resolva os eventos pendentes" };
  const key = "mis_" + aid, cost = scOf(g).campaign.missionCost ?? 2;
  if (g.used[key]) return { ok: false, msg: "Missão já enviada neste turno" };
  if (g.ap < 1) return { ok: false, msg: "Pontos de ação insuficientes" };
  if (g.money < cost) return { ok: false, msg: "Recursos insuficientes" };
  g.ap--; g.money -= cost; g.used[key] = true; g.stat.actions++;
  bumpActor(g, aid, 8); syncActorStats(g);
  return { ok: true, msg: `Missão diplomática: opinião de ${actorDef(g, aid).name} +8.` };
}
