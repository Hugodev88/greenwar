// js/core/conselheiro.js — Núcleo: a conselheira (Marta Siqueira, chefe de gabinete) — escolhe 1 ou 2 dicas por mês e executa o "Fazer isso".
/* Cada dica: { id, pri, head, text, sub?, act }. head/text/sub são frases fixas (traduzíveis) ou nomes do jogo.
   act.k: "tab" (só a tela muda), "action", "fac", "focus", "auto", "recruit", "posture"/"ofensiva"/"split" (frentes), "choose" (escolha da história) ou "end" (encerrar o mês, feito pela tela).
   No caminho do golpe (coupState em js/core/golpe.js) entram as dicas do plano, com golpe: true. */
const ADVISOR = { name: "Marta Siqueira", role: "Chefe de gabinete", portrait: "conselheira", max: 2 };
// Valor de um efeito para o governo: sobe os atributos mais baixos (mesma ideia da IA "gulosa" do sim)
function advisorFxValue(g, fx){
  if (!fx) return 0;
  let v = 0;
  for (const k in (fx.s || {})) v += fx.s[k] * (g.stats[k] < 30 ? 2.5 : g.stats[k] > 70 ? 0.4 : 1);
  for (const id in (fx.fac || {})) v += fx.fac[id] * (g.fac[id] && g.fac[id].loyalty < 30 ? 0.5 : 0.12);
  v += (fx.money || 0) * 0.25 - (fx.unrestAll || 0) * 0.2;
  return v;
}
function advisorBestAction(g, filter){
  return visibleActions(g).filter(a => actionState(g, a).ok && (!filter || filter(a)))
    .map(a => ({ a, v: advisorFxValue(g, a.fx) - (a.cost || 0) * (g.money < 15 ? 0.5 : 0.12) - (a.risk ? a.risk.p * 6 : 0) }))
    .sort((x, y) => y.v - x.v)[0] || null;
}
function advisorBestFocus(g){
  const T = focusTree(g); if (!T || !g.focus || g.focus.active) return null;
  const regime = phaseOf(g).id === "regime", plano = coupState(g) === "plano";
  return T.nodes.filter(F => !focusCheck(g, F.id) && !(plano && (F.excl || []).includes("c_ruptura")))
    .map(F => ({ F, v: advisorFxValue(g, F.fx) - (F.cost || 0) * 0.3 - F.months * 0.4 + (F.branch === "ruptura" && !regime && !plano ? -40 : 0) }))
    .sort((a, b) => b.v - a.v)[0] || null;
}
function advisorTips(g, ctx){
  ctx = ctx || {};
  if (!g || g.ended) return [];
  const C = scOf(g).campaign, ph = phaseOf(g), tips = [];
  const cs = coupState(g);
  if (g.queue.length){
    const st = cs && coupStoryTip(g, cs);
    if (st && ctx.tab === "historia") return [st];
    if (ctx.tab !== "historia") tips.push({ id: "fila", pri: 100, head: "Decisão esperando", text: "Tem um acontecimento esperando sua resposta na aba História. O mês só avança depois que você escolher.", act: { k: "tab", tab: "historia" }, btn: "Ver agora" });
    return tips;
  }
  // facção perto da crise
  for (const F of C.factions){
    const f = g.fac[F.id], fc = facCost(g, F, "agradar");
    if (f.loyalty < 25 && !g.used["fac_agradar_" + F.id] && g.money >= fc.money && g.ap >= fc.ap)
      tips.push({ id: "fac_" + F.id, pri: 90 - f.loyalty, head: F.name, text: fc.money ? `Este grupo está quase em crise com você (lealdade ${Math.round(f.loyalty)}). Agradar custa ${fc.money} Recursos e evita problemas maiores.` : `Este grupo está quase em crise com você (lealdade ${Math.round(f.loyalty)}). Vale agradar antes que ele cause problemas.`, act: { k: "fac", id: F.id } });
  }
  // atributo perigosamente baixo
  const low = Object.keys(g.stats).filter(k => g.stats[k] < 30).sort((a, b) => g.stats[a] - g.stats[b])[0];
  if (low){
    const best = advisorBestAction(g, a => a.fx && a.fx.s && a.fx.s[low] > 0);
    if (best) tips.push({ id: "low_" + low, pri: 80, head: scOf(g).story.stats[low].label, text: `Está baixo (${Math.round(g.stats[low])}). Se cair demais, a campanha pode acabar. Esta ação ajuda:`, sub: best.a.name, act: { k: "action", id: best.a.id } });
  }
  // Tensão no Sul
  if (southOn(g) && g.south.state === "calmo" && g.south.t >= 55){
    const best = advisorBestAction(g, a => a.cat === "sul");
    if (best) tips.push({ id: "sul", pri: 78 + (g.south.t >= 75 ? 10 : 0), head: "Tensão no Sul", text: `A tensão está em ${Math.round(g.south.t)} de 100. Em 100 o Sul se rebela. Esta ação ajuda a acalmar:`, sub: best.a.name, act: { k: "action", id: best.a.id } });
  }
  // guerra por frentes (2022): postura sugerida, ofensiva especial, divisão das tropas e recrutamento
  if (ph.war && !ph.noArmies && frontMode(g)) advisorFrontTips(g, tips);
  // guerra: exércitos sem ordem
  else if (ph.war && !ph.noArmies){
    const mine = armiesOf(g, "player"), idle = mine.filter(a => !a.order).length;
    if (idle && g.autoOrders !== "auto" && !ctx.manual) tips.push({ id: "auto", pri: 75, head: "Exércitos parados", text: idle === 1 ? "Um exército está sem ordem neste mês. Deixe as tropas agirem sozinhas: elas atacam onde a chance é boa e defendem o resto." : `${idle} exércitos estão sem ordem neste mês. Deixe as tropas agirem sozinhas: elas atacam onde a chance é boa e defendem o resto.`, act: { k: "auto" } });
    const me = sideStr(g, "player"), foe = sideStr(g, "enemy"), rs = recruitState(g);
    if (rs.ok && (foe > me * 1.1 || g.money >= moneyCap(g) - 15) && g.money >= rs.cost + 5)
      tips.push({ id: "recruit", pri: foe > me * 1.3 ? 72 : 50, head: "Mais tropas", text: `Seu lado tem ${Math.round(me)} de força e o inimigo ${Math.round(foe)}. Um exército novo custa ${rs.cost} Recursos.`, act: { k: "recruit" } });
  }
  // Recursos quase no teto
  const cap = moneyCap(g);
  if (Number.isFinite(cap) && g.money >= cap - 10){
    const bf = advisorBestFocus(g), ba = advisorBestAction(g, a => (a.cost || 0) > 0);
    const act = bf && (bf.F.cost || 0) > 0 ? { k: "focus", id: bf.F.id, sub: bf.F.name } : ba ? { k: "action", id: ba.a.id, sub: ba.a.name } : null;
    if (act) tips.push({ id: "cap", pri: 70, head: "Recursos quase no limite", text: `Você tem ${Math.round(g.money)} de ${cap}. O que passar do limite se perde no fim do mês, então vale gastar agora:`, sub: act.sub, act });
  }
  // caminho do golpe: dicas do plano (no "plano" substituem a sugestão genérica de decisão nacional)
  if (cs) tips.push(...coupTips(g, cs));
  // oportunidade aberta (some se não for aproveitada)
  const T = focusTree(g);
  if (T && g.focus && !g.focus.active){
    const op = T.nodes.filter(F => F.oport && g.focus.opps && g.focus.opps[F.id] !== undefined && !focusCheck(g, F.id) && (cs !== "plano" || F.id === "o_quarteis"))
      .map(F => ({ F, v: advisorFxValue(g, F.fx) - (F.cost || 0) * 0.3 })).sort((a, b) => b.v - a.v)[0];
    if (op && op.v > 0){ const left = focusStatus(g, op.F).left || 1;
      tips.push({ id: "opp", pri: 64, head: "Oportunidade", text: left === 1 ? "Apareceu uma oportunidade na aba Decisões e ela some no fim do mês. Vale aproveitar:" : `Apareceu uma oportunidade na aba Decisões e ela some em ${left} meses. Vale aproveitar:`, sub: op.F.name, act: { k: "focus", id: op.F.id } }); }
  }
  // nenhuma decisão nacional em andamento
  const bf = advisorBestFocus(g);
  if (bf && cs !== "plano") tips.push({ id: "focus", pri: 62, head: "Decisões nacionais", text: bf.F.months === 1 ? "Nenhuma decisão nacional está em andamento. Sugiro esta, que leva 1 mês:" : `Nenhuma decisão nacional está em andamento. Sugiro esta, que leva ${bf.F.months} meses:`, sub: bf.F.name, act: { k: "focus", id: bf.F.id } });
  // ações sobrando
  if (g.ap > 0){
    const best = advisorBestAction(g);
    if (best && best.v > 0) tips.push({ id: "ap", pri: 40, head: "Ações sobrando", text: g.ap === 1 ? "Você ainda tem 1 ação neste mês. Uma boa opção:" : `Você ainda tem ${g.ap} ações neste mês. Uma boa opção:`, sub: best.a.name, act: { k: "action", id: best.a.id } });
  }
  if (!tips.length) tips.push({ id: "fim", pri: 0, head: "Tudo em ordem", text: "Já fizemos o que dava neste mês. Quando estiver pronto, encerre o mês.", act: { k: "end" }, btn: "Encerrar mês" });
  // ordena e tira dicas que fazem a mesma coisa
  const seen = new Set();
  return tips.sort((a, b) => b.pri - a.pri).filter(t => { const k = t.act.k + ":" + (t.act.id || ""); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, ADVISOR.max);
}
// Executa o "Fazer isso" de uma dica (tudo menos "tab" e "end", que são da tela)
function advisorDo(g, tip){
  const res = advisorRun(g, tip);
  if (res && res.ok !== false && tip.act.k !== "tab" && tip.act.k !== "end") g.stat.adv = (g.stat.adv || 0) + 1; // conta para a conquista "Boa equipe"
  return res;
}
function advisorRun(g, tip){
  const a = tip && tip.act; if (!a) return { ok: false, msg: "Dica inválida" };
  if (a.k === "action") return doAction(g, a.id);
  if (a.k === "fac") return factionAction(g, a.id, "agradar");
  if (a.k === "focus") return startFocus(g, a.id);
  if (a.k === "recruit") return recruitArmy(g);
  if (a.k === "choose") return choose(g, a.i) ? { ok: true } : { ok: false, msg: "Escolha indisponível" };
  if (a.k === "posture") return setFrontPosture(g, a.id, a.p);
  if (a.k === "ofensiva") return launchOffensive(g, a.id);
  if (a.k === "split") return frontAutoSplit(g);
  if (a.k === "auto" && frontMode(g)){ setAutoOrders(g, "auto"); frontAuto(g, "auto"); return { ok: true, msg: "Comando automático ligado: os generais escolhem a postura de cada frente todo mês." }; }
  if (a.k === "auto"){ setAutoOrders(g, "auto"); autoOrders(g, "auto"); return { ok: true, msg: "Ordens automáticas ligadas: as tropas agem sozinhas todo mês." }; }
  return { ok: true };
}
// Dicas de guerra no modo frentes: uma por frente quando a postura atual não é a sugerida
function advisorFrontTips(g, tips){
  const W = g.war, K = frontCfg(g); if (!W.fronts.length) return;
  for (const f of W.fronts){
    if (f.special || g.autoOrders === "auto") continue;
    const adv = frontAdvice(g, f), nm = frontName(g, f); if (f.posture === adv.posture) continue;
    const tA = frontTarget(g, f, 1), tD = frontTarget(g, f, -1);
    const text = adv.why === "ofensivaInimiga" ? `O inimigo prepara uma ofensiva especial na ${nm}. Segure a linha: a defesa ganha +30%.`
      : adv.why === "moral" ? `A tropa da ${nm} está cansada (moral ${Math.round(f.morale)}, suprimento ${Math.round(f.supply)}). Recue um mês para reorganizar.`
      : adv.posture === "avancar" ? `Você está mais forte na ${nm} (${adv.ratio.toFixed(1)}×). Avance para tomar ${tA || "terreno"}.`
      : f.eposture === "avancar" ? `O inimigo vai atacar na ${nm}${tD ? ` (rumo a ${tD})` : ""}. Segure a linha: a defesa ganha +30%.`
      : `Avançar agora na ${nm} travaria (${(adv.ratio || 0).toFixed(1)}×). Segure a linha e junte tropas.`;
    tips.push({ id: "post_" + f.id, pri: adv.why === "ofensivaInimiga" || (adv.posture === "segurar" && f.eposture === "avancar") ? 82 : adv.posture === "recuar" ? 76 : 68,
      head: `${nm}: ${frontFala(g, "postura", adv.posture)}`, text, act: { k: "posture", id: f.id, p: adv.posture } });
  }
  for (const f of W.fronts){
    const adv = frontAdvice(g, f), off = offensiveState(g, f.id);
    if (off.ok && adv.posture === "avancar" && adv.ratio >= 1.3 && g.money >= off.cost + 10){
      tips.push({ id: "ofensiva", pri: 62, head: "Ofensiva especial", text: `A ${frontName(g, f)} está forte (${adv.ratio.toFixed(1)}×). Uma ofensiva especial (${off.cost} Recursos) dá +50% de força e avança mais neste mês.`, act: { k: "ofensiva", id: f.id } }); break; }
  }
  if (W.fronts.length > 1){
    const e = W.fronts.map(f => enemyForce(g, f, "segurar").total * (f.eposture === "avancar" ? 1.15 : 1)), want = Math.round(e[0] / Math.max(1, e[0] + e[1]) * 20) * 5;
    if (Math.abs(frontSplitPct(g) - Math.max(10, Math.min(90, want))) >= 15) tips.push({ id: "split", pri: 66, head: "Divida melhor as tropas", text: `${frontName(g, W.fronts[0])}: ${frontSplitPct(g)}% das tropas, mas lá está ${want}% da força inimiga. Mande mais tropas para a frente mais difícil.`, act: { k: "split" } });
  }
  const me = frontPool(g), foe = W.fronts.reduce((s, f) => s + f.enemy, 0), rs = recruitState(g);
  if (rs.ok && (foe > me * 0.9 || g.money >= moneyCap(g) - 15) && g.money >= rs.cost + 5)
    tips.push({ id: "recruit", pri: foe > me * 1.2 ? 74 : 52, head: "Mais tropas", text: `Você tem ${Math.round(me)} de tropas e o inimigo ${Math.round(foe)}. Recrutar +${K.recruta.forca} custa ${rs.cost} Recursos.`, act: { k: "recruit" } });
}
