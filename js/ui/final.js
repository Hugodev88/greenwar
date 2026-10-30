// js/ui/final.js — Interface: tela de final da campanha (nota, resumo, conquistas, mapa final e botões de jogar de novo / outro final / compartilhar).
const OUTCOME_LABEL = { vitoria: "Vitória", parcial: "Final intermediário", derrota: "Derrota" };
const OUTCOME_LINE = {
  vitoria: "Você chegou a um final de vitória.",
  parcial: "Você chegou a um final intermediário: nem vitória, nem derrota.",
  derrota: "Sua campanha terminou em derrota, mas cada derrota mostra um caminho novo."
};
const GRADE_LINE = { S: "Campanha impecável.", A: "Campanha muito boa.", B: "Campanha razoável: dá para ir melhor.", C: "Campanha difícil: tente outro caminho." };
function endingStoryHTML(gr){
  const st = STORY.stats, keys = Object.keys(G.stats).filter(k => st[k]);
  const sorted = keys.slice().sort((a, b) => G.stats[b] - G.stats[a]), hi = sorted[0], lo = sorted[sorted.length - 1];
  const sc = sideCounts(G), months = G.month - G.startMonth, D = diffOf(G);
  const lines = [OUTCOME_LINE[gr.outcome], `Sua campanha durou ${months} meses, em ${G.turn} turnos.`];
  if (G.stat.battles) lines.push(`No fim, seu lado controlava ${sc.player} dos 27 estados, depois de ${G.stat.battles} meses de combate.`);
  else lines.push("Você chegou ao fim sem guerra aberta.");
  lines.push(`Você tomou ${G.stat.actions} ações, fechou ${G.stat.deals} acordos e concluiu ${G.focus ? G.focus.done.length : 0} decisões nacionais.`);
  const moments = endingMoments(G, 6);
  return `<section class="endsec"><h3>Sua história</h3>
    <div class="endchips"><span class="chip">${esc(D.icone || "")} ${esc(D.label)}</span>${G.quick ? `<span class="chip">⏱️ Partida rápida</span>` : ""}
      ${hi ? `<span class="chip good">Ponto forte: <b>${esc(st[hi].label)}</b> ${Math.round(G.stats[hi])}</span>` : ""}
      ${lo && lo !== hi ? `<span class="chip bad">Ponto fraco: <b>${esc(st[lo].label)}</b> ${Math.round(G.stats[lo])}</span>` : ""}</div>
    ${lines.map(l => `<p>${esc(l)}</p>`).join("")}
    ${moments.length ? `<h4>Momentos marcantes</h4><ol class="moments">${moments.map(h => `<li><small>${esc(monthLabel(h.m))}</small> ${esc(h.t)}</li>`).join("")}</ol>` : ""}
    <details class="gradecalc"><summary>Como a nota foi calculada</summary><table>${gr.parts.map(p => `<tr><td>${esc(p[0])}</td><td>${p[1] >= 0 ? "+" : ""}${p[1]}</td></tr>`).join("")}<tr class="tot"><td>Total</td><td>${gr.score}</td></tr></table>
      <p class="muted sm">S a partir de 85 pontos, A a partir de 70, B a partir de 50. Uma derrota fica no máximo em B, um final intermediário no máximo em A e uma vitória no mínimo em B.</p></details>
  </section>`;
}
function endingAchHTML(fresh){
  const d = achLoad(), have = CONQUISTAS.filter(c => d.got[c.id]).length;
  return `<section class="endsec"><h3>Conquistas <small class="muted">${have} de ${CONQUISTAS.length}</small></h3>
    <div class="achgrid">${CONQUISTAS.map(c => { const got = !!d.got[c.id], nw = fresh.includes(c.id);
      return `<div class="ach${got ? " got" : ""}${nw ? " new" : ""}" title="${esc(c.desc)}"><span class="achic" aria-hidden="true">${got ? c.icone : "🔒"}</span><div><b>${esc(c.nome)}</b>${nw ? ` <span class="achnew">Nova!</span>` : ""}<small>${esc(c.desc)}</small></div></div>`; }).join("")}</div>
  </section>`;
}
function otherEndingsHTML(){
  const found = getEndings(), all = Object.entries(STORY.nodes).filter(([, n]) => n.ending);
  const miss = all.filter(([id]) => !found.includes(id)), list = miss.length ? miss : all;
  return `<h3>${miss.length ? "Finais que você ainda não viu" : "Você já viu todos os finais! Como chegar a cada um:"}</h3>
    <ul class="endhints">${list.map(([, n]) => `<li><span class="outtag ${n.outcome || "parcial"}">${esc(OUTCOME_LABEL[n.outcome || "parcial"])}</span> <b>${esc(n.endingName)}</b><small>${esc(n.dica || "")}</small></li>`).join("")}</ul>
    <div class="choices"><button class="primary" id="btnHintGo">Começar uma campanha nova</button></div>`;
}
function renderEnding(){
  const node = nodeView(G, STORY.nodes[G.ended.node]);
  addEnding(G.ended.node); cloud("syncSave", SCEN.id);
  const { grade: gr, fresh } = achRecord();
  const found = getEndings().length, total = Object.values(STORY.nodes).filter(n => n.ending).length;
  const nAch = CONQUISTAS.filter(c => achLoad().got[c.id]).length;
  $("#app").innerHTML = `<div class="layout single"><div class="card ending">
    <div class="chap">${esc(monthLabel(G.month))} · ${esc(node.chapter || "Epílogo")}</div>
    <div class="endhead"><div class="endtitle">
        <div><span class="ending-tag">Final: ${esc(node.endingName)}</span> <span class="outtag ${gr.outcome}">${esc(OUTCOME_LABEL[gr.outcome])}</span></div>
        <h2>${esc(node.title)}</h2></div>
      <div class="grade g${gr.letter}" role="img" aria-label="Nota ${gr.letter}"><b>${gr.letter}</b><small>Nota</small></div></div>
    <div class="gradeline">${esc(GRADE_LINE[gr.letter])}</div>
    ${G.ended.why ? `<div class="why">Desfecho da campanha: ${esc(G.ended.why)}</div>` : ""}
    ${node.text.map(p => `<p>${esc(p)}</p>`).join("")}
    <div class="choices endbtns"><button class="primary" id="btnReplay">↻ Jogar de novo</button><button class="secondary" id="btnOther">🔀 Tentar outro final</button><button class="secondary" id="btnShare">📣 Compartilhar</button></div>
    <div id="endHints" class="endsec hintsbox" hidden></div>
    ${endingStoryHTML(gr)}
    ${endingAchHTML(fresh)}
    <div class="endmap"><h3>Mapa final</h3><div class="mapbox" id="mapEnd"></div></div>
    <details class="summary"><summary>Linha do tempo completa (${G.history.length})</summary>
      <ol>${G.history.map(h => `<li><small>${esc(monthLabel(h.m))}</small> ${esc(h.t)}</li>`).join("")}</ol></details>
    <div class="endings-found">Finais descobertos: ${found} de ${total}.</div>
    <div class="choices"><button class="secondary" id="btnAgain">Nova campanha (escolher modo)</button><button class="secondary" id="btnBack2">← Outros cenários</button></div>
  </div></div><div id="toast" class="toast" role="status"></div>`;
  renderMap($("#mapEnd"), G.control, G.lastMapChanges, true, {});
  $("#btnReplay").onclick = () => startNew({ diff: G.diff || "normal", quick: !!G.quick });
  $("#btnOther").onclick = () => { const b = $("#endHints"); b.innerHTML = otherEndingsHTML(); b.hidden = false; $("#btnHintGo").onclick = openNewCampaign; b.scrollIntoView({ behavior: "smooth", block: "start" }); };
  $("#btnShare").onclick = () => shareEnding(shareText(node, gr, nAch));
  $("#btnAgain").onclick = openNewCampaign;
  $("#btnBack2").onclick = renderMenu;
}
