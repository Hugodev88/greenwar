// Verifica todos os cenários: links quebrados, nós inalcançáveis, finais atingíveis, referências do mapa (UFs/facções)
// e os dados de campanha (atores, facções, ações, eventos, fases). No fim roda a simulação de campanhas (sim.js).
// Uso: node check.js [partidas_por_IA_na_simulação=150]
const fs = require("fs");
const html = fs.readFileSync(__dirname + "/index.html", "utf8");
const src = html.split("/*SCENARIOS_START*/")[1].split("/*SCENARIOS_END*/")[0];
const SCENARIOS = new Function(src + "; return SCENARIOS;")();
const msrc = html.split("/*MAP_START*/")[1].split("/*MAP_END*/")[0];
const MAP_DATA = new Function(msrc + "; return MAP_DATA;")();
const UFS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];
const csrc = html.split("/*CORE_START*/")[1].split("/*CORE_END*/")[0];
const grab = name => new Function(csrc.match(new RegExp("const " + name + " = [^;]+;"))[0] + "; return " + name + ";")();
const FOCUS_FX_KEYS = grab("FOCUS_FX_KEYS"), OFF_TYPES = grab("OFF_TYPES"), REQ_TYPES = grab("REQ_TYPES");
let errors = 0;
const err = m => { console.log("  ✗ " + m); errors++; };

const mapUfs = Object.keys(MAP_DATA.states);
if (mapUfs.length !== 27 || UFS.some(u => !MAP_DATA.states[u])) err("MAP_DATA não tem as 27 UFs: " + mapUfs);
for (const u of mapUfs) if (!MAP_DATA.states[u].d || MAP_DATA.states[u].d.length < 20) err("Geometria vazia: " + u);

