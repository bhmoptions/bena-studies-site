/* education.js — carrega dados educacionais e configurações dinamicamente de game.json */
(function () {
  'use strict';

  function parseVelocidades(raw) {
    if (Array.isArray(raw)) {
      return raw.map(item => {
        const nome = String(item.nome || item.name || item.rotulo || item.label || '').trim();
        const valor = Number(item.valor ?? item.multiplicador ?? item.multiplier ?? item.speed);
        const padrao = Boolean(item.padrao || item.default || (valor === 1));
        return { nome, valor, padrao };
      }).filter(item => item.nome && !isNaN(item.valor) && item.valor > 0);
    }
    if (raw && typeof raw === 'object') {
      return Object.entries(raw).map(([nome, val]) => {
        let valor = 1;
        let padrao = false;
        if (typeof val === 'object' && val !== null) {
          valor = Number(val.valor ?? val.multiplicador ?? val.multiplier);
          padrao = Boolean(val.padrao || val.default || (valor === 1));
        } else {
          valor = Number(val);
          padrao = (valor === 1);
        }
        return { nome: String(nome).trim(), valor, padrao };
      }).filter(item => item.nome && !isNaN(item.valor) && item.valor > 0);
    }
    return [];
  }

  function parseData(json) {
    const rawQuestions = json['Questões'] || json.questions || [];
    const rawElements = json['Elementos'] || json.elements || [];
    const rawSpeeds = json['velocidades'] || json['Velocidades'] || json.speeds || [];
    const desafiosPedagogicos = Number(json['desafiospedagógicos'] || json['desafiosPedagogicos'] || json['desafios_pedagogicos']) || 10;

    const questions = rawQuestions.map(q => ({
      phrase: q.frase || q.phrase || '',
      type: (q.tipo || q.type || '').trim().toLowerCase()
    })).filter(q => q.phrase && q.type);

    const elements = rawElements.map(e => ({
      name: e.imagem || e.name || '',
      types: (e.tipos || e.types || []).map(t => String(t).trim().toLowerCase())
    })).filter(e => e.name && e.types.length);

    const parsedSpeeds = parseVelocidades(rawSpeeds);
    const speeds = parsedSpeeds.length ? parsedSpeeds : [
      { nome: 'Lento', valor: 0.5, padrao: false },
      { nome: 'Normal', valor: 1, padrao: true },
      { nome: 'Rápido', valor: 2, padrao: false },
      { nome: 'Supersônico', valor: 3, padrao: false }
    ];

    return { questions, elements, speeds, desafiosPedagogicos };
  }

  // Objeto base inicial compartilhado globalmente
  const DATA = {
    questions: [],
    elements: [],
    desafiosPedagogicos: 10,
    speeds: [
      { nome: 'Lento', valor: 0.5, padrao: false },
      { nome: 'Normal', valor: 1, padrao: true },
      { nome: 'Rápido', valor: 2, padrao: false },
      { nome: 'Supersônico', valor: 3, padrao: false }
    ]
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
      DATA.speeds = parsed.speeds;
      DATA.desafiosPedagogicos = parsed.desafiosPedagogicos;
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
      DATA.speeds = [
        { nome: 'Lento', valor: 0.5, padrao: false },
        { nome: 'Normal', valor: 1, padrao: true },
        { nome: 'Rápido', valor: 2, padrao: false },
        { nome: 'Supersônico', valor: 3, padrao: false }
      ];
      return DATA;
    });

  window.EducationDataPromise = loadPromise;
})();
