# Dentro o fuori? Da dove viene ciò che ci orienta

Questo è il sito didattico della storia dell’interiorità: una pagina che si legge scorrendo, con tre esercizi per gli studenti (le voci della tua identità, la prova della nascita, l’esercizio finale).

**Indirizzo del sito:** https://halmob01.github.io/sito-filosofia/

Ogni tappa ha un indirizzo diretto, utile per proiettare in classe da un punto preciso: aggiungi in fondo `#t1`, `#t2` … fino a `#t9` (per esempio `https://halmob01.github.io/sito-filosofia/#t4`). `#domande` porta all’esercizio finale.

---

## 1. Collegare il Modulo Google (per ricevere le risposte)

Finché il Modulo non è collegato, il sito funziona, ma quando uno studente preme «Invia la risposta» compare «Invio non ancora configurato» e non parte niente. Servono dieci minuti, una volta sola.

### Passo 1: creare il Modulo

1. Vai su [forms.google.com](https://forms.google.com) e crea un Modulo vuoto. Il titolo lo scegli tu.
2. Crea queste domande, con questi nomi (scrivi «Perche» senza accento, per comodità):

| Nome della domanda | Tipo | Obbligatoria? |
|---|---|---|
| Risposta | Paragrafo | **Sì** |
| Decisione | Risposta breve | No |
| Voci | Paragrafo | No |
| Perche | Paragrafo | No |
| Futuro | Paragrafo | No |
| Mappa | Paragrafo | No |
| Fonti | Paragrafo | No |

   «Risposta» è l’unica indispensabile: riceve sempre il testo completo di tutto. Le altre servono se vuoi ogni parte in una colonna sua del foglio, più comoda da leggere.

3. Apri la scheda **Impostazioni** del Modulo e controlla:
   - **non** chiedere l’accesso con l’account Google (gli studenti non devono accedere);
   - **non** attivare «Limita a una risposta»;
   - **non** raccogliere gli indirizzi e-mail.

### Passo 2: ottenere il link precompilato

1. In alto a destra nel Modulo premi i tre puntini **⋮** e scegli **«Ottieni link precompilato»**.
2. Si apre una versione del Modulo da compilare. In **ogni domanda** scrivi, in maiuscolo, il segnaposto che porta il suo nome:

   | Nella domanda | Scrivi |
   |---|---|
   | Risposta | `RISPOSTA` |
   | Decisione | `DECISIONE` |
   | Voci | `VOCI` |
   | Perche | `PERCHE` |
   | Futuro | `FUTURO` |
   | Mappa | `MAPPA` |
   | Fonti | `FONTI` |

   (Se hai creato solo «Risposta», scrivi solo `RISPOSTA`.)
3. In fondo premi **«Ottieni link»**, poi **«Copia link»**. È un indirizzo lungo che contiene `entry.` e i segnaposto.

### Passo 3: incollare il link nel sito

1. Apri la pagina della repo su GitHub e clicca il file **`config.js`**.
2. In alto a destra premi la **matita** («Edit this file»).
3. Trova la riga `prefilledLink: ""`. Incolla il link **tra le due virgolette**, senza cancellarle:
   `prefilledLink: "https://docs.google.com/forms/d/e/.../viewform?usp=pp_url&entry.123=RISPOSTA&..."`
4. In alto a destra premi **«Commit changes…»** e poi di nuovo **«Commit changes»** nella finestra che si apre.
5. **Aspetta uno o due minuti**: GitHub aggiorna il sito da solo.

### Passo 4: provare l’invio

1. Apri il sito (meglio da una finestra in incognito, o ricaricando con forza), vai all’esercizio finale, compilalo e premi «Invia la risposta». Deve comparire «Grazie, risposta inviata.»
2. Nel Modulo apri la scheda **Risposte**: la prova deve essere lì. Cancellala poi con il cestino, così non si mescola a quelle degli studenti.
3. Se compare ancora «Invio non ancora configurato», il link non è stato incollato bene: controlla che sia tra le virgolette e che contenga `RISPOSTA`.

### Dove trovare le risposte

Nel Modulo, scheda **Risposte**: premi **«Collega a Fogli»** (icona verde). Si apre un foglio con una riga per studente. Per averlo in Excel: **File → Scarica → Microsoft Excel (.xlsx)**.

---

## 2. Modificare un testo del sito

1. Su GitHub apri **`index.html`** e premi la **matita**.
2. Per trovare la frase usa la ricerca dentro l’editor (clic nel testo, poi `Ctrl+F` oppure `Cmd+F`).
3. Cambia **solo le parole**. Non toccare i segni tra `<` e `>` (sono le istruzioni di impaginazione) né le righe che contengono `<!--blob:` (sono i disegni, vengono generati da un programma).
4. Premi **«Commit changes…»**, poi di nuovo «Commit changes», e aspetta uno o due minuti.

**Attenzione:** su GitHub non gira il controllo automatico che confronta i testi con la versione approvata (`check-content`). Se cambi un testo, la versione approvata in `reference/contenuti-approvati.html` resta quella vecchia: chi lavora al sito dal computer dovrà aggiornarla. Se dopo la modifica la pagina appare rotta, annulla: nella cronologia del file (pulsante «History») puoi tornare alla versione precedente.

---

## 3. Cinque controlli da fare su iPhone

Safari su iPhone si può provare solo sul telefono vero. Dopo ogni modifica importante:

1. **Scroll delle aperture.** Scorri dall’inizio fino alla tappa 3: ogni apertura deve scorrere in modo fluido, senza scatti, senza che la pagina si blocchi e senza testo sovrapposto ai disegni.
2. **Barra e pannello «Mappa».** Dalla tappa 1 in poi compare in alto una barra con «01 / 09» e il pulsante «Mappa». Premilo: si apre il pannello con il grafico; «Chiudi» lo chiude. Tocca un nodo: porta alla tappa.
3. **Esercizi.** Nel primo esercizio sposta le voci con le frecce e premi «Confermo l’ordine»; nel secondo scegli le tre risposte per ogni riga e premi «Vedi dove cadono». Tutti i pulsanti devono essere facili da toccare e il testo non deve ingrandirsi da solo quando scrivi in un campo.
4. **Invio di prova.** Compila l’esercizio finale e invia: deve comparire «Grazie, risposta inviata.» e la risposta deve arrivare nel Modulo. Prova anche a inviare con un campo vuoto: deve comparire il messaggio rosso e il campo mancante evidenziato.
5. **Rotazione.** Ruota il telefono in orizzontale e di nuovo in verticale a metà della pagina: niente testo tagliato, niente scorrimento laterale.

---

## 4. Com’è fatto (per chi lavora al sito)

- `index.html`: contenuti e impaginazione. `config.js`: il link del Modulo.
- `css/`, `js/`: stile e comportamento. `vendor/gsap/`: la libreria delle animazioni.
- `fonts/`: i caratteri, con le licenze.
- `reference/contenuti-approvati.html`: copia dei testi approvati (serve solo ai controlli).
- `tools/`: strumenti di sviluppo e prove automatiche (non servono al sito pubblicato). Dalla cartella `tools`: `node check-content.mjs` confronta i testi (deve dare «0 differenze») e `npm test` lancia le prove. Il browser da usare si indica con la variabile `PW_CHROMIUM`.

Il sito si pubblica con GitHub Pages dal ramo `main`; il file `.nojekyll` serve a evitare elaborazioni inutili.

## Crediti

- **Anton** (titoli), **Geist** e **Geist Mono** (interfaccia e numeri), **EB Garamond** (testi da leggere e testo degli esercizi): caratteri con licenza libera SIL Open Font License 1.1. I testi delle licenze sono in `fonts/OFL-*.txt`. I caratteri sono ospitati sul sito stesso: nessun dato degli studenti va a Google Fonts.
- **GSAP 3.13.0** con il plugin ScrollTrigger (GreenSock), usato per le animazioni dello scorrimento secondo la licenza standard gratuita di GSAP; il testo è in `vendor/gsap/LICENSE.txt`.
