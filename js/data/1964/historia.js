// js/data/1964/historia.js — Cenário 1964 "Os Anos Decisivos" — história (nós e escolhas).
// BLOQUEADO (locked:true): dados mantidos, mas o cenário não é jogável. Não edite.
/* ---------- Cenário 1964 (história alternativa) — BLOQUEADO (locked:true): dados mantidos, não jogável ---------- */
const STORY_1964 = {
  start: "abril",
  stats: {
    coesao:     { label: "Coesão Militar",        color: "#a8402f", initial: 60 },
    apoio:      { label: "Apoio Popular",         color: "#c9a45c", initial: 45 },
    economia:   { label: "Economia",              color: "#5f8f5a", initial: 30 },
    eua:        { label: "Relações c/ EUA",       color: "#4f7aa3", initial: 60 },
    liberdades: { label: "Liberdades",            color: "#8f7bb8", initial: 40 }
  },
  factions: {
    militar:    { label: "Governo militar",                  color: "#55624a" },
    legalistas: { label: "Legalistas (resistência)",         color: "#b9483f" },
    disputa:    { label: "Em disputa",                       color: "#d0782a" },
    oposicao:   { label: "Governo estadual de oposição",     color: "#4f86b8" },
    civil:      { label: "Governo civil eleito",             color: "#3f9a7a" },
    transicao:  { label: "Transição negociada",              color: "#8a86c2" },
    linhadura:  { label: "Junta da linha dura",              color: "#3b2a22" }
  },
  defaultFaction: "militar",   // facção de todos os estados não listados em initialMap
  initialMap: { RS: "disputa" },
  legendAlways: ["militar", "disputa"],
  // O mapa usa a divisão atual dos estados; estas notas explicam a situação em 1964.
  stateNotesLabel: "Em 1964",
  stateNotes: {
    RJ: "Estado do Rio + Estado da Guanabara (cidade do Rio)", MS: "parte de Mato Grosso", TO: "parte de Goiás",
    RO: "Território Federal", RR: "Território Federal", AP: "Território Federal", DF: "capital desde 1960"
  },
  collapse: { coesao: "fim_contragolpe" },
  nodes: {
    abril: {
      chapter: "2 de abril de 1964",
      title: "O Dia Seguinte",
      text: [
        "Em menos de 48 horas, o governo de João Goulart caiu. O presidente deixou Brasília rumo ao Sul, e o Congresso declarou a Presidência vaga durante a madrugada. Os comandantes militares que lideraram o movimento entregaram a você a chefia do novo governo.",
        "Mas nada está resolvido. Em Porto Alegre, Leonel Brizola convoca a resistência pelo rádio, e o comando do III Exército hesita entre os dois lados. No Atlântico, uma força-tarefa naval norte-americana navega rumo à costa brasileira — pronta para apoiar o novo governo caso haja guerra.",
        "Os generais esperam suas ordens. O país espera saber que tipo de governo você será."
      ],
      choices: [
        { text: "Enviar emissários ao III Exército e garantir que não haverá expurgos.", effects: { coesao: -5, liberdades: 5 }, next: "sul" },
        { text: "Ordenar que tropas marchem sobre Porto Alegre.", effects: { coesao: 5, apoio: -5, liberdades: -5 }, flag: "marcha", next: "sul" },
        { text: "Pedir apoio logístico e naval aos Estados Unidos.", effects: { eua: 10, apoio: -5, coesao: 5 }, flag: "brother_sam", next: "sul" }
      ]
    },
    sul: {
      chapter: "Abril de 1964",
      title: "A Questão do Sul",
      text: [
        "Goulart cruza a fronteira para o exílio no Uruguai. Brizola permanece no Rio Grande do Sul, escondido entre apoiadores; alguns quartéis gaúchos ainda não reconheceram o novo governo.",
        "Os moderados do Estado-Maior aconselham paciência: sem o presidente deposto, a resistência perde a razão de ser. Os oficiais mais radicais — a chamada linha dura — querem prisões imediatas e exemplares."
      ],
      choices: [
        { text: "Garantir passagem segura ao exílio para os líderes da resistência.", effects: { liberdades: 5, coesao: -5 }, map: { RS: "militar" }, next: "primeiro_ato" },
        { text: "Exigir a prisão dos líderes da resistência a qualquer custo.", effects: { coesao: 5, liberdades: -10, apoio: -5 },
          next: [ { if: { flags: ["marcha"] }, to: "levante_sul" }, { to: "primeiro_ato" } ] }
      ]
    },
    levante_sul: {
      chapter: "Abril de 1964",
      title: "Porto Alegre em Armas",
      onEnter: { map: { RS: "legalistas", SC: "disputa" } },
      text: [
        "A marcha das tropas sobre Porto Alegre produz o efeito oposto ao desejado: unidades legalistas, brigadianos e milhares de civis se entrincheiram na capital gaúcha. Em Santa Catarina, guarnições se dividem.",
        "Pela primeira vez, a mudança de governo ameaça virar guerra entre brasileiros. Os norte-americanos perguntam, discretamente, se ainda precisam de sua frota."
      ],
      choices: [
        { text: "Negociar a rendição com anistia aos soldados.", effects: { coesao: -10, liberdades: 5 }, map: { RS: "militar", SC: "militar" }, next: "primeiro_ato" },
        { text: "Esmagar a resistência com força total.", effects: { coesao: 5, apoio: -10, liberdades: -10, eua: -5 },
          next: [ { if: { min: { coesao: 65 } }, to: "primeiro_ato" }, { to: "guerra" } ] }
      ]
    },
    primeiro_ato: {
      chapter: "Abril de 1964",
      title: "O Ato Institucional",
      onEnter: { map: { RS: "militar", SC: "militar" } },
      text: [
        "O comando militar edita um Ato Institucional que dá ao governo poderes extraordinários: cassar mandatos, suspender direitos políticos e afastar servidores. Juristas já redigiram a lista de nomes — e ela cresce a cada reunião.",
        "Cada nome na lista é uma carreira encerrada, uma família afetada, um aliado ganho na linha dura ou um inimigo criado no Congresso. Até onde ir é decisão sua."
      ],
      choices: [
        { text: "Restringir as cassações a poucos casos e manter o Congresso atuante.", effects: { liberdades: 10, coesao: -10 }, next: "universidades" },
        { text: "Cassações amplas: parlamentares, sindicalistas e servidores.", effects: { liberdades: -15, coesao: 10, apoio: -5 }, next: "universidades" },
        { text: "Cassar também ex-presidentes e os principais líderes de oposição.", effects: { liberdades: -20, coesao: 10, apoio: -5 }, flag: "jk_cassado", next: "universidades" }
      ]
    },
    universidades: {
      chapter: "Abril de 1964",
      title: "Os Estudantes",
      text: [
        "A sede da UNE, no Rio, foi incendiada nos primeiros dias do movimento. Nas universidades, professores são afastados e assembleias estudantis se multiplicam. Os jovens serão, por anos, o termômetro mais sensível do país.",
        "Seus ministros discordam: uns querem reformar o ensino com diálogo, outros querem intervir nos campi."
      ],
      choices: [
        { text: "Abrir diálogo com reitores e lideranças estudantis.", effects: { liberdades: 5, apoio: 5, coesao: -5 }, next: "economia" },
        { text: "Intervir nas universidades e proibir as entidades estudantis.", effects: { liberdades: -10, coesao: 5, apoio: -5 }, next: "economia" },
        { text: "Ignorar o tema e concentrar-se na economia.", effects: { apoio: -5 }, next: "economia" }
      ]
    },
    economia: {
      chapter: "Maio de 1964",
      title: "A Inflação",
      text: [
        "A inflação anual passa de 90%. O salário perde valor a cada semana, e a dívida externa vence sem dinheiro em caixa. Seus economistas propõem um plano de estabilização duro: corte de gastos, arrocho salarial e reforma fiscal.",
        "Os empresários aplaudem; os sindicatos — já sob intervenção — calam por enquanto. Mas o custo social do ajuste será sentido nas mesas das famílias."
      ],
      choices: [
        { text: "Aplicar o plano de austeridade completo.", effects: { economia: 15, apoio: -10, eua: 5 }, next: "eua" },
        { text: "Ajuste gradual, protegendo o salário mínimo.", effects: { economia: 5, apoio: 5 }, next: "eua" },
        { text: "Emitir moeda e priorizar obras e crescimento rápido.", effects: { economia: -10, apoio: 10 }, next: "eua" }
      ]
    },
    eua: {
      chapter: "Junho de 1964",
      title: "Washington",
      text: [
        "Os Estados Unidos reconheceram o novo governo em poucas horas. Agora oferecem empréstimos e ajuda econômica — com condições: mudanças nas regras de remessa de lucros, abertura a investimentos e alinhamento na política externa.",
        "No Itamaraty, diplomatas lembram que a autonomia conquistada nos anos anteriores também tem valor."
      ],
      choices: [
        { text: "Aceitar a ajuda com todas as condições.", effects: { eua: 15, economia: 10, apoio: -5 }, next: "igreja_imprensa" },
        { text: "Aceitar a ajuda, mas preservar margem de manobra.", effects: { eua: 5, economia: 5 }, next: "igreja_imprensa" },
        { text: "Recusar as condições e buscar outros parceiros.", effects: { eua: -15, apoio: 5, economia: -5 }, next: "igreja_imprensa" }
      ]
    },
    igreja_imprensa: {
      chapter: "Junho de 1964",
      title: "Bispos e Jornais",
      text: [
        "Jornais que apoiaram a queda de Goulart começam a criticar as cassações e as denúncias de maus-tratos a presos políticos. Bispos, antes divididos, publicam cartas cobrando respeito aos direitos humanos.",
        "Os oficiais mais duros exigem censura. Os moderados alertam que calar a imprensa é admitir que o governo não pretende devolver o poder."
      ],
      choices: [
        { text: "Tolerar as críticas e mandar apurar as denúncias.", effects: { liberdades: 10, coesao: -10, apoio: 5 }, next: "prorrogacao" },
        { text: "Instituir censura prévia aos jornais.", effects: { liberdades: -15, coesao: 5, apoio: -5 }, next: "prorrogacao" },
        { text: "Pressionar os donos dos jornais nos bastidores.", effects: { liberdades: -5 }, next: "prorrogacao" }
      ]
    },
    prorrogacao: {
      chapter: "Julho de 1964",
      title: "O Calendário",
      text: [
        "O mandato que você herdou termina em janeiro de 1966, e a eleição presidencial está marcada para 1965. Aliados no Congresso propõem prorrogar o seu mandato e adiar a eleição: \"o trabalho de reconstrução ainda não terminou\".",
        "Carlos Lacerda, governador da Guanabara e aliado de primeira hora, já se apresenta como candidato. Juscelino Kubitschek, ex-presidente e senador, também — e lidera as pesquisas informais."
      ],
      choices: [
        { text: "Manter a eleição presidencial de 1965.", effects: { liberdades: 15, coesao: -10 }, next: "candidatos" },
        { text: "Aceitar a prorrogação do mandato.", effects: { liberdades: -10, coesao: 5, apoio: -5 }, flag: "prorrogado", next: "eleicoes_estaduais" }
      ]
    },
    candidatos: {
      chapter: "1965",
      title: "A Corrida Presidencial",
      text: [
        "A campanha começa. Lacerda percorre o país com o discurso de quem ajudou a derrubar o governo anterior; Kubitschek atrai multidões com a memória dos anos de crescimento. Nos quartéis, a possibilidade de vitória de um candidato de oposição causa alarme.",
        "A linha dura quer vetos. Os moderados lembram que eleição com vetos não convence ninguém — nem no Brasil, nem em Washington."
      ],
      choices: [
        { text: "Garantir que todos os candidatos possam concorrer.", req: { noFlags: ["jk_cassado"] }, effects: { liberdades: 15, coesao: -15, eua: 5 }, next: "eleicoes_estaduais" },
        { text: "Vetar candidatos de oposição e apoiar um civil aliado.", effects: { liberdades: -5, coesao: 5 }, next: "eleicoes_estaduais" },
        { text: "Adiar a eleição por tempo indeterminado.", effects: { liberdades: -15, coesao: 5, apoio: -10 }, flag: "prorrogado", next: "eleicoes_estaduais" }
      ]
    },
    eleicoes_estaduais: {
      chapter: "Outubro de 1965",
      title: "As Urnas dos Estados",
      onEnter: { map: { RJ: "oposicao", MG: "oposicao" } },
      text: [
        "Nas eleições para governador, candidatos ligados à oposição vencem em dois estados decisivos: Guanabara e Minas Gerais. Para a linha dura, é a prova de que o povo \"ainda não está preparado\". Para os moderados, é a prova de que o povo quer votar.",
        "Na Vila Militar, no Rio, oficiais se reúnem em assembleias improvisadas. O clima nos quartéis é de rebelião."
      ],
      choices: [
        { text: "Dar posse aos eleitos e respeitar o resultado.", effects: { liberdades: 10, coesao: -15, apoio: 10 }, next: "linha_dura" },
        { text: "Dar posse, mas aceitar novas restrições exigidas pelos quartéis.", effects: { coesao: 5, liberdades: -10 }, next: "linha_dura" },
        { text: "Anular as eleições nos dois estados.", effects: { liberdades: -20, apoio: -10, coesao: 10 }, map: { RJ: "militar", MG: "militar" }, next: "linha_dura" }
      ]
    },
    linha_dura: {
      chapter: "Outubro de 1965",
      title: "O Ultimato",
      text: [
        "Uma comissão de coronéis e generais leva a você uma lista de exigências: um segundo Ato Institucional, com dissolução dos partidos, eleições indiretas para presidente e poderes para cassar quem resistir.",
        "Não é um pedido. Há tropas de prontidão em três capitais. Se você recusar, outros poderão aceitar no seu lugar."
      ],
      choices: [
        { text: "Resistir à pressão e manter o calendário eleitoral.",
          next: [ { if: { min: { coesao: 40 } }, to: "negociacao_civil" }, { to: "fim_contragolpe" } ] },
        { text: "Ceder: editar o segundo Ato Institucional.", effects: { liberdades: -20, coesao: 15, apoio: -5 }, next: "ato_dois" },
        { text: "Negociar com os moderados uma transição com data marcada.", req: { min: { liberdades: 35 } }, effects: { coesao: -5, liberdades: 5 }, next: "negociacao_civil" }
      ]
    },
    ato_dois: {
      chapter: "1966–1967",
      title: "Partidos Dissolvidos",
      onEnter: { resolve: { oposicao: "militar" } },
      text: [
        "Os antigos partidos são extintos. Em seu lugar, um sistema de dois partidos autorizados: um do governo, outro de oposição consentida. O próximo presidente será escolhido pelo Congresso — um Congresso já depurado.",
        "Nos governos estaduais, interventores e aliados assumem. O regime ganhou fôlego; a política, porém, mudou-se para as ruas, as igrejas e as universidades."
      ],
      choices: [
        { text: "Manter o regime, mas anunciar um prazo para devolver o poder.", effects: { liberdades: 5, coesao: -5 }, next: "decisao_final" },
        { text: "Ampliar os órgãos de segurança e a censura.", effects: { liberdades: -15, coesao: 10, apoio: -10, eua: -5 }, next: "decisao_final" }
      ]
    },
    negociacao_civil: {
      chapter: "1966",
      title: "A Mesa com os Civis",
      text: [
        "Contra a vontade de parte dos quartéis, você abre conversas com líderes do Congresso, governadores, juristas e representantes da Igreja. Na pauta: uma nova Constituição, a data das eleições e garantias para os militares que deixarem o poder.",
        "Todos à mesa sabem que o acordo precisa sobreviver a duas ameaças: a impaciência das ruas e a desconfiança dos quartéis."
      ],
      choices: [
        { text: "Convocar eleições diretas para presidente já em 1966.",
          next: [ { if: { max: { coesao: 29 } }, to: "fim_contragolpe" }, { if: { min: { liberdades: 45 } }, to: "fim_redemocratizacao" }, { to: "fim_transicao" } ] },
        { text: "Transição gradual: Constituinte, garantias aos militares e eleição civil em 1967.",
          next: [ { if: { max: { coesao: 24 } }, to: "fim_contragolpe" }, { to: "fim_transicao" } ] }
      ]
    },
    decisao_final: {
      chapter: "1968",
      title: "O Ano que Não Terminou",
      onEnter: { map: { RJ: "disputa" } },
      text: [
        "Passeatas de estudantes tomam o centro do Rio. Operários fazem greves em Minas e em São Paulo. No Congresso, até deputados do partido do governo votam contra o Planalto. A linha dura exige o fechamento total: Congresso em recesso, habeas corpus suspenso, censura completa.",
        "É a encruzilhada final. O que você decidir agora definirá o Brasil por uma geração."
      ],
      choices: [
        { text: "Fechar o Congresso e suspender as garantias individuais.", effects: { liberdades: -25, coesao: 10 },
          next: [ { if: { max: { apoio: 20 } }, to: "guerra" }, { to: "fim_ditadura" } ] },
        { text: "Recuar e reabrir a negociação com os civis.", effects: { liberdades: 10 },
          next: [ { if: { max: { coesao: 34 } }, to: "fim_contragolpe" }, { to: "negociacao_civil" } ] },
        { text: "Entregar o comando aos generais da linha dura.", next: "fim_contragolpe" }
      ]
    },
    guerra: {
      chapter: "Guerra Civil",
      title: "O Sul em Armas",
      onEnter: { map: { RS: "legalistas", SC: "legalistas", PR: "disputa", RJ: "disputa" } },
      text: [
        "O que começou como resistência vira guerra aberta. Unidades legalistas, brigadas estaduais e milícias civis controlam o Rio Grande do Sul e Santa Catarina; no Paraná, a frente oscila. Nas grandes cidades, a repressão e os atentados se alimentam mutuamente.",
        "Os mortos já não cabem nos comunicados oficiais. Embaixadas evacuam cidadãos. Ninguém sabe quem governará o Brasil no ano seguinte."
      ],
      choices: [
        { text: "Ordenar uma ofensiva total contra o Sul.", effects: { apoio: -10, liberdades: -10 },
          next: [ { if: { min: { coesao: 60, economia: 25 } }, to: "fim_ditadura" }, { to: "fim_guerra_civil" } ] },
        { text: "Aceitar mediação internacional e um cessar-fogo.", effects: { eua: 5 },
          next: [ { if: { min: { liberdades: 30 } }, to: "fim_transicao" }, { to: "fim_guerra_civil" } ] },
        { text: "Pedir intervenção militar direta dos EUA.", req: { flags: ["brother_sam"] }, effects: { eua: 10, apoio: -20 },
          next: [ { if: { min: { eua: 70 } }, to: "fim_ditadura" }, { to: "fim_guerra_civil" } ] }
      ]
    },

    /* ======================= FINAIS ======================= */
    fim_redemocratizacao: {
      ending: true, endingName: "Redemocratização Precoce",
      onEnter: { resolve: { militar: "civil", oposicao: "civil", disputa: "civil", legalistas: "civil", transicao: "civil" } },
      chapter: "Epílogo — 1966", title: "Os Quartéis Voltam aos Quartéis",
      text: [
        "Dois anos e meio depois da queda de Goulart, o Brasil vai às urnas para escolher o presidente. O vencedor é um civil, e você lhe entrega a faixa numa cerimônia sóbria. Os cassados começam a ter seus direitos revistos.",
        "Historiadores discutirão por décadas se aquele intervalo foi um desvio ou um aviso. Mas uma geração inteira cresce votando — e isso muda tudo."
      ]
    },
    fim_transicao: {
      ending: true, endingName: "Transição Negociada",
      onEnter: { resolve: { militar: "transicao", oposicao: "transicao", disputa: "transicao", legalistas: "transicao", civil: "transicao" } },
      chapter: "Epílogo — 1967", title: "O Acordo",
      text: [
        "Uma nova Constituição é promulgada e um presidente civil assume em 1967, eleito sob regras negociadas. Os militares mantêm influência e garantias; os cassados voltam aos poucos à vida pública.",
        "Não é a democracia plena que muitos queriam, nem o regime que outros sonhavam. É um compromisso frágil — mas evita os anos de chumbo que pareciam inevitáveis."
      ]
    },
    fim_ditadura: {
      ending: true, endingName: "Ditadura Longa",
      onEnter: { resolve: { legalistas: "militar", disputa: "militar", oposicao: "militar", civil: "militar", transicao: "militar" } },
      chapter: "Epílogo — 1968 em diante", title: "Os Anos de Chumbo",
      text: [
        "O Congresso é fechado, a censura se torna total e os órgãos de segurança ganham poder quase ilimitado. O regime durará mais de duas décadas. A economia terá anos de crescimento — e depois de dívida e inflação.",
        "O custo humano será registrado, anos mais tarde, por comissões de investigação: centenas de mortos e desaparecidos, milhares de presos e torturados, exilados que só voltarão com a anistia. Famílias esperarão décadas por respostas que nunca chegarão inteiras."
      ]
    },
    fim_contragolpe: {
      ending: true, endingName: "Contragolpe da Linha Dura",
      onEnter: { resolve: { militar: "linhadura", oposicao: "linhadura", disputa: "linhadura", civil: "linhadura", transicao: "linhadura" } },
      chapter: "Epílogo", title: "O Golpe Dentro do Golpe",
      text: [
        "Numa madrugada, tanques cercam o Palácio. Os generais da linha dura comunicam que você está afastado \"por motivos de saúde\" e assumem o governo em junta. Os moderados são transferidos para a reserva; você é posto em prisão domiciliar.",
        "Quem tentou equilibrar quartéis e urnas descobre que, num regime de exceção, quem controla as armas decide quando o equilíbrio acabou."
      ]
    },
    fim_guerra_civil: {
      ending: true, endingName: "Guerra Civil",
      onEnter: { resolve: { disputa: "legalistas" }, map: { PR: "disputa", MG: "disputa" } },
      chapter: "Epílogo", title: "Duas Bandeiras, um País",
      text: [
        "A guerra não tem vencedor. O Sul, sob um governo legalista, resiste com apoio de voluntários e de países vizinhos; o restante do país vive sob lei marcial. A frente se estabiliza no Paraná, e Minas Gerais se torna uma terra de ninguém política.",
        "Anos depois, quando enfim se negociar a paz, os dois lados contarão os mesmos mortos com números diferentes. O Brasil de 1964 terá deixado de existir."
      ]
    }
  }
};
