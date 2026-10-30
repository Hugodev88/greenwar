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
    if (W.fronts.length && ph.war){ const K = frontCfg(g), F = (grp, k) => frontFala(g, grp, k), T2 = k => F("tropas", k);
      html += `<p><span>${esc(T2("comoJogar"))}</span> <span>Sua capital</span>: ${esc(K.capitalNome || K.capital)} · <span>capitais inimigas</span>: ${W.fronts.map(f => esc(F("reduto", f.id))).join(", ")}.</p>`;
      // caminho até Recife, ímpeto e os estados que mudaram de lado no último mês
      const ch = (g.mil && g.mil.flips) || [];
      html += `<p>${W.fronts.map(f => `<b>${esc(frontName(g, f))}</b>${accPathText(g, f)}`).join("<br>")}</p><p>⚡ ${esc(F("impeto", "titulo"))}: ${esc(F("impeto", tpMomentum(g) > 0 ? "m" + tpMomentum(g) : tpMomentum(g) < 0 ? "n" + (-tpMomentum(g)) : "z"))}</p>
        <p>${ch.length ? esc(gfmt(F("mapa", "acc"), ch.map(m => ufName(m.uf) + (m.side === "player" ? " (+)" : " (−)")).join(", "))) : esc(F("mapa", "accNada"))}</p>`;
      const mine = tpArmies(g, "player"), foes = tpArmies(g, "enemy");
      html += `<h4>${esc(T2("titulo"))} (${mine.length})</h4><ul>${mine.map(a => `<li>${esc(tpChipLabel(g, a))}</li>`).join("")}</ul>`;
      html += `<h4>${esc(T2("inimigos"))} (${foes.length})</h4><ul>${foes.map(a => `<li>${esc(tpChipLabel(g, a))}</li>`).join("")}</ul>`;
      const thr = foes.filter(e => e.order && e.order.type === "atacar");
      html += `<h4>${esc(T2("ameacas"))}</h4><p>${thr.length ? thr.map(e => esc(gfmt(T2("ameaca"), tpName(g, e), ufName(e.order.to), Math.round(tpChance(g, e, e.order.to).chance * 100)))).join(" · ") : esc(T2("semAmeaca"))}</p>`;
      const bl = (g.mil && g.mil.battles) || [];
      if (bl.length) html += `<h4>${esc(T2("batalhas"))}</h4><ul>${bl.map(r => `<li>${esc(ufName(r.uf))}: ${esc(T2(tpResultKey(r)))} · ${esc(frontReport(g, r).summary)}</li>`).join("")}</ul>`;
    }
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
// "Recife a N estados" e a distância do inimigo até Brasília, para o leitor de tela
function accPathText(g, f){
  const F = k => frontFala(g, "mapa", k), t = (frontCfg(g).frentes[f.id] || {}).vitoria ? tpGoalText(g, f) : "", nE = tpEnemyNear(g), out = [];
  if (t) out.push(t);
  if (nE) out.push(nE === 1 ? F("faltaUmaInimigo") : gfmt(F("faltamInimigo"), nE));
  return out.map(x => ` · <span>${esc(x)}</span>`).join("");
}
