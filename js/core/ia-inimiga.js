// js/core/ia-inimiga.js — Regras: IA do inimigo na guerra de 2022 (fase 16). Plano de vários meses por facção:
// escolhe um ESTADO-ALVO seu (perto de Brasília, valioso, fraco ou que cerca exércitos seus), junta forças numa BASE ao lado dele
// e só ataca quando está concentrado; contra-ataca exércitos seus fracos, isolados (cercados) ou expostos dos dois lados;
// recua exércitos muito feridos e continua defendendo a capital dele (Recife) — isso já vem do tpAI (js/core/tropas.js).
/* Nível pela dificuldade (DIFICULDADES[g.diff].ia): 0 = IA antiga (só o tpAI), 1 = plano + contra-ataque + recuo,
   2 = também procura cercos, ataca mais cedo e é mais seletiva fora do plano.
   Estado salvo: g.war.eplan[fac] = { alvo, base, desde } (refeito a cada IA_REPLANO meses ou quando o alvo/a base mudam de dono).
   O plano fica visível como antes: setas vermelhas dos ataques do próximo mês. */
const IA_REPLANO = 3;
function iaLevel(g){ const d = diffOf(g); return d.ia == null ? 1 : d.ia; }
// Exércitos do jogador que ficariam cercados (sem ligação com Brasília) se o inimigo tomasse "uf"
function iaCutGain(g, uf, fac){
  const old = g.control[uf]; g.control[uf] = fac;
  let n = 0;
  try { const L = tpLinked(g, "player"); for (const a of tpArmies(g, "player")) if (a.uf !== uf && L && !L.has(a.uf)) n++; }
  finally { g.control[uf] = old; }
  return n;
}
// Força do jogador num estado e nos vizinhos dele (o quanto o alvo é difícil de segurar)
function iaPlayerNear(g, uf){ return tpArmies(g, "player").filter(a => a.uf === uf || ADJ[uf].includes(a.uf)).reduce((s, a) => s + a.str, 0); }
function iaChooseTarget(g, fac, lvl){
  const DC = ufDist(tpCap(g)), mine = uf => g.control[uf] === fac;
  const cand = TP_UFS.filter(uf => tpSide(g, uf) === "player" && ADJ[uf].some(mine));
  let best = null;
  for (const uf of cand){
    const here = tpAllAt(g, "player", uf).reduce((s, a) => s + a.str, 0), near = iaPlayerNear(g, uf);
    let v = -0.55 * (DC[uf] ?? 20) + (UF_WEIGHT[uf] || 1) / 5 + (uf === tpCap(g) ? 2.5 : 0) - here / 25 - near / 80;
    if (lvl >= 2) v += 1.3 * iaCutGain(g, uf, fac);
    if (!best || v > best.v) best = { uf, v };
  }
  if (!best) return null;
  // base: estado dele vizinho do alvo, o mais protegido (longe de outros estados seus) e com mais força dele por perto
  const own = ADJ[best.uf].filter(mine);
  const str = u => tpArmies(g, "enemy").filter(a => a.fac === fac && (a.uf === u || ADJ[u].includes(a.uf))).reduce((s, a) => s + a.str, 0);
  const base = own.sort((x, y) => str(y) - str(x) || (x < y ? -1 : 1))[0] || null;
  return { alvo: best.uf, base, desde: g.month };
}
function iaPlan(g, fac, lvl){
  const W = g.war; W.eplan ||= {};
  let P = W.eplan[fac];
  const stale = !P || g.month - P.desde >= IA_REPLANO || tpSide(g, P.alvo) !== "player" || !P.base || g.control[P.base] !== fac;
  if (stale){ P = iaChooseTarget(g, fac, lvl); if (P) W.eplan[fac] = P; else delete W.eplan[fac]; }
  return P || null;
}
// Recuo: exército dele muito ferido e ameaçado (força do jogador ao lado ≥ 2× a dele) vai para um estado de trás com vaga
function iaRetreats(g, list, lvl){
  const fac = list[0] && list[0].fac, L = tpLineDist(g, "enemy", fac), home = tpHome(g, "enemy", fac); let n = 0;
  for (const a of list){
    if (a.order || a.uf === home) continue;
    const weak = a.str < (lvl >= 2 ? 14 : 12) || a.morale < 25; if (!weak) continue;
    const thr = tpArmies(g, "player").filter(p => ADJ[a.uf].includes(p.uf)).reduce((s, p) => s + p.str, 0);
    if (thr < a.str * 2) continue;
    const t = tpTargets(g, a).filter(t => t.type !== "atacar" && (L[t.to] ?? 0) > (L[a.uf] ?? 0)).sort((x, y) => (L[y.to] ?? 0) - (L[x.to] ?? 0) || (x.stack || 0) - (y.stack || 0) || (x.to < y.to ? -1 : 1))[0];
    if (t){ tpGive(g, a, t); n++; }
  }
  return n;
}
// Exércitos do jogador vulneráveis: cercados, fracos ou com 2+ estados inimigos vizinhos (flanco)
function iaWeakSpots(g, fac){
  const L = tpLinked(g, "player"), out = {};
  for (const a of tpArmies(g, "player")){
    const foes = ADJ[a.uf].filter(u => g.control[u] === fac).length; if (!foes) continue;
    const sum = tpAllAt(g, "player", a.uf).reduce((s, x) => s + x.str, 0);
    let b = 0; if (L && !L.has(a.uf)) b += 0.35; if (sum < 15) b += 0.2; if (foes >= 2) b += 0.1 * Math.min(2, foes - 1);
    if (b) out[a.uf] = Math.max(out[a.uf] || 0, b);
  }
  return out;
}
// Plano do mês de uma facção (chamado por tpEnemyPlan)
function iaEnemyMonth(g, fac, list, D){
  const lvl = iaLevel(g);
  if (lvl <= 0 || !list.length) return tpAI(g, list, { thr: D.ataca, attack: true });
  iaRetreats(g, list, lvl);
  const P = iaPlan(g, fac, lvl), weak = iaWeakSpots(g, fac);
  const opt = { thr: D.ataca, attack: true, base: P ? P.base : null,
    thrFor: (t, thr) => P && t === P.alvo ? thr - 0.06 * lvl : weak[t] ? thr - 0.08 : lvl >= 2 ? thr + 0.04 : thr,
    bonus: t => (P && t === P.alvo ? 0.35 : 0) + (weak[t] || 0) };
  return tpAI(g, list, opt);
}
