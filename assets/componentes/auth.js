// Firebase Auth + Firestore — Bena Studies
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, deleteDoc, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDB2a3ubAqWK_oaF4uDf1ZguoXYLJxzNwY",
  authDomain: "bena-studies.firebaseapp.com",
  projectId: "bena-studies",
  storageBucket: "bena-studies.firebasestorage.app",
  messagingSenderId: "732546877095",
  appId: "1:732546877095:web:97dbebe582855c840bbd82"
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

let isAuthInitialized = false;
const authReadyCallbacks = [];

// Interface global para outros modulos (ranking, jogos...)
window.BENA_AUTH = {
  currentUser: () => auth.currentUser,
  isLoggedIn: () => !!auth.currentUser,
  isAuthReady: () => isAuthInitialized,
  onAuthReady: (cb) => {
    if (isAuthInitialized) cb(auth.currentUser);
    else authReadyCallbacks.push(cb);
  },
  showLoginModal: (cb) => showLoginModal(cb),
  showSignupModal: (cb) => showSignupModal(cb),
  showLockedNoticeModal: (cb) => showLockedNoticeModal(cb),
  perfil: async () => {
    const user = auth.currentUser;
    if (!user) return null;
    const snap = await getDoc(doc(db, 'usuarios', user.uid));
    return snap.exists() ? snap.data() : null;
  },
  logout: () => signOut(auth),

  // Sincroniza o usuario com MySQL (chamado automaticamente apos login/nome/escola)
  sincronizarAluno: async (nome, escola, serie) => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/registro-aluno', {
        method:  'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          nome,
          escola: escola ?? null,
          serie: serie ?? window.BENA_CONFIG?.serieAtual ?? null
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error('[BENA_AUTH] sincronizarAluno erro:', res.status, data);
      } else {
        console.log('[BENA_AUTH] sincronizarAluno sucesso:', data);
      }
    } catch (e) {
      console.warn('[BENA_AUTH] sincronizarAluno falhou:', e.message);
    }
  },

  // Salva resultado de partida no MySQL (chamado pelo jogo ao terminar)
  salvarPartida: async (dados) => {
    const user = auth.currentUser;
    if (!user) return { ok: false, error: 'Nao autenticado' };
    try {
      const token = await user.getIdToken();
      const res   = await fetch('/api/salvar-partida', {
        method:  'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify(dados),
      });
      return res.json();
    } catch (e) {
      console.warn('[BENA_AUTH] salvarPartida falhou:', e.message);
      return { ok: false, error: e.message };
    }
  },

};

/* DOM */
const modal    = document.querySelector('#modal');
const content  = document.querySelector('#modal-content');
const loginBtn = document.querySelector('[data-login]');

/* Erros amigaveis */
function friendlyError(code) {
  const msgs = {
    'auth/invalid-email':          'E-mail invalido.',
    'auth/user-not-found':         'Usuario nao encontrado.',
    'auth/wrong-password':         'Senha incorreta.',
    'auth/invalid-credential':     'E-mail ou senha incorretos.',
    'auth/email-already-in-use':   'Este e-mail ja esta cadastrado.',
    'auth/weak-password':          'Senha fraca. Use ao menos 6 caracteres.',
    'auth/too-many-requests':      'Muitas tentativas. Tente mais tarde.',
    'auth/network-request-failed': 'Sem conexao. Verifique sua internet.',
  };
  return msgs[code] || 'Erro inesperado. Tente novamente.';
}

/* Firestore helpers */
async function nomeDisponivel(nome, uid) {
  const snap = await getDoc(doc(db, 'nomes', nome.toLowerCase()));
  if (!snap.exists()) return true;
  return snap.data().uid === uid;
}

async function salvarPerfil(uid, email, nome, escola) {
  await setDoc(doc(db, 'nomes', nome.toLowerCase()), { uid });
  await setDoc(doc(db, 'usuarios', uid), {
    nome,
    escola: escola || '',
    email,
    criadoEm: serverTimestamp()
  }, { merge: true });
}

async function atualizarPerfil(uid, nomeAntigo, nomeNovo, escolaNova) {
  if (nomeAntigo && nomeAntigo.toLowerCase() !== nomeNovo.toLowerCase()) {
    await deleteDoc(doc(db, 'nomes', nomeAntigo.toLowerCase()));
  }
  await setDoc(doc(db, 'nomes', nomeNovo.toLowerCase()), { uid });
  await setDoc(doc(db, 'usuarios', uid), {
    nome: nomeNovo,
    escola: escolaNova || ''
  }, { merge: true });
}

/* UI helpers */
function setError(id, msg) {
  const el = document.querySelector(`#${id}`);
  if (!el) return;
  el.textContent = msg;
  el.hidden = !msg;
}

