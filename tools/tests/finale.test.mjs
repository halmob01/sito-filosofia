// Esercizio finale: validazioni nell'ordine giusto, invio al Modulo, honeypot, invio non configurato.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { avvia, compilaFinale, LINK_FINTO_BASE, LINK_FINTO_TUTTI } from './helpers.mjs';

let t;
before(async () => { t = await avvia(); });
after(async () => { await t.chiudi(); });

const msg = (page) => page.textContent('#msg');
const classeMsg = (page) => page.getAttribute('#msg', 'class');

/** Intercetta i POST verso il Modulo e li registra */
async function intercetta(page, { fallisci = false } = {}) {
  const richieste = [];
  await page.route('**/formResponse', async (route) => {
    const r = route.request();
    richieste.push({ url: r.url(), metodo: r.method(), corpo: new URLSearchParams(r.postData() || '') });
    if (fallisci) return route.abort('failed');
    return route.fulfill({ status: 200, contentType: 'text/html', body: 'ok' });
  });
  return richieste;
}

test('validazioni nell\'ordine: decisione, voci, domanda 3, domanda 4', async () => {
  const { page, ctx, problemi } = await t.pagina();
  await page.click('#btn');
  assert.equal(await msg(page), 'Scegli che cosa decidi di fare (domanda 1).');
  assert.equal(await classeMsg(page), 'err');

  await page.click('label[for="dec-f"]');
  await page.click('#btn');
  assert.equal(await msg(page), 'Domanda 2: dai un nome a tutte le cinque voci (compresa la sensazione nello stomaco) e scegli per ognuna dentro, fuori o non so.');

  // quattro voci su cinque: ancora l'errore della domanda 2
  await compilaFinale(page, { dec: null, voci: [['il desiderio', 'd'], ['il dovere', 'd'], ['la reputazione', 'f'], ['il distacco', 'n']], q3: null, q4: null });
  await page.click('#btn');
  assert.match(await msg(page), /^Domanda 2:/);

  // nome troppo corto (1 carattere): ancora domanda 2
  await page.fill('#n5', 'a'); await page.click('label[for="p5-n"]');
  await page.click('#btn');
  assert.match(await msg(page), /^Domanda 2:/);

  await page.fill('#n5', 'la pancia');
  await page.click('#btn');
  assert.equal(await msg(page), 'Domanda 3: scrivi almeno due frasi.');
  await page.fill('#q3', 'troppo corta');
  await page.click('#btn');
  assert.equal(await msg(page), 'Domanda 3: scrivi almeno due frasi.');

  await page.fill('#q3', 'Ho ascoltato di più la voce del dovere, perché avevo dato la mia parola e non volevo deludere.');
  await page.click('#btn');
  assert.equal(await msg(page), 'Domanda 4: scrivi almeno una frase.');
  await page.fill('#q4', 'corta');
  await page.click('#btn');
  assert.equal(await msg(page), 'Domanda 4: scrivi almeno una frase.');
  assert.deepEqual(problemi, []);
  await ctx.close();
});

test('con il link vuoto compare «Invio non ancora configurato» e non parte nessuna richiesta', async () => {
  const { page, ctx } = await t.pagina();
  const richieste = await intercetta(page);
  await compilaFinale(page);
  await page.click('#btn');
  assert.equal(await msg(page), 'Invio non ancora configurato: la risposta non è stata inviata.');
  assert.equal(await classeMsg(page), 'err');
  assert.equal(await page.locator('#btn').isDisabled(), false);
  assert.equal(richieste.length, 0);
  await ctx.close();
});

test('un link senza il segnaposto RISPOSTA conta come non configurato', async () => {
  const { page, ctx } = await t.pagina({ link: 'https://docs.google.com/forms/d/e/FAKE/viewform?entry.8=FONTI' });
  const richieste = await intercetta(page);
  await compilaFinale(page);
  await page.click('#btn');
  assert.equal(await msg(page), 'Invio non ancora configurato: la risposta non è stata inviata.');
  assert.equal(richieste.length, 0);
  await ctx.close();
});

