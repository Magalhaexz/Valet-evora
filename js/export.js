// ============================================================
// export.js — Exportação para Excel e limpeza da base
// ============================================================

window.App = window.App || {};

// ------------------------------------------------------------
// Abre o modal de exportação e popula o select de eventos
// ------------------------------------------------------------
App.openExportModal = function () {
  if (!App.state.eventos.length) {
    App.showToast('Não há eventos cadastrados para exportar.', 'warning');
    return;
  }

  // Reutiliza o renderEventOptions que já popula o exportEventoSelect
  App.renderEventOptions();

  // Garante que o select começa sem seleção
  if (App.dom.exportEventoSelect) {
    App.dom.exportEventoSelect.value = '';
  }

  App.openModal(App.dom.exportModal);
};

// Alias público (chamado pelo botão "Exportar Excel" no topbar)
App.exportExcel = App.openExportModal;

// ------------------------------------------------------------
// Confirma e executa a exportação do evento selecionado
// ------------------------------------------------------------
App.confirmExportExcel = function () {
  const eventoId = App.dom.exportEventoSelect?.value || '';

  if (!eventoId) {
    App.showToast('Selecione um evento para exportar.', 'warning');
    return;
  }

  const evento = App.getEventById(eventoId);
  if (!evento) {
    App.showToast('Evento não encontrado.', 'error');
    return;
  }

  try {
    const workbook = XLSX.utils.book_new();

    // — Aba: Convidados —
    const pessoasSheet = App._buildPessoasSheet(evento);
    XLSX.utils.book_append_sheet(workbook, pessoasSheet, 'Convidados');

    // — Aba: Equipe —
    const equipeSheet = App._buildEquipeSheet(evento);
    XLSX.utils.book_append_sheet(workbook, equipeSheet, 'Equipe');

    // — Aba: Resumo do evento —
    const resumoSheet = App._buildResumoSheet(evento);
    XLSX.utils.book_append_sheet(workbook, resumoSheet, 'Resumo');

    const nomeArquivo = App.sanitizeFileName(
      `${evento.nome}_${App.formatDate(evento.data_realizacao)}`
    );

    XLSX.writeFile(workbook, `${nomeArquivo}_valet.xlsx`);

    App.closeModal(App.dom.exportModal);
    App.showToast(`Arquivo "${nomeArquivo}_valet.xlsx" exportado com sucesso.`, 'success');

  } catch (err) {
    console.error('[Export] Erro ao gerar Excel:', err);
    App.showToast('Não foi possível gerar o arquivo. Tente novamente.', 'error');
  }
};

// ------------------------------------------------------------
// Constrói a aba de convidados
// ------------------------------------------------------------
App._buildPessoasSheet = function (evento) {
  const headers = [
    'Evento',
    'Data do evento',
    'Local',
    'Convidado',
    'Placa',
    'Telefone',
    'E-mail',
    'Registrado em',
    'Status callback',
    'Data callback',
    'Responsável callback',
    'Retorno do cliente',
    'Observações callback',
  ];

  const rows = App.state.presencas
    .filter((p) => p.evento_id === evento.id)
    .map((presenca) => {
      const pessoa = App.getPersonById(presenca.pessoa_id);
      return {
        'Evento':                 evento.nome,
        'Data do evento':         App.formatDate(evento.data_realizacao),
        'Local':                  evento.local || '',
        'Convidado':              pessoa?.nome      || '(removido)',
        'Placa':                  pessoa?.placa     || '',
        'Telefone':               pessoa?.telefone  || '',
        'E-mail':                 pessoa?.email     || '',
        'Registrado em':          App.formatDateTime(presenca.registrado_em),
        'Status callback':        'Pendente',
        'Data callback':          '',
        'Responsável callback':   '',
        'Retorno do cliente':     '',
        'Observações callback':   '',
      };
    });

  return App._buildSheet(headers, rows);
};

// ------------------------------------------------------------
// Constrói a aba de equipe/funcionários
// ------------------------------------------------------------
App._buildEquipeSheet = function (evento) {
  const headers = [
    'Evento',
    'Data do evento',
    'Local',
    'Funcionário',
    'Cargo',
    'Telefone',
    'Observações',
    'Registrado em',
  ];

  const rows = App.state.funcionariosEventos
    .filter((v) => v.evento_id === evento.id)
    .map((vinculo) => {
      const f = App.getEmployeeById(vinculo.funcionario_id);
      return {
        'Evento':          evento.nome,
        'Data do evento':  App.formatDate(evento.data_realizacao),
        'Local':           evento.local        || '',
        'Funcionário':     f?.nome             || '(removido)',
        'Cargo':           f?.cargo            || '',
        'Telefone':        f?.telefone         || '',
        'Observações':     f?.observacoes      || '',
        'Registrado em':   App.formatDateTime(vinculo.registrado_em),
      };
    });

  return App._buildSheet(headers, rows);
};

