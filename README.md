# Greenwar — Crônicas da Separação

Jogo de estratégia e história interativa sobre o Brasil, inspirado em Hearts of Iron. Funciona offline, num único arquivo HTML. Você toma decisões mês a mês e vê no mapa quem controla cada estado.

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
- **Exércitos e combate visual:** exércitos com nome, força, moral (organização), experiência e general fictício aparecem no mapa como contadores no estilo OTAN. Você dá **uma ordem por exército por mês** (atacar, defender, mover, recuar, reforçar) **sem gastar PA**: toque no exército e depois no estado vizinho. O mapa mostra setas animadas (suas ordens e as intenções inimigas conhecidas), linhas de frente e estados em batalha pulsando. No **Encerrar mês** há uma resolução animada (pode pular) e uma **tela de batalha** com rodadas, moral, general e modificadores (terreno, apoio local, suprimentos, armas estrangeiras).
- **Relatório pós-batalha:** toda batalha (na tela de batalha e na lista da resolução do mês) mostra **por que e como** você venceu ou perdeu: tabela fator por fator (tropas, moral, experiência, terreno, posições, apoio, comando, suprimentos, armas, defensor, sorte nas rolagens) com o valor de cada lado e quem foi favorecido, barra de poder, baixas, uma frase-resumo ("Você perdeu principalmente porque o inimigo tinha 2,5× mais tropas…") e dicas do que fazer melhor. As batalhas do mês ficam na aba **História** (e as anteriores em "Batalhas anteriores", até 30) e no painel do mapa.
- **Árvore de decisões nacionais** (focos no estilo HoI4), só no cenário de 2022.
- **Finais múltiplos.**

## Como jogar
Jogue online em **https://hugodev88.github.io/greenwar/** ou abra o arquivo `index.html` no navegador (Chrome, Edge, Firefox ou o navegador do celular). Não precisa instalar nada, ter internet nem criar conta: o progresso fica salvo no `localStorage` do navegador.

