# CONTEXTO — guia de design e arquitetura (para assistentes de IA e devs)

Este arquivo existe para que um assistente de código (Cursor, etc.) entenda o projeto antes de mexer nele. **Leia até o fim antes de alterar história, árvore ou saves.**

## 1. O que é
"Greenwar / Crônicas da Separação": jogo de estratégia narrativa sobre o Brasil, em **português**, inspirado em Hearts of Iron (HoI4). O jogador escolhe um ano no menu (como no HoI4), toma decisões na história e administra uma campanha mês a mês, com um mapa dos 27 estados mostrando quem controla cada um.

Hoje é **um único arquivo** `index.html` (~305 KB, ~3250 linhas, HTML + CSS + JS puro, sem dependências e sem build). Funciona offline e salva no `localStorage`.

## 2. Cenários
| id | Ano | Título | Personagem / premissa | Fases da campanha |
|---|---|---|---|---|
| `itavera` | 1924 | Aurora do Sul | Líder fictício de um movimento separatista na Província de Itaverá (≈ RS), num Brasil alternativo | rebelião, guerra de secessão |
| `brasil1964` | 1964 | Os Anos Decisivos | A crise de 1964 e suas alternativas | governo, crise, guerra civil |
| `brasil2022` | 2022 | A Faixa Presidencial | Bolsonaro depois de perder a eleição: aceitar, contestar ou tentar uma ruptura | `governo` (out–dez/2022), `oposicao` (após a posse), `regime` (após um golpe bem-sucedido, com guerra civil) |

**O foco atual do desenvolvimento é o cenário de 2022.**

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
- **Mapa interativo:** controle por UF e agitação (`unrest`). Na guerra há tropas, ações por estado e estados disputados. Os modos de visualização são controle e agitação.
- **Árvore de decisões nacionais** (só 2022, estilo foco nacional do HoI4): veja a seção 5.
- **Finais:** por nós `ending` da história ou por `C.checks`, que são condições do estado da campanha.

## 4. Arquitetura do `index.html`
As linhas são aproximadas; procure pelos marcadores.

| Trecho | Onde | Conteúdo |
|---|---|---|
| `<style>` | início | Todo o CSS, incluindo mobile (`@media max-width:700/860px`) e o da árvore (`.focuslayout`, `.fnode`, `.ftree*`) |
| `/*SCENARIOS_START*/ … /*SCENARIOS_END*/` | ~346–2016 | Todos os dados: `STORY_ITAVERA`, `STORY_1964`, `STORY_2022`; `CAMPAIGN_ITAVERA`, `CAMPAIGN_1964`, `CAMPAIGN_2022`; `CAMPAIGN_2022.focus` (a árvore); e a lista **`const SCENARIOS = [...]`** |
| `/*MAP_START*/ … /*MAP_END*/` | ~2017 | `MAP_DATA`: SVG paths dos 27 estados, gerado por `tools/build-map.js` |
| `/*CORE_START*/ … /*CORE_END*/` | ~2022–2734 | Lógica pura, sem DOM: `SAVE_VERSION`, `cond()`, `applyFx()`, `newCampaign()`, ações, diplomacia (`dealScore`), eventos, focos (`focusStatus`, `startFocus`, `focusTick`, `completeFocus`, `focusStoryGrant`), `endTurn()` |
| depois do CORE | ~2735–fim | UI: ponte `cloud()` e `window.GWGame` (no fim), além de `UI` (estado da interface), `loadInfo` (carregar e migrar save), `renderTitle` (menu de cenários), `renderGame` (abas), `tabDecisoes` (árvore), `openHelp` etc. |

**Os marcadores são usados por `check.js` e `sim.js`,** que extraem esses trechos e executam em Node. Não os remova. Mantenha o CORE livre de DOM.

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
- **Efeitos (`applyFx`):** `s` (atributos), `money`, `reserve`, `fac`, `infl`, `unrest`, `unrestAll`, `unrestUF`, `act`, `actAll`, `enemy`, `flag`, `map`, `ap`, `ceasefire`, `malus {v, months}`.

### Saves e localStorage
- `SAVE_VERSION = 2`. Um save com outra versão ou de formato antigo é arquivado em `<saveKey>_legacy`, e o jogador vê um aviso.
- Saves de 2022 sem `g.focus` (anteriores à árvore) são **migrados** em `loadInfo`: `focusInit` aplica as concessões da história já vividas e marca `focusMigrated`, e aparece um aviso no menu.
- **Se mudar o formato do save, aumente a versão ou escreva uma migração em `loadInfo`.**
- Chaves do localStorage:
  - `aurora_do_sul_save_v1` e `aurora_do_sul_endings_v1` (1924);
  - `jogo_br_save_brasil1964` e `jogo_br_endings_brasil1964`;
  - `jogo_br_save_brasil2022` e `jogo_br_endings_brasil2022`;
  - `jogo_br_ultimo_cenario` e `jogo_br_tutorial_v2`.