// ------------------------------------------------------------
// Constrói uma aba de resumo geral do evento
// ------------------------------------------------------------
App._buildResumoSheet = function (evento) {
  const totalConvidados  = App.getPeopleByEvent(evento.id).length;
  const totalFuncionarios = App.getEmployeesByEvent(evento.id).length;

  const aoa = [
    ['Campo',            'Valor'],
    ['Evento',           evento.nome],
    ['Data',             App.formatDate(evento.data_realizacao)],
    ['Local',            evento.local       || '—'],
    ['Observações',      evento.observacoes || '—'],
    ['Total convidados', totalConvidados],
    ['Total equipe',     totalFuncionarios],
    ['Exportado em',     App.formatDateTime(new Date().toISOString())],
  ];

  const sheet = XLSX.utils.aoa_to_sheet(aoa);

  sheet['!cols'] = [{ wch: 22 }, { wch: 40 }];

  return sheet;
};

// ------------------------------------------------------------
// Utilitário: monta uma sheet a partir de headers + rows (objetos)
// ------------------------------------------------------------
App._buildSheet = function (headers, rows) {
  const aoa = [headers];

  if (rows.length) {
    rows.forEach((row) => {
      aoa.push(headers.map((h) => row[h] ?? ''));
    });
  } else {
    // Linha indicativa de ausência de dados
    aoa.push(
      headers.map((_, i) => (i === 0 ? 'Sem registros para este evento' : ''))
    );
  }

  const sheet = XLSX.utils.aoa_to_sheet(aoa);

  // Largura automática baseada no maior header, mínimo 18 chars
  sheet['!cols'] = headers.map((h) => ({
    wch: Math.max(String(h).length + 4, 18),
  }));

  return sheet;
};

// ------------------------------------------------------------
// Limpa toda a base de dados (com confirmação)
// ------------------------------------------------------------
App.clearAllData = async function () {
  if (!App.ensureSupabaseReady()) return;

  const confirmou = await App.confirm(
    'Apagar TODOS os eventos, convidados, funcionários e histórico? Esta ação não pode ser desfeita.',
    'Limpar base de dados'
  );

  if (!confirmou) return;

  // Ordem respeitando dependências: vínculos antes das entidades
  const tabelas = [
    'presencas',
    'funcionarios_eventos',
    'pessoas',
    'funcionarios',
    'eventos',
  ];

  try {
    // Vínculos podem ser deletados em paralelo (sem dependência entre si)
    const [presencasRes, funcionariosEventosRes] = await Promise.all([
      App.db.from('presencas').delete().not('id', 'is', null),
      App.db.from('funcionarios_eventos').delete().not('id', 'is', null),
    ]);

    if (presencasRes.error) {
      throw new Error(`Erro ao limpar presenças: ${presencasRes.error.message}`);
    }
    if (funcionariosEventosRes.error) {
      throw new Error(`Erro ao limpar vínculos: ${funcionariosEventosRes.error.message}`);
    }

    // Entidades podem ser deletadas em paralelo após os vínculos
    const [pessoasRes, funcionariosRes, eventosRes] = await Promise.all([
      App.db.from('pessoas').delete().not('id', 'is', null),
      App.db.from('funcionarios').delete().not('id', 'is', null),
      App.db.from('eventos').delete().not('id', 'is', null),
    ]);

    const erros = [
      pessoasRes.error     && `pessoas: ${pessoasRes.error.message}`,
      funcionariosRes.error && `funcionários: ${funcionariosRes.error.message}`,
      eventosRes.error     && `eventos: ${eventosRes.error.message}`,
    ].filter(Boolean);

    if (erros.length) {
      throw new Error(`Erro ao limpar tabelas — ${erros.join(' | ')}`);
    }

    await App.refreshAfterChange('dashboard');
    App.showToast('Base limpa com sucesso.', 'success');

  } catch (err) {
    console.error('[Export] Erro ao limpar base:', err);
    App.showToast(err.message || 'Não foi possível limpar a base.', 'error');
  }
};