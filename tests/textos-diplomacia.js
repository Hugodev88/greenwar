// tests/textos-diplomacia.js — gera, no Node, todos os textos que a aba Diplomacia mostra (para o check.js conferir a tradução).
// Renderiza tabDiplomacia (js/ui/aba-diplomacia.js) com um "DOM" mínimo em todas as fases da campanha 2022, para cada ator,
// com cada pedido/oferta, os avisos de bloqueio, propostas (aceita/contraproposta/recusa), missão, selos (sanções, dívida…),
// e também os textos de diplomacia que aparecem fora da aba: relatório do mês (dívidas, calote, sanções, apoio ao inimigo,
// investimentos, equipamento) e o que os focos liberam na diplomacia. Devolve [texto, onde] sem repetição.
const fs = require("fs"), path = require("path");
const JOGO = require("./carregar.js");
module.exports = function textosDiplomacia(cenId){
  const rd = f => fs.readFileSync(path.join(JOGO.RAIZ, f), "utf8");
  const ui = ["js/ui/retratos.js", "js/ui/aba-diplomacia.js"].map(rd).join("\n");
  const stubs = `let SCEN = null, STORY = null, G = null;
    const UI = { tab: "diplomacia", selActor: null, req: [], off: [], dealMsg: null };
    const $ = () => null, esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c])), sgn = v => (v > 0 ? "+" : "") + v;
    function renderGame(){} function afterAct(){} const window = { innerWidth: 1200 };`;
  const api = new Function(JOGO.codigo + "\n" + stubs + "\n" + ui + `
    return { SCENARIOS, newCampaign, endTurn, allowedReqs, allowedOffs, proposeDeal, acceptCounter, diploMission, focusUnlocks, tabDiplomacia,
      set: (sc, g) => { SCEN = sc; STORY = sc.story; G = g; }, get G(){ return G; }, UI };`)();
  const sc = api.SCENARIOS.find(s => s.id === (cenId || "brasil2022")), C = sc.campaign;
  const out = new Map();
  const dec = s => s.replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
  const add = (t, onde) => { t = dec(String(t || "")).replace(/\s+/g, " ").trim(); if (/[A-Za-zÀ-ú]{2}/.test(t) && !out.has(t)) out.set(t, onde); };
  const html = (h, onde) => { // textos entre tags e atributos title/aria-label
    for (const m of h.matchAll(/\s(?:title|aria-label|placeholder)="([^"]*)"/g)) add(m[1], onde + " @title");
    for (const s of h.replace(/<(script|style)[\s\S]*?<\/\1>/g, "").split(/<[^>]*>/)) add(s, onde); };
  const el = { innerHTML: "", querySelectorAll: () => [] };
  const render = onde => { api.tabDiplomacia(el); html(el.innerHTML, onde); };
  const fases = [["governo", g => g], ["oposicao", g => { g.visited.push("transicao"); return g; }], ["regime", g => { g.visited.push("golpe_inicial"); return g; }]];
  const U = api.UI, clone = g => JSON.parse(JSON.stringify(g));
  for (const [ph, mk] of fases){
    const base = mk(api.newCampaign(sc, 7)); base.queue.length = 0; base.ap = 99; base.money = 50;
    const reset = () => { const g = clone(base); api.set(sc, g); U.selActor = null; U.req = []; U.off = []; U.dealMsg = null; return g; };
    reset(); render(ph + ": lista");
    for (const A of C.actors){
      let g = reset(); U.selActor = A.id; render(`${ph}/${A.id}`);
      const ar = api.allowedReqs(g, A.id), ao = api.allowedOffs(g, A.id);
      const combos = [[[], []], ...ar.map(r => [[r], []]), ...ar.map(r => [[r], ao.slice(0, 3)]), ...ao.map(o => [ar.slice(0, 1), [o]]), [ar.slice(0, 3), ao.slice(0, 4)]];
      for (const [rq, of] of combos){
        g = reset(); U.selActor = A.id; U.req = rq; U.off = of; render(`${ph}/${A.id} pedido`);
        if (!rq.length) continue;
        const r = api.proposeDeal(g, A.id, rq, of); add(r.msg, `${ph}/${A.id} proposta`);
        U.dealMsg = { text: r.msg, cls: "mid" }; U.req = rq; U.off = of; render(`${ph}/${A.id} após proposta`);
        if (r.result === "counter"){ const c = api.acceptCounter(g); add(c.msg, `${ph}/${A.id} contraproposta`); }
        add(api.proposeDeal(g, A.id, rq, of).msg, `${ph}/${A.id} repetida`);
      }
      // proposta forçada a aceitar (opinião alta): mensagens de cada pedido e oferta
      for (const r of ar){ g = reset(); g.actors[A.id].opinion = 100; add(api.proposeDeal(g, A.id, [r], ao.slice(0, 3)).msg, `${ph}/${A.id} aceita`); }
      // contraproposta forçada
      for (const r of ar){ g = reset(); g.actors[A.id].opinion = 0; const x = api.proposeDeal(g, A.id, [r, ...ar.filter(y => y !== r)].slice(0, 2), []); add(x.msg, `${ph}/${A.id} contra`); }
      g = reset(); add(api.diploMission(g, A.id).msg, `${ph}/${A.id} missão`); add(api.diploMission(g, A.id).msg, `${ph}/${A.id} missão repetida`);
      g = reset(); g.money = 0; add(api.diploMission(g, A.id).msg, `${ph}/${A.id} missão sem recursos`);
      g = reset(); g.ap = 0; add(api.diploMission(g, A.id).msg, `${ph}/${A.id} missão sem AP`);
      g = reset(); g.queue.push({}); add(api.diploMission(g, A.id).msg, `${ph}/${A.id} missão com eventos`); U.selActor = A.id; U.req = ar.slice(0, 1); render(`${ph}/${A.id} com eventos`);
      g = reset(); Object.assign(g.actors[A.id], { recognized: true, aligned: true, sanctioning: true, supportsEnemy: true, dependence: 40 });
      g.debts.push({ aid: A.id, amount: 20, due: g.month + 3 }); g.dealtWith[A.id] = true; U.selActor = A.id; U.req = ar.slice(0, 1); render(`${ph}/${A.id} selos`);
      g.dealtWith = {}; g.ap = 0; render(`${ph}/${A.id} sem AP`);
      g = reset(); g.ended = { node: "x" }; U.selActor = A.id; U.req = ar.slice(0, 1); render(`${ph}/${A.id} encerrada`);
    }
    // relatório do mês: dívida paga, calote, sanções, apoio ao inimigo, investimentos, equipamento
    for (const [nome, prep] of [
      ["dívida paga", g => { g.money = 99; for (const A of C.actors) g.debts.push({ aid: A.id, amount: 20, due: g.month }); }],
      ["calote", g => { g.money = -50; for (const A of C.actors) g.debts.push({ aid: A.id, amount: 20, due: g.month }); }],
      ["opinião baixa", g => { for (const k in g.stats) g.stats[k] = Math.min(g.stats[k], 30); g.stats[C.keys.legit] = 20; for (const A of C.actors) Object.assign(g.actors[A.id], { opinion: -100 }); }],
      ["opinião alta", g => { for (const A of C.actors) Object.assign(g.actors[A.id], { opinion: 100, sanctioning: true }); }],
    ]) for (let seed = 1; seed <= 12; seed++){
      const g = clone(base); g.seed = seed * 7919; if (g.rng != null) g.rng = seed * 7919; prep(g); api.set(sc, g);
      try { api.endTurn(g); } catch (e){ continue; }
      for (const l of (g.report || [])){ const t = l.t || l; if (C.actors.some(A => String(t).includes(A.name) || String(t).includes(A.short || "\u0000")) || /Dívida|Calote|sanç/i.test(t)) add(t, `${ph} relatório (${nome})`); }
    }
  }
  // focos que mexem na diplomacia
  { const g = api.newCampaign(sc, 7); api.set(sc, g);
    for (const F of ((C.focus && C.focus.nodes) || [])) if (F.dipOff || F.dipReq || F.dipBonus) for (const t of api.focusUnlocks(g, F)) if (/Diplomacia|Acordos com/.test(t)) add(t, "foco " + F.id); }
  // dados dos atores (nome, rótulo, ideologia, nomes curtos) e rótulos de pedidos/ofertas de todas as fases
  for (const A of C.actors) for (const k of ["name", "tag", "ideology", "short"]) if (A[k]) add(A[k], "ator " + A.id + "." + k);
  return [...out.entries()];
};