function setLoading(btn, loading, label) {
  btn.disabled  = loading;
  btn.innerHTML = loading ? 'Aguarde\u2026' : label;
}

/* VIEW: Aviso de Livro Trancado (Acesso restrito) */
function showLockedNoticeModal(onSuccess) {
  content.innerHTML = `
    <div class="modal-symbol">🔒</div>
    <div class="eyebrow"><span></span>LIVRO DE DESCOBERTAS • ACESSO RESTRITO</div>
    <h2>Entre para abrir seu livro!</h2>
    <p>O Livro Mágico de Descobertas e os desafios de matemática são exclusivos para exploradores cadastrados. Faça login ou crie sua conta para começar a jogar.</p>
    <div style="display:flex; flex-direction:column; gap:12px; margin-top:24px;">
      <button class="primary" id="btn-notice-login" style="width:100%; justify-content:center;">Entrar na minha conta <span>→</span></button>
      <button class="topic" id="btn-notice-signup" style="width:100%; justify-content:center; text-align:center; margin-top:0;">Cadastrar nova conta <span>↗</span></button>
    </div>
  `;
  modal.showModal();
  document.querySelector('#btn-notice-login').onclick = () => showLoginModal(onSuccess);
  document.querySelector('#btn-notice-signup').onclick = () => showSignupModal(onSuccess);
}

/* VIEW: Login */
function showLoginModal(onSuccess) {
  content.innerHTML = `
    <div class="modal-symbol">\u263a</div>
    <div class="eyebrow"><span></span>ACESSE SUA CONTA</div>
    <h2>Que bom ter voc\u00ea aqui!</h2>
    <form id="auth-form" class="auth-form">
      <input type="email"    id="auth-email" placeholder="Seu e-mail" autocomplete="email"            required>
      <input type="password" id="auth-pass"  placeholder="Sua senha"  autocomplete="current-password" required>
      <p class="auth-error" id="auth-error" role="alert" hidden></p>
      <button type="submit" class="primary">Entrar <span>\u2192</span></button>
    </form>
    <p class="auth-toggle">Ainda n\u00e3o tem conta? <button class="auth-link" id="go-signup">Cadastrar \u2192</button></p>
  `;
  modal.showModal();
  document.querySelector('#go-signup').onclick = () => showSignupModal(onSuccess);

  document.querySelector('#auth-form').onsubmit = async (e) => {
    e.preventDefault();
    const email = document.querySelector('#auth-email').value;
    const pass  = document.querySelector('#auth-pass').value;
    const btn   = e.target.querySelector('[type="submit"]');
    setLoading(btn, true, 'Entrar <span>\u2192</span>');
    setError('auth-error', '');
    try {
      const cred = await signInWithEmailAndPassword(auth, email, pass);
      const snap = await getDoc(doc(db, 'usuarios', cred.user.uid));
      const perfil = snap.exists() ? snap.data() : null;
      if (perfil && perfil.nome && perfil.escola) {
        window.BENA_AUTH.sincronizarAluno(perfil.nome, perfil.escola); // sync com MySQL (non-blocking)
        modal.close();
        if (typeof onSuccess === 'function') onSuccess();
      } else {
        showPerfilModal(cred.user, perfil, onSuccess);
      }
    } catch (err) {
      setError('auth-error', friendlyError(err.code));
      setLoading(btn, false, 'Entrar <span>\u2192</span>');
    }
  };
}

/* VIEW: Signup */
function showSignupModal(onSuccess) {
  content.innerHTML = `
    <div class="modal-symbol">\u263a</div>
    <div class="eyebrow"><span></span>CRIE SUA CONTA</div>
    <h2>Vamos come\u00e7ar!</h2>
    <form id="auth-form" class="auth-form">
      <input type="email"    id="auth-email"  placeholder="Seu e-mail"          autocomplete="email"        required>
      <input type="password" id="auth-pass"   placeholder="Senha (m\u00edn. 6 car.)" autocomplete="new-password" required minlength="6">
      <input type="password" id="auth-pass2"  placeholder="Confirmar senha"     autocomplete="new-password" required minlength="6">
      <p class="auth-error" id="auth-error" role="alert" hidden></p>
      <button type="submit" class="primary">Cadastrar <span>\u2192</span></button>
    </form>
    <p class="auth-toggle">J\u00e1 tem conta? <button class="auth-link" id="go-login">Entrar \u2192</button></p>
  `;
  modal.showModal();
  document.querySelector('#go-login').onclick = () => showLoginModal(onSuccess);

  document.querySelector('#auth-form').onsubmit = async (e) => {
    e.preventDefault();
    const email = document.querySelector('#auth-email').value;
    const pass  = document.querySelector('#auth-pass').value;
    const pass2 = document.querySelector('#auth-pass2').value;
    const btn   = e.target.querySelector('[type="submit"]');
    if (pass !== pass2) { setError('auth-error', 'As senhas n\u00e3o coincidem.'); return; }
    setLoading(btn, true, 'Cadastrar <span>\u2192</span>');
    setError('auth-error', '');
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      showPerfilModal(cred.user, null, onSuccess);
    } catch (err) {
      setError('auth-error', friendlyError(err.code));
      setLoading(btn, false, 'Cadastrar <span>\u2192</span>');
    }
  };
}

