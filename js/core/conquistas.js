// js/core/conquistas.js — Núcleo: nota final da campanha (S/A/B/C), conquistas ganhas e o resumo em texto do final.
/* Tudo aqui é função pura sobre o estado g; quem grava as conquistas (localStorage e nuvem) é js/ui/conquistas.js. */
function endingGrade(g){
  const sc = scOf(g), outcome = endingOutcome(sc, g.ended && g.ended.node) || "parcial";
  const keys = Object.keys(g.stats), avg = keys.reduce((s, k) => s + g.stats[k], 0) / Math.max(1, keys.length);
  const war = (g.stat.battles || 0) > 0, terr = war ? Math.round(10 * sideCounts(g).player / 27) : NOTA_PAZ; // sem guerra: pontos fixos
  const done = g.focus ? g.focus.done.length : 0, foc = g.focus ? Math.min(5, Math.round(done * 5 / 8)) : 3;
  const sul = (g.flags || []).some(f => f === "sul_aliado" || f === "sul_armisticio") ? NOTA_SUL : 0;
  const parts = [["Tipo de final", NOTA_BASE[outcome] || 30], ["Atributos no fim", Math.round(avg * 0.3)], [war ? "Território" : "Sem guerra", terr], ["Decisões nacionais", foc]];
  if (sul) parts.push(["Paz com o Sul", sul]);
  if (diffOf(g).nota) parts.push(["Dificuldade", diffOf(g).nota * NOTA_DIF]);
  const score = clamp(parts.reduce((s, p) => s + p[1], 0), 0, 100);
  let letter = (NOTA_FAIXAS.find(f => score >= f[1]) || NOTA_FAIXAS[NOTA_FAIXAS.length - 1])[0];
  const cap = NOTA_TETO[outcome]; if (cap && GRADE_RANK.indexOf(letter) < GRADE_RANK.indexOf(cap)) letter = cap; // derrota no máximo B, intermediário no máximo A
  if (outcome === "vitoria" && letter === "C") letter = "B";                                                       // vitória no mínimo B
  return { letter, score, outcome, avg: Math.round(avg), parts };
}
// Conquistas que esta campanha cumpre (x.achados/x.total = finais descobertos, vêm da tela)
function earnedAchievements(g, x){
  const gr = endingGrade(g), ctx = Object.assign({ outcome: gr.outcome, nota: gr.letter, achados: 0, total: 0 }, x || {});
  return CONQUISTAS.filter(c => { try { return !!c.teste(g, ctx); } catch(e){ return false; } }).map(c => c.id);
}
// Momentos marcantes: as escolhas da história (sem os eventos sorteados), no máximo n
function endingMoments(g, n){ return (g.history || []).filter(h => !h.ev).slice(0, n || 6); }
// União de dois registros (local e nuvem): fica a data mais antiga de cada conquista e a melhor nota de cada cenário
function achMerge(a, b){
  const ok = d => d && typeof d === "object" && d.got && typeof d.got === "object";
  const r = { v: 1, got: {}, best: {} };
  for (const d of [a, b]) if (ok(d)){
    for (const id in d.got) if (CONQUISTAS.some(c => c.id === id) && (!r.got[id] || (d.got[id].at || 0) < (r.got[id].at || 0))) r.got[id] = d.got[id];
    for (const sc in d.best || {}) if (GRADE_RANK.includes(d.best[sc])) r.best[sc] = betterGrade(r.best[sc], d.best[sc]);
  }
  return r;
}
function betterGrade(a, b){ if (!a) return b; if (!b) return a; return GRADE_RANK.indexOf(a) <= GRADE_RANK.indexOf(b) ? a : b; }
