// js/ui/acessibilidade.js — Interface: acessibilidade — aviso para leitores de tela e descrição do mapa em texto.
/* ---------- Leitores de tela: região aria-live ---------- */
function announce(msg){ const el = document.getElementById("srlive"); if (!el || !msg) return; el.textContent = ""; setTimeout(() => { el.textContent = trText(msg); }, 40); }

/* ---------- Descrição do mapa em texto ---------- */
function mapDescriptionHTML(g, mode){
  const ph = phaseOf(g), by = {};
  for (const uf in g.control) (by[g.control[uf]] ||= []).push(uf);
  const li = [];
  for (const k in by){ const f = STORY.factions[k]; li.push(`<li><b>${esc(f ? f.label : k)}</b> (${by[k].length}): ${by[k].sort().map(uf => esc(uf) + (sideOf(g, g.control[uf], ph) === "contested" && ph.war ? ` (frente ${g.uf[uf].progress > 0 ? "+" : ""}${Math.round(g.uf[uf].progress)})` : "")).join(", ")}</li>`); }
  let html = `<h4>Quem controla cada estado</h4><ul>${li.join("")}</ul>`;
  const hot = Object.keys(g.uf).sort((a, b) => g.uf[b].unrest - g.uf[a].unrest).slice(0, 6);
  html += `<h4>Agitação (mais tensos)</h4><p>${hot.map(uf => `${esc(uf)} ${Math.round(g.uf[uf].unrest)} (${esc(unrestLabel(g.uf[uf].unrest))})`).join(" · ")}. Média nacional ${Math.round(Object.values(g.uf).reduce((s, u) => s + u.unrest, 0) / Object.keys(g.uf).length)}.</p>`;
  if (!ph.noArmies){
    const mine = armiesOf(g, "player"), foes = armiesOf(g, "enemy");
    html += `<h4>Seus exércitos (${mine.length})</h4>${mine.length ? `<ul>${mine.map(a => `<li>${esc(a.name)} em ${esc(a.uf)}: força ${Math.round(a.str)}, moral ${Math.round(a.org)}, ${esc(orderText(a))}.</li>`).join("")}</ul>` : "<p>Nenhum.</p>"}`;
    const byUf = {}; for (const a of foes) byUf[a.uf] = (byUf[a.uf] || 0) + a.str;
    html += `<h4>Exércitos inimigos (${foes.length})</h4><p>${foes.length ? Object.entries(byUf).map(([uf, s]) => `${esc(uf)} força ${Math.round(s)}`).join(" · ") : "Nenhum visível."}</p>`;
    const it = knownIntents(g);
    if (ph.war) html += `<h4>Intenções inimigas conhecidas</h4><p>${it.length ? it.map(p => { const a = armyById(g, p.id); return `${esc(a ? a.name : "?")}: ${esc(ORDER_LABEL[p.type].toLowerCase())} ${esc(p.to)}`; }).join(" · ") : "Nenhuma conhecida."}</p>`;
  }
  return html;
}
