// F3: scena della tappa 2 (GSAP). Altezze, stati del blob, reduced motion, mobile, assenza di GSAP.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { avvia } from './helpers.mjs';

let t;
before(async () => { t = await avvia(); });
after(async () => { await t.chiudi(); });

/** forme visibili del blob di t2: cerchi con r > 0 e path non vuoti (indipendente dalla struttura dei nodi) */
const forme = (page) => page.evaluate(() => {
  const g = document.querySelector('#t2 .stage .b-body');
  return [...g.querySelectorAll('circle')].filter((c) => +c.getAttribute('r') > 0.1).map((c) => ['c', c.getAttribute('cx'), c.getAttribute('cy'), c.getAttribute('r')].join())
    .concat([...g.querySelectorAll('path')].map((p) => p.getAttribute('d')).filter(Boolean)).join('|');
});
const geom = (page) => page.evaluate(() => {
  const s = document.querySelector('#t2 .scena');
  const r = s.getBoundingClientRect();
  return { top: r.top + scrollY, h: r.height, vh: innerHeight, grid: s.querySelector('.scena-grid').getBoundingClientRect().height };
});
const aPerc = async (page, p) => {
  const g = await geom(page);
  await page.evaluate((y) => window.scrollTo(0, y), g.top + p * (g.h - g.vh));
  await page.waitForTimeout(1700);                       // scrub 0.8 + margine
};

test('reduced motion: nessuna altezza extra, nessun ScrollTrigger e stato finale', async () => {
  const { page, ctx, problemi } = await t.pagina({ width: 1440, height: 900, reducedMotion: 'reduce' });
  const g = await geom(page);
  assert.ok(g.h <= 960, `altezza ${g.h}`);
  assert.equal(await page.evaluate(() => document.documentElement.classList.contains('scena-alta')), false);
  assert.equal(await page.evaluate(() => window.ScrollTrigger ? window.ScrollTrigger.getAll().length : -1), 0);
  const finale = await forme(page);
  await page.evaluate((y) => window.scrollTo(0, y), g.top + 200);
  await page.waitForTimeout(500);
  assert.equal(await forme(page), finale);
  assert.equal(finale.split('|').filter((x) => x.startsWith('c,')).length, 2);   // B1: due nuclei
  assert.equal(await page.evaluate(() => document.querySelector('#t2 .dot').getAttribute('cx')), '93');
  assert.deepEqual(problemi, []);
  await ctx.close();
});

test('desktop 1440: apertura t2 alta ~180vh, sticky, e il blob cambia tra 20% e 80% dello scroll', async () => {
  const { page, ctx, problemi } = await t.pagina({ width: 1440, height: 900, reducedMotion: 'no-preference' });
  const g = await geom(page);
  assert.ok(Math.abs(g.h - 1.8 * 900) <= 3, `altezza ${g.h}`);
  assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('#t2 .scena-grid')).position), 'sticky');
  assert.ok(await page.evaluate(() => ScrollTrigger.getAll().length) >= 1);
  await aPerc(page, 0.2); const a = await forme(page);
  await aPerc(page, 0.8); const b = await forme(page);
  assert.notEqual(a, b);
  await aPerc(page, 1); const fine = await forme(page);
  // a fine corsa lo stato è quello statico finale (B1)
  const { page: p2, ctx: c2 } = await t.pagina({ width: 1440, height: 900, reducedMotion: 'reduce' });
  assert.equal(fine, await forme(p2));
  await c2.close();
  // il contenitore sticky resta ancorato in cima durante la corsa
  await aPerc(page, 0.5);
  const top = await page.evaluate(() => Math.round(document.querySelector('#t2 .scena-grid').getBoundingClientRect().top));
  assert.equal(top, 0);
  assert.deepEqual(problemi, []);
  await ctx.close();
});

test('il punto lilla scorre da 5 a 25 e gli anelli si allargano', async () => {
  const { page, ctx } = await t.pagina({ width: 1440, height: 900, reducedMotion: 'no-preference' });
  const leggi = () => page.evaluate(() => ({ cx: +document.querySelector('#t2 .dot').getAttribute('cx'), op: +getComputedStyle(document.querySelector('#t2 .dot')).opacity }));
  await aPerc(page, 0.3); const x30 = await leggi();
  await aPerc(page, 0.6); const x60 = await leggi();
  await aPerc(page, 1); const x100 = await leggi();
  assert.ok(Math.abs(x30.cx - 37.8) < 0.5, JSON.stringify(x30));
  assert.ok(x60.cx > x30.cx && x60.cx < x100.cx, JSON.stringify([x30, x60, x100]));
  assert.ok(Math.abs(x100.cx - 93) < 0.5);
  assert.ok(x100.op > 0.99);
  await ctx.close();
});

test('mobile 390 e tablet 768: nessuna altezza extra e morph finale all\'ingresso', async () => {
  for (const w of [390, 768]) {
    const { page, ctx, problemi } = await t.pagina({ width: w, height: 844, reducedMotion: 'no-preference' });
    const g = await geom(page);
    assert.ok(Math.abs(g.h - g.grid) <= 1, `${w}px: altezza ${g.h} contro contenuto ${g.grid}`);
    assert.equal(await page.evaluate(() => document.documentElement.classList.contains('scena-alta')), false);
    const prima = await forme(page);
    // prima di entrare nella vista il blob è nello stato di partenza (B0, un solo disco)
    assert.equal(prima.split('|').filter((x) => x.startsWith('c,')).length, 1);
    await page.evaluate((y) => window.scrollTo(0, y), g.top - 300);
    await page.waitForTimeout(1200);
    const dopo = await forme(page);
    const { page: p2, ctx: c2 } = await t.pagina({ width: w, height: 844, reducedMotion: 'reduce' });
    assert.equal(dopo, await forme(p2));
    await c2.close();
    assert.deepEqual(problemi, []);
    await ctx.close();
  }
});

test('senza GSAP (script vuoti o non trovati) nessun errore e resta lo stato statico, senza altezza extra', async () => {
  for (const modo of ['vuoti', 'bloccati']) {
    const ctx = await t.browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' });
    await ctx.route('**/vendor/gsap/*', (r) => (modo === 'vuoti' ? r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }) : r.abort()));
    const page = await ctx.newPage();
    const errori = [];
    page.on('pageerror', (e) => errori.push('pageerror: ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error' && !(modo === 'bloccati' && /Failed to load resource/.test(m.text()))) errori.push('console: ' + m.text()); });
    await page.goto(t.srv.url + '/index.html', { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);
    const g = await geom(page);
    assert.ok(g.h <= 960, `${modo}: altezza ${g.h}`);
    assert.equal(await page.evaluate(() => document.documentElement.classList.contains('scena-alta')), false);
    assert.equal(await page.evaluate(() => document.querySelectorAll('#t2 .stage .b-body circle').length > 0), true);
    assert.deepEqual(errori, [], modo);
    await ctx.close();
  }
});
