// js/core/acoes.js — Núcleo: ações da aba Ações e ações no mapa (investir, negociar…).
/* ---------- Ações (pontos de ação) ---------- */
function actionState(g, a){
  if (g.ended) return { ok: false, why: "Partida encerrada" };
  if (g.queue.length) return { ok: false, why: "Resolva os eventos pendentes" };
  if (g.used[a.id]) return { ok: false, why: "Já usada neste turno" };
  if (a.req && !cond(g, a.req)) return { ok: false, why: a.reqText || "Indisponível nesta fase" };
  if ((a.ap ?? 1) > g.ap) return { ok: false, why: "Pontos de ação insuficientes" };
  if ((a.cost || 0) > 0 && g.money < a.cost) return { ok: false, why: "Recursos insuficientes" };
  return { ok: true };
}
function visibleActions(g){ return (scOf(g).campaign.actions || []).filter(a => !a.show || cond(g, a.show)); }
function doAction(g, id){
  const a = scOf(g).campaign.actions.find(x => x.id === id);
  const st = actionState(g, a); if (!st.ok) return { ok: false, msg: st.why };
  g.ap -= (a.ap ?? 1); g.money -= (a.cost || 0); g.used[a.id] = true; g.stat.actions++;
  applyFx(g, a.fx);
  let msg = `${a.name}: ${fxSummary(g, a.fx) || "feito"}.`;
  if (a.risk && rnd(g) < a.risk.p){ applyFx(g, a.risk.fx); msg += ` ${a.risk.msg} (${fxSummary(g, a.risk.fx)})`; }
  checkCollapse(g);
  return { ok: true, msg };
}
function checkCollapse(g){
  const S = scOf(g).story;
  if (!g.ended) for (const k in S.collapse) if (g.stats[k] <= 0){ g.queue = []; enterStory(g, collapseTo(g, k)); return true; }
  return false;
}

/* ---------- Ações no mapa ---------- */
function mapActions(g, uf){
  const C = scOf(g).campaign, ph = phaseOf(g), s = sideOf(g, g.control[uf], ph), u = g.uf[uf], out = [];
  const war = !!ph.war, busy = g.queue.length > 0 || !!g.ended, mc = C.mapCost || {};
  const add = (kind, label, ap, cost, ok, why, desc) => out.push({ kind, label, ap, cost, ok: ok && !busy && g.ap >= ap && g.money >= cost, why: busy ? "Resolva os eventos pendentes" : (!ok ? why : (g.ap < ap ? "Pontos de ação insuficientes" : (g.money < cost ? "Recursos insuficientes" : ""))), desc });
  const flipTo = ph.flipTo && ph.flipTo[g.control[uf]];
  if (s === "player") add("investir", "Investir recursos", 1, mc.investir ?? 5, true, "", "Reduz a agitação (−15) e melhora a economia local.");
  if (s === "player" || flipTo) add("propaganda", "Propaganda", 1, mc.propaganda ?? 2, true, "", s === "player" ? "Reduz a agitação (−8)." : "Aumenta a simpatia pela sua causa (rumo a 100 = adesão).");
  if (s === "player" || s === "contested" || flipTo) add("negociar", "Negociar com o governador", 1, mc.negociar ?? 3, true, "", s === "player" ? "Acalma o estado (−20 agitação) se der certo." : (s === "contested" ? "Pode enfraquecer o inimigo local." : "Chance de ganhar adesão (+35 simpatia)."));
  return out;
}
function negotiateChance(g, uf){
  const C = scOf(g).campaign, u = g.uf[uf], pop = g.stats[C.keys.pop] ?? 50;
  return Math.round(clamp(45 + (pop - 50)*0.6 + u.sway*0.2 - u.unrest*0.1, 10, 85));
}
function doMapAction(g, uf, kind){
  const A = mapActions(g, uf).find(a => a.kind === kind);
  if (!A || !A.ok) return { ok: false, msg: A ? A.why : "Ação indisponível" };
  const C = scOf(g).campaign, ph = phaseOf(g), u = g.uf[uf], s = sideOf(g, g.control[uf], ph), name = MAP_DATA.states[uf].name;
  g.ap -= A.ap; g.money -= A.cost; g.stat.actions++;
  let msg = "";
  if (kind === "investir"){ u.unrest = clamp(u.unrest - 15, 0, 100); applyStats(g, C.keys.econ ? { [C.keys.econ]: 1 } : { [C.keys.pop]: 1 }); msg = `Investimento em ${name}: agitação ${Math.round(u.unrest)}.`; if (southLocal(g, uf)){ const d = southAdd(g, -4); if (d) msg += ` Tensão no Sul ${d}.`; } }
  else if (kind === "propaganda"){
    if (s === "player"){ u.unrest = clamp(u.unrest - 8, 0, 100); msg = `Propaganda em ${name}: agitação ${Math.round(u.unrest)}.`; }
    else { u.sway = clamp(u.sway + 15 + Math.round(((g.stats[C.keys.pop] ?? 50) - 50)/5), -100, 100); msg = `Propaganda em ${name}: simpatia ${Math.round(u.sway)}/100.`; checkSway(g, uf); }
  } else if (kind === "negociar"){
    const ch = negotiateChance(g, uf), ok = rnd(g)*100 < ch;
    if (!ok){ u.sway = clamp(u.sway - 5, -100, 100); msg = `As conversas em ${name} fracassaram (chance era ${ch}%).`; }
    else if (s === "player"){ u.unrest = clamp(u.unrest - 20, 0, 100); msg = `Acordo com o governo de ${name}: agitação ${Math.round(u.unrest)}.`; if (southLocal(g, uf)){ const d = southAdd(g, -6); if (d) msg += ` Tensão no Sul ${d}.`; } }
    else if (s === "contested"){ u.enemy = Math.max(0, u.enemy - 1); u.progress = clamp(u.progress + 15, -100, 100); msg = `Negociação local em ${name}: força inimiga ${u.enemy}.`; }
    else { u.sway = clamp(u.sway + 35, -100, 100); msg = `O governo de ${name} se aproxima (simpatia ${Math.round(u.sway)}/100).`; checkSway(g, uf); }
  }
  return { ok: true, msg };
}
function checkSway(g, uf){
  const ph = phaseOf(g), u = g.uf[uf], to = ph.flipTo && ph.flipTo[g.control[uf]];
  if (to && u.sway >= 100){
    // guerra por regiões (2022): convencer o governador vira metade das regiões do estado; o estado muda se a maioria virar
    if (ph.war && frontMode(g) && !scOf(g).campaign.contested){ regHalf(g, uf, to, sideOf(g, to, ph), "negociacao"); u.sway = 0; return true; }
    setControl(g, uf, to); return true; }
  return false;
}
