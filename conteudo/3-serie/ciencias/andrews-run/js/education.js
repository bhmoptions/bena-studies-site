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
    
    let desafiosPedagogicos = 20;
    let questionBatch = 20;
    if (json && typeof json === 'object') {
      for (const k of Object.keys(json)) {
        const cleanKey = k.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
        if (cleanKey === 'desafiospedagogicos') {
          const val = Number(json[k]);
          if (!isNaN(val) && val > 0) desafiosPedagogicos = val;
        } else if (cleanKey === 'questionbatch') {
          const val = Number(json[k]);
          if (!isNaN(val) && val > 0) questionBatch = val;
        }
      }
    }

    const questions = rawQuestions.map(q => ({
      phrase: q.frase || q.phrase || '',
      type: (q.tipo || q.type || '').trim().toLowerCase(),
      qtd: (q.qtd !== undefined && !isNaN(Number(q.qtd))) ? Number(q.qtd) : 0.20
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

    return { questions, elements, speeds, desafiosPedagogicos, questionBatch };
  }

  // Objeto base inicial compartilhado globalmente
  const DATA = {
    questions: [],
    elements: [],
    desafiosPedagogicos: 20,
    questionBatch: 20,
    speeds: [
      { nome: 'Lento', valor: 0.5, padrao: false },
      { nome: 'Normal', valor: 1, padrao: true },
      { nome: 'Rápido', valor: 2, padrao: false },
      { nome: 'Supersônico', valor: 3, padrao: false }
    ]
  };
  window.EducationData = DATA;

  // Carregamento dinâmico de game.json com cache-busting
  const loadPromise = fetch('game.json?v=' + Date.now(), { cache: 'no-store' })
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
      DATA.questionBatch = parsed.questionBatch;
      return DATA;
    })
    .catch(err => {
      console.warn('Aviso: Não foi possível carregar game.json via fetch, usando lista de contingência:', err);
      DATA.questions = [
        { phrase: 'Pegue apenas estrelas', type: 'estrela', qtd: 0.20 },
        { phrase: 'Pegue apenas os planetas', type: 'planeta', qtd: 0.25 },
        { phrase: 'Fuja de tudo, menos da Lua!', type: 'lua', qtd: 0.10 },
        { phrase: 'Colete os corpos celestes', type: 'corpoceleste', qtd: 0.80 },
        { phrase: 'Pegue somente os corpos luminosos', type: 'luminoso', qtd: 0.20 },
        { phrase: 'Recolha apenas os corpos celestes iluminados', type: 'iluminado', qtd: 0.20 },
        { phrase: 'Encontre os instrumentos de observação. Evite o resto!', type: 'observacao', qtd: 0.10 },
        { phrase: 'Capture apenas o planeta em que vivemos', type: 'terra', qtd: 0.10 },
        { phrase: 'Pegue o satélite do nosso planeta', type: 'lua', qtd: 0.10 },
        { phrase: 'Capture apenas o corpo celeste que ilumina a Terra', type: 'sol', qtd: 0.10 },
        { phrase: 'Pegue o planeta famoso por seus anéis!', type: 'saturno', qtd: 0.10 },
        { phrase: 'Encontre objetos que produzem sua própria luz!', type: 'luminoso', qtd: 0.20 }
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
      DATA.desafiosPedagogicos = 20;
      DATA.questionBatch = 20;
      return DATA;
    });

  window.EducationDataPromise = loadPromise;
})();
