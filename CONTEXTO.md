# CONTEXTO — guia de design e arquitetura (para assistentes de IA e devs)

Documentação de design e arquitetura do projeto. **Leia até o fim antes de alterar história, árvore ou saves.**

## 1. O que é
"Greenwar / Crônicas da Separação": jogo de estratégia narrativa sobre o Brasil, em **português**, inspirado em Hearts of Iron (HoI4). Hoje só o cenário de **2022** é jogável (o de 1964 aparece bloqueado no menu). O jogador toma decisões na história e administra uma campanha mês a mês, com um mapa dos 27 estados mostrando quem controla cada um.

É um site estático em HTML + CSS + JS puro, **sem dependências e sem build**: o `index.html` carrega arquivos de `css/` e `js/` (veja a seção 4). Funciona offline e salva no `localStorage`.

## 2. Cenários
| id | Ano | Título | Personagem / premissa | Fases da campanha |
|---|---|---|---|---|
| `brasil1964` | 1964 | Os Anos Decisivos — **BLOQUEADO** (`locked: true`) | A crise de 1964 e suas alternativas | governo, crise, guerra civil |
| `brasil2022` | 2022 | A Faixa Presidencial | Bolsonaro depois de perder a eleição: aceitar, contestar ou tentar uma ruptura | `governo` (out–dez/2022), `oposicao` (após a posse), `regime` (após um golpe bem-sucedido, com guerra civil) |

**O foco atual do desenvolvimento é o cenário de 2022, o único jogável.**

- **1924 ("Aurora do Sul", id `itavera`) foi removido** (dados, história, campanha, ganchos exclusivos do motor como `C.home`/`homeBonus`, `enemyQuality`, `low/highShare`, `army.enemyStart`). Está no histórico do git (antes do commit que o removeu). Saves antigos dele (`aurora_do_sul_*`) ficam intocados no localStorage e são simplesmente ignorados; linhas da nuvem com `scenario_id = 'itavera'` também são ignoradas (nada é apagado no banco).
- **1964 está bloqueado:** a entrada em `SCENARIOS` tem `locked: true`. `playable(sc)` (fora do CORE) exige `!soon && !locked && story && campaign`; `setScenario` recusa ids não jogáveis (devolve `false`), o menu mostra o card cinza "🔒 Em breve" sem clique nem "Continuar" e sem ler o save local, e `GWGame.scenarios()` só lista os jogáveis (então a nuvem não baixa, envia nem conta 1964). Não há parâmetros de URL, e `jogo_br_ultimo_cenario` não é reaberto sozinho. **Para liberar 1964 basta tirar `locked: true`** (e rodar `node sim.js 300 brasil1964` para rebalancear).
- `check.js` continua validando os dados do 1964 e roda 40 partidas por IA dele como teste de integridade (só falhas/exceções contam); `sim.js` pula cenários `locked` a menos que o id seja pedido.

Detalhes de 2022:
- Ritmo: 1 mês por turno até 2023-03, depois 3 meses por turno.
- A "Liga do Sul" (facção de mapa `separatista`, RS e SC) surge no nó `racha_militar` se houver ruptura.
- O golpe só dá certo com Apoio Militar alto (60/70) no nó `decreto`. Na maioria das vezes ele fracassa, e isso é intencional.
- Finais: retorno (eleição de 2026), herdeiro, oposição, ostracismo, exílio, golpe fracassado, restauração, divisão, regime.

## 3. Sistemas
- **Turnos e Pontos de Ação (PA):** cada turno tem PA (3 em 2022). Ações gastam PA e "Recursos". O botão "Encerrar mês" roda a economia, os eventos, o mapa, a árvore e a história agendada, e gera o **relatório do mês**.
- **Atributos** (`stats`) de 0 a 100. Em 2022: apoio, militar, internacional, base etc.
- **Facções internas** com lealdade (em 2022: militares, centrão, agro, igrejas/evangélicos, movimentos, STF/judiciário…). Cada facção tem rivais, links com atributos e um evento de crise quando a lealdade cai.
- **Diplomacia:** atores estrangeiros (EUA, China, Rússia, UE, Argentina, vizinhos, ONU) com opinião, interesses e o que podem dar.
  - Você monta um acordo (pedidos × ofertas) e `dealScore` calcula a aceitação.
  - Cada fase pode ter as próprias ofertas e pedidos (`phase.diplo`).
- **Eventos aleatórios:** os da campanha (`C.events`) e os genéricos (`GENERIC_EVENTS`), com condições (`if`), peso e escolhas.
  - `ev(id, título, texto|[textos], escolhas, { if, weight, once, cooldown, crisisOf, chained })`. Em 2022: 69 eventos (56 sorteáveis, 4 desdobramentos, 9 crises de facção). Os 46 de out/2026 têm id `n_*`.
  - **Desdobramentos (encadeados):** uma escolha com `fx.chain: { id, in: meses }` (ou uma lista) grava `{ id, due }` em `g.chains`. O evento alvo tem `chained: true`, nunca é sorteado (`pickRandomEvent` o ignora) e aparece com o rótulo "Desdobramento" quando `due` chega e o `if` dele vale. Se não couber em 6 meses depois do prazo, ele se perde.
  - **Prioridade no Encerrar mês:** história > crise de facção > dependência > desdobramento vencido > sorteio. No máximo 1 evento sorteado/desdobramento por turno.
  - **Chance de sorteio:** `C.eventChance` (padrão 0,45; 2022 usa 0,5). Com `C.eventPaceBoost` (só 2022), turnos de 3 meses usam `1 − (1 − chance)²` (0,75), para a fase de oposição não ficar sem eventos.
  - **Chaves de efeito de evento:** `EVENT_FX_KEYS` = `FOCUS_FX_KEYS` + `front` (avança/recua o progresso das UFs em disputa, ±), `org` (moral dos seus exércitos), `enemyLoss` (tira força dos maiores exércitos inimigos), `chain`. O `fxSummary` mostra "Frentes", "Moral dos seus exércitos", "Força inimiga" e "Pode ter desdobramentos".
