// Esercizi: carattere (Garamond/Geist), maiuscole iniziali richieste dal docente, stati di errore e di invio.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { avvia, compilaFinale, LINK_FINTO_BASE } from './helpers.mjs';

let t;
before(async () => { t = await avvia(); });
after(async () => { await t.chiudi(); });

test('il testo, i pulsanti e i campi degli esercizi sono in Garamond; restano in Geist solo le etichette maiuscole', async () => {
  for (const w of [390, 1440]) {
    const { page, ctx } = await t.pagina({ width: w });
    const f = await page.evaluate(() => {
      const ff = (s) => getComputedStyle(document.querySelector(s)).fontFamily;
      return {
        garamond: ['.es1 .tit', '.es1 .istruzioni', '.fonti .ft', '.estremo', '.es2 .nome', '.col .sub', '#risultato h3', '#manca',
          '#domande .blocco-lilla h3', 'h3.step', '#f .hintline', '.voce-cit', '#f label[for=q3]', '#q3', '.small', '#msg', '#fonti-ok', '#vedi', '.seg label', '.fonti .su', '#btn', '#n1', '#fonte-altro'].map((s) => [s, ff(s)]),
        geist: ['.kicker'].map((s) => [s, ff(s)]),
        mono: getComputedStyle(document.querySelector('.fonti li'), '::before').fontFamily,
        dimTextarea: parseFloat(getComputedStyle(document.querySelector('#q3')).fontSize),
      };
    });
    for (const [s, v] of f.garamond) assert.match(v, /^"?EB Garamond/, `${w}px ${s}: ${v}`);
    for (const [s, v] of f.geist) assert.match(v, /^"?Geist/, `${w}px ${s}: ${v}`);
    assert.match(f.mono, /Geist Mono/);
    assert.ok(f.dimTextarea >= 17);
    await ctx.close();
  }
});

test('nessun testo breve degli esercizi è giustificato', async () => {
  const { page, ctx } = await t.pagina({ width: 1440 });
  const r = await page.evaluate(() => [...document.querySelectorAll('.fonti .ft, .nome, .estremo, .col li, .voce-cit, h3.step, .manca, #msg')]
    .filter((e) => getComputedStyle(e).textAlign === 'justify').map((e) => e.className));
  assert.deepEqual(r, []);
  await ctx.close();
});

test('maiuscola iniziale nelle voci e nelle etichette degli esercizi', async () => {
  const { page, ctx } = await t.pagina({ width: 1280 });
  const iniz = (sel) => page.$$eval(sel, (els) => els.map((e) => e.textContent.trim()).filter((x) => x && x[0] !== x[0].toUpperCase()));
  assert.deepEqual(await iniz('.fonti .ft, .fonti .lbl-altro, .estremo, .es2 .nome, .es2 .nome label, .col .sub, .col h4, #domande .seg label, #domande h3, #domande label'), []);
  assert.deepEqual(await page.$$eval('.estremo', (e) => e.map((x) => x.textContent)), ['↑ Più fuori di me', '↓ Più dentro di me']);
  assert.deepEqual(await page.$$eval('.col .sub', (e) => e.map((x) => x.textContent)), ['Cambierebbe', 'Non so', 'Resterebbe uguale']);
  assert.equal(await page.textContent('#fonti li[data-k="alt"] label'), 'Altro (scegli tu quale):');
  assert.equal(await page.textContent('#n-alt label'), 'Altro (facoltativo: scrivi quale)');
  // testo inviato al Modulo
  await page.fill('#fonte-altro', 'il mio gatto');
  await page.click('#fonti-ok');
  assert.match(await page.evaluate(() => window.Esercizi.fontiTesto()), /Altro: il mio gatto/);
  await ctx.close();
});

test('esercizio 1: il pulsante diventa «vuoto» alla conferma e torna pieno dopo uno spostamento', async () => {
  const { page, ctx } = await t.pagina({ width: 390 });
  await page.click('#fonti-ok');
  assert.equal(await page.evaluate(() => document.getElementById('fonti-ok').classList.contains('fatto')), true);
  await page.click('#fonti li:nth-child(2) .su');
  assert.equal(await page.evaluate(() => document.getElementById('fonti-ok').classList.contains('fatto')), false);
  await ctx.close();
});

test('errori: il primo campo mancante riceve il focus e il segno di errore, che sparisce quando si compila', async () => {
  const { page, ctx } = await t.pagina({ width: 390 });
  const attivo = () => page.evaluate(() => document.activeElement.id);
  await page.click('#btn');
  assert.equal(await attivo(), 'dec-f');
  assert.equal(await page.getAttribute('#dec-f >> xpath=..', 'aria-invalid'), 'true');
  await page.click('label[for="dec-f"]');
  assert.equal(await page.getAttribute('#dec-f >> xpath=..', 'aria-invalid'), null);
  await page.fill('#n1', 'il desiderio'); await page.click('label[for="p1-d"]');
  await page.fill('#n2', 'il dovere');                        // la scelta di p2 manca
  await page.click('#btn');
  assert.equal(await attivo(), 'p2-d');
  assert.equal(await page.locator('.riga.voce[aria-invalid="true"]').count(), 4);
  await compilaFinale(page, { dec: null });
  await page.fill('#q3', 'corta');
  await page.click('#btn');
  assert.equal(await attivo(), 'q3');
  assert.equal(await page.getAttribute('#q3', 'aria-invalid'), 'true');
  await page.fill('#q3', 'Ho ascoltato di più la voce del dovere, perché avevo dato la mia parola.');
  assert.equal(await page.getAttribute('#q3', 'aria-invalid'), null);
  await page.fill('#q4', 'x');
  await page.click('#btn');
  assert.equal(await attivo(), 'q4');
  await ctx.close();
});

test('invio in corso: il form è aria-busy e il pulsante disattivato; dopo un errore di rete tornano normali', async () => {
  const { page, ctx } = await t.pagina({ width: 390, link: LINK_FINTO_BASE });
  await page.route('**/formResponse', async (r) => { await new Promise((x) => setTimeout(x, 600)); r.abort('failed'); });
  await compilaFinale(page);
  await page.click('#btn');
  assert.equal(await page.getAttribute('#f', 'aria-busy'), 'true');
  assert.equal(await page.locator('#btn').isDisabled(), true);
  await page.waitForFunction(() => document.getElementById('msg').textContent.startsWith('Non sono riuscito'));
  assert.equal(await page.getAttribute('#f', 'aria-busy'), null);
  assert.equal(await page.locator('#btn').isDisabled(), false);
  await ctx.close();
});

test('esercizio 2: lo stato «pronto» compare solo con le sette risposte', async () => {
  const { page, ctx } = await t.pagina({ width: 390 });
  assert.equal(await page.evaluate(() => document.getElementById('manca').classList.contains('pronto')), false);
  for (const k of ['fam', 'pos', 'lin', 'pas', 'sgu', 'fut', 'val']) await page.click(`label[for="${k}-r"]`);
  assert.equal(await page.evaluate(() => document.getElementById('manca').classList.contains('pronto')), true);
  await ctx.close();
});
