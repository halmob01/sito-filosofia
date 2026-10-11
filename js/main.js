/* Avvio: classe js, navigazione, esercizio 1, poi GSAP e scene.
   Se GSAP non carica o qualcosa va storto restano gli stati statici dell'HTML e la navigazione funziona lo stesso. */
import { initNav, initAsseEsercizio } from './nav.js';
import { initScene } from './scenes.js';

const html = document.documentElement;
html.classList.add('js');

try { initNav(); } catch (e) { console.warn('Navigazione non attivata:', e && e.message); }
try { initAsseEsercizio(); } catch (e) { console.warn('Asse dell’esercizio non attivato:', e && e.message); }

function avvia() {
  const gsap = window.gsap;
  const ST = window.ScrollTrigger;
  if (!gsap || !ST) {                                   // vendor non caricato: tutto resta com'è nell'HTML
    html.classList.remove('scena-alta');
    return;
  }
  try {
    gsap.registerPlugin(ST);
    initScene(gsap, ST);
    // i font cambiano le altezze: ricalcolare dopo il caricamento
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ST.refresh());
    window.addEventListener('load', () => ST.refresh());
  } catch (e) {
    html.classList.remove('scena-alta');
    console.warn('Scene non attivate:', e && e.message);
  }
}

avvia();