- **Mapa interativo:** controle por UF e agitação (`unrest`), ações por estado e estados disputados. Os modos de visualização são controle e agitação. Camadas militares: frentes, setas, contadores de exército e pulsos de batalha.
- **Exércitos (sistema militar, desde a v3 do save):** veja a seção 3.1. A guerra **não usa PA**.
- **Árvore de decisões nacionais** (só 2022, estilo foco nacional do HoI4): veja a seção 5.
- **Finais:** por nós `ending` da história ou por `C.checks`, que são condições do estado da campanha.

### 3.1 Sistema militar (exércitos, ordens, batalhas)
Fica no fim do CORE (procure `const ADJ`). Compartilhado pelos cenários (2022 e o 1964 bloqueado); os dados de cada um ficam em `CAMPAIGN_X.army` (nomes e generais fictícios por lado, exércitos iniciais, `recruitCost`, `reinforceCost`). Uma fase com `noArmies: true` (2022 `oposicao`) não dá comando de tropas.
- **Dados:** `g.armies = [{ id, side: "player"|"enemy", fac, uf, name, gen, str, org, xp, order }]`; `g.enemyPlans` (intenções do mês, planejadas por `planEnemy` antes do jogador agir); `g.mil` (registro do último mês: `control0`, `start`, `orders`, `moves`, `battles`, `flips` — usado pela animação); `g.armsAid` (bônus temporário de armas estrangeiras).
- **Geografia:** `ADJ` (adjacência das 27 UFs, simétrica, validada contra a geometria do mapa em `check.js`) e `TERRAIN`/`TERRAIN_TYPES` (selva, metrópole, serras, sertão… dão bônus de defesa).
- **Escala:** `STR_UNIT = 10` (1 "unidade" antiga = 10 de força), `ARMY_MAX = 60`, `ARMY_CAP` 8 por lado. A antiga `reserve`/`u.force` não existe mais; o efeito `reserve: n` em `applyFx` vira `addPlayerStrength(g, n*10)` (reforça exércitos ou cria um novo).
- **Recrutamento:** `recruitState(g, uf)` diz se dá para recrutar e por quê (texto em PT); `recruitArmy(g, uf)` cria um exército de `RECRUIT_STR = 20` (moral até 55, xp 5) por `recruitCost` (8), até `RECRUIT_PER_MONTH = 2` por mês (`g.used._recruit` é um contador; `recruitsLeft(g)`). `reinforceCost` = 3. Manutenção `C.army.upkeep` = 0,3 por 10 de força.
- **Alistamento:** `mobilization(g)` = 3 + 0,35 × estados seus + (apoio − 50)/10, entre 2 e 12. `playerMobilize(g, R)` (no `endTurn`, depois de `enemyReinforce`) dá até +6 a cada exército seu parado em território seu, com força < 45 e que não lutou no mês; o resto vai para `g.mobPool` (máx. 30), que ao chegar a 15 vira um exército novo na capital.
- **Relatório de batalha:** `fight()` guarda `rec.pow` (poder inicial), `rec.powEnd`, `rec.luck` (multiplicador médio de dano por sorte) e `rec.broke`. `battleReport(rec)` (puro, CORE) devolve `{pi, won, forecast, rows, summary, how, tips, loss, power}`; funciona para previsões e para recs antigos. `logBattles` guarda as últimas 30 batalhas em `g.battleLog`. UI: `battleReportHTML` (seção `.brep` em `openBattle`), `resolBtn` (lista da resolução), `battleRowsHTML` (aba História e painel do mapa), `recruitBoxHTML` (caixa "Recrutar tropas" em `overviewPanel`/`ufPanel`).
- **Ordens do jogador:** `setOrder(g, id, type, to)`, `armyTargets(g, a)`, `recruitArmy(g, uf)`, `commandLimit(g)` (1–5, pelo atributo militar e lealdade da facção militar), `ordersUsed(g)`. Atacar/mover/recuar contam no limite; defender e reforçar não.
- **Milícias:** cada estado tem uma força local implícita (`militia`): polícia/milícias leais nos seus estados, voluntários nos disputados (dependem do apoio popular e da simpatia), guarnição inimiga (`u.enemy * 5`).
- **Combate:** `fight()` faz até 5 rodadas; o poder é força × moral × experiência × modificadores (`milMods`: terreno, posições preparadas, apoio local, comando/lealdade, suprimentos, armas estrangeiras, qualidade/mobilização inimiga, sanções). Quem perde a moral (< 20) recua. O registro (`rec`) guarda as rodadas para a tela de batalha.
- **Mês militar (`militaryMonth`):** movimentos → ataques (alternando lados, por peso econômico) → frentes dos estados em disputa (`resolveFront`) → recuperação de moral e limpeza. Ataques do jogador contra estado inimigo podem conquistá-lo com vitória ampla; senão o estado entra em disputa. **O inimigo só abre frentes** (não toma estados seus direto); a frente vai de −100 a +100.
- **IA inimiga (`planEnemy`):** ataca estados fracos ou em disputa (razão de forças ≥ 1,15–1,35), defende capitais ameaçadas e se reforça (`enemyReinforce`); trégua impede ataques.
- **Integrações:** acordos de armas dão +20 de força e `armsAid`; lealdade militar afeta moral máxima e limite de comando; focos com `reserve` dão força; viradas de mapa da história passam por `syncMilitary` (exércitos em território que deixou de ser permitido são realocados).
- **UI (fora do CORE):** `militaryLayers`/`mapSVG` (frentes via `sharedBorder`, setas `arrowSVG`, contadores `counterSVG`), `tabMapa` (fluxo selecionar exército → alvo, painéis `armyPanel`/`overviewPanel`/`ufPanel`), `openBattle`/`openForecast` (tela de batalha), `playResolution` (animação pulável do Encerrar mês). Tudo em CSS/SVG, com `prefers-reduced-motion`.

