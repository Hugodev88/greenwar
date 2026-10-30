// js/i18n/traducao.js — Idiomas: o jogo é escrito em português; esta camada traduz a tela para inglês, chinês e russo
// (dicionários js/i18n/en.js, zh.js e ru.js). Ordem de busca: idioma escolhido → inglês → português (original).
/* ---------- Idiomas: PT-BR (original), EN, ZH (chinês simplificado), RU ----------
   A interface é escrita em português; nos outros idiomas, uma camada traduz o DOM depois de cada renderização
   (MutationObserver): frase exata → I18N_xx.exact; frases com números → I18N_xx.tpl ("Turno {0}" → "Turn {0}");
   frases compostas são divididas em " · ", " — " e ": "; padrões com partes variáveis ficam em I18N_RULES
   (uma função por idioma). O que não tem tradução no idioma cai para o inglês e, por fim, fica em português.
   Para um idioma novo: crie js/i18n/xx.js (const I18N_XX = { exact, tpl }), ponha-o em I18N_LANGS e em i18nDict. */
const I18N_LANGS = [
  { id: "pt", name: "Português (Brasil)", html: "pt-BR" },
  { id: "en", name: "English", html: "en", title: "Chronicles of the Split — Greenwar" },
  { id: "zh", name: "简体中文", html: "zh-CN", title: "分裂纪事 — Greenwar" },
  { id: "ru", name: "Русский", html: "ru", title: "Хроники раскола — Greenwar" }
];
function i18nDict(id){
  if (id === "en") return typeof I18N_EN !== "undefined" ? I18N_EN : null;
  if (id === "zh") return typeof I18N_ZH !== "undefined" ? I18N_ZH : null;
  if (id === "ru") return typeof I18N_RU !== "undefined" ? I18N_RU : null;
  return null;
}
function i18nLang(){ return (typeof SET !== "undefined" && SET && SET.lang) || "pt"; }
const MONTHS_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const MONTHS_EN = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MONTHS_RU = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
function i18nMonth(L, i, y){ return L === "zh" ? `${y}年${i + 1}月` : L === "ru" ? `${MONTHS_RU[i]} ${y}` : `${MONTHS_EN[i]} ${y}`; }
const I18N_ATTRS = ["title", "aria-label", "placeholder", "alt"];
// [padrão, inglês, chinês, russo]: f() traduz a parte variável (com a mesma cadeia de idiomas)
// regras tentadas ANTES de dividir a frase (frases inteiras com partes variáveis: registro do turno, economia, focos)
const I18N_PRE = [
  [/^Passaram-se (\d+) meses \((.+) → (.+)\)\.$/, (m, f) => m[1] + " months passed (" + f(m[2]) + " → " + f(m[3]) + ").", (m, f) => "过去了 " + m[1] + " 个月（" + f(m[2]) + " → " + f(m[3]) + "）。", (m, f) => "Прошло месяцев: " + m[1] + " (" + f(m[2]) + " → " + f(m[3]) + ")."],
  [/^Novo mês: (.+)\.$/, (m, f) => "New month: " + f(m[1]) + ".", (m, f) => "新的月份：" + f(m[1]) + "。", (m, f) => "Новый месяц: " + f(m[1]) + "."],
  [/^Foco em andamento: (.+) \((\d+)\/(\d+) meses\)\.$/, (m, f) => "Focus in progress: " + f(m[1]) + " (" + m[2] + "/" + m[3] + " months).", (m, f) => "国策进行中：" + f(m[1]) + "（" + m[2] + "/" + m[3] + " 个月）。", (m, f) => "Фокус в процессе: " + f(m[1]) + " (" + m[2] + "/" + m[3] + " мес.)."],
  [/^Receita líquida: ([+\-−]?\d+) (.+?) \((.+)\)\.$/, (m, f) => "Net income: " + m[1] + " " + f(m[2]) + " (" + m[3].split(", ").map(f).join(", ") + ").", (m, f) => "净收入：" + m[1] + " " + f(m[2]) + "（" + m[3].split(", ").map(f).join("，") + "）。", (m, f) => "Чистый доход: " + m[1] + " " + f(m[2]) + " (" + m[3].split(", ").map(f).join(", ") + ")."],
  [/^Ações neste turno: (\d+) \((.+)\)\.$/, (m, f) => "Actions this turn: " + m[1] + " (" + m[2].split(" · ").map(f).join(" · ") + ").", (m, f) => "本回合行动：" + m[1] + "（" + m[2].split(" · ").map(f).join(" · ") + "）。", (m, f) => "Действий в этом ходу: " + m[1] + " (" + m[2].split(" · ").map(f).join(" · ") + ")."],
  [/^Calote! Sem caixa para pagar (.+)$/, (m, f) => "Default! No cash to pay " + f(m[1]), (m, f) => "违约！没钱偿还" + f(m[1]), (m, f) => "Дефолт! Нечем платить: " + f(m[1])],
  [/^Dívida paga a (.+)$/, (m, f) => "Debt paid to " + f(m[1]), (m, f) => "已偿还" + f(m[1]) + "的债务", (m, f) => "Долг выплачен: " + f(m[1])],
  [/^Acordos com (.+?) ([+\-−]\d+) na previsão$/, (m, f) => "Deals with " + f(m[1]) + " " + m[2] + " in the forecast", (m, f) => "与" + f(m[1]) + "的协议预估 " + m[2], (m, f) => "Сделки с: " + f(m[1]) + " " + m[2] + " в прогнозе"],
  [/^libera a oferta “(.+)” em todas as fases$/, (m, f) => "unlocks the “" + f(m[1]) + "” offer in every phase", (m, f) => "在所有阶段开放“" + f(m[1]) + "”提议", (m, f) => "открывает предложение «" + f(m[1]) + "» во всех фазах"],
  // registro do mapa: "MG (Minas Gerais) passou para: X" / "MG (Minas Gerais) entrou em disputa"
  [/^([A-Z]{2}) \((.+?)\) (?:passaram|passou) para:? (.+)$/, (m, f) => m[1] + " (" + f(m[2]) + ") switched to: " + f(m[3]), (m, f) => m[1] + "（" + f(m[2]) + "）转归：" + f(m[3]), (m, f) => m[1] + " (" + f(m[2]) + ") теперь за: " + f(m[3])],
  [/^([A-Z]{2}) \((.+?)\) (?:entraram|entrou) em disputa(\.?)$/, (m, f) => m[1] + " (" + f(m[2]) + ") became contested" + m[3], (m, f) => m[1] + "（" + f(m[2]) + "）陷入争夺" + (m[3] ? "。" : ""), (m, f) => m[1] + " (" + f(m[2]) + "): начались бои" + m[3]],
  [/^Nota ([SABCDEF])$/, (m) => "Grade " + m[1], (m) => "评级 " + m[1], (m) => "Оценка " + m[1]],
  // fase 12: rompimento (lista de regiões = nomes próprios, mantidos) e a dica de estabilizar
  // caminho até a capital: o nome (Recife, Porto Alegre, Brasília) é traduzido se houver tradução, senão fica como está
  [/^Faltam (\d+) regiões até (.+)$/, (m) => m[1] + " regions to " + i18nName(m[2]), (m) => "距离" + i18nName(m[2]) + "还剩 " + m[1] + " 个地区", (m) => "До " + i18nName(m[2]) + " осталось регионов: " + m[1]],
  [/^Falta 1 região até (.+)$/, (m) => "1 region to " + i18nName(m[1]), (m) => "距离" + i18nName(m[1]) + "还剩 1 个地区", (m) => "До " + i18nName(m[1]) + " остался 1 регион"],
  [/^O inimigo está a (\d+) regiões de (.+)$/, (m) => "The enemy is " + m[1] + " regions from " + i18nName(m[2]), (m) => "敌人距离" + i18nName(m[2]) + "还有 " + m[1] + " 个地区", (m) => "Противник в " + m[1] + " регионах от " + i18nName(m[2])],
  [/^O inimigo está a 1 região de (.+)$/, (m) => "The enemy is 1 region from " + i18nName(m[1]), (m) => "敌人距离" + i18nName(m[1]) + "还有 1 个地区", (m) => "Противник в 1 регионе от " + i18nName(m[1])],
  [/^Caminho mais curto até (.+)$/, (m) => "Shortest path to " + i18nName(m[1]), (m) => "通往" + i18nName(m[1]) + "的最短路线", (m) => "Кратчайший путь до " + i18nName(m[1])],
  [/^Rompimento! A linha inimiga desabou em (.+)\. Suas tropas avançam rumo a (.+)\.$/, (m, f) => "Breakthrough! The enemy line collapsed at " + m[1] + ". Your troops advance toward " + f(m[2]) + ".", (m, f) => "突破！敌方战线在" + m[1] + "崩溃。你的部队正向" + f(m[2]) + "推进。", (m, f) => "Прорыв! Линия противника рухнула: " + m[1] + ". Ваши войска наступают на " + f(m[2]) + "."],
  [/^Rompimento inimigo! Sua linha desabou em (.+)\. O inimigo avança rumo a (.+)\.$/, (m, f) => "Enemy breakthrough! Your line collapsed at " + m[1] + ". The enemy advances toward " + f(m[2]) + ".", (m, f) => "敌军突破！你的战线在" + m[1] + "崩溃。敌人正向" + f(m[2]) + "推进。", (m, f) => "Прорыв противника! Ваша линия рухнула: " + m[1] + ". Противник наступает на " + f(m[2]) + "."],
  [/^A linha desabou na (.+?)\. Segure a linha neste mês: quem segura logo depois de um rompimento estabiliza a frente e impede um novo rompimento\.$/, (m, f) => "The line collapsed on the " + f(m[1]) + ". Hold the line this month: holding right after a breakthrough stabilizes the front and prevents another breakthrough.", (m, f) => "战线在" + f(m[1]) + "崩溃。本月请守住战线：在突破之后立即坚守，可以稳定战线并阻止再次突破。", (m, f) => "Линия рухнула: " + f(m[1]) + ". Удерживайте линию в этом месяце: оборона сразу после прорыва стабилизирует фронт и не даёт прорвать его снова."]
];
const I18N_RULES = [
  [/^Avance para tomar (?!terreno\.?$)(.+?)(\.?)$/, (m) => "Advance to take " + m[1] + m[2], (m) => "推进以夺取" + m[1] + (m[2] ? "。" : ""), (m) => "Наступайте, чтобы взять " + m[1] + m[2]],
  [/^Aparece quando (.+)$/, (m, f) => "Appears when " + f(m[1]), (m, f) => "出现条件：" + f(m[1]), (m, f) => "Появляется, когда: " + f(m[1])],
  [/^aparece quando (.+)$/, (m, f) => "appears when " + f(m[1]), (m, f) => "出现条件：" + f(m[1]), (m, f) => "появляется, когда: " + f(m[1])],
  [/^pode voltar a partir de (.+)$/, (m, f) => "can return from " + f(m[1]), (m, f) => "可于" + f(m[1]) + "起再次出现", (m, f) => "может вернуться с " + f(m[1])],
  [/^até (.+) \(aba Decisões\)\.$/, (m, f) => "until " + f(m[1]) + " (Decisions tab).", (m, f) => "截至" + f(m[1]) + "（决策页）。", (m, f) => "до " + f(m[1]) + " (вкладка «Решения»)."],
  [/^Abre a oportunidade “(.+)”$/, (m, f) => "Opens the opportunity “" + f(m[1]) + "”", (m, f) => "开启机会“" + f(m[1]) + "”", (m, f) => "Открывает возможность «" + f(m[1]) + "»"],
  [/^○ Requer (.+)$/, (m, f) => "○ Requires " + f(m[1]), (m, f) => "○ 需要：" + f(m[1]), (m, f) => "○ Требуется: " + f(m[1])],
  [/^✔ (.+)$/, (m, f) => "✔ " + f(m[1]), (m, f) => "✔ " + f(m[1]), (m, f) => "✔ " + f(m[1])],
  [/^(.+?) (passaram|passou) para$/, (m, f) => f(m[1]) + " switched to", (m, f) => f(m[1]) + " 转归", (m, f) => f(m[1]) + " перешли к"],
  [/^exclusivo com “(.+)”$/, (m, f) => "exclusive with “" + f(m[1]) + "”", (m, f) => "与“" + f(m[1]) + "”互斥", (m, f) => "несовместимо с «" + f(m[1]) + "»"],
  [/^Requer (.+)$/, (m, f) => "Requires " + f(m[1]), (m, f) => "需要：" + f(m[1]), (m, f) => "Требуется: " + f(m[1])],
  [/^Foco cancelado: (.+)\. Ponto de ação e Recursos devolvidos\.$/, (m, f) => "Focus cancelled: " + f(m[1]) + ". Action point and Resources refunded.", (m, f) => "已取消国策：" + f(m[1]) + "。行动点和资源已退还。", (m, f) => "Фокус отменён: " + f(m[1]) + ". Очко действия и ресурсы возвращены."],
  [/^Foco cancelado: (.+)\. O progresso foi perdido \(começou num turno anterior, nada foi devolvido\)\.$/, (m, f) => "Focus cancelled: " + f(m[1]) + ". Progress lost (it started in an earlier turn, nothing was refunded).", (m, f) => "已取消国策：" + f(m[1]) + "。进度作废（它在之前的回合开始，不予退还）。", (m, f) => "Фокус отменён: " + f(m[1]) + ". Прогресс потерян (фокус начат в прошлом ходу, ничего не возвращено)."],
  [/^Foco iniciado: (.+) \((.+)\)\.$/, (m, f) => "Focus started: " + f(m[1]) + " (" + f(m[2]) + ").", (m, f) => "已开始国策：" + f(m[1]) + "（" + f(m[2]) + "）。", (m, f) => "Фокус начат: " + f(m[1]) + " (" + f(m[2]) + ")."],
  [/^(.+?) (passaram|passou) para: (.+)$/, (m, f) => f(m[1]) + " switched to: " + f(m[3]), (m, f) => f(m[1]) + " 转归：" + f(m[3]), (m, f) => f(m[1]) + " — теперь за: " + f(m[3])],
  [/^(.+?) (entraram|entrou) em disputa(\.?)$/, (m, f) => f(m[1]) + " became contested" + m[3], (m, f) => f(m[1]) + " 陷入争夺" + (m[3] ? "。" : ""), (m, f) => f(m[1]) + ": начались бои" + m[3]],
  [/^(.+?) conquistado$/, (m, f) => f(m[1]) + " conquered", (m, f) => "已攻占 " + f(m[1]), (m, f) => f(m[1]) + " захвачен"],
  [/^Batalha de (.+)$/, (m, f) => "Battle of " + f(m[1]), (m, f) => f(m[1]) + "之战", (m, f) => "Битва за " + f(m[1])],
  [/^Batalha em (.+)$/, (m, f) => "Battle in " + f(m[1]), (m, f) => f(m[1]) + "战役", (m, f) => "Бой в " + f(m[1])],
  [/^Ataque inimigo em (.+?) \((.+)\)$/, (m, f) => "Enemy attack in " + f(m[1]) + " (" + f(m[2]) + ")", (m, f) => "敌军进攻 " + f(m[1]) + "（" + f(m[2]) + "）", (m, f) => "Атака противника: " + f(m[1]) + " (" + f(m[2]) + ")"],
  [/^(.+?) selecionado\.$/, (m, f) => f(m[1]) + " selected.", (m, f) => "已选择 " + f(m[1]) + "。", (m, f) => "Выбрано: " + f(m[1]) + "."],
  [/^(.+) em ([A-Z]{2}(?:\/[A-Z]{2})*)$/, (m, f) => f(m[1]) + " in " + m[2], (m, f) => f(m[1]) + "（" + m[2] + "）", (m, f) => f(m[1]) + " в " + m[2]],
  [/^(.+?) ([A-Z]{2})$/, (m, f) => f(m[1]) + " " + m[2]],
  [/^([A-Z]{2}) (.+)$/, (m, f) => m[1] + " " + f(m[2])],
  [/^([A-Z]{2}) \((.+)\)$/, (m, f) => m[1] + " (" + f(m[2]) + ")", (m, f) => m[1] + "（" + f(m[2]) + "）"],
  [/^(.+?) ([+\-−]\d+(?:[.,]\d+)?%?(?:\/mês)?)(\.?)$/, (m, f) => f(m[1]) + " " + m[2].replace("/mês", "/mo") + m[3], (m, f) => f(m[1]) + " " + m[2].replace("/mês", "/月") + (m[3] ? "。" : ""), (m, f) => f(m[1]) + " " + m[2].replace("/mês", "/мес.") + m[3]],
  [/^(.+?) \/ (.+)$/, (m, f) => f(m[1]) + " / " + f(m[2])],
  [/^· (.+)$/, (m, f) => "· " + f(m[1])],
  [/^(.+?) ·$/, (m, f) => f(m[1]) + " ·"],
  // guerra por frentes (2022)
  [/^a linha (avançou|recuou) e o estado agora é (.+)\.$/, (m, f) => "the line " + (m[1] === "avançou" ? "advanced" : "fell back") + " and the state is now " + f(m[2]) + ".", (m, f) => "战线" + (m[1] === "avançou" ? "推进" : "后撤") + "，该州现属：" + f(m[2]) + "。", (m, f) => "линия " + (m[1] === "avançou" ? "продвинулась" : "отошла") + ", теперь штат: " + f(m[2]) + "."],
  [/^Avance para tomar (.+)\.$/, (m, f) => "Advance to take " + f(m[1]) + ".", (m, f) => "推进以夺取 " + f(m[1]) + "。", (m, f) => "Наступайте, чтобы взять " + f(m[1]) + "."],
  [/^O inimigo vai atacar na (.+?) \(rumo a (.+)\)$/, (m, f) => "The enemy will attack on the " + f(m[1]) + " (towards " + f(m[2]) + ")", (m, f) => "敌军将在" + f(m[1]) + "发动进攻（目标：" + f(m[2]) + "）", (m, f) => "Противник атакует: " + f(m[1]) + " (направление — " + f(m[2]) + ")"],
  [/^O inimigo vai atacar na (.+)$/, (m, f) => "The enemy will attack on the " + f(m[1]), (m, f) => "敌军将在" + f(m[1]) + "发动进攻", (m, f) => "Противник атакует: " + f(m[1])],
  [/^(.+) assume a (Frente .+)\.$/, (m, f) => f(m[1]) + " takes over the " + f(m[2]) + ".", (m, f) => f(m[1]) + " 接管" + f(m[2]) + "。", (m, f) => f(m[1]) + " принимает командование: " + f(m[2]) + "."],
  [/^(.+?) \((.+)\)$/, (m, f) => f(m[1]) + " (" + f(m[2]) + ")", (m, f) => f(m[1]) + "（" + f(m[2]) + "）"],
  // pedaços de parênteses abertos/fechados em nós de texto separados
  [/^\((.+)$/, (m, f) => "(" + f(m[1]), (m, f) => "（" + f(m[1])],
  [/^(.+)\)$/, (m, f) => f(m[1]) + ")", (m, f) => f(m[1]) + "）"],
  // último recurso: frase com ponto final cuja versão sem ponto tem tradução ("Recusar." → "Recusar")
  [/^(.+[^.])\.$/, (m, f) => f(m[1]) + ".", (m, f) => f(m[1]) + "。", (m, f) => f(m[1]) + "."]
];
// nome próprio (cidade/capital): tradução exata se existir, senão o original
function i18nName(s){ const r = trCore(s, 5, i18nLang()); return r == null ? s : r; }
function trCore(raw, depth, L){
  if (typeof raw !== "string") return null;
  depth = depth || 0; L = L || i18nLang();
  // várias linhas num só texto (dicas do mapa/árvore com "\n"): cada linha é traduzida à parte
  if (/\S[^\n]*\n[^\n]*\S/.test(raw)){ let any = false; const out = raw.split("\n").map(l => { const r = trCore(l, depth, L); if (r != null){ any = true; return r; } return l; }); return any ? out.join("\n") : null; }
  const m = raw.match(/^(\s*)([\s\S]*?)(\s*)$/), t = m[2].replace(/\s+/g, " ");
  if (!t || !/[A-Za-zÀ-ú]{2}/.test(t)) return null;
  const own = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);
  const chain = [i18nDict(L), L !== "en" ? i18nDict("en") : null].filter(Boolean);
  for (const D of chain) if (own(D.exact, t)) return m[1] + D.exact[t] + m[3];
  const nums = [], key = t.replace(/\d+(?:[.,]\d+)?/g, x => { nums.push(x); return "{" + (nums.length - 1) + "}"; });
  if (nums.length) for (const D of chain) if (own(D.tpl, key)) return m[1] + D.tpl[key].replace(/\{(\d+)\}/g, (_, i) => L === "ru" ? (nums[+i] || "") : (nums[+i] || "").replace(/^(\d+),(\d+)$/, "$1.$2")) + m[3];
  if (depth > 4) return null;
  // f traduz uma parte variável; a regra só vale se alguma parte foi traduzida (ou se ela não tem partes),
  // para não "traduzir" só a pontuação de uma frase que ainda está em português
  let calls = 0, hits = 0;
  const f = s => { calls++; const r = trCore(s, depth + 1, L); if (r == null) return s; hits++; return r; };
  const rule = R => { calls = 0; hits = 0; const fn = (L === "zh" ? R[2] : L === "ru" ? R[3] : null) || R[1]; const r = fn(t.match(R[0]), f); return r !== t && (hits || !calls) ? r : null; };
  const mo = t.match(/^(Janeiro|Fevereiro|Março|Abril|Maio|Junho|Julho|Agosto|Setembro|Outubro|Novembro|Dezembro) de (\d{4})(.*)$/);
  if (mo) return m[1] + i18nMonth(L, MONTHS_PT.indexOf(mo[1]), mo[2]) + (mo[3] ? f(mo[3]) : "") + m[3];
  // modelos com nomes (D.fmt: "{0}: ataque a {1} (chance {2}%)." → "{0}: attack on {1} ({2}% chance)."): cada {n} é traduzido à parte (ou fica, se for um nome próprio)
  for (const D of chain) for (const [re, out] of i18nFmt(D)){ const mm = t.match(re); if (mm) return m[1] + out.replace(/\{(\d+)\}/g, (_, i) => f(mm[+i + 1] || "")) + m[3]; }
  for (const R of I18N_PRE) if (R[0].test(t)){ const r = rule(R); if (r != null) return m[1] + r + m[3]; }
  for (const sep of [" · ", "; ", " — ", ". ", ": ", ", "]){
    const parts = i18nSplit(t, sep); if (!parts) continue;
    let any = false; const out = parts.map(p => { const r = trCore(p, depth + 1, L); if (r != null){ any = true; return r; } return p; });
    if (any) return m[1] + out.join(i18nSep(L, sep)) + m[3];
  }
  for (const R of I18N_RULES) if (R[0].test(t)){ const r = rule(R); if (r != null) return m[1] + r + m[3]; }
  return null;
}
// compila (uma vez por dicionário) os modelos D.fmt em expressões regulares; os mais longos primeiro
function i18nFmt(D){
  if (D.__fmt) return D.__fmt;
  const esc = x => x.replace(/[.*+?^$()|[\]\\]/g, "\\$&");
  return (D.__fmt = Object.keys(D.fmt || {}).sort((a, b) => b.length - a.length).map(k => {
    const order = []; const re = esc(k).replace(/\\?\{(\d+)\\?\}/g, (_, i) => { order.push(+i); return "(.+?)"; });
    const out = D.fmt[k].replace(/\{(\d+)\}/g, (_, i) => "{" + order.indexOf(+i) + "}");
    return [new RegExp("^" + re + "$"), out];
  }));
}
// divide uma frase composta; ". " não divide abreviações ("Relações Int. -6", "Gen. Arruda")
function i18nSplit(t, sep){
  if (sep === ": "){ const i = t.indexOf(sep); return i < 0 ? null : [t.slice(0, i), t.slice(i + 2)]; }
  const parts = sep === ". " ? t.split(/(?<!\b(?:Int|Gen|Brig|Gov|Sr|ex))\. /) : t.split(sep);
  return parts.length > 1 ? parts : null;
}
// separadores das frases compostas: o chinês usa pontuação de largura total
function i18nSep(L, sep){ if (L !== "zh") return sep; return sep === ". " ? "。" : sep === ": " ? "：" : sep === ", " ? "，" : sep === "; " ? "；" : sep; }
function trText(t){ if (i18nLang() === "pt") return t; const r = trCore(t); return r == null ? t : r; }
function i18nNode(root){
  if (i18nLang() === "pt" || !root) return;
  if (root.nodeType === 3){ const r = trCore(root.data); if (r != null && r !== root.data){ if (root.__pt === undefined) root.__pt = root.data; root.data = r; } return; }
  if (root.nodeType !== 1) return;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n;
  while ((n = w.nextNode())){ const pn = n.parentNode; if (!pn || pn.nodeName === "SCRIPT" || pn.nodeName === "STYLE" || (pn.closest && pn.closest("[translate=no]"))) continue; const r = trCore(n.data); if (r != null && r !== n.data){ if (n.__pt === undefined) n.__pt = n.data; n.data = r; } }
  const els = [root, ...root.querySelectorAll("[title],[aria-label],[placeholder],[alt]")];
  for (const el of els) for (const a of I18N_ATTRS){ const v = el.getAttribute && el.getAttribute(a); if (!v) continue; const r = trCore(v); if (r != null && r !== v){ el.__pta = el.__pta || {}; if (el.__pta[a] === undefined) el.__pta[a] = v; el.setAttribute(a, r); } }
}
let I18N_OBS = null;
function i18nInit(){
  if (!I18N_OBS && window.MutationObserver){
    I18N_OBS = new MutationObserver(muts => { if (i18nLang() === "pt") return; for (const mu of muts) for (const nd of mu.addedNodes) i18nNode(nd); });
    I18N_OBS.observe(document.body, { childList: true, subtree: true });
  }
  i18nSwitch();
}
function i18nSwitch(){
  const L = i18nLang(), info = I18N_LANGS.find(x => x.id === L) || I18N_LANGS[0];
  document.title = info.title || document.__ptTitle || document.title;
  document.documentElement.lang = info.html;
  // volta tudo ao português e traduz de novo (permite trocar direto entre dois idiomas estrangeiros)
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n;
  while ((n = w.nextNode())) if (n.__pt !== undefined){ n.data = n.__pt; delete n.__pt; }
  document.body.querySelectorAll("*").forEach(el => { if (el.__pta){ for (const a in el.__pta) el.setAttribute(a, el.__pta[a]); delete el.__pta; } });
  if (L !== "pt") i18nNode(document.body);
}
document.__ptTitle = document.title;
