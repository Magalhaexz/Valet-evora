// ============================================================
// dom.js — Cache de elementos, navegação e controle de UI
// ============================================================

window.App = window.App || {};

// ------------------------------------------------------------
// Cache de todos os elementos do DOM
// ------------------------------------------------------------
App.cacheDom = function () {
  const get = (id) => {
    const el = document.getElementById(id);
    if (!el) console.warn(`[DOM] Elemento não encontrado: #${id}`);
    return el;
  };

  App.dom = {
    // Layout / navegação
    sidebar:       get('sidebar'),
    mobileMenuBtn: get('mobileMenuBtn'),
    navLinks:      document.querySelectorAll('.nav-link'),

    // Autenticação
    authScreen:       get('authScreen'),
    appShell:         get('appShell'),
    loginForm:        get('loginForm'),
    loginEmail:       get('loginEmail'),
    loginPassword:    get('loginPassword'),
    btnLogout:        get('btnLogout'),
    currentUserEmail: get('currentUserEmail'),

    // Ações do topo
    btnExportar:   get('btnExportar'),
    btnLimparTudo: get('btnLimparTudo'),

    // Formulários
    formEvento:      get('formEvento'),
    formPessoa:      get('formPessoa'),
    formFuncionario: get('formFuncionario'),

    // Campos — Evento
    eventoNome:  get('eventoNome'),
    eventoData:  get('eventoData'),
    eventoLocal: get('eventoLocal'),
    eventoObs:   get('eventoObs'),

    // Campos — Pessoa
    pessoaNome:      get('pessoaNome'),
    pessoaPlaca:     get('pessoaPlaca'),
    pessoaTelefone:  get('pessoaTelefone'),
    pessoaEmail:     get('pessoaEmail'),
    pessoaEvento:    get('pessoaEvento'),

    // Campos — Funcionário
    funcionarioNome:      get('funcionarioNome'),
    funcionarioCargo:     get('funcionarioCargo'),
    funcionarioTelefone:  get('funcionarioTelefone'),
    funcionarioEvento:    get('funcionarioEvento'),
    funcionarioObs:       get('funcionarioObs'),

    // Buscas
    buscaEventos:      get('buscaEventos'),
    buscaPessoas:      get('buscaPessoas'),
    buscaFuncionarios: get('buscaFuncionarios'),
    buscaHistorico:    get('buscaHistorico'),

    // Listas
    listaEventos:         get('listaEventos'),
    listaPessoas:         get('listaPessoas'),
    listaFuncionarios:    get('listaFuncionarios'),
    listaHistorico:       get('listaHistorico'),
    listaAgendaHoje:      get('listaAgendaHoje'),
    listaProximosEventos: get('listaProximosEventos'),

    // Stats do dashboard
    statEventos:     get('statEventos'),
    statEventosHoje: get('statEventosHoje'),
    statProximos:    get('statProximos'),
    statFuncionarios: get('statFuncionarios'),

    // Botões de limpar campos
    btnLimparEvento:      get('btnLimparEvento'),
    btnLimparPessoa:      get('btnLimparPessoa'),
    btnLimparFuncionario: get('btnLimparFuncionario'),

    // Views
    views: {
      dashboard:    get('view-dashboard'),
      fluxo:        get('view-fluxo'),
      eventos:      get('view-eventos'),
      pessoas:      get('view-pessoas'),
      funcionarios: get('view-funcionarios'),
      historico:    get('view-historico'),
    },

    // Modal: Exportar
    exportModal:          get('exportModal'),
    exportEventoSelect:   get('exportEventoSelect'),
    btnCloseExportModal:  get('btnCloseExportModal'),
    btnConfirmExport:     get('btnConfirmExport'),

    // Modal: Editar pessoa
    editPessoaModal:      get('editPessoaModal'),
    editPessoaForm:       get('editPessoaForm'),
    editPessoaId:         get('editPessoaId'),
    editPessoaNome:       get('editPessoaNome'),
    editPessoaPlaca:      get('editPessoaPlaca'),
    editPessoaTelefone:   get('editPessoaTelefone'),
    editPessoaEmail:      get('editPessoaEmail'),
    btnCancelEditPessoa:  get('btnCancelEditPessoa'),

    // Modal: Confirmação genérica
    confirmModal:            get('confirmModal'),
    confirmTitle:            get('confirmModalTitle'),
    confirmMessage:          get('confirmModalMessage'),
    btnCancelConfirmModal:   get('btnCancelConfirmModal'),
    btnAcceptConfirmModal:   get('btnAcceptConfirmModal'),
  };
};

