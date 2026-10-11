// Apre tools/glyphs.html, stampa i glifi mancanti e salva lo screenshot. Uso: node glyphs.mjs <png-di-uscita>
import path from 'node:path';
import fs from 'node:fs';
import { startServer, launch } from './lib.mjs';
const out = path.resolve(process.argv[2] || 'out/glifi.png');
fs.mkdirSync(path.dirname(out), { recursive: true });
const srv = await startServer();
const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
await page.goto(srv.url + '/tools/glyphs.html');
await page.waitForSelector('body[data-pronto="1"]');
await page.evaluate(() => document.fonts.ready);
console.log('glifi mancanti:', JSON.stringify(await page.evaluate(() => window.__mancanti)));
await page.screenshot({ path: out, fullPage: true });
await browser.close(); await srv.close();
