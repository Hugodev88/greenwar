// Verifica todos os cenários: links quebrados, nós inalcançáveis, finais atingíveis, referências do mapa (UFs/facções)
// e os dados de campanha (atores, facções, ações, eventos, fases). No fim roda a simulação de campanhas (sim.js).
// Uso: node tests/check.js [partidas_por_IA_na_simulação=150]
const fs = require("fs");
const JOGO = require("./carregar.js");
const src = JOGO.dados;
const SCENARIOS = new Function(src + "; return SCENARIOS;")();
const msrc = "";   // o mapa (MAP_DATA) já faz parte de JOGO.dados
const MAP_DATA = new Function(src + "; return MAP_DATA;")();
const UFS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];
const csrc = JOGO.dados + "\n" + JOGO.nucleo;   // texto de dados + núcleo (para grab)
const grab = name => new Function(csrc.match(new RegExp("const " + name + " = [^;]+;"))[0] + "; return " + name + ";")();
const FOCUS_FX_KEYS = grab("FOCUS_FX_KEYS"), EVENT_FX_KEYS = new Function(csrc.match(/const FOCUS_FX_KEYS = [^;]+;/)[0] + csrc.match(/const EVENT_FX_KEYS = [^;]+;/)[0] + "; return EVENT_FX_KEYS;")(), OFF_TYPES = grab("OFF_TYPES"), REQ_TYPES = grab("REQ_TYPES");
let errors = 0;
const err = m => { console.log("  ✗ " + m); errors++; };

const mapUfs = Object.keys(MAP_DATA.states);
if (mapUfs.length !== 27 || UFS.some(u => !MAP_DATA.states[u])) err("MAP_DATA não tem as 27 UFs: " + mapUfs);
for (const u of mapUfs) if (!MAP_DATA.states[u].d || MAP_DATA.states[u].d.length < 20) err("Geometria vazia: " + u);

// ---- fronteiras (ADJ), terreno e exércitos ----
const ADJ = grab("ADJ"), TERRAIN = grab("TERRAIN"), TERRAIN_TYPES = grab("TERRAIN_TYPES");
{
  const keys = Object.keys(ADJ);
  if (keys.length !== 27 || UFS.some(u => !ADJ[u])) err("ADJ não cobre as 27 UFs");
  let pairs = 0;
  for (const u of keys) for (const n of ADJ[u]){
    if (!UFS.includes(n)) err(`ADJ ${u}: vizinho inválido ${n}`);
    if (n === u) err(`ADJ ${u}: vizinho de si mesmo`);
    if (!(ADJ[n] || []).includes(u)) err(`ADJ não é simétrica: ${u}→${n} sem ${n}→${u}`);
    if (u < n) pairs++;
    if (ADJ[u].indexOf(n) !== ADJ[u].lastIndexOf(n)) err(`ADJ ${u}: vizinho repetido ${n}`);
  }
  const seen = new Set(["DF"]), st = ["DF"]; while (st.length) for (const n of ADJ[st.pop()]) if (!seen.has(n)){ seen.add(n); st.push(n); }
  if (seen.size !== 27) err("grafo de fronteiras desconexo: " + UFS.filter(u => !seen.has(u)));
  // conferência geométrica: vizinhos compartilham borda nos polígonos do mapa; não vizinhos ficam afastados
  const pts = {}; for (const u of UFS) pts[u] = [...MAP_DATA.states[u].d.matchAll(/(-?\d+\.?\d*),(-?\d+\.?\d*)/g)].map(m => [+m[1], +m[2]]);
  const segd = (p, a, b) => { const dx = b[0]-a[0], dy = b[1]-a[1], L = dx*dx+dy*dy; let t = L ? ((p[0]-a[0])*dx + (p[1]-a[1])*dy) / L : 0; t = Math.max(0, Math.min(1, t)); return Math.hypot(a[0]+t*dx-p[0], a[1]+t*dy-p[1]); };
  const near = (A, B) => { let m = 1e9, cnt = 0; for (const p of pts[A]){ let d = 1e9; for (let i = 0; i < pts[B].length-1; i++) d = Math.min(d, segd(p, pts[B][i], pts[B][i+1])); m = Math.min(m, d); if (d < 1) cnt++; } return { m, cnt }; };
  for (let i = 0; i < UFS.length; i++) for (let j = i+1; j < UFS.length; j++){
    const a = UFS[i], b = UFS[j], adj = ADJ[a].includes(b), x = near(a, b), y = near(b, a), d = Math.min(x.m, y.m);
    if (adj && d > 0.5) err(`ADJ ${a}-${b}: polígonos não se tocam no mapa (distância ${d.toFixed(2)})`);
    if (!adj && d < 1.5) err(`${a}-${b} se tocam no mapa mas não estão na ADJ`);
  }
  for (const u of UFS) if (!TERRAIN_TYPES[TERRAIN[u]]) err(`TERRAIN ${u} ausente/inválido`);
  console.log(`Fronteiras: ${pairs} pares simétricos, grafo conexo, conferidos contra a geometria do mapa; terreno em 27/27 UFs`);
}

