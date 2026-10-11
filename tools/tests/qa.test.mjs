// QA finale (F6): anchor diretti, zoom 200%, testo non tagliato, contrasto AA calcolato, senza JavaScript.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { avvia } from './helpers.mjs';

let t;
before(async () => { t = await avvia(); });
after(async () => { await t.chiudi(); });

test('tutti i collegamenti diretti #apertura, #t1…#t9, #domande portano alla sezione, senza errori', async () => {
  for (const [w, h] of [[390, 844], [1440, 900]]) {
    const { page, ctx, problemi } = await t.pagina({ width: w, height: h, reducedMotion: 'no-preference' });
    for (const id of ['apertura', ...Array.from({ length: 9 }, (_, i) => 't' + (i + 1)), 'domande']) {
      await page.evaluate((x) => { location.hash = ''; location.hash = x; }, id);
      await page.waitForTimeout(id === 't1' ? 1800 : 900);
      const r = await page.evaluate((x) => {
        const e = document.getElementById(x); const b = e.getBoundingClientRect();
        return { top: b.top, h: b.height, vis: b.top < innerHeight && b.bottom > 0, doc: document.documentElement.scrollWidth, w: innerWidth };
      }, id);
      assert.ok(r.vis, `${w}px #${id} non in vista (top ${r.top})`);
      assert.ok(r.top <= 80 && r.top >= -4 || id === 'apertura', `${w}px #${id} top ${r.top}`);
      assert.equal(r.doc, r.w, `${w}px #${id}: scroll orizzontale`);
    }
    assert.deepEqual(problemi, []);
    await ctx.close();
  }
});

// zoom 200%: una finestra di 1440 o 720 px al 200% equivale a un viewport CSS di 720 o 360 px
for (const w of [720, 360]) {
  test(`zoom 200% (viewport ${w}px, scala 2): niente scroll orizzontale e nessun testo tagliato`, async () => {
    const ctx = await t.browser.newContext({ viewport: { width: w, height: 800 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.goto(t.srv.url + '/index.html', { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await page.click('#fonti-ok');
    for (const k of ['fam', 'pos', 'lin', 'pas', 'sgu', 'fut', 'val']) await page.click(`label[for="${k}-r"]`);
    await page.click('#vedi');
    const r = await page.evaluate(() => {
      const tagliati = [];
      for (const e of document.querySelectorAll('body *')) {
        if (e.closest('svg, .vh, .hp, [aria-hidden="true"], dialog:not([open])')) continue;
        if (!e.getClientRects().length || !e.textContent.trim()) continue;
        const cs = getComputedStyle(e);
        const clip = ['hidden', 'clip'].includes(cs.overflowX);
        if (clip && e.scrollWidth > e.clientWidth + 1 && !['MAIN'].includes(e.tagName) && !e.classList.contains('ponte-sec')   /* ponte-sec taglia solo gli anelli decorativi */) tagliati.push(`${e.tagName}.${e.className} ${e.scrollWidth}>${e.clientWidth}`);
        const b = e.getBoundingClientRect();
        if (e.children.length === 0 && (b.right > innerWidth + 1 || b.left < -1)) tagliati.push(`fuori: ${e.tagName}.${e.className} ${Math.round(b.left)}..${Math.round(b.right)}`);
      }
      return { doc: document.documentElement.scrollWidth, w: innerWidth, tagliati };
    });
    assert.equal(r.doc, r.w);
    assert.deepEqual(r.tagliati, []);
    await ctx.close();
  });
}

/** Rapporto di contrasto WCAG tra due colori [r,g,b] */
const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const rapporto = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

test('contrasto: ogni testo visibile ha almeno 4.5:1 (3:1 se grande) sul suo sfondo effettivo', async () => {
  const sotto = [];
  for (const w of [390, 1440]) {
    const { page, ctx } = await t.pagina({ width: w, height: 900 });
    // mostra anche mappa e pannello aperto non servono: la mappa dell'esercizio 2 e gli stati d'errore sì
    for (const k of ['fam', 'pos', 'lin', 'pas', 'sgu', 'fut', 'val']) await page.click(`label[for="${k}-r"]`);
    await page.click('#vedi');
    await page.click('#fonti-ok');
    await page.click('#btn');                           // messaggio d'errore
    const elenco = await page.evaluate(() => {
      const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,\/]+/).map(Number); return { c: p.slice(0, 3), a: p.length > 3 ? p[3] : 1 }; };
      const fondo = (e) => {                             // sfondo effettivo: compone gli strati semitrasparenti
        const strati = [];
        for (let n = e; n; n = n.parentElement) {
          const cs = getComputedStyle(n);
          if (cs.backgroundImage !== 'none') return null;
          const p = parse(cs.backgroundColor);
          if (p && p.a > 0) { strati.push(p); if (p.a === 1) break; }
        }
        let base = [255, 255, 255];
        for (const s of strati.reverse()) base = base.map((v, i) => Math.round(s.c[i] * s.a + v * (1 - s.a)));
        return base;
      };
      const out = [];
      const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = w.nextNode())) {
        const e = n.parentElement;
        if (!n.nodeValue.trim() || e.closest('svg, .vh, .hp, [aria-hidden="true"], script, style, noscript, dialog:not([open])')) continue;
        if (!e.getClientRects().length || e.closest(':disabled')) continue;   // i controlli disattivati sono esenti (WCAG 1.4.3)
        const cs = getComputedStyle(e);
        if (cs.visibility === 'hidden' || +cs.opacity === 0) continue;
        let op = 1; for (let p = e; p; p = p.parentElement) op *= +getComputedStyle(p).opacity;
        const col = parse(cs.color); const bg = fondo(e);
        if (!col || !bg) continue;
        const px = parseFloat(cs.fontSize); const grande = px >= 24 || (px >= 18.66 && +cs.fontWeight >= 700);
        const fg = col.c.map((v, i) => Math.round(v * col.a * op + bg[i] * (1 - col.a * op)));
        out.push({ t: n.nodeValue.trim().slice(0, 28), el: e.tagName + '.' + e.className, fg, bg, grande });
      }
      return out;
    });
    for (const x of elenco) {
      const r = rapporto(x.fg, x.bg);
      if (r < (x.grande ? 3 : 4.5)) sotto.push(`${w}px ${x.el} «${x.t}» ${r.toFixed(2)}:1 fg=${x.fg} bg=${x.bg}`);
    }
    await ctx.close();
  }
  assert.deepEqual([...new Set(sotto)], []);
});

