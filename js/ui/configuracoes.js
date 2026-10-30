// js/ui/configuracoes.js — Interface: preferências (idioma, daltônico, alto contraste, fonte, som) e a janela Configurações.
/* =====================================================================
   FASE 3 — Configurações (idioma, acessibilidade, som), teclado/ARIA e trilha sonora
   Tudo fora do CORE. Preferências em localStorage "gw_settings_v1".
   ===================================================================== */
const SET_KEY = "gw_settings_v1";
const SET_DEF = { lang: "pt", cb: false, hc: false, fs: 100, motion: false, music: 0.45, sfx: 0.7, muted: false };
let SET = (() => { try { return Object.assign({}, SET_DEF, JSON.parse(localStorage.getItem(SET_KEY)) || {}); } catch(e){ return Object.assign({}, SET_DEF); } })();
function saveSet(){ try{ localStorage.setItem(SET_KEY, JSON.stringify(SET)); }catch(e){} applySet(); }
function reduceMotion(){ return SET.motion || !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); }
function applySet(){
  const b = document.body, r = document.documentElement;
  b.classList.toggle("cb", !!SET.cb); b.classList.toggle("hc", !!SET.hc); b.classList.toggle("rm", !!SET.motion);
  r.style.fontSize = SET.fs + "%";
  r.lang = SET.lang === "en" ? "en" : "pt-BR";
  AUDIO.setVol(); sndBtn();
}
// Modo daltônico: cada facção ganha uma textura além da cor (mapa e legenda)
const CB_PATS = [
  [`<path d="M-1,1L1,-1M0,8L8,0M7,9L9,7" stroke="#000" stroke-opacity=".55" stroke-width="1.7"/>`, "repeating-linear-gradient(45deg,#0009 0 2px,transparent 2px 6px)"],
  [`<circle cx="4" cy="4" r="1.5" fill="#fff" fill-opacity=".7"/>`, "radial-gradient(#fffb 1.4px,transparent 1.9px) 0 0/6px 6px"],
  [`<path d="M0,4H8" stroke="#000" stroke-opacity=".5" stroke-width="1.8"/>`, "repeating-linear-gradient(0deg,#0009 0 2px,transparent 2px 6px)"],
  [`<path d="M0,0L8,8M8,0L0,8" stroke="#fff" stroke-opacity=".5" stroke-width="1.1"/>`, "repeating-linear-gradient(45deg,#fff8 0 1px,transparent 1px 5px),repeating-linear-gradient(-45deg,#fff8 0 1px,transparent 1px 5px)"],
  [`<path d="M4,0V8" stroke="#000" stroke-opacity=".5" stroke-width="1.8"/>`, "repeating-linear-gradient(90deg,#0009 0 2px,transparent 2px 6px)"],
  [`<path d="M9,1L7,-1M8,8L0,0M1,9L-1,7" stroke="#fff" stroke-opacity=".55" stroke-width="1.4"/>`, "repeating-linear-gradient(-45deg,#fff9 0 2px,transparent 2px 6px)"],
  [`<rect x="2" y="2" width="4" height="4" fill="#000" fill-opacity=".45"/>`, "linear-gradient(#0007 0 0) 1px 1px/3px 3px"],
  [`<path d="M0,6L2,2L4,6L6,2L8,6" fill="none" stroke="#000" stroke-opacity=".55" stroke-width="1.3"/>`, "repeating-linear-gradient(135deg,#0008 0 1px,transparent 1px 3px)"]
];
function cbIndex(key){ const ks = Object.keys(STORY.factions); return Math.max(0, ks.indexOf(key)) % CB_PATS.length; }
function cbDefs(){ if (!SET.cb || !STORY) return ""; return Object.keys(STORY.factions).map(k => `<pattern id="cbp-${k}" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="${STORY.factions[k].color}"/>${CB_PATS[cbIndex(k)][0]}</pattern>`).join(""); }
function facFill(key){ const f = STORY.factions[key] || STORY.factions[STORY.defaultFaction || "federal"]; return SET.cb && STORY.factions[key] ? `url(#cbp-${key})` : f.color; }
function cbSwatch(key){ return SET.cb && STORY.factions[key] ? `;background-image:${CB_PATS[cbIndex(key)][1]}` : ""; }


