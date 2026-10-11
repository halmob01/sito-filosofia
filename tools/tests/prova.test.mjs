// Esercizio 2: prova della nascita, abilitazione del pulsante, mappa del risultato.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { avvia } from './helpers.mjs';

let t;
before(async () => { t = await avvia(); });
after(async () => { await t.chiudi(); });

const CHIAVI = ['fam', 'pos', 'lin', 'pas', 'sgu', 'fut', 'val'];
const NOMI = { fam: 'La musica che mi piace', pos: 'Ciò che considero giusto e sbagliato', lin: 'L’idea che ho di me', pas: 'Il mio carattere', sgu: 'Ciò che voglio fare da grande', fut: 'Le parole e le frasi che uso', val: 'Le cose di cui ho paura' };
const voci = (page, id) => page.$$eval(`#${id} li`, (li) => li.map((e) => e.textContent));

test('stato iniziale: pulsante disattivato, conteggio delle risposte mancanti, mappa nascosta', async () => {
  const { page, ctx, problemi } = await t.pagina();
  assert.equal(await page.locator('#vedi').isDisabled(), true);
  assert.equal(await page.textContent('#manca'), 'Mancano 7 risposte (tranne «altro»).');
  assert.equal(await page.locator('#risultato').isHidden(), true);
  assert.deepEqual(problemi, []);
  await ctx.close();
});

test('il pulsante si attiva solo con le sette risposte e la mappa riporta le voci nelle colonne giuste', async () => {
  const { page, ctx } = await t.pagina();
  const scelte = { fam: 'c', pos: 'r', lin: 'n', pas: 'r', sgu: 'c', fut: 'n', val: 'r' };
  let fatte = 0;
  for (const k of CHIAVI.slice(0, 6)) {
    await page.click(`label[for="${k}-${scelte[k]}"]`);
    fatte++;
    assert.equal(await page.locator('#vedi').isDisabled(), true);
    assert.equal(await page.textContent('#manca'), `Mancano ${7 - fatte} risposte (tranne «altro»).`);
  }
  await page.click(`label[for="val-r"]`);
  assert.equal(await page.locator('#vedi').isDisabled(), false);
  assert.equal(await page.textContent('#manca'), 'Pronto: premi il pulsante.');
  await page.click('#vedi');
  assert.equal(await page.locator('#risultato').isVisible(), true);
  assert.equal(await page.textContent('#vedi'), 'Aggiorna la mappa');
  assert.deepEqual(await voci(page, 'm-c'), [NOMI.fam, NOMI.sgu]);
  assert.deepEqual(await voci(page, 'm-n'), [NOMI.lin, NOMI.fut]);
  assert.deepEqual(await voci(page, 'm-r'), [NOMI.pos, NOMI.pas, NOMI.val]);
  await ctx.close();
});

test('«altro» con testo finisce nella colonna scelta e le colonne vuote dicono «Nessuna voce»', async () => {
  const { page, ctx } = await t.pagina();
  for (const k of CHIAVI) await page.click(`label[for="${k}-r"]`);
  await page.fill('#altro', 'il colore preferito');
  await page.click('label[for="alt-c"]');
  await page.click('#vedi');
  assert.deepEqual(await voci(page, 'm-c'), ['Altro: il colore preferito']);
  assert.equal(await page.textContent('#m-n'), 'Nessuna voce');
  assert.equal((await voci(page, 'm-r')).length, 7);
  const testo = await page.evaluate(() => window.Esercizi.mappaTesto());
  assert.match(testo, /^resterebbe: .+ \| non so: - \| cambierebbe: Altro: il colore preferito$/);
  await ctx.close();
});

test('prima di premere il pulsante il testo della mappa è «prova non fatta»', async () => {
  const { page, ctx } = await t.pagina();
  assert.equal(await page.evaluate(() => window.Esercizi.mappaTesto()), 'prova non fatta');
  assert.equal(await page.evaluate(() => window.Esercizi.fontiTesto()), 'esercizio non fatto');
  await ctx.close();
});
