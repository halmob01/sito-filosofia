// Genera l'SVG statico dello stato finale di ogni scena (piano §1.4) e lo scrive in index.html
// tra i marcatori <!--blob:tN--> … <!--/blob:tN-->. Senza JavaScript i blob si vedono comunque.
// Uso: node static-blobs.mjs [--check]   (--check non scrive: esce con 1 se index.html non è aggiornato)
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './lib.mjs';
import { STATES, mirrorState, blobMarkup, blobDefs, blobShapes } from '../js/blob.js';

const FILE = path.join(ROOT, 'index.html');
const check = process.argv.includes('--check');
let html = fs.readFileSync(FILE, 'utf8');

/* Tabella del piano §1.4: stato del blob, valore fuori→dentro (0 = estremo sinistro dell'asse, fuori dal blob;
   100 = centro del blob) e grappolo di anelli fitti, decentrato in un punto libero della scena.
   cluster = [cx, cy]; orbita = [dx, dy] spostamento del centro dell'orbita puntinata grande. */
const SCENE = {
  t1: { stato: 'B0', valore: 5, cluster: [136, 136], orbita: [0, 0] },
  t2: { stato: 'B1', valore: 25, cluster: [128, 148], orbita: [-6, 6] },
  t3: { stato: 'B3', valore: 55, cluster: [300, 80], orbita: [0, 0] },
  t4: { stato: 'B2', valore: 70, cluster: [155, 445], orbita: [6, 4] },
  t5: { stato: 'B4', valore: 85, cluster: [150, 150], orbita: [-4, 8] },
  t6: { stato: 'B3', valore: 95, cluster: [300, 522], orbita: [0, 0], puntoNelVuoto: true },
  t7: { stato: 'B5', valore: 60, cluster: [150, 142], orbita: [4, -6] },
  t8: { stato: 'B2', specchia: true, valore: 45, cluster: [445, 445], orbita: [-6, 4] },
  t9: { stato: 'B4', valore: 85, vuoto: 20, cluster: [160, 460], orbita: [6, 2] },
  finale: { stato: 'B0', valore: null, cluster: [464, 136], orbita: [0, 0] },
};
const AX0 = 24, AX1 = 300, AY = 300;                  // asse fuori→dentro
const xDi = (v) => +(AX0 + (AX1 - AX0) * v / 100).toFixed(1);

const n1 = (x) => (Math.round(x * 10) / 10).toString();

/** Grappolo di anelli fitti, ognuno col centro spostato un poco (come nel riferimento 05). */
function grappolo([cx, cy], r0 = 10, n = 6, step = 4, dx = 0.7) {
  const cs = [];
  for (let i = 0; i < n; i++) cs.push(`<circle cx="${n1(cx + i * dx)}" cy="${cy}" r="${n1(r0 + i * step)}"/>`);
  return `<g class="s-rings">${cs.join('')}</g>`;
}

/** Guide da 1px e asse con tick ogni 10; cls = prefisso di classe (s- normale, s-on sopra il blob su chiaro). */
function guide({ cross = false } = {}) {
  let s = '';
  if (cross) {
    s += '<line class="s-guida" x1="300" y1="0" x2="300" y2="600"/><line class="s-guida" x1="0" y1="300" x2="600" y2="300"/>';
    return s;
  }
  s += `<line class="s-guida" x1="${AX0}" y1="0" x2="${AX0}" y2="600"/><line class="s-guida" x1="${AX1}" y1="0" x2="${AX1}" y2="600"/>`;
  s += `<line class="s-asse" x1="${AX0}" y1="${AY}" x2="${AX1}" y2="${AY}"/><g class="s-tick">`;
  for (let i = 0; i <= 10; i++) {
    const x = xDi(i * 10), half = i % 5 === 0 ? 9 : 5;
    s += `<line x1="${x}" y1="${AY - half}" x2="${x}" y2="${AY + half}"/>`;
  }
  return s + '</g>';
}

const SVG_OPEN = (cls) => `<svg class="${cls}" viewBox="0 0 600 600" aria-hidden="true" focusable="false">`;

