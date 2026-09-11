(() => {
  const gamePage = new URL('./index.html', document.currentScript.src);
  // The 3D game has its own import map. If an old cached site shell tries to
  // embed this loader, move to the dedicated page instead of misreporting a
  // missing Three.js module as a WebGL problem.
  if (location.pathname !== gamePage.pathname) {
    window.BENA_JOGO = { iniciar() { location.href = gamePage.href; return () => {}; } };
    return;
  }
  // A versioned module avoids mixing a cached app with its updated data-driven logic.
  const source = new URL('./app.mjs?v=puzzles-json-3', document.currentScript.src).href;
  window.BENA_JOGO = {
    iniciar(container, voltar) {
      let disposed = false, cleanup;
      if (location.protocol === 'file:') {
        container.innerHTML = '<div class="load-error"><h1>Abra a oficina pelo site local</h1><p>O mundo 3D precisa do servidor local ligado.</p><a href="http://localhost:8765/conteudo/3-serie/matematica/tabuada/003/index.html">Entrar na oficina</a></div>';
        return () => {};
      }
      import(source).then(module => { if (!disposed) cleanup = module.start(container, voltar); }).catch(error => {
        console.error(error);
        if (!disposed) {
          container.innerHTML = '<div class="load-error"><h1>A oficina não conseguiu abrir</h1><p>Este jogo precisa de WebGL 2. Tente abrir no Edge ou Chrome com aceleração gráfica ativada.</p><button type="button">Tentar novamente</button></div>';
          container.querySelector('button').onclick = () => location.reload();
        }
      });
      return () => { disposed = true; cleanup?.(); };
    }
  };
})();

