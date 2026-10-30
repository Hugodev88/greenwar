// js/ui/final.js — Interface: tela de final da campanha.
function renderEnding(){
  const node = nodeView(G, STORY.nodes[G.ended.node]);
  addEnding(G.ended.node); cloud("syncSave", SCEN.id);
  const found = getEndings().length, total = Object.values(STORY.nodes).filter(n => n.ending).length;
  const months = G.month - G.startMonth;
  $("#app").innerHTML = `<div class="layout single"><div class="card ending">
    <div class="chap">${esc(monthLabel(G.month))} · ${esc(node.chapter || "Epílogo")}</div>
    <div class="ending-tag">Final: ${esc(node.endingName)}</div>
    <h2>${esc(node.title)}</h2>
    ${G.ended.why ? `<div class="why">Desfecho da campanha: ${esc(G.ended.why)}</div>` : ""}
    ${node.text.map(p => `<p>${esc(p)}</p>`).join("")}
    <div class="summary"><strong>Campanha:</strong> ${G.turn} turnos, ${months} meses · ${G.stat.actions} ações · ${G.stat.deals} acordos · ${G.stat.battles} meses-frente de combate.
      <ol>${G.history.map(h => `<li><small>${esc(monthLabel(h.m))}</small> ${esc(h.t)}</li>`).join("")}</ol>
      Finais descobertos: ${found} de ${total}.</div>
    <div class="endmap"><h3>Mapa final</h3><div class="mapbox" id="mapEnd"></div></div>
    <div class="choices"><button class="primary" id="btnAgain">Nova campanha</button><button class="secondary" id="btnBack2">← Outros cenários</button></div>
  </div></div>`;
  renderMap($("#mapEnd"), G.control, G.lastMapChanges, true, {});
  $("#btnAgain").onclick = openNewCampaign;
  $("#btnBack2").onclick = renderMenu;
}
