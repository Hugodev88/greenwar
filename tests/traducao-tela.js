// tests/traducao-tela.js — varredura OPCIONAL no navegador: abre o jogo em EN/ZH/RU, passa por todas as abas nas 3 fases
// (governo, oposição, regime) e falha se algum texto ou title/aria-label visível ficar em português.
// Precisa de playwright (ou playwright-core) e de um Chrome:  node tests/traducao-tela.js   (LANGS=en,zh,ru  CHROME=/caminho)
// Complementa o check.js (que testa os dicionários no Node); útil depois de mexer em telas.
let chromium; try { ({ chromium } = require(process.env.PLAYWRIGHT || 'playwright-core')); } catch (e) { try { ({ chromium } = require('playwright')); } catch (e2) { console.log('traducao-tela: playwright não instalado — pulado'); process.exit(0); } } const http = require('http'); const fs = require('fs'); const path = require('path');
const ROOT = path.join(__dirname, '..');
const types = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.webp':'image/webp', '.png':'image/png', '.svg':'image/svg+xml' };
const srv = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p);
  fs.readFile(f, (e, d) => { if (e){ r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); r.end(d); }); });
srv.listen(0, async () => { const PORT = srv.address().port; let total = 0;
  const br = await chromium.launch({ executablePath: process.env.CHROME || (fs.existsSync('/usr/bin/google-chrome') ? '/usr/bin/google-chrome' : undefined), args: ['--no-sandbox'] });
  for (const lang of (process.env.LANGS || 'en,zh,ru').split(',')){
    const ctx = await br.newContext({ viewport: { width: 1366, height: 900 } }); await ctx.route(/supabase|esm\.sh|jsdelivr/, r => r.abort());
    const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
    await pg.addInitScript(lang => { localStorage.setItem('gw_tut_v3', JSON.stringify({ off: true, seen: {} })); localStorage.setItem('gw_settings_v1', JSON.stringify({ lang, music: 0, sfx: 0, muted: true })); }, lang);
    await pg.goto('http://localhost:' + PORT + '/index.html'); await pg.waitForTimeout(600);
    const res = await pg.evaluate(async () => {
      const out = new Map(); const sleep = ms => new Promise(r => setTimeout(r, ms)); const L = i18nLang();
      const PT = /[ãõçâêôà]|\b(de|da|dos|das|não|você|seu|sua|com|para|por|uma|mês|meses|acordo|opinião|pedido|oferta|dívida|ação|ações|dinheiro|em|ao|que|mais|já)\b/i, NM = /Rio de Janeiro|Centrão|Rio Grande do (Sul|Norte)|Mato Grosso do Sul|Distrito Federal|Bolsonaro|Lula|Alcântara|Brasília|Martín|São Paulo|Itamaraty|São Luís|Goiânia|Belém|Maceió|João Pessoa|Florianópolis|Cuiabá|Vitória|Macapá|Teresina|Aracaju|Amapá|Ceará|Pará|Paraná|Piauí|Maranhão|Rondônia|Goiás|Espírito Santo|Paraíba/g;
      const bad = t => { t = t.replace(NM, ''); return L === 'en' ? PT.test(t) : /[A-Za-zÀ-ú]{3,}/.test(t.replace(/\b(AP|UN|OAS|BRICS|EUA|UE|PIB|IA|XP|OK|Tab|Shift|Ctrl|Esc|Enter)\b/g, '')); };
      const scan = where => { const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n;
        while ((n = w.nextNode())){ const pn = n.parentNode; if (!pn || /SCRIPT|STYLE/.test(pn.nodeName) || (pn.closest && pn.closest('[translate=no]'))) continue; const t = n.data.trim(); if (t && bad(t) && !out.has(t)) out.set(t, where); }
        for (const el of document.body.querySelectorAll('[title],[aria-label],[placeholder]')) for (const a of ['title','aria-label','placeholder']){ const v = el.getAttribute(a); if (v && bad(v) && !out.has(v)) out.set(v, where + ' @' + a); } };
      setScenario('brasil2022');
      for (const [ph, f] of [['governo', g => g], ['oposicao', g => { g.visited.push('transicao'); return g; }], ['regime', g => { g.visited.push('golpe_inicial'); return g; }]]){
        G = f(newCampaign(SCEN, 7)); G.queue.length = 0;
        for (const tab of ['historia', 'mapa', 'diplomacia', 'faccoes', 'acoes', 'decisoes']){ UI.tab = tab; renderGame(); await sleep(120); document.querySelectorAll('details').forEach(d => d.open = true); await sleep(30); scan(ph + ':' + tab); }
      }
      return [...out.entries()];
    });
    total += res.length + errs.length; console.log(`== ${lang}: ${res.length}${errs.length ? ' errors: ' + errs.join(' | ') : ''}`); for (const [t, w] of res) console.log('  ' + JSON.stringify(t).slice(0, 180) + '  [' + w + ']');
    await ctx.close();
  }
  await br.close(); srv.close();
  console.log(total ? `FALHOU: ${total} textos em português (ou erros de página)` : 'OK: nenhum texto em português nas telas');
  process.exitCode = total ? 1 : 0;
});
