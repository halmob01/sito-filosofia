/* BlobShape: libreria dei blob vettoriali e parametrici (piano §3, brief §5).

   Un blob è sempre un insieme di 4 cerchi più i colli concavi tra i cerchi collegati.
   I colli si calcolano con l'algoritmo dei «metaball» in 2D (tangenti tra due cerchi con
   maniglie di Bézier, come nel noto «SVG metaballs» di Varun Vachhar, ispirato a Hiroyuki Sato).
   Il morph tra due stati è quindi solo un'interpolazione di centri, raggi e pesi dei collegamenti:
   continuo, vettoriale e senza plugin.

   Il modulo non tocca il DOM quando viene importato: lo usano sia il browser (createBlob,
   renderBlob) sia Node (blobMarkup, per tools/static-blobs.mjs).

   Coordinate: viewBox 0 0 600 600, centro di massa vicino a (300, 300).
   Stato = { circles: [{x, y, r} × 4], links: [[i, j] | [i, j, peso], …], k: raccordo }.
   k è il raggio dei raccordi concavi dei colli, in frazione del raggio medio dei due lobi collegati:
   0.92 dà quasi il foro circolare di B3 (come nel riferimento 06), valori più bassi danno colli più stretti.
   I cerchi inutilizzati hanno r = 0 e stanno sopra un cerchio usato, così nel morph
   «nascono» da dentro la forma e non dal nulla. */

export const VIEWBOX = 600;
const PAIRS = [[0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3]];
const c = (x, y, r) => ({ x, y, r });

/* ---------- gli stati ---------- */
export const STATES = {
  // B0: disco isolato
  B0: {
    circles: [c(300, 300, 190), c(300, 300, 0), c(300, 300, 0), c(300, 300, 0)],
    links: [], k: 0.8,
  },
  // B1: due nuclei uniti da un collo morbido e corto
  B1: {
    circles: [c(212, 322, 126), c(438, 256, 88), c(438, 256, 0), c(212, 322, 0)],
    links: [[0, 1]], k: 0.62,
  },
  // B2: tre lobi quasi uguali disposti a L, asimmetrico ma bilanciato; colli corti e concavi (riferimento 06, in alto a sinistra)
  B2: {
    circles: [c(163, 252, 92), c(380, 232, 100), c(360, 446, 88), c(380, 232, 0)],
    links: [[0, 1], [1, 2]], k: 0.55,
  },
  // B3: quattro lobi agli angoli di un quadrato, collegati solo tra vicini: foro centrale netto e circolare
  B3: {
    circles: [c(175, 175, 92), c(425, 175, 92), c(175, 425, 92), c(425, 425, 92)],
    links: [[0, 1], [1, 3], [3, 2], [2, 0]], k: 0.92,
  },
  // B4: nodo allargato e compatto, tre lobi simili in fila (leggermente arcuata) con strozzature concave visibili
  B4: {
    circles: [c(148, 322, 74), c(300, 280, 82), c(452, 322, 74), c(300, 280, 0)],
    links: [[0, 1], [1, 2]], k: 0.45,
  },
  // B5: il sistema si separa in tre elementi; i collegamenti restano dichiarati ma oltre la soglia il collo sparisce
  B5: {
    circles: [c(176, 336, 112), c(448, 226, 76), c(378, 458, 44), c(176, 336, 0)],
    links: [[0, 1], [0, 2], [1, 2]], k: 0.4,
  },
  // HERO: tre lobi connessi a V asimmetrica (hub e due bracci) più un disco separato, come nel mockup home P1
  HERO: {
    circles: [c(290, 300, 78), c(175, 175, 98), c(200, 440, 82), c(470, 195, 62)],
    links: [[0, 1], [0, 2]], k: 0.6,
  },
  // LOGO: il simbolo del brand (quattro lobi più larghi, foro piccolo)
  LOGO: {
    circles: [c(150, 150, 108), c(450, 150, 108), c(150, 450, 108), c(450, 450, 108)],
    links: [[0, 1], [1, 3], [3, 2], [2, 0]], k: 0.96,
  },
};

