// js/ui/resolucao.js — Interface: animação da resolução do mês (pulável).
/* ---------- Resolução animada do mês (pulável) ---------- */
function resolBtn(b){
  const pw = b.sides[b.win].side === "player", btn = document.createElement("button");
  btn.className = "rbat " + (pw ? "good" : "bad");
  btn.innerHTML = `⚔ ${esc(b.uf)} · ${pw ? "vitória" : "derrota"} <u style="text-decoration:none;opacity:.7">· ver relatório</u><small>${esc(battleShort(b))}</small>`;
  btn.onclick = () => openBattle(b); return btn;
}
function playResolution(ev, done){
  const finish = () => { closeOverlay("resol"); done && done(); };
  if (!ev || (!ev.battles.length && !ev.flips.length && !ev.moves.length)) return finish();
  const reduce = reduceMotion(), sp = reduce ? 0.35 : 1;
  closeOverlay("resol");
  const o = document.createElement("div"); o.id = "resol"; o.className = "overlay";
  o.innerHTML = `<div class="rmodal"><div class="btop"><div><div class="chap">Resolução militar</div><h2>${esc(monthLabel(ev.month))}</h2></div><button class="secondary" data-skip>Pular ▸▸</button></div>
    <div class="mapbox" id="resolMap"></div><div class="rcap">Ordens do mês</div><div class="rlist"></div><div class="bbtns"><button class="primary" data-done style="display:none">Continuar</button></div></div>`;
  document.body.appendChild(o); document.body.classList.add("noscroll");
  const box = o.querySelector("#resolMap"), cap = o.querySelector(".rcap"), list = o.querySelector(".rlist");
  const control = Object.assign({}, ev.control0);
  const startArmies = ev.start.map(a => Object.assign({}, a));
  box.innerHTML = mapSVG(control, [], { g: G, military: true, armies: startArmies, arrows: ev.orders, static: true });
  const svg = box.querySelector("svg"), fxLayer = document.createElementNS("http://www.w3.org/2000/svg", "g"); svg.appendChild(fxLayer);
  const timers = []; const later = (fn, ms) => timers.push(setTimeout(fn, ms * sp));
  const flipFill = (uf, fac) => { const p = svg.querySelector(`path.uf[data-uf="${uf}"]`); const f = STORY.factions[fac]; if (p && f){ p.setAttribute("fill", facFill(fac)); p.classList.remove("flipfx"); void p.getBoundingClientRect(); p.classList.add("flipfx"); } control[uf] = fac; };
  const boom = uf => { AUDIO.sfx("boom"); const s = MAP_DATA.states[uf]; fxLayer.insertAdjacentHTML("beforeend", `<g class="boom" transform="translate(${s.lx},${s.ly})"><circle class="fl" r="16" fill="url(#fls)"/><circle class="sm s1" r="12" fill="url(#smk)"/><circle class="sm s2" r="10" cx="8" cy="-4" fill="url(#smk)"/><circle class="sm s3" r="9" cx="-7" cy="-6" fill="url(#smk)"/></g>`); };
  const usedFlips = new Set();
  let t = 1300;
  ev.battles.forEach((b, i) => {
    later(() => {
      boom(b.uf);
      const pw = b.sides[b.win].side === "player";
      cap.textContent = `${MAP_DATA.states[b.uf].name}: ${pw ? "vitória sua" : "vitória inimiga"}${b.result ? " — " + b.result : ""}`;
      cap.className = "rcap " + (pw ? "good" : "bad");
      list.appendChild(resolBtn(b));
      ev.flips.forEach((f, k) => { if (f.uf === b.uf && !usedFlips.has(k)){ usedFlips.add(k); later(() => flipFill(f.uf, f.to), 450); } });
    }, t);
    t += Math.max(700, 1300 - ev.battles.length * 60);
  });
  later(() => { ev.flips.forEach((f, k) => { if (!usedFlips.has(k)) flipFill(f.uf, f.to); }); }, t);
  // deslocamentos: contadores fantasmas deslizam do estado de origem para o destino
  later(() => {
    svg.querySelectorAll("path.arw").forEach(p => p.classList.add("fade"));
    if (!ev.moves.length) return;
    svg.querySelectorAll("g.cnt").forEach(c => c.classList.add("fade"));
    cap.textContent = "Movimentos e recuos"; cap.className = "rcap";
    for (const m of ev.moves){
      const a = ev.start.find(x => x.id === m.id) || { str: 0 }, from = counterPos(m.from, m.side, false), to = counterPos(m.to, m.side, false);
      const k = CNT_K();
      fxLayer.insertAdjacentHTML("beforeend", `<g class="cnt ghost ${m.side === "player" ? "p" : "e"}" style="transform:translate(${from.x}px,${from.y}px) scale(${k})">${counterInner(m.side, Math.round(a.str), 1)}</g>`);
      const gh = fxLayer.lastElementChild; requestAnimationFrame(() => requestAnimationFrame(() => { gh.style.transform = `translate(${to.x}px,${to.y}px) scale(${k})`; }));
    }
  }, t + 200);
  t += ev.moves.length ? 1400 : 400;
  later(() => {
    const L = mapSVG(G.control, [], { g: G, military: true, arrows: [], static: true });
    box.innerHTML = L; cap.textContent = ev.battles.length ? "Toque numa batalha para ver o combate e o relatório (por que venceu ou perdeu)." : "Fim da resolução."; cap.className = "rcap";
    o.querySelector("[data-done]").style.display = ""; o.querySelector("[data-skip]").style.display = "none";
  }, t);
  const skip = () => { timers.forEach(clearTimeout); box.innerHTML = mapSVG(G.control, [], { g: G, military: true, arrows: [], static: true });
    list.innerHTML = ""; ev.battles.forEach(b => list.appendChild(resolBtn(b)));
    cap.textContent = ev.battles.length ? "Toque numa batalha para ver o combate e o relatório (por que venceu ou perdeu)." : "Fim da resolução."; cap.className = "rcap";
    o.querySelector("[data-done]").style.display = ""; o.querySelector("[data-skip]").style.display = "none"; };
  o.querySelector("[data-skip]").onclick = skip;
  o.querySelector("[data-done]").onclick = finish;
}