- Cada `save()` grava `G.savedAt = Date.now()`, usado para dizer qual save é mais recente na mesclagem com a nuvem.

### Camada de nuvem (Supabase): `config.js`, `cloud.js` e `supabase/migrations/001_init.sql`
- **Opcional e isolada.** `index.html` carrega `<script type="module" src="cloud.js">` no fim. Se o módulo ou a biblioteca não carregarem (offline, `file://`, CDN bloqueada), nada quebra e os saves seguem no `localStorage`.
- **Biblioteca:** `cloud.js` importa `@supabase/supabase-js@2` (versão fixa) do jsDelivr, com o esm.sh como alternativa.
- **`config.js`:** `SUPABASE_URL`, `SUPABASE_KEY` (a *publishable key*, pública por design) e `FEATURES.googleLogin` (o botão do Google fica escondido até o provedor ser ativado). Nunca coloque ali a secret key ou a service_role.
- **Ponte jogo → nuvem:** no `index.html`, `cloud("syncSave", id)`, `cloud("syncEndings", id)`, `cloud("campaignStarted", id)` e `cloud("deleteSave", id)` chamam `window.GWCloud.*` se ele existir e não fazem nada se não existir. Os pontos de chamada:
  - `startNew` dispara `campaignStarted` e `syncSave`;
  - "Encerrar mês" e `renderEnding` disparam `syncSave`;
  - `addEnding`, quando o final é novo, dispara `syncEndings`;
  - "Recomeçar" dispara `deleteSave`.
- **Ponte nuvem → jogo:** `window.GWGame` expõe:
  - `scenarios()` (com ids, chaves do localStorage e lista de finais);
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
  - Saves da nuvem com outra `save_version` são ignorados. Se `SAVE_VERSION` mudar, pense também nos saves da nuvem.
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
- **`node check.js [N]`:** valida links e nós alcançáveis da história, as referências de mapa, facções, atores, ações e eventos, e a árvore:
  - ids únicos e referências existentes;
  - `excl` simétrico, sem ciclos, raiz única;
  - todo foco alcançável por algum caminho;
  - chaves de efeito válidas e flags `fo_*` válidas.
  - Depois roda o `sim.js`.
- **`node sim.js [N] [cenário]`:** partidas automáticas com as IAs aleatória, gulosa e radical, e a "golpista" (roteiro só de cobertura, em 2022). Mostra a distribuição de finais, os focos concluídos por partida e quais focos nunca são concluídos. Falha se algum final ou foco ficar inalcançável.
- **Referência atual (300 partidas por IA, 2022):**
  - aleatória: ostracismo 29%, oposição 23%, retorno 15%, golpe fracassado 11%…;
  - gulosa: retorno 81%;
  - radical: golpe fracassado 53%.

## 7. Regras de design (obrigatórias)
1. **UI e textos em português do Brasil.**
2. **Aviso de ficção** visível (menu e introdução). Não remova.
3. **Pessoas reais tratadas de forma neutra,** sem caricatura nem juízo editorial. **Nunca inventar citações** atribuídas a pessoas reais.
4. **Caminhos autoritários ou golpistas têm consequências sóbrias e pesadas** (isolamento, violência, colapso econômico, chance de fracasso), sem glorificação. O jogo não deve parecer um manual nem uma propaganda.
5. Mudou história, eventos ou árvore? **Rode `node check.js`** e confira a distribuição de finais.
6. Não quebre saves: migre em `loadInfo` ou aumente `SAVE_VERSION`.
7. Mantenha o CORE testável em Node (sem `document`/`window`).
8. Mobile importa: teste em largura de ~400 px.

## 8. Limitações conhecidas
- Quem conclui `c_ruptura` e depois recua para a transição fica só com os ramos temáticos, porque democ e jurid ficam excluídos.
- Depois de 2023-03 os turnos valem 3 meses, então os focos terminam em saltos.
- O ramo do regime é curto (cerca de 9 meses até o nó `guerra`). Não dá para fazer todos os focos numa partida.
- As IAs da simulação são heurísticas.
- No desktop o tooltip dos nós é o `title` nativo do navegador.
- Tudo num arquivo só fica difícil de manter conforme cresce.
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
4. **Separar o arquivo único num projeto Vite** quando entrar a autenticação:
   - `src/data/` (um arquivo por cenário: `story2022.js`, `campaign2022.js`, `focus2022.js`), `src/core/` (lógica pura, testável), `src/ui/` e `src/styles/`;
   - adaptar `check.js` e `sim.js` para importar os módulos em vez de recortar os marcadores;
   - opcionalmente TypeScript nos tipos de `STORY`, `CAMPAIGN` e `focus`.
5. Depois: ranking ou compartilhamento de finais, novos cenários, e talvez escolhas votadas por amigos.
