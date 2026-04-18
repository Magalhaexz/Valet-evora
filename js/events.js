// ============================================================
// events.js — Cadastro, listagem, agenda, stats e exclusão de eventos
// ============================================================

window.App = window.App || {};

// ------------------------------------------------------------
// Salva um novo evento no Supabase
// ------------------------------------------------------------
App.handleSaveEvent = async function (event) {
  event.preventDefault();
  if (!App.ensureSupabaseReady()) return;

  const nome           = App.dom.eventoNome?.value.trim() || '';
  const dataRealizacao = App.dom.eventoData?.value        || '';
  const local          = App.dom.eventoLocal?.value.trim() || '';
  const observacoes    = App.dom.eventoObs?.value.trim()  || '';

  if (!nome || !dataRealizacao) {
    App.showToast('Preencha o nome e a data do evento.', 'warning');
    return;
  }

  // Impede datas claramente inválidas
  if (isNaN(new Date(dataRealizacao).getTime())) {
    App.showToast('Data inválida. Verifique o campo de data.', 'warning');
    return;
  }

  const submitBtn = App.dom.formEvento?.querySelector('button[type="submit"]');
  App._setButtonLoading(submitBtn, true, 'Salvando…');

  try {
    const novoEvento = {
      id:              App.createId(),
      nome,
      data_realizacao: dataRealizacao,
      local,
      observacoes,
      criado_em:       new Date().toISOString(),
    };

    const { error } = await App.db.from('eventos').insert([novoEvento]);
    if (error) throw new Error(`Erro ao salvar evento: ${error.message}`);

    App.dom.formEvento?.reset();
    await App.refreshAfterChange('eventos');
    App.showToast(`Evento "${nome}" cadastrado com sucesso.`, 'success');

  } catch (err) {
    console.error('[Events] Erro ao salvar evento:', err);
    App.showToast(err.message || 'Não foi possível salvar o evento.', 'error');

  } finally {
    App._setButtonLoading(submitBtn, false, 'Salvar evento');
  }
};

// ------------------------------------------------------------
// Popula os <select> de eventos nos formulários de pessoa e funcionário
// Mantém a seleção atual se o evento ainda existir
// ------------------------------------------------------------
App.renderEventOptions = function () {
  const selects = [
    App.dom.pessoaEvento,
    App.dom.funcionarioEvento,
    App.dom.exportEventoSelect,
  ].filter(Boolean);

  // Guarda as seleções atuais
  const anteriores = selects.map((s) => s.value);

  const eventosOrdenados = [...App.state.eventos].sort((a, b) =>
    String(a.data_realizacao).localeCompare(String(b.data_realizacao))
  );

  selects.forEach((select, i) => {
    select.innerHTML = '<option value="">Selecione um evento</option>';

    eventosOrdenados.forEach((evento) => {
      const opt = document.createElement('option');
      opt.value       = evento.id;
      opt.textContent = `${evento.nome} • ${App.formatDate(evento.data_realizacao)}`;
      select.appendChild(opt);
    });

    // Restaura seleção anterior se o evento ainda existir
    if (anteriores[i]) select.value = anteriores[i];
  });
};

// ------------------------------------------------------------
// Lista de eventos (view Eventos)
// ------------------------------------------------------------
App.renderEventList = function () {
  const container = App.dom.listaEventos;
  if (!container) return;

  const query = App.normalizeText(App.dom.buscaEventos?.value.trim() || '');

  const lista = [...App.state.eventos]
    .sort((a, b) => String(a.data_realizacao).localeCompare(String(b.data_realizacao)))
    .filter((evento) => {
      if (!query) return true;
      const texto = App.normalizeText([
        evento.nome,
        evento.local        || '',
        evento.observacoes  || '',
        App.formatDate(evento.data_realizacao),
      ].join(' '));
      return texto.includes(query);
    });

  if (!lista.length) {
    App.renderEmptyState(
      container,
      query ? 'Nenhum evento encontrado para essa busca.' : 'Nenhum evento cadastrado ainda.'
    );
    return;
  }

  container.innerHTML = lista
    .map((evento) => App._renderEventItem(evento))
    .join('');
};

// ------------------------------------------------------------
// Template de item de evento (lista completa)
// ------------------------------------------------------------
App._renderEventItem = function (evento) {
  const convidados = App.getPeopleByEvent(evento.id).length;
  const equipe     = App.getEmployeesByEvent(evento.id).length;

  return `
    <div class="list-item" data-id="${App.escapeHtml(evento.id)}">
      <div class="list-item-body">
        <h4>${App.escapeHtml(evento.nome)}</h4>

        <p class="list-item-meta">
          <strong>Data:</strong> ${App.formatDate(evento.data_realizacao)}
          ${evento.local
            ? ` • <strong>Local:</strong> ${App.escapeHtml(evento.local)}`
            : ''}
        </p>

        ${evento.observacoes
          ? `<p class="list-item-obs">${App.escapeHtml(evento.observacoes)}</p>`
          : ''}

        <div class="chips">
          <span class="chip">${convidados} convidado${convidados !== 1 ? 's' : ''}</span>
          <span class="chip">${equipe} funcionário${equipe !== 1 ? 's' : ''}</span>
        </div>
      </div>

      <div class="list-item-actions">
        <button
          class="btn-danger"
          type="button"
          data-action="delete-event"
          data-id="${App.escapeHtml(evento.id)}"
          aria-label="Excluir evento ${App.escapeHtml(evento.nome)}"
        >
          Excluir
        </button>
      </div>
    </div>
  `;
};

