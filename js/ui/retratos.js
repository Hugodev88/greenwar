// js/ui/retratos.js — Interface: rosto (ou ícone de instituição / silhueta) de quem fala em eventos, facções, diplomacia e exércitos.
/* Dados em SCEN.retratos (ex.: js/data/2022/retratos.js). Cenário sem retratos: as funções devolvem "" e nada muda na tela. */
const SILHUETA_SVG = `<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="24" r="12"/><path d="M10 60c2-14 11-21 22-21s20 7 22 21z"/></svg>`;
// kind: "pessoas" | "faccoes" | "atores" | "generais" | "historia" | "eventos"
function portraitOf(kind, id){
  const R = SCEN && SCEN.retratos; if (!R || id == null) return null;
  const key = kind === "pessoas" ? id : R[kind] && R[kind][id];
  return (key && R.pessoas[key]) || null;
}
function portraitImg(p, size){
  const s = size || 56;
  if (!p) return "";
  if (p.img) return `<img class="ptr" src="assets/retratos/${p.img}.webp" alt="" width="${s}" height="${s}" loading="lazy" style="width:${s}px;height:${s}px">`;
  if (p.icone) return `<span class="ptr inst" style="width:${s}px;height:${s}px;font-size:${Math.round(s * .5)}px" aria-hidden="true">${p.icone}</span>`;
  return `<span class="ptr sil" style="width:${s}px;height:${s}px">${SILHUETA_SVG}</span>`;
}
// Faixa "quem fala": rosto + nome + cargo
function whoHTML(p, size){
  if (!p) return "";
  return `<div class="who">${portraitImg(p, size || 56)}<div class="whot"><b>${esc(p.nome)}</b><small>${esc(p.cargo)}</small></div></div>`;
}
