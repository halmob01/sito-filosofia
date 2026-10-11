/* Primo e secondo esercizio: ordine delle fonti e prova della nascita.
   Logica identica a quella del sito approvato (era nello script inline).
   Le due funzioni che servono all'invio sono esposte in window.Esercizi. */
(function () {
  /* ---------- primo esercizio: ordine delle fonti ---------- */
  var listaFonti = document.getElementById('fonti');
  var fontiOk = document.getElementById('fonti-ok');
  var fontiMsg = document.getElementById('fonti-msg');
  var fontiConf = false;
  (function mescola() {
    var li = [].slice.call(listaFonti.children);
    for (var i = li.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = li[i]; li[i] = li[j]; li[j] = t;
    }
    li.forEach(function (e) { listaFonti.appendChild(e); });
  })();
  function aggiornaFrecce() {
    var li = [].slice.call(listaFonti.children);
    li.forEach(function (e, i) {
      e.querySelector('.su').disabled = (i === 0);
      e.querySelector('.giu').disabled = (i === li.length - 1);
    });
  }
  function testoFonte(e) {
    var inp = e.querySelector('input');
    if (inp) { var v = inp.value.trim(); return v ? 'Altro: ' + v : 'Altro'; }
    return e.querySelector('.ft').textContent;
  }
  /* dentro una frase la voce torna con l’iniziale minuscola, com’era nel testo approvato */
  function nellaFrase(t) { return t.charAt(0).toLowerCase() + t.slice(1); }
  listaFonti.addEventListener('click', function (ev) {
    var b = ev.target.closest('button');
    if (!b) return;
    var li = b.closest('li');
    if (b.classList.contains('su') && li.previousElementSibling) listaFonti.insertBefore(li, li.previousElementSibling);
    if (b.classList.contains('giu') && li.nextElementSibling) listaFonti.insertBefore(li.nextElementSibling, li);
    aggiornaFrecce();
    var nuovo = li.querySelector(b.classList.contains('su') ? '.su' : '.giu');
    if (nuovo && !nuovo.disabled) nuovo.focus();
    fontiConf = false; fontiMsg.textContent = ''; fontiOk.textContent = 'Confermo l’ordine'; fontiOk.classList.remove('fatto');
  });
  fontiOk.addEventListener('click', function () {
    fontiConf = true;
    var li = [].slice.call(listaFonti.children);
    fontiMsg.textContent = 'Ordine confermato. Più fuori di te: ' + nellaFrase(testoFonte(li[0])) + '. Più dentro di te: ' + nellaFrase(testoFonte(li[li.length - 1])) + '.';
    fontiOk.textContent = 'Ordine confermato';
    fontiOk.classList.add('fatto');   // solo stile: il pulsante diventa «vuoto» quando l’ordine è confermato
  });
  aggiornaFrecce();
  function fontiTesto() {
    if (!fontiConf) return 'esercizio non fatto';
    return [].slice.call(listaFonti.children).map(testoFonte).join(' > ') + ' (dalla più fuori alla più dentro)';
  }

  /* ---------- prova della nascita ---------- */
  var VOCI = [
    { k: 'fam', t: 'La musica che mi piace' },
    { k: 'pos', t: 'Ciò che considero giusto e sbagliato' },
    { k: 'lin', t: 'L’idea che ho di me' },
    { k: 'pas', t: 'Il mio carattere' },
    { k: 'sgu', t: 'Ciò che voglio fare da grande' },
    { k: 'fut', t: 'Le parole e le frasi che uso' },
    { k: 'val', t: 'Le cose di cui ho paura' },
    { k: 'alt', t: 'Altro' }
  ];
  var prova = document.getElementById('prova');
  var vedi = document.getElementById('vedi');
  var manca = document.getElementById('manca');
  var risultato = document.getElementById('risultato');
  var mappa = null;

  function scelta(k) {
    var el = document.querySelector('input[name="' + k + '"]:checked');
    return el ? el.value : null;
  }
  function risposte() {
    var n = 0;
    for (var i = 0; i < 7; i++) { if (scelta(VOCI[i].k)) n++; }
    return n;
  }
  function aggiornaStato() {
    var n = risposte();
    vedi.disabled = n < 7;
    manca.classList.toggle('pronto', n >= 7);   // solo stile
    manca.textContent = n < 7 ? 'Mancano ' + (7 - n) + ' risposte (tranne «altro»).' : 'Pronto: premi il pulsante.';
  }
  prova.addEventListener('change', aggiornaStato);
  aggiornaStato();

  function etichetta(v) {
    if (v.k !== 'alt') return v.t;
    var t = document.getElementById('altro').value.trim();
    return t ? 'Altro: ' + t : 'Altro';
  }
  function costruisciMappa() {
    var res = { c: [], n: [], r: [] };
    VOCI.forEach(function (v) {
      var s = scelta(v.k);
      if (s) res[s].push(etichetta(v));
    });
    return res;
  }
  function riempi(id, lista) {
    var box = document.getElementById(id);
    while (box.firstChild) box.removeChild(box.firstChild);
    if (!lista.length) {
      var p = document.createElement('p');
      p.className = 'vuoto';
      p.textContent = 'Nessuna voce';
      box.appendChild(p);
      return;
    }
    var ul = document.createElement('ul');
    lista.forEach(function (t) {
      var li = document.createElement('li');
      li.textContent = t;
      ul.appendChild(li);
    });
    box.appendChild(ul);
  }
  prova.addEventListener('submit', function (ev) {
    ev.preventDefault();
    if (risposte() < 7) return;
    mappa = costruisciMappa();
    riempi('m-c', mappa.c);
    riempi('m-n', mappa.n);
    riempi('m-r', mappa.r);
    risultato.hidden = false;
    vedi.textContent = 'Aggiorna la mappa';
    risultato.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
  function mappaTesto() {
    if (!mappa) return 'prova non fatta';
    return 'resterebbe: ' + (mappa.r.join('; ') || '-') +
      ' | non so: ' + (mappa.n.join('; ') || '-') +
      ' | cambierebbe: ' + (mappa.c.join('; ') || '-');
  }

  window.Esercizi = { fontiTesto: fontiTesto, mappaTesto: mappaTesto };
})();