/* VIEW: Escolher nome e escola (primeira vez ou perfil incompleto) */
function showPerfilModal(user, perfilExistente, onSuccess) {
  if (!modal || !content) return;
  const nomePadrao   = perfilExistente?.nome || '';
  const escolaPadrao = perfilExistente?.escola || '';
  content.innerHTML = `
    <div class="modal-symbol">\u270f\ufe0f</div>
    <div class="eyebrow"><span></span>COMPLETE SEU PERFIL</div>
    <h2>Quase l\u00e1!</h2>
    <p>Escolha um nome \u00fanico para o ranking e conte para n\u00f3s o nome da sua escola.</p>
    <form id="perfil-form" class="auth-form">
      <input type="text" id="auth-nome" placeholder="Seu nome \u00fanico" autocomplete="off"
             value="${nomePadrao}" required minlength="2" maxlength="30">
      <input type="text" id="auth-escola" placeholder="Nome da sua escola" autocomplete="off"
             value="${escolaPadrao}" required minlength="2" maxlength="80">
      <p class="auth-error" id="perfil-error" role="alert" hidden></p>
      <button type="submit" class="primary">Salvar e entrar <span>\u2192</span></button>
    </form>
  `;
  if (!modal.open) {
    try { modal.showModal(); } catch (e) { console.warn('[BENA_AUTH] Erro ao abrir modal:', e); }
  }
  const inputFoco = nomePadrao ? document.querySelector('#auth-escola') : document.querySelector('#auth-nome');
  inputFoco?.focus();

  document.querySelector('#perfil-form').onsubmit = async (e) => {
    e.preventDefault();
    const nome   = document.querySelector('#auth-nome').value.trim();
    const escola = document.querySelector('#auth-escola').value.trim();
    const btn    = e.target.querySelector('[type="submit"]');
    if (nome.length < 2) { setError('perfil-error', 'Nome muito curto. Use pelo menos 2 caracteres.'); return; }
    if (escola.length < 2) { setError('perfil-error', 'Informe o nome da sua escola.'); return; }
    setLoading(btn, true, 'Salvar e entrar <span>\u2192</span>');
    setError('perfil-error', '');
    try {
      const disponivel = await nomeDisponivel(nome, user.uid);
      if (!disponivel) {
        setError('perfil-error', 'Este nome j\u00e1 est\u00e1 em uso. Escolha outro.');
        setLoading(btn, false, 'Salvar e entrar <span>\u2192</span>');
        return;
      }
      await salvarPerfil(user.uid, user.email, nome, escola);
      window.BENA_AUTH.sincronizarAluno(nome, escola); // sync com MySQL (non-blocking)
      updateLoginBtn(user, nome);
      modal.close();
      if (typeof onSuccess === 'function') onSuccess();
    } catch (err) {
      console.error(err);
      setError('perfil-error', 'Erro ao salvar. Tente novamente.');
      setLoading(btn, false, 'Salvar e entrar <span>\u2192</span>');
    }
  };
}

/* VIEW: Minha Conta */
function showContaModal(user, perfil) {
  const nome   = perfil?.nome || user.email.split('@')[0];
  const escola = perfil?.escola || 'Escola n\u00e3o informada';
  content.innerHTML = `
    <div class="modal-symbol">\u263a</div>
    <div class="eyebrow"><span></span>MINHA CONTA</div>
    <h2>${nome}</h2>
    <p class="auth-email-label">${user.email}</p>
    <p class="auth-escola-badge">\ud83c\udfeb ${escola}</p>
    <div id="conta-body">
      <button class="topic" id="btn-editar-perfil">\u270f\ufe0f Editar perfil <span>\u2192</span></button>
      <button class="topic auth-sair" id="btn-sair">Sair <span>\u2192</span></button>
    </div>
  `;
  modal.showModal();
  document.querySelector('#btn-editar-perfil').onclick = () => showEditarPerfilModal(user, perfil);
  document.querySelector('#btn-sair').onclick = async () => { await signOut(auth); modal.close(); };
}

