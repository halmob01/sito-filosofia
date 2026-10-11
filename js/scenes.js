/* Scene con scrollytelling (piano §4, §9.1, §9.3): tutte le aperture t1…t9 più quella dell'esercizio finale,
   e il grafico del ponte che si disegna con lo scroll.

   Principi:
   - l'SVG statico in index.html è già lo stato finale: senza JS, o se GSAP non carica, resta quello;
   - continuità: ogni scena parte dallo stato finale della precedente (la prima dal simbolo dell'hero);
   - desktop: apertura alta ~180vh con contenitore interno sticky in CSS (classe html.scena-alta, non il pin
     di GSAP) e una timeline legata allo scroll (scrub 0.8) con le fasi del brief; un solo gesto per scena;
   - tablet e mobile: nessuna altezza extra, un solo morph di 0.6s quando lo stage entra;
   - reduced motion: nessun ScrollTrigger sulle scene, altezza naturale, stati finali statici;
   - i colli si ricalcolano solo mentre la scena è in viewport (onToggle). */
import { STATES, mirrorState, createBlob, createShapes, renderShapes, lerpState, blobShapes, seedTransition } from './blob.js';
import { SCENE, INIZIO, xDi } from './scene-data.js';

const MQ_DESK = '(min-width: 1200px) and (prefers-reduced-motion: no-preference)';
const MQ_MOB = '(max-width: 1199px) and (prefers-reduced-motion: no-preference)';

const stato = (x) => (x.specchia ? mirrorState(STATES[x.stato]) : STATES[x.stato]);
const shift = (s, dx, dy) => ({ ...s, circles: s.circles.map((k) => ({ x: k.x + dx, y: k.y + dy, r: k.r })) });

/** Configurazioni delle scene con lo stato e il valore di partenza (quelli della scena precedente). */
function configurazioni() {
  return SCENE.map((x, i) => {
    const prima = i === 0 ? INIZIO : SCENE[i - 1];
    return {
      ...x,
      da: stato(prima), a: stato(x),
      v0: prima.valore == null ? 0 : prima.valore,
      root: document.querySelector(`${x.sel || '#' + x.id} .scena`),
    };
  }).filter((c) => c.root && c.root.querySelector('.stage-svg .blob'));
}

/** Prepara i nodi della scena: ricostruisce il blob statico con createBlob e prende gli elementi da animare. */
function prepara(cfg) {
  const { root } = cfg;
  const svg = root.querySelector('.stage-svg');
  const clip = svg.querySelector('clipPath');
  const rings = svg.querySelector('.s-rings');
  const blob = createBlob(svg.querySelector('.blob'), {
    fillId: 'b-' + cfg.id, variant: root.classList.contains('surf-dark') ? 'dark' : 'light', grain: true,
  });
  let clipSet = null;
  if (clip) { clip.replaceChildren(); clipSet = createShapes(clip); }
  const c0 = rings && rings.firstElementChild;
  const dot = svg.querySelector('.dot');
  const n = {
    svg, blob, dot, rings,
    vuoto: svg.querySelector('.dot-vuoto'),
    ringsCentro: c0 ? `${c0.getAttribute('cx')} ${c0.getAttribute('cy')}` : '300 300',
    linee: [svg.querySelector('.s-orbita'), svg.querySelector('.s-sotto'), svg.querySelector('.s-on'), svg.querySelector('.s-sopra'), rings].filter(Boolean),
    dotFinale: dot ? +dot.getAttribute('cx') : 0,
    draw(state) {
      const sh = blobShapes(state);
      for (const L of blob.layers) renderShapes(L, sh);
      if (clipSet) renderShapes(clipSet, sh);
    },
  };
  n.draw(cfg.a);                          // subito lo stato finale: identico all'SVG statico che abbiamo sostituito
  return n;
}

