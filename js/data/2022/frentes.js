// js/data/2022/frentes.js — Dados (2022): guerra por FRENTES (estilo Victoria 3, simplificado): números, generais, posturas e falas.
/* Como funciona (regras em js/core/frentes.js, tela em js/ui/frentes.js):
   - Não há exércitos para mover. Uma LINHA DE FRENTE separa você de cada inimigo e anda REGIÃO por região
     (as 133 regiões intermediárias do IBGE, js/data/mapa-regioes.js). Um estado é de quem tem a maioria das regiões dele.
   - Cada frente recebe uma POSTURA por mês (avançar / segurar / recuar e reorganizar) e uma parte das suas tropas.
   - Força da frente = tropas × moral × suprimento × general × postura × modificadores (comando, apoio, armas, cofres).
   - A linha anda pela diferença de força; a cada ±100 de avanço uma região muda de lado (várias no mesmo mês se a vantagem for grande).
   - Não existe "em disputa": toda região e todo estado é de um lado ou do outro.
   - Se a Liga do Sul se rebelar, abre a segunda frente (Sul) e as tropas precisam ser divididas.
   - Vitória: tomar a região de Recife (reduto da resistência). Derrota: perder Brasília (DF). A região de Porto Alegre é o reduto da Liga do Sul.
   Generais e rostos: só personagens fictícios (os retratos já existem em js/data/2022/retratos.js). */