/* ---------- Menu de Configurações ---------- */
function openSettings(){
  document.querySelectorAll("#setModal").forEach(x => x.remove());
  const m = document.createElement("div");
  m.className = "modal"; m.id = "setModal"; m.setAttribute("role", "dialog"); m.setAttribute("aria-modal", "true"); m.setAttribute("aria-labelledby", "setT");
  const rad = (name, val, cur, label) => `<label class="opt"><input type="radio" name="${name}" value="${val}" ${String(cur) === String(val) ? "checked" : ""}> ${label}</label>`;
  m.innerHTML = `<div class="modal-card setcard"><h2 id="setT">Configurações</h2>
    <fieldset><legend>Idioma / Language</legend><div class="opts">${rad("lang", "pt", SET.lang, "Português (Brasil)")}${rad("lang", "en", SET.lang, "English")}</div>
      <p class="muted sm">Em inglês: interface, tutorial e grandes eventos estão traduzidos; os demais eventos da história ainda aparecem em português.</p></fieldset>
    ${settingsCampaignHTML()}
    <fieldset><legend>Acessibilidade</legend>
      <label class="tgl"><input type="checkbox" id="sCb" ${SET.cb ? "checked" : ""}> <span><b>Modo daltônico</b> — texturas (listras, pontos, xadrez) em cada facção do mapa, além da cor</span></label>
      <label class="tgl"><input type="checkbox" id="sHc" ${SET.hc ? "checked" : ""}> <span><b>Alto contraste</b> — textos mais claros, bordas fortes e foco bem visível</span></label>
      <label class="tgl"><input type="checkbox" id="sRm" ${SET.motion ? "checked" : ""}> <span><b>Reduzir animações</b> — sem pulsos, setas animadas e tremores</span></label>
      <div class="frow"><span>Tamanho do texto</span><div class="opts">${rad("fs", 100, SET.fs, "Normal")}${rad("fs", 115, SET.fs, "Grande")}${rad("fs", 130, SET.fs, "Muito grande")}</div></div>
    </fieldset>
    <fieldset><legend>Som</legend>
      <label class="tgl"><input type="checkbox" id="sMute" ${SET.muted ? "checked" : ""}> <span><b>Silenciar tudo</b> (atalho: tecla M)</span></label>
      <div class="frow"><label for="sMus">Música</label><input type="range" id="sMus" min="0" max="100" value="${Math.round(SET.music * 100)}"><output id="oMus">${Math.round(SET.music * 100)}%</output></div>
      <div class="frow"><label for="sFx">Efeitos</label><input type="range" id="sFx" min="0" max="100" value="${Math.round(SET.sfx * 100)}"><output id="oFx">${Math.round(SET.sfx * 100)}%</output></div>
      <p class="muted sm">Trilha e efeitos são gerados no próprio navegador (sem arquivos de áudio). O som só começa depois do seu primeiro toque ou tecla. Em guerra, a trilha fica mais tensa. <button class="linkbtn" id="sTest">Testar efeito</button></p>
    </fieldset>
    <details><summary>Atalhos de teclado</summary><ul class="keys">
      <li><kbd>Tab</kbd> / <kbd>Shift+Tab</kbd>: percorrer botões, estados do mapa e fichas de exército</li>
      <li><kbd>Enter</kbd> ou <kbd>Espaço</kbd>: ativar (no mapa, selecionar estado/exército e escolher destino)</li>
      <li><kbd>←</kbd> <kbd>→</kbd> nas abas: trocar de aba</li>
      <li><kbd>Esc</kbd>: fechar janelas, cancelar a prévia de ordem ou soltar o exército</li>
      <li><kbd>M</kbd>: ligar/desligar o som</li></ul></details>
    <div class="row2"><button class="primary" id="btnSetClose">Fechar</button></div></div>`;
  document.body.appendChild(m);
  const close = () => { m.remove(); document.removeEventListener("keydown", key, true); const b = $("#btnSet"); if (b) b.focus(); };
  const key = e => { if (e.key === "Escape"){ e.stopPropagation(); close(); } };
  document.addEventListener("keydown", key, true);
  m.onclick = e => { if (e.target === m) close(); };
  $("#btnSetClose").onclick = close;
  const rerender = () => { if (G && !G.ended) renderGame(); else if (G && G.ended) renderGame(); else if (SCEN) renderTitle(); else renderMenu(); };
  m.querySelectorAll("input[name=lang]").forEach(i => i.onchange = () => { SET.lang = i.value; saveSet(); i18nSwitch(); rerender(); });
  m.querySelectorAll("input[name=fs]").forEach(i => i.onchange = () => { SET.fs = +i.value; saveSet(); });
  bindSettingsCampaign(rerender);
  $("#sCb").onchange = e => { SET.cb = e.target.checked; saveSet(); rerender(); };
  $("#sHc").onchange = e => { SET.hc = e.target.checked; saveSet(); };
  $("#sRm").onchange = e => { SET.motion = e.target.checked; saveSet(); };
  $("#sMute").onchange = e => { SET.muted = e.target.checked; saveSet(); };
  $("#sMus").oninput = e => { SET.music = e.target.value / 100; $("#oMus").textContent = e.target.value + "%"; saveSet(); };
  $("#sFx").oninput = e => { SET.sfx = e.target.value / 100; $("#oFx").textContent = e.target.value + "%"; saveSet(); };
  $("#sTest").onclick = () => { AUDIO.unlock(); AUDIO.sfx("win"); };
  setTimeout(() => { const c = m.querySelector("input[name=lang]:checked"); if (c) c.focus(); }, 30);
}
