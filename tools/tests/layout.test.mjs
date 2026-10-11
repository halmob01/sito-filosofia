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

test('prosa in EB Garamond «come un libro», formule in Geist, controlli in Garamond', async () => {
  for (const w of [390, 1440]) {
    const { page, ctx } = await t.pagina({ width: w });
    const r = await page.evaluate(async () => {
      await document.fonts.ready;
      const cs = (s) => getComputedStyle(document.querySelector(s));
      return {
        caricato: document.fonts.check('400 20px "EB Garamond"') && [...document.fonts].some((f) => f.family.includes('EB Garamond') && f.status === 'loaded'),
        corpo: cs('#t2 .corpo p').fontFamily, hero: cs('.hero-lead').fontFamily, ponte: cs('.ponte-testo p').fontFamily,
        prima: [cs('.prima').fontFamily, cs('.prima').fontStyle], blocco: cs('.blocco-lilla p').fontFamily,
        formula: cs('.formula').fontFamily, sosp: cs('.corpo h3.sosp').fontFamily, hint: cs('.ponte-testo .hintline').fontFamily,
        istr: cs('.istruzioni').fontFamily, seg: cs('.seg label').fontFamily,
        size: cs('#t2 .corpo p').fontSize, align: cs('#t2 .corpo p').textAlign,
        rientro1: cs('#t2 .corpo p:first-child').textIndent, rientro2: cs('#t2 .corpo p:nth-child(2)').textIndent,
        margine: cs('#t2 .corpo p').marginBottom, num: cs('#t2 .corpo p').fontVariantNumeric, lang: document.documentElement.lang,
      };
    });
    assert.ok(r.caricato, 'EB Garamond non caricato');
    for (const k of ['corpo', 'hero', 'ponte', 'blocco']) assert.match(r[k], /^"?EB Garamond/, k);
    assert.match(r.prima[0], /^"?EB Garamond/); assert.equal(r.prima[1], 'italic');
    for (const k of ['formula', 'sosp', 'hint']) assert.match(r[k], /^"?Geist/, k);
    assert.match(r.seg, /^"?EB Garamond/, 'seg');
    assert.match(r.istr, /^"?EB Garamond/, 'istruzioni degli esercizi');
    assert.equal(r.size, w < 1200 ? '20px' : '22px');
    assert.equal(r.align, w < 600 ? 'left' : 'justify');
    assert.equal(r.rientro1, '0px'); assert.notEqual(r.rientro2, '0px'); assert.equal(r.margine, '0px');
    assert.match(r.num, /oldstyle-nums/); assert.equal(r.lang, 'it');
    await ctx.close();
  }
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

test('lettura mobile: Garamond 20px, interlinea da libro e colonna comoda a 390px', async () => {
  const { page, ctx } = await t.pagina({ width: 390 });
  const r = await page.evaluate(() => {
    const p = document.querySelector('#t2 .corpo p');
    const cs = getComputedStyle(p);
    const w = p.getBoundingClientRect().width;
    return { fs: parseFloat(cs.fontSize), lh: parseFloat(cs.lineHeight) / parseFloat(cs.fontSize), w };
  });
  // il docente ha scelto il Garamond a 20px (più piccolo a vista del Geist): vale più del brief (17–19px sans)
  assert.equal(r.fs, 20, 'corpo ' + r.fs);
  assert.ok(r.lh >= 1.42 && r.lh <= 1.55, 'interlinea ' + r.lh);
  assert.ok(r.w >= 340 && r.w <= 360, 'larghezza colonna ' + r.w);
  await ctx.close();
});

test('target touch di almeno 44px per pulsanti, etichette segmentate e campi (mobile)', async () => {
  const { page, ctx } = await t.pagina({ width: 390 });
  const piccoli = await page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll('button, .seg label, input[type=text], textarea, .brand')) {
      if (el.closest('.hp')) continue;
      if (!el.getClientRects().length) continue;   // non visibile (per esempio nel pannello Mappa chiuso)
      const rc = el.getBoundingClientRect();
      if (rc.width < 44 || rc.height < 44) out.push(`${el.tagName}.${el.className} ${Math.round(rc.width)}x${Math.round(rc.height)}`);
    }
    return out;
  });
  assert.deepEqual(piccoli, []);
  await ctx.close();
});