const FRENTES_2022 = {
  capital: "DF",
  poderBase: 1.3,            // enemyPower do Normal: Fácil/Difícil escalam as tropas inimigas em relação a ele
  k: 85,                     // quanto a linha anda por mês com uma vantagem de força (escala logarítmica)
  bonusAvanco: 8,            // empurrão extra de quem avança com vantagem (a linha nunca fica parada demais)
  ruido: 7,                  // sorte: ± pontos na linha por mês
  defesaSegurar: 1.3,        // segurar a linha: defesa ×1,3
  defesaInimiga: 1.0,        // o inimigo entrincheirado (posição preparada) além do terreno
  reduto: 1.3,               // defesa extra na região-reduto inimiga (Recife / Porto Alegre) e na capital (Brasília)
  // regiões: escala = quanto o avanço mensal vale em "progresso" (100 = uma região); máximo de regiões por frente por mês
  // (+extraOfensiva com ofensiva especial de qualquer lado); suprimento gasto por região tomada; escolha do alvo:
  // foco (peso da distância até o objetivo), coesão (prefere regiões já meio cercadas: a linha anda larga), sorte;
  // custoAlvo: a região da capital / do reduto custa este tanto × 100 de avanço
  regioes: { escala: 3.5, maxMes: 4, extraOfensiva: 2, suprimento: 2, foco: 1, coesao: 2.5, sorte: 0.8, custoAlvo: 5 },
  recuo: 22,                 // recuar e reorganizar: a linha cede este tanto (menos se o inimigo também não ataca)
  recruta: { forca: 20, custo: 10, porMes: 2, moral: 50 },
  poolMin: 10,
  moralMax: { base: 55, lealdade: 0.3, militar: 0.3, min: 40 },
  posturas: {
    avancar: { icone: "⚔", moral: -12, supr: -10, perdas: 0.06 },
    segurar: { icone: "🛡", moral: 4,   supr: 5,   perdas: 0.025 },
    recuar:  { icone: "↺", moral: 20,  supr: 25,  perdas: 0.01 }
  },
  // general: um por frente. Traços: bônus por postura (fração), suprimento extra por mês, moral extra ao atacar
  tracos: {
    agressivo: { avancar: 0.2, segurar: 0, recuar: 0, supr: 0, moralAtk: -3 },
    defensivo: { avancar: -0.1, segurar: 0.25, recuar: 0, supr: 0, moralAtk: 0 },
    logistico: { avancar: 0.05, segurar: 0.05, recuar: 0.05, supr: 10, moralAtk: 0, recuo: 10 }
  },
  generais: [
    { id: "valadares", retrato: "gen_valadares", traco: "agressivo" },
    { id: "pessanha",  retrato: "gen_pessanha",  traco: "defensivo" },
    { id: "tavares",   retrato: "brig_tavares",  traco: "logistico" }
  ],
  // frentes possíveis (uma por facção inimiga). tropas = base + porEstado × estados que o inimigo controla ao abrir
  frentes: {
    resistencia: { tropas: 40, porEstado: 4, reforco: 9, ataca: 1.0, retrato: "gen_barreto", traco: "agressivo", reduto: "PE", vitoria: "fim_regime" },
    separatista: { tropas: 14, porEstado: 6, reforco: 2.5, ataca: 1.35, retrato: "gen_kessler", traco: "defensivo", reduto: "RS" }
  },
  ofensiva: { custo: 10, intervalo: 4, primeira: 2, mult: 1.5, avanco: 1.5, falhaMoral: -20, falhaPerdas: 0.1,
    // o inimigo também tem ofensivas especiais (aparecem no painel um mês antes: dá tempo de segurar a linha)
    inimiga: { chance: 0.35, mult: 1.35, intervalo: 5, primeira: 1, minRazao: 0.75, falhaMoral: -15 } },
  // Textos (PT-BR; o inglês fica em js/i18n/en.js). Números entram como {0}, {1}.
  falas: {
    nome: { resistencia: "Frente Nordeste", separatista: "Frente Sul" },
    inimigo: { resistencia: "Resistência constitucional", separatista: "Liga do Sul" },
    reduto: { resistencia: "Recife — governo provisório da resistência", separatista: "Porto Alegre — sede da Liga do Sul" },
    postura: { avancar: "Avançar", segurar: "Segurar a linha", recuar: "Recuar e reorganizar" },
    posturaCurta: { avancar: "Avançar", segurar: "Segurar", recuar: "Recuar" },
    posturaDesc: {
      avancar: "Ganha terreno, mas custa moral, suprimento e mais baixas.",
      segurar: "Defende bem (+30%) e recupera um pouco. Bom quando o inimigo é forte.",
      recuar: "Cede um pouco de terreno para recuperar muita moral e suprimento."
    },
    traco: { agressivo: "Agressivo", defensivo: "Defensivo", logistico: "Logístico" },
    tracoDesc: {
      agressivo: "+20% ao avançar e nas ofensivas; avançar cansa um pouco mais.",
      defensivo: "+25% ao segurar a linha; −10% ao avançar.",
      logistico: "+10 de suprimento por mês, +5% em tudo e recua com menos perda de terreno."
    },
    fatores: {
      tropas: "Tropas", moral: "Moral", supr: "Suprimento", general: "General", postura: "Postura",
      comando: "Comando e lealdade militar", apoio: "Apoio popular", armas: "Armas estrangeiras", cofres: "Cofres vazios",
      terreno: "Terreno e trincheiras", reduto: "Reduto / capital", estrangeiro: "Apoio estrangeiro ao inimigo", sancoes: "Sanções contra o inimigo",
      ofensiva: "Ofensiva especial", dificuldade: "Dificuldade (força do inimigo)", sorte: "Sorte"
    },
    porque: {
      avancouForte: "Você avançou com vantagem clara de força.",
      avancouApertado: "Você avançou, mas a vantagem era pequena: a linha andou pouco.",
      avancoTravado: "Você mandou avançar sem força suficiente: o ataque travou.",
      segurou: "Você segurou a linha e o ataque inimigo não passou.",
      segurouCedeu: "Você segurou, mas o inimigo era forte demais e a linha cedeu.",
      parado: "Os dois lados ficaram nas trincheiras: a linha quase não mexeu.",
      inimigoRecuou: "O inimigo recuou para se reorganizar: você ganhou terreno.",
      recuou: "Você recuou para reorganizar: perdeu um pouco de terreno, mas a tropa descansou.",
      recuouAtacado: "Você recuou enquanto o inimigo atacava: a linha cedeu bastante.",
      choque: "Os dois lados atacaram ao mesmo tempo: venceu quem tinha mais força.",
      ofensivaOk: "A ofensiva especial rompeu a linha inimiga!",
      ofensivaFalhou: "A ofensiva especial fracassou: perdas pesadas e moral em baixa."
    },
    dicas: {
      fraco: "Você está mais fraco nesta frente: segure a linha e recrute tropas.",
      moral: "Moral ou suprimento baixos: recue e reorganize por um mês.",
      forte: "Você está bem mais forte: avance.",
      ofensiva: "Ofensiva especial disponível: um empurrão grande, com risco.",
      dividir: "Mande mais tropas para a frente mais difícil.",
      general: "Um general defensivo segura melhor; o agressivo avança mais."
    },
    regioes: {
      saldoMes: "+{0} / −{1} regiões no mês",
      listaGanhou: "Regiões tomadas: {0}.",
      listaPerdeu: "Regiões perdidas: {1}.",
      listaAmbos: "Regiões tomadas: {0}. Regiões perdidas: {1}.",
      placar: "Você {0} regiões × Inimigo {1}",
      placarCurto: "Você {0} × {1}",
      tendencia: "Território nos últimos meses (suas regiões)",
      semHistorico: "A tendência aparece depois do primeiro mês de guerra.",
      proxTomar: "Próxima região que você toma: {0}",
      proxPerder: "Próxima região que você perde: {0}",
      barraAjuda: "A cada +100 a linha toma uma região (várias no mesmo mês se a vantagem for grande); a −100, perde uma.",
      maioria: "Cada estado é de quem tem a maioria das regiões dele.",
      legTomada: "Região tomada neste mês",
      legPerdida: "Região perdida neste mês",
      legSeta: "Setas: para onde a linha andou",
      revolta: "Revolta! {1} regiões passaram para o inimigo: {0}.",
      acc: "Regiões que mudaram de lado no último mês: {0}.",
      accNada: "Nenhuma região mudou de lado no último mês.",
      tomadaPor: "tomada: {0}",
      perdidaPara: "perdida: {0}",
      territorio: "Território",
      legPlacar: "suas regiões × regiões do inimigo da frente",
      suas: "Suas regiões",
      inimigas: "Regiões inimigas",
      cercoCapital: "Cerco à sua capital: {0}%",
      cercoReduto: "Cerco ao reduto inimigo: {0}%",
      cercoAjuda: "Capital e reduto só caem com o cerco completo; enquanto isso, a linha toma as regiões em volta."
    },
    eventos: {
      abriu: "Abriu a {0}: a linha de frente contra {1} está ativa.",
      fechou: "A {0} foi fechada.",
      tomou: "{0}: a linha avançou e o estado agora é {1}.",
      perdeu: "{0}: a linha recuou e o estado agora é {1}.",
      capitalRisco: "⚠ A frente chegou à capital! Se Brasília cair, o regime cai.",
      vitoria: "Recife caiu: o governo provisório da resistência se rendeu.",
      derrota: "Brasília caiu: a resistência tomou a capital.",
      ligaCaiu: "Porto Alegre caiu: a Liga do Sul se rendeu e a Frente Sul foi fechada.",
      mobiliza: "Alistamento: +{0} de tropas para o seu efetivo.",
      ofensiva: "Ofensiva especial lançada na {0}.",
      ofensivaInimiga: "{0}: o inimigo prepara uma ofensiva especial! Segurar a linha reduz o estrago.",
      ofensivaInimigaFalhou: "{0}: a ofensiva inimiga quebrou contra a sua linha."
    }
  }
};