test('coppie di colori dei token: tutte almeno 4.5:1 (testo su chiaro, su scuro, su lilla)', () => {
  const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const coppie = [
    ['ink su paper', '#0A0A0A', '#F7F7F6'], ['ink su white', '#0A0A0A', '#FFFFFF'], ['ink su lilac-wash', '#0A0A0A', '#F2EEFF'],
    ['muted su paper', '#666666', '#F7F7F6'], ['muted su white', '#666666', '#FFFFFF'], ['muted su lilac-wash', '#666666', '#F2EEFF'],
    ['bianco su night', '#FFFFFF', '#080808'], ['muted-dark su night', '#A8A8A8', '#080808'],
    ['err su white', '#9B1C1C', '#FFFFFF'], ['bianco su ink (pulsanti)', '#FFFFFF', '#0A0A0A'],
  ];
  for (const [n, a, b] of coppie) assert.ok(rapporto(rgb(a), rgb(b)) >= 4.5, `${n}: ${rapporto(rgb(a), rgb(b)).toFixed(2)}`);
});

test('senza JavaScript: tutto il testo degli esercizi e i blob statici sono visibili', async () => {
  const { page, ctx } = await t.pagina({ width: 390, js: false });
  const r = await page.evaluate(() => {
    const nascosti = [];
    for (const e of document.querySelectorAll('.esercizio :is(p, label, h3, li, button), #domande :is(h2, h3, p, label, button)')) {
      if (e.closest('[hidden], [aria-hidden="true"], .hp, .vh')) continue;
      const cs = getComputedStyle(e); const b = e.getBoundingClientRect();
      if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0 || !b.width || !b.height) nascosti.push(e.tagName + ':' + e.textContent.slice(0, 24));
    }
    const blob = [...document.querySelectorAll('.stage-svg')].map((s) => { const b = s.getBoundingClientRect(); return b.width > 100 && b.height > 100 && +getComputedStyle(s).opacity > 0; });
    return { nascosti, nBlob: blob.length, tuttiVisibili: blob.every(Boolean) };
  });
  assert.deepEqual(r.nascosti, []);
  assert.ok(r.nBlob >= 11, 'blob statici: ' + r.nBlob);
  assert.ok(r.tuttiVisibili);
  await ctx.close();
});
