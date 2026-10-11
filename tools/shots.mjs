// Screenshot di revisione. Uso: node shots.mjs <cartella-di-uscita> [full|viste|f2|tutto]
import fs from 'node:fs';
import path from 'node:path';
import { startServer, launch } from './lib.mjs';

const out = path.resolve(process.argv[2] || 'out');
const modo = process.argv[3] || 'tutto';
fs.mkdirSync(out, { recursive: true });
const srv = await startServer();
const browser = await launch();

async function pagina(w, h) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(srv.url + '/index.html', { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: 'html{scroll-behavior:auto !important}' });
  return page;
}

async function vista(page, nome, selettore, offset = 0) {
  const y = await page.evaluate(([s, o]) => document.querySelector(s).getBoundingClientRect().top + window.scrollY + o, [selettore, offset]);
  await page.evaluate((yy) => window.scrollTo(0, yy), y);
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(out, nome + '.png') });
}

if (modo === 'full' || modo === 'tutto') {
  for (const [w, h] of [[390, 844], [768, 1024], [1440, 900]]) {
    const page = await pagina(w, h);
    await page.screenshot({ path: path.join(out, `full-${w}x${h}.png`), fullPage: true });
    await page.context().close();
  }
}
if (modo === 'viste' || modo === 'tutto') {
  for (const [w, h, tag] of [[1440, 900, 'desktop'], [390, 844, 'm390']]) {
    const page = await pagina(w, h);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: path.join(out, `vista-hero-${tag}.png`) });
    await vista(page, `vista-t1-scura-${tag}`, '#t1 .scena');
    await vista(page, `vista-t1-lettura-${tag}`, '#t1 .lettura');
    await vista(page, `vista-t2-chiara-${tag}`, '#t2 .scena');
    await vista(page, `vista-t2-lettura-${tag}`, '#t2 .lettura');
    await vista(page, `vista-t7-scura-${tag}`, '#t7 .scena');
    await vista(page, `vista-t9-scura-${tag}`, '#t9 .scena');
    await vista(page, `vista-t9-indicatore-${tag}`, '#t9 .indicatore', -300);
    await vista(page, `vista-esercizio1-${tag}`, '.es1', 0);
    await vista(page, `vista-esercizio2-${tag}`, '.es2', 0);
    await vista(page, `vista-ponte-${tag}`, '.ponte-sec', 0);
    await vista(page, `vista-finale-${tag}`, '#domande .scena', 0);
    await vista(page, `vista-finale-form-${tag}`, '#domande .form-sec', 0);
    await page.context().close();
  }
}
if (modo === 'f2') {
  // F2: laboratorio dei blob, hero, aperture di scena, esercizio 1 su mobile, esercizio finale su desktop
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto(srv.url + '/tools/blob-lab.html');
    await page.waitForTimeout(300);
    for (const [nome, sel] of [['blob-lab-chiaro', 'section.chiaro'], ['blob-lab-scuro', 'section.scuro:nth-of-type(2)'], ['blob-lab-varianti-scuro', 'section.scuro:nth-of-type(3)']]) {
      await page.locator(sel).first().screenshot({ path: path.join(out, nome + '.png') });
    }
    await page.evaluate(() => { const t = document.getElementById('t'); t.value = 0.5; t.dispatchEvent(new Event('input')); });
    await page.locator('.interp').screenshot({ path: path.join(out, 'blob-lab-interpolazione.png') });
    await ctx.close();
  }
  for (const [w, h, tag] of [[1440, 900, 'desktop'], [390, 844, 'm390']]) {
    const page = await pagina(w, h);
    if (tag === 'desktop') { await page.evaluate(() => window.scrollTo(0, 0)); await page.screenshot({ path: path.join(out, 'hero-desktop.png') }); }
    else await vista(page, 'hero-m390', '.hero-stage', -120);
    for (const n of [1, 3, 6, 7, 9]) await vista(page, `t${n}-${tag}`, `#t${n} .scena`);
    if (tag === 'm390') await vista(page, 'esercizio1-m390', '.es1', 280);
    if (tag === 'desktop') await vista(page, 'esercizio-finale-desktop', '#domande .form-sec');
    await page.context().close();
  }
}
await browser.close();
await srv.close();
console.log('screenshot in', out);