## 4. Arquitetura (arquivos)
O `index.html` tem só a marcação e a lista de `<link>`/`<script>`. **Os scripts são clássicos (não são módulos) e dividem o mesmo escopo global**, como se fossem um só arquivo. Por isso **a ordem das tags no `index.html` importa**: dados → núcleo → idioma/som → tela → `js/ui/iniciar.js` (sempre por último). O único módulo é `js/nuvem/cloud.js`, que importa `./config.js`.

| Pasta | Conteúdo |
|---|---|
| `css/` | Estilos por área. A ordem dos `<link>` preserva a cascata original; o mobile fica junto de cada área (`@media max-width:700/860px`) |
| `js/data/` | **Só dados.** `ajudantes.js` (`act`, `ev`), `2022/` (`historia.js` = `STORY_2022`, `acoes.js` = `ACOES_2022`, `eventos.js` = `EVENTOS_2022`, `campanha.js` = `CAMPAIGN_2022`, `focos.js` = `CAMPAIGN_2022.focus`), `1964/` (bloqueado), `cenarios.js` (`SCENARIOS`), `estados.js` (`ADJ`, `TERRAIN`, `TERRAIN_TYPES`), `mapa-brasil.js` (`MAP_DATA`, gerado por `tools/build-map.js`) |
| `js/core/` | **Lógica pura, sem DOM** (roda no Node): `base` (`SAVE_VERSION`, `rnd`, chaves de efeito), `estado` (`newCampaign`), `efeitos` (`cond`, `applyFx`), `historia`, `eventos`, `acoes`, `economia`, `faccoes`, `diplomacia` (`dealScore`), `focos`, `turno` (`endTurn`), `sul`, `ordens-automaticas`, `exercitos`, `combate`, `inimigo`, `ordens`, `saves` (`migrateSave` e afins) |
| `js/i18n/` | `traducao.js` (camada PT→EN que traduz o DOM) e `en.js` (`I18N_EN`, com `exact` e `tpl`) |
| `js/audio/` | `audio.js` (trilha e efeitos sintetizados) |
| `js/ui/` | Tela: `base` (`UI`, `esc`), `saves` (`save`, `loadInfo`, ponte `cloud()`), `menu`, `jogo` (HUD e abas), `aba-*.js` (uma por aba), `mapa`, `exercitos`, `batalha`, `resolucao`, `final`, `tutorial`, `grandes-eventos`, `ajuda`, `janelas`, `economia`, `configuracoes`, `acessibilidade`, `sul`, `iniciar` (liga tudo e expõe `window.GWGame`) |
| `js/nuvem/` | `cloud.js` e `config.js` (Supabase, opcional) |
| `tests/` | `carregar.js` lê as tags `<script>` do `index.html` e junta `js/data/` + `js/core/` para o Node; `check.js` e `sim.js` usam isso |

**Regras da organização:**
- Cada arquivo começa com um comentário curto em português dizendo o que faz.
- Arquivo novo: crie com comentário de topo e acrescente a tag no `index.html`, no grupo certo. O `tests/check.js` falha se um arquivo de `js/`/`css/` estiver fora do `index.html` (ou listado duas vezes), sem comentário de topo, ou se dois scripts declararem o mesmo nome global.
- `js/core/` não pode usar `document`/`window`: ele roda nos testes do Node.
- Os nomes de funções e campos ficaram em inglês, como antes, porque saves e nuvem dependem deles. Os nomes de arquivos e pastas são em português.
- Passo a passo para adicionar evento, ação, foco, facção, tradução ou arquivo: veja "Como atualizar o jogo" no README.

### Objetos principais
- **`SCENARIOS[i]`:** `{ id, year, date, title, tag, character, description, saveKey, endingsKey, intro, story: STORY_X, campaign: CAMPAIGN_X }`.
- **`STORY_X`:**
  - `stats` (atributos com `initial`), `factions` (as facções **do mapa**, com cor), `initialMap`, `defaultFaction`, `start`;
  - `nodes`: `{ chapter, title, text[], onEnter{map,resolve}, choices[{ text, effects, req, flag, map, next }] }`. `next` pode ser uma string ou uma lista `[{if, to}]`;
  - os finais têm `ending: true` e `endingName`.
- **`CAMPAIGN_X`:**
  - `start`, `ap`, `money`, `pace`, `storyAt` (data mínima de um nó) e `storyDelay` (meses após a escolha);
  - `phases` (com `player`/`enemy`/`war`/`diplo`), `checks`, `actors`, `factions`, `actions`, `events`, `enterFx`, `choiceFx`, `offerFac`;
  - em 2022 também `focus`.
