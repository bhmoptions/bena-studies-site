/* education.js — carrega dados educacionais dinamicamente de game.json */
(function () {
  'use strict';

  function parseData(json) {
    const rawQuestions = json['Questões'] || json.questions || [];
    const rawElements = json['Elementos'] || json.elements || [];

    const questions = rawQuestions.map(q => ({
      phrase: q.frase || q.phrase || '',
      type: (q.tipo || q.type || '').trim().toLowerCase()
    })).filter(q => q.phrase && q.type);

    const elements = rawElements.map(e => ({
      name: e.imagem || e.name || '',
      types: (e.tipos || e.types || []).map(t => String(t).trim().toLowerCase())
    })).filter(e => e.name && e.types.length);

    return { questions, elements };
  }

  // Objeto base inicial compartilhado globalmente
  const DATA = {
    questions: [],
    elements: []
  };
  window.EducationData = DATA;

  // Carregamento dinâmico de game.json
  const loadPromise = fetch('game.json')
    .then(res => {
      if (!res.ok) throw new Error('Falha ao carregar game.json: ' + res.status);
      return res.json();
    })
    .then(json => {
      const parsed = parseData(json);
      DATA.questions = parsed.questions;
      DATA.elements = parsed.elements;
      return DATA;
    })
    .catch(err => {
      console.warn('Aviso: Não foi possível carregar game.json via fetch, usando lista de contingência:', err);
      DATA.questions = [
        { phrase: 'Pegue apenas estrelas', type: 'estrela' },
        { phrase: 'Pegue apenas os planetas', type: 'planeta' },
        { phrase: 'Fuja de tudo, menos da Lua!', type: 'lua' },
        { phrase: 'Colete os corpos celestes', type: 'corpoceleste' },
        { phrase: 'Pegue somente os corpos luminosos', type: 'luminoso' },
        { phrase: 'Recolha apenas os corpos celestes iluminados', type: 'iluminado' },
        { phrase: 'Encontre os instrumentos de observação. Evite o resto!', type: 'observacao' },
        { phrase: 'Capture apenas o planeta em que vivemos', type: 'terra' },
        { phrase: 'Pegue o satélite do nosso planeta', type: 'lua' },
        { phrase: 'Capture apenas o corpo celeste que ilumina a Terra', type: 'sol' },
        { phrase: 'Pegue o planeta famoso por seus anéis!', type: 'saturno' },
        { phrase: 'Encontre objetos que produzem sua própria luz!', type: 'luminoso' }
      ];
      DATA.elements = [
        { name: 'Estrela', types: ['corpoceleste','estrela','luminoso'] },
        { name: 'Sol', types: ['corpoceleste','sol','estrela','luminoso'] },
        { name: 'Asteróide', types: ['corpoceleste','iluminado'] },
        { name: 'Terra', types: ['corpoceleste','planeta','terra','iluminado'] },
        { name: 'Marte', types: ['corpoceleste','planeta','iluminado'] },
        { name: 'Saturno', types: ['corpoceleste','planeta','saturno','iluminado'] },
        { name: 'Galáxia', types: ['corpoceleste','luminoso'] },
        { name: 'Buraco Negro', types: ['corpoceleste'] },
        { name: 'Lua', types: ['corpoceleste','lua','satelite'] },
        { name: 'Luneta', types: ['observacao'] },
        { name: 'Telescópio', types: ['observacao'] }
      ];
      return DATA;
    });

  window.EducationDataPromise = loadPromise;
})();
