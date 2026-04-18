window.App = window.App || {};

App.dom = {};

App.cacheDom = function () {
  App.dom = {
    sidebar: document.getElementById('sidebar'),
    mobileMenuBtn: document.getElementById('mobileMenuBtn'),

    authScreen: document.getElementById('authScreen'),
    appShell: document.getElementById('appShell'),
    loginForm: document.getElementById('loginForm'),
    loginEmail: document.getElementById('loginEmail'),
    loginPassword: document.getElementById('loginPassword'),
    btnLogout: document.getElementById('btnLogout'),
    currentUserEmail: document.getElementById('currentUserEmail'),

    btnExportar: document.getElementById('btnExportar'),
    btnLimparTudo: document.getElementById('btnLimparTudo'),

    formEvento: document.getElementById('formEvento'),
    formPessoa: document.getElementById('formPessoa'),
    formFuncionario: document.getElementById('formFuncionario'),

    eventoNome: document.getElementById('eventoNome'),
    eventoData: document.getElementById('eventoData'),
    eventoLocal: document.getElementById('eventoLocal'),
    eventoObs: document.getElementById('eventoObs'),

    pessoaNome: document.getElementById('pessoaNome'),
    pessoaPlaca: document.getElementById('pessoaPlaca'),
    pessoaTelefone: document.getElementById('pessoaTelefone'),
    pessoaEmail: document.getElementById('pessoaEmail'),
    pessoaEvento: document.getElementById('pessoaEvento'),

    funcionarioNome: document.getElementById('funcionarioNome'),
    funcionarioCargo: document.getElementById('funcionarioCargo'),
    funcionarioTelefone: document.getElementById('funcionarioTelefone'),
    funcionarioEvento: document.getElementById('funcionarioEvento'),
    funcionarioObs: document.getElementById('funcionarioObs'),

    buscaEventos: document.getElementById('buscaEventos'),
    buscaPessoas: document.getElementById('buscaPessoas'),
    buscaFuncionarios: document.getElementById('buscaFuncionarios'),
    buscaHistorico: document.getElementById('buscaHistorico'),

    listaEventos: document.getElementById('listaEventos'),
    listaPessoas: document.getElementById('listaPessoas'),
    listaFuncionarios: document.getElementById('listaFuncionarios'),
    listaHistorico: document.getElementById('listaHistorico'),
    listaAgendaHoje: document.getElementById('listaAgendaHoje'),
    listaProximosEventos: document.getElementById('listaProximosEventos'),

    statEventos: document.getElementById('statEventos'),
    statEventosHoje: document.getElementById('statEventosHoje'),
    statProximos: document.getElementById('statProximos'),
    statFuncionarios: document.getElementById('statFuncionarios'),

    btnLimparEvento: document.getElementById('btnLimparEvento'),
    btnLimparPessoa: document.getElementById('btnLimparPessoa'),
    btnLimparFuncionario: document.getElementById('btnLimparFuncionario'),

    navLinks: document.querySelectorAll('.nav-link'),

    views: {
      dashboard: document.getElementById('view-dashboard'),
      fluxo: document.getElementById('view-fluxo'),
      eventos: document.getElementById('view-eventos'),
      pessoas: document.getElementById('view-pessoas'),
      funcionarios: document.getElementById('view-funcionarios'),
      historico: document.getElementById('view-historico')
    },

    exportModal: document.getElementById('exportModal'),
    exportEventoSelect: document.getElementById('exportEventoSelect'),
    btnCloseExportModal: document.getElementById('btnCloseExportModal'),
    btnConfirmExport: document.getElementById('btnConfirmExport'),

    editPessoaModal: document.getElementById('editPessoaModal'),
    editPessoaForm: document.getElementById('editPessoaForm'),
    editPessoaId: document.getElementById('editPessoaId'),
    editPessoaNome: document.getElementById('editPessoaNome'),
    editPessoaPlaca: document.getElementById('editPessoaPlaca'),
    editPessoaTelefone: document.getElementById('editPessoaTelefone'),
    editPessoaEmail: document.getElementById('editPessoaEmail'),
    btnCancelEditPessoa: document.getElementById('btnCancelEditPessoa'),

    confirmModal: document.getElementById('confirmModal'),
    confirmTitle: document.getElementById('confirmModalTitle'),
    confirmMessage: document.getElementById('confirmModalMessage'),
    btnCancelConfirmModal: document.getElementById('btnCancelConfirmModal'),
    btnAcceptConfirmModal: document.getElementById('btnAcceptConfirmModal')
  };
};

App.setView = function (viewName) {
  Object.entries(App.dom.views).forEach(([key, section]) => {
    if (!section) return;
    section.classList.toggle('hidden', key !== viewName);
  });

  App.dom.navLinks.forEach((button) => {
    button.classList.toggle('active', button.dataset.view === viewName);
  });

  App.dom.sidebar?.classList.remove('open');
};

App.toggleSidebar = function () {
  App.dom.sidebar?.classList.toggle('open');
};

App.showAuth = function () {
  App.dom.authScreen?.classList.remove('hidden');
  App.dom.appShell?.classList.add('hidden');
  App.dom.btnLogout?.classList.add('hidden');
  App.dom.currentUserEmail?.classList.add('hidden');
};

App.showApp = function () {
  App.dom.authScreen?.classList.add('hidden');
  App.dom.appShell?.classList.remove('hidden');
  App.dom.btnLogout?.classList.remove('hidden');
};

App.updateCurrentUserBadge = function (email = '') {
  if (!App.dom.currentUserEmail) return;

  if (email) {
    App.dom.currentUserEmail.textContent = email;
    App.dom.currentUserEmail.classList.remove('hidden');
  } else {
    App.dom.currentUserEmail.textContent = '';
    App.dom.currentUserEmail.classList.add('hidden');
  }
};

App.renderEmptyState = function (element, message) {
  if (!element) return;
  element.innerHTML = `<div class="empty">${App.escapeHtml(message)}</div>`;
};

App.openModal = function (modal) {
  if (!modal) return;
  modal.classList.remove('hidden');
  document.body.classList.add('modal-open');
};

App.closeModal = function (modal) {
  if (!modal) return;
  modal.classList.add('hidden');

  const opened = document.querySelector('.modal-overlay:not(.hidden)');
  if (!opened) {
    document.body.classList.remove('modal-open');
  }
};

App.closeAllModals = function () {
  App.closeModal(App.dom.exportModal);
  App.closeModal(App.dom.editPessoaModal);
  App.closeModal(App.dom.confirmModal);
};