test('POST con la sola domanda RISPOSTA più FONTI: i campi arrivano e il testo completo è in RISPOSTA', async () => {
  const { page, ctx } = await t.pagina({ link: LINK_FINTO_BASE });
  const richieste = await intercetta(page);
  await compilaFinale(page);
  await page.click('#btn');
  await page.waitForSelector('.ok');
  assert.equal(richieste.length, 1);
  const r = richieste[0];
  assert.equal(r.metodo, 'POST');
  assert.equal(r.url, 'https://docs.google.com/forms/d/e/FAKE/formResponse');
  assert.deepEqual([...r.corpo.keys()].sort(), ['entry.2', 'entry.8']);
  assert.equal(r.corpo.get('entry.8'), 'esercizio non fatto');
  assert.equal(r.corpo.get('entry.2'),
    'DECISIONE: Aiuto l’amico col trasloco' +
    '\nVOCI: il desiderio (dentro); il dovere (dentro); la reputazione (fuori); il distacco (non so); la pancia (non so)' +
    '\nPERCHE: Ho ascoltato di più la voce del dovere, perché avevo dato la mia parola e non volevo deludere nessuno.' +
    '\nFUTURO: La voce che mi dice di mantenere la parola data.' +
    '\nFONTI: esercizio non fatto');
  assert.match(await page.textContent('.ok'), /Grazie, risposta inviata\./);
  assert.equal(await page.locator('#again').count(), 1);
  await ctx.close();
});

test('POST con tutti i token facoltativi, esercizio 1 confermato e prova della nascita fatta', async () => {
  const { page, ctx } = await t.pagina({ link: LINK_FINTO_TUTTI });
  const richieste = await intercetta(page);
  // esercizio 1
  await page.click('#fonti-ok');
  const attesoFonti = await page.evaluate(() => window.Esercizi.fontiTesto());
  assert.match(attesoFonti, / > .* \(dalla più fuori alla più dentro\)$/);
  // esercizio 2
  for (const k of ['fam', 'pos', 'lin', 'pas', 'sgu', 'fut', 'val']) await page.click(`label[for="${k}-r"]`);
  await page.click('#vedi');
  const attesoMappa = await page.evaluate(() => window.Esercizi.mappaTesto());
  assert.match(attesoMappa, /^resterebbe: .+ \| non so: - \| cambierebbe: -$/);
  await compilaFinale(page);
  await page.click('#btn');
  await page.waitForSelector('.ok');
  assert.equal(richieste.length, 1);
  const c = richieste[0].corpo;
  assert.deepEqual([...c.keys()].sort(), ['entry.1', 'entry.2', 'entry.3', 'entry.4', 'entry.5', 'entry.6', 'entry.7', 'entry.8']);
  assert.equal(c.get('entry.1'), '');                       // GRUPPO: non si chiede più
  assert.equal(c.get('entry.3'), 'Aiuto l’amico col trasloco');   // DECISIONE
  assert.equal(c.get('entry.4'), 'il desiderio (dentro); il dovere (dentro); la reputazione (fuori); il distacco (non so); la pancia (non so)');
  assert.match(c.get('entry.5'), /^Ho ascoltato di più la voce del dovere/);     // PERCHE
  assert.equal(c.get('entry.6'), 'La voce che mi dice di mantenere la parola data.');   // FUTURO
  assert.equal(c.get('entry.7'), attesoMappa);              // MAPPA
  assert.equal(c.get('entry.8'), attesoFonti);              // FONTI
  assert.ok(c.get('entry.2').includes('\nFONTI: ' + attesoFonti));
  await ctx.close();
});

test('honeypot compilato: nessuna richiesta, ma l\'utente vede il ringraziamento', async () => {
  const { page, ctx } = await t.pagina({ link: LINK_FINTO_BASE });
  const richieste = await intercetta(page);
  await page.evaluate(() => { document.getElementById('site').value = 'bot'; });
  await page.click('#btn');
  await page.waitForSelector('.ok');
  assert.equal(richieste.length, 0);
  await ctx.close();
});

test('se l\'invio fallisce il testo resta e il pulsante torna attivo', async () => {
  const { page, ctx } = await t.pagina({ link: LINK_FINTO_BASE });
  await intercetta(page, { fallisci: true });
  await compilaFinale(page);
  await page.click('#btn');
  await page.waitForFunction(() => document.getElementById('msg').textContent.startsWith('Non sono riuscito'));
  assert.equal(await msg(page), 'Non sono riuscito a inviare. Controlla la connessione e riprova: il testo è ancora qui.');
  assert.equal(await page.locator('#btn').isDisabled(), false);
  assert.equal(await page.inputValue('#q4'), 'La voce che mi dice di mantenere la parola data.');
  await ctx.close();
});
