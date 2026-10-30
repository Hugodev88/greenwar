// js/ui/batalha.js — Interface: tela de batalha, relatório de batalha e previsão antes de atacar.
/* ---------- Tela de batalha ---------- */
const BATTLE_KIND = { ataque: "Ataque", frente: "Combate na frente" };
function oddsLabel(r){ return r >= 1.5 ? "muito favorável" : r >= 1.15 ? "favorável" : r >= 0.87 ? "equilibrada" : r >= 0.6 ? "arriscada" : "muito arriscada"; }
function closeOverlay(id){ const o = document.getElementById(id); if (o){ if (o._timer) clearTimeout(o._timer); o.remove(); } document.body.classList.remove("noscroll"); }
function battleSideHTML(s, idx, maxStr, label){
  const units = s.units.map((u, i) => `<div class="bunit${u.militia ? " mil" : ""}" data-i="${i}">
      <div class="bname"><i class="nato ${s.side === "player" ? "p" : "e"}${u.militia ? " m" : ""}"></i><b>${esc(u.name)}</b></div>${u.gen ? `<div class="bgen">${esc(u.gen)}</div>` : ""}
      <div class="bbar str"><i style="width:${Math.max(2, u.str0 / maxStr * 100)}%"></i><em>${u.str0}</em></div>
      <div class="bbar org"><i style="width:${u.org0}%"></i><em>moral ${u.org0}</em></div></div>`).join("");
  const mods = (s.mods || []).map(m => `<li class="${m.v > 0 ? "up" : "down"}"><span>${esc(m.label)}</span><b>${m.v > 0 ? "+" : ""}${Math.round(m.v * 100)}%</b></li>`).join("");
  return `<div class="bside ${s.side === "player" ? "p" : "e"}" data-side="${idx}"><div class="bhead">${esc(label)}<small>${s.role === "def" ? "defendendo" : s.role === "att" ? "atacando" : ""}</small></div>${units}
    <ul class="bmods">${mods || `<li><span>Sem modificadores</span></li>`}</ul><div class="bfx"></div></div>`;
}
function battleReportHTML(rec){
  let R; try{ R = battleReport(rec); }catch(e){ return ""; }
  const maxLr = Math.max(0.05, ...R.rows.map(r => Math.abs(r.lr)));
  const favH = r => r.fav ? `<span class="fav ${r.fav}"><i style="width:${Math.round(8 + 52 * Math.min(1, Math.abs(r.lr) / maxLr))}px"></i><span>${r.fav === "player" ? "você" : "inimigo"}</span></span>` : `<span class="fav none">—</span>`;
  const tot = Math.max(1, R.power.p + R.power.e), cls = R.forecast ? "" : (R.won ? "good" : "bad");
  return `<h4>${R.forecast ? "Comparação de forças" : "Por que " + (R.won ? "você venceu" : "você perdeu")}</h4>
    <p class="sum ${cls}">${esc(R.summary)}</p>${R.how ? `<p class="how">Como foi: ${esc(R.how)}</p>` : ""}
    <div class="pw"><b style="color:#9cc3ea">Você ${R.power.p}</b><div class="bar2" title="Poder de combate inicial = força × moral × experiência × modificadores"><i class="p" style="width:${R.power.p / tot * 100}%"></i><i class="e" style="width:${R.power.e / tot * 100}%"></i></div><b style="color:#f0a493">${R.power.e} Inimigo</b></div>
    <table><tr><th>Fator</th><th style="text-align:center">Você</th><th style="text-align:center">Inimigo</th><th>Favoreceu</th></tr>
    ${R.rows.map(r => `<tr title="${esc(r.hint || "")}"><td>${esc(r.label)}</td><td class="v p">${esc(String(r.p))}</td><td class="v e">${esc(String(r.e))}</td><td>${favH(r)}</td></tr>`).join("")}</table>
    ${R.loss ? `<div class="loss"><span>Baixas — suas: <b class="p">${R.loss.p}</b> de força</span><span>inimigas: <b class="e">${R.loss.e}</b> de força</span></div>` : ""}
    <ul class="tips">${R.tips.map(t => `<li>💡 ${esc(t)}</li>`).join("")}</ul>`;
}
function battleShort(rec){ try{ return battleReport(rec).summary; }catch(e){ return ""; } }
function battleRowsHTML(list){
  return `<div class="batlist">${list.map((b, i) => { const pw = b.sides[b.win] && b.sides[b.win].side === "player";
    return `<button class="batrow ${pw ? "good" : "bad"}" data-bat="${i}"><b>⚔ ${esc(b.uf)} · ${pw ? "vitória" : "derrota"}</b><span>${esc(MAP_DATA.states[b.uf].name)}${b.result ? " — " + esc(b.result) : ""}<small>${esc(battleShort(b))}</small></span></button>`; }).join("")}</div>`;
}
function openBattle(rec, opts){
  opts = opts || {};
  closeOverlay("battle");
  const pl = rec.sides.findIndex(s => s.side === "player"), L = pl < 0 ? 0 : pl, R = 1 - L, name = MAP_DATA.states[rec.uf].name;
  const maxStr = Math.max(10, ...rec.sides.flatMap(s => s.units.map(u => u.str0)));
  const sideLabel = s => s.side === "player" ? "Suas forças" : "Inimigo";
  const T = TERRAIN_TYPES[TERRAIN[rec.uf]];
  const o = document.createElement("div"); o.id = "battle"; o.className = "overlay";
  o.innerHTML = `<div class="bmodal" role="dialog" aria-label="Batalha">
    <div class="btop"><div><div class="chap">${esc(opts.forecast ? "Previsão" : (BATTLE_KIND[rec.kind] || "Batalha"))} · ${esc(monthLabel(rec.month))}</div><h2>Batalha de ${esc(name)}</h2>
      <small class="muted">Terreno: ${esc(T ? T.label : "—")}${T && T.def ? ` (defesa +${Math.round(T.def * 100)}%)` : ""}</small></div>
      <button class="xbtn" data-close aria-label="Fechar">✕</button></div>
    <div class="bfield">${battleSideHTML(rec.sides[L], L, maxStr, sideLabel(rec.sides[L]))}
      <div class="bmid"><div class="vs">VS</div><div class="bround">${opts.forecast ? `Razão de forças<br><b>${opts.ratio.toFixed(2)}×</b><br><small>${esc(oddsLabel(opts.ratio))}</small>` : `Rodada <b>0</b>/${rec.rounds.length}`}</div></div>
      ${battleSideHTML(rec.sides[R], R, maxStr, sideLabel(rec.sides[R]))}</div>
    <div class="bresult${opts.forecast ? " show" : ""}">${opts.forecast ? esc(opts.note || "") : ""}</div>
    <div class="brep${opts.forecast ? " show" : ""}">${battleReportHTML(rec)}</div>
    <div class="bbtns">${opts.forecast ? "" : `<button class="secondary" data-skip>Pular animação</button><button class="secondary" data-replay>Rever</button>`}${opts.onBack ? `<button class="secondary" data-back>← Voltar à lista</button>` : ""}<button class="primary" data-close>Fechar</button></div></div>`;
  document.body.appendChild(o); document.body.classList.add("noscroll");
  o.addEventListener("click", e => { if (e.target === o || e.target.closest("[data-close]")) { closeOverlay("battle"); if (opts.onClose) opts.onClose(); }
    else if (e.target.closest("[data-back]")) { closeOverlay("battle"); opts.onBack(); } });
  if (opts.forecast) return;
  const sides = [o.querySelector(`.bside[data-side="${L}"]`), o.querySelector(`.bside[data-side="${R}"]`)], map = [L, R];
  const setRound = (i) => {
    const rd = rec.rounds[i]; if (!rd) return;
    o.querySelector(".bround b").textContent = i + 1;
    map.forEach((si, col) => {
      const el = sides[col];
      rd.u[si].forEach(([st, org], ui) => { const u = el.querySelector(`.bunit[data-i="${ui}"]`); if (!u) return;
        u.querySelector(".str i").style.width = Math.max(0, st / maxStr * 100) + "%"; u.querySelector(".str em").textContent = Math.round(st);
        u.querySelector(".org i").style.width = Math.max(0, org) + "%"; u.querySelector(".org em").textContent = "moral " + org; });
      if (rd.hit[si] > 0.3){ el.classList.remove("hit"); void el.offsetWidth; el.classList.add("hit");
        const fx = el.querySelector(".bfx"); for (let k = 0; k < 3; k++){ const p = document.createElement("i"); p.className = "puff"; p.style.left = (15 + Math.random() * 70) + "%"; p.style.top = (20 + Math.random() * 50) + "%"; p.style.animationDelay = (k * 0.12) + "s"; fx.appendChild(p); setTimeout(() => p.remove(), 1600); }
        const fl = document.createElement("i"); fl.className = "flash"; fl.style.left = (25 + Math.random() * 50) + "%"; fl.style.top = (25 + Math.random() * 40) + "%"; fx.appendChild(fl); setTimeout(() => fl.remove(), 700); }
    });
  };
  const showResult = () => {
    const last = rec.rounds[rec.rounds.length - 1]; if (last) setRound(rec.rounds.length - 1);
    const w = rec.sides[rec.win], pw = w.side === "player";
    const lossP = pl < 0 ? 0 : rec.loss[pl], lossE = pl < 0 ? rec.loss[0] : rec.loss[1 - pl];
    const res = o.querySelector(".bresult");
    res.className = "bresult show " + (pw ? "good" : "bad"); AUDIO.sfx(pw ? "win" : "lose"); announce((pw ? "Vitória" : "Derrota") + ". " + (rec.result || ""));
    res.innerHTML = `<b>${pw ? "Vitória" : "Derrota"}${rec.margin >= 0.5 ? " esmagadora" : rec.margin < 0.12 ? " apertada" : ""}</b> — ${esc(rec.result || "")}<br><small>Baixas: suas ${lossP} · inimigas ${lossE} de força${rec.rounds.length ? ` · ${rec.rounds.length} rodada${rec.rounds.length > 1 ? "s" : ""}` : ""}</small>`;
    sides.forEach((el, col) => el.classList.toggle("won", rec.sides[map[col]] === w));
    o.querySelector(".brep").classList.add("show");
  };
  const reduce = reduceMotion();
  const run = () => {
    let i = 0; o.querySelector(".bresult").className = "bresult"; o.querySelector(".brep").classList.remove("show");
    sides.forEach(el => el.classList.remove("won"));
    rec.sides.forEach((s, si) => { const col = map.indexOf(si); s.units.forEach((u, ui) => { const el = sides[col].querySelector(`.bunit[data-i="${ui}"]`); el.querySelector(".str i").style.width = Math.max(2, u.str0 / maxStr * 100) + "%"; el.querySelector(".str em").textContent = u.str0; el.querySelector(".org i").style.width = u.org0 + "%"; el.querySelector(".org em").textContent = "moral " + u.org0; }); });
    o.querySelector(".bround b").textContent = 0;
    const step = () => { if (i >= rec.rounds.length){ showResult(); return; } setRound(i++); o._timer = setTimeout(step, reduce ? 250 : 850); };
    if (o._timer) clearTimeout(o._timer);
    o._timer = setTimeout(step, reduce ? 100 : 500);
  };
  o.querySelector("[data-skip]").onclick = () => { if (o._timer) clearTimeout(o._timer); showResult(); };
  o.querySelector("[data-replay]").onclick = run;
  run();
}
// Estado em disputa sem batalha registrada neste mês: mostra as forças e a previsão
function openForecast(uf){
  const pU = defendersAt(G, "player", uf), eU = defendersAt(G, "enemy", uf);
  const s = sideOf(G, G.control[uf]), pRole = s === "player" ? "def" : "att", eRole = s === "enemy" ? "def" : "att";
  const toU = u => ({ name: u.name, gen: u.gen || null, militia: !!u.militia, str0: Math.round(u.str), org0: Math.round(u.org) });
  const pm = milMods(G, "player", uf, pRole, pU), em = milMods(G, "enemy", uf, eRole, eU);
  const pp = pU.reduce((t, u) => t + armyPow(u), 0) * modsMult(pm), ep = eU.reduce((t, u) => t + armyPow(u), 0) * modsMult(em);
  const rec = { uf, kind: "frente", month: G.month, rounds: [], sides: [{ side: "player", role: pRole, mods: pm, units: pU.map(toU) }, { side: "enemy", role: eRole, mods: em, units: eU.map(toU) }] };
  if (!pU.length) rec.sides[0].units = [{ name: "Nenhuma força sua aqui", militia: true, str0: 0, org0: 0 }];
  if (!eU.length) rec.sides[1].units = [{ name: "Nenhuma força inimiga conhecida", militia: true, str0: 0, org0: 0 }];
  const ratio = ep > 0 ? pp / ep : (pp > 0 ? 9.99 : 1);
  openBattle(rec, { forecast: true, ratio, note: s === "contested" ? `A frente está em ${G.uf[uf].progress > 0 ? "+" : ""}${Math.round(G.uf[uf].progress)} (+100 conquista · −100 perda). Ela é disputada a cada Encerrar mês; mande exércitos para pesar a balança.` : "Estimativa sem sorte: a batalha real tem até 5 rodadas e quem perder a moral recua." });
}
// Prévia de uma ordem antes de confirmar (selecionar → destino → previsão → confirmar)
function orderForecast(a, to, type){
  const ph = phaseOf(G), name = MAP_DATA.states[to].name, ts = sideOf(G, G.control[to], ph);
  const lim = commandLimit(G), used = ordersUsed(G), already = a.order && MANEUVER.includes(a.order.type);
  const slot = already ? "Substitui a ordem atual deste exército." : used >= lim ? `<b class="neg">Limite de manobras atingido (${used}/${lim}).</b> Cancele outra ordem antes.` : `Usa 1 das ${lim} manobras do mês (restam ${lim - used - 1} depois).`;
  const base = { type, to, name, slot, full: !already && used >= lim };
  if (type !== "atacar") return Object.assign(base, { title: `${type === "recuar" ? "↩ Recuar" : "➜ Mover"} para ${to}`,
    lines: [`<b>${esc(a.name)}</b> (força ${Math.round(a.str)}) sai de ${esc(a.uf)} e chega a ${esc(name)} no Encerrar mês.`, type === "recuar" ? "Sai da frente: perde a posição, mas preserva o exército." : "Sem combate. Tropas paradas no próprio território recuperam moral e baixam a agitação."] });
  const others = armiesOf(G, "player").filter(x => x.id !== a.id && x.order && x.order.type === "atacar" && x.order.to === to);
  const att = [a, ...others], o = battleOdds(G, "player", att, to), tot = Math.max(1, o.pa + o.pd);
  const defStr = Math.round(o.def.reduce((t, d) => t + d.str, 0)), nArm = o.def.filter(d => !d.militia).length;
  const mods = milMods(G, "player", to, "att", att).concat(milMods(G, "enemy", to, "def", o.def).map(m => Object.assign({}, m, { v: -m.v, foe: true })))
    .sort((x, y) => Math.abs(y.v) - Math.abs(x.v)).slice(0, 3);
  const prog = Math.round(G.uf[to].progress || 0);
  const ifWin = !o.def.length ? (ts === "contested" ? `Sem defensores: a frente avança +60 (hoje ${prog > 0 ? "+" : ""}${prog}).` : `Sem defensores: ${esc(name)} é ocupado sem combate.`)
    : ts === "contested" ? `Se vencer, a frente avança (hoje ${prog > 0 ? "+" : ""}${prog}; +100 conquista). Se perder, ela recua.`
    : `Se vencer, ${esc(name)} entra em disputa (vitória esmagadora conquista direto). Se perder, o ataque é repelido e suas tropas perdem moral.`;
  return Object.assign(base, { title: `⚔ Atacar ${to}`, odds: o, ratio: o.ratio, att,
    lines: [`<b>${att.map(x => esc(x.name) + " (" + Math.round(x.str) + ")").join(" + ")}</b> contra ${o.def.length ? `${nArm ? nArm + " exército" + (nArm > 1 ? "s" : "") + " e " : ""}guarnição — força ${defStr}` : "ninguém"}.`, ifWin],
    bar: `<div class="pw"><b style="color:#9cc3ea">Você ${o.pa}</b><div class="bar2"><i class="p" style="width:${o.pa / tot * 100}%"></i><i class="e" style="width:${o.pd / tot * 100}%"></i></div><b style="color:#f0a493">${o.pd} Inimigo</b></div>`,
    mods: mods.map(m => `<li class="${m.v > 0 ? "up" : "down"}">${esc(m.label)}${m.foe ? (m.v < 0 ? " — ajuda a defesa inimiga" : " — atrapalha a defesa inimiga") : ""} <b>${m.v > 0 ? "+" : "−"}${Math.abs(Math.round(m.v * 100))}%</b></li>`).join("") });
}
function forecastCardHTML(a, pend){
  const f = orderForecast(a, pend.to, pend.type), cls = f.ratio === undefined ? "mv" : f.ratio >= 1.15 ? "good" : f.ratio >= 0.87 ? "mid" : "bad";
  return `<div class="fcard ${cls}" role="dialog" aria-label="Previsão da ordem" aria-live="polite">
    <div class="fch"><b>${esc(f.title)}</b><span>${esc(f.name)}</span></div>
    ${f.ratio !== undefined ? `<div class="fodds">Chance <b>${esc(oddsLabel(f.ratio))}</b> <small>(${f.ratio >= 9 ? "sem oposição" : f.ratio.toFixed(1) + "× de poder"})</small></div>${f.bar}` : ""}
    ${f.lines.map(l => `<p>${l}</p>`).join("")}${f.mods ? `<ul class="fmods">${f.mods}</ul>` : ""}
    <p class="fslot">${f.slot}</p>
    <div class="fbtns"><button class="primary" data-fc="ok" ${f.full ? "disabled" : ""}>✔ Confirmar ordem</button>${f.ratio !== undefined ? `<button class="secondary small" data-fc="full">Comparação completa</button>` : ""}<button class="secondary small" data-fc="no">✕ Cancelar</button></div>
    <small class="muted">${MOBILE_MAP() ? "Toque de novo no estado para confirmar." : "Clique de novo no estado para confirmar · Esc cancela."}</small></div>`;
}
function openAttackForecast(a, uf){
  const f = orderForecast(a, uf, "atacar"), toU = u => ({ name: u.name, gen: u.gen || null, militia: !!u.militia, str0: Math.round(u.str), org0: Math.round(u.org) });
  const def = f.odds.def, rec = { uf, kind: sideOf(G, G.control[uf]) === "contested" ? "frente" : "ataque", month: G.month, rounds: [],
    sides: [{ side: "player", role: "att", mods: milMods(G, "player", uf, "att", f.att), units: f.att.map(toU) }, { side: "enemy", role: "def", mods: milMods(G, "enemy", uf, "def", def), units: def.length ? def.map(toU) : [{ name: "Nenhuma força inimiga", militia: true, str0: 0, org0: 0 }] }] };
  openBattle(rec, { forecast: true, ratio: f.ratio, note: "Estimativa sem sorte: a batalha real tem até 5 rodadas e quem perder a moral recua." });
}
function battleAt(uf){ const ev = G.mil; return ev && ev.month === G.month ? [...ev.battles].reverse().find(b => b.uf === uf) : null; }
