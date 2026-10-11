/* Scene con scrollytelling (piano §4). In F3 c'è una sola scena: la transizione verso la tappa 2.
   Lo stage di t2 parte dallo stato finale di t1 (B0) e arriva a B1; il punto lilla scorre dal valore 5 al 25.

   Principi:
   - l'SVG statico dentro index.html è già lo stato finale: senza JS, o se GSAP non carica, resta quello;
   - desktop: apertura alta ~180vh con contenitore interno sticky in CSS (classe html.scena-alta, non il pin di GSAP)
     e una timeline legata allo scroll (scrub 0.8) con le fasi del brief;
   - tablet e mobile: nessuna altezza extra, un solo morph di 0.6s quando la scena entra;
   - reduced motion: nessun ScrollTrigger, altezza naturale, stato finale statico;
   - i colli si ricalcolano solo mentre la scena è in viewport (onToggle). */
import { STATES, createBlob, createShapes, renderShapes, lerpState, blobShapes, seedTransition } from './blob.js';

const AX0 = 24, AX1 = 300;                       // asse fuori→dentro dello stage
const xDi = (v) => AX0 + (AX1 - AX0) * v / 100;
const smooth = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);   // power1.inOut

const MQ_DESK = '(min-width: 1200px) and (prefers-reduced-motion: no-preference)';
const MQ_MOB = '(max-width: 1199px) and (prefers-reduced-motion: no-preference)';

/** Scena t2: dallo stato finale di t1 al proprio. */
const SCENE = {
  id: 't2',
  da: STATES.B0, a: STATES.B1,
  v0: 5, v1: 25,
  // spostamento del centro nello stato intermedio: 7% e 4% del riquadro (limite del brief 10–15%)
  scarto: [-42, 26],
};

function shift(s, dx, dy) {
  return { circles: s.circles.map((k) => ({ x: k.x + dx, y: k.y + dy, r: k.r })), links: s.links, k: s.k };
}

/** Prepara i nodi della scena: ricostruisce il blob statico con createBlob e prende gli elementi da animare. */
function prepara(root, cfg) {
  const svg = root.querySelector('.stage-svg');
  const g = svg.querySelector('.blob');
  const clip = svg.querySelector('clipPath');
  const dot = svg.querySelector('.dot');
  const rings = svg.querySelector('.s-rings');
  const id = 'b-' + cfg.id;
  const blob = createBlob(g, { fillId: id, variant: root.classList.contains('surf-dark') ? 'dark' : 'light', grain: true });
  let clipSet = null;
  if (clip) { clip.replaceChildren(); clipSet = createShapes(clip); }
  const c0 = rings && rings.firstElementChild;
  const n = {
    svg, blob, clipSet, dot, rings,
    ringsCentro: c0 ? [+c0.getAttribute('cx'), +c0.getAttribute('cy')] : [300, 300],
    linee: [svg.querySelector('.s-orbita'), svg.querySelector('.s-sotto'), svg.querySelector('.s-on'), svg.querySelector('.s-sopra'), rings].filter(Boolean),
    dotFinale: dot ? +dot.getAttribute('cx') : 0,
    draw(state) {
      const sh = blobShapes(state);
      for (const L of blob.layers) renderShapes(L, sh);
      if (clipSet) renderShapes(clipSet, sh);
    },
  };
  n.draw(cfg.a);                                   // subito lo stato finale: identico all'SVG statico che abbiamo sostituito
  return n;
}

/** Riporta la scena allo stato finale statico (anche quando la media query cambia). */
function ripristina(gsap, n, cfg) {
  gsap.set([...n.linee, n.dot].filter(Boolean), { clearProps: 'all' });
  if (n.dot) n.dot.setAttribute('cx', n.dotFinale);
  n.draw(cfg.a);
}

