// Cada tema pode ter vários jogos, organizados em pastas 001, 002, 003...
window.BENA_CONTEUDO = {
  3: {
    nome: '3ª série',
    materias: [
      {
        id: 'matematica',
        nome: 'Matemática',
        simbolo: '×',
        chamada: 'Uma ideia. Muitas soluções.',
        descricao: 'Descubra os números e multiplique a diversão.',
        temas: [
          {
            nome: 'Multiplicação e Divisão',
            jogos: [
              {
                id: '001',
                nome: 'Tabuada Race',
                descricao: 'Desça pela torre Helix acertando os produtos da tabuada.',
                arquivo: 'matematica/tabuada/001/jogo.js',
                pagina: 'matematica/tabuada/001/index.html'
              },
              {
                id: '002',
                nome: 'De novo essa fase?',
                descricao: 'A mesma sala. Uma nova regra a cada vez.',
                arquivo: 'matematica/tabuada/002/jogo.js',
                pagina: 'matematica/tabuada/002/index.html'
              },
              {
                id: '003',
                nome: 'Puzzle Box - Multiplicação',
                descricao: 'Quatro mecanismos, frascos e um segredo em uma oficina 3D.',
                arquivo: 'matematica/tabuada/003/jogo.js',
                pagina: 'matematica/tabuada/003/index.html'
              }
            ]
          }
        ]
      },
      {
        id: 'ciencias',
        nome: 'Ciências',
        simbolo: '🧪',
        chamada: 'Explore o universo e a natureza.',
        descricao: 'Descubra os mistérios da ciência e do espaço.',
        temas: [
          {
            nome: 'Astronomia & Espaço',
            jogos: [
              {
                id: 'ciencia-espacial',
                nome: 'Ciência Espacial',
                descricao: 'Explore o espaço e responda aos desafios científicos.',
                arquivo: 'ciencias/ciencia-espacial/jogo.js',
                pagina: 'ciencias/ciencia-espacial/index.html'
              },
              {
                id: 'andrews-run',
                nome: 'Andrews Run',
                descricao: 'Desvie dos obstáculos e capture os corpos celestes em alta velocidade pelo espaço!',
                arquivo: 'ciencias/andrews-run/jogo.js',
                pagina: 'ciencias/andrews-run/index.html'
              }
            ]
          }
        ]
      }
    ]
  }
};
