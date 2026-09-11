// Configuração deste jogo: altere os números abaixo se quiser ajustar a prática.
window.BENA_JOGO = {
  iniciar(container, voltar) {
    const quantidade = 10;
    const tabuadas = [2, 3, 4, 5, 6, 7, 8, 9, 10];

    let contas = [];
    let indice = 0;
    let acertosDePrimeira = 0;
    let erros = 0;
    let rodada = 0;
    let inicio = 0;
    let fim = 0;
    const chavePontuacao = '3-serie/matematica/tabuada/001';
    const configPontuacao = window.BENA_CONFIG_PONTUACAO[chavePontuacao];
    function embaralhar(lista) {
      for (let i = lista.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [lista[i], lista[j]] = [lista[j], lista[i]];
      }
      return lista;
    }
    function iniciarRodada() {
      contas = embaralhar(Array.from({length: quantidade}, (_, i) => ({
        a: tabuadas[Math.floor(Math.random() * tabuadas.length)], b: i + 1
      })));
      indice = 0;
      acertosDePrimeira = 0;
      erros = 0;
      rodada = window.BenaPontuacao.iniciarRodada(chavePontuacao);
      inicio = performance.now();
      fim = 0;
      mostrarConta();
    }
    function mostrarMascote(estado, detalhe = '') {
      window.BenaFeedback.mostrar(container.querySelector('.feedback'), estado, detalhe);
    }

    function mostrarConta() {
      const {a, b} = contas[indice];
      const resultado = a * b;
      const alternativas = embaralhar([resultado, resultado + a, resultado - a]);
      let tentou = false;
      let concluida = false;
      container.innerHTML = `<div class="eyebrow">TABUADAS MISTURADAS • CONTA ${indice + 1} DE ${quantidade}</div><progress value="${indice}" max="${quantidade}" aria-label="Contas concluídas"></progress><h2 class="multiplication" tabindex="-1">${a} × ${b} = ?</h2><p>Qual é o resultado?</p>${configPontuacao.tempoAtivo ? '<p class="timing-note">Nesta rodada, o tempo vale um pequeno bônus. Pense com calma!</p>' : ''}<div class="feedback" role="status" aria-live="polite" aria-atomic="true"></div><div class="answers">${alternativas.map(n => `<button data-value="${n}">${n}</button>`).join('')}</div><button class="primary game-next" hidden>${indice === quantidade - 1 ? 'Ver meu resultado' : 'Próxima conta'} →</button><button class="topic game-back">← Voltar aos jogos</button>`;
      mostrarMascote('ready');
      container.querySelector('.multiplication').focus();
      container.querySelectorAll('[data-value]').forEach(button => button.onclick = () => {
        if (concluida) return;
        if (Number(button.dataset.value) !== resultado) {
          tentou = true;
          erros++;
          button.classList.add('retry');
          button.disabled = true;
          button.textContent = `× ${button.dataset.value}`; button.setAttribute('aria-label', `${button.dataset.value}, resposta incorreta`); mostrarMascote('error', `${a} × ${b} é o mesmo que somar ${Array(b).fill(a).join(' + ')}.`);
          return;
        }
        concluida = true;
        if (indice === quantidade - 1) fim = performance.now();
        if (!tentou) acertosDePrimeira++;
        button.classList.add('correct');
        container.querySelectorAll('[data-value]').forEach(item => item.disabled = true);
        button.textContent = `✓ ${resultado}`; button.setAttribute('aria-label', `${resultado}, resposta correta`); mostrarMascote('success', `${a} × ${b} = ${resultado}`);
        container.querySelector('progress').value = indice + 1;
        container.querySelector('.game-next').hidden = false;
        container.querySelector('.game-next').focus();
      });
      container.querySelector('.game-next').onclick = () => { indice++; if (indice < quantidade) mostrarConta(); else mostrarResultado(); };
      container.querySelector('.game-back').onclick = voltar;
    }
    function mostrarResultado() {
      const resultado = window.BenaPontuacao.calcular({
        total: quantidade, acertosPrimeira: acertosDePrimeira, erros, rodada, concluida: true,
        tempoAtivo: configPontuacao.tempoAtivo,
        segundos: configPontuacao.tempoAtivo ? (fim - inicio) / 1000 : null,
        referenciaSegundos: configPontuacao.tempoReferenciaSegundos
      });
      container.innerHTML = `<div class="modal-symbol" aria-hidden="true">✦</div><div class="eyebrow">RODADA CONCLUÍDA</div><h2 tabindex="-1">Você completou as 10 contas!</h2><p>Acertos na primeira tentativa: <strong>${acertosDePrimeira} de ${quantidade}</strong>.</p><p>${acertosDePrimeira === quantidade ? 'Mandou muito bem! Que tal jogar mais uma rodada?' : 'Cada tentativa ajuda a aprender. Vamos praticar mais um pouco?'}</p><div class="score-summary"><strong class="score-value">${resultado.pontos} pontos</strong><p>${resultado.percentualAcertos}% de acertos na primeira tentativa · ${erros} ${erros === 1 ? 'erro' : 'erros'}</p><p>Rodada ${rodada} deste jogo nesta aba${resultado.somenteTreino ? ' · somente treino' : ''}</p>${resultado.tempoAtivo ? `<p>Tempo: ${resultado.segundos.toFixed(1)} s · bônus: ${Math.round(resultado.bonusTempo * 100)}%</p>` : '<p>Tempo não vale pontos neste jogo.</p>'}</div><p class="notice">Pontuação de demonstração, sem ranking de alunos. Repetições contam nesta aba; ao atualizar a página, a contagem recomeça.</p><button class="primary game-again">Jogar de novo →</button><button class="topic game-back">← Voltar aos jogos</button>`;
      container.querySelector('h2').focus();
      container.querySelector('.game-again').onclick = iniciarRodada;
      container.querySelector('.game-back').onclick = voltar;
    }
    iniciarRodada();
  }
};
