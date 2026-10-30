// js/ui/conselheiro.js — Interface: cartão da conselheira (Marta Siqueira) com 1–2 dicas por mês e o botão "Fazer isso"; no caminho do golpe, o quadro "Prontidão do golpe"; opção em Configurações.
/* SET.advisor: "auto" (ligada no Fácil e no Normal, desligada no Difícil), "on" ou "off". As dicas vêm de advisorTips (CORE). */
function advisorOn(){ return !!G && !G.ended && (SET.advisor === "on" || (SET.advisor !== "off" && G.diff !== "dificil")); }
let ADV_TIPS = [];
function advisorHTML(){
  ADV_TIPS = [];
  if (!advisorOn() || UI.advHide === G.turn) return "";
  ADV_TIPS = advisorTips(G, { tab: UI.tab, manual: UI.manual });
  if (!ADV_TIPS.length) return "";
  const cs = coupState(G), K = cs && golpeCfg(G);
  return `<section class="advisor${cs ? " golpe" : ""}" aria-label="Conselheira">
    <img class="advpic" src="assets/retratos/${ADVISOR.portrait}.webp" alt="Retrato de ${esc(ADVISOR.name)} (personagem fictícia)" width="64" height="64">
    <div class="advbody"><div class="advwho"><b>${esc(ADVISOR.name)}</b> <span>${esc(cs ? K.falas.role : ADVISOR.role)}</span></div>
      ${ADV_TIPS.map((t, i) => `<div class="advtip"><div class="advtxt"><b class="advh">${esc(t.head)}</b> <span>${esc(t.text)}</span>${t.sub ? ` <b class="advsub">${esc(t.sub)}</b>` : ""}</div>
        <button class="primary sm" data-adv="${i}">${esc(t.btn || "Fazer isso")}</button></div>`).join("")}
      ${cs && cs !== "dia" ? coupBoxHTML(cs) : ""}
    </div>
    <button class="advx" data-advx title="Esconder até o próximo mês" aria-label="Esconder até o próximo mês">×</button>
  </section>`;
}
function bindAdvisor(){
  document.querySelectorAll("[data-adv]").forEach(b => b.onclick = () => {
    const t = ADV_TIPS[+b.dataset.adv]; if (!t) return;
    if (t.act.k === "tab"){ UI.tab = t.act.tab; renderGame(); return; }
    if (t.act.k === "choose"){ // escolha da história: mesmo caminho do clique na opção (grandes eventos, som, rolagem)
      const c = document.querySelector(`.card.story .choice[data-i="${t.act.i}"]`);
      if (c && !c.disabled){ G.stat.adv = (G.stat.adv || 0) + 1; c.click(); } return; }
    if (t.act.k === "end"){ const e = $("#btnEnd"); if (e && !e.disabled) e.click(); return; }
    const res = advisorDo(G, t); AUDIO.sfx(res.ok === false ? "click" : "order"); afterAct(res);
  });
  const x = document.querySelector("[data-advx]"); if (x) x.onclick = () => { UI.advHide = G.turn; renderGame(); };
}
// Quadro "Prontidão do golpe": % + barra; o detalhe depende da dificuldade (Fácil mostra tudo, Difícil só o principal)
function coupBoxHTML(cs){
  const R = coupReadiness(G), T = golpeCfg(G).falas, det = coupDetail(G); if (!R) return "";
  const tone = R.pct >= 75 ? "hi" : R.pct >= 50 ? "mid" : "lo";
  const troop = { sim: T.tropasSim, talvez: T.tropasTalvez, nao: T.tropasNao }[R.troops];
  const reqLi = (r, nums) => `<li><b>${esc(r.label)}</b>${nums ? ` <span>${r.now}/${r.need}</span>` : ""}</li>`;
  const miss = det >= 3 ? R.missing : det === 2 ? R.missing.slice(0, 3) : R.missing.slice(0, 1);
  const head = `<div class="couphead"><b>${esc(T.pront)}</b><em class="${tone}">${R.pct}%</em></div><div class="coupbar" role="progressbar" aria-valuenow="${R.pct}" aria-valuemin="0" aria-valuemax="100"><i class="${tone}" style="width:${R.pct}%"></i></div>`;
  if (cs === "porta") return `<div class="coupbox">${head}<div class="coupline"><span>${esc(T.hora)}</span> <b>${esc(R.hora)}</b></div>${det >= 3 ? `<div class="coupline sm">${esc(gfmt(T.previsao, R.forecast.now, R.forecast.proj, R.forecast.need))}</div>` : ""}</div>`;
  return `<div class="coupbox">${head}
    ${det >= 2 ? `<div class="coupline"><span>${esc(T.tropas)}</span> <b class="tr-${R.troops}">${esc(troop)}</b></div>` : ""}
    ${det >= 3 ? `<div class="coupline sm">${esc(gfmt(T.previsao, R.forecast.now, R.forecast.proj, R.forecast.need))}</div>` : ""}
    ${miss.length ? `<div class="coupline"><span>${esc(T.falta)}</span></div><ul class="coupreq">${miss.map(r => reqLi(r, det >= 2)).join("")}</ul>` : `<div class="coupline"><b>${esc(T.pronto)}</b></div>`}
    ${det >= 2 ? `<div class="coupline"><span>${esc(T.hora)}</span> <b>${esc(R.hora)}</b></div>` : ""}
    ${det >= 2 && R.risks.length ? `<div class="coupline"><span>${esc(T.riscos)}</span></div><ul class="coupreq risk">${(det >= 3 ? R.risks : R.risks.slice(0, 2)).map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}
  </div>`;
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
