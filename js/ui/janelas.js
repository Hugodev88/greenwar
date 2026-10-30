// js/ui/janelas.js — Interface: janela (modal) genérica: openModal/closeModal.
let _modalClose = null;
function closeModal(){ if (_modalClose) _modalClose(); }
function openModal(html, bind){
  closeModal();
  const m = document.createElement("div");
  m.className = "modal"; m.id = "genModal"; m.setAttribute("role", "dialog"); m.setAttribute("aria-modal", "true");
  m.innerHTML = `<div class="modal-card">${html}<div class="row2"><button class="primary" id="btnGenClose">Fechar</button></div></div>`;
  document.body.appendChild(m);
  const key = e => { if (e.key === "Escape"){ e.stopPropagation(); close(); } };
  const close = () => { m.remove(); document.removeEventListener("keydown", key, true); _modalClose = null; };
  _modalClose = close;
  document.addEventListener("keydown", key, true);
  m.onclick = e => { if (e.target === m) close(); };
  m.querySelector("#btnGenClose").onclick = close; m.querySelector("#btnGenClose").focus({ preventScroll: true });
  if (bind) bind(m);
}
