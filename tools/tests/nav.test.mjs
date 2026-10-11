// F4: navigazione durante la storia, tutte le aperture animate, ponte, asse dell'esercizio 1, collegamenti diretti.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { avvia } from './helpers.mjs';

let t;
before(async () => { t = await avvia(); });
after(async () => { await t.chiudi(); });

const vai = async (page, sel, off = 0) => {
  await page.evaluate(([s, o]) => window.scrollTo(0, document.querySelector(s).getBoundingClientRect().top + window.scrollY + o), [sel, off]);
  await page.waitForTimeout(400);
};
const visibile = (page, sel) => page.evaluate((s) => {
  const e = document.querySelector(s); if (!e) return false;
  const c = getComputedStyle(e); const r = e.getBoundingClientRect();
  return c.display !== 'none' && c.visibility !== 'hidden' && +c.opacity > 0.5 && r.bottom > 0 && r.top < innerHeight;
});

test('1440: il rail compare solo durante la storia, segna la tappa attiva e i link portano alle tappe', async () => {
  const { page, ctx, problemi } = await t.pagina({ width: 1440, height: 900 });
  assert.equal(await visibile(page, '.rail'), false, 'visibile nell\'hero');
  await vai(page, '.ponte-sec'); assert.equal(await visibile(page, '.rail'), false, 'visibile nel ponte');
  await vai(page, '#t3 .lettura', 100);
  assert.equal(await visibile(page, '.rail'), true, 'non visibile durante t3');
  assert.equal(await page.evaluate(() => document.querySelector('.rail a.attivo').getAttribute('href')), '#t3');
  assert.equal(await page.evaluate(() => document.querySelector('.rail a[aria-current]').dataset.i), '3');
  assert.equal(await visibile(page, '.barra'), false, 'barra mobile visibile su desktop');
  // il rail non copre la lettura né la nota a margine
  const r = await page.evaluate(() => ({ rail: document.querySelector('.rail').getBoundingClientRect().left,
    nota: document.querySelector('#t3 .prima').getBoundingClientRect().right, corpo: document.querySelector('#t3 .corpo').getBoundingClientRect().right }));
  assert.ok(r.nota <= r.rail && r.corpo <= r.rail, JSON.stringify(r));
  await page.click('.rail a[href="#t7"]');
  await page.waitForTimeout(1200);
  const top = await page.evaluate(() => Math.round(document.getElementById('t7').getBoundingClientRect().top));
  assert.ok(Math.abs(top) <= 2, 'top di t7 ' + top);
  await vai(page, '#domande .form-sec', 200); assert.equal(await visibile(page, '.rail'), false, 'visibile nell\'esercizio finale');
  assert.deepEqual(problemi, []);
  await ctx.close();
});

test('390: barra della storia, pannello Mappa (apre, Esc chiude e rende il focus, un link porta alla tappa)', async () => {
  const { page, ctx, problemi } = await t.pagina({ width: 390, height: 844 });
  assert.equal(await visibile(page, '.barra'), false);
  await vai(page, '#t3 .lettura', 50);
  assert.equal(await visibile(page, '.barra'), true);
  const b = await page.evaluate(() => ({ h: document.querySelector('.barra-in').getBoundingClientRect().height, txt: document.querySelector('.barra-dove').textContent, hidden: document.querySelector('.barra-dove').getAttribute('aria-hidden') }));
  assert.equal(b.h, 48); assert.equal(b.txt, '03 / 09 · Agostino'); assert.equal(b.hidden, 'true');
  assert.equal(await visibile(page, '.rail'), false);
  await page.click('.barra-mappa');
  await page.waitForTimeout(200);
  let s = await page.evaluate(() => ({ open: document.getElementById('pannello-mappa').open, modal: document.getElementById('pannello-mappa').matches(':modal'), focus: document.activeElement.className, link: document.querySelectorAll('#pannello-mappa a.nodo').length }));
  assert.deepEqual(s, { open: true, modal: true, focus: 'pannello-chiudi', link: 10 });
  // il focus resta nel pannello
  for (let i = 0; i < 14; i++) await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => !!document.activeElement.closest('#pannello-mappa')), true);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  s = await page.evaluate(() => ({ open: document.getElementById('pannello-mappa').open, focus: document.activeElement.className }));
  assert.deepEqual(s, { open: false, focus: 'barra-mappa' });
  await page.click('.barra-mappa');
  await page.click('#pannello-mappa a.nodo[data-i="6"]');
  await page.waitForTimeout(600);
  const r = await page.evaluate(() => ({ open: document.getElementById('pannello-mappa').open, top: Math.round(document.getElementById('t6').getBoundingClientRect().top), txt: document.querySelector('.barra-dove').textContent }));
  assert.equal(r.open, false);
  assert.ok(Math.abs(r.top - 48) <= 2, 'top di t6 ' + r.top);
  assert.equal(r.txt, '06 / 09 · Romantici');
  // Chiudi
  await page.click('.barra-mappa'); await page.click('.pannello-chiudi');
  assert.equal(await page.evaluate(() => document.getElementById('pannello-mappa').open), false);
  assert.deepEqual(problemi, []);
  await ctx.close();
});

