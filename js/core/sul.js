// js/core/sul.js — Núcleo: Tensão no Sul (Liga do Sul): fatores, ritmo, cúpula, revolta, armistício e aliança.
/* ---------- Tensão no Sul (2022) ----------
   0–100. Sobe todo mês por causa da ruptura, da agitação no Sul e de fraquezas do regime; cai com cúpulas, concessões,
   investimentos e tropas leais no Sul. Aviso a partir de 70; com 100 a Liga do Sul se rebela em etapas (RS, depois SC),
   com exércitos menores. Em revolta, baixar a tensão a ≤45 força um armistício. Com ≤30 (após uma cúpula) o
   Pacto Federativo torna o Sul aliado. */
function southCfg(g){ return scOf(g).campaign.south || null; }
function southOn(g){ return !!(g && g.south && southCfg(g)); }
function southLocal(g, uf){ const SC = southCfg(g); return southOn(g) && SC.ufs.includes(uf) && ["calmo", "revolta"].includes(g.south.state); }
function southInit(g){
  const SC = southCfg(g); if (!SC || g.south) return;
  const agro = g.fac.agro ? g.fac.agro.loyalty : 50;
  g.south = { t: clamp(SC.start + (agro >= 60 ? -10 : agro <= 30 ? 10 : 0), 0, 95), state: "calmo", stage: 0, since: 0, warned: false, summit: false, trend: 0 };
}
function southAdd(g, d){
  if (!southOn(g) || !d || !["calmo", "revolta"].includes(g.south.state)) return 0;
  const b = g.south.t; g.south.t = clamp(Math.round(b + d), 0, 100); return g.south.t - b;
}
function southFactors(g){
  const SC = southCfg(g), out = []; if (!southOn(g) || !["calmo", "revolta"].includes(g.south.state)) return out;
  const K = scOf(g).campaign.keys;
  out.push({ t: "Ruptura da ordem: governadores desconfiam de Brasília", v: SC.base });
  if (g.visited.includes("racha_militar")) out.push({ t: "Guerra civil: Brasília depende do Sul", v: 2 });
  const avg = SC.ufs.reduce((s, uf) => s + g.uf[uf].unrest, 0) / SC.ufs.length, du = Math.round((avg - 50) / 8);
  if (du) out.push({ t: `Agitação média em RS/SC/PR (${Math.round(avg)})`, v: du });
  const agro = g.fac.agro ? g.fac.agro.loyalty : 50;
  if (agro < 35) out.push({ t: "Agronegócio insatisfeito", v: 2 }); else if (agro >= 65) out.push({ t: "Agronegócio leal ao governo", v: -2 });
  if ((g.stats[K.mil] ?? 50) < 40) out.push({ t: "Forças fracas: Brasília parece vulnerável", v: 2 });
  if (sideCounts(g).enemy >= 12) out.push({ t: "A resistência avança pelo país", v: 1 });
  const troops = g.armies ? armiesOf(g, "player").filter(a => SC.ufs.includes(a.uf)).length : 0;
  if (troops) out.push({ t: "Exércitos leais estacionados no Sul", v: -Math.min(2, troops) });
  if (g.flags.includes("sul_autonomia")) out.push({ t: "Autonomia administrativa concedida", v: -1 });
  return out;
}
function southRate(g){ const v = southFactors(g).reduce((s, f) => s + f.v, 0); return clamp(v, -4, g.south && g.south.state === "revolta" ? 2 : 9); }
function southEta(g){ if (!southOn(g) || g.south.state !== "calmo") return null; const r = southRate(g); return r > 0 ? Math.max(1, Math.ceil((southCfg(g).revolt - g.south.t) / r)) : null; }
function southLevel(g){
  if (!southOn(g)) return null; const SC = southCfg(g), st = g.south;
  if (st.state === "aliado") return { k: "ok", label: "Aliado (Pacto Federativo)" };
  if (st.state === "esmagada") return { k: "ok", label: "Revolta esmagada" };
  if (st.state === "revolta") return { k: "bad", label: "Liga do Sul em revolta" };
  return st.t >= SC.warn ? { k: "bad", label: "Perigo: rebelião próxima" } : st.t >= SC.summitAt ? { k: "warn", label: "Tensa" } : { k: "ok", label: "Sob controle" };
}
function southOnStory(g, id, rep){
  const SC = southCfg(g); if (!SC) return;
  if (id === SC.startNode) southInit(g);
  const j = SC.jolt && SC.jolt[id];
  if (j && southOn(g) && g.south.state === "calmo"){
    const b = g.south.t; g.south.t = Math.max(b, Math.min(b + j, SC.joltCap));
    if (rep && g.south.t > b) rep.push({ t: `O racha nas Forças inflama o Sul: Tensão no Sul +${g.south.t - b} (agora ${g.south.t}/100).`, k: "bad" });
  }
}
function southRaise(g, uf){
  const SC = southCfg(g); if (g.control[uf] === SC.fac || sideOf(g, g.control[uf]) !== "player") return false;
  setControl(g, uf, SC.fac);
  for (const a of armiesOf(g, "enemy", uf)) if (a.fac === SC.fac) a.str = Math.min(a.str, SC.armyStr);
  return true;
}
function southTick(g, pace, R){
  if (!southOn(g) || !phaseOf(g).war) return;
  const SC = southCfg(g), st = g.south;
  if (!["calmo", "revolta"].includes(st.state)) return;
  const r = southRate(g); st.trend = r;
  const d = southAdd(g, r * pace);
  if (st.state === "calmo"){
    if (st.t >= SC.revolt){ southRevolt(g, R); return; }
    if (st.t >= SC.summitAt && !st.summit && SC.summit){ st.summit = true; (g.chains ||= []).push({ id: SC.summit, due: g.month }); }
    if (st.t >= SC.warn){ const eta = southEta(g);
      R(`⚠ Tensão no Sul em ${st.t}/100 (${d >= 0 ? "+" : ""}${d} no turno)${eta ? `: no ritmo atual a Liga do Sul se rebela em ~${eta} ${eta === 1 ? "mês" : "meses"}` : ""}. Use as ações da categoria Sul (aba Ações) ou invista em RS/SC/PR.`, "bad");
      st.warned = true; }
    else if (d) { if (st.warned && st.t < SC.warn - 10) st.warned = false; if (d >= 6 || st.t >= SC.summitAt) R(`Tensão no Sul: ${st.t}/100 (${d > 0 ? "+" : ""}${d}).`, d > 0 ? "bad" : "good"); }
    return;
  }
  // em revolta
  const held = Object.keys(g.control).filter(uf => g.control[uf] === SC.fac);
  if (!held.length && g.month > st.since){ st.state = "esmagada"; if (!g.flags.includes("sul_esmagado")) g.flags.push("sul_esmagado"); R("A revolta da Liga do Sul foi esmagada: não resta estado sob controle separatista.", "good"); return; }
  if (st.t <= SC.truce){ southTruce(g, R); return; }
  if (st.stage === 1 && g.month >= st.since + SC.stage2After && st.t >= SC.stage2){
    const next = SC.rebel.find(uf => g.control[uf] !== SC.fac);
    st.stage = 2;
    if (next && southRaise(g, next)) R(`${MAP_DATA.states[next].name} adere à Liga do Sul (tensão ${st.t}/100). Baixe a tensão para ${SC.truce} ou menos para forçar um armistício.`, "bad");
    return;
  }
  R(`A Liga do Sul segue em revolta (tensão ${st.t}/100). ${st.stage === 1 && st.t >= SC.stage2 ? `Se continuar acima de ${SC.stage2}, ${MAP_DATA.states[SC.rebel[1]].name} adere em breve. ` : ""}Com ${SC.truce} ou menos, ela aceita um armistício.`, "bad");
}
function southRevolt(g, R){
  const SC = southCfg(g), st = g.south;
  Object.assign(st, { state: "revolta", stage: 1, since: g.month, t: 100 });
  if (!g.flags.includes("sul_revolta")) g.flags.push("sul_revolta");
  const uf = SC.rebel.find(u => sideOf(g, g.control[u]) === "player");
  if (uf) southRaise(g, uf);
  if (R) R(`A Liga do Sul se rebelou: ${uf ? MAP_DATA.states[uf].name + " rompe com Brasília (um exército separatista pequeno, força " + SC.armyStr + ")" : "os governadores do Sul rompem com Brasília"}. ${MAP_DATA.states[SC.rebel[1]].name} pode aderir em ${SC.stage2After} meses se a tensão continuar alta.`, "bad");
}
function southTruce(g, R){
  const SC = southCfg(g), st = g.south, ph = phaseOf(g), before = Object.assign({}, g.control);
  g.armies = (g.armies || []).filter(a => !(a.side === "enemy" && a.fac === SC.fac));
  g.enemyPlans = (g.enemyPlans || []).filter(p => armyById(g, p.id));
  for (const uf in g.control) if (g.control[uf] === SC.fac) g.control[uf] = ph.playerMain || ph.player[0];
  noteChanges(g, before);
  Object.assign(st, { state: "calmo", stage: 0, t: SC.truceReset, warned: false });
  if (!g.flags.includes("sul_armisticio")) g.flags.push("sul_armisticio");
  if (R) R(`Armistício no Sul: a Liga do Sul depõe as armas e os estados rebeldes voltam ao seu controle. Tensão no Sul ${st.t}/100 — se voltar a 100, ela se rebela de novo.`, "good");
}
function southAlly(g, R){
  const SC = southCfg(g); if (!southOn(g)) return;
  const st = g.south; Object.assign(st, { state: "aliado", t: 0, stage: 0 });
  if (!g.flags.includes("sul_aliado")) g.flags.push("sul_aliado");
  if (!g.armies) return;
  const at = SC.ufs.find(uf => armyAllowed(g, "player", uf)) || capitalOf(g, "player");
  if (at && armiesOf(g, "player").length < ARMY_CAP.player) newArmy(g, "player", at, SC.allyStr, { name: SC.allyName, gen: "Gen. Lauro Becker" });
  else addPlayerStrength(g, SC.allyStr);
  if (R) R("Pacto Federativo assinado: o Sul agora é aliado e enviou uma divisão.", "good");
}