/* VIEW: Editar perfil */
function showEditarPerfilModal(user, perfil) {
  const nomeAtual   = perfil?.nome || '';
  const escolaAtual = perfil?.escola || '';
  document.querySelector('#conta-body').innerHTML = `
    <form id="editar-perfil-form" class="auth-form">
      <div class="auth-field-row">
        <label class="auth-field-label" for="novo-nome">Nome</label>
        <input type="text" id="novo-nome" value="${nomeAtual}" placeholder="Seu nome \u00fanico" autocomplete="off"
               required minlength="2" maxlength="30">
      </div>
      <div class="auth-field-row">
        <label class="auth-field-label" for="nova-escola">Escola</label>
        <input type="text" id="nova-escola" value="${escolaAtual}" placeholder="Nome da sua escola" autocomplete="off"
               required minlength="2" maxlength="80">
      </div>
      <p class="auth-error" id="perfil-edit-error" role="alert" hidden></p>
      <button type="submit" class="primary">Salvar altera\u00e7\u00f5es <span>\u2192</span></button>
    </form>
    <button class="topic" id="btn-cancelar-perfil" style="margin-top:8px">\u2190 Voltar</button>
  `;
  document.querySelector('#btn-cancelar-perfil').onclick = () => showContaModal(user, perfil);

  document.querySelector('#editar-perfil-form').onsubmit = async (e) => {
    e.preventDefault();
    const novoNome   = document.querySelector('#novo-nome').value.trim();
    const novaEscola = document.querySelector('#nova-escola').value.trim();
    const btn        = e.target.querySelector('[type="submit"]');
    if (novoNome.length < 2) { setError('perfil-edit-error', 'Nome muito curto. Use pelo menos 2 caracteres.'); return; }
    if (novaEscola.length < 2) { setError('perfil-edit-error', 'Informe o nome da sua escola.'); return; }
    if (novoNome === nomeAtual && novaEscola === escolaAtual) { modal.close(); return; }
    setLoading(btn, true, 'Salvar altera\u00e7\u00f5es <span>\u2192</span>');
    setError('perfil-edit-error', '');
    try {
      if (novoNome.toLowerCase() !== nomeAtual.toLowerCase()) {
        const disponivel = await nomeDisponivel(novoNome, user.uid);
        if (!disponivel) {
          setError('perfil-edit-error', 'Este nome j\u00e1 est\u00e1 em uso. Escolha outro.');
          setLoading(btn, false, 'Salvar altera\u00e7\u00f5es <span>\u2192</span>');
          return;
        }
      }
      await atualizarPerfil(user.uid, nomeAtual, novoNome, novaEscola);
      window.BENA_AUTH.sincronizarAluno(novoNome, novaEscola); // sync com MySQL (non-blocking)
      updateLoginBtn(user, novoNome);
      modal.close();
    } catch (err) {
      console.error(err);
      setError('perfil-edit-error', 'Erro ao salvar. Tente novamente.');
      setLoading(btn, false, 'Salvar altera\u00e7\u00f5es <span>\u2192</span>');
    }
  };
}

/* Header button */
function updateLoginBtn(user, nomeOverride) {
  if (!loginBtn) return;
  if (user) {
    const nome         = nomeOverride || user.email.split('@')[0];
    loginBtn.innerHTML = `${nome} <span>\u2197</span>`;
    loginBtn.onclick   = async () => {
      const snap   = await getDoc(doc(db, 'usuarios', user.uid));
      const perfil = snap.exists() ? snap.data() : null;
      showContaModal(user, perfil);
    };
  } else {
    loginBtn.innerHTML = 'Entrar <span>\u2197</span>';
    loginBtn.onclick   = showLoginModal;
  }
}

/* Auth state listener */
if (loginBtn) {
  loginBtn.onclick = showLoginModal;
}

onAuthStateChanged(auth, async (user) => {
  isAuthInitialized = true;
  while (authReadyCallbacks.length) {
    const cb = authReadyCallbacks.shift();
    try { cb(user); } catch (e) { console.error(e); }
  }
  if (user) {
    const snap = await getDoc(doc(db, 'usuarios', user.uid));
    const perfil = snap.exists() ? snap.data() : null;
    const nome   = perfil?.nome || null;
    const escola = perfil?.escola || null;
    console.log('[BENA_AUTH] Usuario logado:', { email: user.email, nome, escola });
    updateLoginBtn(user, nome);
    if (nome && escola) {
      window.BENA_AUTH.sincronizarAluno(nome, escola);
    } else if (modal) {
      console.log('[BENA_AUTH] Perfil incompleto (falta escola ou nome), solicitando preenchimento...');
      showPerfilModal(user, perfil);
    }
  } else {
    console.log('[BENA_AUTH] Nenhum usuario logado');
    updateLoginBtn(null, null);
  }
});
