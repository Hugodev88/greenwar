// js/ui/aba-acoes.js — Interface: aba Ações.
function tabAcoes(el){
  const acts = visibleActions(G);
  const C = SCEN.campaign, cats = [...(acts.some(a => a.cat === "sul") ? [["sul", "🌾 Sul (Liga do Sul)"]] : []), ["dip", "Diplomacia"], ["eco", "Economia"], ["mil", "Militar"], ["pol", "Política interna"]];
  el.innerHTML = `<p class="muted intro">Cada ação custa pontos de ação (AP) e, às vezes, ${esc(C.money.short)}. Cada uma pode ser usada uma vez por turno. Você tem <strong>${G.ap} AP</strong>.</p>${ecoStrip()}<div class="actgrid">${cats.map(([c, l]) => `<div class="panel"><h3>${l}</h3>${acts.filter(a => a.cat === c).map(a => { const st = actionState(G, a); return `<button class="act" data-id="${a.id}" ${st.ok?"":"disabled"}><span>${esc(a.name)}</span><em>${a.ap ?? 1} AP${a.cost ? ` · ${a.cost} ${esc(C.money.short)}` : ""}</em><small>${esc(a.desc)}</small><small class="fx">${esc(fxSummary(G, a.fx))}${a.risk ? ` · risco ${Math.round(a.risk.p*100)}%` : ""}</small>${st.ok ? "" : `<small class="why">${esc(st.why)}</small>`}</button>`; }).join("") || `<p class="muted">Nada nesta fase.</p>`}${c === "dip" ? `<button class="linkbtn" data-tab2="diplomacia">Abrir a tela de Diplomacia →</button>` : ""}${c === "sul" && southOn(G) ? `<p class="muted">Tensão no Sul agora: <b>${G.south.state === "aliado" ? "aliado" : G.south.t + "/100"}</b>. <button class="linkbtn" data-south>Entenda a tensão</button></p>` : ""}</div>`).join("")}</div>`;
  el.querySelectorAll("[data-south]").forEach(b => b.onclick = openSouth);
  el.querySelectorAll(".act[data-id]").forEach(b => b.onclick = () => { const snap = majorSnap(); afterAct(doAction(G, b.dataset.id)); showMajor(majorCheck(snap)); });
  bindEcoStrip(el);
  el.querySelectorAll("[data-tab2]").forEach(b => b.onclick = () => { UI.tab = b.dataset.tab2; renderGame(); });
}