/** Una scena completa: defs, orbita, grappolo, blob, guide, punti. */
function scena(id, cfg, scuro) {
  const stato = cfg.specchia ? mirrorState(STATES[cfg.stato]) : STATES[cfg.stato];
  const bid = `b-${id}`;
  const variant = scuro ? 'dark' : 'light';
  const shapes = blobShapes(stato);
  const clip = shapes.circles.filter((k) => +k.r > 0).map((k) => `<circle cx="${k.cx}" cy="${k.cy}" r="${k.r}"/>`).join('')
    + shapes.necks.filter(Boolean).map((d) => `<path d="${d}"/>`).join('');
  const [ox, oy] = cfg.orbita;
  let s = SVG_OPEN('stage-svg');
  s += `<defs>${blobDefs(bid, variant, { grain: true })}${scuro ? '' : `<clipPath id="${bid}-c">${clip}</clipPath>`}</defs>`;
  s += `<circle class="s-orbita" cx="${300 + ox}" cy="${300 + oy}" r="270"/>`;
  s += grappolo(cfg.cluster);
  if (!scuro) s += `<g class="s-sotto">${guide()}</g>`;
  s += `<g class="blob">${blobMarkup(stato, { id: bid, variant, grain: true })}</g>`;
  // sopra il blob: su scuro le stesse guide chiare; su chiaro una copia color carta ritagliata sulla sagoma
  s += scuro ? `<g class="s-sopra">${guide()}</g>` : `<g class="s-on" clip-path="url(#${bid}-c)">${guide()}</g>`;
  if (cfg.valore != null) s += `<circle class="dot" cx="${xDi(cfg.valore)}" cy="${AY}" r="11"/>`;
  if (cfg.vuoto != null) s += `<circle class="dot-vuoto" cx="${xDi(cfg.vuoto)}" cy="${AY}" r="9"/>`;
  return s + '</svg>';
}

/** Hero: stato HERO (tre lobi a V più un disco separato, mockup home P1), orbita lilla sottile e punto lilla. */
function hero() {
  const stato = STATES.HERO;
  const T = 'translate(30 30) scale(0.9)';
  const shapes = blobShapes(stato);
  const clip = shapes.circles.filter((k) => +k.r > 0).map((k) => `<circle cx="${k.cx}" cy="${k.cy}" r="${k.r}"/>`).join('')
    + shapes.necks.filter(Boolean).map((d) => `<path d="${d}"/>`).join('');
  const ang = (-63 * Math.PI) / 180;
  let s = SVG_OPEN('stage-svg hero-svg');
  s += `<defs>${blobDefs('b-hero', 'light', { grain: true })}<clipPath id="b-hero-c" transform="${T}">${clip}</clipPath></defs>`;
  s += '<circle class="s-orbita-lilla" cx="300" cy="300" r="272"/>';
  s += `<g class="s-sotto">${guide({ cross: true })}</g>`;
  s += `<g class="blob" transform="${T}">${blobMarkup(stato, { id: 'b-hero', variant: 'light', grain: true })}</g>`;
  s += `<g class="s-on" clip-path="url(#b-hero-c)">${guide({ cross: true })}</g>`;
  s += `<circle class="dot" cx="${n1(300 + 272 * Math.cos(ang))}" cy="${n1(300 + 272 * Math.sin(ang))}" r="11"/>`;
  return s + '</svg>';
}

/** Simbolo dell'header: LOGO in tinta unita, ritagliato sul riquadro del blob. */
function logo() {
  return '<svg class="logo" viewBox="30 30 540 540" width="32" height="32" aria-hidden="true" focusable="false">'
    + `<g>${blobMarkup(STATES.LOGO, { flat: true })}</g></svg>`;
}

/** Anelli di sfondo del ponte: poche circonferenze tenui e un grappolo, non un bersaglio. */
function ponte() {
  return SVG_OPEN('rings-bg')
    + '<circle class="s-orbita" cx="300" cy="300" r="470"/>'
    + '<g class="s-rings"><circle cx="300" cy="300" r="190"/><circle cx="300" cy="300" r="330"/></g>'
    + grappolo([452, 196], 26, 7, 6, 1)
    + '</svg>';
}

/* superficie di ogni tappa, letta da index.html */
function superficie(id) {
  const m = html.match(new RegExp(`id="${id}"[\\s\\S]*?class="scena[^"]*surf-(light|dark)`));
  if (!m) throw new Error('superficie non trovata per ' + id);
  return m[1] === 'dark';
}

function scrivi(chiave, svg) {
  const re = new RegExp(`(<!--blob:${chiave}-->)[\\s\\S]*?(<!--/blob:${chiave}-->)`);
  if (!re.test(html)) throw new Error(`marcatori mancanti: blob:${chiave}`);
  html = html.replace(re, (_, a, b) => a + svg + b);
}

scrivi('logo', logo());
scrivi('hero', hero());
scrivi('ponte', ponte());
for (const [id, cfg] of Object.entries(SCENE)) {
  const sel = id === 'finale' ? 'domande' : id;
  scrivi(id, scena(id, cfg, superficie(sel)));
}

const attuale = fs.readFileSync(FILE, 'utf8');
if (check) {
  if (attuale !== html) { console.error('index.html non è aggiornato: lancia node static-blobs.mjs'); process.exit(1); }
  console.log('blob statici aggiornati');
} else {
  fs.writeFileSync(FILE, html);
  console.log('blob statici scritti in index.html (' + Object.keys(SCENE).length + ' scene, hero, header, ponte)');
}
