// Layout: nessun errore in console, nessuno scroll orizzontale, font caricati, lettura senza JavaScript, target touch.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { avvia } from './helpers.mjs';

let t;
before(async () => { t = await avvia(); });
after(async () => { await t.chiudi(); });

for (const w of [320, 390, 768, 1024, 1200, 1440]) {
  test(`${w}px: nessuno scroll orizzontale e nessun errore`, async () => {
    const { page, ctx, problemi } = await t.pagina({ width: w, height: w < 700 ? 800 : 900 });
    const m = await page.evaluate(() => ({ larg: window.innerWidth, doc: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
    assert.equal(m.doc, m.larg, `scrollWidth ${m.doc} diverso dalla larghezza ${m.larg}`);
    assert.equal(m.body <= m.larg, true, `body ${m.body} più largo di ${m.larg}`);
    // anche con la mappa aperta, il form compilato e la lista in ordine diverso nulla deve sporgere
    await page.click('#fonti-ok');
    for (const k of ['fam', 'pos', 'lin', 'pas', 'sgu', 'fut', 'val']) await page.click(`label[for="${k}-r"]`);
    await page.click('#vedi');
    const m2 = await page.evaluate(() => document.documentElement.scrollWidth);
    assert.equal(m2, m.larg);
    assert.deepEqual(problemi, []);
    await ctx.close();
  });
}

test('i font self-hosted sono quelli usati (non quelli di sistema)', async () => {
  const { page, ctx } = await t.pagina({ width: 1440 });
  const r = await page.evaluate(async () => {
    await document.fonts.ready;
    return {
      anton: document.fonts.check('400 40px Anton'),
      geist400: document.fonts.check('400 16px Geist'),
      geist600: document.fonts.check('600 16px Geist'),
      mono: document.fonts.check('500 13px "Geist Mono"'),
      caricati: [...document.fonts].filter((f) => f.status === 'loaded').map((f) => `${f.family} ${f.weight} ${f.style}`),
      h1: getComputedStyle(document.querySelector('h1')).fontFamily,
    };
  });
  assert.ok(r.anton && r.geist400 && r.geist600 && r.mono, JSON.stringify(r));
  assert.ok(r.caricati.some((x) => x.startsWith('Anton')));
  assert.ok(r.caricati.some((x) => x.startsWith('Geist 400 normal')));
  assert.ok(r.caricati.some((x) => x.startsWith('Geist 600')));
  assert.match(r.h1, /^"?Anton/);
  await ctx.close();
});

test('senza JavaScript tutto il testo di lettura è visibile', async () => {
  const { page, ctx } = await t.pagina({ width: 390, js: false });
  const r = await page.evaluate(() => {
    const nascosti = [];
    for (const el of document.querySelectorAll('.tappa :is(h2, .when, .formula, .corpo p, .corpo h3, .prima, .gl), #apertura :is(h1, p, button, label), #domande :is(h2, h3, p, label)')) {
      if (el.closest('[hidden], [aria-hidden="true"], .hp, #risultato')) continue;
      if (el.classList.contains('vh') || el.closest('.vh')) continue;
      const cs = getComputedStyle(el);
      const rc = el.getBoundingClientRect();
      if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0 || rc.width === 0 || rc.height === 0) nascosti.push(el.tagName + '.' + el.className + ': ' + el.textContent.slice(0, 30));
    }
    return nascosti;
  });
  assert.deepEqual(r, []);
  // le voci della lista (non rimescolata, senza JS) restano tutte presenti
  assert.equal(await page.locator('#fonti > li').count(), 8);
  await ctx.close();
});

test('lettura mobile: corpo 17-19px e colonna comoda a 390px', async () => {
  const { page, ctx } = await t.pagina({ width: 390 });
  const r = await page.evaluate(() => {
    const p = document.querySelector('#t2 .corpo p');
    const cs = getComputedStyle(p);
    const w = p.getBoundingClientRect().width;
    return { fs: parseFloat(cs.fontSize), lh: parseFloat(cs.lineHeight) / parseFloat(cs.fontSize), w };
  });
  assert.ok(r.fs >= 17 && r.fs <= 19, 'corpo ' + r.fs);
  assert.ok(r.lh >= 1.55 && r.lh <= 1.68, 'interlinea ' + r.lh);
  assert.ok(r.w >= 340 && r.w <= 360, 'larghezza colonna ' + r.w);
  await ctx.close();
});

test('target touch di almeno 44px per pulsanti, etichette segmentate e campi (mobile)', async () => {
  const { page, ctx } = await t.pagina({ width: 390 });
  const piccoli = await page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll('button, .seg label, input[type=text], textarea, .brand')) {
      if (el.closest('.hp')) continue;
      const rc = el.getBoundingClientRect();
      if (rc.width < 44 || rc.height < 44) out.push(`${el.tagName}.${el.className} ${Math.round(rc.width)}x${Math.round(rc.height)}`);
    }
    return out;
  });
  assert.deepEqual(piccoli, []);
  await ctx.close();
});
