// js/ui/aba-faccoes.js — Interface: aba Facções.
function facNow(F, f){
  const C = SCEN.campaign, L = f.loyalty, out = [];
  const st = s => Object.entries(s).map(([k, v]) => `${STORY.stats[k] ? STORY.stats[k].label : k} ${v > 0 ? "+" : "−"}${Math.abs(v)}/mês`).join(", ");
  if (F.boost){ if (L >= 70) out.push(`<b>rende</b> ${st(F.boost)}`); else if (L <= 25) out.push(`<b>custa</b> ${st(Object.fromEntries(Object.entries(F.boost).map(([k, v]) => [k, -v])))}`); }
  if (F.boostMoney){ if (L >= 65) out.push(`<b>rende</b> +${F.boostMoney} ${esc(C.money.short)}/mês`); else if (L <= 25) out.push(`<b>custa</b> −${F.boostMoney} ${esc(C.money.short)}/mês`); }
  if (C.nationalFac === F.id) out.push(`moral máxima das tropas ${maxOrg(G, "player")}${L >= 65 ? ", +1 ordem por mês" : L < 25 ? ", −1 ordem por mês" : ""}`);
  if (L < 15) out.push(f.influence >= 25 ? `<b style="color:#f09a86">crise a qualquer momento</b> (influência ${Math.round(f.influence)} ≥ 25)` : "em crise, mas fraca demais para reagir (influência < 25)");
  return out.length ? out.join(" · ") : "nenhum efeito agora (só bônus a partir de 65–70 ou penalidades a partir de 25)";
}
function facCostTxt(F, kind){ const c = facCost(G, F, kind), M = SCEN.campaign.money.short; return [c.ap ? `${c.ap} AP` : "", c.money ? `${c.money} ${M}` : ""].filter(Boolean).join(" · ") + (c.ap ? "" : " · sem gastar ações"); }
function facWhat(F){
  const C = SCEN.campaign, li = [];
  const rivals = (F.rivals || []).map(r => (C.factions.find(x => x.id === r) || {}).short || r);
  li.push(`<b>Agradar</b> (${esc(facCostTxt(F, "agradar"))}): lealdade +14${rivals.length ? `; ${esc(rivals.join(", "))} −5 de lealdade (rival)` : ""}${F.favorFx ? `; ${esc(fxSummary(G, F.favorFx))}` : ""}.`);
  li.push(`<b>Enfraquecer</b> (${esc(facCostTxt(F, "pressionar"))}): influência −10 e lealdade −12${F.pressFx ? `; ${esc(fxSummary(G, F.pressFx))}` : ""}. Útil para tirar uma facção hostil do jogo: com influência abaixo de 25 ela não provoca crises.`);
  if (F.boost) li.push(`<b>Leal (≥70):</b> ${esc(Object.entries(F.boost).map(([k, v]) => `${STORY.stats[k].label} +${v}/mês`).join(", "))}. <b>Insatisfeita (≤25):</b> o mesmo, negativo.`);
  if (F.boostMoney) li.push(`<b>Leal (≥65):</b> +${F.boostMoney} ${esc(C.money.short)}/mês. <b>Insatisfeita (≤25):</b> −${F.boostMoney}/mês.`);
  if (C.nationalFac === F.id) li.push(`<b>Comando das tropas:</b> a lealdade define a moral máxima dos seus exércitos; ≥65 dá +1 ordem por mês e abaixo de 25, −1.`);
  if (!F.boost && !F.boostMoney && C.nationalFac !== F.id) li.push("Não dá bônus mensal: o que importa é evitar a crise (lealdade < 15 com influência ≥ 25).");
  if (F.links){ const up = [], down = []; for (const [k, v] of Object.entries(F.links)) (v > 0 ? up : down).push(STORY.stats[k] ? STORY.stats[k].label : k);
    li.push(`Reage aos seus atributos: ${up.length ? `fica mais leal quando ${esc(up.join(" ou "))} sobe` : ""}${up.length && down.length ? "; " : ""}${down.length ? `fica menos leal quando ${esc(down.join(" ou "))} sobe` : ""}.`); }
  li.push(`Todo mês, a lealdade volta 5% em direção ao ponto de partida (${F.loyalty}).`);
  return `<ul>${li.map(x => `<li>${x}</li>`).join("")}</ul>`;
}
function tabFaccoes(el){
  const C = SCEN.campaign;
  const cards = C.factions.map(F => {
    const f = G.fac[F.id], stt = facStatus(f), cls = { "Leal": "good", "Neutra": "", "Insatisfeita": "mid", "Em crise": "bad" }[stt];
    const used1 = G.used["fac_agradar_" + F.id], used2 = G.used["fac_pressionar_" + F.id], busy = G.queue.length > 0;
    const c1 = facCost(G, F, "agradar"), c2 = facCost(G, F, "pressionar"), cost = c1.money;
    const bad1 = used1 || busy || G.ap < c1.ap || G.money < c1.money, bad2 = used2 || busy || G.ap < c2.ap || G.money < c2.money;
    const why1 = used1 ? "já feito neste turno" : busy ? "resolva os eventos" : G.ap < c1.ap ? "sem AP" : G.money < c1.money ? `faltam ${esc(C.money.short)}` : `lealdade +14${(F.rivals || []).length ? ", rivais −5" : ""}`;
    const why2 = used2 ? "já feito neste turno" : busy ? "resolva os eventos" : G.ap < c2.ap ? "sem AP" : G.money < c2.money ? `faltam ${esc(C.money.short)}` : "influência −10, lealdade −12";
    return `<div class="fac ${cls}"><div class="fh"><strong>${esc(F.name)}</strong><em class="chip ${cls}">${stt}</em></div><p>${esc(F.desc)}</p>
      <div class="fbar"><span>Lealdade</span><div class="bar" title="Linhas: 15 crise · 35 neutra · 65 leal"><i style="width:${f.loyalty}%;background:${f.loyalty < 15 ? "#c2563f" : f.loyalty < 35 ? "#d0902a" : "#6fae6a"}"></i><u style="left:15%"></u><u class="t35" style="left:35%"></u><u class="t65" style="left:65%"></u></div><b>${Math.round(f.loyalty)}</b></div>
      <div class="fbar"><span>Influência</span><div class="bar"><i style="width:${f.influence}%;background:#7d8fb3"></i></div><b>${Math.round(f.influence)}</b></div>
      <div class="fnow"><b>Agora:</b> ${facNow(F, f)}</div>
      <details class="fwhat"><summary>O que acontece se…</summary>${facWhat(F)}</details>
      <div class="fbtns"><button class="secondary sm" data-f="${F.id}" data-k="agradar" ${bad1 ? "disabled" : ""}>Agradar (${esc(facCostTxt(F, "agradar").replace(" · sem gastar ações", ""))})<small>${why1}</small></button>
      <button class="secondary sm" data-f="${F.id}" data-k="pressionar" ${bad2 ? "disabled" : ""}>Enfraquecer (${esc(facCostTxt(F, "pressionar").replace(" · sem gastar ações", ""))})<small>${why2}</small></button></div></div>`;
  }).join("");
  const ex = `<div class="facx">
    <div><h4>Lealdade: o que cada nível faz</h4><div class="lv">
      <em style="color:#8fbf7a">Leal ≥ 65</em><span>Bônus de ${esc(C.money.short)} (≥65) e de atributos (≥70), conforme a facção.</span>
      <em>Neutra 35–64</em><span>Sem efeito mensal.</span>
      <em style="color:#e0a85a">Insatisfeita 15–34</em><span>A partir de 25 ou menos, o bônus vira penalidade.</span>
      <em style="color:#f09a86">Em crise &lt; 15</em><span>Se a influência for 25 ou mais: <b>crise</b> (greves, defecções, rebeliões, até golpe), no máximo uma a cada 4 meses.</span></div></div>
    <div><h4>Agradar × Enfraquecer</h4><ul>
      <li><b>Agradar</b>: ${esc(facCostTxt(C.factions[0], "agradar"))}. Lealdade +14; rivais perdem 5. Para manter aliados acima de 65–70 e colher os bônus.</li>
      <li><b>Enfraquecer</b>: ${esc(facCostTxt(C.factions[0], "pressionar"))}. Influência −10 e lealdade −12. Uma facção hostil com influência abaixo de 25 não provoca crise.</li>
      ${C.facMoney ? `<li>Facções são pagas <b>só com ${esc(C.money.label)}</b>: suas ações ficam livres para o resto.</li>` : ""}
      <li>Cada botão uma vez por facção, por turno.</li></ul></div>
    <div><h4>O que mais mexe com elas</h4><ul>
      <li>Escolhas da história e dos eventos.</li>
      <li>Seus atributos: cada facção acompanha alguns deles (veja “O que acontece se…”).</li>
      <li>Todo mês a lealdade volta um pouco ao ponto de partida.</li></ul></div></div>`;
  el.innerHTML = `${ex}<div class="facgrid">${cards}</div>`;
  el.querySelectorAll("[data-f]").forEach(b => b.onclick = () => afterAct(factionAction(G, b.dataset.f, b.dataset.k)));
}