/* specchia uno stato in orizzontale (serve a non ripetere identica la stessa forma in due scene) */
export function mirrorState(s) {
  return {
    circles: s.circles.map((k) => c(VIEWBOX - k.x, k.y, k.r)),
    links: s.links.map((l) => l.slice()),
    k: s.k,
  };
}

/* ---------- geometria dei colli ---------- */
const hyp = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
const f1 = (n) => (Math.round(n * 10) / 10).toString();

/* Collo tra due cerchi con raccordi circolari di raggio f (arco di cerchio tangente ai due lobi).
   I raccordi sono archi veri di cerchio: le curvature restano continue e il foro di B3 viene circolare.
   Quando i cerchi si allontanano il collo si assottiglia fino a zero (vita ≤ 0): la separazione
   è continua, senza «pop». Restituisce '' se il collo non esiste. */
export function neckPath(a, b, f) {
  const d = hyp(a.x, a.y, b.x, b.y);
  if (a.r < 0.5 || b.r < 0.5 || d < 0.01 || d <= Math.abs(a.r - b.r) + 0.01) return '';
  const A = a.r + f;
  const B = b.r + f;
  if (d >= A + B) return '';
  const x = (A * A - B * B + d * d) / (2 * d);
  const h2 = A * A - x * x;
  if (h2 <= 0) return '';
  const h = Math.sqrt(h2);
  if (h - f < 0.5) return '';            // la vita si è chiusa: niente collo
  const th = Math.atan2(b.y - a.y, b.x - a.x);
  const ux = Math.cos(th), uy = Math.sin(th);
  const P = (q) => `${f1(q[0])} ${f1(q[1])}`;
  const sides = [1, -1].map((sg) => {
    const nx = -uy * sg, ny = ux * sg;
    const F = [a.x + ux * x + nx * h, a.y + uy * x + ny * h];            // centro del raccordo
    const T1 = [a.x + (F[0] - a.x) * (a.r / A), a.y + (F[1] - a.y) * (a.r / A)];
    const T2 = [b.x + (F[0] - b.x) * (b.r / B), b.y + (F[1] - b.y) * (b.r / B)];
    return { F, T1, T2 };
  });
  const sweep = (F, p, q) => ((p[0] - F[0]) * (q[1] - F[1]) - (p[1] - F[1]) * (q[0] - F[0]) > 0 ? 1 : 0);
  const [s1, s2] = sides;
  const R = f1(f);
  return `M${P(s1.T1)}A${R} ${R} 0 0 ${sweep(s1.F, s1.T1, s1.T2)} ${P(s1.T2)}`
    + `L${P(s2.T2)}A${R} ${R} 0 0 ${sweep(s2.F, s2.T2, s2.T1)} ${P(s2.T1)}Z`;
}

/* pesi dei sei collegamenti possibili (0 se non dichiarato) */
function weights(state) {
  const w = PAIRS.map(() => 0);
  for (const l of state.links) {
    const i = PAIRS.findIndex((p) => p[0] === Math.min(l[0], l[1]) && p[1] === Math.max(l[0], l[1]));
    if (i >= 0) w[i] = l.length > 2 ? l[2] : 1;
  }
  return w;
}

/* tutte le forme di uno stato: cerchi con r > 0 e un path per ogni collo visibile.
   Restituisce sempre 4 cerchi e 6 colli (path vuoto se assente): serve a renderBlob per aggiornare i nodi. */
export function blobShapes(state) {
  const w = weights(state);
  const k = state.k == null ? 0.8 : state.k;
  const circles = state.circles.map((q) => ({ cx: f1(q.x), cy: f1(q.y), r: f1(Math.max(0, q.r)) }));
  const necks = PAIRS.map(([i, j], n) => {
    if (w[n] <= 0.004) return '';
    const a = state.circles[i], b = state.circles[j];
    return neckPath(a, b, k * ((a.r + b.r) / 2) * w[n]);
  });
  return { circles, necks };
}

