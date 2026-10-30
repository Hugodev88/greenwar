# Greenwar — Crônicas da Separação

Jogo de estratégia e história interativa sobre o Brasil, inspirado em Hearts of Iron. Funciona offline, é um site estático simples (HTML, CSS e JavaScript, sem instalação nem build). Você toma decisões mês a mês e vê no mapa quem controla cada estado.

> **Aviso:** este jogo é uma **obra de ficção**. Eventos, diálogos e desfechos são hipotéticos. Pessoas reais são tratadas de forma neutra, sem citações inventadas atribuídas a elas. Caminhos autoritários ou de ruptura têm consequências sérias dentro do jogo: o jogo não endossa nenhum deles.

## Cenários
| Ano | Cenário | Situação | Resumo |
|---|---|---|---|
| 2022 | **A Faixa Presidencial** | ✅ jogável | Depois da eleição de 2022: aceitar o resultado, contestar ou tentar uma ruptura. Tem a **árvore de decisões nacionais** (44 focos). |
| 1964 | **Os Anos Decisivos** | 🔒 em breve | A crise política de 1964 e suas alternativas. Os dados continuam no código, mas o cenário aparece no menu como "Em breve" e não pode ser aberto. |

O foco atual é o cenário de **2022**. (O antigo cenário fictício de 1924, "Aurora do Sul", foi removido; continua no histórico do git.)

