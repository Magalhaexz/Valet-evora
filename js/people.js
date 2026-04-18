// ============================================================
// people.js — Cadastro, edição, listagem e exclusão de convidados
// ============================================================

window.App = window.App || {};

// ------------------------------------------------------------
// Busca duplicatas por placa ou telefone (ignora o próprio ID)
// ------------------------------------------------------------
App.findDuplicatePeople = function ({ placa = '', telefone = '', ignoreId = '' }) {
  const placaNorm    = App.normalizePlate(placa);
  const telefoneNorm = String(telefone).trim();

  const duplicatePlate = App.state.pessoas.find(
    (p) => p.id !== ignoreId && App.normalizePlate(p.placa) === placaNorm
  ) ?? null;

  const duplicatePhone = App.state.pessoas.find(
    (p) => p.id !== ignoreId && String(p.telefone || '').trim() === telefoneNorm
  ) ?? null;

  return { duplicatePlate, duplicatePhone };
};

// ------------------------------------------------------------
// Salva ou reutiliza um convidado e vincula ao evento
// ------------------------------------------------------------
App.handleSavePerson = async function (event) {
  event.preventDefault();
  if (!App.ensureSupabaseReady()) return;

  // — Coleta e valida campos —
  const eventoId = App.dom.pessoaEvento?.value.trim() || '';
  const nome     = App.dom.pessoaNome?.value.trim()   || '';
  const placa    = App.normalizePlate(App.dom.pessoaPlaca?.value || '');
  const telefone = App.dom.pessoaTelefone?.value.trim() || '';
  const email    = App.dom.pessoaEmail?.value.trim()  || '';

  if (!eventoId) {
    App.showToast('Selecione o evento para vincular a pessoa.', 'warning');
    return;
  }

  if (!nome || !placa || !telefone) {
    App.showToast('Preencha nome, placa e telefone.', 'warning');
    return;
  }

  // — Verifica se o evento existe —
  if (!App.getEventById(eventoId)) {
    App.showToast('Evento selecionado não encontrado.', 'error');
    return;
  }

  // — Detecta duplicatas —
  const { duplicatePlate, duplicatePhone } = App.findDuplicatePeople({ placa, telefone });

  // Placa e telefone apontam para pessoas diferentes — conflito real
  if (duplicatePlate && duplicatePhone && duplicatePlate.id !== duplicatePhone.id) {
    App.showToast(
      'Conflito: a placa e o telefone pertencem a cadastros diferentes.',
      'error',
      4800
    );
    return;
  }

  const submitBtn = App.dom.formPessoa?.querySelector('button[type="submit"]');
  App._setButtonLoading(submitBtn, true, 'Salvando…');

  try {
    let pessoa = duplicatePlate ?? duplicatePhone ?? null;

    if (pessoa) {
      // — Reutiliza cadastro existente e atualiza os dados —
      const motivo = duplicatePlate ? 'placa' : 'telefone';
      App.showToast(
        `Esta ${motivo} já está cadastrada. O registro existente será reutilizado e atualizado.`,
        'warning',
        4200
      );

      const { error } = await App.db
        .from('pessoas')
        .update({ nome, placa, telefone, email })
        .eq('id', pessoa.id);

      if (error) throw new Error(`Erro ao atualizar convidado: ${error.message}`);

    } else {
      // — Cria novo cadastro —
      pessoa = {
        id:        App.createId(),
        nome,
        placa,
        telefone,
        email,
        criado_em: new Date().toISOString(),
      };

      const { error } = await App.db.from('pessoas').insert([pessoa]);
      if (error) throw new Error(`Erro ao salvar convidado: ${error.message}`);
    }

    // — Verifica se já está registrada neste evento —
    const jaRegistrada = App.state.presencas.some(
      (p) => p.evento_id === eventoId && p.pessoa_id === pessoa.id
    );

    if (jaRegistrada) {
      App.showToast(
        `${App.escapeHtml(nome)} já está registrada neste evento.`,
        'warning'
      );
      return;
    }

    // — Registra a presença —
    const presenca = {
      id:            App.createId(),
      evento_id:     eventoId,
      pessoa_id:     pessoa.id,
      registrado_em: new Date().toISOString(),
    };

    const { error: presencaError } = await App.db.from('presencas').insert([presenca]);
    if (presencaError) throw new Error(`Erro ao vincular ao evento: ${presencaError.message}`);

    App.dom.formPessoa?.reset();
    await App.refreshAfterChange('pessoas');
    App.showToast(`${nome} cadastrado(a) e vinculado(a) ao evento com sucesso.`, 'success');

  } catch (err) {
    console.error('[People] Erro ao salvar pessoa:', err);
    App.showToast(err.message || 'Não foi possível salvar o convidado.', 'error');

  } finally {
    App._setButtonLoading(submitBtn, false, 'Salvar pessoa no evento');
  }
};