/** Riporta la scena allo stato finale statico (anche quando la media query cambia). */
function ripristina(gsap, n, cfg) {
  gsap.set([...n.linee, n.dot, n.vuoto].filter(Boolean), { clearProps: 'all' });
  if (n.dot) n.dot.setAttribute('cx', n.dotFinale);
  n.draw(cfg.a);
}

function desktop(gsap, ST, n, cfg) {
  const { root } = cfg;
  const [S0, S1] = seedTransition(cfg.da, cfg.a);
  const mid = shift(lerpState(S0, S1, 0.55), cfg.scarto[0], cfg.scarto[1]);
  const P = { m: 0 };                                   // 0..1: partenza → intermedio; 1..2: intermedio → finale
  const corrente = () => {
    if (P.m <= 0) return cfg.da;
    if (P.m >= 2) return cfg.a;
    return P.m <= 1 ? lerpState(S0, mid, P.m) : lerpState(mid, S1, P.m - 1);
  };
  let visibile = false;
  const disegna = () => { if (visibile) n.draw(corrente()); };

  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: { trigger: root, start: 'top top', end: 'bottom bottom', scrub: 0.8, invalidateOnRefresh: true },
    onUpdate: disegna,
  });
  // 0–15%: linee e assi entrano in opacità (il testo è già leggibile)
  tl.fromTo(n.linee, { opacity: 0 }, { opacity: 1, duration: 0.15 }, 0);
  // 15–45%: stato intermedio; il punto lilla si accende sul valore della tappa precedente
  tl.fromTo(P, { m: 0 }, { m: 1, duration: 0.30, ease: 'power1.inOut' }, 0.15);
  if (n.dot) {
    tl.fromTo(n.dot, { opacity: 0, attr: { cx: xDi(cfg.v0) } }, { opacity: 1, duration: 0.30 }, 0.15);
    // 45–70%: il punto scorre fino al valore della tappa (nella 6 entra nel foro)
    tl.fromTo(n.dot, { attr: { cx: xDi(cfg.v0) } }, { attr: { cx: n.dotFinale }, duration: 0.25, ease: 'power2.inOut', immediateRender: false }, 0.45);
  }
  // 45–70%: stato finale; anelli che si allargano di circa il 10% fino alla misura statica
  tl.fromTo(P, { m: 1 }, { m: 2, duration: 0.25, ease: 'power1.inOut', immediateRender: false }, 0.45);
  if (n.rings) {
    tl.fromTo(n.rings, { scale: 0.91, svgOrigin: n.ringsCentro }, { scale: 1, svgOrigin: n.ringsCentro, duration: 0.25, ease: 'power2.inOut' }, 0.45);
  }
  // tappa 9: compare anche l'anello vuoto («da dove arriva»)
  if (n.vuoto) tl.fromTo(n.vuoto, { opacity: 0 }, { opacity: 1, duration: 0.25 }, 0.45);
  tl.to({}, { duration: 0.30 }, 0.70);                  // 70–100%: fermo e leggibile

  // i colli si ricalcolano solo con la scena in viewport
  const vis = ST.create({
    trigger: root, start: 'top bottom', end: 'bottom top',
    onToggle: (self) => { visibile = self.isActive; if (visibile) n.draw(corrente()); },
  });
  const sync = () => { visibile = vis.isActive; n.draw(corrente()); };
  ST.addEventListener('refresh', sync);
  sync();

  return () => {
    ST.removeEventListener('refresh', sync);
    vis.kill(); if (tl.scrollTrigger) tl.scrollTrigger.kill(); tl.kill();
    ripristina(gsap, n, cfg);
  };
}

