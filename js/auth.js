window.App = window.App || {};

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
      console.error('Erro ao obter sessão:', error);
      App.showToast('Erro ao iniciar autenticação.', 'error');
      App.showAuth();
      return;
    }

    await App.applySession(data?.session || null);

    App.db.auth.onAuthStateChange(async (_event, session) => {
      await App.applySession(session);
    });
  } catch (error) {
    console.error('Erro no bootstrapAuth:', error);
    App.showToast('Falha ao iniciar autenticação.', 'error');
    App.showAuth();
  }
};

App.applySession = async function (session) {
  App.state.currentUser = session?.user || null;

  if (App.state.currentUser) {
    App.showApp();
    App.updateCurrentUserBadge(App.state.currentUser.email || 'Usuário');

    const loaded = await App.loadAllData(false);

    if (!loaded) {
      console.warn('Sessão iniciada, mas os dados não puderam ser carregados.');
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

App.handleLogin = async function (event) {
  event.preventDefault();

  if (!App.ensureSupabaseReady()) return;

  const email = App.dom.loginEmail?.value.trim() || '';
  const password = App.dom.loginPassword?.value || '';

  if (!email || !password) {
    App.showToast('Preencha e-mail e senha.', 'warning');
    return;
  }

  try {
    const { data, error } = await App.db.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.error('Erro no login:', error);
      App.showToast(error.message || 'Login inválido. Verifique e-mail e senha.', 'error');
      return;
    }

    App.dom.loginForm?.reset();

    if (data?.session) {
      await App.applySession(data.session);
    } else {
      App.showToast('Login realizado, mas a sessão não foi retornada.', 'warning');
    }
  } catch (error) {
    console.error('Erro inesperado no login:', error);
    App.showToast('Não foi possível entrar agora.', 'error');
  }
};

App.handleLogout = async function () {
  if (!App.ensureSupabaseReady()) return;

  try {
    const { error } = await App.db.auth.signOut();

    if (error) {
      console.error('Erro ao sair:', error);
      App.showToast('Erro ao sair da conta.', 'error');
      return;
    }

    App.showToast('Você saiu da conta.', 'success');
    await App.applySession(null);
  } catch (error) {
    console.error('Erro inesperado no logout:', error);
    App.showToast('Não foi possível sair agora.', 'error');
  }
};