// Libreria dei blob e blob statici: forme, interpolazione, SVG presenti senza JavaScript.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { STATES, lerpState, blobShapes, neckPath } from '../../js/blob.js';
import { avvia } from './helpers.mjs';

const QUI = path.dirname(fileURLToPath(import.meta.url));
let t;
before(async () => { t = await avvia(); });
after(async () => { await t.chiudi(); });

test('ogni stato ha sempre quattro cerchi e il viewBox 600', () => {
  for (const [nome, s] of Object.entries(STATES)) {
    assert.equal(s.circles.length, 4, nome);
    for (const k of s.circles) assert.ok(k.x >= 0 && k.x <= 600 && k.y >= 0 && k.y <= 600 && k.r >= 0, nome);
  }
  assert.deepEqual(Object.keys(STATES), ['B0', 'B1', 'B2', 'B3', 'B4', 'B5', 'LOGO']);
});

test('lerpState agli estremi coincide con gli stati e nel mezzo resta finito', () => {
  const a = STATES.B1, b = STATES.B3;
  const s0 = lerpState(a, b, 0), s1 = lerpState(a, b, 1);
  a.circles.forEach((k, i) => { assert.equal(s0.circles[i].r, k.r); assert.equal(s1.circles[i].r, b.circles[i].r); });
  for (let i = 0; i <= 20; i++) {
    const sh = blobShapes(lerpState(STATES.B2, STATES.B5, i / 20));
    for (const d of sh.necks) assert.ok(!/NaN|Infinity/.test(d));
    for (const k of sh.circles) assert.ok(Number.isFinite(+k.r));
  }
});

test('B3: quattro colli solo tra vicini e foro centrale libero; B5: nessun collo', () => {
  const b3 = blobShapes(STATES.B3);
  assert.equal(b3.necks.filter(Boolean).length, 4);
  const inside = (x, y) => STATES.B3.circles.some((k) => Math.hypot(x - k.x, y - k.y) < k.r);
  assert.equal(inside(300, 300), false);
  assert.equal(blobShapes(STATES.B5).necks.filter(Boolean).length, 0);
  assert.equal(blobShapes(STATES.B0).circles.filter((k) => +k.r > 0).length, 1);
});

test('il collo sparisce in modo continuo quando i cerchi si allontanano', () => {
  const A = { x: 200, y: 300, r: 80 };
  let ultimo = '';
  for (let g = 0; g <= 220; g += 10) ultimo = neckPath(A, { x: 200 + 160 + g, y: 300, r: 80 }, 0.6 * 80);
  assert.equal(ultimo, '');
  assert.notEqual(neckPath(A, { x: 360 + 40, y: 300, r: 80 }, 48), '');
});

test('index.html è aggiornato rispetto a static-blobs.mjs', () => {
  execFileSync('node', [path.join(QUI, '..', 'static-blobs.mjs'), '--check'], { stdio: 'pipe' });
});

test('senza JavaScript i blob statici ci sono, sono decorativi e hanno 4 stati distinti', async () => {
  const { page, ctx } = await t.pagina({ width: 390, js: false });
  const r = await page.evaluate(() => {
    const stage = [...document.querySelectorAll('.stage-svg')];
    return {
      n: stage.length,
      senzaAria: stage.filter((s) => s.getAttribute('aria-hidden') !== 'true').length,
      conBlob: stage.filter((s) => s.querySelector('.blob .b-body circle')).length,
      logo: !!document.querySelector('.logo .b-body circle'),
      forme: new Set([...document.querySelectorAll('#t1 .b-body, #t2 .b-body, #t3 .b-body, #t4 .b-body, #t5 .b-body, #t7 .b-body')].map((g) => g.innerHTML)).size,
    };
  });
  assert.equal(r.n, 11);
  assert.equal(r.senzaAria, 0);
  assert.equal(r.conBlob, 11);
  assert.equal(r.logo, true);
  assert.equal(r.forme, 6);
  await ctx.close();
});

test('i blob stanno nelle misure del brief (desktop 260–540px, mobile 200–320px)', async () => {
  for (const [w, min, max] of [[1440, 260, 540], [390, 190, 320]]) {
    const { page, ctx } = await t.pagina({ width: w, height: 900 });
    const r = await page.evaluate(() => [...document.querySelectorAll('.tappa .stage .blob .b-body, .finale .stage .blob .b-body, .hero .blob .b-body')]
      .map((g) => { const b = g.getBoundingClientRect(); return Math.max(b.width, b.height); }));
    for (const d of r) assert.ok(d >= min && d <= max, `${w}px: blob di ${Math.round(d)}px fuori da ${min}–${max}`);
    await ctx.close();
  }
});