function mobile(gsap, ST, n, cfg) {
  // si parte quando entra lo stage (il blob), non l'apertura: il titolo viene prima
  const stage = n.svg.closest('.stage') || n.svg;
  if (stage.getBoundingClientRect().top < window.innerHeight * 0.8) return () => {};   // già vista: stato finale
  const P = { t: 0 };
  const [S0, S1] = seedTransition(cfg.da, cfg.a);
  n.draw(cfg.da);
  if (n.dot) n.dot.setAttribute('cx', xDi(cfg.v0));
  if (n.vuoto) gsap.set(n.vuoto, { opacity: 0 });
  const tw = [];
  const st = ST.create({
    trigger: stage, start: 'top 80%', once: true,
    onEnter: () => {
      const o = { duration: 0.6, ease: 'power2.inOut' };
      tw.push(gsap.to(P, { ...o, t: 1, onUpdate: () => n.draw(P.t >= 1 ? cfg.a : lerpState(S0, S1, P.t)) }));
      if (n.dot) tw.push(gsap.to(n.dot, { ...o, attr: { cx: n.dotFinale } }));
      if (n.vuoto) tw.push(gsap.to(n.vuoto, { ...o, opacity: 1 }));
    },
  });
  return () => { st.kill(); tw.forEach((t) => t.kill()); ripristina(gsap, n, cfg); };
}

/* ---------- ponte: la linea della storia si disegna con lo scroll e i nodi si accendono in ordine ----------
   La linea è il grafico di una funzione (x crescente), quindi basta scoprirla da sinistra con un clipPath:
   è più robusto di stroke-dashoffset con vector-effect non-scaling-stroke e preserveAspectRatio none. */
function ponte(gsap, ST) {
  const g = document.querySelector('.grafico');
  const svg = g && g.querySelector('.plot svg');
  if (!svg) return;
  const NS = 'http://www.w3.org/2000/svg';
  const W = svg.viewBox.baseVal.width || 830;
  const cp = document.createElementNS(NS, 'clipPath');
  cp.id = 'ponte-rivela';
  const rect = document.createElementNS(NS, 'rect');
  rect.setAttribute('x', '-10'); rect.setAttribute('y', '-10'); rect.setAttribute('height', '300'); rect.setAttribute('width', W + 20);
  cp.appendChild(rect);
  svg.prepend(cp);
  const linee = svg.querySelectorAll('.g-linea, .g-tratto');
  const nodi = [...g.querySelectorAll('.nodo')].map((a) => ({ a, x: (parseFloat(a.style.left) / 100) * W }));

  const mm = gsap.matchMedia();
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    linee.forEach((l) => l.setAttribute('clip-path', 'url(#ponte-rivela)'));
    const P = { w: 0 };
    const aggiorna = () => {
      rect.setAttribute('width', P.w + 10);
      for (const nd of nodi) nd.a.classList.toggle('spento', nd.x > P.w + 2);
    };
    aggiorna();
    const tw = gsap.to(P, {
      w: W + 10, ease: 'none', onUpdate: aggiorna,
      scrollTrigger: { trigger: g, start: 'top 75%', end: 'bottom 45%', scrub: 0.6 },
    });
    return () => {
      tw.scrollTrigger && tw.scrollTrigger.kill(); tw.kill();
      linee.forEach((l) => l.removeAttribute('clip-path'));
      rect.setAttribute('width', W + 20);
      nodi.forEach((nd) => nd.a.classList.remove('spento'));
    };
  });
}

export function initScene(gsap, ST) {
  const scene = configurazioni().map((cfg) => ({ cfg, n: prepara(cfg) }));
  const mm = gsap.matchMedia();
  mm.add({ desk: MQ_DESK, mob: MQ_MOB }, (ctx) => {
    const { desk, mob } = ctx.conditions;
    const html = document.documentElement;
    if (desk) html.classList.add('scena-alta');
    const pulizie = scene.map(({ cfg, n }) => (desk ? desktop(gsap, ST, n, cfg) : mob ? mobile(gsap, ST, n, cfg) : () => {}));
    return () => { pulizie.forEach((f) => f()); if (desk) html.classList.remove('scena-alta'); };
  });
  ponte(gsap, ST);
  return mm;
}
