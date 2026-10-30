// js/ui/ajuda.js — Interface: janela de Ajuda (refazer/pular tutorial, glossário).
/* ---------- Ajuda: refazer/pular tutorial + glossário curto ---------- */
function openHelp(){
  document.querySelectorAll("#helpModal").forEach(x => x.remove());
  const s = tutState(), C = SCEN && SCEN.campaign;
  const m = document.createElement("div");
  m.className = "modal"; m.id = "helpModal"; m.setAttribute("role", "dialog"); m.setAttribute("aria-modal", "true"); m.setAttribute("aria-labelledby", "helpT");
  m.innerHTML = `<div class="modal-card"><h2 id="helpT">Ajuda</h2>
    <p class="muted">O tutorial agora são dicas curtas que aparecem na primeira vez que você abre cada aba.</p>
    <div class="helpgrid">
      <button class="primary" id="hRedo">↻ Refazer tutorial</button>
      <label class="tgl"><input type="checkbox" id="hOn" ${s.off ? "" : "checked"}> Mostrar dicas ao abrir abas novas</label>
    </div>
    <details><summary>Glossário rápido</summary><dl class="gloss">
      <dt>Ações (AP)</dt><dd>Pontos de ação do turno. Quase tudo custa 1 AP. Recarregam a cada mês e não acumulam.${C && C.apScale ? " Em 2022: 3 de base, 4 com Apoio Popular 60+, 5 com 75+; +1 comprando com Recursos (1×/turno)." : ""}</dd>
      <dt>${esc(C ? C.money.label : "Recursos")}</dt><dd>Capital político para gastar em investimentos, agrados, missões e tropas. Ganho por mês: território, economia e facções leais, menos manutenção e sanções. No negativo, você perde apoio todo mês.</dd>
      ${STORY ? Object.entries(STORY.stats).map(([k, v]) => `<dt>${esc(v.label)}</dt><dd>${esc(STAT_HELP[k] || "")} Se chegar a zero, a campanha termina.</dd>`).join("") : ""}
      <dt>Agitação</dt><dd>Tensão em cada estado (0–100). Média acima de 62 nos seus estados derruba o apoio; um estado acima de 88 sem tropas pode se revoltar. Investir, fazer propaganda e negociar com o governador baixam a agitação.</dd>
      <dt>Facções</dt><dd>Lealdade (do seu lado?) e influência (quanto pesam). Lealdade abaixo de 15 com influência 25 ou mais gera crises.</dd>
      <dt>Focos (Decisões)</dt><dd>Projetos de vários meses, um por vez. Ao concluir, aplicam efeitos e liberam opções.</dd>
      <dt>Exércitos e ordens</dt><dd>Contadores azuis no mapa (o número é a força). Ordens não gastam AP; o limite por mês depende do Apoio Militar e da lealdade dos militares.</dd>
    </dl></details>
    <div class="disclaimer">${esc(SCEN ? SCEN.intro.disclaimer : "Obra de ficção / história alternativa.")}</div>
    <div class="row2"><button class="secondary" id="btnHelpClose">Fechar</button></div></div>`;
  document.body.appendChild(m);
  const close = () => { m.remove(); document.removeEventListener("keydown", key, true); };
  const key = e => { if (e.key === "Escape"){ e.preventDefault(); close(); } };
  document.addEventListener("keydown", key, true);
  m.onclick = e => { if (e.target === m) close(); };
  $("#btnHelpClose").onclick = close;
  $("#hOn").onchange = e => { const st = tutState(); st.off = !e.target.checked; tutSave(st); };
  $("#hRedo").onclick = () => { tutReset(); close(); if (G && !G.ended){ UI.tab = UI.tab || "historia"; renderGame(); } else toast && toast("Tutorial reiniciado: as dicas aparecem quando você começar a jogar.", "good"); };
  setTimeout(() => { const x = $("#hRedo"); if (x) x.focus(); }, 30);
}
