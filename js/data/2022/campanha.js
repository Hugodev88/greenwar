// js/data/2022/campanha.js — Cenário 2022 — regras da campanha: recursos, exércitos, fases, atores (diplomacia), facções, Tensão no Sul.
// As ações e os eventos ficam em acoes.js e eventos.js (carregados antes deste arquivo).
/* ---------- Campanha 2022: A Faixa Presidencial ---------- */
const CAMPAIGN_2022 = {
  start: "2022-10", ap: 3, eventChance: 0.5, eventPaceBoost: true,
  quinzenas: QUINZENAS_2022, urna: URNAS_2022, // abertura em quinzenas e contestação das urnas (js/data/2022/urnas.js)
  money: { label: "Recursos políticos", short: "Recursos", initial: 15, comfort: 15, cap: 80 },
  // Ações por turno crescem com o Apoio Popular: 3 de base; +1 com 60 ou mais; +2 com 75 ou mais
  apScale: { stat: "apoio", tiers: [[60, 1], [75, 2]] },
  // Facções pagam só em Recursos (sem gastar ações) — o principal destino do caixa político
  facMoney: { agradar: 8, pressionar: 6 },
  // Conversão: Recursos → +1 ação neste turno (1 vez por turno)
  convert: { cost: 12, ap: 1 },
  forces: { label: "Força militar leal (soma dos exércitos)", short: "Força", initial: 0 },
  army: { capital: "DF", recruitCost: 8, reinforceCost: 3,
    start: [{ uf: "DF", str: 10, name: "Batalhão da Guarda Presidencial", gen: null }],
    names: { player: ["Comando Militar do Planalto", "Força-Tarefa Sudeste", "Brigada de Operações Especiais", "Divisão Blindada do Sul", "Grupamento Amazônico"],
      resistencia: ["Força Constitucional do Nordeste", "Brigada da Legalidade", "Coluna Amazônica", "Divisão Democrática de Minas", "Frente Popular Armada"],
      separatista: ["Brigada da Liga do Sul", "Guarda Farroupilha", "Divisão Catarinense"] },
    gens: { player: ["Gen. Augusto Valadares", "Gen. Ronaldo Pessanha", "Brig. Márcio Tavares"],
      resistencia: ["Gen. Heloísa Barreto", "Gen. Joaquim Arruda", "Cel. Iara Nogueira"], separatista: ["Cel. Gustavo Wendt", "Gen. Arno Kessler"] } },
  keys: { pop: "apoio", mil: "militar", econ: null, legit: "internacional" },
  contested: null, enemyBase: 3, enemyPower: 1.3, upkeep: 0.3, loan: 15, drain: 2,
  unrestBase: 35, unrest: { DF: 45 },
  pace: [{ from: "2022-10", months: 1 }, { from: "2023-03", months: 3 }],
  defaultDelay: 1,
  storyDelay: { expurgo: 0, decreto: 1, golpe_fracassa: 0, reacao_internacional: 1, racha_militar: 2, guerra: 5, impasse: 8, nova_eleicao: 48, transicao: 1, silencio: 1, contestacao: 1, posse_adiada: 0, contestacao_derrotada: 0 },
  storyAt: { julgamento_tse: "2023-01", veredito: "2023-03", sondagem: "2022-12", golpe_inicial: "2023-01", crise_janeiro: "2023-01", oposicao: "2023-03", justica: "2023-09", inelegivel: "2024-03", campanha2026: "2026-08", eleicao_herdeiro: "2026-08" },
  phases: [
    { id: "regime", if: { visited: ["golpe_inicial"] }, label: "Regime de exceção", war: true,
      player: ["regime"], enemy: ["resistencia", "separatista"], playerMain: "regime", enemyMain: "resistencia",
      flipTo: { resistencia: "regime", separatista: "regime" }, income: 6, perWeight: 0.1 },
    { id: "oposicao", if: { visitedAny: ["transicao", "crise_janeiro", "golpe_fracassa"] }, label: "Líder da oposição", war: false, noArmies: true,
      player: ["oposicao"], enemy: [], flipTo: { legal: "oposicao" }, loseTo: { oposicao: "legal" },
      income: 2, perWeight: 0.04,
      diplo: { req: ["reconhecimento"], off: ["alinhamento", "concessoes", "onu"],
        reqLabels: { reconhecimento: "Endosso político / agenda oficial" },
        offLabels: { alinhamento: "Compromisso de alinhamento num futuro governo", concessoes: "Promessas econômicas para um futuro governo", onu: "Apoio público às posições deles" } } },
    { id: "governo", label: "Presidente em fim de mandato", war: false, player: ["voto_bolso"], enemy: [], income: 3, perWeight: 0.05,
      diplo: { req: ["reconhecimento", "dinheiro"], reqLabels: { reconhecimento: "Apoio público à sua posição" } } }
  ],
  enterFx: { golpe_inicial: { reserve: 4 } },
  checks: [
    { if: { phase: "regime", sideCount: { enemy: { min: 18 } } }, to: "fim_restauracao", why: "A resistência constitucional (somada aos separatistas do Sul) passou a controlar a maioria dos estados." },
    { if: { phase: "regime", fac: { militares: { max: 5 } } }, to: "fim_restauracao", why: "Sem a lealdade das Forças Armadas, o regime desmoronou." },
    { if: { phase: "regime", sideCount: { player: { min: 24 } }, min: { militar: 55 }, visited: ["racha_militar"] }, to: "fim_regime", why: "O regime passou a controlar quase todo o território." }
  ],
  // Partida rápida (~20–30 min): meses passam mais depressa fora da guerra, os eventos-chave do regime chegam antes
  // e a vitória militar do regime pede um pouco menos de território. O resto da campanha é o mesmo.
  rapida: {
    pace: [{ from: "2022-10", months: 1 }, { from: "2023-03", months: 6 }, { from: "2024-03", months: 12 }],
    storyDelay: { reacao_internacional: 1, racha_militar: 1, guerra: 3 },
    eventChance: 0.6,
    checks: [
      { if: { phase: "regime", sideCount: { enemy: { min: 18 } } }, to: "fim_restauracao", why: "A resistência constitucional (somada aos separatistas do Sul) passou a controlar a maioria dos estados." },
      { if: { phase: "regime", fac: { militares: { max: 5 } } }, to: "fim_restauracao", why: "Sem a lealdade das Forças Armadas, o regime desmoronou." },
      { if: { phase: "regime", sideCount: { player: { min: 21 } }, min: { militar: 50 }, visited: ["racha_militar"] }, to: "fim_regime", why: "O regime passou a controlar quase todo o território." }
    ]
  },
  nationalFac: "militares",
  offerFac: { bases: { militares: -6 }, concessoes: { agro: 3, movimentos: -3 }, commodities: { agro: 5 } },
  offLabels: { commodities: "Soja, minério e petróleo", bases: "Acesso à Base de Alcântara", onu: "Votos na ONU", concessoes: "Concessões (minerais críticos, infraestrutura)", alinhamento: "Alinhamento geopolítico" },
  actors: [
    { id: "eua", name: "Estados Unidos", short: "EUA", tag: "Superpotência", ideology: "Defende publicamente o resultado das urnas; quer contrapeso à China.", opinion: 0, democracy: 1.0,
      interests: { commodities: 0.4, bases: 0.8, onu: 0.7, concessoes: 0.6, alinhamento: 0.8 }, gives: { dinheiro: 0.8, armas: 0.6, reconhecimento: 1, sancoes: 1, mediacao: 0.8 },
      rel: { china: -0.9, russia: -1, ue: 0.8, argentina: 0.2, vizinhos: -0.4, onu: 0.4 }, reactions: { militares: 2, movimentos: -3 } },
    { id: "china", name: "China", short: "China", tag: "Maior parceiro comercial", ideology: "Não interferência declarada; prioridade a comércio e infraestrutura.", opinion: 10, democracy: 0,
      interests: { commodities: 1.4, bases: 0.4, onu: 0.6, concessoes: 1, alinhamento: 0.7 }, gives: { dinheiro: 1.4, armas: 0.3, reconhecimento: 0.7, sancoes: 0, mediacao: 0.4 },
      rel: { eua: -0.9, russia: 0.6, ue: -0.3, vizinhos: 0.4 }, reactions: { agro: 4, militares: -3 } },
    { id: "russia", name: "Rússia", short: "Rússia", tag: "Potência sob sanções", ideology: "Busca parceiros fora do Ocidente e votos em fóruns internacionais.", opinion: 10, democracy: -0.2,
      interests: { commodities: 0.5, bases: 0.6, onu: 1.2, concessoes: 0.3, alinhamento: 1.2 }, gives: { dinheiro: 0.4, armas: 0.8, reconhecimento: 0.8, sancoes: 0, mediacao: 0.2 },
      rel: { eua: -1, ue: -1, china: 0.6, vizinhos: 0.6 }, reactions: { agro: 2, centrao: -2 } },
    { id: "ue", name: "União Europeia", short: "UE", tag: "Bloco", ideology: "Democracia, Amazônia e o acordo Mercosul–UE.", opinion: -5, democracy: 1.1,
      interests: { commodities: 0.6, bases: 0, onu: 0.8, concessoes: 0.7, alinhamento: 0.6 }, gives: { dinheiro: 0.9, armas: 0.2, reconhecimento: 1, sancoes: 0.9, mediacao: 1 },
      rel: { eua: 0.8, russia: -1, china: -0.3, onu: 0.6 }, reactions: { agro: -2 } },
    { id: "argentina", name: "Argentina", short: "Argentina", tag: "Vizinho", ideology: "Parceiro do Mercosul; o governo de 2022 é próximo da oposição a você.", opinion: -10, democracy: 0.8,
      interests: { commodities: 0.4, bases: 0, onu: 0.3, concessoes: 0.6, alinhamento: 0.6 }, gives: { dinheiro: 0.2, armas: 0.2, reconhecimento: 1, sancoes: 0.3, mediacao: 0.7 },
      rel: { vizinhos: 0.2, eua: 0.3 } },
    { id: "vizinhos", name: "Venezuela e vizinhos sul-americanos", short: "Vizinhos", tag: "Região", ideology: "Governos de orientações diversas; a maioria reconhece o resultado eleitoral.", opinion: -20, democracy: 0.3,
      interests: { commodities: 0.4, bases: 0, onu: 0.5, concessoes: 0.3, alinhamento: 0.8 }, gives: { dinheiro: 0.1, armas: 0.2, reconhecimento: 0.8, sancoes: 0.1, mediacao: 0.5 },
      rel: { eua: -0.4, russia: 0.6, china: 0.4, argentina: 0.3 } },
    { id: "onu", name: "ONU / OEA", short: "ONU/OEA", tag: "Organismos multilaterais", ideology: "Observação eleitoral, direitos humanos e mediação.", opinion: 0, democracy: 1.2,
      interests: { commodities: 0, bases: 0, onu: 1.2, concessoes: 0, alinhamento: 0.2 }, gives: { dinheiro: 0, armas: 0, reconhecimento: 1.2, sancoes: 0.6, mediacao: 1.5 },
      rel: { eua: 0.4, ue: 0.6 } }
  ],
  factions: [
    { id: "militares", name: "Forças Armadas", short: "Militares", desc: "Os comandos se dividem entre a legalidade e a pressão política.", loyalty: 50, influence: 60, links: { militar: 1 }, boost: { militar: 1 }, rivals: ["stf"] },
    { id: "centrao", name: "Centrão / Congresso", short: "Centrão", desc: "Partidos pragmáticos: acompanham quem tem cargos, verbas e votos.", loyalty: 45, influence: 55, links: { base: 1 }, boost: { base: 1 } },
    { id: "agro", name: "Agronegócio e empresários", short: "Agro/empresas", desc: "Base econômica importante; temem instabilidade e sanções.", loyalty: 60, influence: 50, links: { internacional: 0.5, base: 0.3 }, boostMoney: 2 },
    { id: "evangelicos", name: "Lideranças evangélicas", short: "Evangélicos", desc: "Parte expressiva da sua base eleitoral.", loyalty: 65, influence: 40, links: { apoio: 0.7 }, boost: { apoio: 1 } },
    { id: "movimentos", name: "Movimentos sociais e sindicatos", short: "Movimentos", desc: "Em geral opositores; sua mobilização pesa nas ruas.", loyalty: 20, influence: 35, links: { internacional: 0.3, apoio: -0.2 } },
    { id: "stf", name: "STF / Judiciário", short: "Judiciário", desc: "Tribunais superiores. A barra mede a disposição, não obediência: o Judiciário é independente.", loyalty: 30, influence: 65, links: { internacional: 0.5, militar: -0.3 }, rivals: ["militares"] }
  ],
  choiceFx: {
    apuracao: [ { fac: { stf: 10, militares: -3, centrao: 5, agro: 4 } }, {}, { fac: { stf: -10 } }, { fac: { militares: 4, stf: -12 } } ],
    transicao: [ { fac: { agro: 6 } }, {} ],
    crise_janeiro: [ { fac: { stf: 8 } }, { fac: { stf: -12 } } ],
    oposicao: [ { fac: { centrao: 10 } }, { fac: { evangelicos: 5 } }, { fac: { stf: 5, centrao: 5 } } ],
    justica: [ { fac: { stf: 6 } }, { fac: { stf: -15 } }, { fac: { centrao: 8 } } ],
    golpe_inicial: [ { fac: { centrao: 6 }, south: -15 }, { fac: { militares: 6, movimentos: -10 }, south: 15 }, { fac: { movimentos: -8 }, south: 5 } ],
    reacao_internacional: [ { act: { eua: 10, ue: 10, onu: 10 }, south: -5 }, { act: { russia: 15, china: 5 } }, { fac: { agro: -10 }, south: 10 } ],
    impasse: [ { fac: { militares: 3 } }, { ceasefire: 3, act: { onu: 10, ue: 5 } } ],
    // contestação das urnas (js/core/urnas.js)
    julgamento_tse: [ { urna: { cred: 6 } }, { urna: { prog: 6, esc: 18 } } ],
    posse_adiada: [ { urna: { cred: 5, esc: -10 } }, { urna: { prog: 6, esc: 10 }, fac: { centrao: 5 } } ],
    veredito: [ { urna: { cred: 4 } }, { urna: { prog: 6, esc: 25 } } ],
    escalada: [ { urna: { esc: -45, cred: -5, prog: -5 } }, { fac: { militares: 6, stf: -10 } } ],
    contestacao_derrotada: [ { fac: { stf: 6 } }, { fac: { stf: -10 } } ]
  },
  // Tensão no Sul: a Liga do Sul só se rebela se a tensão chegar a 100 (antes: rebelião garantida no racha nas Forças)
  south: { startNode: "golpe_inicial", ufs: ["RS", "SC", "PR"], rebel: ["RS", "SC"], fac: "separatista", start: 50, base: 5,
    jolt: { racha_militar: 20 }, joltCap: 95, warn: 70, revolt: 100, stage2: 85, stage2After: 2, truce: 45, truceReset: 35, allyMax: 25,
    armyStr: 15, allyStr: 20, allyName: "Divisão Blindada do Sul", summit: "e_sul_cupula", summitAt: 60 },
  actions: ACOES_2022,
  events: EVENTOS_2022
};
