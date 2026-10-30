// js/data/1964/campanha.js — Cenário 1964 — campanha (atores, facções, ações, eventos, fases). BLOQUEADO: não edite.
/* ---------- Campanha 1964: Os Anos Decisivos ---------- */
const CAMPAIGN_1964 = {
  start: "1964-04", ap: 3,
  money: { label: "Orçamento disponível", short: "Cr$ bi", initial: 20, comfort: 20 },
  forces: { label: "Força militar (soma dos exércitos)", short: "Unidades", initial: 4 },
  army: { capital: "DF", recruitCost: 8, reinforceCost: 3,
    start: [{ uf: "RJ", str: 20, name: "I Exército", gen: "Gen. Álvaro Reis" }, { uf: "SP", str: 20, name: "II Exército", gen: "Gen. Saulo Bittencourt" }],
    names: { player: ["Brigada Paraquedista", "III Exército", "IV Exército", "Divisão Blindada", "Grupamento do Planalto"],
      enemy: ["Brigada da Legalidade", "Coluna Gaúcha", "Divisão Nacionalista", "Brigada Operária", "Milícia dos Sargentos"] },
    gens: { player: ["Gen. Ciro Mendonça", "Gen. Hélio Frota"], enemy: ["Gen. Bento Sarmento", "Cel. Rui Valença", "Gen. Ataíde Lopes"] } },
  keys: { pop: "apoio", mil: "coesao", econ: "economia", legit: "liberdades" },
  actorStat: { eua: "eua" },
  contested: "disputa", enemyBase: 2, enemyPower: 0.6, upkeep: 0.35, loan: 15, drain: 2,
  unrestBase: 30, unrest: { RS: 55, PE: 50, RJ: 45, GO: 40 },
  pace: [{ from: "1964-04", months: 1 }, { from: "1965-01", months: 2 }, { from: "1966-07", months: 3 }],
  defaultDelay: 1,
  storyDelay: { sul: 1, levante_sul: 0, primeiro_ato: 1, universidades: 1, economia: 1, eua: 1, igreja_imprensa: 1, prorrogacao: 1, linha_dura: 1, ato_dois: 1, guerra: 2 },
  storyAt: { candidatos: "1965-03", eleicoes_estaduais: "1965-10", negociacao_civil: "1966-03", decisao_final: "1968-06" },
  phases: [
    { id: "guerra", if: { anyControl: ["legalistas"] }, label: "Guerra civil", war: true,
      player: ["militar"], enemy: ["legalistas"], playerMain: "militar", enemyMain: "legalistas",
      flipTo: { legalistas: "disputa" }, income: 4, perWeight: 0.06, diplo: { armsInPeace: true } },
    { id: "governo", label: "Governo militar", war: false, player: ["militar"], enemy: [],
      flipTo: { oposicao: "militar", disputa: "militar" }, income: 3, perWeight: 0.05, diplo: { armsInPeace: true } }
  ],
  enterFx: { guerra: { reserve: 2 }, levante_sul: { reserve: 1 } },
  checks: [
    { if: { phase: "guerra", sideCount: { enemy: { min: 6 } } }, to: "fim_guerra_civil", why: "A resistência legalista passou a controlar seis estados: o país se partiu." },
    { if: { fac: { linhadura: { max: 4 } }, max: { coesao: 25 } }, to: "fim_contragolpe", why: "Sem lealdade da linha dura e com as Forças Armadas divididas, os coronéis tomaram o poder." }
  ],
  nationalFac: "linhadura",
  offerFac: { bases: { linhadura: -4, estudantes: -6, igreja: -3 }, concessoes: { empresarios: 4, linhadura: -3 }, alinhamento: {} },
  offLabels: { commodities: "Café, minério de ferro e cacau", bases: "Facilidades militares e portuárias", onu: "Votos na ONU e na OEA", concessoes: "Abertura a investimentos e remessa de lucros", alinhamento: "Alinhamento na Guerra Fria" },
  actors: [
    { id: "eua", name: "Estados Unidos", short: "EUA", tag: "Superpotência", ideology: "Contenção do comunismo; quer estabilidade e aliados confiáveis no hemisfério.", opinion: 20, democracy: 0.35,
      interests: { commodities: 0.5, bases: 0.6, onu: 0.8, concessoes: 1, alinhamento: 1.2 }, gives: { dinheiro: 1.4, armas: 1, reconhecimento: 1, sancoes: 0.3, mediacao: 0.5 },
      rel: { urss: -1, cuba: -1, franca: 0.2, oea: 0.8, argentina: 0.4, vaticano: 0.2 }, reactions: { linhadura: 1, moderados: 3, estudantes: -4 } },
    { id: "urss", name: "União Soviética", short: "URSS", tag: "Superpotência", ideology: "Busca brechas no bloco ocidental; comércio pragmático.", opinion: -35, democracy: 0,
      interests: { commodities: 1, bases: 1.2, onu: 1, concessoes: 0.3, alinhamento: 1.5 }, gives: { dinheiro: 0.5, armas: 0.4, reconhecimento: 0.6, sancoes: 0, mediacao: 0.2 },
      rel: { eua: -1, cuba: 0.9, oea: -0.6 }, reactions: { linhadura: -8, empresarios: -4 } },
    { id: "cuba", name: "Cuba", short: "Cuba", tag: "Governo revolucionário", ideology: "Hostil a regimes militares alinhados a Washington; pode apoiar a resistência.", opinion: -60, democracy: 0,
      interests: { commodities: 0.2, bases: 0, onu: 0.8, concessoes: 0, alinhamento: 1.5 }, gives: { dinheiro: 0, armas: 0.3, reconhecimento: 0.3, sancoes: 0, mediacao: 0.2 },
      rel: { eua: -1, urss: 0.9, oea: -1 }, reactions: { linhadura: -10 } },
    { id: "franca", name: "França", short: "França", tag: "Potência europeia", ideology: "Política externa independente de Washington; interesse comercial e cultural.", opinion: 10, democracy: 0.5,
      interests: { commodities: 0.8, bases: 0, onu: 0.6, concessoes: 0.8, alinhamento: 0.5 }, gives: { dinheiro: 0.8, armas: 0.9, reconhecimento: 0.6, sancoes: 0.2, mediacao: 0.7 },
      rel: { eua: 0.1, urss: -0.3 } },
    { id: "argentina", name: "Argentina", short: "Argentina", tag: "Vizinho", ideology: "Rival histórico e parceiro comercial; acompanha com atenção a crise brasileira.", opinion: 5, democracy: 0.4,
      interests: { commodities: 0.5, bases: 0, onu: 0.5, concessoes: 0.5, alinhamento: 0.6 }, gives: { dinheiro: 0.2, armas: 0.4, reconhecimento: 0.8, sancoes: 0.2, mediacao: 0.8 },
      rel: { eua: 0.4, cuba: -0.6 } },
    { id: "vaticano", name: "Santa Sé", short: "Vaticano", tag: "Autoridade religiosa", ideology: "Vive o Concílio Vaticano II; atenta a direitos humanos e à Igreja local.", opinion: 10, democracy: 1.2,
      interests: { commodities: 0, bases: 0, onu: 0.5, concessoes: 0, alinhamento: 0.3 }, gives: { dinheiro: 0, armas: 0, reconhecimento: 0.8, sancoes: 0, mediacao: 1.5 },
      rel: { urss: -0.6, cuba: -0.5, eua: 0.2 }, reactions: { igreja: 6 } },
    { id: "oea", name: "OEA", short: "OEA", tag: "Organismo regional", ideology: "Sistema interamericano: segurança hemisférica e, no papel, democracia representativa.", opinion: 20, democracy: 0.6,
      interests: { commodities: 0, bases: 0.2, onu: 1.2, concessoes: 0, alinhamento: 0.4 }, gives: { dinheiro: 0.3, armas: 0, reconhecimento: 1, sancoes: 0.5, mediacao: 1.3 },
      rel: { eua: 0.8, cuba: -1, argentina: 0.3 } }
  ],
  factions: [
    { id: "linhadura", name: "Linha dura", short: "Linha dura", desc: "Oficiais que querem expurgos amplos e um regime longo. Se perder a paciência, pode derrubar você.", loyalty: 55, influence: 55, links: { coesao: 0.8, liberdades: -0.6 }, boost: { coesao: 1 }, rivals: ["moderados"] },
    { id: "moderados", name: "Moderados (Sorbonne / ESG)", short: "Moderados", desc: "Oficiais legalistas e tecnocratas da Escola Superior de Guerra: preferem um regime transitório.", loyalty: 60, influence: 50, links: { liberdades: 0.3, economia: 0.3, eua: 0.3 }, boost: { coesao: 1 }, rivals: ["linhadura"] },
    { id: "udn", name: "UDN e Congresso", short: "Congresso", desc: "Políticos civis que apoiaram a queda de Goulart esperando eleições em 1965.", loyalty: 55, influence: 45, links: { liberdades: 0.6 }, boost: { apoio: 1 } },
    { id: "igreja", name: "Igreja Católica", short: "Igreja", desc: "Dividida, mas cada vez mais atenta a prisões e abusos.", loyalty: 50, influence: 45, links: { liberdades: 0.7, apoio: 0.3 }, boost: { apoio: 1 } },
    { id: "estudantes", name: "Movimento estudantil", short: "Estudantes", desc: "Universidades e entidades estudantis: o foco mais visível de oposição nas cidades.", loyalty: 25, influence: 30, links: { liberdades: 0.8, apoio: 0.2 } },
    { id: "empresarios", name: "Empresariado", short: "Empresários", desc: "Indústria, bancos e comércio: querem inflação baixa e ordem.", loyalty: 65, influence: 50, links: { economia: 0.8 }, boostMoney: 2 }
  ],
  choiceFx: {
    abril: [ { fac: { moderados: 5, linhadura: -8 } }, { fac: { linhadura: 8 } }, { fac: { linhadura: 3, estudantes: -4 } } ],
    primeiro_ato: [ { fac: { linhadura: -10, udn: 8 } }, { fac: { linhadura: 8, udn: -6, estudantes: -6 } }, { fac: { linhadura: 12, udn: -12 } } ],
    universidades: [ { fac: { estudantes: 12 } }, { fac: { estudantes: -15, igreja: -4 } }, {} ],
    economia: [ { fac: { empresarios: 6, igreja: -4 }, money: 6 }, { money: 2 }, { money: 8, fac: { empresarios: -4 } } ],
    eua: [ { money: 10, fac: { linhadura: -4 } }, { money: 5 }, { act: { franca: 10, urss: 5 } } ],
    igreja_imprensa: [ { fac: { igreja: 12 } }, { fac: { igreja: -12, linhadura: 6 } }, { fac: { igreja: -4 } } ],
    eleicoes_estaduais: [ { fac: { udn: 6, linhadura: -12 } }, { fac: { linhadura: 4 } }, { fac: { udn: -12, linhadura: 10 } } ],
    ato_dois: [ { fac: { moderados: 6 } }, { fac: { linhadura: 10, igreja: -10, estudantes: -10 } } ]
  },
  actions: [
    act("e_ajuste", "eco", "Programa de ajuste fiscal", "Corte de gastos e reforma tributária contra a inflação.", { fx: { money: 7, s: { economia: 3, apoio: -4 }, fac: { empresarios: 4 } } }),
    act("e_obras", "eco", "Obras públicas e crédito", "Empregos e inaugurações; pressiona a inflação.", { cost: 6, fx: { s: { apoio: 4, economia: -1 }, unrest: -6, fac: { empresarios: 4 } } }),
    act("e_salarios", "eco", "Conter reajustes salariais", "Ajuda nas contas, pesa no bolso dos trabalhadores.", { fx: { money: 5, s: { economia: 2, apoio: -5 }, fac: { igreja: -4 } } }),
    act("e_capital", "eco", "Atrair capital estrangeiro", "Facilita investimentos e remessas de lucros.", { fx: { money: 6, s: { economia: 2 }, act: { eua: 6 }, fac: { moderados: 4, linhadura: -3 } } }),
    act("m_promocoes", "mil", "Promoções e reorganização", "Acomoda os quartéis com promoções e comandos.", { cost: 4, fx: { s: { coesao: 4 }, fac: { linhadura: 5, moderados: 3 } } }),
    act("m_mobilizar", "mil", "Mobilizar unidades", "+10 de força para seus exércitos (sem AP; custa só recursos).", { ap: 0, cost: 5, fx: { reserve: 1, s: { coesao: 1 } } }),
    act("m_ipm", "mil", "Ampliar inquéritos policial-militares", "Agrada a linha dura; aumenta prisões e o medo.", { fx: { fac: { linhadura: 10, igreja: -5, estudantes: -6 }, s: { liberdades: -6 }, unrest: -6 } }),
    act("m_afastar", "mil", "Afastar oficiais radicais de comandos", "Fortalece os moderados, mas mexe num vespeiro.", { fx: { fac: { linhadura: -15, moderados: 8 }, s: { coesao: -4, liberdades: 3 } }, risk: { p: 0.25, msg: "Manifesto de coronéis circula nos quartéis.", fx: { s: { coesao: -4 } } } }),
    act("p_congresso", "pol", "Negociar com o Congresso", "Cargos e verbas em troca de votos.", { cost: 3, fx: { fac: { udn: 10 }, s: { liberdades: 2 } } }),
    act("p_propaganda", "pol", "Propaganda oficial", "Campanhas de rádio e cinejornais.", { cost: 3, fx: { s: { apoio: 4, liberdades: -1 } } }),
    act("p_censura", "pol", "Ampliar a censura", "Menos críticas publicadas, mais desconfiança.", { fx: { unrest: -8, s: { liberdades: -8, apoio: -2 }, fac: { igreja: -8, estudantes: -8, linhadura: 6 }, act: { vaticano: -4 } } }),
    act("p_abertura", "pol", "Gestos de abertura", "Habeas corpus respeitados, presos políticos libertados.", { fx: { s: { liberdades: 7, apoio: 3 }, fac: { linhadura: -10, igreja: 8, estudantes: 6 }, act: { vaticano: 5 } } }),
    act("d_oea", "dip", "Atuar na OEA", "Diplomacia hemisférica ativa.", { cost: 2, fx: { act: { oea: 8, eua: 4, cuba: -5 } } }),
    act("d_imagem", "dip", "Campanha de imagem no exterior", "Embaixadas explicam o novo governo.", { cost: 3, fx: { actAll: 3 } })
  ],
  events: [
    ev("c_linhadura", "Ultimato dos coronéis", "Comandantes radicais exigem novas cassações, mais censura e o fim do calendário eleitoral — ou ameaçam agir sozinhos.", [
      { text: "Ceder às exigências.", fx: { s: { liberdades: -12, coesao: 4 }, fac: { linhadura: 30, udn: -8, igreja: -6 } } },
      { text: "Enfrentá-los com apoio dos moderados.", fx: { s: { coesao: -10 }, fac: { moderados: 10, linhadura: 10 } }, next: [ { if: { max: { coesao: 25 } }, to: "fim_contragolpe" }, { to: null } ] } ], { crisisOf: "linhadura" }),
    ev("c_moderados", "Moderados ameaçam renúncia", "Ministros e generais moderados ameaçam deixar o governo.", [
      { text: "Dar-lhes mais espaço no governo.", fx: { fac: { moderados: 25, linhadura: -8 }, s: { liberdades: 3 } } },
      { text: "Aceitar as renúncias.", fx: { s: { coesao: -8, eua: -4 }, fac: { linhadura: 6 } } } ], { crisisOf: "moderados" }),
    ev("c_udn", "O Congresso se rebela", "Deputados e senadores derrubam projetos do governo e cobram eleições.", [
      { text: "Negociar e ceder em pautas.", fx: { money: -4, fac: { udn: 25 }, s: { liberdades: 3 } } },
      { text: "Ameaçar com novas cassações.", fx: { s: { liberdades: -8 }, fac: { udn: 5, linhadura: 8 } } } ], { crisisOf: "udn" }),
    ev("c_igreja", "Bispos denunciam abusos", "Uma carta pastoral relata prisões arbitrárias e maus-tratos.", [
      { text: "Mandar apurar e punir os responsáveis.", fx: { s: { liberdades: 5 }, fac: { igreja: 25, linhadura: -10 }, act: { vaticano: 8 } } },
      { text: "Negar e acusar o clero de política.", fx: { s: { apoio: -5 }, fac: { igreja: -5 }, act: { vaticano: -12 } } } ], { crisisOf: "igreja" }),
    ev("c_estudantes", "Passeatas estudantis", "Milhares de estudantes ocupam o centro das capitais.", [
      { text: "Dialogar e atender parte das pautas.", fx: { s: { coesao: -3 }, fac: { estudantes: 25, linhadura: -6 } } },
      { text: "Dispersar as passeatas.", fx: { s: { liberdades: -6, apoio: -4 }, unrestUF: { RJ: 10, SP: 10, MG: 8 }, fac: { igreja: -4 } } } ], { crisisOf: "estudantes" }),
    ev("c_empresarios", "Empresários retiram apoio", "Associações industriais criticam a recessão e o crédito caro.", [
      { text: "Afrouxar o crédito.", fx: { s: { economia: -4 }, fac: { empresarios: 25 } } },
      { text: "Manter o rumo.", fx: { money: -6, s: { economia: -3 } } } ], { crisisOf: "empresarios" }),
    ev("r_inflacao", "Disparada dos preços", "A inflação acelera e corrói salários.", [
      { text: "Congelar preços de itens básicos.", fx: { s: { economia: -4, apoio: 4 }, fac: { empresarios: -6 } } },
      { text: "Apertar ainda mais o ajuste.", fx: { s: { economia: 4, apoio: -5 }, money: 3 } } ], { if: { max: { economia: 45 } } }),
    ev("r_greve", "Greve de metalúrgicos", "Fábricas param na Grande São Paulo e em Minas.", [
      { text: "Negociar com os sindicatos.", fx: { money: -4, s: { apoio: 3 }, fac: { empresarios: -4, linhadura: -4 } } },
      { text: "Intervir nos sindicatos.", fx: { s: { liberdades: -6 }, unrestUF: { SP: 10, MG: 8 }, fac: { linhadura: 6 } } } ], { if: { max: { apoio: 50 } } }),
    ev("r_denuncia", "Denúncias na imprensa estrangeira", "Jornais europeus publicam relatos de tortura em quartéis.", [
      { text: "Abrir investigação independente.", fx: { s: { liberdades: 5 }, fac: { linhadura: -10, igreja: 8 }, actAll: 3 } },
      { text: "Negar e acusar campanha difamatória.", fx: { act: { vaticano: -8, franca: -6 }, s: { eua: -3 } } } ], { if: { max: { liberdades: 32 } }, weight: 1.5 }),
    ev("r_seca", "Seca no Nordeste", "Frentes de trabalho são cobradas pelos governadores.", [
      { text: "Liberar verbas emergenciais.", fx: { money: -6, s: { apoio: 4 }, unrestUF: { CE: -10, PE: -10, PB: -8, RN: -8 } } },
      { text: "Adiar: o orçamento não comporta.", fx: { s: { apoio: -3 }, unrestUF: { CE: 15, PE: 15, PB: 10, RN: 10 } } } ]),
    ev("r_credito", "Crédito internacional", "Organismos multilaterais oferecem um empréstimo em troca de metas.", [
      { text: "Aceitar as metas.", fx: { money: 9, s: { economia: 2, apoio: -2 }, act: { eua: 4 } } },
      { text: "Recusar para manter autonomia.", fx: { act: { franca: 3 } } } ], { if: { min: { economia: 35 } } }),
    ev("r_racha", "Racha na oposição", "Lideranças civis brigam entre si pela candidatura de 1965.", [
      { text: "Aproveitar e atrair os descontentes.", fx: { fac: { udn: 8 }, s: { apoio: 2 } } },
      { text: "Ficar de fora.", fx: { s: { liberdades: 1 } } } ], { if: { until: "1965-12" } }),
    ev("r_copa", "Copa do Mundo", "A Seleção disputa o Mundial na Inglaterra; o país para diante do rádio.", [
      { text: "Associar o governo à Seleção.", fx: { s: { apoio: 3, liberdades: -1 } } },
      { text: "Manter distância.", fx: { s: { apoio: 1 } } } ], { if: { from: "1966-06", until: "1966-08" }, once: true, weight: 5 }),
    ev("r_guerrilha", "Focos de resistência armada", "Pequenos grupos armados atacam quartéis no interior.", [
      { text: "Enviar tropas especiais.", fx: { reserve: -1, s: { coesao: 3 }, fac: { linhadura: 5 } } },
      { text: "Oferecer anistia a quem depuser armas.", fx: { s: { liberdades: 3, coesao: -2 }, fac: { linhadura: -6 } } } ], { if: { max: { liberdades: 35 }, from: "1966-01" } })
  ]
};