const ids = new Set();
for (const sc of SCENARIOS) {
  if (ids.has(sc.id)) err("id de cenário duplicado: " + sc.id); ids.add(sc.id);
  if (sc.soon) { console.log(`\n[${sc.year}] ${sc.title} — placeholder "Em breve"`); continue; }
  console.log(`\n[${sc.year}] ${sc.title} (${sc.id})${sc.locked ? " — BLOQUEADO (não jogável; dados validados para não apodrecerem)" : ""}`);
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
      if (!["eco","mil","pol","dip","sul"].includes(a.cat)) err(`ação ${a.id}: categoria ${a.cat}`); checkFx("ação " + a.id, a.fx); checkC("ação " + a.id, a.show); checkC("ação " + a.id, a.req); if (a.risk) checkFx("risco " + a.id, a.risk.fx); }
    const eids = new Set();
    for (const e of C.events){ if (eids.has(e.id)) err("evento duplicado " + e.id); eids.add(e.id); checkC("evento " + e.id, e.if);
      if (e.crisisOf && !FCS.includes(e.crisisOf)) err(`evento ${e.id}: crisisOf ${e.crisisOf}`);
      if (!e.choices || e.choices.length < 2) err(`evento ${e.id}: precisa de 2+ escolhas`);
      e.choices.forEach((c, i) => { checkFx(`evento ${e.id}#${i}`, c.fx); checkC(`evento ${e.id}#${i}`, c.req);
        if (c.next) for (const b of c.next) if (b.to && !isNode(b.to)) err(`evento ${e.id}: next ${b.to}`); }); }
    for (const f of FCS) if (!C.events.some(e => e.crisisOf === f)) err(`facção ${f} sem evento de crise`);
    // eventos: textos, chaves de efeito, desdobramentos (chain) e flags exigidas que alguém consegue produzir
    {
      const E = id => C.events.find(e => e.id === id), chainedBy = {};
      const flagsMade = new Set([...(JSON.stringify([STORY, C]).match(/"flag":"[a-z_0-9]+"/g) || []).map(x => x.slice(8, -1)),
        ...((C.focus && C.focus.nodes) || []).map(F => "fo_" + F.id)]);
      for (const e of C.events){
        const w = "evento " + e.id;
        if (!e.title || !e.text || !e.text.length || e.text.some(t => typeof t !== "string" || t.length < 10)) err(`${w}: título/texto vazio`);
        if (e.choices.length > 4) err(`${w}: escolhas demais (${e.choices.length})`);
        if (new Set(e.choices.map(c => c.text)).size !== e.choices.length) err(`${w}: escolhas repetidas`);
        if (!e.generic && !e.choices.some(c => !c.req)) err(`${w}: nenhuma escolha sem requisito (pode travar a fila)`);
        if (e.if && e.if.from && e.if.until && e.if.from > e.if.until) err(`${w}: from > until`);
        for (const f of [...((e.if || {}).flags || [])]) if (!flagsMade.has(f)) err(`${w}: exige flag ${f} que nada produz`);
        e.choices.forEach((c, i) => {
          for (const k in c.fx || {}) if (!EVENT_FX_KEYS.includes(k)) err(`${w}#${i}: chave de efeito "${k}" inválida`);
          for (const k of ["money", "reserve", "front", "org", "enemyLoss", "enemy", "unrest", "unrestAll", "ceasefire", "actAll", "ap"]) if (c.fx && k in c.fx && !Number.isFinite(c.fx[k])) err(`${w}#${i}: ${k} não numérico`);
          for (const f of ((c.req || {}).flags || [])) if (!flagsMade.has(f)) err(`${w}#${i}: requisito com flag ${f} que nada produz`);
          for (const ch of [].concat((c.fx || {}).chain || [])){
            const t = E(ch.id);
            if (!t) err(`${w}#${i}: desdobramento ${ch.id} inexistente`);
            else if (!t.chained) err(`${w}#${i}: ${ch.id} deveria ter chained: true`);
            if (!(ch.in >= 1 && ch.in <= 12)) err(`${w}#${i}: desdobramento em ${ch.in} meses`);
            (chainedBy[ch.id] ||= []).push(e.id);
          }
        });
      }
      if (C.south && C.south.summit) (chainedBy[C.south.summit] ||= []).push("Tensão no Sul ≥ " + C.south.summitAt);
      if (C.south && C.south.summit && !E(C.south.summit)) err(`south.summit: evento ${C.south.summit} inexistente`);
      for (const e of C.events.filter(e => e.chained)) if (!chainedBy[e.id]) err(`evento ${e.id}: chained sem nenhum evento que o dispare`);
      const nCh = C.events.filter(e => e.chained).length, nCr = C.events.filter(e => e.crisisOf).length;
      console.log(`  Eventos: ${C.events.length} (${C.events.length - nCh - nCr} sorteáveis, ${nCh} desdobramentos, ${nCr} crises de facção) — textos, efeitos, flags e encadeamentos válidos`);
    }
    if (C.nationalFac && !FCS.includes(C.nationalFac)) err("nationalFac inválida");
    // ---- exércitos ----
    { const A = C.army;
      if (!A) err("campaign.army ausente");
      else {
        if (!UFS.includes(A.capital)) err("army.capital inválida");
        if (!(A.start||[]).length) err("army.start vazio: o jogador precisa de exércitos desde o início");
        for (const s0 of A.start||[]){ if (!UFS.includes(s0.uf)) err(`army.start UF ${s0.uf}`); if (!(s0.str >= 5 && s0.str <= 60)) err(`army.start força ${s0.str}`); }
        for (const [k, arr] of Object.entries(A.names||{})){ if (k !== "player" && k !== "enemy" && !FAC.includes(k)) err(`army.names: chave ${k}`); if (!arr.length || new Set(arr).size !== arr.length) err(`army.names.${k} vazio/duplicado`); }
        for (const [k, arr] of Object.entries(A.gens||{})) if (!(A.names||{})[k]) err(`army.gens.${k} sem lista de nomes`);
        if (!(A.names||{}).player) err("army.names.player ausente");
        for (const k of ["recruitCost","reinforceCost"]) if (A[k] !== undefined && !(A[k] > 0)) err(`army.${k}`);
        const enemyFacs = [...new Set(C.phases.flatMap(p => p.enemy||[]))];
        if (enemyFacs.length && !(A.names||{}).enemy && !enemyFacs.every(f => (A.names||{})[f])) err("army.names sem nomes para o inimigo");
      }
      for (const a of C.actions) if (a.cat === "mil" && a.fx && a.fx.reserve > 0 && (a.ap ?? 1) !== 0) err(`ação ${a.id}: recrutamento não deve custar PA`);
    }
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
// ---- saves: migração v2 → v4 e v3 → v4, e um combate de teste ----
{
  const API = new Function(JOGO.codigo + "; return { SCENARIOS, scOf, newCampaign, migrateSave, SAVE_VERSION, endTurn, armiesOf, armyAllowed, setOrder, armyTargets, fight, phaseOf, sideOf, choose, queueChoices, battleReport, advisorTips, advisorDo, coupState, coupStoryTip, coupReadiness, golpeCfg, endingGrade, earnedAchievements, achMerge, CONQUISTAS };")();
  let n = 0;
  for (const sc of API.SCENARIOS){ if (sc.soon || !sc.campaign) continue;
    for (let seed = 1; seed <= 25; seed++){
      const g = API.newCampaign(sc, seed);
      for (let t = 0; t < seed % 9 && !g.ended; t++){ while (g.queue.length && !g.ended){ const ch = API.queueChoices(g); const ok = ch.findIndex(c => c.ok); API.choose(g, ok < 0 ? 0 : ok); } if (!g.ended) API.endTurn(g); }
      if (g.ended) continue;
      // reconstrói um save antigo (v2): tropas como contadores por estado + reserva
      const v2 = JSON.parse(JSON.stringify(g)); v2.v = 2; v2.reserve = 2 + seed % 3;
      for (const k of ["armies","armySeq","armyN","enemyPlans","enemyPool","mil","armsAid","milPhase"]) delete v2[k];
      const ufs = Object.keys(v2.uf); for (const uf of ufs) v2.uf[uf].force = 0;
      for (const uf of ufs.filter(uf => API.sideOf(v2, v2.control[uf]) === "player").slice(0, 2)) v2.uf[uf].force = 1 + seed % 3;
      const total = v2.reserve + ufs.reduce((s, uf) => s + v2.uf[uf].force, 0);
      const m = API.migrateSave(v2);
      if (!m || m.v !== API.SAVE_VERSION) { err(`${sc.id}#${seed}: migração v2 falhou`); continue; }
      if ("reserve" in m || ufs.some(uf => "force" in m.uf[uf])) err(`${sc.id}#${seed}: migração deixou campos antigos`);
      const str = API.armiesOf(m, "player").reduce((s, a) => s + a.str, 0);
      if (!API.phaseOf(m).noArmies && str < Math.min(total * 10, 8 * 60) * 0.5) err(`${sc.id}#${seed}: migração perdeu tropas (${total} unid. → ${str} de força)`);
      for (const a of m.armies) if (!API.armyAllowed(m, a.side, a.uf)) err(`${sc.id}#${seed}: exército migrado em território impossível`);
      JSON.parse(JSON.stringify(m)); if (!API.endTurn(m) && !m.queue.length) err(`${sc.id}#${seed}: save migrado não avança`);
      n++;
    }
  }
  // v3 → v4: sem histórico de batalhas nem reserva de alistamento
  let n3 = 0;
  for (const sc of API.SCENARIOS){ if (sc.soon || !sc.campaign) continue;
    for (let seed = 1; seed <= 15; seed++){
      const g = API.newCampaign(sc, seed);
      for (let t = 0; t < seed % 7 && !g.ended; t++){ while (g.queue.length && !g.ended){ const ch = API.queueChoices(g); const ok = ch.findIndex(c => c.ok); API.choose(g, ok < 0 ? 0 : ok); } if (!g.ended) API.endTurn(g); }
      if (g.ended) continue;
      const v3 = JSON.parse(JSON.stringify(g)); v3.v = 3; delete v3.battleLog; delete v3.mobPool; if (v3.used) v3.used._recruit = true;
      const m = API.migrateSave(v3);
      if (!m || m.v !== API.SAVE_VERSION || !Array.isArray(m.battleLog) || m.mobPool !== 0) { err(`${sc.id}#${seed}: migração v3→v4 falhou`); continue; }
      if (!API.endTurn(m) && !m.queue.length) err(`${sc.id}#${seed}: save v3 migrado não avança`);
      n3++;
    }
  }
  // v4 → v5: sem fila de desdobramentos (g.chains)
  let n4 = 0;
  for (let seed = 1; seed <= 15; seed++){
    const g = API.newCampaign(API.SCENARIOS.find(s => s.id === "brasil2022"), seed);
    for (let t = 0; t < seed % 6 && !g.ended; t++){ while (g.queue.length && !g.ended){ const ch = API.queueChoices(g); const ok = ch.findIndex(c => c.ok); API.choose(g, ok < 0 ? 0 : ok); } if (!g.ended) API.endTurn(g); }
    if (g.ended) continue;
    const v4 = JSON.parse(JSON.stringify(g)); v4.v = 4; delete v4.chains;
    const m = API.migrateSave(v4);
    if (!m || m.v !== API.SAVE_VERSION || !Array.isArray(m.chains)) { err(`brasil2022#${seed}: migração v4→v5 falhou`); continue; }
    if (!API.endTurn(m) && !m.queue.length) err(`brasil2022#${seed}: save v4 migrado não avança`);
    n4++;
  }
  // v6 → v7: saves antigos continuam no Normal, campanha completa; Fácil/Difícil/Rápida criam variantes sem mexer no cenário original
  let n6 = 0;
  { const sc22 = API.SCENARIOS.find(s => s.id === "brasil2022"), C0 = JSON.stringify(sc22.campaign.money) + sc22.campaign.enemyPower + JSON.stringify(sc22.campaign.pace);
    for (let seed = 1; seed <= 10; seed++){
      const g = API.newCampaign(sc22, seed); if (g.ended) continue;
      const v6 = JSON.parse(JSON.stringify(g)); v6.v = 6; delete v6.diff; delete v6.quick; delete v6.simple;
      const m = API.migrateSave(v6);
      if (!m || m.v !== API.SAVE_VERSION || m.diff !== "normal" || m.quick !== false || m.simple !== false) { err(`brasil2022#${seed}: migração v6→v7 falhou`); continue; }
      if (!API.endTurn(m) && !m.queue.length) err(`brasil2022#${seed}: save v6 migrado não avança`);
      n6++;
    }
    for (const [diff, quick] of [["facil", false], ["dificil", false], ["normal", true], ["facil", true]]){
      const g = API.newCampaign(sc22, 3, { diff, quick });
      if (g.diff !== diff || g.quick !== quick || g.simple !== (diff === "facil")) err(`modo ${diff}${quick ? "+rápida" : ""}: campos do save errados`);
      if (API.scOf(g) === sc22 || API.scOf(g).story !== sc22.story) err(`modo ${diff}: variante do cenário inválida`);
    }
    if (API.scOf(API.newCampaign(sc22, 3)) !== sc22) err("Normal precisa usar o cenário original");
    if (JSON.stringify(sc22.campaign.money) + sc22.campaign.enemyPower + JSON.stringify(sc22.campaign.pace) !== C0) err("os modos alteraram o cenário original");
    // conselheira: no máximo 2 dicas, com título, texto e ação; "Fazer isso" funciona e não quebra a partida
    for (let seed = 1; seed <= 12; seed++){
      const g = API.newCampaign(sc22, seed, { diff: seed % 2 ? "facil" : "normal" });
      for (let t = 0; t < 14 && !g.ended; t++){
        while (g.queue.length && !g.ended){ const ch = API.queueChoices(g); const ok = ch.findIndex(c => c.ok); API.choose(g, ok < 0 ? 0 : ok); }
        if (g.ended) break;
        const tips = API.advisorTips(g, { tab: "mapa" });
        if (!tips.length || tips.length > 2 || tips.some(x => !x.head || !x.text || !x.act || !x.act.k)) { err(`conselheira#${seed}: dicas inválidas`); break; }
        const tp = tips.find(x => x.act.k !== "tab" && x.act.k !== "end");
        if (tp && API.advisorDo(g, tp).ok === false) err(`conselheira#${seed}: "Fazer isso" falhou (${tp.id})`);
        API.endTurn(g);
      }
    }
    // conselheira no caminho do golpe (ficção do cenário): "porta" antes da posse, "plano" na conspiração, nada depois de aceitar o resultado
    {
      const K = API.golpeCfg(API.newCampaign(sc22, 1));
      if (!K) err("brasil2022 sem dados da linha do golpe (golpe.js)");
      else {
        const fs = require("fs"), EN = new Function(fs.readFileSync(require("path").join(JOGO.RAIZ, "js/i18n/en.js"), "utf8") + "; return I18N_EN;")();
        const key = s => { let n = 0; return s.replace(/\{\d\}/g, "7").replace(/\d+(?:[.,]\d+)?/g, () => "{" + (n++) + "}"); };
        for (const v of Object.values(K.falas).concat(Object.values(K.falas.req)).filter(v => typeof v === "string"))
          if (!(/\d/.test(v) ? EN.tpl[key(v)] : EN.exact[v])) err(`golpe.js: fala sem tradução EN: "${v.slice(0, 50)}"`);
        for (const [n, o] of Object.entries(K.nos)) for (const i of Object.values(o)) if (!sc22.story.nodes[n] || !sc22.story.nodes[n].choices[i]) err(`golpe.js: escolha ${n}[${i}] não existe na história`);
        for (const id of K.focos) if (!sc22.campaign.focus.nodes.some(F => F.id === id)) err(`golpe.js: foco ${id} não existe`);
        // porta: a dica da apuração aponta para "convocar os comandantes"; em outra aba só avisa da fila
        const g0 = API.newCampaign(sc22, 2);
        if (API.coupState(g0) !== "porta") err("início da campanha deveria abrir a linha do golpe (porta)");
        const t0 = API.advisorTips(g0, { tab: "historia" });
        if (t0.length !== 1 || t0[0].act.k !== "choose" || t0[0].act.i !== K.nos.apuracao.golpe) err("na apuração a conselheira deveria sugerir convocar os comandantes");
        if (API.advisorTips(g0, { tab: "mapa" }).some(t => t.golpe)) err("fora da aba História a dica do golpe não deveria aparecer com a fila cheia");
        // aceitar o resultado: dicas normais pelo resto da campanha
        API.choose(g0, 0);
        for (let t = 0; t < 8 && !g0.ended; t++){
          while (g0.queue.length && !g0.ended){ const ch = API.queueChoices(g0); API.choose(g0, Math.max(0, ch.findIndex(c => c.ok))); }
          if (g0.ended) break;
          if (API.coupState(g0) || API.advisorTips(g0, { tab: "mapa" }).some(t => t.golpe)) { err("depois de aceitar o resultado a conselheira não deveria falar em golpe"); break; }
          API.endTurn(g0);
        }
        // seguir só a conselheira até o golpe: dicas válidas, "Fazer isso" funciona, prontidão 0–100; Fácil/Normal consumam o golpe
        const ok = { facil: 0, normal: 0, dificil: 0 }, N = 6;
        for (const diff of ["facil", "normal", "dificil"]) for (let seed = 1; seed <= N; seed++){
          const g = API.newCampaign(sc22, seed, { diff });
          for (let t = 0; t < 20 && !g.ended && !g.visited.includes("golpe_inicial") && !g.visited.includes("golpe_fracassa"); t++){
            let guard = 0;
            while (g.queue.length && !g.ended && guard++ < 20){
              const st = API.coupState(g), tip = API.coupStoryTip(g, st);
              if (tip){ if (API.advisorDo(g, tip).ok === false) err(`golpe ${diff}#${seed}: escolha sugerida falhou`); }
              else { const ch = API.queueChoices(g); API.choose(g, Math.max(0, ch.findIndex(c => c.ok))); }
            }
            if (g.ended || g.visited.includes("golpe_inicial") || g.visited.includes("golpe_fracassa")) break;
            const st = API.coupState(g);
            if (st){ const R = API.coupReadiness(g);
              if (!(R.pct >= 0 && R.pct <= 100) || !R.reqs.length || !R.hora || !["sim", "talvez", "nao"].includes(R.troops)) err(`golpe ${diff}#${seed}: prontidão inválida`); }
            for (let k = 0; k < 10; k++){
              const tips = API.advisorTips(g, { tab: "mapa" });
              if (tips.length > 2 || tips.some(x => !x.head || !x.text || !x.act)) { err(`golpe ${diff}#${seed}: dicas inválidas`); break; }
              const tp = tips.find(x => x.act.k !== "tab" && x.act.k !== "end"); if (!tp) break;
              if (API.advisorDo(g, tp).ok === false) break;
            }
            API.endTurn(g);
          }
          if (g.visited.includes("golpe_inicial")) ok[diff]++;
          if (!g.visited.includes("sondagem")) err(`golpe ${diff}#${seed}: seguindo a conselheira a reunião secreta deveria acontecer`);
        }
        if (ok.facil < N || ok.normal < N - 1) err(`seguindo a conselheira o golpe deveria dar certo no Fácil e no Normal (Fácil ${ok.facil}/${N}, Normal ${ok.normal}/${N})`);
        // Difícil: conselho mais vago (sem números) nas escolhas da história
        const gd = API.newCampaign(sc22, 4, { diff: "dificil" }); API.choose(gd, K.nos.apuracao.golpe);
        for (let t = 0; t < 6 && !gd.queue.some(q => q.node === "sondagem"); t++){ while (gd.queue.length) API.choose(gd, 0); API.endTurn(gd); }
        if (gd.queue[0] && gd.queue[0].node === "sondagem"){ const tp = API.coupStoryTip(gd, API.coupState(gd)); if (!tp || /\d/.test(tp.text)) err("no Difícil o conselho da reunião secreta deveria ser vago (sem números)"); }
        else err("Difícil: a reunião secreta não chegou para o teste");
      }
    }
  }
  // tela de final: nota S/A/B/C válida, conquistas conhecidas, dica em todo final e união local+nuvem das conquistas
  {
    const sc22 = API.SCENARIOS.find(s => s.id === "brasil2022"), ids = API.CONQUISTAS.map(c => c.id);
    if (new Set(ids).size !== ids.length) err("conquistas com id repetido");
    for (const [id, n] of Object.entries(sc22.story.nodes)) if (n.ending && !n.dica) err(`final ${id} sem dica (botão "Tentar outro final")`);
    let ended = 0;
    for (let seed = 1; seed <= 30; seed++){
      const g = API.newCampaign(sc22, seed, { diff: ["facil", "normal", "dificil"][seed % 3], quick: seed % 2 === 0 });
      for (let t = 0; t < 60 && !g.ended; t++){
        while (g.queue.length && !g.ended){ const ch = API.queueChoices(g); const ok = ch.findIndex(c => c.ok); API.choose(g, ok < 0 ? 0 : ok); }
        if (!g.ended) API.endTurn(g);
      }
      if (!g.ended) continue; ended++;
      const gr = API.endingGrade(g), got = API.earnedAchievements(g, { achados: 9, total: 9 });
      if (!"SABC".includes(gr.letter) || !(gr.score >= 0 && gr.score <= 100) || !gr.parts.length) err(`nota inválida #${seed}: ${gr.letter} ${gr.score}`);
      if (gr.outcome === "derrota" && "SA".includes(gr.letter)) err(`derrota com nota ${gr.letter}`);
      if (!got.includes("primeira") || !got.includes("historiador") || got.some(id => !ids.includes(id))) err(`conquistas inválidas #${seed}: ${got.join(",")}`);
    }
    if (ended < 20) err(`só ${ended}/30 partidas de teste chegaram ao final`);
    const m = API.achMerge({ v: 1, got: { primeira: { at: 5 }, xyz: { at: 1 } }, best: { brasil2022: "B" } }, { v: 1, got: { primeira: { at: 3 }, vitoria: { at: 9 } }, best: { brasil2022: "A", outro: "Z" } });
    if (m.got.primeira.at !== 3 || !m.got.vitoria || m.got.xyz || m.best.brasil2022 !== "A" || m.best.outro) err("achMerge: união das conquistas errada");
    if (Object.keys(API.achMerge(null, "lixo").got).length) err("achMerge: dados inválidos deveriam virar registro vazio");
  }
  // retratos: só personagens fictícios têm rosto; todo id mapeado existe; todo arquivo é usado e todo rosto tem arquivo webp
  {
    const fs = require("fs"), path = require("path"), sc22 = API.SCENARIOS.find(s => s.id === "brasil2022"), R = sc22.retratos;
    if (!R) err("brasil2022 sem retratos");
    else {
      const dir = path.join(JOGO.RAIZ, "assets", "retratos"), files = new Set(fs.readdirSync(dir).filter(f => f.endsWith(".webp")).map(f => f.slice(0, -5)));
      const used = new Set();
      for (const [k, p] of Object.entries(R.pessoas)){
        if (!p.nome || !p.cargo) err(`retrato ${k} sem nome/cargo`);
        if (p.img){ used.add(p.img); if (!files.has(p.img)) err(`retrato ${k}: falta assets/retratos/${p.img}.webp`); else if (fs.statSync(path.join(dir, p.img + ".webp")).size > 60000) err(`retrato ${p.img}.webp grande demais`); }
        else if (!p.icone && !p.silhueta) err(`retrato ${k}: precisa de img, icone ou silhueta`);
      }
      for (const f of files) if (!used.has(f)) err(`assets/retratos/${f}.webp não é usado em retratos.js`);
      const ids = { faccoes: sc22.campaign.factions.map(f => f.id), atores: sc22.campaign.actors.map(a => a.id), eventos: sc22.campaign.events.map(e => e.id),
        historia: Object.keys(sc22.story.nodes), generais: Object.values(sc22.campaign.army && sc22.campaign.army.gens || {}).flat() };
      for (const kind of Object.keys(ids)) for (const [id, key] of Object.entries(R[kind] || {})){
        if (!ids[kind].includes(id)) err(`retratos.${kind}: "${id}" não existe no cenário`);
        if (!R.pessoas[key]) err(`retratos.${kind}.${id}: personagem "${key}" não existe`);
      }
      for (const id of ids.faccoes) if (!R.faccoes[id]) err(`facção ${id} sem porta-voz em retratos.js`);
      for (const id of ids.atores) if (!R.atores[id]) err(`ator ${id} sem retrato em retratos.js`);
      for (const n of ids.generais) if (!R.generais[n]) err(`general "${n}" sem retrato`);
      for (const id of ["n_transicao_dados", "r_argentina", "n_mercosul", "n_governador_desponta", "f_herdeiro"]) if (R.eventos[id] && R.pessoas[R.eventos[id]].img) err(`evento ${id} envolve pessoa real: use ícone ou silhueta`);
    }
  }
  // desdobramento: escolher "n_acampamentos" agenda "n_acampamentos_radical", que precisa aparecer em poucos meses
  {
    let okChain = 0;
    for (let seed = 1; seed <= 10; seed++){
      const g = API.newCampaign(API.SCENARIOS.find(s => s.id === "brasil2022"), seed);
      while (g.queue.length && !g.ended){ const ch = API.queueChoices(g); const ok = ch.findIndex(c => c.ok); API.choose(g, ok < 0 ? 0 : ok); }
      g.queue.push({ type: "event", id: "n_acampamentos" });
      const ch = API.queueChoices(g), idx = ch.findIndex((c, i) => c.ok && JSON.stringify((g.queue[0] && API.SCENARIOS.find(s => s.id === "brasil2022").campaign.events.find(e => e.id === "n_acampamentos").choices[i].fx) || {}).includes("n_acampamentos_radical"));
      if (idx < 0) { err("n_acampamentos sem escolha que agende o desdobramento"); break; }
      API.choose(g, idx);
      if (!(g.chains || []).some(c => c.id === "n_acampamentos_radical")) { err("chain não registrado em g.chains"); break; }
      let seen = false;
      for (let t = 0; t < 4 && !g.ended && !seen; t++){
        API.endTurn(g);
        seen = g.queue.some(q => q.id === "n_acampamentos_radical");
        while (g.queue.length && !g.ended){ const c2 = API.queueChoices(g); const ok = c2.findIndex(c => c.ok); API.choose(g, ok < 0 ? 0 : ok); }
      }
      if (seen) okChain++;
    }
    if (okChain < 8) err(`desdobramento apareceu só em ${okChain}/10 campanhas`);
    console.log(`\nDesdobramentos: n_acampamentos → n_acampamentos_radical apareceu em ${okChain}/10 campanhas de teste`);
  }
  const g = API.newCampaign(API.SCENARIOS.find(s => s.id === "brasil2022"), 7);
  const A = { side: "player", role: "att", units: [{ name: "A", str: 30, org: 70, xp: 10 }] }, B = { side: "enemy", role: "def", units: [{ name: "B", str: 20, org: 60, xp: 10, militia: true }] };
  const rec = API.fight(g, "MG", A, B, "ataque");
  if (!(rec.rounds.length >= 1 && rec.rounds.length <= 5) || ![0, 1].includes(rec.win) || !(rec.margin >= 0 && rec.margin <= 1) || rec.loss.some(x => !(x >= 0))) err("combate de teste inválido");
  const BR = API.battleReport(rec);
  if (!BR.summary || !BR.tips.length || BR.rows.length < 3 || BR.won !== (rec.win === 0)) err("relatório de batalha de teste inválido");
  console.log(`\nSaves: ${n} saves v2 e ${n3} saves v3 e ${n4} saves v4 e ${n6} saves v6 sintéticos migrados para v${API.SAVE_VERSION} e jogados mais 1 mês; combate de teste OK (${rec.rounds.length} rodadas)`);
  console.log(`  relatório de teste: ${BR.summary}`);
}
// ---- organização dos arquivos: todo js/ e css/ listado uma vez no index.html, com comentário no topo ----
{
  const path = require("path"), html = fs.readFileSync(path.join(JOGO.RAIZ, "index.html"), "utf8");
  const walk = d => fs.readdirSync(path.join(JOGO.RAIZ, d), { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(d + "/" + e.name) : [d + "/" + e.name]);
  const css = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)">/g)].map(m => m[1]);
  const listed = [...JOGO.scripts, ...css, "js/nuvem/cloud.js", "js/nuvem/config.js"];
  for (const f of listed){ if (!fs.existsSync(path.join(JOGO.RAIZ, f))) err("index.html aponta para arquivo que não existe: " + f); if (listed.indexOf(f) !== listed.lastIndexOf(f)) err("arquivo listado duas vezes no index.html: " + f); }
  for (const f of [...walk("js"), ...walk("css")]){
    if (!listed.includes(f)) err(`arquivo fora do index.html (não carrega no jogo): ${f}`);
    const top = fs.readFileSync(path.join(JOGO.RAIZ, f), "utf8").slice(0, 3);
    if (!/^(\/\/|\/\*)/.test(top)) err(`${f}: falta o comentário de topo explicando o arquivo`);
  }
  // nomes globais declarados duas vezes quebrariam o jogo (scripts clássicos dividem o mesmo escopo)
  const decl = {};
  for (const f of JOGO.scripts) for (const m of fs.readFileSync(path.join(JOGO.RAIZ, f), "utf8").matchAll(/^(?:function\s+([\w$]+)|(?:const|let|var)\s+([\w$]+)\s*=)/gm)){
    const n = m[1] || m[2]; if (decl[n]) err(`nome global repetido: ${n} (${decl[n]} e ${f})`); else decl[n] = f; }
  console.log(`\nArquivos: ${JOGO.scripts.length} scripts e ${css.length} CSS no index.html; ${Object.keys(decl).length} nomes globais sem repetição`);
}
// ---- tradução (aviso, não falha): nomes de ações e focos sem inglês em js/i18n/en.js ----
{
  const t = fs.readFileSync(JOGO.RAIZ + "/js/i18n/traducao.js", "utf8") + fs.readFileSync(JOGO.RAIZ + "/js/i18n/en.js", "utf8");
  const trCore = new Function('const SET = { lang: "en" }; const document = { title: "" };' + t + "; return trCore;")();
  for (const sc of SCENARIOS.filter(s => !s.locked && !s.soon && s.campaign)){
    const C = sc.campaign, falta = [...C.actions.map(a => a.name), ...((C.focus && C.focus.nodes) || []).map(f => f.name)].filter(x => trCore(x) == null);
    console.log(`Tradução [${sc.year}]: ${falta.length ? `${falta.length} nomes de ações/focos sem inglês (aparecem em português): ${falta.slice(0, 5).join(" · ")}${falta.length > 5 ? " …" : ""}` : "todas as ações e focos têm inglês"}`);
  }
}
console.log(errors ? `\nFALHOU (${errors} problemas)` : "\nOK: todos os cenários íntegros, todos os nós e finais alcançáveis.");
if (errors) process.exit(1);
console.log("\n=== Simulação de campanhas (sim.js) ===");
const r = require("child_process").spawnSync(process.execPath, [__dirname + "/sim.js", process.argv[2] || "150"], { stdio: "inherit" });
// Cenários bloqueados: teste curto de integridade (só exceções/invariantes; a cobertura de finais não é exigida)
let lockedFail = 0;
for (const sc of SCENARIOS.filter(s => s.locked && s.campaign)){
  const q = require("child_process").spawnSync(process.execPath, [__dirname + "/sim.js", "40", sc.id], { encoding: "utf8" });
  const out = (q.stdout || "") + (q.stderr || ""), fin = (out.match(/Finais alcançados: [^\n]*/) || ["?"])[0];
  console.log(`\n[${sc.year}] ${sc.title} (bloqueado): 40 partidas por IA — ${q.status === 0 ? "sem falhas" : "FALHOU"} · ${fin}`);
  if (q.status !== 0){ console.log(out.split("\n").filter(l => /falha|exceção|✗|!/.test(l)).slice(0, 10).join("\n")); lockedFail++; }
}
// Dificuldades e partida rápida: sem falhas, todos os finais alcançáveis no conjunto, e Fácil > Difícil em vitórias da IA aleatória
let modeFail = 0; const winOf = {};
for (const args of [["--dif=facil"], ["--dif=dificil"], ["--rapida"], ["--dif=facil", "--rapida"]]){
  const q = require("child_process").spawnSync(process.execPath, [__dirname + "/sim.js", "80", "brasil2022", ...args], { encoding: "utf8" });
  const out = (q.stdout || "") + (q.stderr || ""), fin = (out.match(/Finais alcançados: [^\n]*/) || ["?"])[0];
  const rnd = out.split("IA aleatoria")[1] || "", w = +((rnd.match(/resultado: vitória (\d+)%/) || [])[1] || 0); winOf[args.join(" ")] = w;
  console.log(`\n[modo ${args.join(" ")}] 80 partidas por IA — ${q.status === 0 ? "sem falhas" : "FALHOU"} · ${fin} · vitória da IA aleatória ${w}%`);
  if (q.status !== 0){ console.log(out.split("\n").filter(l => /falha|exceção|✗|!/.test(l)).slice(0, 10).join("\n")); modeFail++; }
}
if (!(winOf["--dif=facil"] > winOf["--dif=dificil"] + 10)) { console.log("  ✗ Fácil deveria vencer bem mais que Difícil"); modeFail++; }
process.exit(r.status || (lockedFail || modeFail ? 1 : 0));
