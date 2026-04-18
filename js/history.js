// ============================================================
// history.js — Histórico de eventos com convidados e equipe
// ============================================================

window.App = window.App || {};

// ------------------------------------------------------------
// Renderiza o histórico completo com filtro de busca
// ------------------------------------------------------------
App.renderHistory = function () {
  const container = App.dom.listaHistorico;
  if (!container) return;

  const query = App.normalizeText(App.dom.buscaHistorico?.value.trim() || '');

  // Monta os dados uma única vez por evento (evita dupla chamada no filter + map)
  const eventosComDados = [...App.state.eventos]
    .sort((a, b) => String(b.data_realizacao).localeCompare(String(a.data_realizacao)))
    .map((evento) => ({
      evento,
      convidados: App.getPeopleByEvent(evento.id),
      equipe:     App.getEmployeesByEvent(evento.id),
    }));

  const lista = query
    ? eventosComDados.filter(({ evento, convidados, equipe }) =>
        App._matchesHistoryQuery(evento, convidados, equipe, query)
      )
    : eventosComDados;

  if (!lista.length) {
    App.renderEmptyState(
      container,
      query
        ? 'Nenhum evento encontrado para essa busca.'
        : 'Nenhum evento no histórico ainda.'
    );
    return;
  }

  container.innerHTML = lista
    .map(({ evento, convidados, equipe }) =>
      App._renderHistoryCard(evento, convidados, equipe)
    )
    .join('');
};

// ------------------------------------------------------------
// Verifica se um evento bate com a query de busca
// ------------------------------------------------------------
App._matchesHistoryQuery = function (evento, convidados, equipe, query) {
  const partes = [
    evento.nome,
    evento.local        || '',
    evento.observacoes  || '',
    App.formatDate(evento.data_realizacao),
    ...convidados.map((p) =>
      [p?.nome, p?.placa, p?.telefone, p?.email].filter(Boolean).join(' ')
    ),
    ...equipe.map((f) =>
      [f?.nome, f?.cargo, f?.telefone, f?.observacoes].filter(Boolean).join(' ')
    ),
  ];

  return App.normalizeText(partes.join(' ')).includes(query);
};

// ------------------------------------------------------------
// Card completo de um evento no histórico
// ------------------------------------------------------------
App._renderHistoryCard = function (evento, convidados, equipe) {
  return `
    <div class="history-card">
      ${App._renderHistoryCardHeader(evento, convidados, equipe)}
      ${App._renderAttendeeSection('Convidados do evento', convidados, 'convidado', App._renderGuestItem)}
      ${App._renderAttendeeSection('Funcionários do evento', equipe, 'equipe', App._renderEmployeeItem)}
    </div>
  `;
};

// ------------------------------------------------------------
// Cabeçalho do card (nome, data, local, contagens)
// ------------------------------------------------------------
App._renderHistoryCardHeader = function (evento, convidados, equipe) {
  const localHtml = evento.local
    ? `<strong>Local:</strong> ${App.escapeHtml(evento.local)} • `
    : '';

  const obsHtml = evento.observacoes
    ? `<p class="history-obs">${App.escapeHtml(evento.observacoes)}</p>`
    : '';

  return `
    <div class="history-top">
      <div class="history-top-info">
        <h4>${App.escapeHtml(evento.nome)}</h4>

        <p class="history-meta">
          ${localHtml}
          <strong>Convidados:</strong> ${convidados.length} •
          <strong>Equipe:</strong> ${equipe.length}
        </p>

        ${obsHtml}
      </div>

      <span class="event-date">${App.formatDate(evento.data_realizacao)}</span>
    </div>
  `;
};

// ------------------------------------------------------------
// Seção de participantes (convidados ou equipe)
// ------------------------------------------------------------
App._renderAttendeeSection = function (titulo, lista, chipLabel, renderItem) {
  const conteudo = lista.length
    ? `<div class="attendees">${lista.map(renderItem).join('')}</div>`
    : `<div class="empty">Nenhum ${chipLabel === 'convidado'
        ? 'convidado cadastrado'
        : 'funcionário vinculado'} neste evento.</div>`;

  return `
    <div class="history-section">
      <div class="subsection-title">${App.escapeHtml(titulo)}</div>
      ${conteudo}
    </div>
  `;
};

// ------------------------------------------------------------
// Item de convidado
// ------------------------------------------------------------
App._renderGuestItem = function (pessoa) {
  const emailHtml = pessoa.email
    ? `<span>E-mail: <a href="mailto:${App.escapeHtml(pessoa.email)}" class="link-discreto">${App.escapeHtml(pessoa.email)}</a></span>`
    : `<span class="text-muted">Sem e-mail cadastrado</span>`;

  const telefoneHtml = pessoa.telefone
    ? `<a href="tel:${App.escapeHtml(pessoa.telefone)}" class="link-discreto">${App.escapeHtml(pessoa.telefone)}</a>`
    : '—';

  return `
    <div class="attendee">
      <div class="attendee-info">
        <strong>${App.escapeHtml(pessoa.nome || 'Sem nome')}</strong>
        <span>Placa: ${App.escapeHtml(pessoa.placa || '—')}</span>
        <span>Tel: ${telefoneHtml}</span>
        ${emailHtml}
      </div>
      <span class="chip chip--guest">Convidado</span>
    </div>
  `;
};

// ------------------------------------------------------------
// Item de funcionário
// ------------------------------------------------------------
App._renderEmployeeItem = function (funcionario) {
  const telefoneHtml = funcionario.telefone
    ? `<a href="tel:${App.escapeHtml(funcionario.telefone)}" class="link-discreto">${App.escapeHtml(funcionario.telefone)}</a>`
    : '<span class="text-muted">Não informado</span>';

  const obsHtml = funcionario.observacoes
    ? `<span>${App.escapeHtml(funcionario.observacoes)}</span>`
    : `<span class="text-muted">Sem observações</span>`;

  return `
    <div class="attendee">
      <div class="attendee-info">
        <strong>${App.escapeHtml(funcionario.nome || 'Sem nome')}</strong>
        <span>Cargo: ${App.escapeHtml(funcionario.cargo || '—')}</span>
        <span>Tel: ${telefoneHtml}</span>
        ${obsHtml}
      </div>
      <span class="chip chip--team">Equipe</span>
    </div>
  `;
};