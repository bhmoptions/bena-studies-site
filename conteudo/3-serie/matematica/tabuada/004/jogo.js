(() => {
  const gamePage = new URL('./index.html', document.currentScript.src);

  // Se for carregado diretamente pelo shell do site sem redirecionar, move para a página própria
  if (location.pathname !== gamePage.pathname) {
    window.BENA_JOGO = {
      iniciar() {
        location.href = gamePage.href;
        return () => {};
      }
    };
    return;
  }

  const moduleUrl = new URL('./helix-app.mjs', document.currentScript.src).href;
  const CHAVE_PONTUACAO = '3-serie/matematica/tabuada/004';

  window.BENA_JOGO = {
    iniciar(container, voltar) {
      let helixInstance = null;
      let round = 1;

      // Elementos do DOM
      const hudLevel = container.querySelector('#hud-level');
      const hudProgress = container.querySelector('#hud-progress');
      const hudScore = container.querySelector('#hud-score');
      const currentQuestion = container.querySelector('#current-question');
      const feedbackEl = container.querySelector('.feedback');
      const floatingScore = container.querySelector('#floating-score');
      const btnRotateLeft = container.querySelector('#btn-rotate-left');
      const btnRotateRight = container.querySelector('#btn-rotate-right');
      const activeSection = container.querySelector('#helix-active-section');
      const questionCard = container.querySelector('#helix-question-card');
      const resultCard = container.querySelector('#helix-result-card');
      const resultFeedback = container.querySelector('.result-feedback');
      const resGameScore = container.querySelector('#res-game-score');
      const resScoreSummary = container.querySelector('#res-score-summary');
      const btnPlayAgain = container.querySelector('#btn-play-again');

      // Exibição do feedback flutuante (+3, +2, -1)
      let floatTimeout = null;
      function triggerFloatingScore(text, className) {
        if (!floatingScore) return;
        clearTimeout(floatTimeout);
        floatingScore.textContent = text;
        floatingScore.className = `floating-score pop-up ${className}`;
        floatTimeout = setTimeout(() => {
          floatingScore.className = 'floating-score';
        }, 800);
      }

      function startRound() {
        if (helixInstance) {
          helixInstance.dispose();
          helixInstance = null;
        }

        // Inicia contador de rodada oficial
        if (window.BenaPontuacao) {
          round = window.BenaPontuacao.iniciarRodada(CHAVE_PONTUACAO);
        }

        // Restaura painel e HUD
        if (activeSection) activeSection.hidden = false;
        if (resultCard) resultCard.hidden = true;
        if (hudLevel) hudLevel.textContent = '1';
        if (hudProgress) hudProgress.value = 1;
        if (hudScore) hudScore.textContent = '0';

        import(moduleUrl).then(({ createHelixGame }) => {
          helixInstance = createHelixGame(container, {
            onQuestionChange(platformIndex, problem) {
              const num = platformIndex + 1;
              if (hudLevel) hudLevel.textContent = String(num);
              if (hudProgress) hudProgress.value = num;
              if (currentQuestion) {
                currentQuestion.textContent = `${problem.a} × ${problem.b} = ?`;
              }
              if (window.BenaFeedback && feedbackEl) {
                window.BenaFeedback.mostrar(feedbackEl, 'ready');
              }
            },

            onScoreChange(newScore) {
              if (hudScore) hudScore.textContent = String(newScore);
            },

            onFloatingScore(text, className) {
              triggerFloatingScore(text, className);
            },

            onErrorHit(problem, wrongValue) {
              if (window.BenaFeedback && feedbackEl) {
                const hint = problem.hint || `${problem.a} × ${problem.b} = ${problem.correct}`;
                window.BenaFeedback.mostrar(feedbackEl, 'error', hint, 'Gire a torre para encontrar a resposta certa!');
              }
            },

            onSuccessHit(problem) {
              if (window.BenaFeedback && feedbackEl) {
                window.BenaFeedback.mostrar(feedbackEl, 'success', `${problem.a} × ${problem.b} = ${problem.correct}`);
              }
            },

            onGameComplete(stats) {
              // Conclusão das 10 plataformas
              if (activeSection) activeSection.hidden = true;
              if (resultCard) resultCard.hidden = false;
              if (resGameScore) resGameScore.textContent = String(stats.gameScore);

              const configPontuacao = (window.BENA_CONFIG_PONTUACAO && window.BENA_CONFIG_PONTUACAO[CHAVE_PONTUACAO]) || {};
              const resOficial = window.BenaPontuacao ? window.BenaPontuacao.calcular({
                total: stats.totalPlatforms,
                acertosPrimeira: stats.firstHits,
                erros: stats.totalErrors,
                rodada: round,
                concluida: true,
                tempoAtivo: false
              }) : { pontos: stats.gameScore, percentualAcertos: Math.round((stats.firstHits / stats.totalPlatforms) * 100) };

              if (resScoreSummary) {
                resScoreSummary.innerHTML = `
                  <strong class="score-value">${resOficial.pontos} pontos (Ranking Bena)</strong>
                  <p><strong>Pontuação da Torre:</strong> ${stats.gameScore} de 30 pontos acumulados</p>
                  <p><strong>Acertos de 1ª tentativa:</strong> ${stats.firstHits} de ${stats.totalPlatforms} plataformas</p>
                  <p><strong>Impactos em respostas erradas:</strong> ${stats.totalErrors} ${stats.totalErrors === 1 ? 'vez' : 'vezes'}</p>
                  <p>Precisão de primeira: ${resOficial.percentualAcertos}% · Rodada ${round} nesta aba</p>
                `;
              }

              if (window.BenaFeedback && resultFeedback) {
                window.BenaFeedback.mostrar(resultFeedback, 'success', 'Parabéns! Você completou toda a descida pela torre Helix!');
              }

              if (resultCard.querySelector('h2')) {
                resultCard.querySelector('h2').focus();
              }
            }
          });
        }).catch(err => {
          console.error('Falha ao carregar o módulo Helix Jump:', err);
          container.querySelector('.helix-canvas-container').innerHTML = `
            <div style="padding: 30px; text-align: center; color: #fff;">
              <h3>Não foi possível carregar a visualização 3D</h3>
              <p>Verifique se o navegador suporta WebGL ou tente recarregar.</p>
              <button type="button" onclick="location.reload()" class="primary">Tentar novamente</button>
            </div>
          `;
        });
      }

      // Eventos de rotação por botões
      if (btnRotateLeft) {
        btnRotateLeft.onclick = () => helixInstance?.rotateLeft();
      }
      if (btnRotateRight) {
        btnRotateRight.onclick = () => helixInstance?.rotateRight();
      }

      // Botão de jogar de novo
      if (btnPlayAgain) {
        btnPlayAgain.onclick = () => {
          startRound();
        };
      }

      startRound();

      return () => {
        if (helixInstance) {
          helixInstance.dispose();
          helixInstance = null;
        }
      };
    }
  };
})();
