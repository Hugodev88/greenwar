// js/ui/acessibilidade.js — Interface: acessibilidade — aviso para leitores de tela e descrição do mapa em texto.
/* ---------- Leitores de tela: região aria-live ---------- */
function announce(msg){ const el = document.getElementById("srlive"); if (!el || !msg) return; el.textContent = ""; setTimeout(() => { el.textContent = trText(msg); }, 40); }

/* ---------- Descrição do mapa em texto ---------- */
function mapDescriptionHTML(g, mode){
  const ph = phaseOf(g), by = {};
  for (const uf in g.control) (by[g.control[uf]] ||= []).push(uf);
  const li = [];
  for (const k in by){ const f = STORY.factions[k]; li.push(`<li><b>${esc(f ? f.label : k)}</b> (${by[k].length}): ${by[k].sort().map(uf => esc(uf) + (sideOf(g, g.control[uf], ph) === "contested" && ph.war && !frontMode(g) ? ` (frente ${g.uf[uf].progress > 0 ? "+" : ""}${Math.round(g.uf[uf].progress)})` : "")).join(", ")}</li>`); }
  let html = `<h4>Quem controla cada estado</h4><ul>${li.join("")}</ul>`;
  const hot = Object.keys(g.uf).sort((a, b) => g.uf[b].unrest - g.uf[a].unrest).slice(0, 6);
  html += `<h4>Agitação (mais tensos)</h4><p>${hot.map(uf => `${esc(uf)} ${Math.round(g.uf[uf].unrest)} (${esc(unrestLabel(g.uf[uf].unrest))})`).join(" · ")}. Média nacional ${Math.round(Object.values(g.uf).reduce((s, u) => s + u.unrest, 0) / Object.keys(g.uf).length)}.</p>`;
  if (!ph.noArmies && frontMode(g)){
    const W = g.war;
    html += `<h4>Tropas: ${Math.round(frontPool(g))} (reserva ${Math.round(W.reserve)})</h4>`;
    if (W.fronts.length && ph.war){ const K = frontCfg(g); html += `<p><span>No mapa: a linha de frente é a borda grossa laranja; faixas listradas mostram o seu lado e o lado inimigo; cada frente tem um placar com a sua força e a do inimigo.</span> <span>Sua capital</span>: ${esc(K.capitalNome || K.capital)} · <span>capitais inimigas</span>: ${W.fronts.map(f => esc(g.reg ? frontFala(g, "reduto", f.id) : (K.frentes[f.id] || {}).reduto || "—")).join(", ")}.</p>`;
      // guerra por regiões: placar de cada frente e as regiões que mudaram de lado no último mês
      if (g.reg){ const ch = regChanges(g), F = (grp, k) => frontFala(g, grp, k);
        html += `<h4>${esc(F("regioes", "territorio"))}</h4><p>${esc(F("regioes", "maioria"))}</p><ul>${W.fronts.map(f => { const T = regTally(g, f); return `<li><b>${esc(frontName(g, f))}</b>: <span>${esc(gfmt(F("regioes", "placar"), T.p, T.e))}</span> · <span>${esc(gfmt(F("regioes", "saldoMes"), T.got, T.lost))}</span>${accPathText(g, f)}</li>`; }).join("")}</ul>
          <p>${ch.length ? esc(gfmt(F("regioes", "acc"), ch.map(m => gfmt(F("regioes", m.side === "player" ? "tomadaPor" : "perdidaPara"), regLabel(m.id))).join("; "))) : esc(F("regioes", "accNada"))}</p>`; } }
    if (W.fronts.length) html += `<h4>Frentes (${W.fronts.length})</h4><ul>${W.fronts.map(f => `<li><b>${esc(frontName(g, f))}</b> · <span>força no placar do mapa: você</span> ${frontPowers(g, f).P} <span>× inimigo</span> ${frontPowers(g, f).E}${f.last ? ` · <span>${f.last.d >= 3 ? "no último mês a linha avançou" : f.last.d <= -3 ? "no último mês a linha recuou" : "no último mês a linha quase não mexeu"}</span>${Math.abs(f.last.d) >= 3 ? " " + Math.abs(Math.round(f.last.d)) : ""}` : ""} · <span>linha</span> ${f.progress > 0 ? "+" : ""}${Math.round(f.progress)} · <span>sua postura</span>: <span>${esc(frontFala(g, "postura", f.special ? "avancar" : f.posture))}</span> · <span>tropas</span> ${Math.round(f.troops)} · <span>moral</span> ${Math.round(f.morale)} · <span>suprimento</span> ${Math.round(f.supply)} · <span>inimigo</span> ${Math.round(f.enemy)}, <span>próximo mês</span>: <span>${esc(frontFala(g, "posturaCurta", f.eposture || "segurar"))}</span> · <span>próximo estado a tomar</span>: ${esc(frontTarget(g, f, 1) || "—")} · <span>a perder</span>: ${esc(frontTarget(g, f, -1) || "—")}</li>`).join("")}</ul>`;
  } else if (!ph.noArmies){
    const mine = armiesOf(g, "player"), foes = armiesOf(g, "enemy");
    html += `<h4>Seus exércitos (${mine.length})</h4>${mine.length ? `<ul>${mine.map(a => `<li>${esc(a.name)} em ${esc(a.uf)}: força ${Math.round(a.str)}, moral ${Math.round(a.org)}, ${esc(orderText(a))}.</li>`).join("")}</ul>` : "<p>Nenhum.</p>"}`;
    const byUf = {}; for (const a of foes) byUf[a.uf] = (byUf[a.uf] || 0) + a.str;
    html += `<h4>Exércitos inimigos (${foes.length})</h4><p>${foes.length ? Object.entries(byUf).map(([uf, s]) => `${esc(uf)} força ${Math.round(s)}`).join(" · ") : "Nenhum visível."}</p>`;
    const it = knownIntents(g);
    if (ph.war) html += `<h4>Intenções inimigas conhecidas</h4><p>${it.length ? it.map(p => { const a = armyById(g, p.id); return `${esc(a ? a.name : "?")}: ${esc(ORDER_LABEL[p.type].toLowerCase())} ${esc(p.to)}`; }).join(" · ") : "Nenhuma conhecida."}</p>`;
  }
  return html;
}
// Fase 12: "Faltam N regiões até Recife", distância do inimigo até Brasília e o rompimento do último mês, para o leitor de tela
function accPathText(g, f){
  const F = (grp, k) => frontFala(g, grp, k), nP = regFaltam(g, f, 1), nE = regFaltam(g, f, -1), L = f.last, out = [];
  if (nP) out.push(nP === 1 ? gfmt(F("regioes", "faltaUma"), regGoalName(g, f, 1)) : gfmt(F("regioes", "faltam"), nP, regGoalName(g, f, 1)));
  if (nE) out.push(nE === 1 ? gfmt(F("regioes", "faltaUmaInimigo"), regGoalName(g, f, -1)) : gfmt(F("regioes", "faltamInimigo"), nE, regGoalName(g, f, -1)));
  if (L && L.rompe && g.mil && L.month === g.mil.month) out.push(F("regioes", L.rompe > 0 ? "rompeTitulo" : "rompeTituloInimigo"));
  return out.map(t => ` · <span>${esc(t)}</span>`).join("");
}
