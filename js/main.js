document.addEventListener('DOMContentLoaded', () => {
  cacheDom();
  initSupabase();
  bindBaseEvents();
  initPlaceholders();
  setView('dashboard');
});

function bindBaseEvents() {
  window.DOM.mobileMenuBtn?.addEventListener('click', toggleSidebar);

  window.DOM.navLinks.forEach((btn) => {
    btn.addEventListener('click', () => {
      setView(btn.dataset.view);
    });
  });

  window.DOM.btnLimparEvento?.addEventListener('click', () => {
    window.DOM.formEvento?.reset();
  });

  window.DOM.btnLimparPessoa?.addEventListener('click', () => {
    window.DOM.formPessoa?.reset();
  });

  window.DOM.btnLimparFuncionario?.addEventListener('click', () => {
    window.DOM.formFuncionario?.reset();
  });

  window.DOM.loginForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    alert('A autenticação será ligada no próximo passo.');
  });

  window.DOM.btnLogout?.addEventListener('click', () => {
    alert('O logout será ligado no próximo passo.');
  });

  window.DOM.btnExportar?.addEventListener('click', () => {
    alert('A exportação Excel será ligada no próximo passo.');
  });

  window.DOM.btnLimparTudo?.addEventListener('click', () => {
    alert('A limpeza da base será ligada no próximo passo.');
  });

  window.DOM.formEvento?.addEventListener('submit', (e) => {
    e.preventDefault();
    alert('O cadastro de eventos será ligado no próximo passo.');
  });

  window.DOM.formPessoa?.addEventListener('submit', (e) => {
    e.preventDefault();
    alert('O cadastro de pessoas será ligado no próximo passo.');
  });

  window.DOM.formFuncionario?.addEventListener('submit', (e) => {
    e.preventDefault();
    alert('O cadastro de funcionários será ligado no próximo passo.');
  });
}

function initPlaceholders() {
  if (window.DOM.statEventos) window.DOM.statEventos.textContent = '0';
  if (window.DOM.statEventosHoje) window.DOM.statEventosHoje.textContent = '0';
  if (window.DOM.statProximos) window.DOM.statProximos.textContent = '0';
  if (window.DOM.statFuncionarios) window.DOM.statFuncionarios.textContent = '0';

  if (window.DOM.listaAgendaHoje) {
    window.DOM.listaAgendaHoje.innerHTML =
      '<div class="empty">Base inicial pronta. A agenda aparecerá aqui.</div>';
  }

  if (window.DOM.listaProximosEventos) {
    window.DOM.listaProximosEventos.innerHTML =
      '<div class="empty">Os próximos eventos aparecerão aqui.</div>';
  }

  if (window.DOM.listaEventos) {
    window.DOM.listaEventos.innerHTML =
      '<div class="empty">Nenhum evento carregado ainda.</div>';
  }

  if (window.DOM.listaPessoas) {
    window.DOM.listaPessoas.innerHTML =
      '<div class="empty">Nenhuma pessoa carregada ainda.</div>';
  }

  if (window.DOM.listaFuncionarios) {
    window.DOM.listaFuncionarios.innerHTML =
      '<div class="empty">Nenhum funcionário carregado ainda.</div>';
  }

  if (window.DOM.listaHistorico) {
    window.DOM.listaHistorico.innerHTML =
      '<div class="empty">O histórico aparecerá aqui.</div>';
  }
}