- **Condições (`cond`):** `min`, `max`, `flags`, `noFlags`, `visited`, `visitedAny`, `notVisited`, `from`, `until`, `money`, `fac`, `actor`, `control`, `anyControl`, `recognized`, `phase`, `notPhase`, `war`, `sideCount`.
- **Efeitos (`applyFx`):** `s` (atributos), `money`, `reserve` (+10 de força militar por ponto), `fac`, `infl`, `unrest`, `unrestAll`, `unrestUF`, `act`, `actAll`, `enemy`, `flag`, `map`, `ap`, `ceasefire`, `malus {v, months}`.

### Saves e localStorage
- `SAVE_VERSION = 7` (em `js/core/base.js`; a migração fica em `js/core/saves.js` e é chamada por `loadInfo` em `js/ui/saves.js`) (7: `diff`, `quick` e `simple` — saves antigos viram Normal, campanha completa, interface normal; 6: Tensão no Sul e ordens automáticas; 5: `chains`, os desdobramentos agendados; 4: `battleLog` e `mobPool`; 3: exércitos). Saves v4 ganham `chains = []`. Saves v3 ganham `battleLog` (das batalhas do último mês) e `mobPool = 0`. Saves **v2** são migrados em `loadInfo` por `migrateSave` (CORE): `reserve` e `u.force` viram exércitos (10 de força por unidade), as forças inimigas ficam como guarnições/milícias, e aparece um aviso no menu (`milMigrated`). Saves de versão desconhecida ou formato antigo são arquivados em `<saveKey>_legacy`, e o jogador vê um aviso.
- Saves de 2022 sem `g.focus` (anteriores à árvore) são **migrados** em `loadInfo`: `focusInit` aplica as concessões da história já vividas e marca `focusMigrated`, e aparece um aviso no menu.
- **Se mudar o formato do save, aumente a versão ou escreva uma migração em `loadInfo`.**
- Chaves do localStorage:
  - `jogo_br_save_brasil1964` e `jogo_br_endings_brasil1964` (1964 bloqueado: mantidas, nunca lidas enquanto `locked`);
  - `aurora_do_sul_save_v1` e `aurora_do_sul_endings_v1` (1924 removido: chaves antigas ignoradas, não são apagadas);
  - `jogo_br_save_brasil2022` e `jogo_br_endings_brasil2022`;
  - `jogo_br_ultimo_cenario`;
  - `gw_settings_v1`: configurações (idioma, acessibilidade, som);
  - `gw_tut_v3`: progresso do tutorial contextual `{ off, seen: { hud, historia, mapa, exercitos, decisoes, faccoes, diplomacia, acoes } }` (a antiga `jogo_br_tutorial_v2` não é mais lida).
- Cada `save()` grava `G.savedAt = Date.now()`, usado para dizer qual save é mais recente na mesclagem com a nuvem.

### Camada de nuvem (Supabase): `js/nuvem/config.js`, `js/nuvem/cloud.js` e `supabase/migrations/001_init.sql`
- **Opcional e isolada.** `index.html` carrega `<script type="module" src="js/nuvem/cloud.js">` no fim. Se o módulo ou a biblioteca não carregarem (offline, `file://`, CDN bloqueada), nada quebra e os saves seguem no `localStorage`.
- **Biblioteca:** `cloud.js` importa `@supabase/supabase-js@2` (versão fixa) do jsDelivr, com o esm.sh como alternativa.
- **`config.js`:** `SUPABASE_URL`, `SUPABASE_KEY` (a *publishable key*, pública por design) e `FEATURES.googleLogin` (o botão do Google fica escondido até o provedor ser ativado). Nunca coloque ali a secret key ou a service_role.
- **Ponte jogo → nuvem:** em `js/ui/saves.js`, `cloud("syncSave", id)`, `cloud("syncEndings", id)`, `cloud("campaignStarted", id)` e `cloud("deleteSave", id)` chamam `window.GWCloud.*` se ele existir e não fazem nada se não existir. Os pontos de chamada:
  - `startNew` dispara `campaignStarted` e `syncSave`;
  - "Encerrar mês" e `renderEnding` disparam `syncSave`;
  - `addEnding`, quando o final é novo, dispara `syncEndings`;
  - "Recomeçar" dispara `deleteSave`.
- **Ponte nuvem → jogo:** `window.GWGame` expõe:
  - `scenarios()` (só os **jogáveis** — hoje 2022 —, com ids, chaves do localStorage e lista de finais);
  - `saveVersion`, `monthLabel`, `current()`;
  - `refresh(ids)`, que volta à tela de título ou ao menu se a nuvem trocou o save do cenário aberto.
- **Tabelas** (rodar o SQL no SQL Editor; o arquivo é idempotente):
  - `profiles(id → auth.users, username único ^[a-z0-9_]{3,20}$, display_name ≤40, avatar (id de emblema ou 'iniciais'), bio ≤280, campaigns_played, campaigns_by_scenario jsonb, endings jsonb {cenário: [ids]}, endings_count calculado por gatilho, created_at, updated_at)`;
  - `saves(user_id, scenario_id, slot 0–9, data jsonb, save_version, created_at, updated_at, PK(user_id, scenario_id, slot))`. Hoje o jogo usa só o `slot = 0`.
