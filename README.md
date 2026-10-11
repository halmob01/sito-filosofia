# Dentro o fuori? Da dove viene ciò che ci orienta

Sito didattico statico (HTML, CSS e JavaScript nativo, senza build). I testi sono quelli approvati dal docente e non si modificano: la copia congelata è in `reference/contenuti-approvati.html`.

## Collegare il Modulo Google

L'unico file da toccare è `config.js`. Dentro ci sono le istruzioni passo passo (in italiano): bisogna incollare il link precompilato del Modulo al posto di `prefilledLink`. Finché il link è vuoto, l'invio dell'esercizio finale mostra «Invio non ancora configurato» e non spedisce nulla.

Da GitHub: apri `config.js`, premi la matita «Edit», incolla il link, poi «Commit changes».

## Pubblicare

Il sito si pubblica con GitHub Pages dal branch `main`, cartella root (impostazioni della repo, sezione Pages). Il file `.nojekyll` evita l'elaborazione di Jekyll.

## Struttura

- `index.html`: contenuti e markup di layout
- `config.js`: configurazione dell'invio
- `css/`: token, base, layout, componenti, scene
- `js/`: logica degli esercizi (`esercizi.js`), invio al Modulo (`form.js`) e libreria dei blob (`blob.js`)
- `vendor/gsap/`: GSAP 3.13.0 e ScrollTrigger (non ancora usati)
- `fonts/`: Anton, Geist e Geist Mono in WOFF2, con licenze OFL
- `reference/`: copia congelata dei contenuti approvati (serve solo ai test)
- `tools/`: strumenti di sviluppo e test (non servono al deploy). `static-blobs.mjs` riscrive i blob statici in `index.html` (non modificarli a mano), `blob-lab.html` è il laboratorio dei blob

## Verifiche (per chi sviluppa)

```
cd tools
npm install          # solo se manca playwright; il browser va indicato con PW_CHROMIUM
node check-content.mjs   # confronto dei testi con la copia approvata: deve dare 0 differenze
node --test tests/       # test di comportamento
```

`PW_CHROMIUM` è il percorso di un Chromium già installato (predefinito: `/opt/pw-browsers/chromium`).
