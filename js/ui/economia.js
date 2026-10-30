// js/ui/economia.js — Interface: de onde vêm e para onde vão os pontos de ação e os Recursos (faixa e janela).
/* ---------- Ações e Recursos: de onde vêm e para onde vão ---------- */
function apSrcLine(){
  const C = SCEN.campaign; if (!C.apScale && !C.convert) return "";
  const A = { parts: G.apParts || apFor(G).parts }, bits = [`base ${A.parts[0].v}`];
  for (const p of A.parts.slice(1)) if (p.v) bits.push(`${p.id === "apoio" ? "apoio" : p.label.toLowerCase()} ${p.v > 0 ? "+" : "−"}${Math.abs(p.v)}`);
  if (G.used && G.used.convert) bits.push("+1 comprada");
  const nx = apNextTier(G);
  return `<small>${bits.join(" · ")}${nx ? ` · apoio ${nx.at} → ${nx.ap}` : ""}</small>`;
}
function ecoStrip(){
  const C = SCEN.campaign, K = C.convert; if (!K && !Number.isFinite(moneyCap(G))) return "";
  const cap = moneyCap(G), used = G.used && G.used.convert, busy = G.queue.length > 0, why = used ? "já feito neste turno" : busy ? "resolva os eventos" : G.money < K.cost ? `faltam ${C.money.short}` : "uma vez por turno";
  return `<div class="ecostrip panel"><div class="eco-m"><span class="k">${esc(C.money.label)}</span><b>${Math.round(G.money)}${Number.isFinite(cap) ? `<small>/${cap}</small>` : ""}</b>${Number.isFinite(cap) ? `<div class="bar" aria-hidden="true"><i style="width:${Math.max(0, Math.min(100, 100 * G.money / cap))}%"></i></div>` : ""}</div>
    ${K && !G.simple ? `<button class="secondary sm" id="btnConvert" ${used || busy || G.money < K.cost ? "disabled" : ""}>Converter ${K.cost} ${esc(C.money.short)} → +${K.ap} ação<small>${esc(why)}</small></button>` : ""}
    <button class="linkbtn" id="btnEcoHow">Como funcionam ações e ${esc(C.money.short)}?</button></div>`;
}
function bindEcoStrip(el){
  const b = el.querySelector("#btnConvert"); if (b) b.onclick = () => afterAct(convertMoney(G));
  const h = el.querySelector("#btnEcoHow"); if (h) h.onclick = () => openEco("money");
}
/* modal genérico (Fase 4): conteúdo HTML + callback de ligação */