// ------------------------------------------------------------
// Navegação entre views
// ------------------------------------------------------------
App.setView = function (viewName) {
  Object.entries(App.dom.views).forEach(([key, section]) => {
    if (!section) return;
    section.classList.toggle('hidden', key !== viewName);
  });

  App.dom.navLinks.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.view === viewName);
    btn.setAttribute('aria-current', btn.dataset.view === viewName ? 'page' : 'false');
  });

  // Fecha sidebar mobile ao navegar
  App.dom.sidebar?.classList.remove('open');

  // Rola o conteúdo para o topo ao trocar de view
  document.querySelector('.content')?.scrollTo({ top: 0, behavior: 'smooth' });
};

App.toggleSidebar = function () {
  const isOpen = App.dom.sidebar?.classList.toggle('open');
  App.dom.mobileMenuBtn?.setAttribute('aria-expanded', String(isOpen));
};

// ------------------------------------------------------------
// Tela de autenticação vs. app principal
// ------------------------------------------------------------
App.showAuth = function () {
  App.dom.authScreen?.classList.remove('hidden');
  App.dom.appShell?.classList.add('hidden');
  App.dom.btnLogout?.classList.add('hidden');
  App.dom.currentUserEmail?.classList.add('hidden');

  // Foca no campo de e-mail ao exibir a tela de login
  setTimeout(() => App.dom.loginEmail?.focus(), 50);
};

App.showApp = function () {
  App.dom.authScreen?.classList.add('hidden');
  App.dom.appShell?.classList.remove('hidden');
  App.dom.btnLogout?.classList.remove('hidden');
};

// ------------------------------------------------------------
// Badge do usuário logado
// ------------------------------------------------------------
App.updateCurrentUserBadge = function (email = '') {
  const el = App.dom.currentUserEmail;
  if (!el) return;

  if (email) {
    el.textContent = email;
    el.classList.remove('hidden');
  } else {
    el.textContent = '';
    el.classList.add('hidden');
  }
};

// ------------------------------------------------------------
// Estado vazio nas listas
// ------------------------------------------------------------
App.renderEmptyState = function (element, message) {
  if (!element) return;
  element.innerHTML = `<div class="empty">${App.escapeHtml(message)}</div>`;
};

// ------------------------------------------------------------
// Modais
// ------------------------------------------------------------
App.openModal = function (modal) {
  if (!modal) return;

  modal.classList.remove('hidden');
  document.body.classList.add('modal-open');

  // Foca no primeiro campo interativo do modal (acessibilidade)
  const focusable = modal.querySelector(
    'input:not([type="hidden"]), select, textarea, button:not([disabled])'
  );
  setTimeout(() => focusable?.focus(), 50);

  // Fecha ao clicar no overlay (fora do painel)
  modal._overlayClickHandler = (e) => {
    if (e.target === modal) App.closeModal(modal);
  };
  modal.addEventListener('click', modal._overlayClickHandler);
};

App.closeModal = function (modal) {
  if (!modal) return;

  modal.classList.add('hidden');

  // Remove o listener de overlay para evitar acúmulo
  if (modal._overlayClickHandler) {
    modal.removeEventListener('click', modal._overlayClickHandler);
    delete modal._overlayClickHandler;
  }

  // Remove a classe do body apenas se não houver outros modais abertos
  const stillOpen = document.querySelector('.modal-overlay:not(.hidden)');
  if (!stillOpen) {
    document.body.classList.remove('modal-open');
  }
};

App.closeAllModals = function () {
  [
    App.dom.exportModal,
    App.dom.editPessoaModal,
    App.dom.confirmModal,
  ].forEach(App.closeModal);
};

// ------------------------------------------------------------
// Modal de confirmação genérico (reutilizável)
// ------------------------------------------------------------
/**
 * Abre o modal de confirmação e resolve uma Promise com true/false.
 *
 * Uso:
 *   const confirmado = await App.confirm('Deseja excluir este evento?');
 *   if (confirmado) { ... }
 */
App.confirm = function (message, title = 'Confirmar ação') {
  return new Promise((resolve) => {
    if (App.dom.confirmTitle)   App.dom.confirmTitle.textContent   = title;
    if (App.dom.confirmMessage) App.dom.confirmMessage.textContent = message;

    App.openModal(App.dom.confirmModal);

    const cleanup = (result) => {
      App.closeModal(App.dom.confirmModal);
      App.dom.btnAcceptConfirmModal.removeEventListener('click', onAccept);
      App.dom.btnCancelConfirmModal.removeEventListener('click', onCancel);
      resolve(result);
    };

    const onAccept = () => cleanup(true);
    const onCancel = () => cleanup(false);

    App.dom.btnAcceptConfirmModal?.addEventListener('click', onAccept,  { once: true });
    App.dom.btnCancelConfirmModal?.addEventListener('click', onCancel,  { once: true });
  });
};

// Fecha todos os modais ao pressionar Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') App.closeAllModals();
});