- **RLS:**
  - perfis: leitura pública (`anon` e `authenticated`); insert e update só do dono;
  - saves: leitura e escrita só do dono.
  - O gatilho `on_auth_user_created` (`handle_new_user`, security definer, que nunca bloqueia o cadastro) cria o perfil com o `username` e o `display_name` dos metadados do cadastro.
- **Mesclagem ao entrar** (uma vez por usuário por carregamento):
  - save só na nuvem, com o mesmo `save_version`: é baixado;
  - save só local: é enviado;
  - os dois diferentes: aparece um modal por cenário, com mês, turno, data e o selo "mais recente";
  - finais: união nos dois sentidos.
  - Saves da nuvem com `save_version` entre `GWGame.minSaveVersion` (2) e `SAVE_VERSION` (5) são aceitos; um v2/v3/v4 baixado é migrado pelo jogo ao abrir e reenviado como v5 no próximo save. Versões fora dessa faixa são ignoradas. Se `SAVE_VERSION` mudar, pense também nos saves da nuvem.
- **Cenários removidos/bloqueados na nuvem:** saves e finais de `itavera` (1924) e `brasil1964` continuam no banco (nada é apagado) e são ignorados. O perfil, as estatísticas e o ranking mostram totais **só dos cenários jogáveis** (`playTotals` em `cloud.js`, calculado de `endings`/`campaigns_by_scenario`); os campos `endings_count`/`campaigns_played` do banco ainda somam tudo, então o ranking busca os 300 primeiros por `endings_count` e reordena no cliente.
- **Sem tabelas:** se o SQL ainda não foi rodado, a API devolve `PGRST205`. Nesse caso `cloud.js` mantém o login, avisa no perfil que o servidor não foi configurado e não tenta sincronizar.

## 5. Árvore de decisões nacionais (2022)
Dados em `CAMPAIGN_2022.focus = { ap, cell, grants, branches, nodes }`. São 44 focos em 7 ramos, com 11 pares exclusivos.

- **Campos de um nó:** `id`, `name`, `branch`, `x`, `y` (posição na grade), `months`, `cost` (Recursos), `req` (todos), `reqAny` (pelo menos um), `excl` (mutuamente exclusivos, sempre simétricos), `avail` (condição para iniciar) e `availText`, `lockIf` (condição de história que bloqueia), `desc`, `fx`, `risk {p, msg, fx}`, `dipBonus`, `dipOff`, `dipReq`, `unlocks`.
- **Regras:**
  - Um foco ativo por vez, iniciado com 1 PA. O progresso avança em "Encerrar mês".
  - Ao concluir, aplica `fx` e a flag `fo_<id>`, e escreve no relatório.
  - As ações e eventos liberados usam `show: { flags: ["fo_<id>"] }` ou `if`.
  - Um foco ativo é interrompido só se ficar bloqueado, excluído ou perder a fase exigida.
- **Ramos:**
  - **Tronco:** `t_balanco` leva a uma escolha excludente entre `a_regras`, `b_contestar` e `c_ruptura`.
  - `democ`: liderança, partido, Centrão ⊘ oposição pura, herdeiro ⊘ candidato, campanha 2026.
  - `jurid`: auditoria, defesa, reforma ⊘ pacto, anistia.
  - `ruptura`:
    - antes do golpe: quartéis e minuta, com risco de dar errado;
    - no regime: exceção, interventores ⊘ eleições, comando, carta, mobilização, Nordeste, economia de guerra, Liga (esmagar ⊘ pacto), reconhecimento.
  - `econ`: agro, privatizações, commodities, China ⊘ EUA.
  - `diplo`: Ocidente ⊘ BRICS, Mercosul, rede regional.
  - `soc`: igrejas, segurança, redes ⊘ imprensa, costumes.
- **Travas:** o caminho democrático trava a ruptura e vice-versa, via `excl` e `lockIf`. `grants: { golpe_inicial: ["c_ruptura"] }` conclui a ruptura à força se a história der o golpe.

## 6. Validação (rode sempre)
- **`node tests/check.js [N]`:** valida links e nós alcançáveis da história, as referências de mapa, facções, atores, ações e eventos, e a árvore:
  - ids únicos e referências existentes;
  - `excl` simétrico, sem ciclos, raiz única;
  - todo foco alcançável por algum caminho;
  - chaves de efeito válidas e flags `fo_*` válidas;
  - sistema militar: `ADJ` simétrico, 27 UFs, conexo e conferido com a geometria do mapa; terreno completo; `C.army` de cada cenário; ações de recrutamento com `ap: 0`; migração de 50 saves v2, 30 saves v3 e 15 saves v4 sintéticos e um teste de `fight()` + `battleReport()`.
  - eventos: textos não vazios, escolhas sem repetição e ao menos uma sem requisito, chaves em `EVENT_FX_KEYS`, valores numéricos, flags exigidas que algum foco/história/efeito produz, `from ≤ until`, todo `chain` aponta para um evento `chained` e todo `chained` é disparado por alguém; teste de que `n_acampamentos` → `n_acampamentos_radical` aparece de fato (≥ 8/10 campanhas).
  - organização: todo arquivo de `js/` e `css/` listado uma vez no `index.html`, com comentário de topo, sem nomes globais repetidos entre scripts;
  - aviso (não falha) para nomes de ações/focos sem tradução em `js/i18n/en.js`;
  - Depois roda o `sim.js`.
