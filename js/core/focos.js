// js/core/focos.js — Núcleo: árvore de decisões nacionais (focos): status, início, progresso e conclusão.
/* ---------- Árvore de decisões nacionais (focos) ---------- */
const FOCUS_FX_KEYS = ["s","money","reserve","fac","infl","unrest","unrestAll","unrestUF","act","actAll","enemy","flag","map","ap","ceasefire","malus","south","southAlly"];
const EVENT_FX_KEYS = FOCUS_FX_KEYS.concat(["front", "org", "enemyLoss", "chain"]);
function focusTree(g){ return scOf(g).campaign.focus || null; }
function focusInit(g){ if (focusTree(g) && !g.focus) g.focus = { done: [], active: null, prog: 0, started: 0, dipBonus: {}, req: [], off: [], hist: [] }; return g.focus; }
function focusDef(g, id){ const T = focusTree(g); return T ? T.nodes.find(n => n.id === id) : null; }
function focusName(g, id){ const F = focusDef(g, id); return F ? F.name : id; }
function focusStatus(g, F){
  const f = g.focus;
  if (!f) return { state: "unavailable", why: "" };
  if (f.done.includes(F.id)) return { state: "done", why: "Concluído" };
  if (f.active === F.id) return { state: "active", why: `Em andamento: ${f.prog}/${F.months} ${F.months === 1 ? "mês" : "meses"}` };
  const ex = (F.excl || []).find(x => f.done.includes(x) || f.active === x);
  if (ex) return { state: "excluded", why: `Bloqueado: exclusivo com “${focusName(g, ex)}”` };
  if (F.lockIf && cond(g, F.lockIf)) return { state: "locked", why: F.lockText || "Bloqueado pela história" };
  const miss = (F.req || []).filter(r => !f.done.includes(r));
  const anyOk = !F.reqAny || F.reqAny.some(r => f.done.includes(r));
  if (miss.length || !anyOk){
    const parts = []; if (miss.length) parts.push(miss.map(r => focusName(g, r)).join(" + "));
    if (!anyOk) parts.push("um de: " + F.reqAny.map(r => focusName(g, r)).join(" / "));
    return { state: "prereq", why: "Requer " + parts.join("; ") };
  }
  if (F.avail && !cond(g, F.avail)) return { state: "unavailable", why: F.availText || "Indisponível agora" };
  return { state: "available", why: "Disponível" };
}
function focusCheck(g, id){
  const T = focusTree(g), F = focusDef(g, id);
  if (!T || !F) return "Foco inexistente";
  if (g.ended) return "Partida encerrada";
  if (g.queue.length) return "Resolva os eventos pendentes";
  if (g.focus.active) return `Já há um foco em andamento (${focusName(g, g.focus.active)})`;
  const st = focusStatus(g, F); if (st.state !== "available") return st.why;
  if (g.ap < (T.ap ?? 1)) return "Pontos de ação insuficientes";
  if ((F.cost || 0) > g.money) return "Recursos insuficientes";
  return "";
}
function startFocus(g, id){
  const bad = focusCheck(g, id); if (bad) return { ok: false, msg: bad };
  const T = focusTree(g), F = focusDef(g, id);
  g.ap -= (T.ap ?? 1); g.money -= (F.cost || 0); g.focus.active = id; g.focus.prog = 0; g.focus.started = g.month; g.stat.actions++;
  return { ok: true, msg: `Foco iniciado: ${F.name} (${F.months} ${F.months === 1 ? "mês" : "meses"}).` };
}
function cancelFocus(g){
  if (!g.focus || !g.focus.active || g.ended) return { ok: false, msg: "Nenhum foco em andamento" };
  const n = focusName(g, g.focus.active); g.focus.active = null; g.focus.prog = 0;
  return { ok: true, msg: `Foco cancelado: ${n}. O progresso foi perdido.` };
}
function focusUnlocks(g, F){
  const C = scOf(g).campaign, flag = "fo_" + F.id, out = [], L = dipLabels(g);
  for (const a of C.actions) if (a.show && (a.show.flags || []).includes(flag)) out.push(`Libera ação: ${a.name}`);
  for (const e of C.events) if (e.if && (e.if.flags || []).includes(flag)) out.push(`Pode disparar o evento: ${e.title}`);
  for (const o of (F.dipOff || [])) out.push(`Diplomacia: libera a oferta “${OFF_LABEL[o]}” em todas as fases`);
  for (const r of (F.dipReq || [])) out.push(`Diplomacia: libera o pedido “${REQ_LABEL[r]}”`);
  for (const aid in (F.dipBonus || {})){ const A = actorDef(g, aid); out.push(`Acordos com ${A ? A.short || A.name : aid} +${F.dipBonus[aid]} na previsão`); }
  if (F.fx && F.fx.flag === "conspiracao") out.push("Marca a conspiração nos autos (pesa no capítulo 'Nos Tribunais')");
  return out;
}
function completeFocus(g, F, R){
  const f = g.focus, C = scOf(g).campaign;
  f.done.push(F.id); f.active = null; f.prog = 0; f.hist.push({ id: F.id, m: g.month });
  if (!g.flags.includes("fo_" + F.id)) g.flags.push("fo_" + F.id);
  applyFx(g, F.fx);
  for (const aid in (F.dipBonus || {})) f.dipBonus[aid] = (f.dipBonus[aid] || 0) + F.dipBonus[aid];
  for (const o of (F.dipOff || [])) if (!f.off.includes(o)) f.off.push(o);
  for (const r of (F.dipReq || [])) if (!f.req.includes(r)) f.req.push(r);
  R(`Foco nacional concluído: ${F.name}${F.fx ? ` — ${fxSummary(g, F.fx)}` : ""}.`, "good");
  if (F.risk && rnd(g) < F.risk.p){ applyFx(g, F.risk.fx); R(`${F.risk.msg} (${fxSummary(g, F.risk.fx)})`, "bad"); }
  const un = focusUnlocks(g, F).filter(t => t.startsWith("Libera ação")); if (un.length) R(un.join(" · ") + ".", "good");
}
function focusTick(g, months, R){
  const T = focusTree(g); if (!T) return;
  const f = focusInit(g);
  if (!f.active){ if (T.nodes.some(F => focusStatus(g, F).state === "available")) R("Nenhum foco nacional em andamento (aba Decisões).", "mid"); return; }
  const F = focusDef(g, f.active);
  const st = focusStatus(g, Object.assign({}, F, { id: "__probe" }));
  const phaseGone = st.state === "unavailable" && F.avail && !cond(g, { phase: F.avail.phase, notPhase: F.avail.notPhase, anyControl: F.avail.anyControl });
  if (st.state === "locked" || st.state === "excluded" || phaseGone){ R(`Foco interrompido: ${F.name} — ${st.why}.`, "bad"); f.active = null; f.prog = 0; return; }
  f.prog += months;
  if (f.prog >= F.months) completeFocus(g, F, R);
  else R(`Foco em andamento: ${F.name} (${f.prog}/${F.months} meses).`);
}
function focusStoryGrant(g, node, rep){
  const T = focusTree(g); if (!T || !T.grants || !T.grants[node]) return;
  const f = focusInit(g);
  for (const id of T.grants[node]) if (!f.done.includes(id)){ if (f.active === id){ f.active = null; f.prog = 0; } f.done.push(id); f.hist.push({ id, m: g.month, story: true }); if (!g.flags.includes("fo_" + id)) g.flags.push("fo_" + id); if (rep) rep.push({ t: `A história impôs o foco “${focusName(g, id)}”.`, k: "mid" }); }
}
