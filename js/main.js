window.App = window.App || {};

/* ============================================================
   main.js — Bootstrap + Render seguro + Compatibilidade
   ============================================================ */

(function () {
  // Evita rodar duas vezes
  if (App._mainBootstrapped) return;
  App._mainBootstrapped = true;

  // ------------------------------------------------------------
  // Compatibilidade: funções antigas -> novas
  // (cria wrappers que chamam a função "nova" se existir)
  // ------------------------------------------------------------
  function makeCompat(oldName, newName) {
    if (typeof App[oldName] === 'function') return;

    App[oldName] = function () {
      if (typeof App[newName] === 'function') {
        return App[newName].apply(App, arguments);
      }
      // Se nenhuma existir, não quebra o app
      console.warn('[compat] Função ausente:', oldName, '->', newName);
    };
  }

  // Pessoas
  makeCompat('renderPeopleList', 'renderPeople');
  // Funcionários (caso no seu projeto seja renderStaff / renderEmployees)
  makeCompat('renderStaffList', 'renderStaff');
  makeCompat('renderEmployeesList', 'renderEmployees');

  // ------------------------------------------------------------
  // Render seguro: não deixa 1 tela quebrar o resto
  // ------------------------------------------------------------
  function safeCall(fnName) {
    try {
      var fn = App[fnName];
      if (typeof fn === 'function') fn();
    } catch (err) {
      console.error('[render] Erro em ' + fnName + ':', err);
      if (typeof App.showToast === 'function') {
        App.showToast('Erro ao renderizar: ' + fnName, 'error');
      }
    }
  }

  // ------------------------------------------------------------
  // Render geral (chamado após login, após carregar dados, etc.)
  // ------------------------------------------------------------
  App.renderAll = function () {
    // Atenção: chame aqui os nomes que EXISTEM no seu projeto.
    // Mantive vários em safeCall para não quebrar se algum não existir.

    safeCall('renderDashboard');
    safeCall('renderFlow');
    safeCall('renderEvents');

    // Aqui é o ponto crítico: garante que "People" renderiza com nome antigo ou novo
    // - se você tem App.renderPeople(), o wrapper renderPeopleList chama ele
    // - se você tem App.renderPeopleList(), também funciona
    safeCall('renderPeopleList');
    safeCall('renderPeople');

    // Funcionários/equipe (tenta várias variações)
    safeCall('renderStaffList');
    safeCall('renderStaff');
    safeCall('renderEmployeesList');
    safeCall('renderEmployees');

    safeCall('renderHistory');
  };

  // ------------------------------------------------------------
  // Bootstrap ao carregar a página
  // ------------------------------------------------------------
  document.addEventListener('DOMContentLoaded', function () {
    // Se existir um init geral no seu app, chama
    if (typeof App.init === 'function') {
      try { App.init(); } catch (e) { console.error('[init] erro', e); }
    }

    // Se existir initAuth, chama (auth.js normalmente define isso)
    if (typeof App.initAuth === 'function') {
      try { App.initAuth(); } catch (e) { console.error('[auth] erro', e); }
    }

    // Se você carrega dados e não renderiza depois, deixa um "fallback":
    // (não atrapalha se data.js já chama renderAll)
    if (typeof App.renderAll === 'function') {
      try { App.renderAll(); } catch (e) { console.error('[renderAll] erro', e); }
    }
  });
})();