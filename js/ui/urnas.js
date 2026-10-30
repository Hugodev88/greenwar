// js/ui/urnas.js — Interface: barra "Contestação das urnas" (progresso, credibilidade e escalada) e a janela explicativa.
/* ---------- Contestação das urnas: barra e janela ---------- */
function urnaBarHTML(){
  if (!urnaOn(G)) return "";
  const U = G.urna, K = urnaCfg(G), L = urnaLevel(G), julg = !G.visited.includes("julgamento_tse"), meta = urnaMeta(G);
  const mini = (k, v, col, mark, cls) => `<span class="ubk">${k}</span><span class="sbar ubar" aria-hidden="true"><i style="width:${v}%;background:${col}"></i>${mark !== null ? `<u class="${cls || ""}" style="left:${mark}%"></u>` : ""}</span><b class="uv">${v}</b>`;
  const tail = julg ? `Julgamento no TSE: precisa de ${meta}` : G.visited.includes("posse_adiada") ? "Veredito: precisa de 100" : "Chegue a 100 para vencer";
  return `<button class="southbar urnabar ${L.k}${L.k === "bad" ? " pulse" : ""}" id="btnUrna" aria-label="Contestação das urnas: progresso ${U.prog} de 100, credibilidade ${U.cred}, escalada ${U.esc}. Abrir detalhes.">
    <span class="sk">🗳️ Contestação das urnas</span>
    <span class="ugrid">${mini("Progresso", U.prog, "#c9a45c", julg ? meta : null)}${mini("Credibilidade", U.cred, "#5b8fd0", K.warnCred, "w")}${mini("Escalada", U.esc, "#c2563f", K.warnEsc, "w")}</span>
    <span class="swl">${esc(L.label)}</span><span class="st">${esc(tail)} · <u>como vencer?</u></span></button>`;
}
function openUrna(){
  if (!urnaOn(G)) return;
  const U = G.urna, K = urnaCfg(G), C = SCEN.campaign, pas = Math.round(urnaPassive(G) * 10) / 10, mult = Math.round(urnaMult(G) * 100) / 100, det = coupDetail(G);
  const acts = visibleActions(G).filter(a => a.cat === "urna");
  const julgM = monthLabel(parseYM(C.storyAt.julgamento_tse)), verM = monthLabel(parseYM(C.storyAt.veredito));
  const html = `<h2>🗳️ Contestação das urnas</h2>
    <p>Você está tentando virar o resultado sem guerra: auditorias, tribunais, Congresso e ruas, sempre dentro da lei. São três números de 0 a 100:</p>
    <div class="sthr"><span><b>Progresso ${U.prog}/100</b><br>em 100, o TSE anula o resultado e você vence</span><span style="border-color:#5b8fd0"><b>Credibilidade ${U.cred}</b><br>em 0, você fica inelegível (derrota)</span><span style="border-color:#c2563f"><b>Escalada ${U.esc}</b><br>em 100, as ruas saem do controle e a crise vai para os quartéis</span></div>
    <h3>O calendário</h3>
    <ul><li><b>${julgM}</b> — <b>julgamento no TSE</b><br>com ${urnaMeta(G)} ou mais de progresso, a posse é adiada e a disputa continua; abaixo disso, a contestação acaba.</li>
    <li><b>${verM}</b> — <b>veredito</b><br>só vence com 100. Com credibilidade muito baixa, o TSE declara você inelegível.</li>
    <li>Na abertura, cada turno é uma quinzena: use bem as ações de cada uma. Depois, cada turno vira um mês.</li></ul>
    <h3>Como sobe e como cai</h3>
    <ul><li>${det >= 2 ? `Progresso: as ações abaixo, os focos do ramo “Contestação institucional” (aba Decisões) e as escolhas nos eventos. Também sobe sozinho com Apoio Popular, Base Política e Centrão altos (agora +${pas} por quinzena).` : "Progresso: as ações abaixo, os focos do ramo “Contestação institucional” (aba Decisões) e as escolhas nos eventos. Também sobe sozinho com Apoio Popular, Base Política e Centrão altos."}</li>
    <li>${det >= 2 ? `Credibilidade multiplica o progresso (agora ×${mult}): redes e ataques aos ministros a derrubam; peritos, observadores e calma a recuperam.` : "Credibilidade multiplica o progresso: redes e ataques aos ministros a derrubam; peritos, observadores e calma a recuperam."}</li>
    <li>Escalada: atos e bloqueios esquentam as ruas; ela esfria ${K.esfria} por quinzena e com “Baixar a temperatura”. Acima de 60, também corrói a credibilidade.</li></ul>
    <h3>Ações da contestação</h3>
    <div class="sacts">${acts.map(a => { const s2 = actionState(G, a); return `<button class="act" data-uact="${a.id}" ${s2.ok ? "" : "disabled"}><span>${esc(a.name)}</span><em>${a.ap ?? 1} AP${a.cost ? ` · ${a.cost} ${esc(C.money.short)}` : ""}</em><small>${esc(a.desc)}</small><small class="fx">${esc(fxSummary(G, a.fx))}</small>${s2.ok ? "" : `<small class="why">${esc(s2.why)}</small>`}</button>`; }).join("")}</div>`;
  openModal(html, m => m.querySelectorAll("[data-uact]").forEach(b => b.onclick = () => { const snap = majorSnap(); const r2 = doAction(G, b.dataset.uact); closeModal(); afterAct(r2); showMajor(majorCheck(snap)); }));
}
