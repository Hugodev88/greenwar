// js/data/ajudantes.js — Ajudantes para escrever os dados das campanhas: act() cria uma ação e ev() cria um evento.
// Carregado antes de todos os cenários.
/* ---------- Campanha: helpers ---------- */
// act(id, categoria, nome, descrição, {ap, cost, fx, req, reqText, show, risk})
function act(id, cat, name, desc, o){ return Object.assign({ id, cat, name, desc, ap: 1, cost: 0 }, o); }
// ev(id, título, textos, escolhas, opções {if, weight, once, cooldown, crisisOf})
function ev(id, title, text, choices, o){ return Object.assign({ id, title, text: Array.isArray(text) ? text : [text], choices }, o || {}); }
