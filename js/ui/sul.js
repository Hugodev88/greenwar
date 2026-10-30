// js/ui/sul.js — Interface: barra "Tensão no Sul" e a janela explicativa.
/* ---------- Tensão no Sul: barra, janela explicativa ---------- */
function southBarHTML(){
  if (!southOn(G)) return "";
  const SC = southCfg(G), st = G.south, L = southLevel(G), r = southRate(G), eta = southEta(G);
  const col = L.k === "bad" ? "#c2563f" : L.k === "warn" ? "#d0902a" : "#6fae6a";
  const done = st.state === "aliado" || st.state === "esmagada";
  const tail = done ? (st.state === "aliado" ? "O Sul luta ao seu lado." : "Não há mais risco de rebelião.")
    : st.state === "revolta" ? `Baixe para ${SC.truce} ou menos para um armistício.`
    : `${r > 0 ? "▲ +" + r : r < 0 ? "▼ " + r : "estável"}/mês${eta ? ` · rebelião em ~${eta} ${eta === 1 ? "mês" : "meses"}` : ""}`;
  return `<button class="southbar ${L.k}${L.k === "bad" ? " pulse" : ""}" id="btnSouth" aria-label="Tensão no Sul ${done ? L.label : st.t + " de 100, " + L.label}. Abrir detalhes.">
    <span class="sk">🌾 Tensão no Sul</span>
    ${done ? "" : `<span class="sbar" aria-hidden="true"><i style="width:${st.t}%;background:${col}"></i><u style="left:${SC.summitAt}%"></u><u class="w" style="left:${SC.warn}%"></u><u class="r" style="left:calc(100% - 2px)"></u></span><b class="sv">${st.t}/100</b>`}
    <span class="swl">${esc(L.label)}</span><span class="st">${esc(tail)} · <u>o que fazer?</u></span></button>`;
}
function openSouth(){
  if (!southOn(G)) return;
  const SC = southCfg(G), st = G.south, L = southLevel(G), f = southFactors(G), r = southRate(G), eta = southEta(G), C = SCEN.campaign;
  const acts = visibleActions(G).filter(a => a.cat === "sul");
  const html = `<h2>🌾 Tensão no Sul</h2>
    <p>Mede o quanto os governadores do <b>Rio Grande do Sul, Santa Catarina e Paraná</b> (a “Liga do Sul”) estão perto de romper com Brasília. Vai de 0 a 100.</p>
    ${st.state === "aliado" ? `<p class="notice">✔ <b>Pacto Federativo assinado.</b> O Sul é seu aliado: a tensão não sobe mais e a ${esc(SC.allyName)} luta do seu lado.</p>` : st.state === "esmagada" ? `<p class="notice">A revolta foi esmagada. Não há mais risco de rebelião do Sul.</p>` : `
    <div class="sthr"><span>Agora: <b>${st.t}/100</b> — ${esc(L.label)}</span><span>${SC.summitAt}+: os governadores pedem uma cúpula</span><span style="border-color:#d0902a">${SC.warn}+: alerta de rebelião</span><span style="border-color:#c2563f">100: a Liga do Sul se rebela</span></div>
    ${st.state === "revolta" ? `<p class="why"><b>A Liga do Sul está em revolta.</b> Ela começou só pelo ${esc(MAP_DATA.states[SC.rebel[0]].name)}, com um exército pequeno (força ${SC.armyStr}). Se a tensão ficar acima de ${SC.stage2}, ${esc(MAP_DATA.states[SC.rebel[1]].name)} adere. <b>Se você baixar a tensão para ${SC.truce} ou menos, ela aceita um armistício</b> e os estados voltam para você. Também é possível retomar os estados à força.</p>`
      : eta ? `<p class="why">No ritmo atual (<b>${r > 0 ? "+" : ""}${r} por mês</b>), a Liga do Sul se rebela em cerca de <b>${eta} ${eta === 1 ? "mês" : "meses"}</b>.${paceFor(G) > 1 ? ` Atenção: cada turno agora dura ${paceFor(G)} meses.` : ""}</p>` : `<p class="why">No ritmo atual a tensão ${r < 0 ? "está caindo" : "está estável"}.</p>`}
    <h3>Por que muda todo mês</h3>
    <ul class="sfac">${f.map(x => `<li class="${x.v > 0 ? "up" : "dn"}"><span>${esc(x.t)}</span><b>${x.v > 0 ? "+" : ""}${x.v}/mês</b></li>`).join("")}<li><span><b>Total</b>${st.state === "revolta" ? " (em revolta, no máximo +2)" : ""}</span><b>${r > 0 ? "+" : ""}${r}/mês</b></li></ul>
    <h3>O que sobe e o que baixa</h3>
    <ul><li><b>Sobe:</b> o golpe em si, o racha nas Forças (+20 de uma vez), agitação alta em RS/SC/PR, agronegócio insatisfeito, Apoio Militar baixo (&lt;40), ameaças e intervenções.</li>
    <li><b>Baixa:</b> as ações da categoria <b>Sul</b> (abaixo e na aba Ações), <b>investir</b> (−4) ou <b>negociar com o governador</b> (−6) em RS/SC/PR no mapa, exércitos seus estacionados no Sul, agradar o agronegócio e escolher negociar nos eventos.</li>
    <li><b>Evitar de vez:</b> faça uma <b>Cúpula</b> e, com a tensão em ${SC.allyMax} ou menos, assine o <b>Pacto Federativo</b> — o Sul vira aliado e manda uma divisão.</li></ul>
    <h3>Ações para o Sul</h3>
    <div class="sacts">${acts.map(a => { const s2 = actionState(G, a); return `<button class="act" data-sact="${a.id}" ${s2.ok ? "" : "disabled"}><span>${esc(a.name)}</span><em>${a.ap ?? 1} AP${a.cost ? ` · ${a.cost} ${esc(C.money.short)}` : ""}</em><small>${esc(a.desc)}</small><small class="fx">${esc(fxSummary(G, a.fx))}</small>${s2.ok ? "" : `<small class="why">${esc(s2.why)}</small>`}</button>`; }).join("") || `<p class="muted">Nenhuma ação disponível agora.</p>`}</div>`}`;
  openModal(html, m => m.querySelectorAll("[data-sact]").forEach(b => b.onclick = () => { const snap = majorSnap(); const r2 = doAction(G, b.dataset.sact); closeModal(); afterAct(r2); showMajor(majorCheck(snap)); }));
}