// ------------------------------------------------------------
// Abre o modal de edição preenchido com os dados da pessoa
// ------------------------------------------------------------
App.openEditPersonModal = function (id) {
  const pessoa = App.getPersonById(id);

  if (!pessoa) {
    App.showToast('Convidado não encontrado.', 'error');
    return;
  }

  if (App.dom.editPessoaId)        App.dom.editPessoaId.value        = pessoa.id        || '';
  if (App.dom.editPessoaNome)      App.dom.editPessoaNome.value      = pessoa.nome       || '';
  if (App.dom.editPessoaPlaca)     App.dom.editPessoaPlaca.value     = pessoa.placa      || '';
  if (App.dom.editPessoaTelefone)  App.dom.editPessoaTelefone.value  = pessoa.telefone   || '';
  if (App.dom.editPessoaEmail)     App.dom.editPessoaEmail.value     = pessoa.email      || '';

  App.openModal(App.dom.editPessoaModal);
};

// ------------------------------------------------------------
// Salva as alterações de um convidado editado
// ------------------------------------------------------------
App.handleUpdatePerson = async function (event) {
  event.preventDefault();
  if (!App.ensureSupabaseReady()) return;

  const id       = App.dom.editPessoaId?.value.trim()        || '';
  const nome     = App.dom.editPessoaNome?.value.trim()      || '';
  const placa    = App.normalizePlate(App.dom.editPessoaPlaca?.value || '');
  const telefone = App.dom.editPessoaTelefone?.value.trim()  || '';
  const email    = App.dom.editPessoaEmail?.value.trim()     || '';

  if (!id || !nome || !placa || !telefone) {
    App.showToast('Preencha nome, placa e telefone.', 'warning');
    return;
  }

  // — Verifica conflitos com outros cadastros (ignora o próprio) —
  const { duplicatePlate, duplicatePhone } = App.findDuplicatePeople({
    placa,
    telefone,
    ignoreId: id,
  });

  if (duplicatePlate && duplicatePhone && duplicatePlate.id !== duplicatePhone.id) {
    App.showToast(
      'Conflito: a placa e o telefone pertencem a cadastros diferentes.',
      'error',
      4800
    );
    return;
  }

  if (duplicatePlate) {
    App.showToast('Esta placa já pertence a outro cadastro.', 'warning');
    return;
  }

  if (duplicatePhone) {
    App.showToast('Este telefone já pertence a outro cadastro.', 'warning');
    return;
  }

  const submitBtn = App.dom.editPessoaForm?.querySelector('button[type="submit"]');
  App._setButtonLoading(submitBtn, true, 'Salvando…');

  try {
    const { error } = await App.db
      .from('pessoas')
      .update({ nome, placa, telefone, email })
      .eq('id', id);

    if (error) throw new Error(`Erro ao atualizar convidado: ${error.message}`);

    App.closeModal(App.dom.editPessoaModal);
    await App.refreshAfterChange('pessoas');
    App.showToast('Cadastro atualizado com sucesso.', 'success');

  } catch (err) {
    console.error('[People] Erro ao editar pessoa:', err);
    App.showToast(err.message || 'Não foi possível editar o convidado.', 'error');

  } finally {
    App._setButtonLoading(submitBtn, false, 'Salvar alterações');
  }
};

