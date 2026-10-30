// js/data/2022/golpe.js — Dados: linha de dicas da conselheira no caminho do golpe (ficção do cenário 2022): metas, pesos da prontidão, nós da história e falas.
/* Mecânica de FICÇÃO: o caminho da ruptura já existe na história (apuracao → sondagem → expurgo → decreto → golpe_inicial).
   Aqui só ficam os números e as falas que a conselheira usa para orientar quem escolheu esse caminho.
   - aceitou: se algo disso acontecer, a linha do golpe se fecha e ela volta às dicas normais.
   - conspira: sinais de que o jogador entrou na conspiração (flag, foco ou nó da história).
   - militar / militarEspera: Apoio Militar que o nó "decreto" exige (cercar / esperar), antes da folga da dificuldade.
   - ganhos: quanto de Apoio Militar a própria história ainda dá em cada rota (para prever o dia do decreto).
   - faccoes: lealdade desejada antes do golpe (militares seguram o regime; agro acalma o Sul; igrejas e Centrão sustentam a base).
   - pesos: quanto cada parte vale na "Prontidão do golpe" (soma 100). */
const GOLPE_2022 = {
  aceitou: { visitedAny: ["transicao", "crise_janeiro", "golpe_fracassa"], focus: ["a_regras"] },
  conspira: { flags: ["conspiracao"], focus: ["c_ruptura"], visitedAny: ["sondagem", "expurgo", "decreto"] },
  fim: ["reacao_internacional", "racha_militar", "guerra"], // depois de consolidar o golpe, dicas normais (de guerra)
  reuniao: "sondagem",
  militar: 60, militarEspera: 70,
  ganhos: { antes: { apuracao: 5, silencio: 10, contestacao: 5 }, expurgo: 20 }, // convocar/sondar; expurgo (+15) + seguir (+5)
  focos: ["t_balanco", "c_ruptura", "c_quarteis", "c_minuta"],
  faccoes: { militares: 60, agro: 50, evangelicos: 45, centrao: 40 },
  reserva: 30,
  pesos: { militar: 50, focos: 15, faccoes: 20, reserva: 15 },
  riscos: { sul: 55, internacional: 25, base: 30 },
  // índices das escolhas da história usadas pela conselheira
  nos: {
    apuracao: { golpe: 3 }, silencio: { golpe: 2 }, contestacao: { golpe: 1 },
    sondagem: { recuar: 0, expurgo: 1, decreto: 2 },
    expurgo: { seguir: 0, recuar: 1 },
    decreto: { cercar: 0, esperar: 1 },
    golpe_inicial: { negociar: 0, intervir: 1 }
  },
  // Falas (personalidade: cúmplice estrategista, tom de thriller político). Números entram como {0}, {1}.
  falas: {
    role: "Chefe de gabinete · estrategista",
    portaHead: "Duas portas",
    porta: "Reconhecer acalma o mundo. Mas, se o senhor não pretende entregar a faixa, a hora de chamar os comandantes é esta noite. Prontidão hoje: {0}%.",
    portaFacil: "Reconhecer acalma o mundo. Mas, se o senhor não pretende entregar a faixa, a hora de chamar os comandantes é esta noite. Prontidão hoje: {0}%. Apoio Militar {1}; no dia do decreto precisaremos de {2}.",
    portaBtn: "Convocar os comandantes",
    viradaHead: "Ainda dá tempo",
    virada: "Ninguém assinou nada ainda. Se o senhor quiser virar a mesa antes da posse, começamos por aqui:",
    sondHead: "A sala sem celulares",
    sondDireto: "Os quartéis já estão conosco (Apoio Militar {0}, precisamos de {1}). Assine o decreto agora e poupe o desgaste de trocar o comando.",
    sondExpurgo: "Ainda não temos os quartéis (Apoio Militar {0}, precisamos de {1}). Troque o comandante do Exército: isso rende uns {2} pontos até o decreto.",
    sondRecuar: "Mesmo trocando o comando não chegamos lá (Apoio Militar {0}, precisamos de {1}). Recue hoje e viva para lutar outro dia.",
    sondVago: "Leia a sala antes de assinar qualquer coisa. Se os quartéis ainda hesitam, troque o comando primeiro.",
    expHead: "Sem volta",
    expSeguir: "O novo comandante está no cargo. Com Apoio Militar {0} (precisamos de {1}), publique o decreto.",
    expRecuar: "Não vai bastar: Apoio Militar {0}, precisamos de {1}. Recue agora, enquanto ainda é recuo e não fracasso.",
    decHead: "A pergunta que importa",
    decCercar: "Os quartéis vão sair (Apoio Militar {0}, precisamos de {1}). Mande cercar o TSE e o Congresso. Esperar só dá tempo aos outros.",
    decPerdido: "Os quartéis não vão sair (Apoio Militar {0}, precisávamos de {1}). Nenhuma das duas ordens salva o plano; esperar ao menos poupa a imagem lá fora.",
    decVago: "Agora tudo depende das tropas. Se o Apoio Militar estiver alto, cerque. Se não, nada salva o plano.",
    consHead: "O dia seguinte",
    consNegociar: "O golpe passou, mas o país não obedece em bloco. Prometa eleições: acalma o Sul e os vizinhos, e os quartéis aguentam.",
    consIntervir: "Os quartéis estão inquietos (lealdade {0}). Antes de agradar governadores, mostre força: intervenção nos estados que resistem.",
    focoHead: "O plano, passo a passo",
    focoTronco: "Primeiro, um balanço discreto da derrota. Ninguém conspira sem saber quem ainda atende o telefone:",
    focoRuptura: "Abra o caminho. Conversas reservadas, sem atas:",
    focoQuarteis: "Os comandantes precisam se sentir parte disso:",
    focoMinuta: "Deixe o papel pronto. Quando a hora chegar, não haverá tempo de redigir nada:",
    milHead: "Os quartéis primeiro",
    milFac: "Ninguém assina nada sem as tropas. A lealdade das Forças Armadas está em {0}; quero ver acima de {1}.",
    milAcao: "O Apoio Militar está em {0} e no dia do decreto precisamos de {1}. Isto ajuda:",
    baseHead: "Quem segura o regime depois",
    baseFac: "Golpe sem base vira processo. Lealdade em {0}; preciso de pelo menos {1} antes de dezembro.",
    agroFac: "O agro manda no Sul. Com lealdade {0} (meta {1}), a Liga do Sul começa mais calma depois do golpe.",
    sulHead: "O Sul está fervendo",
    sul: "Tensão no Sul em {0}. Cada ponto agora vira problema depois. Isto acalma:",
    intHead: "O mundo está olhando",
    intl: "Relações Internacionais em {0}. Depois do golpe, embaixadas fecham crédito. Melhor chegar lá com alguma reserva de imagem:",
    caixaHead: "Dinheiro para a guerra",
    caixa: "Temos {0} Recursos. Depois do golpe vai faltar dinheiro para tropas; guarde pelo menos {1}.",
    // bloco "Prontidão do golpe"
    pront: "Prontidão do golpe",
    tropasSim: "as tropas saem",
    tropasTalvez: "as tropas hesitam",
    tropasNao: "as tropas não saem",
    tropas: "No dia do decreto:",
    previsao: "Apoio Militar {0} agora → cerca de {1} no decreto (precisa {2})",
    falta: "Falta:",
    pronto: "Tudo pronto. Agora é só a hora certa.",
    hora: "Melhor hora:",
    horaMeses: "a reunião com os comandantes é em {0} mês(es). Use esse tempo para subir o Apoio Militar.",
    horaAgora: "agora. A reunião com os comandantes é neste mês.",
    horaDecreto: "agora: o decreto está na mesa.",
    horaPorta: "esta noite: escolha convocar os comandantes na aba História.",
    riscos: "Riscos:",
    riscoSul: "Sul (tensão {0})",
    riscoSulAgro: "Sul: com o agro em {0}, a Liga do Sul começa mais tensa",
    riscoInt: "reação internacional (Relações Int. {0})",
    riscoBase: "Base Política {0}: trocar o comando custa 10",
    riscoFracasso: "se as tropas não saírem, o senhor responde por crime e pode ter de fugir do país",
    req: { militar: "Apoio Militar no decreto", focos: "Decisões do plano", faccoes: "Lealdades", reserva: "Recursos guardados" }
  }
};
