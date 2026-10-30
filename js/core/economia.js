// js/core/economia.js — Núcleo: pontos de ação (AP), Recursos, teto e conversão.
/* ---------- Ações por turno e caixa ---------- */
// De onde vêm as ações do turno: base do cenário, Apoio Popular (apScale) e bônus da fase.
function apFor(g){
  const C = scOf(g).campaign, ph = phaseOf(g), S = scOf(g).story, parts = [{ id: "base", label: "Base", v: C.ap }];
  if (C.apScale){ const v = g.stats[C.apScale.stat] ?? 0; let b = 0, th = null; for (const [t, x] of C.apScale.tiers) if (v >= t){ b = x; th = t; }
    parts.push({ id: "apoio", label: `${S.stats[C.apScale.stat].label} ${Math.round(v)}${th ? ` (≥${th})` : ""}`, v: b }); }
  if (ph.apBonus) parts.push({ id: "fase", label: "Fase", v: ph.apBonus });
  return { total: Math.max(1, parts.reduce((s, p) => s + p.v, 0)), parts };
}
// Próximo degrau de ações pelo Apoio Popular (para a interface): { at, ap } ou null
function apNextTier(g){
  const C = scOf(g).campaign; if (!C.apScale) return null;
  const v = g.stats[C.apScale.stat] ?? 0, t = C.apScale.tiers.find(([t]) => v < t);
  return t ? { at: t[0], ap: C.ap + t[1] } : null;
}
function moneyCap(g){ return scOf(g).campaign.money.cap ?? Infinity; }
function applyMoneyCap(g){ const cap = moneyCap(g); if (g.money > cap){ const lost = Math.round(g.money - cap); g.money = cap; return lost; } return 0; }
// Converter Recursos em ações extras (1 vez por turno)
function convertMoney(g){
  const C = scOf(g).campaign, K = C.convert;
  if (!K) return { ok: false, msg: "Indisponível neste cenário" };
  if (g.queue.length || g.ended) return { ok: false, msg: "Resolva os eventos pendentes" };
  if (g.used.convert) return { ok: false, msg: "Já feito neste turno" };
  if (g.money < K.cost) return { ok: false, msg: `Faltam ${C.money.short}` };
  g.money -= K.cost; g.ap += K.ap; g.used.convert = true;
  return { ok: true, msg: `−${K.cost} ${C.money.short}: +${K.ap} ação neste turno.` };
}
function facCost(g, F, kind){
  const C = scOf(g).campaign;
  if (C.facMoney) return { ap: 0, money: C.facMoney[kind] ?? 0 };
  return { ap: 1, money: kind === "agradar" ? (F.favorCost ?? C.favorCost ?? 4) : 0 };
}
