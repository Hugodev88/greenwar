// js/ui/jogo.js — Interface: tela principal da campanha (renderGame), avisos (toast) e cabeçalho dos capítulos.
/* ---------- Tela da campanha ---------- */
let toastTimer = null;
function toast(msg, kind){
  const el = $("#toast"); if (!el) return;
  el.textContent = msg; el.className = "toast show " + (kind || ""); announce(msg);
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.className = "toast", 4200);
}
function afterAct(res){ save(); renderGame(); if (res && res.msg) toast(res.msg, res.ok === false || res.result === "refuse" || res.result === "error" ? "bad" : (res.result === "counter" ? "mid" : "good")); }
function renderGame(){
  headerButtons(true);
  if (G.ended){ renderEnding(); return; }
  const C = SCEN.campaign, ph = phaseOf(G), inc = incomeFor(G), myA = armiesOf(G, "player"), totStr = Math.round(sideStr(G, "player"));
  const pend = G.queue.length;
  const apDots = Array.from({ length: Math.max(C.ap, G.ap) }, (_, i) => `<i class="${i < G.ap ? "on" : ""}"></i>`).join("");
  const stats = Object.keys(STORY.stats).map(k => {
    const v = G.stats[k], d = G.lastDelta[k] || 0;
    return `<div class="stat"><div class="lbl"><span>${esc(STORY.stats[k].label)}</span><span class="val">${Math.round(v)}${d ? `<span class="delta ${d>0?"up":"down"}">${sgn(Math.round(d))}</span>` : ""}</span></div><div class="bar"><i style="width:${v}%;background:${STORY.stats[k].color}"></i></div></div>`;
  }).join("");
  const tabs = [["historia", `História${pend ? ` <b class="badge">${pend}</b>` : ""}`], ["mapa", "Mapa"], ["diplomacia", "Diplomacia"], ["faccoes", "Facções"], ["acoes", "Ações"]];
  if (C.focus){ focusInit(G); const idle = !G.focus.active && C.focus.nodes.some(F => focusStatus(G, F).state === "available"); tabs.splice(1, 0, ["decisoes", `Decisões${idle ? ` <b class="badge">!</b>` : ""}`]); }
  if (UI.tab === "decisoes" && !C.focus) UI.tab = "historia";
  // interface simples (Fácil): Diplomacia e Facções ficam atrás do botão "Mais"
  const extra = ["diplomacia", "faccoes"], hideExtra = G.simple && !UI.moreTabs && !extra.includes(UI.tab);
  const shown = hideExtra ? tabs.filter(t => !extra.includes(t[0])) : tabs;
  const nextStory = G.story.pending ? Math.max(0, G.story.due - G.month) : null;
  $("#app").innerHTML = `
    <div class="hud">
      <div class="hud-date"><strong>${esc(monthLabel(G.month))}</strong><small>Turno ${G.turn} · ${esc(ph.label)}${ph.war ? " · em guerra" : ""}</small>${diffBadgeHTML(G)}</div>
      <div class="hud-res">
        <div class="ecocell" data-eco="ap" role="button" tabindex="0" title="De onde vêm suas ações (clique)"><span class="k">Ações <i class="ecoi">i</i></span><span class="ap">${apDots}</span><b>${G.ap}</b>${apSrcLine()}</div>
        <div class="ecocell" data-eco="money" role="button" tabindex="0" title="${esc(C.money.label)}: renda, teto e usos (clique)"><span class="k">${esc(C.money.label)} <i class="ecoi">i</i></span><b class="${G.money < 0 ? "neg" : G.money >= moneyCap(G) ? "capped" : ""}">${Math.round(G.money)}${Number.isFinite(moneyCap(G)) ? `<small class="cap">/${moneyCap(G)}</small>` : ""}</b><small>${sgn(inc.total)}/mês${paceFor(G) > 1 ? ` (×${paceFor(G)} por turno)` : ""}</small></div>
        <div title="${esc(C.forces.label)}" class="hudarmy" data-tab="mapa"><span class="k">${esc(C.forces.short)}</span><b>${totStr}</b><small>${ph.noArmies ? "sem comando" : `${myA.length} exérc. · ordens ${ordersUsed(G)}/${commandLimit(G)}`}</small></div>
      </div>
      <button class="primary endbtn" id="btnEnd" ${pend ? "disabled" : ""} title="${pend ? "Resolva os eventos pendentes na aba História" : "Avança o tempo e resolve economia, combates, facções e diplomacia"}">Encerrar ${paceFor(G) > 1 && !(G.story.pending && G.story.due - G.month < paceFor(G)) ? `${paceFor(G)} meses` : "mês"} ▸</button>
    </div>
    <div class="stats">${stats}</div>
    ${southBarHTML()}
    <nav class="tabs" role="tablist">${shown.map(([id, l]) => `<button class="tab${UI.tab===id?" on":""}" data-tab="${id}" role="tab" aria-selected="${UI.tab===id}" tabindex="${UI.tab===id ? 0 : -1}">${l}</button>`).join("")}${G.simple ? `<button class="tab more" data-more aria-expanded="${!hideExtra}">${hideExtra ? "Mais ▾" : "Menos ▴"}</button>` : ""}</nav>
    ${pend && UI.tab !== "historia" ? `<div class="pendbar">Há ${pend} evento(s) aguardando decisão. <button class="linkbtn" data-tab="historia">Ir para História</button></div>` : ""}
    <div id="tabBody"></div>
    <div id="toast" class="toast"></div>`;
  document.querySelectorAll("[data-tab]").forEach(b => b.onclick = () => { UI.tab = b.dataset.tab; renderGame(); });
  document.querySelectorAll("[data-more]").forEach(b => b.onclick = () => { UI.moreTabs = hideExtra; if (!UI.moreTabs && extra.includes(UI.tab)) UI.tab = "historia"; renderGame(); });
  if ($("#btnSouth")) $("#btnSouth").onclick = openSouth;
  $("#btnEnd").onclick = () => {
    const snap = majorSnap();
    if (!endTurn(G)) return;
    AUDIO.sfx("turn"); announce(`${monthLabel(G.month)}: turno ${G.turn}. ${G.ap} ações disponíveis.`);
    UI.tab = "historia"; UI.dealMsg = null; UI.selArmy = null; save(); cloud("syncSave", SCEN.id); renderGame(); window.scrollTo({ top: 0 });
    const ev = G.mil, major = majorCheck(snap);
    if (ev && !G.ended && ev.month === G.month && (ev.battles.length || ev.flips.length || ev.moves.length)) playResolution(ev, () => showMajor(major));
    else showMajor(major);
  };
  if (UI.tab !== "decisoes" && UI.ffull){ UI.ffull = false; if (!document.querySelector(".overlay, .major")) document.body.classList.remove("noscroll"); }
  ({ historia: tabHistoria, decisoes: tabDecisoes, mapa: tabMapa, diplomacia: tabDiplomacia, faccoes: tabFaccoes, acoes: tabAcoes })[UI.tab]($("#tabBody"), nextStory);
  document.querySelectorAll(".ecocell").forEach(b => { b.onclick = () => openEco(b.dataset.eco); b.onkeydown = e => { if (e.key === "Enter" || e.key === " "){ e.preventDefault(); openEco(b.dataset.eco); } }; }); setTimeout(tutAfterRender, 80);
  AUDIO.setTheme(ph.war ? "war" : G.queue.length && G.queue[0].type !== "story" && findEvent(G, G.queue[0].id) && findEvent(G, G.queue[0].id).crisisOf ? "tense" : "calm"); restoreKbFocus();
}
function chapterKicker(node){
  const ch = node.chapter || "", m = ch.match(/^(Capítulo [^—]+|Capítulo Final|Epílogo|Guerra Civil)/);
  return monthLabel(G.month) + (m ? " · " + m[1].trim() : "");
}
