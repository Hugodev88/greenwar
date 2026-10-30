// js/ui/conselheiro.js — Interface: cartão da conselheira (Marta Siqueira) com 1–2 dicas por mês e o botão "Fazer isso"; opção em Configurações.
/* SET.advisor: "auto" (ligada no Fácil e no Normal, desligada no Difícil), "on" ou "off". As dicas vêm de advisorTips (CORE). */
function advisorOn(){ return !!G && !G.ended && (SET.advisor === "on" || (SET.advisor !== "off" && G.diff !== "dificil")); }
let ADV_TIPS = [];
function advisorHTML(){
  ADV_TIPS = [];
  if (!advisorOn() || UI.advHide === G.turn) return "";
  ADV_TIPS = advisorTips(G, { tab: UI.tab, manual: UI.manual });
  if (!ADV_TIPS.length) return "";
  return `<section class="advisor" aria-label="Conselheira">
    <img class="advpic" src="assets/retratos/${ADVISOR.portrait}.webp" alt="Retrato de ${esc(ADVISOR.name)} (personagem fictícia)" width="64" height="64">
    <div class="advbody"><div class="advwho"><b>${esc(ADVISOR.name)}</b> <span>${esc(ADVISOR.role)}</span></div>
      ${ADV_TIPS.map((t, i) => `<div class="advtip"><div class="advtxt"><b class="advh">${esc(t.head)}</b> <span>${esc(t.text)}</span>${t.sub ? ` <b class="advsub">${esc(t.sub)}</b>` : ""}</div>
        <button class="primary sm" data-adv="${i}">${esc(t.btn || "Fazer isso")}</button></div>`).join("")}
    </div>
    <button class="advx" data-advx title="Esconder até o próximo mês" aria-label="Esconder até o próximo mês">×</button>
  </section>`;
}
function bindAdvisor(){
  document.querySelectorAll("[data-adv]").forEach(b => b.onclick = () => {
    const t = ADV_TIPS[+b.dataset.adv]; if (!t) return;
    if (t.act.k === "tab"){ UI.tab = t.act.tab; renderGame(); return; }
    if (t.act.k === "end"){ const e = $("#btnEnd"); if (e && !e.disabled) e.click(); return; }
    const res = advisorDo(G, t); AUDIO.sfx(res.ok === false ? "click" : "order"); afterAct(res);
  });
  const x = document.querySelector("[data-advx]"); if (x) x.onclick = () => { UI.advHide = G.turn; renderGame(); };
}
function settingsAdvisorHTML(){
  const v = SET.advisor || "auto", r = (val, label) => `<label class="opt"><input type="radio" name="adv" value="${val}" ${v === val ? "checked" : ""}> ${label}</label>`;
  return `<fieldset><legend>Conselheira</legend>
    <p class="muted sm">${esc(ADVISOR.name)}, sua chefe de gabinete, dá 1 ou 2 dicas por mês com o botão “Fazer isso”.</p>
    <div class="opts">${r("auto", "Automática (Fácil e Normal)")}${r("on", "Sempre ligada")}${r("off", "Desligada")}</div></fieldset>`;
}
function bindSettingsAdvisor(rerender){
  document.querySelectorAll("input[name=adv]").forEach(i => i.onchange = () => { SET.advisor = i.value; UI.advHide = null; saveSet(); rerender(); });
}
