// js/data/novidades.js — Dados: "Novidades" (changelog) mostradas no painel da tela inicial (js/ui/novidades.js).
/* A versão mais nova vem PRIMEIRO. Cada versão: { v, data (AAAA-MM-DD), titulo, itens: [frases curtas em PT-BR] }.
   As frases são traduzidas pelos dicionários em js/i18n/{en,zh,ru}.js (seção "exact"), como o resto do jogo.
   Ao lançar uma fase nova: acrescente uma versão no topo (ver README → "Como atualizar o jogo"). */
const NOVIDADES = [
  { v: "1.16", data: "2026-10-30", titulo: "Finais animados e exércitos de verdade", itens: [
    "Cada final ganhou uma cena animada: Recife caiu, Brasília caiu, motim por falta de soldo, A Virada nas Urnas, Inelegível e os outros.",
    "Exércitos não se juntam mais sozinhos: cada um tem nome, general, moral e experiência. Juntar, dividir e renomear é escolha sua.",
    "Mover tropas ficou mais fácil: escolha o exército, veja a chance em cada destino e o caminho, e confirme. Ordens ficam no mapa e podem ser canceladas.",
    "Botão ⏭ leva ao próximo exército sem ordem, e o painel de exércitos tem busca.",
    "Inimigo mais esperto: planeja por meses, concentra forças, ataca exércitos fracos ou cercados e recua os feridos.",
    "Aba Ações reorganizada em abas, com custo, efeitos e motivo de bloqueio à vista.",
    "Soldo das tropas: com o caixa muito negativo (abaixo de −35) por 5 meses seguidos, as tropas se amotinam.",
    "Só existe a campanha completa (sem partida rápida), ainda com Fácil, Normal e Difícil."
  ] },
  { v: "1.15", data: "2026-10-30", titulo: "Quinzenas e contestação das urnas", itens: [
    "A abertura da campanha agora anda de quinze em quinze dias.",
    "Dá para vencer sem guerra, contestando as urnas pelas vias legais."
  ] },
  { v: "1.14", data: "2026-10-30", titulo: "Guerra nos estados", itens: [
    "A guerra voltou a ser por estados, com flanco, cerco e ímpeto.",
    "Batalha de Recife: tome a capital da Resistência para vencer a guerra."
  ] },
  { v: "1.12", data: "2026-10-30", titulo: "Recife capital e zoom no mapa", itens: [
    "Recife virou a capital da Resistência.",
    "Zoom e arrastar no mapa, no computador e no celular.",
    "Estatísticas contam só campanhas concluídas."
  ] },
  { v: "1.10", data: "2026-10-30", titulo: "Chinês e russo", itens: [
    "O jogo inteiro agora em chinês (简体中文) e russo (Русский)."
  ] },
  { v: "1.9", data: "2026-10-30", titulo: "Mapa de guerra visual", itens: [
    "Placar de força em cada linha de frente, setas do último mês e modo daltônico no mapa."
  ] },
  { v: "1.8", data: "2026-10-30", titulo: "Árvore de decisões de 2022", itens: [
    "Árvore de decisões nacionais dinâmica, com oportunidades que expiram.",
    "Campanha sem prazo: joga-se até a vitória ou a derrota."
  ] },
  { v: "1.7", data: "2026-10-30", titulo: "Reformulação do combate", itens: [
    "Guerra por frentes de batalha, com exércitos, generais e moral."
  ] },
  { v: "1.5", data: "2026-10-30", titulo: "Conselheira, nota e conquistas", itens: [
    "Marta Siqueira, sua chefe de gabinete, dá dicas todo mês.",
    "Tela de final com nota S/A/B/C e conquistas.",
    "Dificuldades Fácil, Normal e Difícil."
  ] },
  { v: "1.3", data: "2026-10-29", titulo: "Configurações e acessibilidade", itens: [
    "Configurações, acessibilidade, inglês e trilha sonora."
  ] },
  { v: "1.1", data: "2026-10-29", titulo: "Tutorial", itens: [
    "Tutorial contextual que pode ser pulado e refeito."
  ] },
  { v: "1.0", data: "2026-10-29", titulo: "Lançamento", itens: [
    "Contas, perfis e saves na nuvem (opcional).",
    "Cenário de 2022 com árvore de decisões e combate no mapa."
  ] }
];