- **`node tests/sim.js [N] [cenário]`:** partidas automáticas com as IAs aleatória, gulosa e radical, e a "golpista" (roteiro só de cobertura, em 2022). As IAs também dão ordens aos exércitos (`giveOrders`: aleatória ao acaso; gulosa recruta, reforça e ataca em grupo com razão de forças ≥ 1,2) e o sim confere invariantes do exército (ordens limpas, território permitido, limites). Mostra a distribuição de finais, os focos concluídos por partida e quais focos nunca são concluídos. Falha se algum final ou foco ficar inalcançável ou se o relatório de alguma batalha sair inválido (NaN, sem resumo/dica). Imprime `eventos/partida` (frequência e maior intervalo sem evento) e a cobertura de eventos; **falha se algum evento nunca aparecer**, exceto crises de facção e eventos presos a focos raros (`fo_*`), que só geram aviso. Nas partidas com guerra imprime a linha `guerra:` (meses, % de batalhas vencidas, % dos seus ataques vencidos, força máxima média, estados no início → fim da guerra, % de partidas em que ganhou território, finais).
- **Referência atual (300 partidas por IA, 2022, depois dos 46 eventos novos):**
  - aleatória: ostracismo 30%, oposição 22%, retorno 20%, exílio 9%, golpe fracassado 7%…; 6,6 eventos/partida (1 a cada 3,2 meses, maior intervalo 12);
  - gulosa: retorno 83%; 10,9 eventos/partida (1 a cada 3,8 meses, maior intervalo 18);
  - radical: golpe fracassado 55%; 5,0 eventos/partida (1 a cada 3,6 meses);
  - golpista: divisão 80%, restauração 12%, regime 7% (~35 batalhas por partida); guerra: 67% das batalhas vencidas (ataques 93%), força máx. média 252, estados 11,1 → 11,9, ganhou território em 56% das partidas; 5,2 eventos/partida (1 a cada 2,1 meses, maior intervalo 9).
  - Antes dos eventos novos: 1 evento a cada 4,0 (aleatória) / 5,5 (gulosa) / 5,1 (radical) / 2,3 (golpista) meses, com intervalos de até 21/38/27/9 meses; golpista divisão 82%, restauração 9%, regime 9%, batalhas vencidas 66%.
  - Antes do recrutamento facilitado (out/2026): golpista divisão 82%, restauração 13%, regime 5%; batalhas vencidas 62% (ataques 90%), força máx. 185, estados 11,1 → 10,4, ganhou território em 28%. Aleatória (14 partidas com guerra): batalhas vencidas 25% → 29%, estados no fim 4,5 → 7,8.

## 7. Regras de design (obrigatórias)
1. **UI e textos em português do Brasil.**
2. **Aviso de ficção** visível (menu e introdução). Não remova.
3. **Pessoas reais tratadas de forma neutra,** sem caricatura nem juízo editorial. **Nunca inventar citações** atribuídas a pessoas reais.
4. **Caminhos autoritários ou golpistas têm consequências sóbrias e pesadas** (isolamento, violência, colapso econômico, chance de fracasso), sem glorificação. O jogo não deve parecer um manual nem uma propaganda.
5. Mudou história, eventos ou árvore? **Rode `node tests/check.js`** e confira a distribuição de finais.
6. Não quebre saves: aumente `SAVE_VERSION` e migre em `js/core/saves.js`.
7. Mantenha `js/core/` testável em Node (sem `document`/`window`).
8. Mobile importa: teste em largura de ~400 px.

## 7b. Camada de UI da fase 1 (out/2026) — tudo fora do CORE
- **Tutorial contextual:** `tutSteps(ctx)` define os balões por contexto (`hud`, `historia`, `mapa`, `exercitos`, `decisoes`, `faccoes`, `diplomacia`, `acoes`); `tutAfterRender()` (chamado no fim de `renderGame`) abre o primeiro contexto ainda não visto e espera enquanto houver overlay aberto. `coachRun` posiciona anel + balão via `getBoundingClientRect`; Esc/←/→ funcionam. `tutSkipAll` e `tutReset` (botão em `openHelp`). Ao criar uma aba/recurso novo, **acrescente um contexto em `tutSteps`**.
- **Grandes eventos:** `MAJOR_NODES.brasil2022` (nós de história com manchete), `majorSnap()` antes da ação e `majorCheck(snap)` depois montam a lista de consequências por diferença de estado (fase, exércitos, guerra, renda, mapa, atributos). `showMajor` exibe a tela cheia. Usado em `#btnEnd` e nas escolhas da História. Não mexe no CORE nem no `sim.js`.
- **Decisões:** zoom em `UI.fz` (0,3–1,6), tela cheia em `UI.ffull`; arrastar com limiar de 5px (`dataset.dragged` evita clique acidental).
- **Agitação:** `unrestColor` usa a escala VIRIDIS; `unrestLabel(v)`; limiares exibidos 30/62/88 (62 = média que derruba apoio; 88 = revolta).

