// js/ui/iniciar.js — Interface: liga os botões do topo e o teclado, expõe window.GWGame (para a nuvem) e abre o menu.
// Carregado por último.
$("#btnSet").onclick = openSettings;
$("#btnSnd").onclick = () => { AUDIO.unlock(); SET.muted = !SET.muted; saveSet(); announce(SET.muted ? "Som desligado" : "Som ligado"); };
document.addEventListener("keydown", e => {
  if ((e.key === "m" || e.key === "M") && !e.ctrlKey && !e.metaKey && !e.altKey && !/INPUT|TEXTAREA|SELECT/.test((e.target.tagName || ""))){ SET.muted = !SET.muted; saveSet(); announce(SET.muted ? "Som desligado" : "Som ligado"); }
});
// Teclado no mapa: Enter/Espaço em estado ou ficha focados = clique
document.addEventListener("keydown", e => {
  if (e.key !== "Enter" && e.key !== " ") return;
  const t = e.target; if (!t || !t.closest) return;
  const el = t.closest(".mapbox path.uf[tabindex], .mapbox g.cnt[tabindex]"); if (!el) return;
  e.preventDefault(); UI.kbFocus = el.matches("g.cnt") ? `g.cnt[data-uf="${el.dataset.uf}"][data-side="${el.dataset.side}"]` : `path.uf[data-uf="${el.dataset.uf}"]`;
  el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
});
// Abas com setas
document.addEventListener("keydown", e => {
  if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
  const t = e.target; if (!t || !t.matches || !t.matches("nav.tabs button.tab")) return;
  const bs = [...document.querySelectorAll("nav.tabs button.tab")], i = bs.indexOf(t), n = bs[(i + (e.key === "ArrowRight" ? 1 : bs.length - 1)) % bs.length];
  e.preventDefault(); UI.tab = n.dataset.tab; UI.kbFocus = `nav.tabs button.tab[data-tab="${n.dataset.tab}"]`; renderGame();
});
function restoreKbFocus(){ if (!UI.kbFocus) return; const s = UI.kbFocus; UI.kbFocus = null; setTimeout(() => { const el = document.querySelector(s); if (el) el.focus({ preventScroll: true }); }, 20); }

$("#btnMenu").onclick = renderMenu;
$("#btnHelp").onclick = openHelp;
$("#btnRestart").onclick = () => {
  if (confirm(trText("Recomeçar a campanha do início? O progresso atual será perdido."))){
    try{ localStorage.removeItem(SCEN.saveKey); }catch(e){}
    cloud("deleteSave", SCEN.id);
    G = null; renderTitle();
  }
};
// Ponte de leitura para cloud.js (módulo separado; o jogo funciona sem ele)
window.GWGame = {
  scenarios: () => SCENARIOS.filter(playable).map(sc => ({ id: sc.id, year: sc.year, title: sc.title, saveKey: sc.saveKey, endingsKey: sc.endingsKey,
    endings: Object.entries(sc.story.nodes).filter(([, n]) => n.ending).map(([id, n]) => ({ id, name: n.endingName })) })),
  saveVersion: SAVE_VERSION,
  minSaveVersion: 2, // saves v2 da nuvem são aceitos e migrados ao abrir
  monthLabel: m => monthLabel(m),
  current: () => ({ scenario: SCEN ? SCEN.id : null, inGame: !!G }),
  refresh(changed){ // atualiza a tela depois de baixar dados da nuvem
    if (SCEN && !playable(SCEN)){ G = null; renderMenu(); return; }
    if (G && SCEN && changed && changed.includes(SCEN.id)){ G = null; renderTitle(); return; }
    if (!G){ if (SCEN) renderTitle(); else renderMenu(); }
  }
};
applySet(); i18nInit();
renderMenu();
