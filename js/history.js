window.App = window.App || {};

App.renderHistory = function () {
  const query = App.dom.buscaHistorico?.value.trim().toLowerCase() || '';

  const eventosFiltrados = [...App.state.eventos]
    .sort((a, b) => String(b.data_realizacao).localeCompare(String(a.data_realizacao)))
    .filter((evento) => {
      const convidados = App.getPeopleByEvent(evento.id);
      const equipe = App.getEmployeesByEvent(evento.id);

      const textoBusca = [
        evento.nome,
        evento.local,
        evento.observacoes,
        App.formatDate(evento.data_realizacao),
        ...convidados.map((pessoa) =>
          [pessoa?.nome, pessoa?.placa, pessoa?.telefone, pessoa?.email]
            .filter(Boolean)
            .join(' ')
        ),
        ...equipe.map((funcionario) =>
          [funcionario?.nome, funcionario?.cargo, funcionario?.telefone, funcionario?.observacoes]
            .filter(Boolean)
            .join(' ')
        )
      ]
        .join(' ')
        .toLowerCase();

      return textoBusca.includes(query);
    });

  if (!eventosFiltrados.length) {
    App.renderEmptyState(App.dom.listaHistorico, 'Nenhum evento encontrado no histórico.');
    return;
  }

  App.dom.listaHistorico.innerHTML = eventosFiltrados
    .map((evento) => {
      const convidados = App.getPeopleByEvent(evento.id);
      const equipe = App.getEmployeesByEvent(evento.id);

      return `
        <div class="history-card">
          <div class="history-top">
            <div>
              <h4>${App.escapeHtml(evento.nome)}</h4>
              <p style="margin:0; color: var(--text-soft); line-height:1.6;">
                ${
                  evento.local
                    ? `<strong>Local:</strong> ${App.escapeHtml(evento.local)} • `
                    : ''
                }
                <strong>Convidados:</strong> ${convidados.length} •
                <strong>Equipe:</strong> ${equipe.length}
              </p>
              ${
                evento.observacoes
                  ? `<p style="margin:8px 0 0; color: var(--text-soft);">${App.escapeHtml(evento.observacoes)}</p>`
                  : ''
              }
            </div>

            <span class="event-date">${App.formatDate(evento.data_realizacao)}</span>
          </div>

          <div>
            <div class="subsection-title">Convidados do evento</div>
            ${
              convidados.length
                ? `
                  <div class="attendees">
                    ${convidados
                      .map(
                        (pessoa) => `
                          <div class="attendee">
                            <div>
                              <strong>${App.escapeHtml(pessoa.nome || 'Sem nome')}</strong>
                              <span>Placa: ${App.escapeHtml(pessoa.placa || '—')}</span>
                              <span>Telefone: ${App.escapeHtml(pessoa.telefone || '—')}</span>
                              <span>${
                                pessoa.email
                                  ? `E-mail: ${App.escapeHtml(pessoa.email)}`
                                  : 'Sem e-mail cadastrado'
                              }</span>
                            </div>
                            <span class="chip">Convidado</span>
                          </div>
                        `
                      )
                      .join('')}
                  </div>
                `
                : `<div class="empty">Ainda não há convidados cadastrados neste evento.</div>`
            }
          </div>

          <div>
            <div class="subsection-title">Funcionários do evento</div>
            ${
              equipe.length
                ? `
                  <div class="attendees">
                    ${equipe
                      .map(
                        (funcionario) => `
                          <div class="attendee">
                            <div>
                              <strong>${App.escapeHtml(funcionario.nome || 'Sem nome')}</strong>
                              <span>Cargo: ${App.escapeHtml(funcionario.cargo || '—')}</span>
                              <span>${
                                funcionario.telefone
                                  ? `Telefone: ${App.escapeHtml(funcionario.telefone)}`
                                  : 'Telefone não informado'
                              }</span>
                              <span>${
                                funcionario.observacoes
                                  ? App.escapeHtml(funcionario.observacoes)
                                  : 'Sem observações cadastradas'
                              }</span>
                            </div>
                            <span class="chip">Equipe</span>
                          </div>
                        `
                      )
                      .join('')}
                  </div>
                `
                : `<div class="empty">Ainda não há funcionários vinculados neste evento.</div>`
            }
          </div>
        </div>
      `;
    })
    .join('');
};