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

// Interface global para outros modulos (ranking, jogos...)
window.BENA_AUTH = {
  currentUser: () => auth.currentUser,
  perfil: async () => {
    const user = auth.currentUser;
    if (!user) return null;
    const snap = await getDoc(doc(db, 'usuarios', user.uid));
    return snap.exists() ? snap.data() : null;
  },
  logout: () => signOut(auth),

  // Sincroniza o usuario com MySQL (chamado automaticamente apos login/nome)
  sincronizarAluno: async (nome, serie) => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/registro-aluno', {
        method:  'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ nome, serie: serie ?? window.BENA_CONFIG?.serieAtual ?? null }),
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

async function salvarPerfil(uid, email, nome) {
  await setDoc(doc(db, 'nomes', nome.toLowerCase()), { uid });
  await setDoc(doc(db, 'usuarios', uid), { nome, email, criadoEm: serverTimestamp() });
}

async function atualizarNome(uid, nomeAntigo, nomeNovo) {
  if (nomeAntigo && nomeAntigo.toLowerCase() !== nomeNovo.toLowerCase()) {
    await deleteDoc(doc(db, 'nomes', nomeAntigo.toLowerCase()));
  }
  await setDoc(doc(db, 'nomes', nomeNovo.toLowerCase()), { uid });
  await setDoc(doc(db, 'usuarios', uid), { nome: nomeNovo }, { merge: true });
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

/* VIEW: Login */
function showLoginModal() {
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
  document.querySelector('#go-signup').onclick = showSignupModal;

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
      if (snap.exists()) {
        window.BENA_AUTH.sincronizarAluno(snap.data().nome); // sync com MySQL (non-blocking)
        modal.close();
      } else {
        showNomeModal(cred.user);
      }
    } catch (err) {
      setError('auth-error', friendlyError(err.code));
      setLoading(btn, false, 'Entrar <span>\u2192</span>');
    }
  };
}

/* VIEW: Signup */
function showSignupModal() {
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
  document.querySelector('#go-login').onclick = showLoginModal;

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
      showNomeModal(cred.user);
    } catch (err) {
      setError('auth-error', friendlyError(err.code));
      setLoading(btn, false, 'Cadastrar <span>\u2192</span>');
    }
  };
}

/* VIEW: Escolher nome (primeira vez) */
function showNomeModal(user) {
  content.innerHTML = `
    <div class="modal-symbol">\u270f\ufe0f</div>
    <div class="eyebrow"><span></span>QUASE L\u00c1!</div>
    <h2>Como voc\u00ea quer ser chamado?</h2>
    <p>Escolha um nome \u00fanico que aparecer\u00e1 no ranking e nos jogos.</p>
    <form id="nome-form" class="auth-form">
      <input type="text" id="auth-nome" placeholder="Seu nome" autocomplete="off"
             required minlength="2" maxlength="30">
      <p class="auth-error" id="nome-error" role="alert" hidden></p>
      <button type="submit" class="primary">Salvar e entrar <span>\u2192</span></button>
    </form>
  `;
  modal.showModal();
  document.querySelector('#auth-nome').focus();

  document.querySelector('#nome-form').onsubmit = async (e) => {
    e.preventDefault();
    const nome = document.querySelector('#auth-nome').value.trim();
    const btn  = e.target.querySelector('[type="submit"]');
    if (nome.length < 2) { setError('nome-error', 'Nome muito curto. Use pelo menos 2 caracteres.'); return; }
    setLoading(btn, true, 'Salvar e entrar <span>\u2192</span>');
    setError('nome-error', '');
    try {
      const disponivel = await nomeDisponivel(nome, user.uid);
      if (!disponivel) {
        setError('nome-error', 'Este nome j\u00e1 est\u00e1 em uso. Escolha outro.');
        setLoading(btn, false, 'Salvar e entrar <span>\u2192</span>');
        return;
      }
      await salvarPerfil(user.uid, user.email, nome);
      window.BENA_AUTH.sincronizarAluno(nome); // sync com MySQL (non-blocking)
      updateLoginBtn(user, nome);
      modal.close();
    } catch (err) {
      console.error(err);
      setError('nome-error', 'Erro ao salvar. Tente novamente.');
      setLoading(btn, false, 'Salvar e entrar <span>\u2192</span>');
    }
  };
}

/* VIEW: Minha Conta */
function showContaModal(user, perfil) {
  const nome = perfil?.nome || user.email.split('@')[0];
  content.innerHTML = `
    <div class="modal-symbol">\u263a</div>
    <div class="eyebrow"><span></span>MINHA CONTA</div>
    <h2>${nome}</h2>
    <p class="auth-email-label">${user.email}</p>
    <div id="conta-body">
      <button class="topic" id="btn-editar-nome">\u270f\ufe0f Editar nome <span>\u2192</span></button>
      <button class="topic auth-sair" id="btn-sair">Sair <span>\u2192</span></button>
    </div>
  `;
  modal.showModal();
  document.querySelector('#btn-editar-nome').onclick = () => showEditarNomeModal(user, perfil);
  document.querySelector('#btn-sair').onclick = async () => { await signOut(auth); modal.close(); };
}

/* VIEW: Editar nome */
function showEditarNomeModal(user, perfil) {
  const nomeAtual = perfil?.nome || '';
  document.querySelector('#conta-body').innerHTML = `
    <form id="editar-nome-form" class="auth-form">
      <input type="text" id="novo-nome" value="${nomeAtual}" placeholder="Novo nome" autocomplete="off"
             required minlength="2" maxlength="30">
      <p class="auth-error" id="nome-edit-error" role="alert" hidden></p>
      <button type="submit" class="primary">Salvar nome <span>\u2192</span></button>
    </form>
    <button class="topic" id="btn-cancelar-nome" style="margin-top:8px">\u2190 Voltar</button>
  `;
  document.querySelector('#btn-cancelar-nome').onclick = () => showContaModal(user, perfil);

  document.querySelector('#editar-nome-form').onsubmit = async (e) => {
    e.preventDefault();
    const novoNome = document.querySelector('#novo-nome').value.trim();
    const btn      = e.target.querySelector('[type="submit"]');
    if (novoNome === nomeAtual) { modal.close(); return; }
    setLoading(btn, true, 'Salvar nome <span>\u2192</span>');
    setError('nome-edit-error', '');
    try {
      const disponivel = await nomeDisponivel(novoNome, user.uid);
      if (!disponivel) {
        setError('nome-edit-error', 'Este nome j\u00e1 est\u00e1 em uso. Escolha outro.');
        setLoading(btn, false, 'Salvar nome <span>\u2192</span>');
        return;
      }
      await atualizarNome(user.uid, nomeAtual, novoNome);
      window.BENA_AUTH.sincronizarAluno(novoNome); // sync com MySQL (non-blocking)
      updateLoginBtn(user, novoNome);
      modal.close();
    } catch (err) {
      console.error(err);
      setError('nome-edit-error', 'Erro ao salvar. Tente novamente.');
      setLoading(btn, false, 'Salvar nome <span>\u2192</span>');
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
loginBtn.onclick = showLoginModal;

onAuthStateChanged(auth, async (user) => {
  if (user) {
    const snap = await getDoc(doc(db, 'usuarios', user.uid));
    const nome = snap.exists() ? snap.data().nome : null;
    updateLoginBtn(user, nome);
    if (nome) {
      window.BENA_AUTH.sincronizarAluno(nome);
    }
  } else {
    updateLoginBtn(null, null);
  }
});