const ids = new Set();
for (const sc of SCENARIOS) {
  if (ids.has(sc.id)) err("id de cenário duplicado: " + sc.id); ids.add(sc.id);
  if (sc.soon) { console.log(`\n[${sc.year}] ${sc.title} — placeholder "Em breve"`); continue; }
  console.log(`\n[${sc.year}] ${sc.title} (${sc.id})`);
  for (const k of ["title","year","date","character","description","saveKey","endingsKey","intro","story","campaign"]) if (!sc[k]) err(`campo ${k} ausente`);
  const STORY = sc.story, nodes = STORY.nodes, STATS = Object.keys(STORY.stats), FAC = Object.keys(STORY.factions);
  if (!nodes[STORY.start]) err("start inválido");
  const targets = c => typeof c.next === "string" ? [c.next] : c.next.map(b => b.to);
  const checkStats = (where, obj) => { for (const k in obj||{}) if (!STATS.includes(k)) err(`atributo inválido "${k}" em ${where}`); };
  const checkCondDef = (where, c) => { if (!c) return; checkStats(where, c.min); checkStats(where, c.max); };
  const checkMap = (where, mp) => { for (const [uf, f] of Object.entries(mp||{})) {
    if (!UFS.includes(uf)) err(`UF inválida "${uf}" em ${where}`);
    if (!FAC.includes(f)) err(`Facção inválida "${f}" em ${where}`); } };
  const checkResolve = (where, r) => { for (const [a,b] of Object.entries(r||{})) if (!FAC.includes(a) || !FAC.includes(b)) err(`resolve inválido ${a}->${b} em ${where}`); };
  checkMap("initialMap", STORY.initialMap);
  const def = STORY.defaultFaction || "federal";
  if (!FAC.includes(def) && Object.keys(STORY.initialMap||{}).length < 27) err(`facção padrão "${def}" não existe (defina defaultFaction)`);
  for (const u of Object.keys(STORY.stateNotes||{})) if (!UFS.includes(u)) err("stateNotes com UF inválida " + u);
  for (const [k,t] of Object.entries(STORY.collapse||{})) { if (!STATS.includes(k)) err("collapse atributo " + k); if (!nodes[t]) err("collapse quebrado " + t); }
  let mapRefs = 0;
  for (const [id, n] of Object.entries(nodes)) {
    if (n.onEnter) { checkMap(id+".onEnter", n.onEnter.map); checkResolve(id+".onEnter", n.onEnter.resolve); mapRefs++; }
    if (n.ending) { if (n.choices) err("Final com escolhas: " + id); if (!n.endingName) err("Final sem nome: " + id); continue; }
    if (!n.choices || !n.choices.length) err("Nó sem escolhas: " + id);
    n.choices.forEach((c, i) => {
      for (const t of targets(c)) if (!nodes[t]) err(`Link quebrado: ${id} -> ${t}`);
      checkStats(`${id}#${i}.effects`, c.effects); checkCondDef(`${id}#${i}.req`, c.req);
      if (Array.isArray(c.next)) c.next.forEach(b => checkCondDef(`${id}#${i}.next`, b.if));
      if (c.map) { checkMap(`${id}#${i}`, c.map); mapRefs++; }
    });
  }

  // ---- dados de campanha ----
  const C = sc.campaign;
  if (!C) { err("cenário sem campaign"); }
  else {
    const ACT = (C.actors||[]).map(a => a.id), FCS = (C.factions||[]).map(f => f.id);
    const isNode = id => !!nodes[id];
    if (!/^\d{4}-\d{2}$/.test(C.start)) err("campaign.start inválido");
    for (const k of ["pop","mil","legit"]) if (C.keys[k] && !STATS.includes(C.keys[k])) err(`keys.${k} inválido`);
    if (C.keys.econ && !STATS.includes(C.keys.econ)) err("keys.econ inválido");
    if (C.actors.length < 4) err("poucos atores estrangeiros");
    for (const a of C.actors){ for (const r in a.rel||{}) if (!ACT.includes(r)) err(`ator ${a.id}: relação com ${r} inexistente`);
      for (const f in a.reactions||{}) if (!FCS.includes(f)) err(`ator ${a.id}: reação de facção ${f} inexistente`);
      if (!a.interests || !a.gives) err(`ator ${a.id} sem interests/gives`); }
    for (const f of C.factions){ for (const r of f.rivals||[]) if (!FCS.includes(r)) err(`facção ${f.id}: rival ${r} inexistente`);
      for (const k in f.links||{}) if (!STATS.includes(k)) err(`facção ${f.id}: link ${k}`); for (const k in f.boost||{}) if (!STATS.includes(k)) err(`facção ${f.id}: boost ${k}`); }
    const checkFx = (w, fx) => { if (!fx) return; checkStats(w + ".s", fx.s);
      for (const id in fx.fac||{}) if (!FCS.includes(id)) err(`${w}: facção ${id} inexistente`);
      for (const id in fx.infl||{}) if (!FCS.includes(id)) err(`${w}: facção ${id} inexistente`);
      for (const id in fx.act||{}) if (!ACT.includes(id)) err(`${w}: ator ${id} inexistente`);
      for (const uf in fx.unrestUF||{}) if (!UFS.includes(uf)) err(`${w}: UF ${uf}`);
      if (fx.map) checkMap(w, fx.map); };
    const checkC = (w, c) => { if (!c) return; checkCondDef(w, c);
      for (const id of [...(c.visited||[]), ...(c.visitedAny||[]), ...(c.notVisited||[])]) if (!isNode(id)) err(`${w}: nó ${id} inexistente`);
      for (const id in c.fac||{}) if (!FCS.includes(id)) err(`${w}: facção ${id}`);
      for (const id in c.actor||{}) if (!ACT.includes(id)) err(`${w}: ator ${id}`);
      for (const f of (c.anyControl||[])) if (!FAC.includes(f)) err(`${w}: facção do mapa ${f}`);
      for (const p of [].concat(c.phase||[], c.notPhase||[])) if (!C.phases.some(x => x.id === p)) err(`${w}: fase ${p}`); };
    for (const ph of C.phases){ checkC("fase " + ph.id, ph.if);
      for (const f of [...ph.player, ...(ph.enemy||[]), ph.playerMain, ph.enemyMain].filter(Boolean)) if (!FAC.includes(f)) err(`fase ${ph.id}: facção ${f}`);
      for (const [a, b] of Object.entries({ ...(ph.flipTo||{}), ...(ph.loseTo||{}) })) if (!FAC.includes(a) || !FAC.includes(b)) err(`fase ${ph.id}: flip ${a}->${b}`); }
    if (C.phases.at(-1).if) err("a última fase deve ser a padrão (sem if)");
    for (const id of [...Object.keys(C.storyAt||{}), ...Object.keys(C.storyDelay||{}), ...Object.keys(C.enterFx||{})]) if (!isNode(id)) err(`agenda: nó ${id} inexistente`);
    for (const [id, arr] of Object.entries(C.choiceFx||{})){ if (!isNode(id)) { err(`choiceFx: nó ${id}`); continue; }
      if (arr.length > nodes[id].choices.length) err(`choiceFx ${id}: mais efeitos que escolhas`); arr.forEach((fx, i) => checkFx(`choiceFx ${id}#${i}`, fx)); }
    for (const [id, fx] of Object.entries(C.enterFx||{})) checkFx("enterFx " + id, fx);
    for (const ck of C.checks||[]){ if (!nodes[ck.to] || !nodes[ck.to].ending) err(`check -> ${ck.to} não é final`); checkC("check " + ck.to, ck.if); }
    const aids = new Set();
    for (const a of C.actions){ if (aids.has(a.id)) err("ação duplicada " + a.id); aids.add(a.id);
      if (!["eco","mil","pol","dip"].includes(a.cat)) err(`ação ${a.id}: categoria ${a.cat}`); checkFx("ação " + a.id, a.fx); checkC("ação " + a.id, a.show); checkC("ação " + a.id, a.req); if (a.risk) checkFx("risco " + a.id, a.risk.fx); }
    const eids = new Set();
    for (const e of C.events){ if (eids.has(e.id)) err("evento duplicado " + e.id); eids.add(e.id); checkC("evento " + e.id, e.if);
      if (e.crisisOf && !FCS.includes(e.crisisOf)) err(`evento ${e.id}: crisisOf ${e.crisisOf}`);
      if (!e.choices || e.choices.length < 2) err(`evento ${e.id}: precisa de 2+ escolhas`);
      e.choices.forEach((c, i) => { checkFx(`evento ${e.id}#${i}`, c.fx); checkC(`evento ${e.id}#${i}`, c.req);
        if (c.next) for (const b of c.next) if (b.to && !isNode(b.to)) err(`evento ${e.id}: next ${b.to}`); }); }
    for (const f of FCS) if (!C.events.some(e => e.crisisOf === f)) err(`facção ${f} sem evento de crise`);
    if (C.nationalFac && !FCS.includes(C.nationalFac)) err("nationalFac inválida");
    for (const fx of Object.values(C.offerFac||{})) checkFx("offerFac", fx);
    // ---- árvore de decisões nacionais (focos) ----
    if (C.focus){
      const T = C.focus, N = T.nodes, byId = {}, BR = (T.branches||[]).map(b => b.id);
      for (const F of N){ if (byId[F.id]) err("foco duplicado " + F.id); byId[F.id] = F; }
      if (N.length < 30 || N.length > 45) err(`árvore com ${N.length} focos (esperado 30–45)`);
      const pos = new Set();
      for (const F of N){
        const w = "foco " + F.id;
        if (!F.name || !F.desc) err(`${w}: sem nome/descrição`);
        if (!(F.months >= 1)) err(`${w}: duração inválida`);
        if (!BR.includes(F.branch)) err(`${w}: ramo ${F.branch} inexistente`);
        const k = F.x + "," + F.y; if (pos.has(k)) err(`${w}: posição ${k} sobreposta`); pos.add(k);
        for (const r of [...(F.req||[]), ...(F.reqAny||[]), ...(F.excl||[])]) if (!byId[r]) err(`${w}: referência a foco inexistente ${r}`);
        for (const x of F.excl||[]) if (byId[x] && !(byId[x].excl||[]).includes(F.id)) err(`${w}: exclusão com ${x} não é simétrica`);
        if ((F.excl||[]).some(x => (F.req||[]).includes(x))) err(`${w}: exclusivo de um pré-requisito`);
        for (const key in F.fx||{}) if (!FOCUS_FX_KEYS.includes(key)) err(`${w}: chave de efeito "${key}" inválida`);
        checkFx(w, F.fx); checkC(w + ".avail", F.avail); checkC(w + ".lockIf", F.lockIf);
        if (F.risk){ if (!(F.risk.p > 0 && F.risk.p < 1)) err(`${w}: risco p`); checkFx(w + ".risco", F.risk.fx); }
        for (const a in F.dipBonus||{}) if (!ACT.includes(a)) err(`${w}: dipBonus ator ${a}`);
        for (const o of F.dipOff||[]) if (!OFF_TYPES.includes(o)) err(`${w}: dipOff ${o}`);
        for (const o of F.dipReq||[]) if (!REQ_TYPES.includes(o)) err(`${w}: dipReq ${o}`);
        if (F.cost !== undefined && !(F.cost >= 0)) err(`${w}: custo`);
      }
      for (const [n, arr] of Object.entries(T.grants||{})){ if (!isNode(n)) err(`grants: nó ${n}`); for (const id of arr) if (!byId[id]) err(`grants: foco ${id}`); }
      // ciclos (req + reqAny)
      const color = {};
      const dfs = id => { if (color[id] === 1) { err("ciclo de pré-requisitos em " + id); return; } if (color[id] === 2) return; color[id] = 1;
        for (const r of [...(byId[id].req||[]), ...(byId[id].reqAny||[])]) if (byId[r]) dfs(r); color[id] = 2; };
      N.forEach(F => dfs(F.id));
      // alcançável: existe um conjunto de pré-requisitos (escolhendo uma opção de cada reqAny) sem exclusivos em conflito
      const consistent = set => [...set].every(a => !(byId[a].excl||[]).some(x => set.has(x)));
      const closures = (id, set) => { // devolve conjuntos possíveis
        if (set.has(id)) return [set];
        let sets = [new Set([...set, id])];
        for (const r of byId[id].req||[]) sets = sets.flatMap(s => closures(r, s));
        if ((byId[id].reqAny||[]).length) sets = sets.flatMap(s => byId[id].reqAny.flatMap(r => closures(r, s)));
        return sets.filter(consistent).slice(0, 200);
      };
      const unreach = N.filter(F => !closures(F.id, new Set()).length).map(F => F.id);
      if (unreach.length) err("focos inalcançáveis por qualquer caminho: " + unreach);
      const roots = N.filter(F => !(F.req||[]).length && !(F.reqAny||[]).length);
      if (roots.length !== 1) err(`a árvore deve ter uma raiz (tem ${roots.map(F => F.id)})`);
      // flags fo_* usadas por ações/eventos
      const fo = JSON.stringify([C.actions, C.events]).match(/"fo_[a-z_0-9]+"/g) || [];
      for (const f of new Set(fo)) if (!byId[f.slice(4, -1)]) err(`flag ${f} não corresponde a um foco`);
      const nEx = N.reduce((s, F) => s + (F.excl||[]).length, 0) / 2;
      console.log(`  Árvore de decisões: ${N.length} focos em ${BR.length} ramos, ${nEx} pares exclusivos, ${new Set(fo).size} flags de foco usadas por ações/eventos — sem ciclos, todos alcançáveis`);
    }
    console.log(`  Campanha: ${C.actors.length} atores, ${C.factions.length} facções, ${C.actions.length} ações, ${C.events.length} eventos, ${C.phases.length} fases, ${(C.checks||[]).length} condições de fim`);
  }
  // simulação de partidas aleatórias (só a história)
  const cond = (c, s) => { if (!c) return true;
    for (const k in c.min||{}) if (s.stats[k] < c.min[k]) return false;
    for (const k in c.max||{}) if (s.stats[k] > c.max[k]) return false;
    for (const f of c.flags||[]) if (!s.flags.includes(f)) return false;
    for (const f of c.noFlags||[]) if (s.flags.includes(f)) return false; return true; };
  const applyMap = (s, spec) => { if (!spec) return;
    if (spec.resolve) for (const uf in s.control) if (spec.resolve[s.control[uf]]) s.control[uf] = spec.resolve[s.control[uf]];
    if (spec.map) Object.assign(s.control, spec.map); };
  const visited = new Set(), endings = {}, used = new Set(), endMaps = {};
  for (let run = 0; run < 40000; run++) {
    const s = { stats: {}, flags: [], control: {} };
    for (const k of STATS) s.stats[k] = STORY.stats[k].initial;
    for (const u of UFS) s.control[u] = STORY.defaultFaction || "federal";
    Object.assign(s.control, STORY.initialMap);
    let id = STORY.start, steps = 0; applyMap(s, nodes[id].onEnter);
    while (!nodes[id].ending) {
      visited.add(id);
      const opts = nodes[id].choices.map((c,i)=>[c,i]).filter(([c]) => cond(c.req, s));
      if (!opts.length) { err("Beco sem saída em " + id); break; }
      const [c,i] = opts[Math.floor(Math.random()*opts.length)]; used.add(id+"#"+i);
      for (const k in c.effects||{}) s.stats[k] = Math.max(0, Math.min(100, s.stats[k] + c.effects[k]));
      if (c.flag && !s.flags.includes(c.flag)) s.flags.push(c.flag);
      if (c.map) applyMap(s, { map: c.map });
      let col = null; for (const k in STORY.collapse||{}) if (s.stats[k] <= 0) { col = STORY.collapse[k]; break; }
      id = col || (typeof c.next === "string" ? c.next : (c.next.find(b => cond(b.if, s)) || c.next.at(-1)).to);
      applyMap(s, nodes[id].onEnter);
      if (++steps > 100) { err("Loop infinito?"); break; }
    }
    visited.add(id); endings[id] = (endings[id]||0) + 1;
    const summ = {}; for (const u of UFS) (summ[s.control[u]] ||= []).push(u);
    (endMaps[id] ||= new Set()).add(Object.entries(summ).map(([f,l]) => `${f}:${l.length}`).sort().join(" "));
  }
  const unreached = Object.keys(nodes).filter(id => !visited.has(id));
  const unused = Object.entries(nodes).flatMap(([id,n]) => (n.choices||[]).map((_,i)=>id+"#"+i)).filter(c => !used.has(c));
  if (unreached.length) err("Nós nunca alcançados: " + unreached);
  if (unused.length) err("Escolhas nunca disponíveis: " + unused);
  const nEnd = Object.values(nodes).filter(n => n.ending).length;
  console.log(`  Nós: ${Object.keys(nodes).length} (${Object.keys(nodes).length - nEnd} de história, ${nEnd} finais); ${mapRefs} mudanças de mapa validadas`);
  console.log("  Finais em 40.000 partidas aleatórias:", JSON.stringify(endings));
  for (const [e, set] of Object.entries(endMaps)) console.log(`    mapa final ${e}: ${[...set].slice(0,3).join("  |  ")}${set.size>3?` (+${set.size-3})`:""}`);
}
console.log(errors ? `\nFALHOU (${errors} problemas)` : "\nOK: todos os cenários íntegros, todos os nós e finais alcançáveis.");
if (errors) process.exit(1);
console.log("\n=== Simulação de campanhas (sim.js) ===");
const r = require("child_process").spawnSync(process.execPath, [__dirname + "/sim.js", process.argv[2] || "150"], { stdio: "inherit" });
process.exit(r.status);