test('collegamento diretto con hash: la tappa è in cima (sotto la barra su mobile)', async () => {
  for (const [w, atteso] of [[390, 48], [1440, 0]]) {
    const ctx = await t.browser.newContext({ viewport: { width: w, height: 844 }, reducedMotion: 'no-preference' });
    const page = await ctx.newPage();
    await page.goto(t.srv.url + '/index.html#t5', { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(800);
    const top = await page.evaluate(() => Math.round(document.getElementById('t5').getBoundingClientRect().top));
    assert.ok(Math.abs(top - atteso) <= 2, `${w}px: top di t5 ${top}`);
    await ctx.close();
  }
});

test('reduced motion: nessuna apertura ha altezza extra e nessun ScrollTrigger', async () => {
  const { page, ctx } = await t.pagina({ width: 1440, height: 900, reducedMotion: 'reduce' });
  const r = await page.evaluate(() => ({
    alte: [...document.querySelectorAll('.tappa > .scena, .finale > .scena')].filter((s) => s.getBoundingClientRect().height > 960).map((s) => s.parentElement.id),
    st: window.ScrollTrigger ? ScrollTrigger.getAll().length : 0,
    linea: document.querySelector('.grafico .g-linea').getAttribute('clip-path'),
    spenti: document.querySelectorAll('.nodo.spento').length,
  }));
  assert.deepEqual(r, { alte: [], st: 0, linea: null, spenti: 0 });
  await ctx.close();
});

test('desktop con motion: tutte le aperture sono alte ~180vh e il blob di ognuna cambia con lo scroll', async () => {
  const { page, ctx, problemi } = await t.pagina({ width: 1440, height: 900, reducedMotion: 'no-preference' });
  const ids = ['t1', 't2', 't3', 't4', 't5', 't6', 't7', 't8', 't9', 'domande'];
  for (const id of ids) {
    const sel = `#${id} > .scena`;
    const h = await page.evaluate((s) => document.querySelector(s).getBoundingClientRect().height, sel);
    assert.ok(id === 'domande' ? Math.abs(h - 1350) < 4 : Math.abs(h - 1620) < 4, `${id}: ${h}`);
    const forma = async (f) => {
      await page.evaluate(([s, f]) => { const r = document.querySelector(s).getBoundingClientRect(); window.scrollTo(0, r.top + scrollY + f * (r.height - innerHeight)); }, [sel, f]);
      await page.waitForTimeout(1300);
      return page.evaluate((s) => document.querySelector(s + ' .b-body').innerHTML, sel);
    };
    const a = await forma(0.25), b = await forma(1);
    assert.notEqual(a, b, id);
  }
  // tappa 9: a fine scena compare l'anello vuoto; tappa 6: il punto è nel foro (valore 95)
  const v = await page.evaluate(() => ({ op: getComputedStyle(document.querySelector('#t9 .dot-vuoto')).opacity }));
  assert.equal(v.op, '1');
  assert.deepEqual(problemi, []);
  await ctx.close();
});

test('ponte: la linea si disegna con lo scroll e i nodi si accendono in ordine', async () => {
  const { page, ctx } = await t.pagina({ width: 1440, height: 900, reducedMotion: 'no-preference' });
  const leggi = () => page.evaluate(() => ({ w: +document.querySelector('#ponte-rivela rect').getAttribute('width'), spenti: [...document.querySelectorAll('.grafico .plot .nodo')].map((n) => n.classList.contains('spento')) }));
  await vai(page, '.grafico', -900 * 0.75 + 80); await page.waitForTimeout(900);
  const a = await leggi();
  await vai(page, '.grafico', 200); await page.waitForTimeout(900);
  const b = await leggi();
  assert.ok(a.w < b.w, JSON.stringify([a.w, b.w]));
  assert.ok(a.spenti.filter(Boolean).length > b.spenti.filter(Boolean).length);
  // in ordine: nessun nodo acceso dopo uno spento
  const i = a.spenti.indexOf(true); assert.ok(i > 0 && a.spenti.slice(i).every((x, k) => x || a.spenti[i + k - 1] === false || k === 0 ? true : x));
  await ctx.close();
});

test('esercizio 1: dopo la conferma otto punti sull\'asse, uno per riga; spariscono se si cambia l\'ordine', async () => {
  const { page, ctx } = await t.pagina({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.querySelectorAll('.asse-punti i').length), 0);
  await page.click('#fonti-ok');
  await page.waitForTimeout(100);
  const r = await page.evaluate(() => {
    const punti = [...document.querySelectorAll('.asse-punti i')].map((p) => p.getBoundingClientRect());
    const righe = [...document.querySelectorAll('#fonti li')].map((l) => l.getBoundingClientRect());
    return { n: punti.length, allineati: punti.every((p, i) => Math.abs((p.top + p.height / 2) - (righe[i].top + righe[i].height / 2)) < 2), hidden: document.querySelector('.asse-punti').getAttribute('aria-hidden') };
  });
  assert.deepEqual(r, { n: 8, allineati: true, hidden: 'true' });
  await page.click('#fonti li:nth-child(3) .su');
  assert.equal(await page.evaluate(() => document.querySelectorAll('.asse-punti i').length), 0);
  await ctx.close();
});
