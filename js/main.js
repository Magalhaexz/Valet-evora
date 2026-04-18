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
  App.dom.editPessoaForm?.addEventListener('submit', App.handleUpdatePerson);

  App.dom.btnLimparEvento?.addEventListener('click', () => App.dom.formEvento?.reset());
  App.dom.btnLimparPessoa?.addEventListener('click', () => App.dom.formPessoa?.reset());
  App.dom.btnLimparFuncionario?.addEventListener('click', () => App.dom.formFuncionario?.reset());

  App.dom.btnExportar?.addEventListener('click', App.exportExcel);
  App.dom.btnConfirmExport?.addEventListener('click', App.confirmExportExcel);
  App.dom.btnCloseExportModal?.addEventListener('click', () => App.closeModal(App.dom.exportModal));
  App.dom.btnCancelEditPessoa?.addEventListener('click', () => App.closeModal(App.dom.editPessoaModal));

  App.dom.btnCancelConfirmModal?.addEventListener('click', () => App.resolveConfirmModal(false));
  App.dom.btnAcceptConfirmModal?.addEventListener('click', () => App.resolveConfirmModal(true));

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
    if (action === 'edit-person') App.openEditPersonModal(id);
  });

  document.addEventListener('click', (event) => {
    if (!event.target.classList.contains('modal-overlay')) return;

    if (event.target === App.dom.confirmModal) {
      App.resolveConfirmModal(false);
      return;
    }

    App.closeModal(event.target);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;

    if (App.dom.confirmModal && !App.dom.confirmModal.classList.contains('hidden')) {
      App.resolveConfirmModal(false);
      return;
    }

    App.closeAllModals();
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
    App.showToast(
      'Projeto pronto. Agora configure o Supabase em js/config.js.',
      'warning',
      4800
    );
  }
});