// js/ui/aba-diplomacia.js — Interface: aba Diplomacia.
function opinionBar(v){ const w = Math.abs(v) / 2, col = v >= 0 ? "#6fae6a" : "#c2563f"; return `<div class="opbar"><i style="${v >= 0 ? "left:50%" : `left:${50 - w}%`};width:${w}%;background:${col}"></i><b></b></div>`; }
function tabDiplomacia(el){
  const C = SCEN.campaign, L = dipLabels(G);
  const list = C.actors.map(A => {
    const st = G.actors[A.id], chips = [];
    if (st.recognized) chips.push(`<em class="chip good">Reconhece você</em>`);
    if (st.aligned) chips.push(`<em class="chip">Alinhado</em>`);
    if (st.sanctioning) chips.push(`<em class="chip bad">Sanções</em>`);
    if (st.supportsEnemy) chips.push(`<em class="chip bad">Apoia o inimigo</em>`);
    if (st.dependence >= 20) chips.push(`<em class="chip mid">Dependência ${Math.round(st.dependence)}</em>`);
    const debt = G.debts.filter(d => d.aid === A.id).reduce((s, d) => s + d.amount, 0);
    if (debt) chips.push(`<em class="chip mid">Dívida ${debt}</em>`);
    return `<button class="actor${UI.selActor===A.id?" on":""}" data-a="${A.id}"><div class="an"><strong>${esc(A.name)}</strong><small>${esc(A.tag)}</small></div>
      <div class="aop"><span>Opinião</span>${opinionBar(st.opinion)}<b>${sgn(st.opinion)}</b></div><div class="chips">${chips.join("")}</div></button>`;
  }).join("");
  let panel = `<p class="muted">Escolha um governo ou organismo para ver interesses e propor um acordo. Cada proposta custa 1 ponto de ação; a resposta depende da opinião, dos interesses deles, da sua legitimidade e da sua força.</p>`;
  const aid = UI.selActor;
  if (aid){
    const A = actorDef(G, aid), st = G.actors[aid], ar = allowedReqs(G, aid), ao = allowedOffs(G, aid);
    UI.req = UI.req.filter(r => ar.includes(r)); UI.off = UI.off.filter(o => ao.includes(o));
    const sc = dealScore(G, aid, UI.req, UI.off), hint = dealHint(sc.score), bad = dealCheck(G, aid, UI.req, UI.off);
    const rels = Object.entries(A.rel || {}).map(([o, v]) => { const B = actorDef(G, o); return B ? `<span class="${v > 0 ? "good" : "bad"}">${esc(B.short || B.name)} ${v > 0 ? "▲" : "▼"}</span>` : ""; }).join(" ");
    const wants = Object.entries(A.interests).filter(([, v]) => v >= 0.8).map(([k]) => L.off[k]);
    const pct = clamp(Math.round(50 + sc.score * 1.6), 3, 97);
    panel = `<h3>${esc(A.name)}</h3><p class="ideo">${esc(A.ideology)}</p>
      <div class="ufinfo"><div><span>Opinião</span>${opinionBar(st.opinion)}<b>${sgn(st.opinion)}</b></div>
      <div><span>Valoriza</span><b>${esc(wants.join(", ") || "pouco do que você pode oferecer")}</b></div>
      <div><span>Relações</span><b class="rels">${rels || "—"}</b></div>
      <div><span>Postura</span><b>${(A.democracy||0) >= 0.8 ? "Exige legitimidade democrática" : (A.democracy||0) >= 0.4 ? "Atenta à legitimidade" : "Pragmática"}</b></div></div>
      <div class="deal"><div class="dcol"><h4>Você pede <small>(até 2)</small></h4>${REQ_TYPES.map(r => { const ok = ar.includes(r); return `<label class="${ok?"":"off"}"><input type="checkbox" data-req="${r}" ${UI.req.includes(r)?"checked":""} ${ok?"":"disabled"}> ${esc(L.req[r])}${ok ? "" : `<small>${(A.gives[r]||0) <= 0 ? "não oferecem" : r === "reconhecimento" && st.recognized ? "já obtido" : "indisponível nesta fase"}</small>`}</label>`; }).join("")}</div>
      <div class="dcol"><h4>Você oferece <small>(até 3)</small></h4>${OFF_TYPES.map(o => { const ok = ao.includes(o); return `<label class="${ok?"":"off"}"><input type="checkbox" data-off="${o}" ${UI.off.includes(o)?"checked":""} ${ok?"":"disabled"}> ${esc(L.off[o])}${ok && (A.interests[o]||0) >= 0.8 ? ` <em class="chip good">interessa</em>` : ""}${!ok ? `<small>indisponível nesta fase</small>` : ""}</label>`; }).join("")}</div></div>
      <div class="predict ${hint.cls}"><div><span>Previsão:</span> <strong>${hint.label}</strong> <small>(saldo ${sgn(sc.score)})</small></div><div class="pbar"><i style="left:calc(${pct}% - 2px)"></i></div>
        <details><summary>Por quê?</summary><ul>${sc.parts.map(([l, v]) => `<li><span>${esc(l)}</span><b class="${v>0?"good":"bad"}">${sgn(v)}</b></li>`).join("")}</ul></details></div>
      <div class="dealbtns"><button class="primary" id="btnPropose" ${bad ? "disabled" : ""} title="${esc(bad)}">Propor acordo (1 AP)</button>
      <button class="secondary" id="btnMission" ${G.used["mis_" + aid] || G.ap < 1 || G.queue.length ? "disabled" : ""}>Missão diplomática (1 AP · ${C.missionCost ?? 2} ${esc(C.money.short)}) · opinião +8</button></div>
      ${bad && UI.req.length ? `<div class="muted">${esc(bad)}</div>` : ""}
      ${UI.dealMsg ? `<div class="dealmsg ${UI.dealMsg.cls}">${esc(UI.dealMsg.text)}${G.counter && G.counter.aid === aid ? ` <button class="primary sm" id="btnCounter">Aceitar contraproposta</button>` : ""}</div>` : ""}
      <details class="conseq"><summary>Consequências dos acordos</summary><ul>
        <li><b>Dinheiro:</b> +${C.loan || 15} agora, dívida de ${Math.round((C.loan||15)*1.3)} em 6 meses (calote derruba opinião e economia).</li>
        <li><b>Armas:</b> +2 unidades, mais dependência — parceiros dependentes cobram alinhamento.</li>
        <li><b>Reconhecimento:</b> legitimidade +8; aliados deles melhoram a opinião.</li>
        <li><b>Bases / alinhamento / votos:</b> agradam este ator, irritam os rivais dele e mexem com facções internas.</li>
        <li><b>Commodities:</b> −${C.drain || 2} ${esc(C.money.short)}/mês por 6 meses.</li></ul></details>`;
  }
  el.innerHTML = `<div class="diplayout"><div class="actors">${list}</div><div class="panel dealpanel">${panel}</div></div>`;
  el.querySelectorAll(".actor").forEach(b => b.onclick = () => { if (UI.selActor !== b.dataset.a){ UI.req = []; UI.off = []; UI.dealMsg = null; } UI.selActor = b.dataset.a; renderGame(); if (window.innerWidth < 900) setTimeout(() => $(".dealpanel").scrollIntoView({ behavior: "smooth" }), 30); });
  el.querySelectorAll("[data-req]").forEach(c => c.onchange = () => { const r = c.dataset.req; UI.req = c.checked ? [...UI.req, r] : UI.req.filter(x => x !== r); UI.dealMsg = null; renderGame(); });
  el.querySelectorAll("[data-off]").forEach(c => c.onchange = () => { const o = c.dataset.off; UI.off = c.checked ? [...UI.off, o] : UI.off.filter(x => x !== o); UI.dealMsg = null; renderGame(); });
  if ($("#btnPropose")) $("#btnPropose").onclick = () => {
    const r = proposeDeal(G, aid, UI.req, UI.off);
    UI.dealMsg = { text: r.msg, cls: r.result === "accept" ? "good" : r.result === "counter" ? "mid" : "bad" };
    if (r.result === "accept"){ UI.req = []; UI.off = []; }
    afterAct(r);
  };
  if ($("#btnMission")) $("#btnMission").onclick = () => afterAct(diploMission(G, aid));
  if ($("#btnCounter")) $("#btnCounter").onclick = () => { const r = acceptCounter(G); UI.dealMsg = { text: r.msg, cls: "good" }; UI.req = []; UI.off = []; afterAct(r); };
}
