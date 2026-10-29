# Greenwar — Crônicas da Separação

Jogo de estratégia e história interativa sobre o Brasil, inspirado em Hearts of Iron. Funciona offline, num único arquivo HTML. Você escolhe um ano, toma decisões mês a mês e vê no mapa quem controla cada estado.

> **Aviso:** este jogo é uma **obra de ficção**. Eventos, diálogos e desfechos são hipotéticos. Pessoas reais são tratadas de forma neutra, sem citações inventadas atribuídas a elas. Caminhos autoritários ou de ruptura têm consequências sérias dentro do jogo: o jogo não endossa nenhum deles.

## Cenários
| Ano | Cenário | Resumo |
|---|---|---|
| 1924 | **Aurora do Sul** | Você lidera um movimento separatista fictício no Sul do país. |
| 1964 | **Os Anos Decisivos** | A crise política de 1964 e suas alternativas. |
| 2022 | **A Faixa Presidencial** | Depois da eleição de 2022: aceitar o resultado, contestar ou tentar uma ruptura. Tem a **árvore de decisões nacionais** (44 focos). |

## Sistemas
- **Turnos:** um turno por mês (em 2022, a partir de março de 2023, cada turno vale 3 meses), com Pontos de Ação.
- **Diplomacia:** acordos com atores estrangeiros.
- **Facções internas:** cada uma tem lealdade.
- **Eventos aleatórios.**
- **Mapa interativo** dos 27 estados.
- **Árvore de decisões nacionais** (focos no estilo HoI4), só no cenário de 2022.
- **Finais múltiplos.**

## Como jogar
Basta abrir o arquivo `index.html` no navegador (Chrome, Edge, Firefox ou o navegador do celular). Não precisa instalar nada nem ter internet. O progresso fica salvo no `localStorage` do navegador.

Se preferir um servidor local:
```bash
npx serve .        # ou: python3 -m http.server 8000
```

## Validação e simulação (Node.js 18 ou mais novo)
```bash
node check.js          # valida história, mapa, campanha e árvore de decisões, e roda a simulação (150 partidas por IA)
node check.js 300      # igual, com 300 partidas por IA
node sim.js 300        # só a simulação de campanhas, com distribuição de finais por IA
node sim.js 300 brasil2022   # só um cenário
```
`check.js` termina com código 1 se houver qualquer problema. **Rode depois de qualquer mudança na história, nos eventos ou na árvore.**

`tools/build-map.js` gera a geometria simplificada dos estados (`tools/brazil-map.json`, já embutida no `index.html`) a partir de um GeoJSON do IBGE. O GeoJSON tem 3,3 MB e não está no repositório. Para regerar o mapa, baixe `brazil-states.geojson` do projeto codeforamerica/click_that_hood, salve como `tools/brazil-states.geojson.json` e rode `node tools/build-map.js`.

## Hospedar de graça
O jogo é um site estático, então qualquer hospedagem estática serve:
- **GitHub Pages:** no repositório, abra *Settings → Pages → Deploy from a branch*, escolha `main` e a pasta `/ (root)`. O endereço fica `https://hugodev88.github.io/greenwar/`.
- **Netlify:** use *Add new site → Import from Git*, escolha este repositório e deixe o comando de build vazio, com a pasta de publicação `.`. Também dá para arrastar a pasta em app.netlify.com/drop.
- **Cloudflare Pages:** use *Create → Pages → Connect to Git*, sem framework, sem comando de build, com a pasta de saída `/`.

## Para quem vai desenvolver
Leia o [`CONTEXTO.md`](CONTEXTO.md): arquitetura, regras de conteúdo e próximos passos (login, perfis, saves na nuvem).
