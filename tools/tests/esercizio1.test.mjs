// Esercizio 1: ordinamento delle voci con le frecce e conferma dell'ordine.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { avvia } from './helpers.mjs';

let t;
before(async () => { t = await avvia(); });
after(async () => { await t.chiudi(); });

const ordine = (page) => page.$$eval('#fonti > li', (li) => li.map((e) => e.dataset.k));
// dentro la frase di conferma la voce ha l'iniziale minuscola, come nel testo approvato
const nellaFrase = (t) => t.charAt(0).toLowerCase() + t.slice(1);
const testi = (page) => page.$$eval('#fonti > li', (li) => li.map((e) => (e.querySelector('input') ? 'Altro' : e.querySelector('.ft').textContent)));

async function portaInCima(page, k) {
  for (let i = 0; i < 10; i++) {
    const su = page.locator(`#fonti > li[data-k="${k}"] .su`);
    if (await su.isDisabled()) return;
    await su.click();
  }
}

test('la lista ha le otto voci e le frecce estreme sono disattivate', async () => {
  const { page, ctx, problemi } = await t.pagina();
  assert.deepEqual((await ordine(page)).sort(), ['alt', 'fam', 'fut', 'lin', 'pas', 'pos', 'sgu', 'val']);
  assert.equal(await page.locator('#fonti > li:first-child .su').isDisabled(), true);
  assert.equal(await page.locator('#fonti > li:last-child .giu').isDisabled(), true);
  assert.equal(await page.locator('#fonti > li:first-child .giu').isDisabled(), false);
  assert.deepEqual(problemi, []);
  await ctx.close();
});

test('spostare giù e su cambia l\'ordine e tiene il focus sulla freccia usata', async () => {
  const { page, ctx } = await t.pagina();
  await portaInCima(page, 'fam');
  assert.equal((await ordine(page))[0], 'fam');
  await page.locator('#fonti > li[data-k="fam"] .giu').click();
  assert.equal((await ordine(page))[1], 'fam');
  const focusSuGiu = await page.evaluate(() => document.activeElement.classList.contains('giu') && document.activeElement.closest('li').dataset.k === 'fam');
  assert.equal(focusSuGiu, true);
  await page.locator('#fonti > li[data-k="fam"] .su').click();
  assert.equal((await ordine(page))[0], 'fam');
  await ctx.close();
});

test('conferma dell\'ordine: messaggio, testo del pulsante e annullamento dopo uno spostamento', async () => {
  const { page, ctx } = await t.pagina();
  await portaInCima(page, 'val');
  const ts = await testi(page);
  await page.click('#fonti-ok');
  assert.equal(await page.textContent('#fonti-ok'), 'Ordine confermato');
  assert.equal(await page.textContent('#fonti-msg'),
    `Ordine confermato. Più fuori di te: ${nellaFrase(ts[0])}. Più dentro di te: ${nellaFrase(ts[ts.length - 1])}.`);
  assert.equal(ts[0], 'I miei valori');
  await page.locator('#fonti > li:nth-child(2) .su').click();
  assert.equal(await page.textContent('#fonti-msg'), '');
  assert.equal(await page.textContent('#fonti-ok'), 'Confermo l’ordine');
  await ctx.close();
});

test('la voce «altro» entra nel messaggio con il testo scritto', async () => {
  const { page, ctx } = await t.pagina();
  await page.fill('#fonte-altro', 'il mio gatto');
  await portaInCima(page, 'alt');
  await page.click('#fonti-ok');
  assert.match(await page.textContent('#fonti-msg'), /Più fuori di te: altro: il mio gatto\./);
  await ctx.close();
});
