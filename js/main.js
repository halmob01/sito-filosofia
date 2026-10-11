/* Avvio: classe js, GSAP e scene. Se GSAP non carica o qualcosa va storto resta lo stato statico dell'HTML. */
import { initScene } from './scenes.js';

const html = document.documentElement;
html.classList.add('js');

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