## 7c. Fase 2 (out/2026): economia e mapa de guerra
- **CORE (CAMPAIGN_2022):** `money.cap: 80`, `apScale: { stat: "apoio", tiers: [[60,1],[75,2]] }`, `facMoney: { agradar: 8, pressionar: 6 }`, `convert: { cost: 12, ap: 1 }`. Funções `apFor(g)` → `{ total, parts }` (base, apoio, fase), `apNextTier`, `moneyCap`, `applyMoneyCap`, `convertMoney` (usa `g.used.convert`, 1×/turno), `facCost(g, F, kind)`. `newCampaign` e `endTurn` gravam `g.ap` e `g.apParts` (a origem das ações no início do turno; saves antigos sem `apParts` usam `apFor` na hora). `endTurn` aplica o teto e registra no relatório. Sem mudança de formato que exija migração.
- **sim.js:** métricas `g.simEco` + linha "economia"; invariante "Recursos ≤ teto"; as IAs gastam em facções/conversão (guerra e golpista guardam 35 de reserva e só socorrem facções < 22).
- **UI:** `apSrcLine`, células `.ecocell` no topo, `ecoStrip` na aba Ações, `openEco(focus)` (modal `#ecoModal`). Facções mostram o custo em Recursos (`facCostTxt`).
- **Mapa de guerra:** `counterInner(side, str, n)` desenha a ficha (também nos fantasmas da resolução e na legenda `.milleg`); `CNT_K()` é a escala (1,2 no celular). Frentes = `path.frontcase` + `path.front`. Fluxo de ordem: `UI.pend = { army, to, type }` (validado a cada render), `orderForecast(a, to, type)` calcula a previsão com `battleOdds`/`milMods`, `forecastCardHTML` vira painel lateral (desktop) ou bloco sob o mapa (≤ 900px), `openAttackForecast` abre a tela de batalha em modo previsão com os atacantes. `UI.mapBig` = mapa ampliado. Esc cancela a prévia/seleção.

## 7d. Fase 3 (out/2026): configurações, acessibilidade, idioma e som (tudo na UI, sem mudar o CORE nem os saves)
- **Configurações:** `SET` no localStorage `gw_settings_v1` `{ lang:"pt"|"en", cb, hc, fs:100|115|130, motion, music:0–1, sfx:0–1, muted }`; `applySet()` aplica as classes `body.cb`/`body.hc`/`body.rm` e o tamanho da letra; `openSettings()` abre `#setModal` (botões `#btnSet`, `#btnSnd`).
- **Daltônico:** `CB_PATS` (padrões SVG) e `facFill(f)` devolvem `url(#pat-…)` quando `SET.cb` está ligado.
- **Acessibilidade:** `#srlive` (aria-live) + `announce(msg)`; `<main id="app">` com link de salto `.skip`; estados e fichas do mapa com `tabindex`/`role=button`/`aria-label`; Enter/Espaço viram clique (`UI.kbFocus` + `restoreKbFocus()` devolvem o foco depois do render); setas nas abas; `mapDescriptionHTML(G, modo)` (`UI.mapDesc`).
- **Áudio:** IIFE `AUDIO` (Web Audio procedural): `AUDIO.theme("calm"|"tense"|"war")`, `AUDIO.sfx("click"|"order"|"turn"|"boom"|"win"|"lose"|"sting"|"alert")`, `AUDIO.unlock()` no primeiro gesto.
- **Idioma (EN):** camada de tradução no DOM. O jogo continua escrito em PT. `I18N_EN = { exact, tpl }` (dicionário embutido), `trCore` (busca exata → modelo com números `{0}` → meses → divide em " · ", "; ", " — ", ". ", ": ", ", " → regras `I18N_RULES`), `trText` (só traduz se `SET.lang==="en"`), `i18nNode` (textos + `title`/`aria-label`/`placeholder`/`alt`, original guardado em `__pt`/`__pta`), um `MutationObserver` em `body` e `i18nSwitch()`. **Texto novo na UI precisa de entrada no `I18N_EN`**, senão aparece em português no modo English.

## 7e. Fase 4 (out/2026): Tensão no Sul e exércitos mais simples (save v6)
- **CORE:** `CAMPAIGN_2022.south` (`ufs` RS/SC/PR, `rebel`, `start`, `base`, limiares de cúpula/alerta/revolta) e `g.south = { t, state: "calmo"|"revolta"|"armisticio"|"aliado"|"esmagada", stage, since, warned, summit, trend }`. Funções `southCfg/southOn/southInit/southAdd/southFactors/southRate/southEta/southLevel/southOnStory/southRaise/southTick`. Ações com categoria `sul` e `req.south` (min/max/state); evento `e_sul_cupula` (encadeado por `C.south.summit`); focos `c_liga_pacto` (aliado) e `c_liga_esmagar`; chaves de efeito `south`/`southAlly` em `FOCUS_FX_KEYS`.
- **Revolta escalonada:** em 100 só RS vira separatista (exército 15). SC adere se `t > 85` por 2 meses. `t ≤ 45` em revolta → armistício. Flags `sul_revolta`, `sul_armisticio`, `sul_aliado`, `sul_esmagado` aparecem no overlay `MAJOR_FLAGS`.
- **Ordens automáticas:** `autoOrders(g, mode, silent)` (`defender`/`auto`) e `g.autoOrders` (repetir todo mês).
- **UI:** `southBarHTML()`/`openSouth()` (modal genérico `openModal`/`closeModal`), `armyCardHTML`, `armyBtnsHTML` (`data-q` = atk/mov/def/ref), `ordSumHTML`, `autoBoxHTML`, `atkWithHTML(uf)`, `attackChoices(a)`, `UI.ordMode` (filtra os destinos destacados). Tutorial: contextos `exercitos2` e `sul`.
- **Save v6:** migração v5→v6 cria `g.south` (em revolta se a Liga já controla estados).
- **sim.js:** IA `pacificador` (evita a rebelião). 300 partidas: golpista (ignora o Sul) rebelião 98%, vitória 26%; pacificador rebelião 0%, Sul aliado 94%, vitória 68%, tensão máx. média 19. IA aleatória: rebelião nas partidas com guerra caiu de 100% para ~50%.

