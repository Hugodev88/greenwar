// js/i18n/traducao.js — Idiomas: o jogo é escrito em português; esta camada traduz a tela para inglês (usa js/i18n/en.js).
/* ---------- Idiomas: PT-BR (original) e EN ----------
   A interface é escrita em português; em inglês, uma camada traduz o DOM depois de cada renderização
   (MutationObserver): frase exata → I18N_EN.exact; frases com números → I18N_EN.tpl ("Turno {0}" → "Turn {0}");
   frases compostas são divididas em " · ", " — " e ": ". O que não tem tradução fica em português. */
const MONTHS_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const MONTHS_EN = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const I18N_ATTRS = ["title", "aria-label", "placeholder", "alt"];
const I18N_RULES = [
  [/^(.+?) (passaram|passou) para$/, (m, f) => f(m[1]) + " switched to"],
  [/^exclusivo com “(.+)”$/, (m, f) => "exclusive with “" + f(m[1]) + "”"],
  [/^Requer (.+)$/, (m, f) => "Requires " + f(m[1])],
  [/^Foco iniciado: (.+) \((.+)\)\.$/, (m, f) => "Focus started: " + f(m[1]) + " (" + f(m[2]) + ")."],
  [/^(.+?) (passaram|passou) para: (.+)$/, (m, f) => f(m[1]) + " switched to: " + f(m[3])],
  [/^(.+?) (entraram|entrou) em disputa(\.?)$/, (m, f) => f(m[1]) + " became contested" + m[3]],
  [/^(.+?) conquistado$/, (m, f) => f(m[1]) + " conquered"],
  [/^Batalha de (.+)$/, (m, f) => "Battle of " + f(m[1])],
  [/^Batalha em (.+)$/, (m, f) => "Battle in " + f(m[1])],
  [/^Ataque inimigo em (.+?) \((.+)\)$/, (m, f) => "Enemy attack in " + f(m[1]) + " (" + f(m[2]) + ")"],
  [/^(.+?) selecionado\.$/, (m, f) => f(m[1]) + " selected."],
  [/^(.+) em ([A-Z]{2})$/, (m, f) => f(m[1]) + " in " + m[2]],
  [/^(.+?) ([A-Z]{2})$/, (m, f) => f(m[1]) + " " + m[2]],
  [/^([A-Z]{2}) (.+)$/, (m, f) => m[1] + " " + f(m[2])],
  [/^([A-Z]{2}) \((.+)\)$/, (m, f) => m[1] + " (" + f(m[2]) + ")"],
  [/^(.+?) ([+\-−]\d+(?:[.,]\d+)?%?(?:\/mês)?)$/, (m, f) => f(m[1]) + " " + m[2].replace("/mês", "/mo")],
  // guerra por frentes (2022)
  [/^a linha (avançou|recuou) e o estado agora é (.+)\.$/, (m, f) => "the line " + (m[1] === "avançou" ? "advanced" : "fell back") + " and the state is now " + f(m[2]) + "."],
  [/^Avance para tomar (.+)\.$/, (m, f) => "Advance to take " + f(m[1]) + "."],
  [/^O inimigo vai atacar na (.+?) \(rumo a (.+)\)$/, (m, f) => "The enemy will attack on the " + f(m[1]) + " (towards " + f(m[2]) + ")"],
  [/^O inimigo vai atacar na (.+)$/, (m, f) => "The enemy will attack on the " + f(m[1])],
  [/^(.+) assume a (Frente .+)\.$/, (m, f) => f(m[1]) + " takes over the " + f(m[2]) + "."],
  [/^(.+?) \((.+)\)$/, (m, f) => f(m[1]) + " (" + f(m[2]) + ")"]
];
function trCore(raw, depth){
  if (typeof raw !== "string") return null;
  depth = depth || 0;
  const m = raw.match(/^(\s*)([\s\S]*?)(\s*)$/), t = m[2].replace(/\s+/g, " ");
  if (!t || !/[A-Za-zÀ-ú]{2}/.test(t)) return null;
  const D = I18N_EN.exact, own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  if (own(D, t)) return m[1] + D[t] + m[3];
  const nums = [], key = t.replace(/\d+(?:[.,]\d+)?/g, x => { nums.push(x); return "{" + (nums.length - 1) + "}"; });
  if (nums.length && own(I18N_EN.tpl, key)) return m[1] + I18N_EN.tpl[key].replace(/\{(\d+)\}/g, (_, i) => (nums[+i] || "").replace(/^(\d+),(\d+)$/, "$1.$2")) + m[3];
  if (depth > 4) return null;
  const f = s => { const r = trCore(s, depth + 1); return r == null ? s : r; };
  const mo = t.match(/^(Janeiro|Fevereiro|Março|Abril|Maio|Junho|Julho|Agosto|Setembro|Outubro|Novembro|Dezembro) de (\d{4})(.*)$/);
  if (mo) return m[1] + MONTHS_EN[MONTHS_PT.indexOf(mo[1])] + " " + mo[2] + (mo[3] ? f(mo[3]) : "") + m[3];
  for (const sep of [" · ", "; ", " — ", ". ", ": ", ", "]){
    const i = t.indexOf(sep); if (i < 0) continue;
    const parts = sep === ": " ? [t.slice(0, i), t.slice(i + 2)] : t.split(sep);
    let any = false; const out = parts.map(p => { const r = trCore(p, depth + 1); if (r != null){ any = true; return r; } return p; });
    if (any) return m[1] + out.join(sep) + m[3];
  }
  for (const [re, fn] of I18N_RULES){ const x = t.match(re); if (x){ const r = fn(x, f); if (r !== t) return m[1] + r + m[3]; } }
  return null;
}
function trText(t){ if (SET.lang !== "en") return t; const r = trCore(t); return r == null ? t : r; }
function i18nNode(root){
  if (SET.lang !== "en" || !root) return;
  if (root.nodeType === 3){ const r = trCore(root.data); if (r != null && r !== root.data){ if (root.__pt === undefined) root.__pt = root.data; root.data = r; } return; }
  if (root.nodeType !== 1) return;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n;
  while ((n = w.nextNode())){ const pn = n.parentNode; if (!pn || pn.nodeName === "SCRIPT" || pn.nodeName === "STYLE") continue; const r = trCore(n.data); if (r != null && r !== n.data){ if (n.__pt === undefined) n.__pt = n.data; n.data = r; } }
  const els = [root, ...root.querySelectorAll("[title],[aria-label],[placeholder],[alt]")];
  for (const el of els) for (const a of I18N_ATTRS){ const v = el.getAttribute && el.getAttribute(a); if (!v) continue; const r = trCore(v); if (r != null && r !== v){ el.__pta = el.__pta || {}; if (el.__pta[a] === undefined) el.__pta[a] = v; el.setAttribute(a, r); } }
}
let I18N_OBS = null;
function i18nInit(){
  if (!I18N_OBS && window.MutationObserver){
    I18N_OBS = new MutationObserver(muts => { if (SET.lang !== "en") return; for (const mu of muts) for (const nd of mu.addedNodes) i18nNode(nd); });
    I18N_OBS.observe(document.body, { childList: true, subtree: true });
  }
  i18nSwitch();
}
function i18nSwitch(){
  document.title = SET.lang === "en" ? "Chronicles of the Split — Greenwar" : (document.__ptTitle || document.title);
  if (SET.lang === "en"){ i18nNode(document.body); return; }
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n;
  while ((n = w.nextNode())) if (n.__pt !== undefined){ n.data = n.__pt; delete n.__pt; }
  document.body.querySelectorAll("*").forEach(el => { if (el.__pta){ for (const a in el.__pta) el.setAttribute(a, el.__pta[a]); delete el.__pta; } });
}
document.__ptTitle = document.title;
