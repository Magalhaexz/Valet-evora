window.App = window.App || {};

(function () {
  // Evita inicializar duas vezes (muito comum causar toast indevido)
  if (App._authBootstrapped) return;
  App._authBootstrapped = true;

  function $(id) {
    return document.getElementById(id);
  }

  function firstId(ids) {
    for (var i = 0; i < ids.length; i++) {
      var el = $(ids[i]);
      if (el) return el;
    }
    return null;
  }

  // Fallbacks (caso algum arquivo não tenha definido)
  App.ensureSupabaseReady = App.ensureSupabaseReady || function () {
    return !!App.db;
  };

  App.showToast = App.showToast || function (msg) {
    console.log('[toast]', msg);
  };

  App._setButtonLoading = App._setButtonLoading || function (btn, isLoading, loadingText) {
    if (!btn) return;
    loadingText = loadingText || 'Aguarde…';
    if (isLoading) {
      btn.disabled = true;
      btn.dataset.originalText = btn.textContent;
      btn.textContent = loadingText;
    } else {
      btn.disabled = false;
      btn.textContent = btn.dataset.originalText || btn.textContent;
      delete btn.dataset.originalText;
    }
  };

  // Mostra/oculta telas (fallback)
  App._uiShowAuthed = App._uiShowAuthed || function (session) {
    var authScreen = firstId(['authScreen', 'auth', 'loginScreen']);
    var appShell = firstId(['app', 'appShell', 'mainApp']);

    if (authScreen) authScreen.classList.add('hidden');
    if (appShell) appShell.classList.remove('hidden');

    var badge = $('currentUserEmail');
    if (badge) {
      badge.textContent = (session && session.user && session.user.email) ? session.user.email : '';
      badge.classList.remove('hidden');
    }
  };

  App._uiShowUnAuthed = App._uiShowUnAuthed || function () {
    var authScreen = firstId(['authScreen', 'auth', 'loginScreen']);
    var appShell = firstId(['app', 'appShell', 'mainApp']);

    if (appShell) appShell.classList.add('hidden');
    if (authScreen) authScreen.classList.remove('hidden');

    var badge = $('currentUserEmail');
    if (badge) {
      badge.textContent = '';
      badge.classList.add('hidden');
    }
  };

  // Se já existir no seu projeto, ele usa. Senão, aplica UI por aqui.
  App.applySession = App.applySession || function (session) {
    App.state = App.state || {};
    App.state.session = session;
    App._uiShowAuthed(session);

    // Se existir renderAll, chama (não quebra se não existir)
    if (typeof App.renderAll === 'function') {
      App.renderAll();
    }
  };

  App.clearSession = App.clearSession || function () {
    App.state = App.state || {};
    App.state.session = null;
    App._uiShowUnAuthed();
  };

  // ------------------------------------------------------------------
  // Login por URL (apenas se NÃO houver sessão)
  // ------------------------------------------------------------------
  async function tryAutoLoginFromQueryIfNoSession() {
    var params = new URLSearchParams(window.location.search);
    var email = params.get('email');
    var password = params.get('password');

    // Se não tem params, não faz nada (evita toast “fantasma”)
    if (!email || !password) return;

    // Só tenta se realmente não houver sessão
    var sess = await getCurrentSession();
    if (sess) {
      // Limpa URL por segurança (não manter senha no link)
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    var res = await App.db.auth.signInWithPassword({ email: email, password: password });

    if (res.error || !res.data || !res.data.session) {
      App.showToast('Não foi possível entrar agora. Tente novamente.', 'error');
      return;
    }

    App.applySession(res.data.session);

    // Limpa URL (recomendado)
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  // ------------------------------------------------------------------
  // Sessão atual
  // ------------------------------------------------------------------
  async function getCurrentSession() {
    if (!App.ensureSupabaseReady()) return null;

    var r = await App.db.auth.getSession();
    var session = r && r.data ? r.data.session : null;
    return session || null;
  }

  // ------------------------------------------------------------------
  // Bind do formulário de login
  // ------------------------------------------------------------------
  function bindLoginForm() {
    var form =
      firstId(['authForm', 'loginForm']) ||
      document.querySelector('form[data-auth="login"]') ||
      document.querySelector('.auth-form');

    var inputEmail =
      firstId(['loginEmail', 'email', 'authEmail']) ||
      document.querySelector('input[type="email"]');

    var inputPass =
      firstId(['loginPassword', 'password', 'authPassword']) ||
      document.querySelector('input[type="password"]');

    var btnLogin =
      firstId(['btnLogin', 'btnEntrar']) ||
      (form ? form.querySelector('button[type="submit"]') : null);

    if (!form) return;

    form.addEventListener('submit', async function (e) {
      e.preventDefault();

      if (!App.ensureSupabaseReady()) {
        App.showToast('Supabase não inicializado (config.js).', 'error');
        return;
      }

      var email = inputEmail ? String(inputEmail.value || '').trim() : '';
      var password = inputPass ? String(inputPass.value || '') : '';

      if (!email || !password) {
        App.showToast('Informe e-mail e senha.', 'warning');
        return;
      }

      App._setButtonLoading(btnLogin, true, 'Entrando…');

      try {
        var res = await App.db.auth.signInWithPassword({ email: email, password: password });

        if (res.error || !res.data || !res.data.session) {
          App.showToast('Não foi possível entrar agora. Tente novamente.', 'error');
          App._setButtonLoading(btnLogin, false);
          return;
        }

        App.applySession(res.data.session);
        App._setButtonLoading(btnLogin, false);
      } catch (err) {
        App.showToast('Erro inesperado ao entrar.', 'error');
        App._setButtonLoading(btnLogin, false);
      }
    });
  }

  // ------------------------------------------------------------------
  // Bind do logout
  // ------------------------------------------------------------------
  function bindLogout() {
    var btnLogout = firstId(['btnLogout', 'btnSair', 'logoutBtn']);
    if (!btnLogout) return;

    btnLogout.addEventListener('click', async function () {
      if (!App.ensureSupabaseReady()) return;

      App._setButtonLoading(btnLogout, true, 'Saindo…');

      try {
        await App.db.auth.signOut();
      } catch (e) {
        // mesmo se falhar, limpa UI local
      }

      App.clearSession();
      App._setButtonLoading(btnLogout, false);
    });
  }

  // ------------------------------------------------------------------
  // Bootstrap principal
  // ------------------------------------------------------------------
  App.initAuth = async function () {
    if (!App.ensureSupabaseReady()) return;

    // 1) Sessão atual primeiro (isso evita “login duplo”)
    var session = await getCurrentSession();
    if (session) {
      App.applySession(session);
    } else {
      App.clearSession();
    }

    // 2) Bind UI
    bindLoginForm();
    bindLogout();

    // 3) Auto-login por querystring (somente se não tiver sessão)
    await tryAutoLoginFromQueryIfNoSession();

    // 4) Listener (mantém UI sincronizada sem toasts desnecessários)
    if (!App._authListenerBound) {
      App._authListenerBound = true;

      App.db.auth.onAuthStateChange(function (event, session2) {
        if (event === 'SIGNED_IN' && session2) App.applySession(session2);
        if (event === 'SIGNED_OUT') App.clearSession();
      });
    }
  };
})();