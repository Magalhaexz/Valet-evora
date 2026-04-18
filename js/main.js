window.App = window.App || {};

App.renderAll = function () {
  App.renderStats();
  App.renderAgenda();
  App.renderEventOptions();
  App.renderEventList();
  App.renderPeopleList();
  App.renderEmployeeList();
  App.renderHistory();
};

App.bindEvents = function () {
  App.dom.mobileMenuBtn?.addEventListener('click', App.toggleSidebar);

  App.dom.navLinks.forEach((button) => {
    button.addEventListener('click', () => App.setView(button.dataset.view));
  });

  App.dom.loginForm?.addEventListener('submit', App.handleLogin);
  App.dom.btnLogout?.addEventListener('click', App.handleLogout);

  App.dom.formEvento?.addEventListener('submit', App.handleSaveEvent);
  App.dom.formPessoa?.addEventListener('submit', App.handleSavePerson);
  App.dom.formFuncionario?.addEventListener('submit', App.handleSaveEmployee);

  App.dom.btnLimparEvento?.addEventListener('click', () => App.dom.formEvento?.reset());
  App.dom.btnLimparPessoa?.addEventListener('click', () => App.dom.formPessoa?.reset());
  App.dom.btnLimparFuncionario?.addEventListener('click', () => App.dom.formFuncionario?.reset());

  App.dom.btnExportar?.addEventListener('click', App.exportExcel);
  App.dom.btnLimparTudo?.addEventListener('click', App.clearAllData);

  App.dom.buscaEventos?.addEventListener('input', App.renderEventList);
  App.dom.buscaPessoas?.addEventListener('input', App.renderPeopleList);
  App.dom.buscaFuncionarios?.addEventListener('input', App.renderEmployeeList);
  App.dom.buscaHistorico?.addEventListener('input', App.renderHistory);

  document.addEventListener('click', async (event) => {
    const target = event.target.closest('[data-action]');
    if (!target) return;

    const action = target.dataset.action;
    const id = target.dataset.id;

    if (action === 'delete-event') await App.deleteEvent(id);
    if (action === 'delete-person') await App.deletePerson(id);
    if (action === 'delete-employee') await App.deleteEmployee(id);
  });

  window.addEventListener('focus', async () => {
    if (!App.state.currentUser) return;
    await App.loadAllData(false);
    App.renderAll();
  });
};

document.addEventListener('DOMContentLoaded', async () => {
  App.cacheDom();
  App.initSupabase();
  App.bindEvents();
  App.renderAll();
  App.setView('dashboard');
  await App.bootstrapAuth();

  if (!App.isSupabaseConfigured()) {
    App.showToast('Projeto pronto. Agora configure o Supabase em js/config.js.', 'warning', 4800);
  }
});