// js/core/ordens.js — Núcleo: ordens do jogador, recrutar, reforçar, alistamento e intenções inimigas visíveis.
/* --- Ordens do jogador (sem AP) --- */
function commandLimit(g){ const C = scOf(g).campaign, mil = g.stats[C.keys.mil] ?? 50, nat = natLoyalty(g);
  return clamp(1 + Math.floor(mil / 25) + (nat >= 65 ? 1 : nat < 25 ? -1 : 0), 1, 5); }
function ordersUsed(g){ return armiesOf(g, "player").filter(a => a.order && MANEUVER.includes(a.order.type)).length; }
function reinforceCost(g){ return armyCfg(g).reinforceCost ?? 3; }
function recruitCost(g){ return armyCfg(g).recruitCost ?? 8; }
function armyTargets(g, a){
  const ph = phaseOf(g), war = !!ph.war && !(g.ceasefire > 0), here = sideOf(g, g.control[a.uf], ph), out = [];
  for (const t of ADJ[a.uf]){
    const s = sideOf(g, g.control[t], ph);
    if (s === "player") out.push({ uf: t, type: here === "contested" ? "recuar" : "mover" });
    else if (s === "contested") { if (war) out.push({ uf: t, type: "atacar" }); else if (!ph.war) out.push({ uf: t, type: "mover" }); }
    else if (s === "enemy" && war) out.push({ uf: t, type: "atacar" });
  }
  return out;
}
function setOrder(g, id, type, to){
  const a = armyById(g, id);
  if (!a || a.side !== "player") return { ok: false, msg: "Exército inválido." };
  if (g.ended) return { ok: false, msg: "Partida encerrada." };
  if (g.queue.length) return { ok: false, msg: "Resolva os eventos pendentes antes de dar ordens." };
  const refund = () => { if (a.order && a.order.type === "reforcar") g.money += a.order.paid || 0; };
  const here = MAP_DATA.states[a.uf].name;
  if (!type){ refund(); a.order = null; return { ok: true, msg: `${a.name}: ordem cancelada.` }; }
  if (type === "defender"){ refund(); a.order = { type }; return { ok: true, msg: `${a.name} vai defender ${here}.` }; }
  if (type === "reforcar"){
    const cost = reinforceCost(g);
    if (a.order && a.order.type === "reforcar") return { ok: true, msg: `${a.name} já será reforçado.` };
    if (sideOf(g, g.control[a.uf]) !== "player") return { ok: false, msg: "Só é possível reforçar em território seu." };
    if (a.str > ARMY_MAX - STR_UNIT) return { ok: false, msg: "Este exército já está com efetivo máximo." };
    if (g.money < cost) return { ok: false, msg: "Recursos insuficientes." };
    g.money -= cost; a.order = { type, paid: cost };
    return { ok: true, msg: `${a.name} receberá +${STR_UNIT} de força no fim do mês (−${cost}).` };
  }
  const t = armyTargets(g, a).find(x => x.uf === to);
  if (!t) return { ok: false, msg: isWar(g) ? (g.ceasefire > 0 ? "Trégua em vigor: só movimentos entre seus estados." : "Alvo fora de alcance: escolha um estado vizinho.") : "Sem guerra: só é possível reposicionar tropas entre estados vizinhos seus." };
  const was = a.order && MANEUVER.includes(a.order.type);
  if (!was && ordersUsed(g) >= commandLimit(g)) return { ok: false, msg: `Limite de comando atingido (${commandLimit(g)} ordens de manobra por mês).` };
  refund(); a.order = { type: t.type, to };
  return { ok: true, msg: `${a.name}: ${ORDER_LABEL[t.type].toLowerCase()} ${MAP_DATA.states[to].name}.` };
}
const RECRUIT_STR = 20, RECRUIT_PER_MONTH = 2;
function recruitsLeft(g){ return Math.max(0, RECRUIT_PER_MONTH - (+g.used._recruit || 0)); }
function recruitState(g, uf){
  if (frontMode(g)) return frontRecruitState(g);
  const ph = phaseOf(g), cost = recruitCost(g);
  if (g.ended) return { ok: false, msg: "Partida encerrada." };
  if (g.queue.length) return { ok: false, msg: "Resolva os eventos pendentes na aba História." };
  if (ph.noArmies) return { ok: false, msg: "Nesta fase você não comanda tropas." };
  uf = uf || capitalOf(g, "player");
  if (!uf || sideOf(g, g.control[uf], ph) !== "player") return { ok: false, msg: "Escolha um estado sob seu controle." };
  if (!recruitsLeft(g)) return { ok: false, msg: `Já recrutou ${RECRUIT_PER_MONTH} exércitos neste mês. Encerre o mês para recrutar de novo.` };
  if (armiesOf(g, "player").length >= ARMY_CAP.player) return { ok: false, msg: `Limite de ${ARMY_CAP.player} exércitos: reforce os que já existem.` };
  if (g.money < cost) return { ok: false, msg: `Faltam recursos: precisa de ${cost} (tem ${Math.floor(g.money)}).` };
  return { ok: true, uf, cost };
}
function recruitArmy(g, uf){
  if (frontMode(g)) return frontRecruit(g);
  const st = recruitState(g, uf);
  if (!st.ok) return st;
  g.money -= st.cost; g.used._recruit = (+g.used._recruit || 0) + 1;
  const a = newArmy(g, "player", st.uf, RECRUIT_STR, { org: Math.min(55, maxOrg(g, "player")), xp: 5 });
  return { ok: true, msg: `Novo exército formado: ${a.name} em ${MAP_DATA.states[st.uf].name} (${RECRUIT_STR} de força, −${st.cost}).`, id: a.id };
}
// Alistamento mensal (guerra): voluntários reforçam exércitos que descansam em território seu; o excedente forma um exército novo
function mobilization(g){
  const C = scOf(g).campaign, pop = g.stats[C.keys.pop] ?? 50;
  return Math.round(clamp(3 + sideCounts(g).player * 0.35 + (pop - 50) / 10, 2, 12));
}
function playerMobilize(g, R){
  const ph = phaseOf(g);
  if (!g.armies || !ph.war || ph.noArmies || g.ended) return 0;
  const total = mobilization(g); let left = total;
  const fought = new Set((g.mil && g.mil.month === g.month ? g.mil.battles : []).flatMap(b => b.sides.flatMap(s => s.units.map(u => u.id))).filter(Boolean));
  const idle = armiesOf(g, "player").filter(a => sideOf(g, g.control[a.uf], ph) === "player" && !fought.has(a.id) && a.str < 45).sort((x, y) => x.str - y.str);
  for (const a of idle){ if (left <= 0) break; const d = Math.min(left, 6, 45 - a.str); a.str = Math.round((a.str + d) * 10) / 10; left -= d; }
  g.mobPool = Math.min(30, (g.mobPool || 0) + left);
  if (g.mobPool >= 15 && armiesOf(g, "player").length < ARMY_CAP.player){
    const base = capitalOf(g, "player");
    if (base){ const a = newArmy(g, "player", base, 15, { org: Math.min(50, maxOrg(g, "player")), xp: 0 }); g.mobPool -= 15; R(`Voluntários formaram um novo exército: ${a.name}, em ${MAP_DATA.states[base].name}.`, "good"); }
  }
  if (total - left > 0) R(`Alistamento: +${Math.round(total - left)} de força para exércitos descansando em território seu.`, "good");
  return total;
}
function intentKnown(g, p){
  const a = armyById(g, p.id); if (!a) return false;
  if ((g.stats[scOf(g).campaign.keys.mil] ?? 50) >= 60) return true;
  const near = [a.uf, ...ADJ[a.uf]];
  return armiesOf(g, "player").some(x => near.includes(x.uf)) || (!!p.to && armiesOf(g, "player", p.to).length > 0);
}
function knownIntents(g){ return (g.enemyPlans || []).filter(p => p.type !== "defender" && p.to && intentKnown(g, p)); }
function initArmies(g){
  Object.assign(g, { armies: [], armySeq: 0, armyN: {}, enemyPlans: [], enemyPool: 0, mobPool: 0, battleLog: [], mil: null, armsAid: null, milPhase: phaseOf(g).id });
  const cfg = armyCfg(g);
  for (const s of (cfg.start || [])) newArmy(g, "player", s.uf, s.str, { gen: s.gen, name: s.name });
  if (frontCfg(g)){ g.war = frontNew(g, g.armies.reduce((s, a) => s + a.str, 0)); g.armies = []; g.warNews = []; syncFronts(g); return; } // 2022: guerra por frentes (js/core/frentes.js)
  if (phaseOf(g).war) spawnWarArmies(g);
  normalizeArmies(g);
}
// Saves da versão 2 (tropas como contadores por estado + reserva) → exércitos
