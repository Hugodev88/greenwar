// js/ui/base.js — Interface: estado global da tela (SCEN, STORY, G, UI) e atalhos ($, esc, sgn).
/* =====================================================================
   INTERFACE
   ===================================================================== */
let SCEN = null, STORY = null, G = null;
const UI = { tab: "historia", selUF: null, selArmy: null, selActor: null, req: [], off: [], dealMsg: null, mapMode: "controle" };
const LAST_SCEN_KEY = "jogo_br_ultimo_cenario";
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const sgn = v => (v > 0 ? "+" : "") + v;
