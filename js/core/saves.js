// js/core/saves.js — Núcleo: migração de saves antigos (v2 → v13). Ao mudar o formato do save, suba SAVE_VERSION (core/base.js) e migre aqui.
function migrateSave(g){
  if (!g || g.v === SAVE_VERSION) return g;
  if (!(g.v >= 2 && g.v < SAVE_VERSION) || !scOf(g)) return null;
  if (g.v === 2) migrateV2(g);
  if (g.v === 3){ g.battleLog = (g.mil && g.mil.battles ? g.mil.battles.slice(-30) : []); g.mobPool = g.mobPool || 0; g.v = 4; }
  if (g.v === 4){ g.chains = Array.isArray(g.chains) ? g.chains : []; g.v = 5; }
  if (g.v === 5){ migrateSouth(g); g.autoOrders = "off"; g.v = 6; }
  if (g.v === 6){ g.diff = "normal"; g.quick = false; g.simple = false; g.v = 7; } // saves antigos seguem no Normal, campanha completa
  if (g.v === 7){ migrateFronts(g); g.v = 8; } // 2022: exércitos → tropas das frentes (js/core/frentes.js)
  if (g.v === 8){ if (g.focus) focusInit(g); if (g.war) g.war.months = g.war.months || 0; g.v = 9; } // oportunidades e cansaço da guerra (campos novos começam vazios)
  if (g.v >= 9 && g.v <= 12){ migrateV13(g); g.v = 13; } // 2022: volta aos exércitos nos estados, sem regiões nem "em disputa" (js/core/frentes.js)
  return g.v === SAVE_VERSION ? g : null;
}
// v5 → v6: cria a Tensão no Sul em partidas já no regime. Se a Liga já controla estados, ela está em revolta.
function migrateSouth(g){
  const SC = scOf(g).campaign.south; g.south = null;
  if (!SC || !g.visited.includes(SC.startNode) || g.ended) return;
  southInit(g);
  if (Object.values(g.control).some(f => f === SC.fac)){ Object.assign(g.south, { t: 100, state: "revolta", stage: 2, since: g.month, warned: true }); if (!g.flags.includes("sul_revolta")) g.flags.push("sul_revolta"); }
  else if (g.visited.includes("racha_militar")) g.south.t = Math.min(SC.joltCap, g.south.t + 20);
}
function migrateV2(g){
  const units = Object.entries(g.uf).map(([uf, u]) => [uf, u.force || 0]);
  const reserve = g.reserve || 0;
  initArmies(g); g.armies = []; g.armyN = {};
  for (const [uf, f] of units) if (f > 0 && armyAllowed(g, "player", uf)) newArmy(g, "player", uf, Math.min(ARMY_MAX, f * STR_UNIT));
  for (const uf in g.uf) delete g.uf[uf].force;
  delete g.reserve;
  if (reserve > 0) addPlayerStrength(g, reserve * STR_UNIT);
  if (phaseOf(g).war) spawnWarArmies(g);
  normalizeArmies(g); planEnemy(g);
  g.v = 3; g.milMigrated = true;
}