Com uma conta (botão **👤 Entrar**, opcional), os saves e os finais também vão para a nuvem e você ganha um perfil público. Veja [Contas e saves na nuvem](#contas-e-saves-na-nuvem-supabase). Aberto como arquivo local (`file://`), o jogo roda sem a parte de contas.

Se preferir um servidor local:
```bash
npx serve .        # ou: python3 -m http.server 8000
```

### Exércitos e ordens
- **Selecionar:** toque num contador azul (seu exército; o número é a força total no estado e o selo "×n" indica vários exércitos — toque de novo para alternar). Os estados alcançáveis ficam destacados: vermelho = atacar, azul = mover/recuar.
- **Ordens:** uma por exército por mês. Atacar, mover e recuar são **manobras**, limitadas pelo atributo militar e pela lealdade militar (o chip "Ordens x/y" no mapa). Defender é grátis; reforçar custa 3 recursos (+10 de força). Nada disso gasta PA.
- **Recrutar tropas:** botão azul **＋ Recrutar tropas** no painel do mapa (ou **no estado selecionado**, se for seu): exército novo com 20 de força por 8 recursos, até **2 por mês**. Se não der, o botão explica o motivo (recursos, limite do mês, limite de 8 exércitos, eventos pendentes).
- **Alistamento (guerra):** todo mês chegam voluntários (3–12 de força, conforme seus estados e o apoio popular) que reforçam sozinhos exércitos fracos parados no seu território; o excedente acumula e forma um exército novo na capital. A manutenção das tropas ficou mais barata (0,3 por 10 de força).
- **Paz:** em tempo de paz os exércitos só se reposicionam entre estados seus.
- **Batalhas:** toque num estado em disputa (ou em "Ver batalha") para abrir a tela de combate; sem batalha no mês, ela mostra as forças e uma previsão.
- **Saves antigos** (versão 2) são migrados automaticamente: as tropas viram exércitos.

## Contas e saves na nuvem (Supabase)
O login é **opcional**. Sem conta, offline ou se o Supabase estiver fora do ar, o jogo continua igual, com os saves no `localStorage`.

**O que existe:**
- cadastro e login por e-mail e senha, link mágico, "Esqueci a senha" e troca de senha;
- botão do Google pronto, mas escondido (`FEATURES.googleLogin` em `config.js`);
- perfil com nome de exibição, `@usuário`, emblema (ícones embutidos ou iniciais, sem upload) e bio;
- estatísticas: campanhas iniciadas e finais desbloqueados por cenário;
- aba **Jogadores**, com o ranking por finais e os perfis públicos;
- saves na nuvem (um por cenário), enviados ao "Encerrar mês", ao chegar num final e ao começar uma campanha;
- ao entrar, o jogo junta os saves deste aparelho com os da nuvem. Se os dois forem diferentes, ele pergunta qual manter e mostra qual é o mais recente. Os finais são unidos nos dois sentidos.

**Arquivos:**
- `config.js`: URL do projeto e a *publishable key* (pública por design; quem protege os dados é o RLS);
- `cloud.js`: módulo carregado pelo `index.html`;
- `supabase/migrations/001_init.sql`: tabelas, RLS e gatilhos.

### Configurar o projeto Supabase (uma vez)
1. **Rodar o SQL:** no painel do Supabase, abra **SQL Editor → New query**, cole todo o [`supabase/migrations/001_init.sql`](supabase/migrations/001_init.sql) e clique em **Run**. Pode rodar de novo sem problema (o script é idempotente). Ele cria `profiles` e `saves`, as políticas RLS, o gatilho que cria o perfil no cadastro e o perfil das contas que já existirem.
2. **URLs de redirecionamento:** em **Authentication → URL Configuration**:
   - em **Site URL**, coloque `https://hugodev88.github.io/greenwar/`;
   - em **Redirect URLs**, adicione `https://hugodev88.github.io/greenwar/` (e, para testes locais, `http://localhost:8000/`).

   Os links de confirmação, o link mágico e a recuperação de senha voltam para esse endereço.
3. **Opcional, para testar mais rápido:** em **Authentication → Sign In / Providers → Email**, desligue **Confirm email**. Assim a conta entra direto, sem o e-mail de confirmação. Religue antes de divulgar o jogo.
4. **Opcional, Google:** ative o provedor em **Authentication → Sign In / Providers → Google** (precisa de um Client ID/Secret do Google Cloud) e mude `googleLogin: true` em `config.js`.

**Qual chave vai no `config.js`?** A **Publishable key** (`sb_publishable_…`), em **Project Settings → API Keys**. A antiga chave "anon public" também funciona. **Nunca** use a *secret key* (`sb_secret_…`), a `service_role` nem a senha do banco no front-end.

O e-mail padrão do Supabase tem limite baixo de envios por hora. Para muitos jogadores, configure um SMTP próprio em **Authentication → Emails → SMTP Settings**.

Para testar localmente com contas, sirva a pasta por HTTP (`python3 -m http.server 8000`) em vez de abrir o arquivo direto.

## Validação e simulação (Node.js 18 ou mais novo)
```bash
node check.js          # valida história, mapa, campanha e árvore de decisões, e roda a simulação (150 partidas por IA)
node check.js 300      # igual, com 300 partidas por IA
node sim.js 300        # só a simulação de campanhas, com distribuição de finais por IA
node sim.js 300 brasil2022   # só um cenário
node sim.js 40 brasil1964    # cenário bloqueado: só roda se pedido pelo id
```
O `check.js` também valida os dados do 1964 (bloqueado) e roda um teste curto de integridade dele (40 partidas por IA), para o cenário não quebrar enquanto o motor muda. Esse teste não entra no balanceamento.
`check.js` termina com código 1 se houver qualquer problema. **Rode depois de qualquer mudança na história, nos eventos ou na árvore.**

`tools/build-map.js` gera a geometria simplificada dos estados (`tools/brazil-map.json`, já embutida no `index.html`) a partir de um GeoJSON do IBGE. O GeoJSON tem 3,3 MB e não está no repositório. Para regerar o mapa, baixe `brazil-states.geojson` do projeto codeforamerica/click_that_hood, salve como `tools/brazil-states.geojson.json` e rode `node tools/build-map.js`.

## Hospedar de graça
O jogo é um site estático, então qualquer hospedagem estática serve:
- **GitHub Pages:** no repositório, abra *Settings → Pages → Deploy from a branch*, escolha `main` e a pasta `/ (root)`. O endereço fica `https://hugodev88.github.io/greenwar/`.
- **Netlify:** use *Add new site → Import from Git*, escolha este repositório e deixe o comando de build vazio, com a pasta de publicação `.`. Também dá para arrastar a pasta em app.netlify.com/drop.
- **Cloudflare Pages:** use *Create → Pages → Connect to Git*, sem framework, sem comando de build, com a pasta de saída `/`.

## Para quem vai desenvolver
Leia o [`CONTEXTO.md`](CONTEXTO.md): arquitetura, regras de conteúdo, a camada de nuvem e os próximos passos.
