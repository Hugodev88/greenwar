// js/ui/conquistas.js — Interface: guarda as conquistas, a melhor nota e as campanhas concluídas (localStorage "gw_conquistas_v1"/"gw_concluidas_v1" e, com login, a nuvem) e monta o texto para compartilhar.
/* Formato: { v: 1, got: { id: { at, sc, diff } }, best: { cenário: "S"|"A"|"B"|"C" } }. A nuvem guarda o mesmo objeto
   numa linha da tabela saves (scenario_id "_conquistas"); a mesclagem fica em js/nuvem/cloud.js. */
const ACH_KEY = "gw_conquistas_v1";
function achLoad(){ try { const d = JSON.parse(localStorage.getItem(ACH_KEY)); if (d && d.got) return Object.assign({ v: 1, got: {}, best: {} }, d); } catch(e){} return { v: 1, got: {}, best: {} }; }
function achStore(d){ try { localStorage.setItem(ACH_KEY, JSON.stringify(d)); } catch(e){} }
// Campanhas concluídas (Fase 12): estatísticas só contam campanhas que chegaram a um final (vitória ou derrota).
// Formato { n: { cenário: concluídas }, sent: { cenário: já enviadas à nuvem } }; campanhas abandonadas ou em andamento não entram.
const FIN_KEY = "gw_concluidas_v1";
function finRecord(scId){
  let d; try { d = JSON.parse(localStorage.getItem(FIN_KEY)); } catch(e){}
  d = d && d.n ? d : { n: {}, sent: {} };
  d.n[scId] = (d.n[scId] || 0) + 1;
  try { localStorage.setItem(FIN_KEY, JSON.stringify(d)); } catch(e){}
  cloud("campaignFinished");
}
// Registra as conquistas desta campanha uma única vez (marca em G.ended) e devolve as novas
function achRecord(){
  const gr = endingGrade(G);
  if (G.ended.achDone) return { grade: gr, fresh: G.ended.achNew || [] };
  const total = Object.values(STORY.nodes).filter(n => n.ending).length;
  const earned = earnedAchievements(G, { achados: getEndings().length, total });
  const d = achLoad(), fresh = earned.filter(id => !d.got[id]);
  for (const id of fresh) d.got[id] = { at: Date.now(), sc: SCEN.id, diff: G.diff || "normal" };
  d.best[SCEN.id] = betterGrade(d.best[SCEN.id], gr.letter);
  achStore(d);
  finRecord(SCEN.id); // conta a campanha concluída uma única vez (o mesmo marcador achDone)
  G.ended.achDone = true; G.ended.achNew = fresh; G.ended.grade = gr.letter; save();
  cloud("syncAchievements");
  return { grade: gr, fresh };
}
function shareURL(){ return /^https?:/.test(location.protocol) ? location.origin + location.pathname : "https://hugodev88.github.io/greenwar/"; }
function shareText(node, gr, nAch){
  const D = diffOf(G), months = G.month - G.startMonth, total = CONQUISTAS.length;
  if (SET.lang === "zh") return `我在 Greenwar 中通关了“${trText(SCEN.title)}”：结局“${trText(node.endingName)}”，评级 ${gr.letter}（${trText(D.label)}${G.quick ? "，快速对局" : ""}），用时 ${months} 个月。成就 ${nAch}/${total}。来玩：${shareURL()}`;
  if (SET.lang === "ru") return `Я прошёл «${trText(SCEN.title)}» в Greenwar: концовка «${trText(node.endingName)}», оценка ${gr.letter} (${trText(D.label)}${G.quick ? ", быстрая партия" : ""}), за ${months} мес. Достижения: ${nAch} из ${total}. Играть: ${shareURL()}`;
  if (SET.lang === "en") return `I finished “${trText(SCEN.title)}” in Greenwar: ending “${trText(node.endingName)}”, grade ${gr.letter} (${trText(D.label)}${G.quick ? ", quick game" : ""}), in ${months} months. ${nAch} of ${total} achievements. Play: ${shareURL()}`;
  return `Terminei “${SCEN.title}” no Greenwar: final “${node.endingName}”, nota ${gr.letter} (${D.label}${G.quick ? ", partida rápida" : ""}), em ${months} meses. ${nAch} de ${total} conquistas. Jogue: ${shareURL()}`;
}
async function shareEnding(text){
  try { if (navigator.share){ await navigator.share({ title: "Greenwar", text }); return; } } catch(e){ if (e && e.name === "AbortError") return; }
  try { await navigator.clipboard.writeText(text); toast("Texto copiado! Cole onde quiser.", "good"); return; } catch(e){}
  openModal(`<h2>Compartilhar</h2><p class="muted sm">Copie o texto abaixo:</p><textarea class="sharebox" readonly rows="5">${esc(text)}</textarea>`);
  const t = document.querySelector(".sharebox"); if (t){ t.focus(); t.select(); }
}