// ------------------------------------------------------------
// Exclui um evento e todos os seus dados vinculados
// ------------------------------------------------------------
App.deleteEvent = async function (id) {
  if (!App.ensureSupabaseReady()) return;

  const evento = App.getEventById(id);
  if (!evento) {
    App.showToast('Evento não encontrado.', 'error');
    return;
  }

  const convidados = App.getPeopleByEvent(id).length;
  const equipe     = App.getEmployeesByEvent(id).length;

  const detalhes = [
    convidados > 0 ? `${convidados} convidado${convidados !== 1 ? 's' : ''}` : null,
    equipe > 0     ? `${equipe} funcionário${equipe !== 1 ? 's' : ''}` : null,
  ].filter(Boolean).join(' e ');

  const msg = detalhes
    ? `Excluir "${evento.nome}"? ${detalhes} vinculados também serão removidos do histórico.`
    : `Excluir o evento "${evento.nome}"? Esta ação não pode ser desfeita.`;

  const confirmou = await App.confirm(msg, 'Excluir evento');
  if (!confirmou) return;

  try {
    // Remove presenças e vínculos de funcionários em paralelo
    const [presencasRes, funcionariosEventosRes] = await Promise.all([
      App.db.from('presencas').delete().eq('evento_id', id),
      App.db.from('funcionarios_eventos').delete().eq('evento_id', id),
    ]);

    if (presencasRes.error) {
      throw new Error(`Erro ao remover presenças: ${presencasRes.error.message}`);
    }
    if (funcionariosEventosRes.error) {
      throw new Error(`Erro ao remover vínculos de equipe: ${funcionariosEventosRes.error.message}`);
    }

    // Remove o evento após limpar os vínculos
    const { error } = await App.db.from('eventos').delete().eq('id', id);
    if (error) throw new Error(`Erro ao excluir evento: ${error.message}`);

    await App.refreshAfterChange('eventos');
    App.showToast(`Evento "${evento.nome}" excluído com sucesso.`, 'success');

  } catch (err) {
    console.error('[Events] Erro ao excluir evento:', err);
    App.showToast(err.message || 'Não foi possível excluir o evento.', 'error');
  }
};

// ------------------------------------------------------------
// Stats do dashboard
// ------------------------------------------------------------
App.renderStats = function () {
  const hoje = App.getTodayISO();

  const total        = App.state.eventos.length;
  const hojeCount    = App.state.eventos.filter((e) => e.data_realizacao === hoje).length;
  const proximos     = App.state.eventos.filter((e) => e.data_realizacao > hoje).length;
  const funcionarios = App.state.funcionarios.length;

  const set = (el, val) => { if (el) el.textContent = String(val); };

  set(App.dom.statEventos,      total);
  set(App.dom.statEventosHoje,  hojeCount);
  set(App.dom.statProximos,     proximos);
  set(App.dom.statFuncionarios, funcionarios);
};

// ------------------------------------------------------------
// Agenda do dashboard (hoje + próximos)
// ------------------------------------------------------------
App.renderAgenda = function () {
  const hoje = App.getTodayISO();

  const eventosHoje = [...App.state.eventos]
    .filter((e) => e.data_realizacao === hoje)
    .sort((a, b) => a.nome.localeCompare(b.nome));

  const proximosEventos = [...App.state.eventos]
    .filter((e) => e.data_realizacao > hoje)
    .sort((a, b) => a.data_realizacao.localeCompare(b.data_realizacao))
    .slice(0, 8);

  App._renderAgendaSection(
    App.dom.listaAgendaHoje,
    eventosHoje,
    'Nenhum evento cadastrado para hoje.',
    () => 'Hoje'
  );

  App._renderAgendaSection(
    App.dom.listaProximosEventos,
    proximosEventos,
    'Nenhum próximo evento cadastrado.',
    (evento) => App.formatDate(evento.data_realizacao)
  );
};

// ------------------------------------------------------------
// Template de item de agenda (dashboard)
// ------------------------------------------------------------
App._renderAgendaSection = function (container, lista, emptyMsg, getLabel) {
  if (!container) return;

  if (!lista.length) {
    App.renderEmptyState(container, emptyMsg);
    return;
  }

  container.innerHTML = lista.map((evento) => {
    const convidados = App.getPeopleByEvent(evento.id).length;
    const equipe     = App.getEmployeesByEvent(evento.id).length;

    return `
      <div class="agenda-item">
        <div class="agenda-item-body">
          <h4>${App.escapeHtml(evento.nome)}</h4>

          <p class="list-item-meta">
            ${evento.local
              ? `<strong>Local:</strong> ${App.escapeHtml(evento.local)} • `
              : ''}
            <strong>Convidados:</strong> ${convidados} •
            <strong>Equipe:</strong> ${equipe}
          </p>

          ${evento.observacoes
            ? `<p class="list-item-obs">${App.escapeHtml(evento.observacoes)}</p>`
            : ''}
        </div>

        <span class="agenda-date">${App.escapeHtml(getLabel(evento))}</span>
      </div>
    `;
  }).join('');
};