function desktop(gsap, ST, n, cfg, root) {
  const html = document.documentElement;
  html.classList.add('scena-alta');
  const [S0, S1] = seedTransition(cfg.da, cfg.a);
  const mid = shift(lerpState(S0, S1, 0.55), cfg.scarto[0], cfg.scarto[1]);
  const P = { m: 0 };                                            // 0..1: da → intermedio; 1..2: intermedio → finale
  const stato = () => {
    if (P.m <= 0) return cfg.da;
    if (P.m >= 2) return cfg.a;
    return P.m <= 1 ? lerpState(S0, mid, P.m) : lerpState(mid, S1, P.m - 1);
  };
  let visibile = false;
  const disegna = () => { if (visibile) n.draw(stato()); };

  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: root, start: 'top top', end: 'bottom bottom', scrub: 0.8, invalidateOnRefresh: true,
    },
    onUpdate: disegna,
  });
  // 0–15%: linee e assi entrano in opacità (il testo è già leggibile)
  tl.fromTo(n.linee, { opacity: 0 }, { opacity: 1, duration: 0.15 }, 0);
  // 15–45%: stato intermedio; il punto lilla si accende sulla posizione di partenza
  tl.fromTo(P, { m: 0 }, { m: 1, duration: 0.30, ease: 'power1.inOut' }, 0.15);
  if (n.dot) {
    n.dot.setAttribute('cx', xDi(cfg.v0));
    tl.fromTo(n.dot, { opacity: 0 }, { opacity: 1, duration: 0.30 }, 0.15);
    // 45–70%: il punto scorre fino al valore della tappa
    tl.fromTo(n.dot, { attr: { cx: xDi(cfg.v0) } }, { attr: { cx: n.dotFinale }, duration: 0.25, ease: 'power2.inOut' }, 0.45);
  }
  // 45–70%: stato finale e anelli che si allargano di circa il 10% (partono al 91%, arrivano alla misura statica)
  tl.fromTo(P, { m: 1 }, { m: 2, duration: 0.25, ease: 'power1.inOut', immediateRender: false }, 0.45);
  if (n.rings) {
    tl.fromTo(n.rings, { scale: 0.91, svgOrigin: n.ringsCentro.join(' ') }, { scale: 1, svgOrigin: n.ringsCentro.join(' '), duration: 0.25, ease: 'power2.inOut' }, 0.45);
  }
  tl.to({}, { duration: 0.30 }, 0.70);                           // 70–100%: fermo e leggibile

  // i colli si ricalcolano solo con la scena in viewport
  const vis = ST.create({
    trigger: root, start: 'top bottom', end: 'bottom top',
    onToggle: (self) => { visibile = self.isActive; if (visibile) n.draw(stato()); },
  });
  const sync = () => { visibile = vis.isActive; n.draw(stato()); };
  ST.addEventListener('refresh', sync);
  sync();

  return () => {                                                 // pulizia: media query cambiata
    ST.removeEventListener('refresh', sync);
    vis.kill(); tl.scrollTrigger && tl.scrollTrigger.kill(); tl.kill();
    html.classList.remove('scena-alta');
    ripristina(gsap, n, cfg);
  };
}

function mobile(gsap, ST, n, cfg) {
  // si parte quando entra lo stage (il blob), non l'apertura: il titolo viene prima e il blob è più in basso
  const stage = n.svg.closest('.stage') || n.svg;
  const dentro = stage.getBoundingClientRect().top < window.innerHeight * 0.8;
  if (dentro) return () => {};                                   // già vista o già superata: resta lo stato finale
  const P = { t: 0 };
  const [S0, S1] = seedTransition(cfg.da, cfg.a);
  n.draw(cfg.da);
  if (n.dot) n.dot.setAttribute('cx', xDi(cfg.v0));
  let tw = null;
  const st = ST.create({
    trigger: stage, start: 'top 80%', once: true,
    onEnter: () => {
      tw = gsap.to(P, { t: 1, duration: 0.6, ease: 'power2.inOut', onUpdate: () => n.draw(P.t >= 1 ? cfg.a : lerpState(S0, S1, P.t)) });
      if (n.dot) gsap.to(n.dot, { attr: { cx: n.dotFinale }, duration: 0.6, ease: 'power2.inOut' });
    },
  });
  return () => { st.kill(); if (tw) tw.kill(); ripristina(gsap, n, cfg); };
}

export function initScene(gsap, ST) {
  const root = document.querySelector(`#${SCENE.id} .scena`);
  if (!root) return null;
  const n = prepara(root, SCENE);
  const mm = gsap.matchMedia();
  mm.add({ desk: MQ_DESK, mob: MQ_MOB }, (ctx) => {
    const { desk, mob } = ctx.conditions;
    if (desk) return desktop(gsap, ST, n, SCENE, root);
    if (mob) return mobile(gsap, ST, n, SCENE, root);
    return undefined;
  });
  return mm;
}
