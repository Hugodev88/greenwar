// js/ui/aba-acoes.js — Interface: aba Ações (fase 16: abas por área, custo e efeito em chips, motivo de bloqueio à vista).
// UI.actCat guarda a área aberta ("all" = todas). A ação que a Marta sugeriria (advisorBestAction) ganha a marca ⭐.
const ACT_CATS = [["urna", "🗳️", "Contestação das urnas"], ["sul", "🌾", "Sul (Liga do Sul)"], ["pol", "🏛️", "Política interna"], ["eco", "💰", "Economia"], ["mil", "🎖️", "Militar"], ["dip", "🤝", "Diplomacia"]];
function actCardHTML(a, best){
  const C = SCEN.campaign, st = actionState(G, a), parts = fxParts(G, a.fx), ap = a.ap ?? 1;
  const short = !st.ok && /AP|Pontos/.test(st.why) ? " short" : !st.ok && /Recursos/.test(st.why) ? " poor" : "";
  return `<button class="act act2${st.ok ? "" : " off"}${best ? " best" : ""}${short}" data-id="${a.id}" ${st.ok ? "" : "disabled"}>
    <span class="a2top"><b class="a2name">${esc(a.name)}</b><span class="a2cost"><i class="ap${G.ap < ap ? " lack" : ""}"><span aria-hidden="true">⚡</span> <span>${ap} AP</span></i>${a.cost ? `<i class="mo${G.money < a.cost ? " lack" : ""}"><span aria-hidden="true">💰</span> <span>${a.cost} ${esc(C.money.short)}</span></i>` : ""}</span></span>
    ${parts.length || a.risk ? `<span class="a2fx">${parts.map(p => `<i class="fxc ${p.good === null ? "neu" : p.good ? "up" : "down"}">${esc(p.t)}</i>`).join("")}${a.risk ? `<i class="fxc risk"><span aria-hidden="true">⚠️</span> <span>${esc(`risco ${Math.round(a.risk.p * 100)}%`)}</span></i>` : ""}</span>` : ""}
    <small class="a2desc">${esc(a.desc)}</small>
    ${best && st.ok ? `<span class="a2best"><span aria-hidden="true">⭐</span> <span>Sugestão da Marta</span></span>` : ""}
    ${st.ok ? "" : `<span class="a2why"><span aria-hidden="true">🔒</span> <span>${esc(st.why)}</span></span>`}
  </button>`;
}
function tabAcoes(el){
  const acts = visibleActions(G), C = SCEN.campaign;
  const cats = ACT_CATS.filter(([c]) => acts.some(a => a.cat === c));
  const best = typeof advisorBestAction === "function" ? advisorBestAction(G) : null, bestId = best && best.a.id;
  const okCount = c => acts.filter(a => (c === "all" || a.cat === c) && actionState(G, a).ok).length;
  if (!UI.actCat || (UI.actCat !== "all" && !cats.some(([c]) => c === UI.actCat)))
    UI.actCat = (best && best.a.cat) || (cats.find(([c]) => okCount(c)) || cats[0] || ["all"])[0];
  const cur = UI.actCat, list = acts.filter(a => cur === "all" || a.cat === cur)
    .sort((x, y) => (actionState(G, y).ok - actionState(G, x).ok) || ((y.id === bestId) - (x.id === bestId)));
  el.innerHTML = `<p class="muted intro">Cada ação custa pontos de ação (AP) e, às vezes, ${esc(C.money.short)}. Cada uma pode ser usada uma vez por turno. Você tem <strong>${G.ap} AP</strong>.</p>${ecoStrip()}
    <div class="acttabs" role="tablist">${cats.concat([["all", "📋", "Todas"]]).map(([c, ic, l]) => { const n = okCount(c);
      return `<button role="tab" aria-selected="${c === cur}" class="acttab${c === cur ? " on" : ""}" data-cat="${c}"><span aria-hidden="true">${ic}</span> <span>${esc(l)}</span>${n ? ` <b class="badge">${n}</b>` : ""}</button>`; }).join("")}</div>
    <div class="actgrid act2grid">${list.map(a => actCardHTML(a, a.id === bestId)).join("") || `<p class="muted">Nada nesta fase.</p>`}</div>
    ${cur === "dip" ? `<button class="linkbtn" data-tab2="diplomacia">Abrir a tela de Diplomacia →</button>` : ""}
    ${cur === "sul" && southOn(G) ? `<p class="muted">Tensão no Sul agora: <b>${G.south.state === "aliado" ? "aliado" : G.south.t + "/100"}</b>. <button class="linkbtn" data-south>Entenda a tensão</button></p>` : ""}
    ${G.ap <= 0 && !G.ended ? `<p class="notice">Sem AP neste mês: encerre o mês para recuperar.</p>` : ""}`;
  el.querySelectorAll("[data-cat]").forEach(b => b.onclick = () => { UI.actCat = b.dataset.cat; renderGame(); });
  el.querySelectorAll("[data-south]").forEach(b => b.onclick = openSouth);
  el.querySelectorAll(".act[data-id]").forEach(b => b.onclick = () => { const snap = majorSnap(); afterAct(doAction(G, b.dataset.id)); showMajor(majorCheck(snap)); });
  bindEcoStrip(el);
  el.querySelectorAll("[data-tab2]").forEach(b => b.onclick = () => { UI.tab = b.dataset.tab2; renderGame(); });
}