// ------------------------------------------------------------
// Renderiza a lista de convidados com filtro de busca
// ------------------------------------------------------------
App.renderPeopleList = function () {
  const container = App.dom.listaPessoas;
  if (!container) return;

  const query = App.normalizeText(App.dom.buscaPessoas?.value.trim() || '');

  const lista = App.state.pessoas.filter((p) => {
    if (!query) return true;
    const texto = App.normalizeText([
      p.nome,
      p.placa,
      p.telefone,
      p.email || '',
    ].join(' '));
    return texto.includes(query);
  });

  if (!lista.length) {
    App.renderEmptyState(
      container,
      query ? 'Nenhum convidado encontrado para essa busca.' : 'Nenhum convidado cadastrado ainda.'
    );
    return;
  }

  // Mapa de contagem de participações por pessoa O(n) único
  const participacoes = App.state.presencas.reduce((acc, p) => {
    acc[p.pessoa_id] = (acc[p.pessoa_id] || 0) + 1;
    return acc;
  }, {});

  container.innerHTML = lista
    .map((pessoa) => App._renderPersonItem(pessoa, participacoes[pessoa.id] || 0))
    .join('');
};

// ------------------------------------------------------------
// Template de um item de convidado na lista
// ------------------------------------------------------------
App._renderPersonItem = function (pessoa, totalEventos) {
  const telefoneHtml = pessoa.telefone
    ? `<a href="tel:${App.escapeHtml(pessoa.telefone)}" class="link-discreto">${App.escapeHtml(pessoa.telefone)}</a>`
    : '—';

  const emailHtml = pessoa.email
    ? `<a href="mailto:${App.escapeHtml(pessoa.email)}" class="link-discreto">${App.escapeHtml(pessoa.email)}</a>`
    : '<span class="text-muted">Sem e-mail cadastrado</span>';

  return `
    <div class="list-item" data-id="${App.escapeHtml(pessoa.id)}">
      <div class="list-item-body">
        <h4>${App.escapeHtml(pessoa.nome)}</h4>

        <p class="list-item-meta">
          <strong>Placa:</strong> ${App.escapeHtml(pessoa.placa || '—')} •
          <strong>Tel:</strong> ${telefoneHtml}
        </p>

        <p class="list-item-meta">${emailHtml}</p>

        <div class="chips">
          <span class="chip">${totalEventos} evento${totalEventos !== 1 ? 's' : ''}</span>
        </div>

        <div class="item-actions">
          <button
            class="btn-secondary"
            type="button"
            data-action="edit-person"
            data-id="${App.escapeHtml(pessoa.id)}"
            aria-label="Editar ${App.escapeHtml(pessoa.nome)}"
          >
            Editar
          </button>

          <button
            class="btn-danger"
            type="button"
            data-action="delete-person"
            data-id="${App.escapeHtml(pessoa.id)}"
            aria-label="Excluir ${App.escapeHtml(pessoa.nome)}"
          >
            Excluir
          </button>
        </div>
      </div>
    </div>
  `;
};

// ------------------------------------------------------------
// Exclui um convidado e todas as suas presenças
// ------------------------------------------------------------
App.deletePerson = async function (id) {
  if (!App.ensureSupabaseReady()) return;

  const pessoa = App.getPersonById(id);
  if (!pessoa) {
    App.showToast('Convidado não encontrado.', 'error');
    return;
  }

  const totalPresencas = App.state.presencas.filter(
    (p) => p.pessoa_id === id
  ).length;

  const msg = totalPresencas > 0
    ? `Excluir "${pessoa.nome}"? Ela está registrada em ${totalPresencas} evento${totalPresencas !== 1 ? 's' : ''}. Tudo será removido.`
    : `Excluir "${pessoa.nome}" da base de convidados?`;

  const confirmou = await App.confirm(msg, 'Excluir convidado');
  if (!confirmou) return;

  try {
    if (totalPresencas > 0) {
      const { error: presencasError } = await App.db
        .from('presencas')
        .delete()
        .eq('pessoa_id', id);

      if (presencasError) throw new Error(`Erro ao remover presenças: ${presencasError.message}`);
    }

    const { error } = await App.db
      .from('pessoas')
      .delete()
      .eq('id', id);

    if (error) throw new Error(`Erro ao excluir convidado: ${error.message}`);

    await App.refreshAfterChange('pessoas');
    App.showToast(`${pessoa.nome} foi excluído(a) com sucesso.`, 'success');

  } catch (err) {
    console.error('[People] Erro ao excluir pessoa:', err);
    App.showToast(err.message || 'Não foi possível excluir o convidado.', 'error');
  }
};