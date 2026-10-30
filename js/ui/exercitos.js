// js/ui/exercitos.js — Interface: "Meus exércitos" (cartões e botões Atacar/Mover/Defender/Reforçar) e painéis de exército/estado.
/* ---------- Fase 4: cartões "Meus exércitos" (1–2 cliques por ordem) ---------- */
const ORDER_HELP = {
  atacar: "Avança sobre um estado vizinho inimigo ou em disputa. Gasta 1 manobra. Vários exércitos atacando o mesmo estado somam forças.",
  mover: "Leva o exército para um estado vizinho seu (ou recua de uma frente). Gasta 1 manobra.",
  defender: "Fica onde está, com posições preparadas: +10% na defesa e +6 de moral. Não gasta manobra.",
  reforcar: "Fica parado e ganha +" + STR_UNIT + " de força no fim do mês. Custa dinheiro, só em território seu. Não gasta manobra."
};
function orderStatus(a){
  if (!a.order) return "⏸ sem ordem";
  const o = a.order;
  return { atacar: "⚔ atacar", mover: "➜ mover para", recuar: "↩ recuar para", defender: "🛡 defender", reforcar: "＋ reforçar" }[o.type];
}
function attackChoices(a){
  const tg = armyTargets(G, a).filter(t => t.type === "atacar");
  return tg.map(t => { const group = armiesOf(G, "player").filter(x => x.id === a.id || (x.order && x.order.type === "atacar" && x.order.to === t.uf));
    return { uf: t.uf, type: "atacar", ratio: battleOdds(G, "player", group, t.uf).ratio }; }).sort((x, y) => y.ratio - x.ratio);
}
function maneuverBlocked(a){ return !(a.order && MANEUVER.includes(a.order.type)) && ordersUsed(G) >= commandLimit(G); }
function armyBtnsHTML(a){
  const C = SCEN.campaign, atk = attackChoices(a), mv = armyTargets(G, a).filter(t => t.type !== "atacar"), blk = maneuverBlocked(a), o = a.order && a.order.type;
  const refOk = a.str <= ARMY_MAX - STR_UNIT && sideOf(G, G.control[a.uf]) === "player" && (G.money >= reinforceCost(G) || o === "reforcar");
  const b = (q, cls, ico, lbl, sub, ok, on, tip) => `<button class="ab ${cls}${on ? " on" : ""}" data-q="${q}" data-a="${a.id}" ${ok ? "" : "disabled"} title="${esc(tip)}"><b aria-hidden="true">${ico}</b><span>${lbl}</span><small>${esc(sub)}</small></button>`;
  return `<div class="abtns">
    ${b("atk", "atk", "⚔", "Atacar", atk.length ? (blk ? "sem manobras" : `${atk[0].uf} ${atk[0].ratio >= 9 ? "livre" : atk[0].ratio.toFixed(1) + "×"}`) : "sem alvo", atk.length && !blk, o === "atacar", ORDER_HELP.atacar)}
    ${b("mov", "mov", "➜", "Mover", mv.length ? (blk ? "sem manobras" : mv.length + (mv.length === 1 ? " destino" : " destinos")) : "sem destino", mv.length && !blk, o === "mover" || o === "recuar", ORDER_HELP.mover)}
    ${b("def", "def", "🛡", "Defender", "grátis", true, o === "defender", ORDER_HELP.defender)}
    ${b("ref", "ref", "＋", "Reforçar", `${reinforceCost(G)} ${C.money.short}`, refOk, o === "reforcar", ORDER_HELP.reforcar)}</div>`;
}
function armyCardHTML(a){
  const on = UI.selArmy === a.id;
  return `<div class="acard${a.order ? "" : " idle"}${on ? " on" : ""}">
    <button class="ahead" data-army="${a.id}" aria-label="Selecionar no mapa: ${esc(a.name)}"><i class="nato p"></i><span><b>${esc(a.name)}</b><small>${esc(a.uf)} · força ${Math.round(a.str)} · moral ${Math.round(a.org)}</small></span><em class="ost">${esc(orderStatus(a))}${a.order && a.order.to ? ` <b>${esc(a.order.to)}</b>` : ""}</em></button>
    ${armyBtnsHTML(a)}
    ${a.order ? `<button class="linkbtn undo" data-undo="${a.id}">↶ Desfazer ordem</button>` : ""}</div>`;
}
function ordSumHTML(){
  const lim = commandLimit(G), used = ordersUsed(G), mine = armiesOf(G, "player"), idle = mine.filter(a => !a.order).length, left = Math.max(0, lim - used);
  return `<div class="ordsum${left ? "" : " full"}"><div class="osn"><b>${left}</b><span>${left === 1 ? "manobra restante" : "manobras restantes"}<br><small>de ${lim} neste mês (atacar/mover)</small></span></div>
    ${mine.length ? (idle ? `<span class="warnc">⏸ ${idle} sem ordem</span>` : `<span class="okc">✔ todos com ordem</span>`) : ""}</div>`;
}
function autoBoxHTML(){
  const m = G.autoOrders || "off";
  return `<div class="autobox"><div class="autobtns">
    <button class="secondary" data-auto="defender" title="Exércitos sem ordem: os da retaguarda vão para a fronteira, os da fronteira defendem.">🛡 Defender fronteiras</button>
    <button class="secondary" data-auto="auto" title="Ataca onde a chance é boa (1,3× ou mais) e defende o resto.">🤖 Ordens automáticas</button>
    <button class="secondary" data-clear>↶ Desfazer todas</button></div>
    <label class="autorep">Todo mês, exércitos sem ordem:
      <select id="autoSel"><option value="off" ${m === "off" ? "selected" : ""}>ficam parados (manual)</option><option value="defender" ${m === "defender" ? "selected" : ""}>defendem as fronteiras</option><option value="auto" ${m === "auto" ? "selected" : ""}>atacam se a chance é boa, senão defendem</option></select></label></div>`;
}
function ordLegendHTML(open){
  return `<details class="ordlegend"${open ? " open" : ""}><summary>O que cada ordem faz?</summary><ul>
    <li><b>⚔ Atacar</b>: ${esc(ORDER_HELP.atacar)}</li><li><b>➜ Mover</b>: ${esc(ORDER_HELP.mover)}</li>
    <li><b>🛡 Defender</b>: ${esc(ORDER_HELP.defender)}</li><li><b>＋ Reforçar</b>: ${esc(ORDER_HELP.reforcar)}</li>
    <li>Tudo acontece ao <b>Encerrar mês</b>. Ordens não gastam AP. Exército sem ordem fica parado (sem bônus).</li></ul></details>`;
}
/* ---------- Painéis de exército e ordens ---------- */
function armyLine(a){ return `${esc(a.uf)} · força ${Math.round(a.str)} · moral ${Math.round(a.org)}`; }
function orderText(a){
  if (!a.order) return "sem ordem";
  const o = a.order; return ORDER_LABEL[o.type] + (o.to ? " " + o.to : "") + (o.type === "reforcar" ? ` (+${STR_UNIT})` : "");
}
function armyPanel(a){
  const C = SCEN.campaign, ph = phaseOf(G), mine = a.side === "player", mo = maxOrg(G, a.side);
  const plan = !mine ? (G.enemyPlans || []).find(p => p.id === a.id && p.to && intentKnown(G, p)) : null;
  let html = `<h3 class="armyh"><i class="nato ${mine ? "p" : "e"}"></i>${esc(a.name)}</h3>
    <div class="ufinfo">
      <div><span>General</span><b class="gen">${portraitImg(portraitOf("generais", a.gen), 32)}${esc(a.gen || "—")}</b></div>
      <div><span>Local</span><b>${esc(a.uf)} · ${esc(MAP_DATA.states[a.uf].name)}</b></div>
      ${!mine && a.fac && STORY.factions[a.fac] ? `<div><span>Lado</span><b>${esc(STORY.factions[a.fac].label)}</b></div>` : ""}
      <div><span>Força</span><div class="bar"><i style="width:${a.str / ARMY_MAX * 100}%;background:${mine ? "#5d8fc4" : "#c2563f"}"></i></div><b>${Math.round(a.str)}</b></div>
      <div><span>Organização</span><div class="bar"><i style="width:${a.org}%;background:#c9a45c"></i></div><b title="máximo atual ${mo}">${Math.round(Math.min(a.org, Math.max(mo, a.org)))}<small class="muted" style="font-weight:400"> /${mo}</small></b></div>
      <div><span>Experiência</span><div class="bar"><i style="width:${a.xp}%;background:#8fc488"></i></div><b>${Math.round(a.xp)}</b></div>
      ${mine ? `<div><span>Ordem</span><b>${esc(orderText(a))}</b></div>` : `<div><span>Intenção</span><b>${plan ? esc(ORDER_LABEL[plan.type] + " " + plan.to) : "desconhecida"}</b></div>`}
    </div>`;
  if (!mine){ html += `<p class="muted">${plan ? "Seu serviço de informações detectou a intenção deste exército (seta vermelha)." : "Aproxime seus exércitos ou eleve o atributo militar (≥ 60) para conhecer as intenções inimigas."}</p><button class="secondary" data-desel>Fechar</button>`; return html; }
  const lim = commandLimit(G), used = ordersUsed(G), mode = UI.ordMode, tg = armyTargets(G, a).filter(t => !mode || (mode === "atacar" ? t.type === "atacar" : t.type !== "atacar"));
  const attackers = uf => armiesOf(G, "player").filter(x => x.id === a.id || (x.order && x.order.type === "atacar" && x.order.to === uf));
  html += `<div class="ordbox">${ordSumHTML()}
    <p class="muted">Escolha a ordem deste exército (um clique):</p>
    ${armyBtnsHTML(a)}
    ${a.order ? `<button class="linkbtn undo" data-undo="${a.id}">↶ Desfazer ordem</button>` : ""}
    ${mode ? `<div class="modehint">${mode === "atacar" ? "⚔ <b>Atacar</b>: escolha o alvo (borda <b class=\"hl-a\">vermelha</b> no mapa) ou abaixo." : "➜ <b>Mover</b>: escolha o destino (borda <b class=\"hl-m\">azul</b> no mapa) ou abaixo."} <button class="linkbtn" data-mode-off>ver todos</button></div>` : `<p class="muted">Ou ${MOBILE_MAP() ? "toque" : "clique"} direto num estado destacado no mapa.</p>`}
    <div class="tglist">${tg.length ? tg.map(t => { const o = t.type === "atacar" ? battleOdds(G, "player", attackers(t.uf), t.uf) : null;
      return `<button class="tgt ${t.type}${a.order && a.order.to === t.uf ? " on" : ""}" data-to="${t.uf}" data-type="${t.type}"><span>${t.type === "atacar" ? "⚔" : t.type === "recuar" ? "↩" : "➜"} ${esc(ORDER_LABEL[t.type])} ${esc(t.uf)}</span><small>${esc(MAP_DATA.states[t.uf].name)}${o ? ` · chance ${esc(oddsLabel(o.ratio))} (${o.ratio.toFixed(1)}×)` : ""}</small></button>`; }).join("") : `<p class="muted">${ph.war ? (G.ceasefire > 0 ? "Trégua: só deslocamentos entre seus estados." : "Nenhum estado vizinho alcançável.") : "Sem guerra: só reposicionamento entre estados vizinhos seus."}</p>`}</div>
    ${ordLegendHTML(false)}
    <button class="secondary" data-desel>← Todos os exércitos</button></div>`;
  return html;
}
function recruitBoxHTML(uf){
  const C = SCEN.campaign, st = recruitState(G, uf), at = st.ok ? st.uf : (uf || capitalOf(G, "player"));
  const left = recruitsLeft(G), mob = phaseOf(G).war ? mobilization(G) : 0;
  return `<div class="recruitbox"><div class="ordhead"><b>Recrutar tropas</b><span>${left}/${RECRUIT_PER_MONTH} neste mês · ${armiesOf(G, "player").length}/${ARMY_CAP.player} exércitos</span></div>
    <button class="bigbtn" id="btnRecruit" data-uf="${esc(at || "")}" ${st.ok ? "" : "disabled"}><span>＋ Recrutar tropas${at ? " em " + esc(at) : ""}</span><small>Novo exército com ${RECRUIT_STR} de força · custa ${recruitCost(G)} ${esc(C.money.short)} · sem AP</small></button>
    ${st.ok ? "" : `<p class="why">${esc(st.msg)}</p>`}
    <ul>${uf ? "" : `<li>Para recrutar em outro estado seu, toque nele no mapa.</li>`}<li><b>Reforçar</b> um exército parado em território seu custa só ${reinforceCost(G)} ${esc(C.money.short)} (+${STR_UNIT} de força).</li>
    ${mob ? `<li><b>Alistamento:</b> todo mês chegam ~${mob} de força em voluntários — reforçam exércitos fracos que descansam no seu território; o excedente forma novos exércitos.</li>` : ""}</ul></div>`;
}
function overviewPanel(){
  const C = SCEN.campaign, ph = phaseOf(G), sides = sideCounts(G), mine = armiesOf(G, "player");
  const fronts = Object.keys(G.control).filter(k => sideOf(G, G.control[k]) === "contested");
  const hot = playerUFs(G).sort((a, b) => G.uf[b].unrest - G.uf[a].unrest).slice(0, 3);
  const intents = knownIntents(G), lim = commandLimit(G);
  const sit = `<h3>Situação</h3><div class="ufinfo">
      <div><span>Seus estados</span><b>${sides.player}</b></div><div><span>Inimigos</span><b>${sides.enemy}</b></div><div><span>Em disputa</span><b>${sides.contested}</b></div>
      ${hot.length ? `<div><span>Mais agitados</span><b>${hot.map(h => `${h} (${Math.round(G.uf[h].unrest)})`).join(", ")}</b></div>` : ""}</div>`;
  if (ph.noArmies) return sit + `<p class="muted">Nesta fase você não comanda tropas: o mapa mostra a disputa política. Use propaganda, investimentos e negociação.</p>`;
  let html = G.simple && ph.war && !UI.manual ? simpleArmiesHTML() + recruitBoxHTML(null) : `${G.simple && ph.war ? `<button class="linkbtn" data-manual="0">← Voltar ao resumo simples</button>` : ""}<h3>Meus exércitos</h3>${ph.war ? ordSumHTML() : `<p class="muted">Tempo de paz: exércitos só se reposicionam entre estados seus (guarnições reduzem a agitação).</p>`}
    <div class="myarmies">${mine.length ? mine.map(armyCardHTML).join("") : `<p class="muted">Nenhum exército em campo. Recrute abaixo.</p>`}</div>
    ${ph.war && mine.length ? autoBoxHTML() : ""}${ph.war && mine.length ? ordLegendHTML(false) : ""}
    ${recruitBoxHTML(null)}`;
  const recent = (G.battleLog || []).filter(b => G.mil && b.month === G.mil.month);
  if (recent.length) html += `<div class="ordhead"><b>Batalhas do último mês</b><span>por que venceu/perdeu</span></div>${battleRowsHTML(recent)}`;
  if (ph.war){
    html += intents.length ? `<div class="ordhead"><b>Intenções inimigas conhecidas</b></div><ul class="intents">${intents.map(p => { const a = armyById(G, p.id); return `<li>${esc(a.name)}: ${esc(ORDER_LABEL[p.type].toLowerCase())} <b>${esc(p.to)}</b></li>`; }).join("")}</ul>` : `<p class="muted">Intenções inimigas desconhecidas (aproxime exércitos ou eleve o atributo militar ≥ 60).</p>`;
    if (fronts.length) html += `<div class="ordhead"><b>Frentes</b></div><div class="frontlist">${fronts.map(f => `<button class="secondary small" data-battle="${f}">⚔ ${f} ${G.uf[f].progress > 0 ? "+" : ""}${Math.round(G.uf[f].progress)}</button>`).join("")}</div>`;
  }
  return html + sit;
}
function atkWithHTML(uf){
  const ph = phaseOf(G); if (!ph.war || G.ceasefire > 0) return "";
  const side = sideOf(G, G.control[uf]); if (side !== "enemy" && side !== "contested") return "";
  const list = armiesOf(G, "player").filter(a => armyTargets(G, a).some(t => t.uf === uf && t.type === "atacar"));
  if (!list.length) return `<p class="muted">Nenhum exército seu é vizinho deste estado.</p>`;
  return `<div class="ordhead"><b>Atacar com:</b><span>um clique para ver a previsão</span></div><div class="atkwith">${list.map(a => { const r = battleOdds(G, "player", armiesOf(G, "player").filter(x => x.id === a.id || (x.order && x.order.type === "atacar" && x.order.to === uf)), uf).ratio;
    return `<button class="tgt atacar" data-atkw="${a.id}" data-to="${uf}" ${maneuverBlocked(a) ? "disabled" : ""}><span>⚔ ${esc(a.name)} (${esc(a.uf)})</span><small>força ${Math.round(a.str)} · chance ${esc(oddsLabel(r))} (${r >= 9 ? "livre" : r.toFixed(1) + "×"})${maneuverBlocked(a) ? " · sem manobras" : ""}</small></button>`; }).join("")}</div>`;
}
function ufPanel(uf){
  const C = SCEN.campaign, ph = phaseOf(G), u = G.uf[uf], fac = STORY.factions[G.control[uf]], side = sideOf(G, G.control[uf]);
  const sideLbl = { player: "Seu lado", enemy: "Inimigo", contested: "Em disputa", neutral: "Outros" }[side];
  const acts = mapActions(G, uf), T = TERRAIN_TYPES[TERRAIN[uf]];
  const here = (G.armies || []).filter(a => a.uf === uf), pm = militia(G, "player", uf), em = ph.war ? militia(G, "enemy", uf) : null;
  return `<h3>${uf} · ${esc(MAP_DATA.states[uf].name)}</h3>
    <div class="ufinfo"><div><span>Controle</span><b><i class="sw" style="background:${fac ? fac.color : "#555"}"></i>${esc(fac ? fac.label : G.control[uf])}</b><em class="side ${side}">${sideLbl}</em></div>
    <div><span>Agitação</span><div class="bar"><i style="width:${u.unrest}%;background:${unrestColor(u.unrest)}"></i></div><b>${Math.round(u.unrest)}</b></div>
    ${side === "contested" ? `<div><span>Frente</span><div class="bar two"><i style="width:${(u.progress+100)/2}%;background:#c9a45c"></i></div><b>${u.progress > 0 ? "+" : ""}${Math.round(u.progress)}</b></div><small class="muted">+100 = estado conquistado · −100 = perdido</small>` : ""}
    ${(side !== "player" && ph.flipTo && ph.flipTo[G.control[uf]]) ? `<div><span>Simpatia</span><div class="bar"><i style="width:${Math.max(0,u.sway)}%;background:#8fc488"></i></div><b>${Math.round(u.sway)}/100</b></div>` : ""}
    <div><span>Terreno</span><b>${esc(T ? T.label : "—")}${T && T.def ? ` · defesa +${Math.round(T.def * 100)}%` : ""}</b></div>
    <div><span>Peso econômico</span><b>${UF_WEIGHT[uf]}</b></div>
    <div><span>Vizinhos</span><b>${ADJ[uf].join(", ")}</b></div>
    ${STORY.stateNotes && STORY.stateNotes[uf] ? `<small class="muted">${esc(STORY.stateNotesLabel||"")}: ${esc(STORY.stateNotes[uf])}</small>` : ""}</div>
    <div class="ordhead"><b>Forças no estado</b></div>
    <div class="armylist">${here.map(a => `<button class="armyrow" data-army="${a.id}"><i class="nato ${a.side === "player" ? "p" : "e"}"></i><span><b>${esc(a.name)}</b><small>${armyLine(a)}${a.gen ? " · " + esc(a.gen) : ""}</small></span><em>${a.side === "player" ? esc(orderText(a)) : "inimigo"}</em></button>`).join("")}
      ${pm ? `<div class="armyrow mil"><i class="nato p m"></i><span><b>${esc(pm.name)}</b><small>força ${pm.str} (local, não se move)</small></span></div>` : ""}
      ${em ? `<div class="armyrow mil"><i class="nato e m"></i><span><b>${esc(em.name)}</b><small>força ${em.str} (local)</small></span></div>` : ""}
      ${!here.length && !pm && !em ? `<p class="muted">Nenhuma força.</p>` : ""}</div>
    ${atkWithHTML(uf)}
    ${!ph.noArmies && side === "player" ? recruitBoxHTML(uf) : ""}
    ${southOn(G) && G.south.state !== "aliado" && G.south.state !== "esmagada" && southCfg(G).ufs.includes(uf) ? `<p class="why">🌾 Estado da Liga do Sul: <b>investir</b> aqui baixa a Tensão no Sul em 4, e <b>negociar</b> com sucesso, em 6. <button class="linkbtn" data-south>Tensão: ${G.south.t}/100</button></p>` : ""}
    ${ph.war && (side === "contested" || here.some(a => a.side === "enemy")) ? `<button class="secondary" data-battle="${uf}">⚔ ${battleAt(uf) ? "Ver a batalha deste mês" : "Ver forças e previsão"}</button>` : ""}
    <div class="mapacts">${acts.length ? acts.map(a => `<button class="act" data-k="${a.kind}" ${a.ok?"":"disabled"}><span>${esc(a.label)}</span><em>${a.ap ? a.ap + " AP" : "grátis"}${a.cost ? ` · ${a.cost} ${esc(C.money.short)}` : ""}</em><small>${esc(a.ok ? a.desc + (a.kind === "negociar" ? ` Chance: ${negotiateChance(G, uf)}%.` : "") : a.why)}</small></button>`).join("") : `<p class="muted">Nenhuma ação política disponível aqui nesta fase.</p>`}</div>
    <button class="secondary" data-desel>Voltar à visão geral</button>`;
}
