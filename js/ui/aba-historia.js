// js/ui/aba-historia.js — Interface: aba História.
function tabHistoria(el, nextStory){
  const q = G.queue[0];
  let html = "";
  if (q){
    const choices = queueChoices(G);
    if (q.type === "story"){
      const node = nodeView(G, STORY.nodes[q.node]);
      html += `<div class="card story"><div class="chap">${esc(chapterKicker(node))} · Evento-chave</div><h2>${esc(node.title)}</h2>
        ${node.text.map(p => `<p>${esc(p)}</p>`).join("")}
        ${G.lastMapChanges.length ? `<div class="mapnotes">${changeNotes(G.lastMapChanges).map(t => `<div>Mapa: ${esc(t)}</div>`).join("")}</div>` : ""}
        <div class="choices">${choices.map((c, i) => `<button class="choice" data-i="${i}" ${c.ok?"":"disabled"}>${esc(c.text)}${c.ok ? endTagHTML(i) : `<small>${esc(describeReq(c.req))}</small>`}</button>`).join("")}</div></div>`;
    } else {
      const ev = findEvent(G, q.id), crisis = !!ev.crisisOf;
      html += `<div class="card event ${crisis ? "crisis" : ""}"><div class="chap">${esc(monthLabel(G.month))} · ${crisis ? "Crise de facção" : ev.chained ? "Desdobramento" : "Evento"}</div><h2>${esc(ev.title)}</h2>
        ${eventText(G, q).map(p => `<p>${esc(p)}</p>`).join("")}
        <div class="choices">${choices.map((c, i) => `<button class="choice" data-i="${i}" ${c.ok?"":"disabled"}>${esc(c.text)}<small>${c.ok ? esc(fxSummary(G, c.fx) || (ev.generic ? (i === 0 ? "Opinião do parceiro +10, legitimidade −3, nacionalistas −10" : "Opinião −25, dependência −25, apoio +3") : "")) : esc(describeReq(c.req))}</small></button>`).join("")}</div></div>`;
    }
    if (G.queue.length > 1) html += `<div class="hint">Depois deste, mais ${G.queue.length - 1} evento(s) na fila.</div>`;
  } else {
    html += `<div class="card quiet"><div class="chap">${esc(monthLabel(G.month))}</div><h2>Sem eventos pendentes</h2>
      <p>Use seus <strong>${G.ap} pontos de ação</strong> nas abas ${SCEN.campaign.focus ? `<a href="#" data-go="decisoes">Decisões</a>, ` : ""}<a href="#" data-go="acoes">Ações</a>, <a href="#" data-go="mapa">Mapa</a>, <a href="#" data-go="diplomacia">Diplomacia</a> e <a href="#" data-go="faccoes">Facções</a>. Depois, clique em <strong>Encerrar mês</strong>.</p>
      ${SCEN.campaign.focus ? (G.focus.active ? `<div class="hint">Foco nacional em andamento: <strong>${esc(focusName(G, G.focus.active))}</strong> (${G.focus.prog}/${focusDef(G, G.focus.active).months} meses).</div>` : `<div class="hint">Nenhum foco nacional em andamento — <a href="#" data-go="decisoes">escolha um na aba Decisões</a>.</div>`) : ""}
      ${nextStory !== null ? `<div class="hint">Próximo evento-chave da história ${nextStory <= 0 ? "no próximo turno" : `em cerca de ${nextStory} ${nextStory === 1 ? "mês" : "meses"}`}.</div>` : ""}</div>`;
  }
  if (G.log.length){
    const L = G.log[0];
    const bl = (G.battleLog || []).filter(b => b.month === L.m);
    html += `<div class="card report"><h3>Relatório — ${esc(monthLabel(L.m))}</h3>${bl.length ? `<div class="ordhead" style="margin-top:0"><b>Batalhas do mês (${bl.length})</b><span>toque para ver por que venceu ou perdeu</span></div>${battleRowsHTML(bl)}<div style="height:10px"></div>` : ""}<ul>${L.lines.map(l => `<li class="${l.k}">${esc(l.t)}</li>`).join("")}</ul></div>`;
  }
  const older = (G.battleLog || []).filter(b => !G.log.length || b.month !== G.log[0].m);
  if (older.length) html += `<details class="card hist" id="oldBattles"><summary>Batalhas anteriores (${older.length})</summary>${battleRowsHTML(older.slice().reverse())}</details>`;
  if (G.history.length){
    html += `<details class="card hist"><summary>Suas decisões (${G.history.length})</summary><ol>${G.history.map(h => `<li><small>${esc(monthLabel(h.m))}</small> ${esc(h.t)}</li>`).join("")}</ol></details>`;
  }
  el.innerHTML = html;
  el.querySelectorAll(".choice").forEach(b => b.onclick = () => { const snap = majorSnap(); choose(G, +b.dataset.i); save(); renderGame(); window.scrollTo({ top: 0, behavior: "smooth" }); showMajor(majorCheck(snap)); });
  el.querySelectorAll(".batlist").forEach((box, bi) => {
    const list = box.closest("#oldBattles") ? older.slice().reverse() : (G.battleLog || []).filter(b => G.log.length && b.month === G.log[0].m);
    box.querySelectorAll("[data-bat]").forEach(btn => btn.onclick = () => openBattle(list[+btn.dataset.bat]));
  });
  el.querySelectorAll("[data-go]").forEach(a => a.onclick = e => { e.preventDefault(); UI.tab = a.dataset.go; renderGame(); });
}
// Modo simples (Fácil): avisa quando a escolha encerra a campanha agora, e com que resultado
function endTagHTML(i){
  if (!G.simple) return "";
  const p = choicePreview(G, i); if (!p) return "";
  return `<small class="endtag ${p.outcome}">${p.outcome === "derrota" ? "⚠" : "🏁"} Encerra a campanha agora: ${p.outcome === "vitoria" ? "vitória" : p.outcome === "derrota" ? "derrota" : "final intermediário"}</small>`;
}
function describeReq(req){
  if (!req) return "";
  const parts = [];
  if (req.min) for (const k in req.min) parts.push(`${STORY.stats[k] ? STORY.stats[k].label : k} ≥ ${req.min[k]}`);
  if (req.max) for (const k in req.max) parts.push(`${STORY.stats[k] ? STORY.stats[k].label : k} ≤ ${req.max[k]}`);
  if (req.money) parts.push(`${SCEN.campaign.money.short} ≥ ${req.money.min}`);
  if (req.flags || req.noFlags || req.phase) parts.push("depende de uma decisão anterior");
  return "Requer: " + parts.join(", ");
}
