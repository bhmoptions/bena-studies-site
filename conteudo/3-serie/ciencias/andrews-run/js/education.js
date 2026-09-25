/* education.js — educational questions/elements copied from game.json */
(function () {
  'use strict';
  const DATA = {
    questions: [
      { phrase: 'Pegue apenas estrelas', type: 'estrela' },
      { phrase: 'Pegue apenas planetas', type: 'planeta' }
    ],
    elements: [
      { name: 'Estrela', types: ['corpoceleste','estrela','luminoso'] },
      { name: 'Sol', types: ['corpoceleste','sol','estrela','luminoso'] },
      { name: 'Asteróide', types: ['corpoceleste','iluminado'] },
      { name: 'Terra', types: ['corpoceleste','planeta','terra','iluminado'] },
      { name: 'Marte', types: ['corpoceleste','planeta','iluminado'] },
      { name: 'Saturno', types: ['corpoceleste','planeta','saturno','iluminado'] },
      { name: 'Galáxia', types: ['corpoceleste','luminoso'] },
      { name: 'Buraco Negro', types: ['corpoceleste'] },
      { name: 'Lua', types: ['corpoceleste','lua','satelite'] },
      { name: 'Luneta', types: ['instrumento','optico'] },
      { name: 'Telescópio', types: ['instrumento','optico'] }
    ]
  };
  window.EducationData = DATA;
})();
