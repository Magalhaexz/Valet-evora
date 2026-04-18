window.App = window.App || {};

(function () {
  async function getCurrentSession() {
    if (!App.ensureSupabaseReady(false)) return null;

    try {
      var response = await App.db.auth.getSession();
      return response && response.data ? response.data.session || null : null;
    } catch (err) {
      console.error('[Auth] Erro ao obter sessão atual:', err);
      return null;
    }
  }

  function updateBadges(session) {
    var email = session && session.user && session.user.email ? session.user.email : '';

    if (typeof App.updateCurrentUserBadge === 'function') {
      App.updateCurrentUserBadge(email);
    } else {
      var badge = document.getElementById('currentUserEmail');
      if (badge) {
        badge.textContent = email;
        badge.classList.toggle('hidden', !email);
      }
    }

    var sidebarBadge = document.getElementById('currentUserEmailSidebar');
    if (sidebarBadge) {
      sidebarBadge.textContent = email;
      sidebarBadge.classList.toggle('hidden', !email);
    }
  }

  App.applySession = async function (session) {
    App.state = App.state || {};
    App.state.session = session || null;
    App.state.currentUser = session && session.user ? session.user : null;

    if (typeof App.showApp === 'function') {
      App.showApp();
    } else {
      document.getElementById('authScreen')?.classList.add('hidden');
      document.getElementById('appShell')?.classList.remove('hidden');
    }

    updateBadges(session);

    var loaded = await App.loadAllData(false);
    if (loaded && typeof App.renderAll === 'function') {
      App.renderAll();
    }

    if (typeof App.startAutoRefresh === 'function') {
      App.startAutoRefresh();
    }
  };

  App.clearSession = function () {
    App.state = App.state || {};
    App.state.session = null;
    App.state.currentUser = null;

    if (typeof App.stopAutoRefresh === 'function') {
      App.stopAutoRefresh();
    }

    if (typeof App.clearState === 'function') {
      App.clearState();
    }

    if (typeof App.showAuth === 'function') {
      App.showAuth();
    } else {
      document.getElementById('appShell')?.classList.add('hidden');
      document.getElementById('authScreen')?.classList.remove('hidden');
    }

    updateBadges(null);

    if (typeof App.renderAll === 'function') {
      App.renderAll();
    }
  };

  App.handleLogin = async function (event) {
    event?.preventDefault?.();

    if (!App.ensureSupabaseReady()) return;

    var email = String(App.dom?.loginEmail?.value || '').trim();
    var password = String(App.dom?.loginPassword?.value || '');
    var btnLogin = App.dom?.loginForm?.querySelector('button[type="submit"]');

    if (!email || !password) {
      App.showToast('Informe e-mail e senha.', 'warning');
      return;
    }

    App._setButtonLoading(btnLogin, true, 'Entrando…');

    try {
      var result = await App.db.auth.signInWithPassword({ email: email, password: password });

      if (result.error || !result.data || !result.data.session) {
        throw new Error(result.error?.message || 'Não foi possível entrar agora.');
      }

      await App.applySession(result.data.session);
      App.showToast('Login realizado com sucesso.', 'success');
    } catch (err) {
      console.error('[Auth] Erro ao fazer login:', err);
      App.showToast(err.message || 'Erro inesperado ao entrar.', 'error');
    } finally {
      App._setButtonLoading(btnLogin, false, 'Entrar');
    }
  };

  App.handleLogout = async function () {
    if (!App.ensureSupabaseReady(false)) {
      App.clearSession();
      return;
    }

    var btnLogout = App.dom?.btnLogout;
    App._setButtonLoading(btnLogout, true, 'Saindo…');

    try {
      var result = await App.db.auth.signOut();
      if (result && result.error) {
        throw new Error(result.error.message);
      }
    } catch (err) {
      console.error('[Auth] Erro ao sair:', err);
    } finally {
      App.clearSession();
      App._setButtonLoading(btnLogout, false, 'Sair');
    }
  };

  App.initAuth = async function () {
    if (!App.ensureSupabaseReady(false)) {
      App.clearSession();
      return null;
    }

    var session = await getCurrentSession();

    if (session) {
      await App.applySession(session);
    } else {
      App.clearSession();
    }

    if (!App._authListenerBound) {
      App._authListenerBound = true;

      App.db.auth.onAuthStateChange(function (eventName, nextSession) {
        if (eventName === 'SIGNED_IN' && nextSession) {
          void App.applySession(nextSession);
        }

        if (eventName === 'SIGNED_OUT') {
          App.clearSession();
        }
      });
    }

    return session;
  };

  App.bootstrapAuth = App.initAuth;
})();