/* ---------- interpolazione ---------- */
export function lerpState(a, b, t) {
  const L = (x, y) => x + (y - x) * t;
  const wa = weights(a);
  const wb = weights(b);
  const links = [];
  PAIRS.forEach((p, n) => {
    const w = L(wa[n], wb[n]);
    if (w > 0.002) links.push([p[0], p[1], w]);
  });
  return {
    circles: a.circles.map((k, i) => c(L(k.x, b.circles[i].x), L(k.y, b.circles[i].y), L(k.r, b.circles[i].r))),
    links,
    k: L(a.k == null ? 0.8 : a.k, b.k == null ? 0.8 : b.k),
  };
}

/* ---------- riempimento ---------- */
/* Una sola luce laterale tenue (in alto a sinistra) e aspetto opaco. Il gradiente è in userSpaceOnUse
   e condiviso da tutti i pezzi: così le giunture tra cerchi e colli non si vedono. */
export const FILLS = {
  // blob su superficie chiara: nero → antracite
  light: { stops: [[0, '#2F2F2F'], [0.55, '#161616'], [1, '#0A0A0A']], rim: null },
  // blob su superficie scura, scelta: grigio scuro vellutato con il bordo appena più chiaro (come nel P0)
  dark: { stops: [[0, '#45474C'], [0.5, '#2A2B2E'], [1, '#18191B']], rim: 'rgba(255,255,255,0.30)' },
  // alternative provate (solo per il laboratorio): grigio freddo chiaro e off-white
  darkCool: { stops: [[0, '#A3AAB4'], [0.55, '#767C86'], [1, '#585D66']], rim: null },
  darkPaper: { stops: [[0, '#F4F4F2'], [0.6, '#DCDCD8'], [1, '#C4C4C0']], rim: null },
};

/* markup dei defs: gradiente condiviso e, se richiesta, la grana statica (feTurbulence, mai animata) */
export function blobDefs(id, variant = 'light', { grain = false } = {}) {
  const f = FILLS[variant] || FILLS.light;
  const stops = f.stops.map(([o, col]) => `<stop offset="${o}" stop-color="${col}"/>`).join('');
  let s = `<radialGradient id="${id}-g" gradientUnits="userSpaceOnUse" cx="200" cy="180" r="470">${stops}</radialGradient>`;
  if (grain) {
    s += `<filter id="${id}-n" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">`
      + `<feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="t"/>`
      + `<feColorMatrix in="t" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1.6 -0.4" result="w"/>`
      + `<feComposite in="w" in2="SourceAlpha" operator="in"/></filter>`;
  }
  return s;
}

/* Strati del blob, dal basso: bordo (solo su scuro), corpo, grana (opzionale).
   opts: { id, variant, flat, grain }. flat = tinta unita currentColor (simbolo dell'header). */
function layers(opts) {
  const f = FILLS[opts.variant || 'light'] || FILLS.light;
  const fill = opts.flat ? 'currentColor' : `url(#${opts.id}-g)`;
  const L = [];
  if (f.rim && !opts.flat) L.push({ cls: 'b-rim', attrs: { fill, stroke: f.rim, 'stroke-width': '2', 'vector-effect': 'non-scaling-stroke' } });
  L.push({ cls: 'b-body', attrs: { fill } });
  if (opts.grain && !opts.flat) L.push({ cls: 'b-grain', attrs: { fill: '#fff', filter: `url(#${opts.id}-n)`, opacity: '0.05' } });
  return L;
}

const attrStr = (o) => Object.entries(o).map(([k, v]) => ` ${k}="${v}"`).join('');

