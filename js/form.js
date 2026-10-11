/* Esercizio finale e invio al Modulo Google.
   Logica identica a quella del sito approvato. L'unica differenza: il link
   precompilato non è più qui dentro ma in config.js (window.SITE_CONFIG.prefilledLink),
   e il testo degli esercizi 1 e 2 arriva da window.Esercizi (esercizi.js). */
(function () {
  function fontiTesto() { return window.Esercizi.fontiTesto(); }
  function mappaTesto() { return window.Esercizi.mappaTesto(); }

  /* ---------- invio della risposta ---------- */
  var TOKENS = ['GRUPPO','RISPOSTA','DECISIONE','VOCI','PERCHE','FUTURO','MAPPA','FONTI'];
  function parseLink(link) {
    try {
      var u = new URL(link);
      var m = u.pathname.match(/\/forms\/d\/e\/([^\/]+)/);
      if (!m) return null;
      var keys = {};
      u.searchParams.forEach(function (v, k) {
        if (k.indexOf('entry.') === 0 && TOKENS.indexOf(v) !== -1) keys[v] = k;
      });
      if (!keys.RISPOSTA) return null;
      return { url: 'https://docs.google.com/forms/d/e/' + m[1] + '/formResponse', keys: keys };
    } catch (e) { return null; }
  }

  var POS = { d: 'dentro', n: 'non so', f: 'fuori' };
  function raccogli() {
    var dec = document.querySelector('input[name="dec"]:checked');
    var voci = [], mancanti = false;
    for (var i = 1; i <= 5; i++) {
      var nome = document.getElementById('n' + i).value.trim();
      var pos = document.querySelector('input[name="p' + i + '"]:checked');
      if (nome.length < 2 || !pos) mancanti = true;
      if (nome || pos) voci.push(nome + ' (' + (pos ? POS[pos.value] : 'non indicato') + ')');
    }
    return {
      dec: dec ? dec.value : '',
      voci: voci,
      mancanti: mancanti,
      q3: document.getElementById('q3').value.trim(),
      q4: document.getElementById('q4').value.trim()
    };
  }

  var form = document.getElementById('f');
  var msg = document.getElementById('msg');
  var btn = document.getElementById('btn');
  var area = document.getElementById('form-area');

  function err(t) { msg.className = 'err'; msg.textContent = t; }

  /* Segnalazione dei campi mancanti: bordo di errore (aria-invalid) e focus sul primo.
     Non cambia le validazioni né il loro ordine. */
  function segna(el) { if (el) el.setAttribute('aria-invalid', 'true'); }
  function pulisciSegni() {
    [].forEach.call(form.querySelectorAll('[aria-invalid]'), function (e) { e.removeAttribute('aria-invalid'); });
  }
  function vaiA(el) { if (el && el.focus) el.focus(); }
  form.addEventListener('input', function (ev) { ev.target.removeAttribute('aria-invalid'); });
  form.addEventListener('change', function (ev) {
    var g = ev.target.closest && ev.target.closest('[role=radiogroup]');
    if (g) g.removeAttribute('aria-invalid');
  });

  function thanks() {
    area.innerHTML = '<div class="ok"><strong>Grazie, risposta inviata.</strong></div>' +
      '<button class="again" type="button" id="again">Scrivi un’altra risposta</button>';
    document.getElementById('again').addEventListener('click', function () { window.location.hash = 'domande'; window.location.reload(); });
  }

  /* segna tutte le voci incomplete e porta il focus sulla prima (il nome se è troppo corto, altrimenti la scelta) */
  function segnaVoci() {
    var primo = null;
    for (var i = 1; i <= 5; i++) {
      var campo = document.getElementById('n' + i);
      var pos = document.querySelector('input[name="p' + i + '"]:checked');
      var corto = campo.value.trim().length < 2;
      if (!corto && pos) continue;
      segna(campo.closest('[role=radiogroup]'));
      if (!primo) primo = corto ? campo : document.getElementById('p' + i + '-d');
    }
    vaiA(primo);
  }

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    msg.className = ''; msg.textContent = '';
    pulisciSegni();
    if (document.getElementById('site').value) { thanks(); return; }
    var d = raccogli();
    var g = '';
    if (!d.dec) { err('Scegli che cosa decidi di fare (domanda 1).'); segna(document.getElementById('dec-f').closest('[role=radiogroup]')); vaiA(document.getElementById('dec-f')); return; }
    if (d.mancanti) { segnaVoci(); err('Domanda 2: dai un nome a tutte le cinque voci (compresa la sensazione nello stomaco) e scegli per ognuna dentro, fuori o non so.'); return; }
    if (d.q3.length < 40) { err('Domanda 3: scrivi almeno due frasi.'); segna(document.getElementById('q3')); vaiA(document.getElementById('q3')); return; }
    if (d.q4.length < 20) { err('Domanda 4: scrivi almeno una frase.'); segna(document.getElementById('q4')); vaiA(document.getElementById('q4')); return; }
    var cfg = parseLink((window.SITE_CONFIG && window.SITE_CONFIG.prefilledLink) || '');
    if (!cfg) { err('Invio non ancora configurato: la risposta non è stata inviata.'); return; }
    btn.disabled = true;
    form.setAttribute('aria-busy', 'true');   // solo stile: linea di avanzamento sul pulsante
    var vociTxt = d.voci.join('; ');
    var completo = 'DECISIONE: ' + d.dec +
      '\nVOCI: ' + vociTxt +
      '\nPERCHE: ' + d.q3 +
      '\nFUTURO: ' + d.q4 +
      '\nFONTI: ' + fontiTesto();
    var valori = { GRUPPO: g, RISPOSTA: completo, DECISIONE: d.dec, VOCI: vociTxt, PERCHE: d.q3, FUTURO: d.q4, MAPPA: mappaTesto(), FONTI: fontiTesto() };
    var body = new URLSearchParams();
    Object.keys(cfg.keys).forEach(function (t) { body.set(cfg.keys[t], valori[t]); });
    fetch(cfg.url, { method: 'POST', mode: 'no-cors', body: body })
      .then(thanks)
      .catch(function () {
        btn.disabled = false;
        form.removeAttribute('aria-busy');
        err('Non sono riuscito a inviare. Controlla la connessione e riprova: il testo è ancora qui.');
      });
  });
})();
