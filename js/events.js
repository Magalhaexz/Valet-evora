window.App = window.App || {};

App.handleSaveEvent = async function (event) {
  event.preventDefault();

  if (!App.ensureSupabaseReady()) return;

  const nome = App.dom.eventoNome?.value.trim() || '';
  const dataRealizacao = App.dom.eventoData?.value || '';
  const local = App.dom.eventoLocal?.value.trim() || '';
  const observacoes = App.dom.eventoObs?.value.trim() || '';

  if (!nome || !dataRealizacao) {
    App.showToast('Preencha o nome e a data do evento.', 'warning');
    return;
  }

  const novoEvento = {
    id: App.createId(),
    nome,
    data_realizacao: dataRealizacao,
    local,
    observacoes,
    criado_em: new Date().toISOString()
  };

  try {
    const { error } = await App.db.from('eventos').insert([novoEvento]);

    if (error) {
      console.error('Erro ao salvar evento:', error);
      App.showToast('Erro ao salvar evento.', 'error');
      return;
    }

    App.dom.formEvento?.reset();

    await App.refreshAfterChange('eventos');
    App.showToast('Evento cadastrado com sucesso.', 'success');
  } catch (error) {
    console.error('Erro inesperado ao salvar evento:', error);
    App.showToast('Não foi possível salvar o evento.', 'error');
  }
};

App.renderEventOptions = function () {
  const pessoaEventoAtual = App.dom.pessoaEvento?.value || '';
  const funcionarioEventoAtual = App.dom.funcionarioEvento?.value || '';

  if (App.dom.pessoaEvento) {
    App.dom.pessoaEvento.innerHTML = '<option value="">Selecione um evento</option>';
  }

  if (App.dom.funcionarioEvento) {
    App.dom.funcionarioEvento.innerHTML = '<option value="">Selecione um evento</option>';
  }

  const eventosOrdenados = [...App.state.eventos].sort((a, b) =>
    String(a.data_realizacao).localeCompare(String(b.data_realizacao))
  );

  eventosOrdenados.forEach((evento) => {
    const texto = `${evento.nome} • ${App.formatDate(evento.data_realizacao)}`;

    if (App.dom.pessoaEvento) {
      const optionPessoa = document.createElement('option');
      optionPessoa.value = evento.id;
      optionPessoa.textContent = texto;
      App.dom.pessoaEvento.appendChild(optionPessoa);
    }

    if (App.dom.funcionarioEvento) {
      const optionFuncionario = document.createElement('option');
      optionFuncionario.value = evento.id;
      optionFuncionario.textContent = texto;
      App.dom.funcionarioEvento.appendChild(optionFuncionario);
    }
  });

  if (App.dom.pessoaEvento && pessoaEventoAtual) {
    App.dom.pessoaEvento.value = pessoaEventoAtual;
  }

  if (App.dom.funcionarioEvento && funcionarioEventoAtual) {
    App.dom.funcionarioEvento.value = funcionarioEventoAtual;
  }
};

App.renderEventList = function () {
  const query = App.dom.buscaEventos?.value.trim().toLowerCase() || '';

  const eventos = [...App.state.eventos]
    .sort((a, b) => String(a.data_realizacao).localeCompare(String(b.data_realizacao)))
    .filter((evento) => {
      const textoBusca = [
        evento.nome,
        evento.local,
        evento.observacoes,
        App.formatDate(evento.data_realizacao)
      ]
        .join(' ')
        .toLowerCase();

      return textoBusca.includes(query);
    });

  if (!eventos.length) {
    App.renderEmptyState(App.dom.listaEventos, 'Nenhum evento encontrado.');
    return;
  }

  App.dom.listaEventos.innerHTML = eventos
    .map((evento) => {
      const convidados = App.getPeopleByEvent(evento.id).length;
      const equipe = App.getEmployeesByEvent(evento.id).length;

      return `
        <div class="list-item">
          <div>
            <h4>${App.escapeHtml(evento.nome)}</h4>
            <p>
              <strong>Data:</strong> ${App.formatDate(evento.data_realizacao)}
              ${evento.local ? ` • <strong>Local:</strong> ${App.escapeHtml(evento.local)}` : ''}
            </p>
            ${
              evento.observacoes
                ? `<p style="margin-top:6px;">${App.escapeHtml(evento.observacoes)}</p>`
                : ''
            }
            <div class="chips">
              <span class="chip">${convidados} convidado(s)</span>
              <span class="chip">${equipe} funcionário(s)</span>
            </div>
          </div>

          <button
            class="btn-danger"
            type="button"
            data-action="delete-event"
            data-id="${evento.id}"
          >
            Excluir
          </button>
        </div>
      `;
    })
    .join('');
};

