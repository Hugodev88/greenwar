// js/ui/novidades.js — Interface: painel "Novidades" da tela inicial (fase 16) e a lista completa (dados em js/data/novidades.js).
// A marca "novo" aparece até o jogador abrir a lista completa ou fechar o painel (localStorage gw_novidades_v1 = última versão vista).
const NOV_KEY = "gw_novidades_v1";
function novSeen(){ try { return localStorage.getItem(NOV_KEY) || ""; } catch(e){ return ""; } }
function novMark(){ try { localStorage.setItem(NOV_KEY, NOVIDADES[0].v); } catch(e){} }
function novDate(s){ const [y, m, d] = String(s).split("-"); return d ? `${d}/${m}/${y}` : s; }
function novPanelHTML(){
  if (typeof NOVIDADES === "undefined" || !NOVIDADES.length) return "";
  const N = NOVIDADES[0], fresh = novSeen() !== N.v;
  if (!fresh && UI.novMin) return `<div class="novmini"><button class="secondary sm" data-novall>🆕 <span>Novidades</span> · v${esc(N.v)}</button></div>`;
  return `<section class="novpanel" aria-labelledby="novTit">
    <div class="novhead"><h3 id="novTit">🆕 <span>Novidades</span>${fresh ? ` <span class="novbadge">novo</span>` : ""}</h3>
      <button class="novx" data-novx aria-label="Fechar">✕</button></div>
    <div class="novver"><b>v${esc(N.v)}</b> · ${esc(novDate(N.data))} · <span>${esc(N.titulo)}</span></div>
    <ul class="novlist">${N.itens.map(t => `<li>${esc(t)}</li>`).join("")}</ul>
    <button class="secondary sm" data-novall>Ver todas as novidades</button></section>`;
}
function bindNovidades(root){
  (root || document).querySelectorAll("[data-novall]").forEach(b => b.onclick = e => { e.stopPropagation(); openNovidades(); });
  (root || document).querySelectorAll("[data-novx]").forEach(b => b.onclick = e => { e.stopPropagation(); novMark(); UI.novMin = true; renderMenu(); });
}
function openNovidades(){
  novMark(); closeOverlay("novall");
  const o = document.createElement("div"); o.id = "novall"; o.className = "overlay novov";
  o.innerHTML = `<div class="novmodal" role="dialog" aria-modal="true" aria-labelledby="novAllTit"><div class="novhead"><h2 id="novAllTit">🆕 <span>Todas as novidades</span></h2><button class="novx" data-close aria-label="Fechar">✕</button></div>
    <div class="novscroll">${NOVIDADES.map((N, i) => `<article class="novitem${i ? "" : " cur"}"><div class="novver"><b>v${esc(N.v)}</b> · ${esc(novDate(N.data))}${i ? "" : ` <span class="novbadge">atual</span>`}</div><h4>${esc(N.titulo)}</h4>
      <ul class="novlist">${N.itens.map(t => `<li>${esc(t)}</li>`).join("")}</ul></article>`).join("")}</div></div>`;
  document.body.appendChild(o); document.body.classList.add("noscroll");
  const close = () => { document.removeEventListener("keydown", k); closeOverlay("novall"); if (!G && !SCEN) renderMenu(); };
  const k = e => { if (e.key === "Escape") close(); };
  document.addEventListener("keydown", k);
  o.querySelector("[data-close]").onclick = close; o.querySelector("[data-close]").focus();
  o.addEventListener("click", e => { if (e.target === o) close(); });
}