/* Markup di un blob (solo il gruppo). Per Node e per il rendering iniziale. */
export function blobMarkup(state, opts = {}) {
  const sh = blobShapes(state);
  return layers(opts).map((l) => {
    const cs = sh.circles.filter((k) => +k.r > 0).map((k) => `<circle cx="${k.cx}" cy="${k.cy}" r="${k.r}"/>`).join('');
    const ps = sh.necks.filter(Boolean).map((d) => `<path d="${d}"/>`).join('');
    return `<g class="${l.cls}"${attrStr(l.attrs)}>${cs}${ps}</g>`;
  }).join('');
}

/* ---------- DOM ---------- */
const NS = 'http://www.w3.org/2000/svg';

/* Insieme di 4 cerchi e 6 colli dentro un nodo qualsiasi (anche un <clipPath>, che non ammette gruppi). */
export function createShapes(parent) {
  const doc = parent.ownerDocument;
  return {
    circles: [0, 1, 2, 3].map(() => parent.appendChild(doc.createElementNS(NS, 'circle'))),
    necks: PAIRS.map(() => parent.appendChild(doc.createElementNS(NS, 'path'))),
  };
}

/* Scrive le forme calcolate da blobShapes nei nodi (cerchi con r = 0 e colli assenti restano vuoti). */
export function renderShapes(set, sh) {
  sh.circles.forEach((k, i) => {
    const el = set.circles[i];
    el.setAttribute('cx', k.cx); el.setAttribute('cy', k.cy); el.setAttribute('r', k.r);
  });
  sh.necks.forEach((d, i) => set.necks[i].setAttribute('d', d));
}

/* Crea i nodi SVG dentro svgGroup (un <g>). Il riempimento (defs) deve già esistere: vedi blobDefs.
   Se il gruppo contiene già un blob statico, lo svuota e lo ricostruisce con la stessa struttura.
   opts: { fillId, variant, flat, grain } — fillId è l'id passato a blobDefs. */
export function createBlob(svgGroup, opts = {}) {
  const doc = svgGroup.ownerDocument;
  const o = { id: opts.fillId, variant: opts.variant, flat: opts.flat, grain: opts.grain };
  svgGroup.replaceChildren();
  const blob = { group: svgGroup, layers: [] };
  for (const l of layers(o)) {
    const g = doc.createElementNS(NS, 'g');
    g.setAttribute('class', l.cls);
    for (const [k, v] of Object.entries(l.attrs)) g.setAttribute(k, v);
    svgGroup.appendChild(g);
    blob.layers.push(createShapes(g));
  }
  return blob;
}

/* Scrive lo stato nei nodi di tutti gli strati. */
export function renderBlob(blob, state) {
  const sh = blobShapes(state);
  for (const L of blob.layers) renderShapes(L, sh);
  return blob;
}

/* ---------- semi per le transizioni ----------
   Un cerchio che compare (r = 0 nello stato di partenza) non nasce dal nulla: parte già con il 38% del raggio
   finale, nascosto dentro il lobo più grande, e scivola fuori; così si legge subito come un secondo nucleo.
   Allo stesso modo un cerchio che sparisce rientra nel lobo più grande. Gli stati restituiti si usano solo
   durante la transizione: agli estremi si disegnano gli stati originali (identici all'SVG statico). */
function semina(base, verso) {
  const vis = base.circles.filter((k) => k.r >= 0.5);
  if (!vis.length) return base;
  const host = vis.reduce((m, k) => (k.r > m.r ? k : m));
  return {
    ...base,
    circles: base.circles.map((k, i) => {
      const t = verso.circles[i];
      if (k.r >= 0.5 || t.r < 0.5) return k;
      const r = 0.38 * t.r;
      const dx = t.x - host.x, dy = t.y - host.y, d = Math.hypot(dx, dy) || 1;
      const off = Math.max(0, host.r - r - 4);
      return { x: host.x + (dx / d) * off, y: host.y + (dy / d) * off, r };
    }),
  };
}
export function seedTransition(da, a) {
  return [semina(da, a), semina(a, da)];
}
