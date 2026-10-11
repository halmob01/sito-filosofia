// Screenshot di revisione. Uso: node shots.mjs <cartella-di-uscita> [full|viste|tutto]
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
await browser.close();
await srv.close();
console.log('screenshot in', out);
