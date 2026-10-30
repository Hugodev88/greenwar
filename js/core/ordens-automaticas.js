// js/core/ordens-automaticas.js — Núcleo: ordens automáticas dos exércitos ("defender fronteiras" e "automático").
/* ---------- Ordens automáticas ----------
   "defender": exércitos sem ordem na fronteira defendem; os da retaguarda andam rumo à frente.
   "auto": além disso, ataca onde a chance é boa (≥ 1,3×), juntando exércitos vizinhos no mesmo alvo. */
function isFrontUF(g, uf){ const ph = phaseOf(g); return ADJ[uf].some(n => { const s = sideOf(g, g.control[n], ph); return s === "enemy" || s === "contested"; }) || sideOf(g, g.control[uf], ph) === "contested"; }
function autoOrders(g, mode, onlyIdle){
  const ph = phaseOf(g); if (!ph.war || !g.armies || g.ended) return { ok: false, n: 0, msg: "Sem guerra: nada a fazer." };
  const idle = () => armiesOf(g, "player").filter(a => !a.order || (!onlyIdle && a.order.type === "defender"));
  let n = 0;
  if (mode === "auto" && !(g.ceasefire > 0)){
    const cands = [];
    for (const a of idle()) for (const t of armyTargets(g, a)) if (t.type === "atacar") cands.push(t.uf);
    const seen = new Set();
    for (const uf of cands){
      if (seen.has(uf)) continue; seen.add(uf);
      const group = idle().filter(a => armyTargets(g, a).some(t => t.uf === uf && t.type === "atacar")).sort((x, y) => y.str - x.str);
      const pick = [];
      for (const a of group){ pick.push(a); const o = battleOdds(g, "player", pick, uf); if (o.ratio >= 1.3) break; }
      if (!pick.length || battleOdds(g, "player", pick, uf).ratio < 1.3) continue;
      if (ordersUsed(g) + pick.length > commandLimit(g)) continue;
      for (const a of pick) if (setOrder(g, a.id, "atacar", uf).ok) n++;
    }
  }
  for (const a of idle()){
    if (!isFrontUF(g, a.uf) && ordersUsed(g) < commandLimit(g)){
      const mv = armyTargets(g, a).filter(t => t.type === "mover" && isFrontUF(g, t.uf));
      if (mv.length && setOrder(g, a.id, "mover", mv[0].uf).ok){ n++; continue; }
    }
    if (!a.order && setOrder(g, a.id, "defender").ok) n++;
  }
  return { ok: true, n, msg: n ? `${n} ${n === 1 ? "ordem dada" : "ordens dadas"} automaticamente.` : "Todos os exércitos já têm ordem." };
}
function clearOrders(g){ let n = 0; for (const a of armiesOf(g, "player")) if (a.order && setOrder(g, a.id, null).ok) n++; return { ok: true, msg: n ? `${n} ${n === 1 ? "ordem desfeita" : "ordens desfeitas"}.` : "Nenhuma ordem para desfazer." }; }
function setAutoOrders(g, mode){ g.autoOrders = ["off", "defender", "auto"].includes(mode) ? mode : "off"; return { ok: true, msg: g.autoOrders === "off" ? "Ordens automáticas desligadas." : `Todo mês, exércitos sem ordem vão ${g.autoOrders === "auto" ? "atacar onde a chance é boa ou defender" : "defender as fronteiras"}.` }; }
