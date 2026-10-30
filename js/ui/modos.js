// js/ui/modos.js — Interface: janela "Nova campanha" (dificuldade e duração), selo de dificuldade no HUD e o modo simples do Fácil.
const NEWC_KEY = "gw_newcamp_v1"; // última escolha na janela Nova campanha (dificuldade e duração)
function lastNewChoice(){ try{ return Object.assign({ diff: "normal", quick: false }, JSON.parse(localStorage.getItem(NEWC_KEY)) || {}); }catch(e){ return { diff: "normal", quick: false }; } }
// Selo no HUD: ícone + nome da dificuldade (+ "Rápida")
function diffBadgeHTML(g){
  const D = diffOf(g);
  return `<span class="dbadge d-${esc(g.diff || "normal")}" title="Dificuldade (veja em Configurações)"><i aria-hidden="true">${D.icone}</i><span>${esc(D.label)}</span>${g.quick ? `<span class="dq">Rápida</span>` : ""}</span>`;
}
function openNewCampaign(){
  document.querySelectorAll("#newModal").forEach(x => x.remove());
  const last = lastNewChoice(), hasQuick = !!SCEN.campaign.rapida, info = loadInfo(), sv = info.save && !info.save.ended;
  const pick = { diff: DIFICULDADES[last.diff] ? last.diff : "normal", quick: hasQuick && !!last.quick };
  const m = document.createElement("div");
  m.className = "modal"; m.id = "newModal"; m.setAttribute("role", "dialog"); m.setAttribute("aria-modal", "true"); m.setAttribute("aria-labelledby", "newT");
  const close = () => { m.remove(); document.removeEventListener("keydown", key, true); };
  const key = e => { if (e.key === "Escape"){ e.stopPropagation(); close(); } };
  const card = (on, attrs, icon, title, text, extra) => `<button class="diffc${on ? " on" : ""}" role="radio" aria-checked="${on}" ${attrs}><span class="di" aria-hidden="true">${icon}</span><b>${esc(title)}</b>${extra || ""}<small>${esc(text)}</small></button>`;
  const draw = () => {
    m.innerHTML = `<div class="modal-card newcard"><h2 id="newT">Nova campanha</h2>
      <h3 class="nch">Dificuldade</h3>
      <div class="diffs" role="radiogroup" aria-label="Dificuldade">${DIF_ORDEM.map(id => { const D = DIFICULDADES[id];
        return card(pick.diff === id, `data-diff="${id}"`, D.icone, D.label, D.resumo, id === "facil" ? `<em class="rec">Recomendado para começar</em>` : ""); }).join("")}</div>
      ${hasQuick ? `<h3 class="nch">Duração</h3><div class="diffs two" role="radiogroup" aria-label="Duração">
        ${card(!pick.quick, `data-quick="0"`, "📜", "Campanha completa", "Cerca de 12 a 20 meses de jogo (turnos). A história no ritmo normal.")}
        ${card(pick.quick, `data-quick="1"`, "⏱", "Partida rápida", "Cerca de 8 a 11 turnos (20 a 30 minutos). O tempo passa mais depressa e os eventos-chave chegam antes.")}</div>` : ""}
      <p class="muted sm newnote">${pick.diff === "facil" ? "No Fácil, a interface fica mais simples: os exércitos agem sozinhos, a conversão de Recursos some e as escolhas que encerram a campanha avisam antes." : "A dificuldade fica fixa até o fim da campanha. Você pode conferir qual é em Configurações."}</p>
      ${sv ? `<p class="notice">Começar uma nova campanha substitui a campanha salva.</p>` : ""}
      <div class="row2"><button class="primary" id="btnNewGo">Começar</button><button class="secondary" id="btnNewCancel">Cancelar</button></div></div>`;
    m.querySelectorAll("[data-diff]").forEach(b => b.onclick = () => { pick.diff = b.dataset.diff; draw(); const x = m.querySelector(`[data-diff="${pick.diff}"]`); if (x) x.focus(); });
    m.querySelectorAll("[data-quick]").forEach(b => b.onclick = () => { pick.quick = b.dataset.quick === "1"; draw(); const x = m.querySelector(`[data-quick="${pick.quick ? 1 : 0}"]`); if (x) x.focus(); });
    $("#btnNewCancel").onclick = close;
    $("#btnNewGo").onclick = () => { try{ localStorage.setItem(NEWC_KEY, JSON.stringify(pick)); }catch(e){} close(); startNew(pick); };
  };
  document.body.appendChild(m); draw();
  document.addEventListener("keydown", key, true);
  m.onclick = e => { if (e.target === m) close(); };
  setTimeout(() => { const c = m.querySelector(".diffc.on"); if (c) c.focus(); }, 30);
}
// Configurações → Campanha atual (dificuldade fixa; interface simples pode ser ligada/desligada)
function settingsCampaignHTML(){
  if (!G || G.ended) return "";
  const D = diffOf(G);
  return `<fieldset><legend>Campanha atual</legend>
    <div class="frow"><span>Dificuldade</span><b>${D.icone} ${esc(D.label)}</b></div>
    <div class="frow"><span>Duração</span><b>${G.quick ? "Partida rápida" : "Campanha completa"}</b></div>
    <label class="tgl"><input type="checkbox" id="sSimple" ${G.simple ? "checked" : ""}> <span><b>Interface simples</b> — exércitos no automático, conversão de Recursos escondida e Diplomacia/Facções em “Mais”</span></label>
    <p class="muted sm">A dificuldade e a duração são escolhidas ao começar uma campanha e não mudam no meio dela.</p></fieldset>`;
}
function bindSettingsCampaign(rerender){
  const s = $("#sSimple"); if (!s) return;
  s.onchange = e => { G.simple = e.target.checked; if (G.simple && (G.autoOrders || "off") === "off") G.autoOrders = "auto"; UI.manual = false; save(); rerender(); };
}
// Modo simples, aba Mapa em guerra: resumo dos exércitos no automático (o comando manual fica num botão)
function simpleArmiesHTML(){
  if (frontMode(G)) return simpleFrontsHTML();
  const mine = armiesOf(G, "player"), auto = (G.autoOrders || "off") !== "off";
  return `<h3>Meus exércitos</h3><div class="simplebox">
    <p>${auto ? `🤖 <b>Seus exércitos lutam sozinhos.</b> Todo mês, quem está sem ordem ${G.autoOrders === "auto" ? "ataca onde a chance é boa e defende o resto." : "defende as fronteiras."}` : `⏸ <b>As ordens automáticas estão desligadas.</b> Seus exércitos vão ficar parados.`}</p>
    ${mine.length ? `<ul class="simplearmies">${mine.map(a => `<li><b>${esc(a.name)}</b><span>${armyLine(a)}</span></li>`).join("")}</ul>` : `<p class="muted">Nenhum exército em campo. Recrute abaixo.</p>`}
    <div class="row2">${auto ? "" : `<button class="primary sm" data-auto-on>🤖 Ligar ordens automáticas</button>`}<button class="secondary sm" data-manual="1">Comandar manualmente</button></div></div>`;
}
