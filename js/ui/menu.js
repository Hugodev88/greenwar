// js/ui/menu.js — Interface: menu de cenários, tela de título e começar partida.
/* ---------- Navegação ---------- */
// Só cenários com dados completos e não bloqueados podem ser abertos (1964 está locked; ids antigos/desconhecidos, como o
// cenário de 1924 removido, são recusados). Não há parâmetros de URL; o último cenário salvo em LAST_SCEN_KEY não é reaberto sozinho.
const playable = sc => !!(sc && !sc.soon && !sc.locked && sc.story && sc.campaign);
function setScenario(id){
  const sc = SCENARIOS.find(x => x.id === id);
  if (!playable(sc)) return false;
  SCEN = sc;
  STORY = SCEN.story;
  try{ localStorage.setItem(LAST_SCEN_KEY, id); }catch(e){}
  $("#hdrTitle").textContent = SCEN.title + " · " + SCEN.year;
  return true;
}
function headerButtons(inGame){
  $("#btnMenu").style.visibility = SCEN ? "" : "hidden";
  $("#btnRestart").style.visibility = inGame ? "" : "hidden";
  $("#btnHelp").style.visibility = "";
}
function renderMenu(){
  SCEN = null; STORY = null; G = null;
  $("#hdrTitle").textContent = "Crônicas da Separação";
  headerButtons(false);
  const later = SCENARIOS.filter(sc => !playable(sc)), main = SCENARIOS.filter(playable);
  const feat = main.map(sc => {
    const info = loadInfo(sc), found = getEndings(sc).length;
    const total = Object.values(sc.story.nodes).filter(n => n.ending).length;
    const sv = info.save && !info.save.ended ? info.save : null;
    return `<div class="scen feat" data-id="${sc.id}" tabindex="0" role="button" aria-label="Jogar ${esc(sc.year)} — ${esc(sc.title)}">
      <div class="txt"><div class="yr">${esc(sc.year)}</div><div class="tag">${esc(sc.tag)}</div>
      <h3>${esc(sc.title)}</h3><div class="dt">${esc(sc.date)}</div>
      <div class="who">Você joga como: <strong>${esc(sc.character)}</strong></div>
      <div class="ds">${esc(sc.description)}</div>
      <div class="cta"><span class="go">${sv ? "Continuar — " + esc(monthLabel(sv.month)) : "Jogar"} ▸</span></div>
      <div class="meta"><span>Finais descobertos: ${found}/${total}</span>${sv ? `<span class="saved">● Campanha salva</span>` : ""}</div></div>
      <div class="mapbox" data-map="${sc.id}"></div></div>`;
  }).join("");
  // bloqueados: só leitura de dados estáticos (não lê nem migra saves locais deles)
  const soon = later.map(sc => `<div class="scen soon" aria-disabled="true" title="Indisponível por enquanto"><div class="yr">${esc(sc.year)}</div><div class="tag">${esc(sc.tag || "Próximo cenário")}</div>
      <h3>${esc(sc.title)}</h3><div class="ds">${esc(sc.description || "")}</div><span class="lockbadge">🔒 Em breve</span></div>`).join("");
  $("#app").innerHTML = `<div class="menu-head"><h2>Crônicas da Separação</h2><p>Campanha por turnos mensais: diplomacia, facções, exércitos no mapa e finais diferentes.</p></div>
    ${novPanelHTML()}${feat}${soon ? `<div class="scen-later"><h4>Próximos cenários</h4><div class="scen-grid">${soon}</div></div>` : ""}`;
  for (const sc of main){
    const el = document.querySelector(`[data-map="${sc.id}"]`); if (!el) continue;
    try{ STORY = sc.story; const g0 = newCampaign(sc, 1); renderMap(el, g0.control, [], false, { g: g0, military: true, arrows: [], static: true }); }catch(e){ el.remove(); }
    finally{ STORY = null; }
  }
  bindNovidades($("#app"));
  document.querySelectorAll(".scen[data-id]").forEach(el => {
    const go = () => { if (setScenario(el.dataset.id)) renderTitle(); };
    el.onclick = go; el.onkeydown = e => { if (e.key === "Enter" || e.key === " "){ e.preventDefault(); go(); } };
  });
}
function renderTitle(){
  G = null; headerButtons(false);
  const info = loadInfo(), found = getEndings(), total = Object.values(STORY.nodes).filter(n => n.ending).length, it = SCEN.intro;
  const sv = info.save && !info.save.ended ? info.save : null;
  $("#app").innerHTML = `
    <div class="layout"><div class="card title-screen">
      <div class="chap">${esc(it.kicker)}</div>
      <h2>${esc(it.title)}</h2>
      <div class="sub">${esc(it.sub)}</div>
      ${it.paragraphs.map(p => `<p>${esc(p)}</p>`).join("")}
      <div class="disclaimer">${esc(it.disclaimer)}</div>
      ${info.legacy ? `<div class="notice">Encontramos uma partida salva da versão anterior (só história). Ela não é compatível com o novo modo campanha e foi arquivada; seus finais descobertos foram mantidos.</div>` : ""}
      ${sv && sv.focusMigrated ? `<div class="notice">Sua campanha salva é anterior à árvore de decisões nacionais. Ela continua de onde parou; a árvore começa vazia (focos impostos pela história já vividos foram marcados).</div>` : ""}
      ${sv && sv.milMigrated ? `<div class="notice">Sua campanha salva foi atualizada para o novo sistema de exércitos: suas tropas antigas viraram exércitos no mapa (as forças inimigas de cada frente foram mantidas). Dê ordens selecionando os exércitos na aba Mapa — elas não gastam mais AP.</div>` : ""}
      ${sv ? `<button class="primary" id="btnCont">Continuar — ${esc(monthLabel(sv.month))}</button>` : ""}
      <button class="${sv ? "secondary" : "primary"}" id="btnNew">Nova campanha</button>
      <button class="secondary" id="btnBack">← Outros cenários</button>
      <div class="endings-found">Finais descobertos: ${found.length} de ${total}${found.length ? " — " + found.map(id => esc(STORY.nodes[id] ? STORY.nodes[id].endingName : id)).join(", ") : ""}</div>
    </div>
    <aside class="panel"><h3>Mapa inicial</h3><div class="mapbox" id="mapTitle"></div></aside></div>`;
  const g0 = newCampaign(SCEN, 1);
  renderMap($("#mapTitle"), g0.control, [], false, { g: g0, military: true, arrows: [], static: true });
  if ($("#btnCont")) $("#btnCont").onclick = () => { G = info.save; delete G.focusMigrated; delete G.milMigrated; UI.selArmy = null; UI.selUF = null; UI.tab = "historia"; UI.selFocus = null; UI.fscroll = null; renderGame(); };
  $("#btnNew").onclick = openNewCampaign;
  $("#btnBack").onclick = renderMenu;
}
// opts: { diff } escolhido na janela Nova campanha (js/ui/modos.js)
function startNew(opts){
  UI.selFocus = null; UI.fscroll = null; UI.manual = false; UI.moreTabs = false;
  G = newCampaign(SCEN, 0, opts || lastNewChoice());
  Object.assign(UI, { tab: "historia", selUF: null, selArmy: null, selActor: null, req: [], off: [], dealMsg: null });
  save(); renderGame(); cloud("syncSave", SCEN.id); // estatísticas: só conta quando a campanha chega a um final (achRecord)
}