App.deleteEvent = async function (id) {
  if (!App.ensureSupabaseReady()) return;

  const evento = App.getEventById(id);
  if (!evento) return;

  const confirmou = confirm(
    `Excluir o evento "${evento.nome}"? Os convidados e funcionários vinculados a ele também serão removidos do histórico.`
  );

  if (!confirmou) return;

  try {
    const { error: presencasError } = await App.db
      .from('presencas')
      .delete()
      .eq('evento_id', id);

    if (presencasError) {
      console.error('Erro ao remover presenças:', presencasError);
      App.showToast('Erro ao remover convidados do evento.', 'error');
      return;
    }

    const { error: funcionariosEventosError } = await App.db
      .from('funcionarios_eventos')
      .delete()
      .eq('evento_id', id);

    if (funcionariosEventosError) {
      console.error('Erro ao remover vínculos da equipe:', funcionariosEventosError);
      App.showToast('Erro ao remover equipe do evento.', 'error');
      return;
    }

    const { error: eventoError } = await App.db
      .from('eventos')
      .delete()
      .eq('id', id);

    if (eventoError) {
      console.error('Erro ao excluir evento:', eventoError);
      App.showToast('Erro ao excluir evento.', 'error');
      return;
    }

    await App.refreshAfterChange('eventos');
    App.showToast('Evento excluído com sucesso.', 'success');
  } catch (error) {
    console.error('Erro inesperado ao excluir evento:', error);
    App.showToast('Não foi possível excluir o evento.', 'error');
  }
};

App.renderStats = function () {
  const hoje = App.getTodayISO();

  const totalEventos = App.state.eventos.length;
  const eventosHoje = App.state.eventos.filter(
    (evento) => evento.data_realizacao === hoje
  ).length;
  const proximosEventos = App.state.eventos.filter(
    (evento) => evento.data_realizacao > hoje
  ).length;
  const totalFuncionarios = App.state.funcionarios.length;

  if (App.dom.statEventos) App.dom.statEventos.textContent = String(totalEventos);
  if (App.dom.statEventosHoje) App.dom.statEventosHoje.textContent = String(eventosHoje);
  if (App.dom.statProximos) App.dom.statProximos.textContent = String(proximosEventos);
  if (App.dom.statFuncionarios) App.dom.statFuncionarios.textContent = String(totalFuncionarios);
};

App.renderAgenda = function () {
  const hoje = App.getTodayISO();

  const eventosHoje = [...App.state.eventos]
    .filter((evento) => evento.data_realizacao === hoje)
    .sort((a, b) => String(a.nome).localeCompare(String(b.nome)));

  const proximosEventos = [...App.state.eventos]
    .filter((evento) => evento.data_realizacao > hoje)
    .sort((a, b) => String(a.data_realizacao).localeCompare(String(b.data_realizacao)))
    .slice(0, 8);

  if (!eventosHoje.length) {
    App.renderEmptyState(App.dom.listaAgendaHoje, 'Nenhum evento cadastrado para hoje.');
  } else if (App.dom.listaAgendaHoje) {
    App.dom.listaAgendaHoje.innerHTML = eventosHoje
      .map((evento) => {
        const convidados = App.getPeopleByEvent(evento.id).length;
        const equipe = App.getEmployeesByEvent(evento.id).length;

        return `
          <div class="agenda-item">
            <div>
              <h4>${App.escapeHtml(evento.nome)}</h4>
              <p>
                ${
                  evento.local
                    ? `<strong>Local:</strong> ${App.escapeHtml(evento.local)} • `
                    : ''
                }
                <strong>Convidados:</strong> ${convidados} •
                <strong>Equipe:</strong> ${equipe}
              </p>
              ${
                evento.observacoes
                  ? `<p style="margin-top:8px;">${App.escapeHtml(evento.observacoes)}</p>`
                  : ''
              }
            </div>
            <span class="agenda-date">Hoje</span>
          </div>
        `;
      })
      .join('');
  }

  if (!proximosEventos.length) {
    App.renderEmptyState(App.dom.listaProximosEventos, 'Nenhum próximo evento cadastrado.');
  } else if (App.dom.listaProximosEventos) {
    App.dom.listaProximosEventos.innerHTML = proximosEventos
      .map((evento) => {
        const convidados = App.getPeopleByEvent(evento.id).length;
        const equipe = App.getEmployeesByEvent(evento.id).length;

        return `
          <div class="agenda-item">
            <div>
              <h4>${App.escapeHtml(evento.nome)}</h4>
              <p>
                ${
                  evento.local
                    ? `<strong>Local:</strong> ${App.escapeHtml(evento.local)} • `
                    : ''
                }
                <strong>Convidados:</strong> ${convidados} •
                <strong>Equipe:</strong> ${equipe}
              </p>
            </div>
            <span class="agenda-date">${App.formatDate(evento.data_realizacao)}</span>
          </div>
        `;
      })
      .join('');
  }
};