// Confronto dei testi: reference/contenuti-approvati.html contro index.html.
// Si confronta il testo visibile di #apertura, .tappa e #domande, escludendo
// gli elementi con aria-hidden="true" e quelli con attributo data-ui (testi UI ammessi, §0.3).
// Uso: node check-content.mjs [file-nuovo.html]   (esce con codice 1 se ci sono differenze)
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, launch } from './lib.mjs';

const approvato = path.join(ROOT, 'reference', 'contenuti-approvati.html');
const nuovo = path.resolve(process.argv[2] || path.join(ROOT, 'index.html'));

// Eseguito dentro la pagina: elenco dei blocchi di testo per ciascun ambito.
function estrai() {
  const SCOPI = [
    ['#apertura', () => [document.querySelector('#apertura')]],
    ['.tappa', () => [...document.querySelectorAll('.tappa')]],
    ['#domande', () => [document.querySelector('#domande')]],
  ];
  const escluso = (el) => el.closest('[aria-hidden="true"], [data-ui]');
  const out = {};
  for (const [nome, trova] of SCOPI) {
    const parti = [];
    for (const radice of trova()) {
      if (!radice) { parti.push('[ambito mancante]'); continue; }
      const w = document.createTreeWalker(radice, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = w.nextNode())) {
        if (escluso(n.parentElement)) continue;
        if (['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(n.parentElement.tagName)) continue;
        parti.push(n.nodeValue);
      }
    }
    out[nome] = parti.join('');
  }
  return out;
}

const browser = await launch();
async function leggi(file) {
  // JavaScript disattivato: il testo si legge come arriva nel markup (niente rimescolamento delle voci)
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto(pathToFileURL(file).href);
  const r = await page.evaluate(estrai);
  await ctx.close();
  return r;
}
const norm = (s) => s.replace(/\s+/g, ' ').trim();
const compatta = (s) => s.replace(/\s+/g, '');

const a = await leggi(approvato);
const b = await leggi(nuovo);
await browser.close();

let differenze = 0;
for (const k of Object.keys(a)) {
  const A = compatta(a[k]), B = compatta(b[k]);
  if (A === B) { console.log(`ok   ${k}  (${norm(a[k]).length} caratteri)`); continue; }
  differenze++;
  let i = 0; while (i < A.length && A[i] === B[i]) i++;
  console.log(`DIFF ${k}: primo scarto al carattere ${i} (senza spazi)`);
  console.log('  approvato: …' + A.slice(Math.max(0, i - 40), i + 60));
  console.log('  nuovo:     …' + B.slice(Math.max(0, i - 40), i + 60));
  // confronto per parole, per dare un elenco leggibile
  const wa = norm(a[k]).split(' '), wb = norm(b[k]).split(' ');
  const sa = new Map(), sb = new Map();
  wa.forEach((w) => sa.set(w, (sa.get(w) || 0) + 1)); wb.forEach((w) => sb.set(w, (sb.get(w) || 0) + 1));
  const manca = [], extra = [];
  for (const [w, c] of sa) if ((sb.get(w) || 0) < c) manca.push(w);
  for (const [w, c] of sb) if ((sa.get(w) || 0) < c) extra.push(w);
  if (manca.length) console.log('  parole mancanti:', manca.slice(0, 30).join(' | '));
  if (extra.length) console.log('  parole in più:  ', extra.slice(0, 30).join(' | '));
}
console.log(differenze === 0 ? '\n0 differenze' : `\n${differenze} ambiti con differenze`);
process.exit(differenze ? 1 : 0);
