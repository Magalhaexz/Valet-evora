// ============================================================
// auth.js — Autenticação via Supabase
// ============================================================

window.App = window.App || {};

// ------------------------------------------------------------
// Bootstrap: verifica sessão ativa ao carregar o app
// ------------------------------------------------------------
App.bootstrapAuth = async function () {
  if (!App.ensureSupabaseReady(false)) {
    App.state.currentUser = null;
    App.showAuth();
    App.updateCurrentUserBadge('');
    return;
  }

  try {
    const { data, error } = await App.db.auth.getSession();

    if (error) {
      console.error('[Auth] Erro ao obter sessão:', error);
      App.showToast('Erro ao iniciar autenticação.', 'error');
      App.showAuth();
      return;
    }

    await App.applySession(data?.session ?? null);

    // Listener reativo para mudanças de sessão (login, logout, expiração)
    App.db.auth.onAuthStateChange(async (_event, session) => {
      await App.applySession(session);
    });

  } catch (err) {
    console.error('[Auth] Erro inesperado no bootstrapAuth:', err);
    App.showToast('Falha ao iniciar autenticação.', 'error');
    App.showAuth();
  }
};

// ------------------------------------------------------------
// Aplica ou limpa sessão — usado pelo bootstrap e pelo listener
// ------------------------------------------------------------
App.applySession = async function (session) {
  const user = session?.user ?? null;
  App.state.currentUser = user;

  if (user) {
    App.showApp();
    App.updateCurrentUserBadge(user.email || 'Usuário');

    const loaded = await App.loadAllData(false);

    if (!loaded) {
      console.warn('[Auth] Sessão ativa, mas os dados não puderam ser carregados.');
      App.showToast('Dados não carregados. Tente recarregar a página.', 'warning');
    }

    App.renderAll();
    App.startAutoRefresh();

  } else {
    App.stopAutoRefresh();
    App.clearState();
    App.renderAll();
    App.updateCurrentUserBadge('');
    App.showAuth();
  }
};

// ------------------------------------------------------------
// Login com e-mail e senha
// ------------------------------------------------------------
App.handleLogin = async function (event) {
  event.preventDefault();

  if (!App.ensureSupabaseReady()) return;

  const email    = App.dom.loginEmail?.value.trim() ?? '';
  const password = App.dom.loginPassword?.value ?? '';

  if (!email || !password) {
    App.showToast('Preencha e-mail e senha.', 'warning');
    return;
  }

  // Feedback visual no botão durante o request
  const submitBtn = App.dom.loginForm?.querySelector('button[type="submit"]');
  App._setLoginLoading(submitBtn, true);

  try {
    const { data, error } = await App.db.auth.signInWithPassword({ email, password });

    if (error) {
      console.error('[Auth] Erro no login:', error);
      const msg = App._translateAuthError(error.message);
      App.showToast(msg, 'error');
      return;
    }

    App.dom.loginForm?.reset();

    if (data?.session) {
      await App.applySession(data.session);
    } else {
      App.showToast('Login realizado, mas a sessão não foi retornada.', 'warning');
    }

  } catch (err) {
    console.error('[Auth] Erro inesperado no login:', err);
    App.showToast('Não foi possível entrar agora. Tente novamente.', 'error');
  } finally {
    App._setLoginLoading(submitBtn, false);
  }
};

// ------------------------------------------------------------
// Logout
// ------------------------------------------------------------
App.handleLogout = async function () {
  if (!App.ensureSupabaseReady()) return;

  try {
    const { error } = await App.db.auth.signOut();

    if (error) {
      console.error('[Auth] Erro ao sair:', error);
      App.showToast('Erro ao sair da conta.', 'error');
      return;
    }

    App.showToast('Você saiu da conta.', 'success');
    await App.applySession(null);

  } catch (err) {
    console.error('[Auth] Erro inesperado no logout:', err);
    App.showToast('Não foi possível sair agora.', 'error');
  }
};

// ------------------------------------------------------------
// Helpers internos
// ------------------------------------------------------------

/**
 * Ativa/desativa o estado de loading no botão de submit do login.
 */
App._setLoginLoading = function (btn, isLoading) {
  if (!btn) return;
  btn.disabled = isLoading;
  btn.textContent = isLoading ? 'Entrando…' : 'Entrar';
};

/**
 * Traduz mensagens de erro do Supabase para português.
 */
App._translateAuthError = function (message = '') {
  const map = {
    'Invalid login credentials':        'E-mail ou senha incorretos.',
    'Email not confirmed':              'Confirme seu e-mail antes de entrar.',
    'Too many requests':                'Muitas tentativas. Aguarde alguns minutos.',
    'User not found':                   'Usuário não encontrado.',
    'Password should be at least 6 characters': 'A senha deve ter ao menos 6 caracteres.',
  };

  for (const [key, translation] of Object.entries(map)) {
    if (message.includes(key)) return translation;
  }

  return message || 'Erro de autenticação.';
};