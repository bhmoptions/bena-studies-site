// Firebase Auth — Bena Studies
// O firebaseConfig do SDK web e publico por design; seguranca e gerida pelas Firebase Security Rules.
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

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

// Expoe interface global para outros modulos (ranking, jogos, etc.)
window.BENA_AUTH = {
  currentUser: () => auth.currentUser,
  logout:      ()  => signOut(auth),
};

/* elementos do DOM */
const modal    = document.querySelector('#modal');
const content  = document.querySelector('#modal-content');
const loginBtn = document.querySelector('[data-login]');

/* Mensagens de erro amigaveis */
function friendlyError(code) {
  const msgs = {
    'auth/invalid-email':          'E-mail invalido.',
    'auth/user-not-found':         'Usuario nao encontrado.',
    'auth/wrong-password':         'Senha incorreta.',
    'auth/invalid-credential':     'E-mail ou senha incorretos.',
    'auth/too-many-requests':      'Muitas tentativas. Tente mais tarde.',
    'auth/network-request-failed': 'Sem conexao. Verifique sua internet.',
  };
  return msgs[code] || 'Erro ao entrar. Tente novamente.';
}

/* Modal de login */
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
  `;
  modal.showModal();

  document.querySelector('#auth-form').onsubmit = async (e) => {
    e.preventDefault();
    const email   = document.querySelector('#auth-email').value;
    const pass    = document.querySelector('#auth-pass').value;
    const errorEl = document.querySelector('#auth-error');
    const btn     = e.target.querySelector('[type="submit"]');

    btn.disabled     = true;
    btn.textContent  = 'Entrando\u2026';
    errorEl.hidden   = true;

    try {
      await signInWithEmailAndPassword(auth, email, pass);
      modal.close();
    } catch (err) {
      errorEl.textContent = friendlyError(err.code);
      errorEl.hidden      = false;
      btn.disabled        = false;
      btn.innerHTML       = 'Entrar <span>\u2192</span>';
    }
  };
}

/* Modal do usuario logado */
function showUserModal(user) {
  const name = user.displayName || user.email.split('@')[0];
  content.innerHTML = `
    <div class="modal-symbol">\u263a</div>
    <div class="eyebrow"><span></span>SUA CONTA</div>
    <h2>Ol\u00e1, ${name}!</h2>
    <p>${user.email}</p>
    <button class="primary" id="auth-logout">Sair <span>\u2192</span></button>
  `;
  modal.showModal();

  document.querySelector('#auth-logout').onclick = async () => {
    await signOut(auth);
    modal.close();
  };
}

/* Atualiza o botao do header conforme o estado de auth */
function updateLoginBtn(user) {
  if (!loginBtn) return;
  if (user) {
    const name         = user.displayName || user.email.split('@')[0];
    loginBtn.innerHTML = `${name} <span>\u2197</span>`;
    loginBtn.onclick   = () => showUserModal(user);
  } else {
    loginBtn.innerHTML = 'Entrar <span>\u2197</span>';
    loginBtn.onclick   = showLoginModal;
  }
}

// Define comportamento inicial (antes da resolucao do estado de auth)
loginBtn.onclick = showLoginModal;

// Reage a mudancas de estado (login / logout)
onAuthStateChanged(auth, updateLoginBtn);