## 7f. Organização do código (out/2026)
- O `index.html` único (~3.900 linhas) foi dividido em 17 CSS e 56 scripts (seção 4), sem mudar regras, textos nem visual.
- Prova: `tests/sim.js 300` com números idênticos antes e depois; `tests/check.js` sem falhas; capturas de tela (PT e EN, desktop e celular) idênticas pixel a pixel; saves v5 e v6 antigos abrem igual.
- Foram removidas 4 regras de CSS sem uso (`.tutskip`, `.ordbtns`, `.fdetail.empty`, `.sans`).
- Os marcadores `/*CORE_START*/` e afins não existem mais: os testes carregam os arquivos pela lista do `index.html`.

## 7g. Fase 5 (out/2026): dificuldade, partida rápida (save v7)
- **Dados:** `DIFICULDADES` e `DIF_ORDEM` em `js/data/modos.js`; `CAMPAIGN_2022.rapida` (`pace`, `storyDelay`, `eventChance`, `checks`); campo `outcome` ("vitoria"/"parcial"/"derrota") nos finais da história de 2022.
- **CORE (`js/core/modos.js`):** `scVariant(sc, diff, quick)` devolve uma cópia "leve" do cenário (`Object.create`) com só os números trocados (`enemyPower`, `enemyBase`, `money.initial`, `income` das fases, `south.base`/`jolt`, e o bloco `rapida`). `scOf(g)` devolve o cenário ORIGINAL quando `g.diff` é normal e `g.quick` é falso — por isso o Normal é idêntico ao jogo anterior (prova: `tests/sim.js 300` sem flags com saída idêntica). `diffSlack(g)` é a folga usada por `resolveNextG` (via `cond(g, c, slack)`, só nos testes de rumo da história). `choicePreview(g, idx)` diz se uma escolha da história encerra a campanha e com que resultado. `newCampaign(sc, seed, { diff, quick })` grava `g.diff`, `g.quick`, `g.simple`, liga `g.autoOrders = "auto"` no Fácil e soma `status` aos atributos.
- **UI (`js/ui/modos.js`, `css/modos.css`):** `openNewCampaign()` (janela de dificuldade/duração; última escolha em `gw_newcamp_v1`), `diffBadgeHTML(g)` (selo no HUD), `settingsCampaignHTML()` (Configurações → Campanha atual), `simpleArmiesHTML()` (aba Mapa no modo simples; `UI.manual` abre o comando completo), `UI.moreTabs` (botão Mais ▾), `endTagHTML(i)` (aviso de final nas escolhas).
- **sim.js:** `--dif=facil|normal|dificil` e `--rapida`; IA `iniciante` (só no Fácil); linha `resultado:` por IA.

## 8. Limitações conhecidas
- Modo English: cobre interface, tutorial, os grandes eventos e o evento de abertura; os demais textos de eventos, os epílogos e o cenário 1964 seguem em português.
- A trilha sonora é sintetizada (Web Audio), não há música gravada.
- Quem conclui `c_ruptura` e depois recua para a transição fica só com os ramos temáticos, porque democ e jurid ficam excluídos.
- Depois de 2023-03 os turnos valem 3 meses, então os focos terminam em saltos.
- O ramo do regime é curto (cerca de 9 meses até o nó `guerra`). Não dá para fazer todos os focos numa partida.
- As IAs da simulação são heurísticas.
- **Militar:**
  - a IA inimiga é simples (ataques locais, sem cercos nem planos de vários meses) e só abre frentes, nunca toma um estado seu direto;
  - não há linhas de suprimento detalhadas (só "estado próprio ou vizinho");
  - em 2022, nos turnos de 3 meses, os exércitos agem uma vez por turno;
  - as frentes são calculadas pelos vértices compartilhados do mapa simplificado; em litorais recortados podem ficar trechos curtos.
- No desktop o tooltip dos nós é o `title` nativo do navegador.
- **Nuvem:**
  - as estatísticas e os finais do perfil são gravados pelo cliente, então dá para forjá-los (o ranking é "de confiança");
  - há um só slot de save por cenário;
  - o conflito de saves é decidido pelo relógio de cada aparelho;
  - sem internet não há login (o jogo funciona, mas não sincroniza);
  - aberto por `file://`, não há parte de nuvem;
  - o SMTP padrão do Supabase limita os e-mails por hora.

## 9. Roadmap (próximos passos)
1. **Modernizar o visual** (tipografia, menu, transições), mantendo o estilo "dossiê histórico".
2. **Hospedar:** GitHub Pages, Netlify ou Cloudflare Pages (site estático; veja o README).
3. ~~Login e perfis de jogador~~ **feito** (Supabase; veja "Camada de nuvem"). Próximas ideias:
   - validar estatísticas e finais no servidor (função RPC ou Edge Function);
   - vários slots de save;
   - login com Google (ligar o provedor e `FEATURES.googleLogin`);
   - SMTP próprio.
4. ~~Separar o arquivo único~~ **feito** (out/2026, sem build: pastas `css/`, `js/data`, `js/core`, `js/ui`… e testes em `tests/`). Um bundler (Vite) ou TypeScript continua opcional para o futuro.
5. Depois: ranking ou compartilhamento de finais, novos cenários, e talvez escolhas votadas por amigos.
