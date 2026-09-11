// Padrão aprovado. Consulte docs/padrao-feedback-jogos.md.
window.BenaFeedback = { mostrar(area, estado, detalhe = '', orientacao = 'Escolha outra resposta abaixo ↓') {
      const certo = estado === 'success';
      const erro = estado === 'error';
      const titulo = certo ? '✓ ACERTOU!' : erro ? '× AINDA NÃO!' : 'Vamos nessa!';
      const mensagem = certo ? 'Boa descoberta!' : erro ? 'Vamos pensar juntos?' : 'Estou torcendo por você.';
      area.setAttribute('role', 'status');
      area.setAttribute('aria-live', 'polite');
      area.setAttribute('aria-atomic', 'true');
      const texto = document.createElement('span');
      texto.textContent = detalhe;
      detalhe = texto.innerHTML;
      area.className = `feedback mascot-feedback ${estado}`;
      area.innerHTML = `<div class="mascot-message"><svg class="notebook-buddy" viewBox="0 0 120 120" aria-hidden="true"><g class="buddy-stars"><path d="M16 10v12m-6-6h12M102 23v12m-6-6h12M91 3v10m-5-5h10"/></g><g class="buddy-character"><path class="buddy-arm left-arm" d="${certo ? 'M29 69 Q10 61 10 39' : 'M29 69 Q13 75 17 88'}"/><path class="buddy-arm right-arm" d="${certo ? 'M92 69 Q112 57 110 37' : erro ? 'M92 71 Q111 61 83 56' : 'M92 69 Q109 75 104 88'}"/><path class="buddy-feet" d="M45 98v10h-9m40-10v10h9"/><rect class="buddy-cover" x="27" y="25" width="66" height="75" rx="12"/><path class="buddy-spine" d="M38 28v68"/><path class="buddy-rings" d="M24 40h9m-9 14h9m-9 14h9m-9 14h9"/>${certo ? '<path class="buddy-face" d="M48 56q5-9 10 0m12 0q5-9 10 0M53 69q12 21 24 0Z"/>' : erro ? '<path class="buddy-face" d="M48 48l10 3m12 0l10-3M59 77q6-4 12 0"/><circle class="buddy-eye" cx="53" cy="59" r="3"/><circle class="buddy-eye" cx="75" cy="59" r="3"/>' : '<circle class="buddy-eye" cx="53" cy="56" r="3"/><circle class="buddy-eye" cx="75" cy="56" r="3"/><path class="buddy-face" d="M55 69q10 12 20 0"/>'}</g></svg><div><strong class="mascot-title">${titulo}</strong><span class="mascot-caption">${mensagem}</span>${certo ? `<span class="mascot-equation">${detalhe}</span>` : ''}</div></div>${erro ? `<div class="mascot-hint"><strong>Uma dica para você</strong><p>${detalhe}</p><span>Escolha outra resposta abaixo ↓</span></div>` : ''}`;
      const instrucao = area.querySelector('.mascot-hint > span');
      if (instrucao) instrucao.textContent = orientacao;
    }
};
