/* Dati condivisi delle scene e della navigazione (piano §1.4). Li usano il browser (scenes.js, nav.js)
   e Node (tools/static-blobs.mjs). Nessun accesso al DOM.

   valore: posizione del punto lilla sull'asse fuori→dentro (0 = fuori, 100 = centro del blob); è il valore
   già presente negli indicatori di ogni tappa. stato: stato finale del blob (B2 specchiato nella tappa 8,
   per non ripetere la tappa 4). cluster: grappolo di anelli fitti [cx, cy] in un punto libero della scena.
   orbita: spostamento [dx, dy] del centro dell'orbita puntinata. scarto: spostamento del centro di massa
   nello stato intermedio dell'animazione (al massimo 45 unità su 600, cioè il 7,5% del riquadro). */
export const SCENE = [
  { id: 't1', nome: 'Omero', valore: 5, stato: 'B0', cluster: [136, 136], orbita: [0, 0], scarto: [30, -20] },
  { id: 't2', nome: 'Platone', valore: 25, stato: 'B1', cluster: [128, 148], orbita: [-6, 6], scarto: [-42, 26] },
  { id: 't3', nome: 'Agostino', valore: 55, stato: 'B3', cluster: [300, 80], orbita: [0, 0], scarto: [24, 30] },
  { id: 't4', nome: 'Montaigne', valore: 70, stato: 'B2', cluster: [155, 445], orbita: [6, 4], scarto: [-30, -24] },
  { id: 't5', nome: 'Descartes', valore: 85, stato: 'B4', cluster: [150, 150], orbita: [-4, 8], scarto: [36, 18] },
  { id: 't6', nome: 'Romantici', valore: 95, stato: 'B3', cluster: [300, 522], orbita: [0, 0], scarto: [-26, -30] },
  { id: 't7', nome: 'Sospetto', valore: 60, stato: 'B5', cluster: [150, 142], orbita: [4, -6], scarto: [40, 16] },
  { id: 't8', nome: 'Foucault', valore: 45, stato: 'B2', specchia: true, cluster: [445, 445], orbita: [-6, 4], scarto: [-36, 20] },
  { id: 't9', nome: 'Oggi', valore: 85, vuoto: 20, stato: 'B4', cluster: [160, 460], orbita: [6, 2], scarto: [28, -26] },
  { id: 'finale', sel: '#domande', valore: null, stato: 'B0', cluster: [464, 136], orbita: [0, 0], scarto: [-30, 20] },
];

/* stato da cui parte la prima scena: il simbolo dell'hero */
export const INIZIO = { stato: 'HERO', valore: 0 };

/* asse fuori→dentro nello stage (coordinate del viewBox 600) */
export const AX0 = 24, AX1 = 300, AY = 300;
export const xDi = (v) => +(AX0 + (AX1 - AX0) * v / 100).toFixed(1);
