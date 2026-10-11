/* Navigazione durante la storia (piano §5.6, §9.4). Visibile solo da t1 alla fine di t9. Non dipende da GSAP.
   - desktop ≥ 1200: rail fisso a destra con il grafico in verticale (y = ordine delle tappe, x = valore
     fuori/dentro); ogni nodo è un link con il nome breve, il nodo attivo è lilla, a sinistra il tratto di progresso;
   - ≤ 1199: barra in alto (48px) con «03 / 09 · Agostino», linea di avanzamento lilla e pulsante «Mappa»,
     che apre un pannello (dialog modale: focus intrappolato, Esc chiude, il focus torna al pulsante) con il
     grafico orizzontale del ponte e i nodi come link.
   I nomi brevi e i contatori sono testi UI ammessi (§0.3); tutto sta fuori da #apertura, .tappa e #domande. */
import { SCENE } from './scene-data.js';

const TAPPE = SCENE.filter((s) => /^t\d$/.test(s.id));
const NS = 'http://www.w3.org/2000/svg';
const pad = (n) => String(n).padStart(2, '0');

function el(tag, attrs = {}, html = '') {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (html) e.innerHTML = html;
  return e;
}

/** etichetta accessibile di ogni tappa, presa dai nodi del grafico del ponte (stesse parole) */
function etichetta(i) {
  const a = document.querySelector(`.grafico .nodo[data-i="${i}"]:not(.vuoto)`);
  return a ? a.getAttribute('aria-label') : `Tappa ${i}: ${TAPPE[i - 1].nome}`;
}

function creaRail() {
  const nav = el('nav', { class: 'rail surf-light', 'aria-label': 'Tappe della storia', 'data-ui': '' });
  const ol = el('ol', { class: 'rail-lista' });
  // polilinea del grafico verticale: x = valore (0..100), y = centro di ogni riga (0..900)
  const pts = TAPPE.map((t, i) => `${t.valore},${i * 100 + 50}`).join(' ');
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'rail-g'); svg.setAttribute('viewBox', '0 0 100 900');
  svg.setAttribute('preserveAspectRatio', 'none'); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false');
  svg.innerHTML = `<line class="rail-mezzo" x1="50" y1="0" x2="50" y2="900"/><polyline class="rail-linea" points="${pts}"/>`
    + `<polyline class="rail-tratto" points="45,750 20,850"/>`;
  TAPPE.forEach((t, k) => {
    const i = k + 1;
    const li = el('li');
    const a = el('a', { href: `#${t.id}`, 'aria-label': etichetta(i), 'data-i': i });
    a.innerHTML = `<span class="rail-n" aria-hidden="true">${pad(i)}</span><span class="rail-nome" aria-hidden="true">${t.nome}</span>`
      + `<span class="rail-asse" aria-hidden="true"><i class="rail-dot" style="left:${t.valore}%"></i>`
      + (t.vuoto != null ? `<i class="rail-dot vuoto" style="left:${t.vuoto}%"></i>` : '') + '</span>';
    li.appendChild(a);
    ol.appendChild(li);
  });
  const corpo = el('div', { class: 'rail-in' });
  corpo.append(el('div', { class: 'rail-prog', 'aria-hidden': 'true' }, '<span></span>'), svg, ol);
  nav.appendChild(corpo);
  return nav;
}

function creaBarra() {
  const bar = el('div', { class: 'barra surf-light', 'data-ui': '' });
  bar.innerHTML = '<div class="barra-in"><p class="barra-dove" aria-hidden="true"><span class="barra-n">01 / 09</span>'
    + '<span class="barra-sep"> · </span><span class="barra-nome">Omero</span></p>'
    + '<button type="button" class="barra-mappa" aria-haspopup="dialog" aria-controls="pannello-mappa">Mappa</button></div>'
    + '<div class="barra-prog" aria-hidden="true"><span></span></div>';
  return bar;
}

function creaPannello() {
  const d = el('dialog', { id: 'pannello-mappa', class: 'pannello surf-dark', 'aria-label': 'Mappa delle tappe', 'data-ui': '' });
  const testa = el('div', { class: 'pannello-testa' });
  const chiudi = el('button', { type: 'button', class: 'pannello-chiudi' }, 'Chiudi');
  testa.appendChild(chiudi);
  const g = el('div', { class: 'grafico pannello-grafico' });
  const plot = document.querySelector('.grafico .plot');
  if (plot) g.appendChild(plot.cloneNode(true));
  d.append(testa, g);
  return { d, chiudi };
}

