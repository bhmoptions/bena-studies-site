// Cada tema pode ter vários jogos, organizados em pastas 001, 002, 003...
window.BENA_CONTEUDO = {
  3: {
    nome: '3ª série',
    materias: [{
      id: 'matematica', nome: 'Matemática', simbolo: '×',
      chamada: 'Uma ideia. Muitas soluções.',
      descricao: 'Descubra os números e multiplique a diversão.',
      temas: [{
        nome: 'Multiplicação e Divisão',
        jogos: [{
          id: '001', nome: 'Tabuada Race',
          descricao: 'Dez contas para praticar no seu ritmo.',
          arquivo: 'matematica/tabuada/001/jogo.js'
        }, {
          id: '002', nome: 'De novo essa fase?',
          descricao: 'A mesma sala. Uma nova regra a cada vez.',
          arquivo: 'matematica/tabuada/002/jogo.js',
          pagina: 'matematica/tabuada/002/index.html'
        }, {
          id: '003', nome: 'Puzzle Box - Multiplicação',
          descricao: 'Quatro mecanismos, frascos e um segredo em uma oficina 3D.',
          arquivo: 'matematica/tabuada/003/jogo.js',
          pagina: 'matematica/tabuada/003/index.html'
        }, {
          id: '004', nome: 'Tabuada Race2',
          descricao: 'Desça pela torre Helix acertando os produtos da tabuada.',
          arquivo: 'matematica/tabuada/004/jogo.js',
          pagina: 'matematica/tabuada/004/index.html'
        }]
      }]
    }]
  }
};

