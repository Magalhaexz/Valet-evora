window.App = window.App || {};

App.state = {
  currentUser: null,
  refreshTimer: null,
  isLoading: false,
  pendingConfirmResolve: null,

  eventos: [],
  pessoas: [],
  presencas: [],
  funcionarios: [],
  funcionariosEventos: []
};

App.clearState = function () {
  App.state.eventos = [];
  App.state.pessoas = [];
  App.state.presencas = [];
  App.state.funcionarios = [];
  App.state.funcionariosEventos = [];
};

App.startAutoRefresh = function () {
  App.stopAutoRefresh();

  if (!App.state.currentUser) return;
  if (!App.ensureSupabaseReady(false)) return;

  App.state.refreshTimer = setInterval(async () => {
    if (!App.state.currentUser) return;

    await App.loadAllData(false);
    App.renderAll();
  }, App.config.AUTO_REFRESH_MS);
};

App.stopAutoRefresh = function () {
  if (App.state.refreshTimer) {
    clearInterval(App.state.refreshTimer);
    App.state.refreshTimer = null;
  }
};