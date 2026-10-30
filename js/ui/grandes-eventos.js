// js/ui/grandes-eventos.js — Interface: "grandes eventos" em tela cheia (mudança de fase, marcos da história, Liga do Sul).
/* =====================================================================
   GRANDES EVENTOS: tela de clímax quando a fase muda ou um marco da história acontece
   ===================================================================== */
const MAJOR_NODES = {
  brasil2022: {
    transicao: { tone: "gold", head: "A faixa vai mudar de mãos", sub: "Você não impediu a transição. A equipe do presidente eleito assume os ministérios e, em 1º de janeiro, a faixa presidencial muda de dono. O comando do país começa a escapar das suas mãos." },
    crise_janeiro: { head: "Ataque à Praça dos Três Poderes", sub: "Uma semana após a posse, manifestantes invadem e depredam o Congresso, o Planalto e o STF. O mundo condena — e todos os olhares se voltam para você." },
    golpe_fracassa: { head: "Os quartéis não se movem", sub: "Os comandantes recusam a aventura. A tentativa de ruptura desmorona antes de sair do papel — e agora alguém vai ter de responder por ela." },
    golpe_inicial: { head: "Blindados na Esplanada", sub: "Tropas leais a você ocupam Brasília e a ordem constitucional é rompida. Governadores, tribunais, ruas e o mundo vão reagir. Não há volta." },
    racha_militar: { head: "Racha nas Forças Armadas", sub: "Comandos inteiros recusam suas ordens e se declaram em defesa da Constituição. O monopólio da força acabou." },
    guerra: { head: "O país está partido", sub: "A resistência pega em armas contra Brasília. Começa a guerra civil — cada frente agora decide o destino do Brasil." },
    inelegivel: { head: "Inelegível", sub: "O tribunal tira você das urnas por oito anos. Você ainda move multidões; a pergunta é o que fazer com elas." }
  }
};
/* viradas causadas por flags (Fase 4: a Liga do Sul) */
const MAJOR_FLAGS = {
  sul_revolta: { head: "A Liga do Sul se rebela", sub: "Os governadores do Sul rompem com Brasília. A revolta começa pequena — um estado e um exército modesto — e ainda pode ser contida.",
    cons: g => { const SC = southCfg(g); return [{ k: "bad", t: `${MAP_DATA.states[SC.rebel[0]].name} passou para a Liga do Sul, com um exército de força ${SC.armyStr}.` },
      { k: "", t: `Se a tensão ficar acima de ${SC.stage2} por ${SC.stage2After} meses, ${MAP_DATA.states[SC.rebel[1]].name} também adere.` },
      { k: "good", t: `Saída política: baixe a Tensão no Sul para ${SC.truce} ou menos (ações da categoria Sul, investir/negociar em RS/SC/PR) e eles aceitam um armistício.` }]; } },
  sul_armisticio: { tone: "gold", head: "Armistício no Sul", sub: "Os governadores do Sul aceitam baixar as armas. Os estados rebelados voltam ao seu controle.",
    cons: g => [{ k: "good", t: "O exército separatista foi dissolvido." }, { k: "", t: `A tensão recomeça em ${southCfg(g).truceReset}. Cuide dela para não haver uma segunda revolta.` }] },
  sul_aliado: { tone: "gold", head: "Pacto Federativo", sub: "Os governadores do Sul assinam o pacto: mais autonomia em troca de lealdade. A rebelião do Sul está descartada.",
    cons: g => [{ k: "good", t: "A Tensão no Sul deixa de importar: o Sul é seu aliado." }, { k: "good", t: `Na guerra, a ${southCfg(g).allyName} (força ${southCfg(g).allyStr}) luta do seu lado.` }] },
  sul_esmagado: { tone: "gold", head: "A Liga do Sul cai", sub: "Não resta nenhum estado sob controle separatista. A revolta do Sul acabou.", cons: () => [] }
};
const PHASE_WHY = {
  oposicao: "o poder está passando ao presidente eleito: as Forças Armadas voltaram à cadeia de comando regular e não obedecem mais às suas ordens políticas",
  governo: "a crise armada terminou e as tropas voltaram aos quartéis"
};
function majorSnap(){
  if (!G) return null;
  const ph = phaseOf(G);
  return { ph: ph.id, label: ph.label, war: !!ph.war, noArmies: !!ph.noArmies, income: ph.income, pace: paceFor(G), vis: G.visited.length, fl: G.flags.length, south: G.south ? G.south.t : null,
    armies: armiesOf(G, "player").map(a => ({ name: a.name, str: a.str })), stats: Object.assign({}, G.stats), control: Object.assign({}, G.control) };
}
function majorCheck(b){
  if (!b || !G || G.ended) return null;
  const ph = phaseOf(G), cfg = MAJOR_NODES[SCEN.id] || {};
  const fresh = G.visited.slice(b.vis).filter(n => cfg[n]);
  const freshF = G.flags.slice(b.fl ?? G.flags.length).filter(f => MAJOR_FLAGS[f] && southOn(G));
  const phaseChanged = ph.id !== b.ph;
  if (!fresh.length && !phaseChanged && !freshF.length) return null;
  const node = fresh[fresh.length - 1], MF = freshF.length ? MAJOR_FLAGS[freshF[freshF.length - 1]] : null;
  const M = node ? cfg[node] : MF;
  const C = SCEN.campaign, cons = [];
  if (node && MF) cons.push({ k: MF.tone === "gold" ? "good" : "bad", t: `${MF.head}: ${MF.sub}` });
  if (MF) MF.cons(G).forEach(c => cons.push(c));
  if (southOn(G) && b.south != null && G.south.state === "calmo" && G.south.t - b.south >= 8) cons.push({ k: G.south.t >= southCfg(G).warn ? "bad" : "", t: `Tensão no Sul: ${b.south} → ${G.south.t}. Clique na barra “Tensão no Sul” para ver como baixá-la.` });
  const nowA = armiesOf(G, "player"), lost = b.armies.length - nowA.length;
  if (b.armies.length && ph.noArmies){
    const tot = Math.round(b.armies.reduce((s, a) => s + a.str, 0));
    cons.push({ k: "bad", t: `${b.armies.length === 1 ? `Seu exército (força ${tot}) foi desmobilizado` : `Seus ${b.armies.length} exércitos (força total ${tot}) foram desmobilizados`} porque ${PHASE_WHY[ph.id] || "nesta fase você não comanda tropas"}.` });
  } else if (lost > 0) cons.push({ k: "bad", t: `Você perdeu ${lost} exército(s) nesta virada.` });
  if (phaseChanged){
    cons.push({ k: "", t: `Nova fase: ${ph.label}${ph.war ? " — em guerra" : ""}.` });
    if (ph.war && !b.war) cons.push({ k: "bad", t: "Começou a guerra: as frentes de combate estão abertas. Dê ordens aos seus exércitos na aba Mapa — elas não gastam AP." });
    if (!ph.war && b.war) cons.push({ k: "good", t: "A guerra terminou: não há mais frentes de combate." });
    if (ph.noArmies && !b.noArmies) cons.push({ k: "", t: "Agora a luta é política: use propaganda, investimentos e acordos com governadores no mapa, além de diplomacia e facções." });
    if ((ph.income ?? 0) !== (b.income ?? 0)) cons.push({ k: (ph.income ?? 0) < (b.income ?? 0) ? "bad" : "good", t: `Renda básica de ${C.money.label}: ${b.income ?? 0} → ${ph.income ?? 0} por mês.` });
  }
  const pace = paceFor(G); if (pace !== b.pace) cons.push({ k: "", t: pace > 1 ? `Os turnos passam a durar ${pace} meses.` : "Os turnos voltam a durar um mês." });
  const ch = Object.keys(G.control).filter(u => G.control[u] !== b.control[u]).map(u => ({ uf: u, to: G.control[u] }));
  if (ch.length) cons.push({ k: "", t: "Mapa: " + changeNotes(ch).join("; ") + "." });
  const deltas = Object.keys(STORY.stats).map(k => [k, Math.round(G.stats[k] - b.stats[k])]).filter(([, d]) => d);
  if (deltas.length) cons.push({ k: "", t: deltas.map(([k, d]) => `${STORY.stats[k].label} ${d > 0 ? "+" : "−"}${Math.abs(d)}`).join(" · ") });
  const head = M ? M.head : ph.label, sub = M ? M.sub : `O jogo mudou de fase: ${ph.label}.`;
  return { tone: M && M.tone || "red", head, sub, cons };
}
function showMajor(m, done){
  if (!m){ done && done(); return; }
  document.querySelectorAll(".major").forEach(x => x.remove());
  coachClose(); AUDIO.sfx("sting");
  const o = document.createElement("div"); o.className = "major " + (m.tone === "gold" ? "gold" : "");
  o.setAttribute("role", "alertdialog"); o.setAttribute("aria-modal", "true"); o.setAttribute("aria-labelledby", "majorH"); o.setAttribute("aria-describedby", "majorS");
  o.innerHTML = `<div class="mstripe t"></div><div class="mbox"><div class="mkick">⚠ Última hora ⚠</div><div class="mdate">${esc(monthLabel(G.month))}</div>
    <h2 id="majorH">${esc(m.head)}</h2><p class="msub" id="majorS">${esc(m.sub)}</p>
    ${m.cons.length ? `<div class="mcons"><h3>O que muda para você</h3><ul>${m.cons.map(c => `<li class="${c.k}">${esc(c.t)}</li>`).join("")}</ul></div>` : ""}
    <button class="primary mgo">Continuar ▸</button></div><div class="mstripe b"></div>`;
  document.body.appendChild(o); document.body.classList.add("noscroll");
  const close = () => { o.remove(); document.body.classList.remove("noscroll"); document.removeEventListener("keydown", key, true); done && done(); setTimeout(tutAfterRender, 200); };
  const key = e => { if (e.key === "Escape" || e.key === "Enter"){ e.preventDefault(); close(); } };
  document.addEventListener("keydown", key, true);
  o.querySelector(".mgo").onclick = close;
  setTimeout(() => { const x = o.querySelector(".mgo"); if (x) x.focus({ preventScroll: true }); }, 50);
}
