// Utilità condivise dai test: server locale, browser, pagina con raccolta degli errori.
import { startServer, launch } from '../lib.mjs';

export async function avvia() {
  const srv = await startServer();
  const browser = await launch();
  return {
    srv, browser,
    async chiudi() { await browser.close(); await srv.close(); },
    /** Apre il sito. opzioni: width, height, link (config finta), js (default true) */
    async pagina({ width = 1280, height = 900, link = null, js = true, reducedMotion = 'reduce' } = {}) {
      const ctx = await browser.newContext({ viewport: { width, height }, javaScriptEnabled: js, reducedMotion });
      const page = await ctx.newPage();
      const problemi = [];
      page.on('console', (m) => { if (m.type() === 'error') problemi.push('console: ' + m.text()); });
      page.on('pageerror', (e) => problemi.push('pageerror: ' + e.message));
      page.on('requestfailed', (r) => problemi.push('richiesta fallita: ' + r.url()));
      page.on('response', (r) => { if (r.status() >= 400) problemi.push(`http ${r.status()}: ${r.url()}`); });
      if (link !== null && js) {
        // config finta: proprietà non riscrivibile, così config.js (che assegna window.SITE_CONFIG) non la sovrascrive
        await page.addInitScript((l) => {
          Object.defineProperty(window, 'SITE_CONFIG', { value: { prefilledLink: l }, writable: false, configurable: false });
        }, link);
      }
      await page.goto(srv.url + '/index.html', { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      return { page, ctx, problemi };
    },
  };
}

export const LINK_FINTO_BASE = 'https://docs.google.com/forms/d/e/FAKE/viewform?entry.2=RISPOSTA&entry.8=FONTI';
export const LINK_FINTO_TUTTI = 'https://docs.google.com/forms/d/e/FAKE/viewform?entry.1=GRUPPO&entry.2=RISPOSTA&entry.3=DECISIONE&entry.4=VOCI&entry.5=PERCHE&entry.6=FUTURO&entry.7=MAPPA&entry.8=FONTI';

export const Q3_OK = 'Ho ascoltato di più la voce del dovere, perché avevo dato la mia parola e non volevo deludere nessuno.';
export const Q4_OK = 'La voce che mi dice di mantenere la parola data.';

/** Compila l'esercizio finale. voci: array di 5 [nome, d|n|f] */
export async function compilaFinale(page, { dec = 'dec-t', voci = null, q3 = Q3_OK, q4 = Q4_OK } = {}) {
  if (dec) await page.click(`label[for="${dec}"]`);
  const V = voci || [['il desiderio', 'd'], ['il dovere', 'd'], ['la reputazione', 'f'], ['il distacco', 'n'], ['la pancia', 'n']];
  for (let i = 1; i <= 5; i++) {
    const v = V[i - 1];
    if (!v) continue;
    if (v[0] !== null) await page.fill('#n' + i, v[0]);
    if (v[1]) await page.click(`label[for="p${i}-${v[1]}"]`);
  }
  if (q3 !== null) await page.fill('#q3', q3);
  if (q4 !== null) await page.fill('#q4', q4);
}
