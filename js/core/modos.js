// js/core/modos.js — Núcleo: aplica a dificuldade (js/data/modos.js) e a partida rápida (campaign.rapida) à campanha.
// Normal + campanha completa usam o cenário original sem cópia nenhuma; os outros modos usam uma "variante" do cenário
// que herda tudo do original (Object.create) e troca só os números ajustados.
function diffOf(g){ return (g && DIFICULDADES[g.diff]) || DIFICULDADES.normal; }
function diffSlack(g){ return (g && DIFICULDADES[g.diff] && DIFICULDADES[g.diff].folga) || 0; }
function modeLabel(g){ const D = diffOf(g); return D.label + (g && g.quick ? " · Partida rápida" : ""); }
const SC_VARIANTS = {};
function scVariant(sc, d, quick){
  if ((!d || d === "normal") && !quick) return sc;
  const key = sc.id + "|" + d + "|" + (quick ? 1 : 0), hit = SC_VARIANTS[key];
  if (hit && hit.base === sc) return hit.v;
  const D = DIFICULDADES[d] || DIFICULDADES.normal, C = sc.campaign, o = Object.create(C);
  if (D.inimigo !== 1){ o.enemyPower = Math.round((C.enemyPower ?? 1) * D.inimigo * 100) / 100; o.enemyBase = Math.max(1, Math.round((C.enemyBase || 2) * D.inimigo)); }
  if (D.dinheiro) o.money = Object.assign({}, C.money, { initial: Math.max(0, C.money.initial + D.dinheiro) });
  if (D.renda) o.phases = C.phases.map(p => Object.assign({}, p, { income: (p.income ?? 4) + D.renda }));
  if (C.south && D.sul !== 1) o.south = Object.assign({}, C.south, { base: Math.max(1, Math.round(C.south.base * D.sul)),
    jolt: Object.fromEntries(Object.entries(C.south.jolt || {}).map(([k, v]) => [k, Math.round(v * D.sul)])) });
  const Q = quick && C.rapida;
  if (Q){
    if (Q.pace) o.pace = Q.pace;
    if (Q.storyDelay) o.storyDelay = Object.assign({}, C.storyDelay, Q.storyDelay);
    if (Q.storyAt) o.storyAt = Object.assign({}, C.storyAt, Q.storyAt);
    if (Q.checks) o.checks = Q.checks;
    if (Q.eventChance) o.eventChance = Q.eventChance;
  }
  const v = Object.create(sc); v.campaign = o;
  SC_VARIANTS[key] = { base: sc, v };
  return v;
}
// Resultado de um final: "vitoria", "parcial" ou "derrota" (campo outcome do nó; sem o campo = parcial)
function endingOutcome(sc, id){ const n = sc && sc.story.nodes[id]; return n && n.ending ? (n.outcome || "parcial") : null; }
// Aviso do modo Fácil: se a escolha idx da história atual encerra a campanha agora, diz com qual resultado
// (aplica os efeitos da escolha numa cópia dos atributos e resolve o rumo como o jogo faria). Sem final → null.
function choicePreview(g, idx){
  const q = g && g.queue[0]; if (!q || q.type !== "story") return null;
  const sc = scOf(g), S = sc.story, c = S.nodes[q.node].choices[idx]; if (!c || !c.next) return null;
  const stats = Object.assign({}, g.stats);
  for (const k in (c.effects || {})) if (k in stats) stats[k] = clamp(stats[k] + c.effects[k], 0, 100);
  const gg = Object.assign({}, g, { stats });
  for (const k in (S.collapse || {})) if (stats[k] <= 0) return { to: S.collapse[k], outcome: endingOutcome(sc, S.collapse[k]) };
  const to = resolveNextG(c.next, gg), out = endingOutcome(sc, to);
  return out ? { to, outcome: out } : null;
}
