window.App = window.App || {};

App.buildSheetWithHeaders = function (headers, rows) {
  const aoa = [headers];

  if (rows.length) {
    rows.forEach((row) => {
      aoa.push(headers.map((header) => row[header] ?? ''));
    });
  } else {
    aoa.push(headers.map((header, index) => (index === 0 ? 'Sem registros' : '')));
  }

  const sheet = XLSX.utils.aoa_to_sheet(aoa);

  sheet['!cols'] = headers.map((header) => ({
    wch: Math.max(String(header).length + 2, 18)
  }));

  return sheet;
};

App.openExportModal = function () {
  const eventosOrdenados = [...App.state.eventos].sort((a, b) =>
    String(a.data_realizacao).localeCompare(String(b.data_realizacao))
  );

  if (!eventosOrdenados.length) {
    App.showToast('Não há eventos cadastrados para exportar.', 'warning');
    return;
  }

  App.dom.exportEventoSelect.innerHTML = '<option value="">Selecione um evento</option>';

  eventosOrdenados.forEach((evento) => {
    const option = document.createElement('option');
    option.value = evento.id;
    option.textContent = `${evento.nome} - ${App.formatDate(evento.data_realizacao)}`;
    App.dom.exportEventoSelect.appendChild(option);
  });

  App.openModal(App.dom.exportModal);
};

App.exportExcel = function () {
  App.openExportModal();
};

App.confirmExportExcel = function () {
  const eventoId = App.dom.exportEventoSelect?.value || '';

  if (!eventoId) {
    App.showToast('Selecione um evento para exportar.', 'warning');
    return;
  }

  const eventoSelecionado = App.getEventById(eventoId);

  if (!eventoSelecionado) {
    App.showToast('Evento não encontrado.', 'error');
    return;
  }

  const pessoasHeaders = [
    'Evento',
    'Data do evento',
    'Local',
    'Pessoa',
    'Placa',
    'Telefone',
    'E-mail',
    'Registrado em',
    'Status callback',
    'Data callback',
    'Responsável callback',
    'Retorno do cliente',
    'Observações callback'
  ];

  const equipeHeaders = [
    'Evento',
    'Data do evento',
    'Local',
    'Funcionário',
    'Cargo',
    'Telefone',
    'Observações',
    'Registrado em'
  ];

  const pessoasRows = App.state.presencas
    .filter((presenca) => presenca.evento_id === eventoSelecionado.id)
    .map((presenca) => {
      const pessoa = App.getPersonById(presenca.pessoa_id);

      return {
        'Evento': eventoSelecionado.nome,
        'Data do evento': App.formatDate(eventoSelecionado.data_realizacao),
        'Local': eventoSelecionado.local || '',
        'Pessoa': pessoa?.nome || '',
        'Placa': pessoa?.placa || '',
        'Telefone': pessoa?.telefone || '',
        'E-mail': pessoa?.email || '',
        'Registrado em': App.formatDateTime(presenca.registrado_em),
        'Status callback': 'Pendente',
        'Data callback': '',
        'Responsável callback': '',
        'Retorno do cliente': '',
        'Observações callback': ''
      };
    });

  const equipeRows = App.state.funcionariosEventos
    .filter((vinculo) => vinculo.evento_id === eventoSelecionado.id)
    .map((vinculo) => {
      const funcionario = App.getEmployeeById(vinculo.funcionario_id);

      return {
        'Evento': eventoSelecionado.nome,
        'Data do evento': App.formatDate(eventoSelecionado.data_realizacao),
        'Local': eventoSelecionado.local || '',
        'Funcionário': funcionario?.nome || '',
        'Cargo': funcionario?.cargo || '',
        'Telefone': funcionario?.telefone || '',
        'Observações': funcionario?.observacoes || '',
        'Registrado em': App.formatDateTime(vinculo.registrado_em)
      };
    });

  const workbook = XLSX.utils.book_new();

  const pessoasSheet = App.buildSheetWithHeaders(pessoasHeaders, pessoasRows);
  const equipeSheet = App.buildSheetWithHeaders(equipeHeaders, equipeRows);

  XLSX.utils.book_append_sheet(workbook, pessoasSheet, 'Pessoas');
  XLSX.utils.book_append_sheet(workbook, equipeSheet, 'Equipe_Funcionarios');

  const nomeArquivo = App.sanitizeFileName(
    `${eventoSelecionado.nome}_${App.formatDate(eventoSelecionado.data_realizacao)}`
  );

  XLSX.writeFile(workbook, `${nomeArquivo}_valet.xlsx`);

  App.closeModal(App.dom.exportModal);
  App.showToast('Arquivo exportado com sucesso.', 'success');
};

App.clearAllData = async function () {
  if (!App.ensureSupabaseReady()) return;

  const confirmou = await App.askConfirm({
    title: 'Limpar base',
    message: 'Tem certeza que deseja apagar todos os eventos, convidados, funcionários e histórico?',
    confirmText: 'Limpar base',
    cancelText: 'Cancelar',
    tone: 'danger'
  });

  if (!confirmou) return;

  const tabelas = [
    'presencas',
    'funcionarios_eventos',
    'pessoas',
    'funcionarios',
    'eventos'
  ];

  try {
    for (const tabela of tabelas) {
      const { error } = await App.db
        .from(tabela)
        .delete()
        .not('id', 'is', null);

      if (error) {
        console.error(`Erro ao limpar ${tabela}:`, error);
        App.showToast(`Erro ao limpar a tabela ${tabela}.`, 'error');
        return;
      }
    }

    await App.refreshAfterChange('dashboard');
    App.showToast('Base limpa com sucesso.', 'success');
  } catch (error) {
    console.error('Erro inesperado ao limpar a base:', error);
    App.showToast('Não foi possível limpar a base.', 'error');
  }
};