function openEco(focus){
  document.querySelectorAll("#ecoModal").forEach(x => x.remove());
  const C = SCEN.campaign, M = C.money.short, A = { parts: G.apParts || apFor(G).parts }, Anext = apFor(G), inc = incomeFor(G), cap = moneyCap(G), pace = paceFor(G), nx = apNextTier(G), K = C.convert;
  const row = (l, v, cls) => `<tr class="${cls || ""}"><td>${l}</td><td>${v}</td></tr>`;
  const n = v => (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(Math.round(v));
  const apRows = A.parts.map((p, i) => row(i === 0 ? "Base do cenário" : p.id === "apoio" ? `Apoio Popular no início (${(p.label.match(/\d+/) || [""])[0]})` : p.label, i === 0 ? p.v : n(p.v), p.v > 0 && i ? "up" : "")).join("")
    + (G.used && G.used.convert ? row(`Comprada com ${esc(M)}`, "+1", "up") : "");
  const scale = C.apScale ? `<ul class="tiers">${[[0, 0], ...C.apScale.tiers].map(([t, b], i, arr) => { const hi = arr[i + 1] ? arr[i + 1][0] - 1 : 100, on = G.stats[C.apScale.stat] >= t && G.stats[C.apScale.stat] <= hi; return `<li class="${on ? "on" : ""}"><b>${C.ap + b} ações</b><span>Apoio Popular ${i === 0 ? `abaixo de ${arr[1][0]}` : `${t}${arr[i + 1] ? `–${hi}` : " ou mais"}`}</span></li>`; }).join("")}</ul>` : "";
  const incRows = [row("Renda básica da fase", n(inc.base)), inc.terr ? row("Território", n(inc.terr), "up") : "", inc.econ ? row("Economia", n(inc.econ), inc.econ > 0 ? "up" : "down") : "", inc.facBonus ? row("Facções leais/insatisfeitas", n(inc.facBonus), inc.facBonus > 0 ? "up" : "down") : "", inc.upkeep ? row("Manutenção de tropas", n(-inc.upkeep), "down") : "", inc.sanc ? row("Sanções", n(-inc.sanc), "down") : "", row("<b>Total por mês</b>", `<b>${n(inc.total)}</b>`), pace > 1 ? row(`<b>Por turno</b> (${pace} meses)`, `<b>${n(inc.total * pace)}</b>`) : ""].join("");
  const facC = C.facMoney ? `${C.facMoney.agradar} para agradar, ${C.facMoney.pressionar} para enfraquecer — <b>sem gastar ações</b>` : `${C.favorCost ?? 4} + 1 AP para agradar`;
  const m = document.createElement("div");
  m.className = "modal"; m.id = "ecoModal"; m.setAttribute("role", "dialog"); m.setAttribute("aria-modal", "true"); m.setAttribute("aria-labelledby", "ecoT");
  m.innerHTML = `<div class="modal-card ecomodal"><h2 id="ecoT">Ações e ${esc(C.money.label)}</h2>
    <div class="ecogrid">
      <section class="${focus === "ap" ? "hl" : ""}"><h3>Ações deste turno: ${G.ap}</h3>
        <p class="muted sm">Calculadas no início do turno. Restam <b>${G.ap}</b>.</p>
        <table class="ecotab">${apRows}</table>
        ${C.apScale ? `<p class="muted">Com o apoio de agora (${Math.round(G.stats[C.apScale.stat])}), o <b>próximo turno</b> terá <b>${Anext.total} ações</b>.</p>` : ""}
        ${scale}
        ${nx ? `<p class="muted">Suba o <b>Apoio Popular</b> para ${nx.at} e tenha <b>${nx.ap} ações</b> por turno.</p>` : C.apScale ? `<p class="muted">Você está no máximo de ações pelo apoio.</p>` : ""}
        ${K ? `<p class="muted">Precisa de mais? Converta <b>${K.cost} ${esc(M)} → +${K.ap} ação</b>, uma vez por turno (aba Ações).</p>` : ""}
        <p class="muted">As ações não acumulam: o que sobrar se perde ao encerrar o turno.</p></section>
      <section class="${focus === "money" ? "hl" : ""}"><h3>${esc(C.money.label)}: ${Math.round(G.money)}${Number.isFinite(cap) ? ` de ${cap}` : ""}</h3>
        <table class="ecotab">${incRows}</table>
        ${Number.isFinite(cap) ? `<p><b>Teto de ${cap}.</b> Ao encerrar o turno, o que passar disso se perde: capital político parado não rende. ${G.money + inc.total * pace > cap ? `<b class="warn">Neste ritmo, você vai perder ${Math.round(G.money + inc.total * pace - cap)} no próximo turno.</b>` : ""}</p>` : ""}
        <h4>Onde gastar</h4><ul class="uses">
          <li><b>Facções</b>: ${facC}.</li>
          ${K ? `<li><b>Converter em ação</b>: ${K.cost} → +${K.ap} ação (1×/turno).</li>` : ""}
          <li><b>Mapa</b>: investir num estado (baixa a agitação) e negociar adesões.</li>
          <li><b>Ações do governo</b> e <b>missões diplomáticas</b>: algumas custam ${esc(M)}.</li>
          <li><b>Decisões</b>: alguns focos têm custo.</li>
          <li><b>Exércitos</b> (em guerra): recrutar e reforçar.</li></ul>
        <p class="muted">Abaixo de zero, você perde 2 de Apoio Popular por mês.</p></section>
    </div>
    <div class="row2"><button class="primary" id="btnEcoClose">Fechar</button></div></div>`;
  document.body.appendChild(m);
  const close = () => { m.remove(); document.removeEventListener("keydown", key, true); };
  const key = e => { if (e.key === "Escape"){ e.stopPropagation(); close(); } };
  document.addEventListener("keydown", key, true);
  m.onclick = e => { if (e.target === m) close(); };
  $("#btnEcoClose").onclick = close; $("#btnEcoClose").focus({ preventScroll: true }); { const h = $("#ecoModal section.hl"); const cd = m.querySelector(".modal-card"); if (h && cd) setTimeout(() => { cd.scrollTop = Math.max(0, h.getBoundingClientRect().top - cd.getBoundingClientRect().top + cd.scrollTop - 12); }, 60); }
}