## Sistemas
- **Turnos:** um turno por mês (em 2022, a partir de março de 2023, cada turno vale 3 meses), com Pontos de Ação.
- **Diplomacia:** acordos com atores estrangeiros.
- **Facções internas:** cada uma tem lealdade.
- **Eventos (2022: 69 no total).** Mais de 50 eventos sorteáveis cobrem economia (dólar, juros, inflação, greves de caminhoneiros e petroleiros, agro, China comprando carne), mídia e redes (boatos, influenciadores, plataformas), STF/TSE/Congresso (CPMI, reforma tributária, passaporte, delação), igrejas, PMs e Forças Armadas, governadores, reação internacional (EUA, China, Argentina, ONU, Mercosul), Amazônia, desastres naturais (enchentes, seca, queimadas) e a guerra (deserções, sabotagem, espionagem, drones, mercenários, voluntários, refugiados, pânico ou euforia conforme o mapa). Alguns dependem de focos concluídos, da facção ou do estado da guerra. Alguns têm **desdobramentos**: a escolha marcada com "Pode ter desdobramentos" agenda um segundo evento para meses depois. No máximo um evento sorteado por turno.
- **Mapa interativo** dos 27 estados.
- **Exércitos e combate visual:** exércitos com nome, força, moral (organização), experiência e general fictício aparecem no mapa como contadores no estilo OTAN. Você dá **uma ordem por exército por mês** (atacar, defender, mover, recuar, reforçar) **sem gastar AP**: toque no exército, depois no estado vizinho, confira a previsão e confirme. O mapa mostra setas animadas (suas ordens e as intenções inimigas conhecidas), linhas de frente e estados em batalha pulsando. No **Encerrar mês** há uma resolução animada (pode pular) e uma **tela de batalha** com rodadas, moral, general e modificadores (terreno, apoio local, suprimentos, armas estrangeiras).
- **Relatório pós-batalha:** toda batalha (na tela de batalha e na lista da resolução do mês) mostra **por que e como** você venceu ou perdeu: tabela fator por fator (tropas, moral, experiência, terreno, posições, apoio, comando, suprimentos, armas, defensor, sorte nas rolagens) com o valor de cada lado e quem foi favorecido, barra de poder, baixas, uma frase-resumo ("Você perdeu principalmente porque o inimigo tinha 2,5× mais tropas…") e dicas do que fazer melhor. As batalhas do mês ficam na aba **História** (e as anteriores em "Batalhas anteriores", até 30) e no painel do mapa.
- **Árvore de decisões nacionais** (focos no estilo HoI4), só no cenário de 2022.
- **Finais múltiplos.**
- **Tutorial contextual (coach marks):** em vez de um texto longo, pequenos balões aparecem na primeira vez que você abre cada aba ou recurso (painel do topo, História, Mapa, Exércitos, Decisões, Facções, Diplomacia, Ações), destacando o elemento e explicando cada variável. **Pular tutorial** está sempre visível; **? Ajuda → ↻ Refazer tutorial** recomeça do zero. O progresso fica no `localStorage` (`gw_tut_v3`).
- **Grandes eventos:** momentos decisivos (a posse do eleito, o 8 de janeiro, o golpe, o racha nas Forças, a guerra, a inelegibilidade) abrem uma tela cheia com manchete e a lista **"O que muda para você"** (exércitos desmobilizados e por quê, nova fase, renda, ritmo dos turnos, mapa, atributos).
- **Decisões navegáveis:** a árvore ocupa a largura da tela, com arrastar para mover, Ctrl+roda ou pinça para zoom, setas e +/− no teclado, botão **⛶ Tela cheia** e o detalhe do foco num painel lateral (gaveta inferior no celular).
- **Facções explicadas:** o que cada nível de lealdade faz (Leal ≥65, Neutra ≥35, Insatisfeita ≥15, Em crise <15), os bônus e penalidades de **Agradar** e **Enfraquecer** e o que acontece com cada facção.
- **Mapa de agitação:** seletor de camada (Controle/Agitação) com legenda em gradiente e explicação; paleta **viridis** (legível para daltônicos) e o valor de cada estado escrito no mapa.
- **Ações escalam com o apoio (2022):** 3 ações por turno; **4 com Apoio Popular ≥ 60** e **5 com ≥ 75** (calculado no início do turno). O topo mostra de onde vem cada ação (base · apoio · comprada) e o "i" abre a explicação completa.
- **Recursos políticos rebalanceados (2022):** teto de **80** (o que passar disso se perde no Encerrar turno, com aviso antes); **Facções** passam a custar só Recursos (Agradar 8, Enfraquecer 6, sem gastar ações); **Converter 12 Recursos → +1 ação** uma vez por turno (aba Ações). A tela "Como funcionam ações e Recursos?" mostra renda por fonte, teto e onde gastar.
- **Mapa de guerra refeito:** mapa maior (e botão **⊕ Ampliar mapa**), fichas de exército maiores com a **força em número e barra**, símbolo OTAN (retângulo = seu, losango = inimigo) e marca dourada quando já tem ordem; frentes de batalha com contorno escuro (visíveis sobre qualquer cor) e legenda militar embaixo do mapa. Fluxo em 3 passos: **1. selecionar** o exército → **2. destino** (seta de prévia tracejada) → **3. previsão** (chance, barra de poder, principais modificadores, o que acontece se vencer/perder, manobras restantes) com **Confirmar**, **Comparação completa** e **Cancelar** (Esc). Tocar de novo no mesmo estado confirma.
- **⚙ Configurações** (botão no topo; ficam salvas no navegador): **idioma** Português (Brasil) / English; **modo daltônico** (cada facção ganha uma textura além da cor, no mapa e na legenda); **alto contraste**; **tamanho da letra** (100%, 115% ou 130%); **reduzir animações**; **música** e **efeitos** com volume separado, além do botão 🔊 (tecla **M**) para silenciar.
- **Acessibilidade:** link "Pular para o conteúdo", navegação por teclado (Tab; **Enter/Espaço** num estado ou num exército do mapa equivale ao clique; **←/→** troca de aba; **Esc** fecha a prévia), avisos para leitores de tela (região `aria-live`) e o botão **📝 Descrição do mapa**, que descreve em texto quem controla cada estado, a agitação e os exércitos.
- **Trilha sonora e efeitos:** música gerada no navegador com Web Audio (sem arquivos), com três climas: calmo, tenso e guerra, conforme a fase. Há efeitos para clique, ordem, fim de turno, batalha, vitória e derrota, e um alerta nos grandes eventos. O som começa no primeiro clique, como os navegadores exigem.

## Como jogar
Jogue online em **https://hugodev88.github.io/greenwar/** ou abra o arquivo `index.html` no navegador (Chrome, Edge, Firefox ou o navegador do celular). Não precisa instalar nada, ter internet nem criar conta: o progresso fica salvo no `localStorage` do navegador.