export function initNav() {
  const tappe = TAPPE.map((t) => document.getElementById(t.id)).filter(Boolean);
  if (tappe.length !== TAPPE.length) return;
  const html = document.documentElement;
  html.classList.add('con-nav');

  const rail = creaRail();
  const bar = creaBarra();
  const { d: pannello, chiudi } = creaPannello();
  document.body.append(rail, bar, pannello);
  const btn = bar.querySelector('.barra-mappa');
  const railLink = [...rail.querySelectorAll('a')];
  const panLink = [...pannello.querySelectorAll('a.nodo')];
  const scene = [...document.querySelectorAll('.tappa > .scena, .tappa > .lettura, .ponte-sec, .finale > .scena, .finale > .form-sec')];

  /* ---------- pannello ---------- */
  btn.addEventListener('click', () => {
    if (typeof pannello.showModal === 'function') pannello.showModal(); else pannello.setAttribute('open', '');
    chiudi.focus();
  });
  const chiudiPannello = () => { if (pannello.open) pannello.close(); };
  chiudi.addEventListener('click', chiudiPannello);
  pannello.addEventListener('close', () => { if (bar.classList.contains('vista')) btn.focus(); });
  pannello.addEventListener('click', (e) => {
    if (e.target === pannello) { chiudiPannello(); return; }       // clic sul fondo
    const a = e.target.closest('a[href^="#t"]');
    if (!a) return;
    e.preventDefault();
    const dest = document.querySelector(a.getAttribute('href'));
    pannello.close();
    if (dest) { dest.scrollIntoView({ behavior: 'auto', block: 'start' }); history.replaceState(null, '', a.getAttribute('href')); }
  });

  /* ---------- stato durante lo scroll ---------- */
  let attivo = 0, ticking = false;
  const sotto = (y) => scene.find((s) => { const r = s.getBoundingClientRect(); return r.top <= y && r.bottom > y; });
  function aggiorna() {
    ticking = false;
    const vh = window.innerHeight;
    const y = vh * 0.4;
    const primo = tappe[0].getBoundingClientRect();
    const ultimo = tappe[tappe.length - 1].getBoundingClientRect();
    const dentro = primo.top <= y && ultimo.bottom > y;
    rail.classList.toggle('vista', dentro);
    bar.classList.toggle('vista', dentro);
    if (!dentro && pannello.open) pannello.close();
    if (!dentro) return;
    let i = tappe.findIndex((t) => { const r = t.getBoundingClientRect(); return r.top <= y && r.bottom > y; });
    if (i < 0) i = 0;
    const prog = Math.min(1, Math.max(0, (y - primo.top) / (ultimo.bottom - primo.top)));
    rail.style.setProperty('--prog', prog.toFixed(4));
    bar.style.setProperty('--prog', prog.toFixed(4));
    // superficie sotto il rail (a metà altezza) e sotto la barra (in cima): chiaro o scuro
    for (const [nodo, yy] of [[rail, vh * 0.5], [bar, 24]]) {
      const s = sotto(yy);
      const scuro = !!(s && s.classList.contains('surf-dark'));
      nodo.classList.toggle('surf-dark', scuro);
      nodo.classList.toggle('surf-light', !scuro);
    }
    if (i + 1 !== attivo) {
      attivo = i + 1;
      bar.querySelector('.barra-n').textContent = `${pad(attivo)} / ${pad(TAPPE.length)}`;
      bar.querySelector('.barra-nome').textContent = TAPPE[i].nome;
      railLink.forEach((a) => { const on = +a.dataset.i === attivo; a.classList.toggle('attivo', on); if (on) a.setAttribute('aria-current', 'step'); else a.removeAttribute('aria-current'); });
      panLink.forEach((a) => a.classList.toggle('attivo', +a.dataset.i === attivo));
    }
  }
  const richiedi = () => { if (!ticking) { ticking = true; requestAnimationFrame(aggiorna); } };
  window.addEventListener('scroll', richiedi, { passive: true });
  window.addEventListener('resize', richiedi);
  aggiorna();

  /* ---------- collegamenti diretti #t1…#t9: dopo il caricamento dei font le altezze cambiano, si riallinea ---------- */
  const riallinea = () => {
    const h = location.hash;
    if (!/^#(t\d|apertura|domande)$/.test(h)) return;
    const dest = document.querySelector(h);
    if (!dest) return;
    const m = parseFloat(getComputedStyle(dest).scrollMarginTop) || 0;
    if (Math.abs(dest.getBoundingClientRect().top - m) > 2) window.scrollTo({ top: dest.getBoundingClientRect().top + window.scrollY - m, behavior: 'instant' });
  };
  if (location.hash) {
    let mosso = false;
    const stop = () => { mosso = true; };
    ['wheel', 'touchstart', 'keydown'].forEach((ev) => window.addEventListener(ev, stop, { once: true, passive: true }));
    const prova = () => { if (!mosso) riallinea(); };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(prova);
    window.addEventListener('load', () => setTimeout(prova, 50));
  }
}

/* ---------- esercizio 1: dopo «Confermo l'ordine», otto punti neri sull'asse accanto alla lista (§9.2) ----------
   Solo grafica (aria-hidden), nessun testo nuovo; la logica dell'esercizio resta in esercizi.js. */
export function initAsseEsercizio() {
  const wrap = document.querySelector('.asse-wrap');
  const lista = document.getElementById('fonti');
  const ok = document.getElementById('fonti-ok');
  if (!wrap || !lista || !ok) return;
  const punti = el('div', { class: 'asse-punti', 'aria-hidden': 'true' });
  wrap.appendChild(punti);
  let mostra = false;
  const disegna = () => {
    punti.replaceChildren();
    if (!mostra) return;
    const top = wrap.getBoundingClientRect().top;
    for (const li of lista.children) {
      const r = li.getBoundingClientRect();
      const p = el('i');
      p.style.top = `${r.top - top + r.height / 2}px`;
      punti.appendChild(p);
    }
  };
  ok.addEventListener('click', () => { mostra = true; requestAnimationFrame(disegna); });
  lista.addEventListener('click', (e) => { if (e.target.closest('button')) { mostra = false; disegna(); } });
  window.addEventListener('resize', () => requestAnimationFrame(disegna));
}
