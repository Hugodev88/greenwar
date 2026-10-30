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
      <dt>Focos (Decisões)</dt><dd>Projetos de 1 ou 2 meses, um por vez. Ao concluir, aplicam efeitos e liberam opções. Alguns só aparecem em certos momentos (guerra longa, Tensão no Sul alta, apoio alto, depois de um revés) — o jogo avisa com ✨.</dd>
      <dt>Oportunidades (⚡)</dt><dd>Focos curtos que abrem quando a situação permite e somem em poucos meses se você não aproveitar. Muitos voltam mais tarde.</dd>
      <dt>Sem prazo</dt><dd>A campanha completa não acaba por data: ela continua até você vencer ou perder (ou escolher um final). Só a partida rápida tem prazo curto.</dd>
      <dt>Cansaço da guerra</dt><dd>Depois de 12 meses de combate, o Apoio Popular cai aos poucos e as frentes ficam mais voláteis, para que o impasse se resolva.</dd>
      ${SCEN && SCEN.id === "brasil2022" ? `<dt>Recife e Brasília</dt><dd>Na guerra, a resistência instala o governo constitucional no Recife. Tomar a região de Recife vence a guerra; perder Brasília (DF) é a derrota. A Liga do Sul tem capital em Porto Alegre. O cartão da frente mostra quantas regiões faltam até lá, e o mapa mostra o caminho mais curto.</dd>
      <dt>Rompimento</dt><dd>Com força 1,5× maior e o mês ganho, a linha inimiga desaba e o atacante avança várias regiões seguidas rumo à capital, sempre por regiões vizinhas. Quem segura a linha logo depois estabiliza a frente.</dd>` : ""}
      <dt>Zoom do mapa</dt><dd>Roda do mouse, gesto de pinça ou os botões + e − aproximam o mapa; arraste para mover; ⟲ volta ao mapa inteiro. Com o mapa selecionado, as teclas + e − e as setas também funcionam.</dd>
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
