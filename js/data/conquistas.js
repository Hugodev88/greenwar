// js/data/conquistas.js — Dados: conquistas (medalhas) e as faixas da nota final (S/A/B/C). As regras ficam em js/core/conquistas.js.
/* Nota final (0–100): base pelo tipo de final + 30% da média dos atributos + território (ou pontos fixos sem guerra) + decisões nacionais + paz com o Sul + ajuste da dificuldade.
   Cada conquista: { id, icone, nome, desc, teste(g, x) } — x = { outcome, nota, achados (finais descobertos), total }. */
const NOTA_FAIXAS = [["S", 85], ["A", 70], ["B", 50], ["C", 0]];
const GRADE_RANK = "SABC";
const NOTA_BASE = { vitoria: 52, parcial: 34, derrota: 14 };
const NOTA_TETO = { parcial: "A", derrota: "B" };
const NOTA_PAZ = 6;   // pontos de "território" quando não houve guerra
const NOTA_SUL = 4;   // Sul aliado ou em armistício
const NOTA_DIF = 4;   // × DIFICULDADES[d].nota (Fácil −4, Difícil +4)
const CONQUISTAS = [
  { id: "primeira",     icone: "📜", nome: "Primeira campanha",     desc: "Chegue a um final.",                                       teste: () => true },
  { id: "vitoria",      icone: "🏆", nome: "Missão cumprida",       desc: "Termine com um final de vitória.",                         teste: (g, x) => x.outcome === "vitoria" },
  { id: "nota_s",       icone: "⭐", nome: "Nota máxima",           desc: "Tire nota S.",                                             teste: (g, x) => x.nota === "S" },
  { id: "dificil",      icone: "🔥", nome: "Sem rede de proteção",  desc: "Vença no Difícil.",                                        teste: (g, x) => x.outcome === "vitoria" && g.diff === "dificil" },
  { id: "rapida",       icone: "⏱️", nome: "Contra o relógio",      desc: "Termine uma partida rápida.",                              teste: g => !!g.quick },
  { id: "urnas",        icone: "🗳️", nome: "Pelas urnas",           desc: "Volte ao poder pela eleição.",                             teste: g => g.ended.node === "fim_retorno" },
  { id: "paz",          icone: "🕊️", nome: "Sem disparar um tiro",  desc: "Vença sem nenhuma batalha.",                               teste: (g, x) => x.outcome === "vitoria" && !g.stat.battles },
  { id: "sul",          icone: "🤝", nome: "Federação unida",       desc: "Assine o Pacto Federativo com o Sul.",                     teste: g => (g.flags || []).includes("sul_aliado") },
  { id: "veterano",     icone: "🎖️", nome: "Veterano",              desc: "Passe 10 meses ou mais em combate numa campanha.",         teste: g => (g.stat.battles || 0) >= 10 },
  { id: "planejador",   icone: "🧭", nome: "Planejador",            desc: "Conclua 8 decisões nacionais numa campanha.",              teste: g => !!g.focus && g.focus.done.length >= 8 },
  { id: "equipe",       icone: "💼", nome: "Boa equipe",            desc: "Siga 10 dicas da conselheira numa campanha.",              teste: g => (g.stat.adv || 0) >= 10 },
  { id: "colecionador", icone: "📚", nome: "Colecionador",          desc: "Descubra 5 finais diferentes.",                            teste: (g, x) => x.achados >= 5 },
  { id: "historiador",  icone: "🏛️", nome: "Historiador",           desc: "Descubra todos os finais.",                                teste: (g, x) => x.total > 0 && x.achados >= x.total }
];
