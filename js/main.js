// ============================================================
// main.js — Ponto de entrada, binding de eventos e inicialização
// ============================================================

window.App = window.App || {};

// ------------------------------------------------------------
// Re-renderiza todas as views com os dados atuais do estado
// ------------------------------------------------------------
App.renderAll = function () {
  App.renderStats();
  App.renderAgenda();
  App.renderEventOptions();
  App.renderEventList();
  App.renderPeopleList();
  App.renderEmployeeList();
  App.renderHistory();
};

// ------------------------------------------------------------
// Registra todos os event listeners da aplicação
// ------------------------------------------------------------
App.bindEvents = function () {

  // — Navegação —
  App.dom.mobileMenuBtn?.addEventListener('click', App.toggleSidebar);

  App.dom.navLinks.forEach((btn) => {
    btn.addEventListener('click', () => App.setView(btn.dataset.view));
  });

  // — Autenticação —
  App.dom.loginForm?.addEventListener('submit', App.handleLogin);
  App.dom.btnLogout?.addEventListener('click',  App.handleLogout);

  // — Formulários de cadastro —
  App.dom.formEvento?.addEventListener('submit',      App.handleSaveEvent);
  App.dom.formPessoa?.addEventListener('submit',      App.handleSavePerson);
  App.dom.formFuncionario?.addEventListener('submit', App.handleSaveEmployee);
  App.dom.editPessoaForm?.addEventListener('submit',  App.handleUpdatePerson);

  // — Botões de limpar campos —
  App.dom.btnLimparEvento?.addEventListener('click',      () => App.dom.formEvento?.reset());
  App.dom.btnLimparPessoa?.addEventListener('click',      () => App.dom.formPessoa?.reset());
  App.dom.btnLimparFuncionario?.addEventListener('click', () => App.dom.formFuncionario?.reset());

  // — Exportação —
  App.dom.btnExportar?.addEventListener('click',       App.exportExcel);
  App.dom.btnConfirmExport?.addEventListener('click',  App.confirmExportExcel);
  App.dom.btnCloseExportModal?.addEventListener('click', () =>
    App.closeModal(App.dom.exportModal)
  );

  // — Modal de edição de pessoa —
  App.dom.btnCancelEditPessoa?.addEventListener('click', () =>
    App.closeModal(App.dom.editPessoaModal)
  );

  // — Limpeza geral —
  App.dom.btnLimparTudo?.addEventListener('click', App.clearAllData);

  // — Campos de busca (debounced para não re-renderizar a cada tecla) —
  App.dom.buscaEventos?.addEventListener('input',      App._debounce(App.renderEventList,    200));
  App.dom.buscaPessoas?.addEventListener('input',      App._debounce(App.renderPeopleList,   200));
  App.dom.buscaFuncionarios?.addEventListener('input', App._debounce(App.renderEmployeeList, 200));
  App.dom.buscaHistorico?.addEventListener('input',    App._debounce(App.renderHistory,      200));

  // — Delegação de cliques nas listas (delete, edit) —
  document.addEventListener('click', async (e) => {
    const target = e.target.closest('[data-action]');
    if (!target) return;

    const { action, id } = target.dataset;

    switch (action) {
      case 'delete-event':    await App.deleteEvent(id);          break;
      case 'delete-person':   await App.deletePerson(id);         break;
      case 'delete-employee': await App.deleteEmployee(id);       break;
      case 'edit-person':     App.openEditPersonModal(id);        break;
      default:
        console.warn(`[Main] Ação desconhecida: "${action}"`);
    }
  });

  // — Recarrega dados ao voltar para a aba (com throttle de 30s) —
  window.addEventListener('focus', App._onWindowFocus);
};

// ------------------------------------------------------------
// Recarrega dados ao voltar para a aba do navegador
// Throttle de 30s evita re-fetches excessivos
// ------------------------------------------------------------
App._lastFocusRefresh = 0;

App._onWindowFocus = async function () {
  if (!App.state.currentUser) return;

  const agora = Date.now();
  const THROTTLE_MS = 30_000; // 30 segundos

  if (agora - App._lastFocusRefresh < THROTTLE_MS) return;

  App._lastFocusRefresh = agora;

  const loaded = await App.loadAllData(false);
  if (loaded) App.renderAll();
};

// ------------------------------------------------------------
// Inicialização principal (DOMContentLoaded)
// ------------------------------------------------------------
document.addEventListener('DOMContentLoaded', async () => {
  // 1. Cache dos elementos do DOM
  App.cacheDom();

  // 2. Inicializa o cliente Supabase
  App.initSupabase();

  // 3. Registra todos os event listeners
  App.bindEvents();

  // 4. Renderiza o estado inicial (zerado — antes de carregar dados)
  App.renderAll();
  App.setView('dashboard');

  // 5. Verifica sessão ativa e carrega dados se logado
  await App.bootstrapAuth();

  // 6. Aviso de configuração se o Supabase não estiver configurado
  if (!App.isSupabaseConfigured()) {
    App.showToast(
      'Configure o Supabase em js/config.js para começar.',
      'warning',
      5000
    );
  }
});