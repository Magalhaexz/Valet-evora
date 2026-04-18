// ============================================================
// state.js — Estado global da aplicação e auto-refresh
// ============================================================

window.App = window.App || {};

// ------------------------------------------------------------
// Estado global centralizado
// ------------------------------------------------------------
App.state = {
  // Usuário autenticado (objeto do Supabase ou null)
  currentUser: null,

  // Timer do auto-refresh
  refreshTimer: null,

  // Indica se há um carregamento em andamento (evita fetches paralelos)
  isLoading: false,

  // — Dados carregados do Supabase —
  eventos:             [],
  pessoas:             [],
  presencas:           [],
  funcionarios:        [],
  funcionariosEventos: [],
};

// ------------------------------------------------------------
// Limpa os dados do estado (usado no logout)
// ------------------------------------------------------------
App.clearState = function () {
  App.state.eventos            = [];
  App.state.pessoas            = [];
  App.state.presencas          = [];
  App.state.funcionarios       = [];
  App.state.funcionariosEventos = [];

  // Limpa os índices de busca O(1) gerados em data.js
  App._idx = null;

  console.info('[State] Estado limpo.');
};

// ------------------------------------------------------------
// Auto-refresh periódico dos dados
// Intervalo configurado em App.config.AUTO_REFRESH_MS
// ------------------------------------------------------------
App.startAutoRefresh = function () {
  App.stopAutoRefresh(); // Garante que não há timer duplicado

  if (!App.state.currentUser)           return;
  if (!App.ensureSupabaseReady(false))  return;

  App.state.refreshTimer = setInterval(async () => {
    // Cancela se o usuário saiu durante o intervalo
    if (!App.state.currentUser) {
      App.stopAutoRefresh();
      return;
    }

    // Não faz fetch se já há um carregamento em andamento
    if (App.state.isLoading) {
      console.info('[State] Auto-refresh pulado — carregamento em andamento.');
      return;
    }

    // Não atualiza se o usuário estiver interagindo com um modal aberto
    const modalAberto = document.querySelector('.modal-overlay:not(.hidden)');
    if (modalAberto) {
      console.info('[State] Auto-refresh pulado — modal aberto.');
      return;
    }

    // Não atualiza se o usuário estiver preenchendo um formulário
    const focusedElement = document.activeElement;
    const estaDigitando  =
      focusedElement instanceof HTMLInputElement     ||
      focusedElement instanceof HTMLTextAreaElement  ||
      focusedElement instanceof HTMLSelectElement;

    if (estaDigitando) {
      console.info('[State] Auto-refresh pulado — usuário digitando.');
      return;
    }

    console.info('[State] Auto-refresh disparado.');
    const loaded = await App.loadAllData(false);
    if (loaded) App.renderAll();

  }, App.config.AUTO_REFRESH_MS);

  console.info(`[State] Auto-refresh iniciado (intervalo: ${App.config.AUTO_REFRESH_MS}ms).`);
};

// ------------------------------------------------------------
// Para o auto-refresh
// ------------------------------------------------------------
App.stopAutoRefresh = function () {
  if (App.state.refreshTimer) {
    clearInterval(App.state.refreshTimer);
    App.state.refreshTimer = null;
    console.info('[State] Auto-refresh parado.');
  }
};

// ------------------------------------------------------------
// Visibilidade da página — pausa o refresh quando a aba está oculta
// e retoma quando volta a ficar visível
// ------------------------------------------------------------
document.addEventListener('visibilitychange', () => {
  if (!App.state.currentUser) return;

  if (document.hidden) {
    App.stopAutoRefresh();
    console.info('[State] Aba oculta — auto-refresh pausado.');
  } else {
    App.startAutoRefresh();
    console.info('[State] Aba visível — auto-refresh retomado.');
  }
});