Com uma conta (botão **👤 Entrar**, opcional), os saves e os finais também vão para a nuvem e você ganha um perfil público. Veja [Contas e saves na nuvem](#contas-e-saves-na-nuvem-supabase). Aberto como arquivo local (`file://`), o jogo roda sem a parte de contas.

Se preferir um servidor local:
```bash
npx serve .        # ou: python3 -m http.server 8000
```

### Exércitos e ordens
- **Selecionar:** toque numa ficha azul (seu exército; o número é a força total no estado e o selo "×n" indica vários exércitos — toque de novo para alternar). Os estados alcançáveis ficam destacados: borda vermelha = atacar, azul = mover/recuar. Ao escolher um, aparece a **previsão** e o botão **Confirmar ordem**.
- **Ordens:** uma por exército por mês. Atacar, mover e recuar são **manobras**, limitadas pelo atributo militar e pela lealdade militar (o chip "Ordens x/y" no mapa). Defender é grátis; reforçar custa 3 recursos (+10 de força). Nada disso gasta AP.
- **Recrutar tropas:** botão azul **＋ Recrutar tropas** no painel do mapa (ou **no estado selecionado**, se for seu): exército novo com 20 de força por 8 recursos, até **2 por mês**. Se não der, o botão explica o motivo (recursos, limite do mês, limite de 8 exércitos, eventos pendentes).
- **Alistamento (guerra):** todo mês chegam voluntários (3–12 de força, conforme seus estados e o apoio popular) que reforçam sozinhos exércitos fracos parados no seu território; o excedente acumula e forma um exército novo na capital. A manutenção das tropas ficou mais barata (0,3 por 10 de força).
- **Paz:** em tempo de paz os exércitos só se reposicionam entre estados seus.
- **Batalhas:** toque num estado em disputa (ou em "Ver batalha") para abrir a tela de combate; sem batalha no mês, ela mostra as forças e uma previsão.
- **Saves antigos** (versão 2) são migrados automaticamente: as tropas viram exércitos.

### Meus exércitos (novo, fase 4)
- Na aba **Mapa**, o painel **Meus exércitos** lista todos os seus exércitos, cada um com o status da ordem ("sem ordem", "⚔ atacar MG", "🛡 defender"…) e quatro botões grandes: **⚔ Atacar** (já escolhe o melhor alvo e mostra a previsão; clique de novo para confirmar), **➜ Mover** (destaca os destinos em azul; se só há um, já fica pronto), **🛡 Defender** (grátis) e **＋ Reforçar** (3 Recursos).
- **↶ Desfazer ordem** em cada exército, **Desfazer todas**, o contador de **manobras restantes** e quantos exércitos estão sem ordem.
- **Ordens automáticas:** "Defender fronteiras" (todo mundo defende) ou "Ordens automáticas" (ataca onde a chance é boa, defende o resto), e a opção de repetir isso sozinho todo mês.
- No painel de um estado inimigo aparece **"Atacar com…"** com a chance de cada exército.

### Tensão no Sul (novo, fase 4)
- No regime de exceção aparece a barra **🌾 Tensão no Sul** (0–100). Ela mostra o ritmo por mês e em quantos meses a Liga do Sul se rebela. Clique nela para ver os motivos e as ações.
- **Baixa a tensão:** ações da categoria **Sul** (aba Ações), investir/negociar com o governador em RS/SC/PR, deixar exércitos no Sul, agradar o agronegócio. **Sobe:** o golpe, o racha nas Forças, agitação alta no Sul, Apoio Militar baixo.
- Em 60+ os governadores pedem uma **Cúpula**; com a tensão em 25 ou menos dá para assinar o **Pacto Federativo**: o Sul vira **aliado** e manda uma divisão.
- Se chegar a 100, a revolta começa **pequena** (só RS, exército de 15). Santa Catarina só adere se a tensão ficar acima de 85 por 2 meses. Baixar para 45 ou menos traz um **armistício**.

### Dificuldade e duração (novo, fase 5)
- Ao clicar em **Nova campanha** abre uma janela com a **dificuldade** e a **duração**. A escolha aparece no topo (selo ao lado da data) e em **⚙ Configurações → Campanha atual**, e não muda no meio da campanha.
- **🌱 Fácil** (para quem não joga estratégia): inimigo 40% mais fraco, Tensão no Sul subindo bem mais devagar, +15 Recursos no início e +2 por mês, atributos iniciais um pouco maiores e uma pequena folga nos testes da história. Inclui o **modo simples**: os exércitos lutam sozinhos (ordens automáticas ligadas; o comando manual fica em "Comandar manualmente"), a conversão de Recursos fica escondida, Diplomacia e Facções vão para o botão **Mais ▾**, e as escolhas da história que encerram a campanha avisam antes se dão vitória, derrota ou um final intermediário. O modo simples pode ser desligado em Configurações.
- **⚖️ Normal:** o jogo original, sem nenhuma mudança.
- **🔥 Difícil:** inimigo 30% mais forte, −5 Recursos no início e −1 por mês, Sul 25% mais inquieto e testes da história um pouco mais exigentes.
- **Duração:** **Campanha completa** ou **Partida rápida** (≈ 8 a 11 turnos, 20–30 minutos). Na rápida, depois de março de 2023 cada turno vale 6 meses (12 a partir de março de 2024), o racha militar e a guerra chegam antes, e a vitória militar do regime pede 21 estados e Apoio Militar 50 (em vez de 24 e 55).
- Saves antigos continuam abrindo: viram Normal, campanha completa.

### Conselheira (novo, fase 5)
- **Marta Siqueira, chefe de gabinete** (personagem fictícia), aparece num cartão acima das abas com **1 ou 2 dicas por mês** em linguagem simples, cada uma com o botão **Fazer isso**: responder um evento pendente, agradar uma facção quase em crise, subir um atributo perigosamente baixo, acalmar o Sul, ligar as ordens automáticas, recrutar quando o inimigo é bem mais forte, gastar Recursos perto do teto, começar uma decisão nacional ou usar as ações que sobraram. Sem nada urgente, ela sugere encerrar o mês.
- Ela nunca empurra para a ruptura: fora do regime, os focos do ramo "Ruptura" não são sugeridos.
- O **×** esconde as dicas até o próximo mês. Em **⚙ Configurações → Conselheira**: Automática (ligada no Fácil e no Normal, desligada no Difícil), Sempre ligada ou Desligada.

### Tela de final e conquistas (novo, fase 5)
- Ao chegar num final, a tela mostra a **nota (S, A, B ou C)**, um resumo em texto da sua campanha (duração, território, ações, ponto forte e fraco), os **momentos marcantes** (suas escolhas na história), as **conquistas** e o **mapa final**. "Como a nota foi calculada" abre a conta.
- **Nota:** tipo de final (vitória 52, intermediário 34, derrota 14) + 30% da média dos atributos + território (sem guerra, 6 pontos fixos) + decisões nacionais (até 5) + paz com o Sul (4) + dificuldade (Fácil −4, Difícil +4). S a partir de 85, A de 70, B de 50. Derrota fica no máximo em B, intermediário no máximo em A, vitória no mínimo em B. Os números ficam em `js/data/conquistas.js`.
- **13 conquistas** (primeira campanha, vitória, nota S, vencer no Difícil, partida rápida, pelas urnas, sem batalhas, pacto com o Sul, veterano, planejador, boa equipe com a conselheira, 5 finais, todos os finais). Ficam no aparelho (`gw_conquistas_v1`) e, com login, na nuvem.
- Botões: **Jogar de novo** (mesma dificuldade e duração), **Tentar outro final** (lista os finais que faltam, com uma dica de como chegar em cada um; campo `dica` dos finais em `historia.js`) e **Compartilhar** (menu de compartilhar do celular; no computador copia o texto, com o link do jogo).

## Contas e saves na nuvem (Supabase)
O login é **opcional**. Sem conta, offline ou se o Supabase estiver fora do ar, o jogo continua igual, com os saves no `localStorage`.

**O que existe:**
- cadastro e login por e-mail e senha, link mágico, "Esqueci a senha" e troca de senha;
- botão do Google pronto, mas escondido (`FEATURES.googleLogin` em `js/nuvem/config.js`);
- perfil com nome de exibição, `@usuário`, emblema (ícones embutidos ou iniciais, sem upload) e bio;
- estatísticas: campanhas iniciadas e finais desbloqueados por cenário;
- aba **Jogadores**, com o ranking por finais e os perfis públicos;
- saves na nuvem (um por cenário), enviados ao "Encerrar mês", ao chegar num final e ao começar uma campanha;
- ao entrar, o jogo junta os saves deste aparelho com os da nuvem. Se os dois forem diferentes, ele pergunta qual manter e mostra qual é o mais recente. Os finais e as conquistas são unidos nos dois sentidos (as conquistas ficam numa linha extra da tabela `saves`, com `scenario_id = "_conquistas"`; não precisa de migração).

**Arquivos:**
- `js/nuvem/config.js`: URL do projeto e a *publishable key* (pública por design; quem protege os dados é o RLS);
- `js/nuvem/cloud.js`: módulo carregado pelo `index.html`;
- `supabase/migrations/001_init.sql`: tabelas, RLS e gatilhos.

### Configurar o projeto Supabase (uma vez)
1. **Rodar o SQL:** no painel do Supabase, abra **SQL Editor → New query**, cole todo o [`supabase/migrations/001_init.sql`](supabase/migrations/001_init.sql) e clique em **Run**. Pode rodar de novo sem problema (o script é idempotente). Ele cria `profiles` e `saves`, as políticas RLS, o gatilho que cria o perfil no cadastro e o perfil das contas que já existirem.
2. **URLs de redirecionamento:** em **Authentication → URL Configuration**:
   - em **Site URL**, coloque `https://hugodev88.github.io/greenwar/`;
   - em **Redirect URLs**, adicione `https://hugodev88.github.io/greenwar/` (e, para testes locais, `http://localhost:8000/`).

   Os links de confirmação, o link mágico e a recuperação de senha voltam para esse endereço.
3. **Opcional, para testar mais rápido:** em **Authentication → Sign In / Providers → Email**, desligue **Confirm email**. Assim a conta entra direto, sem o e-mail de confirmação. Religue antes de divulgar o jogo.
4. **Opcional, Google:** ative o provedor em **Authentication → Sign In / Providers → Google** (precisa de um Client ID/Secret do Google Cloud) e mude `googleLogin: true` em `js/nuvem/config.js`.

**Qual chave vai no `js/nuvem/config.js`?** A **Publishable key** (`sb_publishable_…`), em **Project Settings → API Keys**. A antiga chave "anon public" também funciona. **Nunca** use a *secret key* (`sb_secret_…`), a `service_role` nem a senha do banco no front-end.

O e-mail padrão do Supabase tem limite baixo de envios por hora. Para muitos jogadores, configure um SMTP próprio em **Authentication → Emails → SMTP Settings**.

Para testar localmente com contas, sirva a pasta por HTTP (`python3 -m http.server 8000`) em vez de abrir o arquivo direto.

## Validação e simulação (Node.js 18 ou mais novo)
```bash
node tests/check.js          # valida história, mapa, campanha e árvore de decisões, e roda a simulação (150 partidas por IA)
node tests/check.js 300      # igual, com 300 partidas por IA
node tests/sim.js 300        # só a simulação de campanhas, com distribuição de finais por IA
node tests/sim.js 300 brasil2022   # só um cenário
node tests/sim.js 40 brasil1964    # cenário bloqueado: só roda se pedido pelo id
node tests/sim.js 300 brasil2022 --dif=facil      # dificuldade Fácil (também: --dif=dificil)
node tests/sim.js 300 brasil2022 --rapida         # partida rápida (combina com --dif)
node tests/sim.js 300 brasil2022 --conselheira    # acrescenta as IAs "iniciante" e "conselheira" (que só segue as dicas)
node tests/sim.js 300 --notas                     # mostra a distribuição da nota final e das conquistas por IA (automático com --dif/--rapida)
```
Com `--dif` ou `--rapida` o sim imprime também a linha **resultado** (vitória / intermediário / derrota, pelo campo `outcome` dos finais) e, no Fácil, roda a IA **iniciante** (aleatória que lê os avisos de derrota do modo simples). O `tests/check.js` roda esses modos com 80 partidas e falha se o Fácil não vencer bem mais que o Difícil.
A simulação imprime uma linha **economia** por IA (AP médio, Recursos médio, pico, turnos com 60+, saldo final, ações de facção, conversões) e falha se os Recursos passarem do teto.
O `tests/check.js` também valida os dados do 1964 (bloqueado) e roda um teste curto de integridade dele (40 partidas por IA), para o cenário não quebrar enquanto o motor muda. Esse teste não entra no balanceamento.
`tests/check.js` termina com código 1 se houver qualquer problema. **Rode depois de qualquer mudança na história, nos eventos ou na árvore.**

`tools/build-map.js` gera a geometria simplificada dos estados (`tools/brazil-map.json`, copiada para `js/data/mapa-brasil.js`) a partir de um GeoJSON do IBGE. O GeoJSON tem 3,3 MB e não está no repositório. Para regerar o mapa, baixe `brazil-states.geojson` do projeto codeforamerica/click_that_hood, salve como `tools/brazil-states.geojson.json` e rode `node tools/build-map.js`.

## Hospedar de graça
O jogo é um site estático, então qualquer hospedagem estática serve:
- **GitHub Pages:** no repositório, abra *Settings → Pages → Deploy from a branch*, escolha `main` e a pasta `/ (root)`. O endereço fica `https://hugodev88.github.io/greenwar/`.
- **Netlify:** use *Add new site → Import from Git*, escolha este repositório e deixe o comando de build vazio, com a pasta de publicação `.`. Também dá para arrastar a pasta em app.netlify.com/drop.
- **Cloudflare Pages:** use *Create → Pages → Connect to Git*, sem framework, sem comando de build, com a pasta de saída `/`.

## Estrutura do projeto
Site estático, **sem etapa de build**: o GitHub Pages publica os arquivos como estão. O `index.html` só tem a marcação e carrega os estilos e os scripts em ordem. Os scripts são clássicos e dividem o mesmo escopo global, então a ordem das tags importa.

```
index.html              marcação + lista de <link>/<script> (a ordem importa)
css/                    estilos por área: base, menu, mapa, campanha, mapa-guerra, batalha, paineis,
                        decisoes, tutorial, ajuda, grandes-eventos, faccoes, acessibilidade, sul, exercitos…
js/
  data/                 DADOS PUROS (o que mais se edita)
    ajudantes.js          act() e ev(), atalhos para escrever ações e eventos
    2022/                 historia.js · acoes.js · eventos.js · campanha.js (facções, atores, fases, Sul) · focos.js
    1964/                 historia.js · campanha.js (cenário BLOQUEADO, não editar)
    cenarios.js           lista do menu (SCENARIOS)
    estados.js            fronteiras (ADJ) e terreno das UFs
    mapa-brasil.js        geometria dos 27 estados (gerada por tools/build-map.js)
    modos.js · conquistas.js  dificuldades e conquistas/nota final (fase 5)
  core/                 REGRAS do jogo, sem tela: estado, efeitos, história, eventos, ações, economia,
                        facções, diplomacia, focos, turno, sul, exércitos, combate, inimigo, ordens, saves,
                        modos, conselheiro, conquistas (nota e conquistas do final)
  ui/                   TELA: menu, jogo, abas (aba-*.js), mapa, exércitos, batalha, resolução, tutorial,
                        grandes-eventos, ajuda, economia, janelas, configurações, acessibilidade, modos, conselheiro,
                        conquistas, final (tela de final), iniciar.js (último)
  i18n/                 traducao.js (camada PT→EN) e en.js (dicionário)
  audio/                audio.js (trilha e efeitos gerados no navegador)
  nuvem/                cloud.js e config.js (contas e saves na nuvem, opcional)
tests/                  check.js (validação), sim.js (simulação), carregar.js (carrega o jogo no Node)
supabase/  tools/       SQL do banco · gerador do mapa
```
Cada arquivo começa com um comentário curto dizendo o que faz. Os testes leem a lista de `<script>` do `index.html`, então um arquivo novo entra no jogo e nos testes no mesmo lugar.

## Como atualizar o jogo (guia rápido)
Depois de qualquer mudança: `node tests/check.js` (tem que terminar com "OK" e "Simulação OK"). O check acusa ids repetidos, referências quebradas, arquivos fora do `index.html`, nomes globais repetidos e textos de ações/focos sem inglês (este último só como aviso).

**Novo evento** em `js/data/2022/eventos.js`, dentro da lista `EVENTOS_2022`:
```js
ev("e_greve_caminhoes", "Greve dos caminhoneiros", "Rodovias bloqueadas em vários estados.", [
  { text: "Negociar o preço do diesel.", fx: { money: -5, s: { apoio: 2 }, fac: { agro: 4 } } },
  { text: "Mandar a PRF liberar as estradas.", fx: { s: { apoio: -3, militar: 2 }, unrestAll: 5 } } ],
  { if: { phase: "oposicao" }, weight: 1, once: true }),
```
`if` usa as mesmas condições do resto do jogo (`phase`, `min`, `max`, `flags`, `fac`…). `once: true` faz o evento sair uma vez só, e `cooldown: 6` faz ele esperar 6 meses para voltar.

**Nova ação** em `js/data/2022/acoes.js` (a categoria escolhe o grupo na aba Ações: `dip`, `eco`, `mil`, `pol`, `sul`):
```js
act("e_feira_agro", "eco", "Visitar a feira do agro", "Fotos com produtores; mercado gosta.", { ap: 1, cost: 2, fx: { fac: { agro: 6 }, money: 3 } }),
```

**Novo foco** (árvore de Decisões) em `js/data/2022/focos.js`, dentro de `nodes`:
```js
{ id: "s_feira", name: "Circuito das feiras", branch: "soc", x: 17, y: 4, months: 2, req: ["s_igrejas"],
  desc: "Agenda pelo interior.", fx: { s: { apoio: 3 }, fac: { agro: 5 } } },
```
`x`/`y` são a posição na árvore, `req` são os pré-requisitos e `excl` os focos exclusivos. Ao concluir, o foco liga a flag `fo_<id>`, que pode liberar ações ou eventos (`show: { flags: ["fo_s_feira"] }`).

**Nova facção** em `js/data/2022/campanha.js`, em `factions`:
```js
{ id: "policias", name: "Polícias estaduais", short: "Polícias", desc: "Pesam na ordem pública.", loyalty: 50, influence: 40, links: { militar: 0.5 } },
```
Toda facção precisa de um **evento de crise** (sai quando a lealdade dela despenca). Ponha em `eventos.js`:
```js
ev("cr_policias", "Motim nas polícias", "Batalhões cruzam os braços.", [
  { text: "Dar o reajuste.", fx: { money: -6, fac: { policias: 10 } } },
  { text: "Endurecer.", fx: { s: { apoio: -2 }, fac: { policias: -5 } } } ], { crisisOf: "policias" }),
```
Depois disso ela já pode aparecer nos efeitos (`fac: { policias: 5 }`). O check avisa se faltar o evento de crise ou se algum efeito citar uma facção que não existe.

**Texto traduzido** em `js/i18n/en.js`: acrescente `"Texto em português": "English text",` dentro de `"exact"`. Para frases com números, use `"tpl"` com `{0}`, `{1}`: `"Faltam {0} meses": "{0} months left"`. O que não tiver tradução aparece em português.

**Mudou o formato do save?** Suba `SAVE_VERSION` em `js/core/base.js` e escreva a migração em `js/core/saves.js`, para os saves antigos (locais e da nuvem) continuarem abrindo.

**Ajustar a dificuldade** em `js/data/modos.js` (`DIFICULDADES`): `inimigo` e `sul` são multiplicadores, `dinheiro`/`renda` somam Recursos, `status` soma pontos nos atributos iniciais, `folga` afrouxa (ou aperta) os testes da história, `simples` liga o modo simples. A **partida rápida** fica em `js/data/2022/campanha.js`, no bloco `rapida` (ritmo dos turnos, atrasos dos eventos-chave e condições de vitória). O Normal nunca é afetado. Depois, rode `node tests/sim.js 300 brasil2022 --dif=facil` para ver as taxas de vitória.

**Arquivo novo** (por exemplo `js/ui/aba-nova.js` ou `css/nova.css`): crie o arquivo com um comentário de topo e acrescente a tag no `index.html`, no grupo certo. Dados entram antes do núcleo, e o núcleo antes da tela.

## Para quem vai desenvolver
Leia o [`CONTEXTO.md`](CONTEXTO.md): arquitetura, regras de conteúdo, a camada de nuvem e os próximos passos.
