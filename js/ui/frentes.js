// js/ui/frentes.js — Interface: guerra por frentes (2022): painel das frentes, posturas, divisão das tropas, generais, ofensiva especial, relatório do mês e animação da resolução.
/* Só aparece quando frontMode(G) (js/core/frentes.js). No 1964 a aba Mapa continua com exércitos e ordens (js/ui/exercitos.js). */
const POSTURE_ICON = { avancar: "⚔", segurar: "🛡", recuar: "↩" };
function fCfg(){ return frontCfg(G); }
function fFala(grp, k){ return frontFala(G, grp, k); }
function ratioWord(r){ return r >= 1.5 ? "muito favorável" : r >= 1.15 ? "favorável" : r >= 0.87 ? "equilibrada" : r >= 0.6 ? "arriscada" : "muito arriscada"; }
// Barra da linha: −100 (perde uma região) … +100 (toma uma região); mostra a próxima região de cada lado
function frontLineHTML(f, prog0){
  const p = Math.max(-100, Math.min(100, Math.round(f.progress))), x = (p + 100) / 2, rA = frontTargetReg(G, f, 1), rD = frontTargetReg(G, f, -1);
  const tA = rA && regLabel(rA), tD = rD && regLabel(rD);
  const from = prog0 === undefined ? null : (Math.max(-100, Math.min(100, prog0)) + 100) / 2;
  const sP = G.reg ? regSiege(G, f, 1) : 0, sE = G.reg ? regSiege(G, f, -1) : 0;
  const siege = (G.reg && regGoalOpen(G, f, 1) && sP > 0 ? `<small class="fsiege good" title="${esc(fFala("regioes", "cercoAjuda"))}">🏰 <span>${esc(gfmt(fFala("regioes", "cercoReduto"), Math.round(sP * 100)))}</span></small>` : "")
    + (G.reg && regGoalOpen(G, f, -1) && sE > 0 ? `<small class="fsiege bad" title="${esc(fFala("regioes", "cercoAjuda"))}">⚠ <span>${esc(gfmt(fFala("regioes", "cercoCapital"), Math.round(sE * 100)))}</span></small>` : "");
  return `<div class="fline" title="${esc(fFala("regioes", "barraAjuda"))}">${siege}
    <div class="flbar"><i class="mid"></i>${from !== null ? `<i class="ghost" style="left:${Math.min(from, x)}%;width:${Math.abs(x - from)}%"></i>` : ""}<i class="pos ${p >= 0 ? "up" : "down"}" style="left:${x}%"></i></div>
    <div class="flends"><span class="bad">◀ <span>perde</span> <b>${esc(tD || "—")}</b></span><span class="flv"><span>linha</span> <b>${p > 0 ? "+" : ""}${p}</b></span><span class="good"><span>toma</span> <b>${esc(tA || "—")}</b> ▶</span></div></div>`;
}
function frontBarsHTML(f){
  const P = Math.round(frontForce(G, f, f.special ? "avancar" : f.posture, f.special).total), E = Math.round(enemyForce(G, f, f.eposture || "segurar").total), tot = Math.max(1, P + E);
  return `<div class="pw"><b style="color:#9cc3ea"><span>Você</span> ${P}</b><div class="bar2" title="Força = tropas × moral × suprimento × general × postura × apoio"><i class="p" style="width:${P / tot * 100}%"></i><i class="e" style="width:${E / tot * 100}%"></i></div><b style="color:#f0a493">${E} <span>Inimigo</span></b></div>`;
}
function frontStatHTML(label, v, max, color){
  return `<div class="fstat"><span>${label}</span><div class="bar"><i style="width:${Math.max(0, Math.min(100, v / max * 100))}%;background:${color}"></i></div><b>${Math.round(v)}</b></div>`;
}
function frontGenHTML(f){
  const K = fCfg(), gen = frontGen(G, f), P = gen && portraitOf("pessoas", gen.retrato);
  const opts = K.generais.map(x => { const on = G.war.gens[x.id], where = on && on !== f.id ? ` (${frontName(G, on)})` : "";
    return `<option value="${x.id}" ${gen && gen.id === x.id ? "selected" : ""}>${esc(frontGenName(G, x))} — ${esc(fFala("traco", x.traco))}${esc(where)}</option>`; }).join("");
  return `<div class="fgen">${P ? portraitImg(P, 44) : ""}<div><b>${gen ? esc(frontGenName(G, gen)) : "Sem general"}</b>${gen ? `<small><span>${esc(fFala("traco", gen.traco))}</span>: <span>${esc(fFala("tracoDesc", gen.traco))}</span></small>` : ""}
    <label class="fsel"><span>Trocar general</span> <select data-fgen="${f.id}" aria-label="Trocar general">${gen ? "" : `<option value="">—</option>`}${opts}</select></label></div></div>`;
}
function frontEnemyHTML(f){
  const K = fCfg(), D = K.frentes[f.id], P = portraitOf("pessoas", D.retrato), e = f.eposture || "segurar";
  return `<div class="fenemy">${P ? portraitImg(P, 36) : ""}<div><small><span>${esc(fFala("inimigo", f.id))}</span>${P ? ` · <span>${esc(P.nome)}</span> (<span>${esc(fFala("traco", D.traco))}</span>)` : ""}</small>
    <b class="fint ${e}"><span>Próximo mês o inimigo vai:</span> ${POSTURE_ICON[e]} <span>${esc(fFala("posturaCurta", e))}</span></b>${f.eSpecial ? `<em class="fwarn">💥 <span>Ofensiva especial inimiga! Segurar a linha reduz o estrago.</span></em>` : ""}</div></div>`;
}
function frontCardHTML(f){
  const adv = frontAdvice(G, f), cur = f.special ? "avancar" : f.posture, off = offensiveState(G, f.id), K = fCfg(), red = K.frentes[f.id].reduto;
  const posts = FRONT_POSTURES.map(p => `<button class="fpost ${p}${cur === p ? " on" : ""}" data-fpost="${p}" data-front="${f.id}" aria-pressed="${cur === p}" ${f.special ? "disabled" : ""}>
      <b>${POSTURE_ICON[p]} <span>${esc(fFala("postura", p))}</span></b>${adv.posture === p ? `<em class="sug">sugerido</em>` : ""}<small>${esc(fFala("posturaDesc", p))}</small></button>`).join("");
  return `<div class="fcard2" data-fcard="${f.id}">
    <div class="fhead"><h4>${esc(frontName(G, f))}</h4><small><span>Reduto inimigo:</span> <b>${esc(G.reg && REG_DATA.cap[red] ? regLabel(REG_DATA.cap[red]) : red)}</b></small></div>
    ${G.reg ? regTrendHTML(G, f) : ""}
    ${frontLineHTML(f)}
    ${frontBarsHTML(f)}
    <div class="fstats">${frontStatHTML("Tropas", f.troops, Math.max(100, f.troops, f.enemy), "#5b8fc7")}${frontStatHTML("Moral", f.morale, 100, "#8fc488")}${frontStatHTML("Suprimento", f.supply, 100, "#c9a45c")}</div>
    ${frontEnemyHTML(f)}
    <div class="ordhead"><b>Postura desta frente</b><span>vale para o próximo mês</span></div>
    <div class="fposts" role="group" aria-label="Postura">${posts}</div>
    ${frontGenHTML(f)}
    <div class="foff">${f.special ? `<p class="fwarn">💥 <span>Ofensiva especial marcada para este mês.</span> <button class="linkbtn" data-foff-cancel="${f.id}">Cancelar (devolve os recursos)</button></p>`
      : `<button class="secondary small" data-foff="${f.id}" ${off.ok ? "" : "disabled"}>💥 <span>Ofensiva especial</span> <span>(−${K.ofensiva.custo})</span></button><small class="muted">${off.ok ? "+50% de força e avanço maior; se falhar, perde moral e tropas." : esc(off.msg)}</small>`}</div>
    ${f.last ? `<button class="linkbtn" data-frep="${f.id}">📜 Relatório do último mês: por que a linha andou</button>` : ""}
  </div>`;
}
function frontSplitHTML(){
  const W = G.war; if (W.fronts.length < 2) return "";
  const pct = frontSplitPct(G), a = W.fronts[0], b = W.fronts[1];
  return `<div class="fsplit"><div class="ordhead"><b>Divisão das tropas</b><span>arraste para mandar mais tropas a uma frente</span></div>
    <div class="fsl"><span><span>${esc(frontName(G, a))}</span> <b>${pct}%</b></span><input type="range" id="fSplit" min="10" max="90" step="5" value="${pct}" aria-label="Divisão das tropas entre as frentes"><span><b>${100 - pct}%</b> <span>${esc(frontName(G, b))}</span></span></div>
    <button class="secondary small" data-fsplit-auto>⚖ Dividir conforme a força inimiga</button></div>`;
}
function frontRecruitHTML(){
  const st = recruitState(G), K = fCfg().recruta;
  return `<div class="recruit"><div class="ordhead"><b>Recrutar tropas</b><span>entram nas frentes já neste mês</span></div>
    <button class="primary sm" id="btnRecruit" ${st.ok ? "" : "disabled"}>＋ <span>Recrutar</span> <span>+${K.forca}</span> <span>(${K.custo} ${esc(SCEN.campaign.money.short)})</span></button>${st.ok ? "" : `<small class="muted">${esc(st.msg)}</small>`}</div>`;
}
function frontAutoHTML(){
  const m = G.autoOrders || "off";
  return `<div class="fauto"><label><span>Comando automático:</span> <select id="autoSel"><option value="off" ${m === "off" ? "selected" : ""}>Desligado (você escolhe)</option><option value="auto" ${m === "auto" ? "selected" : ""}>Ligado: posturas e divisão sugeridas</option><option value="defender" ${m === "defender" ? "selected" : ""}>Só defender (nunca avança)</option></select></label></div>`;
}
function frontSituationHTML(){
  const sides = sideCounts(G), war = phaseOf(G).war && G.reg;
  return `<h3>Situação</h3><div class="ufinfo"><div><span>Seus estados</span><b>${sides.player}</b></div><div><span>Inimigos</span><b>${sides.enemy}</b></div>${war ? `<div><span>${esc(fFala("regioes", "suas"))}</span><b>${regSideCount(G, "player")} / ${REG_IDS.length}</b></div><div><span>${esc(fFala("regioes", "inimigas"))}</span><b>${regSideCount(G, "enemy")}</b></div>` : ""}<div><span>Tropas no total</span><b>${Math.round(frontPool(G))}</b></div></div>`;
}
// Resumo do modo simples (Fácil): o comando automático decide; você só recruta
function simpleFrontsHTML(){
  const W = G.war, auto = (G.autoOrders || "off") !== "off";
  return `<h3>Frentes de batalha</h3><div class="simplebox">
    <p>${auto ? `🤖 <b>Seus generais comandam sozinhos.</b> <span>Todo mês eles escolhem avançar, segurar ou recuar em cada frente.</span>` : `⏸ <b>O comando automático está desligado.</b> <span>As frentes ficam na postura que você escolheu.</span>`}</p>
    ${W.fronts.length ? `<ul class="simplearmies">${W.fronts.map(f => { const T = G.reg && regTally(G, f); return `<li><b>${esc(frontName(G, f))}</b><span>${POSTURE_ICON[f.posture]} <span>${esc(fFala("posturaCurta", f.posture))}</span>${T ? ` · <span>${esc(gfmt(fFala("regioes", "placar"), T.p, T.e))}</span> ${regDeltaHTML(T)}` : ""} · <span>tropas</span> ${Math.round(f.troops)}</span></li>`; }).join("")}</ul>` : `<p class="muted">Nenhuma frente aberta.</p>`}
    <div class="row2">${auto ? "" : `<button class="primary sm" data-auto-on>🤖 Ligar comando automático</button>`}<button class="secondary sm" data-manual="1">Comandar as frentes</button></div></div>`;
}
function frontsPanel(){
  const ph = phaseOf(G), W = G.war;
  if (ph.noArmies) return frontSituationHTML() + `<p class="muted">Nesta fase você não comanda tropas: o mapa mostra a disputa política. Use propaganda, investimentos e negociação.</p>`;
  if (!ph.war || !W.fronts.length) return `<h3>Tropas</h3><div class="simplebox"><p><span>Tempo de paz: suas tropas ficam na reserva, em Brasília.</span> <b>${Math.round(frontPool(G))}</b></p><p class="muted">Se a guerra começar, abre-se uma linha de frente: você não move exércitos, só escolhe a postura (avançar, segurar ou recuar) e a linha anda sozinha.</p></div>${frontRecruitHTML()}${frontSituationHTML()}`;
  let html = G.simple && !UI.manual ? simpleFrontsHTML() + frontRecruitHTML()
    : `${G.simple ? `<button class="linkbtn" data-manual="0">← Voltar ao resumo simples</button>` : ""}<h3>Frentes de batalha</h3>
      <p class="muted fhow"><span>Você não move exércitos: escolha a postura de cada frente e encerre o mês.</span> <span>${esc(fFala("regioes", "barraAjuda"))}</span> <span>${esc(fFala("regioes", "maioria"))}</span></p>
      ${frontWeary(G) > 0 ? `<p class="fwarn">😩 <span>Cansaço da guerra:</span> ${G.war.months} <span>meses de combate — Apoio Popular cai aos poucos e as frentes se movem</span> +${Math.round(frontWeary(G) * 100)}%<span>. Tréguas pausam o desgaste.</span></p>` : ""}
      ${G.ceasefire > 0 ? `<p class="fwarn">🕊 <span>Trégua em vigor: sem combates por</span> ${G.ceasefire} <span>mês(es).</span></p>` : ""}
      ${W.fronts.map(frontCardHTML).join("")}${frontSplitHTML()}${frontRecruitHTML()}${frontAutoHTML()}`;
  const last = (W.log || []).filter(r => G.mil && r.month === G.mil.month);
  if (last.length) html += `<div class="ordhead"><b>Último mês nas frentes</b><span>toque para ver o relatório</span></div>${frontRowsHTML(last)}`;
  return html + frontSituationHTML();
}
// Painel de um estado no modo frentes
function frontUfPanel(uf){
  const C = SCEN.campaign, ph = phaseOf(G), u = G.uf[uf], fac = STORY.factions[G.control[uf]], side = sideOf(G, G.control[uf]);
  const sideLbl = { player: "Seu lado", enemy: "Inimigo", neutral: "Outros" }[side] || "", acts = mapActions(G, uf), T = TERRAIN_TYPES[TERRAIN[uf]];
  const fr = ph.war ? G.war.fronts.find(f => frontTarget(G, f, 1) === uf || frontTarget(G, f, -1) === uf || frontBorder(G, f, "player").includes(uf) || frontBorder(G, f, "enemy").includes(uf)) : null;
  const rA = fr && frontTargetReg(G, fr, 1), rD = fr && frontTargetReg(G, fr, -1);
  const regs = G.reg && ph.war ? REG_IDS.filter(id => REG_UF[id] === uf) : [];
  return `<h3>${uf} · ${esc(MAP_DATA.states[uf].name)}</h3>
    <div class="ufinfo"><div><span>Controle</span><b><i class="sw" style="background:${fac ? fac.color : "#555"}"></i>${esc(fac ? fac.label : G.control[uf])}</b><em class="side ${side}">${sideLbl}</em></div>
    <div><span>Agitação</span><div class="bar"><i style="width:${u.unrest}%;background:${unrestColor(u.unrest)}"></i></div><b>${Math.round(u.unrest)}</b></div>
    <div><span>Terreno</span><b>${esc(T ? T.label : "—")}${T && T.def ? ` · defesa +${Math.round(T.def * 100)}%` : ""}</b></div>
    <div><span>Peso econômico</span><b>${UF_WEIGHT[uf]}</b></div><div><span>Vizinhos</span><b>${ADJ[uf].join(", ")}</b></div>
    ${STORY.stateNotes && STORY.stateNotes[uf] ? `<small class="muted">${esc(STORY.stateNotesLabel || "")}: ${esc(STORY.stateNotes[uf])}</small>` : ""}</div>
    ${regs.length ? `<div class="ufregs"><small class="muted">${esc(fFala("regioes", "maioria"))}</small><ul>${regs.map(id => { const f2 = STORY.factions[G.reg[id]]; return `<li><i class="sw" style="background:${f2 ? f2.color : "#555"}"></i><span>${esc(regName(id))}</span>${id === REG_DATA.cap[uf] ? " ★" : ""}</li>`; }).join("")}</ul></div>` : ""}
    ${fr ? `<div class="ordhead"><b>${esc(frontName(G, fr))}</b><span>${rA && REG_UF[rA] === uf ? esc(gfmt(fFala("regioes", "proxTomar"), regName(rA))) : rD && REG_UF[rD] === uf ? esc(gfmt(fFala("regioes", "proxPerder"), regName(rD))) : "estado na linha de frente"}</span></div>${frontLineHTML(fr)}<button class="secondary small" data-desel>⚔ Ver a frente</button>` : ""}
    ${southOn(G) && G.south.state !== "aliado" && G.south.state !== "esmagada" && southCfg(G).ufs.includes(uf) ? `<p class="why">🌾 Estado da Liga do Sul: <b>investir</b> aqui baixa a Tensão no Sul em 4, e <b>negociar</b> com sucesso, em 6. <button class="linkbtn" data-south>Tensão: ${G.south.t}/100</button></p>` : ""}
    <div class="mapacts">${acts.length ? acts.map(a => `<button class="act" data-k="${a.kind}" ${a.ok ? "" : "disabled"}><span>${esc(a.label)}</span><em>${a.ap ? a.ap + " AP" : "grátis"}${a.cost ? ` · ${a.cost} ${esc(C.money.short)}` : ""}</em><small>${esc(a.ok ? a.desc + (a.kind === "negociar" ? ` Chance: ${negotiateChance(G, uf)}%.` : "") : a.why)}</small></button>`).join("") : `<p class="muted">Nenhuma ação política disponível aqui nesta fase.</p>`}</div>
    <button class="secondary" data-desel>Voltar às frentes</button>`;
}
function frontHintHTML(){
  const ph = phaseOf(G); if (ph.noArmies || !ph.war || !G.war.fronts.length) return "";
  return `<div class="maphint">${G.simple && !UI.manual ? "Modo simples: seus generais comandam as frentes sozinhos." : "Escolha a postura de cada frente no painel ao lado e encerre o mês."} <span>Setas amarelas: onde você avança · vermelhas: onde o inimigo vai atacar.</span> <span>O placar na linha mostra a sua força contra a do inimigo; toque nele para abrir a frente.</span></div>`;
}
function frontChipHTML(){
  const ph = phaseOf(G); if (ph.noArmies) return "";
  const n = G.war.fronts.length;
  return `<button class="ordchip" id="btnOrders" title="Frentes">⚔ ${n ? `${n} ${n === 1 ? "frente" : "frentes"}` : "Tropas"} · ${Math.round(frontPool(G))}</button>`;
}
// Setas do mapa: sua postura (avançar → próximo alvo) e a intenção inimiga
function frontArrows(g){
  const out = []; if (!frontMode(g) || !phaseOf(g).war) return out;
  for (const f of g.war.fronts){
    // com regiões, as setas ligam a região vizinha à próxima região alvo
    const tA = g.reg ? frontTargetReg(g, f, 1) : frontTarget(g, f, 1), tD = g.reg ? frontTargetReg(g, f, -1) : frontTarget(g, f, -1);
    const near = (to, side) => g.reg ? REG_DATA.regs[to].adj.find(x => (side === "enemy" ? g.reg[x] === f.id : sideOf(g, g.reg[x]) === side))
      : ADJ[to].find(x => frontSide(g, x, f) === side) || ADJ[to].find(x => sideOf(g, g.control[x]) === side);
    if ((f.special || f.posture === "avancar") && tA){ const fr = near(tA, "player"); if (fr) out.push({ side: "player", from: fr, to: tA, type: "atacar" }); }
    if (f.posture === "recuar" && tD){ const fr = near(tD, "player"); if (fr && fr !== tD) out.push({ side: "player", from: tD, to: fr, type: "recuar" }); }
    if (f.eposture === "avancar" && tD){ const fr = near(tD, "enemy"); if (fr) out.push({ side: "enemy", from: fr, to: tD, type: "atacar" }); }
  }
  return out;
}
/* ---------- Relatório da frente ---------- */
// Lista das regiões que mudaram num combate (texto curto, com nomes)
function regMovesText(rec){
  const rs = rec.regs || [], won = rs.filter(m => m.side === "player").map(m => regName(m.id)), lost = rs.filter(m => m.side !== "player").map(m => regName(m.id));
  if (!won.length && !lost.length) return "";
  return gfmt(fFala("regioes", won.length && lost.length ? "listaAmbos" : won.length ? "listaGanhou" : "listaPerdeu"), won.join(", "), lost.join(", "));
}
function frontRowsHTML(list){
  return `<div class="batlist">${list.map((r, i) => { const R = frontReport(G, r), good = r.d > 5, bad = r.d < -5, rg = r.regs !== undefined;
    const mv = rg ? (r.won || r.lost ? `<b class="rdelta"><b class="good">+${r.won}</b> / <b class="bad">−${r.lost}</b></b> ` : "")
      : r.moved.length ? r.moved.map(m => `${esc(m.uf)} ${m.side === "player" ? "✔" : "✖"}`).join(" ") + " — " : "";
    return `<button class="batrow ${good ? "good" : bad ? "bad" : ""}" data-frow="${i}" data-fmonth="${r.month}"><b>${POSTURE_ICON[r.p]} <span>${esc(frontName(G, r.front))}</span> · <span>linha</span> ${r.d >= 0 ? "+" : ""}${Math.round(r.d)}</b><span>${mv}${rg && (r.won || r.lost) ? `<small>${esc(regMovesText(r))}</small> ` : ""}<small>${esc(R.summary)}</small></span></button>`; }).join("")}</div>`;
}
function frontReportHTML(rec){
  let R; try{ R = frontReport(G, rec); }catch(e){ return ""; }
  const maxW = Math.max(0.05, ...R.rows.map(r => r.w || 0));
  const favH = r => r.fav ? `<span class="fav ${r.fav}"><i style="width:${Math.round(8 + 52 * Math.min(1, (r.w || 0) / maxW))}px"></i><span>${r.fav === "player" ? "você" : "inimigo"}</span></span>` : `<span class="fav none">—</span>`;
  const tot = Math.max(1, R.power.p + R.power.e), cls = rec.d > 5 ? "good" : rec.d < -5 ? "bad" : "";
  return `<h4>${rec.d > 5 ? "Por que a linha avançou" : rec.d < -5 ? "Por que a linha recuou" : "Por que a linha quase não mexeu"}</h4>
    <p class="sum ${cls}">${esc(R.summary)}</p>
    <div class="pw"><b style="color:#9cc3ea"><span>Você</span> ${R.power.p}</b><div class="bar2" title="Força na frente = tropas × moral × suprimento × general × postura × apoio"><i class="p" style="width:${R.power.p / tot * 100}%"></i><i class="e" style="width:${R.power.e / tot * 100}%"></i></div><b style="color:#f0a493">${R.power.e} <span>Inimigo</span></b></div>
    <table><tr><th>Fator</th><th style="text-align:center">Você</th><th style="text-align:center">Inimigo</th><th>Favoreceu</th></tr>
    ${R.rows.map(r => `<tr><td>${esc(r.label)}</td><td class="v p">${esc(r.p)}</td><td class="v e">${esc(r.e)}</td><td>${favH(r)}</td></tr>`).join("")}</table>
    <div class="loss"><span>Baixas — suas: <b class="p">${rec.lossP}</b></span><span>inimigas: <b class="e">${rec.lossE}</b></span></div>
    <ul class="tips">${R.tips.map(t => `<li>💡 <span>${esc(t)}</span></li>`).join("")}</ul>`;
}
function openFrontReport(rec, opts){
  opts = opts || {}; closeOverlay("frep");
  const K = fCfg(), gen = rec.gen && K.generais.find(x => x.id === rec.gen), GP = gen && portraitOf("pessoas", gen.retrato), EP = portraitOf("pessoas", K.frentes[rec.front].retrato);
  const f = { id: rec.front, progress: rec.prog };
  const o = document.createElement("div"); o.id = "frep"; o.className = "overlay";
  o.innerHTML = `<div class="bmodal frmodal" role="dialog" aria-label="Relatório da frente">
    <div class="btop"><div><div class="chap"><span>Relatório da frente</span> · <span>${esc(monthLabel(rec.month))}</span></div><h2>${esc(frontName(G, rec.front))}</h2>
      <small class="muted">${esc(fFala("inimigo", rec.front))}</small></div><button class="xbtn" data-close aria-label="Fechar">✕</button></div>
    <div class="frvs"><div class="frside p">${GP ? portraitImg(GP, 48) : ""}<div><small>Você</small><b>${POSTURE_ICON[rec.p]} <span>${esc(fFala("postura", rec.p))}</span></b>${rec.special ? `<em>💥 <span>Ofensiva especial</span></em>` : ""}</div></div>
      <div class="vs">VS</div><div class="frside e">${EP ? portraitImg(EP, 48) : ""}<div><small>Inimigo</small><b>${POSTURE_ICON[rec.e]} <span>${esc(fFala("postura", rec.e))}</span></b>${rec.eSpecial ? `<em>💥 <span>Ofensiva especial</span></em>` : ""}</div></div></div>
    ${G.reg && rec.regs ? regTrendHTML(G, rec.front) : ""}
    <div class="frline">${frontLineHTML(f, rec.regs ? (rec.won || rec.lost ? undefined : rec.prog0) : rec.prog0 + (rec.moved.length ? (rec.moved[0].side === "player" ? -100 : 100) : 0))}
      ${rec.regs && (rec.won || rec.lost) ? `<p class="frmove"><b class="${rec.won >= rec.lost ? "good" : "bad"}">${esc(gfmt(fFala("regioes", "saldoMes"), rec.won, rec.lost))}</b> · <span>${esc(regMovesText(rec))}</span></p>` : ""}
      <p class="frmove">${rec.moved.length ? rec.moved.map(m => `<b class="${m.side === "player" ? "good" : "bad"}">${esc(gfmt(fFala("eventos", m.side === "player" ? "tomou" : "perdeu"), MAP_DATA.states[m.uf].name, (STORY.factions[m.to] || {}).label || m.to))}</b>`).join(" ") : rec.regs && (rec.won || rec.lost) ? "" : `<span>Nenhum estado mudou de lado neste mês.</span>`}</p></div>
    <div class="brep show">${frontReportHTML(rec)}</div>
    <div class="bbtns">${opts.onBack ? `<button class="secondary" data-back>← Voltar</button>` : ""}<button class="primary" data-close>Fechar</button></div></div>`;
  document.body.appendChild(o); document.body.classList.add("noscroll");
  o.addEventListener("click", e => { if (e.target === o || e.target.closest("[data-close]")){ closeOverlay("frep"); if (opts.onClose) opts.onClose(); }
    else if (e.target.closest("[data-back]")){ closeOverlay("frep"); opts.onBack(); } });
}
/* ---------- Resolução animada do mês nas frentes (pulável) ---------- */
function playFrontResolution(ev, done){
  const finish = () => { closeOverlay("resol"); done && done(); };
  if (!ev || !ev.fronts || !ev.fronts.length) return finish();
  const sp = reduceMotion() ? 0.35 : 1;
  closeOverlay("resol");
  const o = document.createElement("div"); o.id = "resol"; o.className = "overlay";
  o.innerHTML = `<div class="rmodal"><div class="btop"><div><div class="chap">Resolução militar</div><h2>${esc(monthLabel(ev.month))}</h2></div><button class="secondary" data-skip>Pular ▸▸</button></div>
    <div class="mapbox" id="resolMap"></div><div class="rcap">As frentes se movem…</div><div class="rlist"></div><div class="bbtns"><button class="primary" data-done style="display:none">Continuar</button></div></div>`;
  document.body.appendChild(o); document.body.classList.add("noscroll");
  const box = o.querySelector("#resolMap"), cap = o.querySelector(".rcap"), list = o.querySelector(".rlist");
  const control = Object.assign({}, ev.control0), RG = ev.reg0 && G.reg && regMapOn(G);
  // com regiões: começa no mapa do início do mês (reg0), sem flashes, e vai trocando a cor de cada região tomada/perdida
  box.innerHTML = mapSVG(control, [], { g: G, military: true, armies: [], arrows: [], static: true, reg: RG ? ev.reg0 : undefined, regChg: [], noRegArrows: true });
  const svg = box.querySelector("svg"), timers = [], later = (fn, ms) => timers.push(setTimeout(fn, ms * sp));
  const flipFill = (k, fac, rg) => { const p = svg.querySelector(rg ? `path.rg[data-rg="${k}"]` : `path.uf[data-uf="${k}"]`); if (p && STORY.factions[fac]){ p.setAttribute("fill", facFill(fac)); p.classList.remove("flipfx"); void p.getBoundingClientRect(); p.classList.add("flipfx"); } };
  const btn = r => { const b = document.createElement("div"); b.innerHTML = frontRowsHTML([r]); const x = b.firstElementChild.firstElementChild; x.className += " rbat"; x.onclick = () => openFrontReport(r); return x; };
  let t = 900;
  ev.fronts.forEach(r => {
    later(() => { AUDIO.sfx(r.p === "avancar" || r.e === "avancar" ? "boom" : "order");
      cap.textContent = `${frontName(G, r.front)}: ${frontReport(G, r).summary}`; cap.className = "rcap " + (r.d > 5 ? "good" : r.d < -5 ? "bad" : "");
      list.appendChild(btn(r)); if (RG && r.regs) r.regs.forEach((m, i) => later(() => flipFill(m.id, m.to, true), 350 + i * 120)); else r.moved.forEach(m => later(() => flipFill(m.uf, m.to), 450)); }, t);
    t += 1300;
  });
  const end = () => { box.innerHTML = mapSVG(G.control, [], { g: G, military: true, armies: [], arrows: [], static: true, regChg: RG ? ev.regs : undefined });
    cap.textContent = "Toque numa frente para ver o relatório (por que a linha andou)."; cap.className = "rcap";
    o.querySelector("[data-done]").style.display = ""; o.querySelector("[data-skip]").style.display = "none"; };
  later(end, t);
  o.querySelector("[data-skip]").onclick = () => { timers.forEach(clearTimeout); list.innerHTML = ""; ev.fronts.forEach(r => list.appendChild(btn(r))); end(); };
  o.querySelector("[data-done]").onclick = finish;
}
/* ---------- Eventos do painel ---------- */
function bindFronts(el){
  el.querySelectorAll("[data-fpost]").forEach(b => b.onclick = () => { const r = setFrontPosture(G, b.dataset.front, b.dataset.fpost); if (r.ok) AUDIO.sfx("order"); afterAct(r); });
  el.querySelectorAll("[data-fgen]").forEach(s => s.onchange = () => { if (s.value) afterAct(setFrontGeneral(G, s.dataset.fgen, s.value)); });
  el.querySelectorAll("[data-foff]").forEach(b => b.onclick = () => { const r = launchOffensive(G, b.dataset.foff); if (r.ok) AUDIO.sfx("order"); afterAct(r); });
  el.querySelectorAll("[data-foff-cancel]").forEach(b => b.onclick = () => afterAct(cancelOffensive(G, b.dataset.foffCancel)));
  el.querySelectorAll("[data-frep]").forEach(b => b.onclick = () => { const f = frontById(G, b.dataset.frep); if (f && f.last) openFrontReport(f.last); });
  { const last = (G.war.log || []).filter(r => G.mil && r.month === G.mil.month); el.querySelectorAll("[data-frow]").forEach(b => b.onclick = () => { const r = last[+b.dataset.frow]; if (r) openFrontReport(r); }); }
  if ($("#fSplit")){ const s = $("#fSplit"); s.oninput = () => { const lbl = s.parentElement.querySelectorAll("b"); lbl[0].textContent = s.value + "%"; lbl[1].textContent = (100 - s.value) + "%"; }; s.onchange = () => afterAct(setFrontSplit(G, +s.value)); }
  el.querySelectorAll("[data-fsplit-auto]").forEach(b => b.onclick = () => afterAct(frontAutoSplit(G)));
  if ($("#btnRecruit")) $("#btnRecruit").onclick = () => afterAct(recruitArmy(G, null));
}
