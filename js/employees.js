// ============================================================
// employees.js — Cadastro, listagem e exclusão de funcionários
// ============================================================

window.App = window.App || {};

// ------------------------------------------------------------
// Salva ou atualiza um funcionário e vincula ao evento
// ------------------------------------------------------------
App.handleSaveEmployee = async function (event) {
  event.preventDefault();
  if (!App.ensureSupabaseReady()) return;

  // — Coleta e valida os campos —
  const eventoId    = App.dom.funcionarioEvento?.value.trim() || '';
  const nome        = App.dom.funcionarioNome?.value.trim()   || '';
  const cargo       = App.dom.funcionarioCargo?.value.trim()  || '';
  const telefone    = App.dom.funcionarioTelefone?.value.trim() || '';
  const observacoes = App.dom.funcionarioObs?.value.trim()    || '';

  if (!eventoId) {
    App.showToast('Selecione o evento para vincular o funcionário.', 'warning');
    return;
  }

  if (!nome || !cargo) {
    App.showToast('Preencha nome e cargo do funcionário.', 'warning');
    return;
  }

  // — Verifica se o evento existe —
  const evento = App.getEventById(eventoId);
  if (!evento) {
    App.showToast('Evento selecionado não encontrado.', 'error');
    return;
  }

  const submitBtn = App.dom.formFuncionario?.querySelector('button[type="submit"]');
  App._setButtonLoading(submitBtn, true, 'Salvando…');

  try {
    // — Verifica se o funcionário já existe na base (por nome + cargo) —
    const nomeNorm  = App.normalizeText(nome);
    const cargoNorm = App.normalizeText(cargo);

    let funcionario = App.state.funcionarios.find(
      (f) =>
        App.normalizeText(f.nome)  === nomeNorm &&
        App.normalizeText(f.cargo) === cargoNorm
    ) || null;

    if (funcionario) {
      // Atualiza telefone e observações se o funcionário já existe
      const { error } = await App.db
        .from('funcionarios')
        .update({ telefone, observacoes })
        .eq('id', funcionario.id);

      if (error) throw new Error(`Erro ao atualizar funcionário: ${error.message}`);

    } else {
      // Cria o funcionário novo
      const novo = {
        id:         App.createId(),
        nome,
        cargo,
        telefone,
        observacoes,
        criado_em:  new Date().toISOString(),
      };

      const { error } = await App.db.from('funcionarios').insert([novo]);
      if (error) throw new Error(`Erro ao inserir funcionário: ${error.message}`);

      funcionario = novo;
    }

    // — Verifica se já está vinculado ao evento —
    const jaVinculado = App.state.funcionariosEventos.some(
      (v) => v.evento_id === eventoId && v.funcionario_id === funcionario.id
    );

    if (jaVinculado) {
      App.showToast(
        `${App.escapeHtml(nome)} já está vinculado a este evento.`,
        'warning'
      );
      return;
    }

    // — Cria o vínculo funcionário ↔ evento —
    const vinculo = {
      id:             App.createId(),
      evento_id:      eventoId,
      funcionario_id: funcionario.id,
      registrado_em:  new Date().toISOString(),
    };

    const { error: vinculoError } = await App.db
      .from('funcionarios_eventos')
      .insert([vinculo]);

    if (vinculoError) throw new Error(`Erro ao vincular funcionário: ${vinculoError.message}`);

    App.dom.formFuncionario?.reset();
    await App.refreshAfterChange('funcionarios');
    App.showToast(`${nome} cadastrado e vinculado ao evento com sucesso.`, 'success');

  } catch (err) {
    console.error('[Employees] Erro ao salvar funcionário:', err);
    App.showToast(err.message || 'Não foi possível salvar o funcionário.', 'error');

  } finally {
    App._setButtonLoading(submitBtn, false, 'Salvar funcionário no evento');
  }
};

// ------------------------------------------------------------
// Renderiza a lista de funcionários com filtro de busca
// ------------------------------------------------------------
App.renderEmployeeList = function () {
  const container = App.dom.listaFuncionarios;
  if (!container) return;

  const query = App.normalizeText(App.dom.buscaFuncionarios?.value.trim() || '');

  const lista = App.state.funcionarios.filter((f) => {
    if (!query) return true;
    const texto = App.normalizeText([
      f.nome,
      f.cargo,
      f.telefone    || '',
      f.observacoes || '',
    ].join(' '));
    return texto.includes(query);
  });

  if (!lista.length) {
    App.renderEmptyState(
      container,
      query ? 'Nenhum funcionário encontrado para essa busca.' : 'Nenhum funcionário cadastrado ainda.'
    );
    return;
  }

  // Mapa de contagem de participações por funcionário (O(n) único)
  const participacoes = App.state.funcionariosEventos.reduce((acc, v) => {
    acc[v.funcionario_id] = (acc[v.funcionario_id] || 0) + 1;
    return acc;
  }, {});

  container.innerHTML = lista
    .map((f) => App._renderEmployeeItem(f, participacoes[f.id] || 0))
    .join('');
};

// ------------------------------------------------------------
// Template de um item da lista de funcionários
// ------------------------------------------------------------
App._renderEmployeeItem = function (f, totalEventos) {
  const telefoneHtml = f.telefone
    ? `<a href="tel:${App.escapeHtml(f.telefone)}" class="link-discreto">
         ${App.escapeHtml(f.telefone)}
       </a>`
    : null;

  const infoSecundaria = [
    `<strong>Cargo:</strong> ${App.escapeHtml(f.cargo || '—')}`,
    telefoneHtml ? `<strong>Tel:</strong> ${telefoneHtml}` : null,
  ].filter(Boolean).join(' • ');

  return `
    <div class="list-item" data-id="${App.escapeHtml(f.id)}">
      <div class="list-item-body">
        <h4>${App.escapeHtml(f.nome)}</h4>

        <p class="list-item-meta">${infoSecundaria}</p>

        ${f.observacoes
          ? `<p class="list-item-obs">${App.escapeHtml(f.observacoes)}</p>`
          : ''}

        <div class="chips">
          <span class="chip">${totalEventos} evento${totalEventos !== 1 ? 's' : ''}</span>
        </div>
      </div>

      <div class="list-item-actions">
        <button
          class="btn-danger"
          type="button"
          data-action="delete-employee"
          data-id="${App.escapeHtml(f.id)}"
          aria-label="Excluir ${App.escapeHtml(f.nome)}"
        >
          Excluir
        </button>
      </div>
    </div>
  `;
};

// ------------------------------------------------------------
// Exclui um funcionário e todos os seus vínculos
// ------------------------------------------------------------
App.deleteEmployee = async function (id) {
  if (!App.ensureSupabaseReady()) return;

  const funcionario = App.getEmployeeById(id);
  if (!funcionario) {
    App.showToast('Funcionário não encontrado.', 'error');
    return;
  }

  const totalVinculos = App.state.funcionariosEventos.filter(
    (v) => v.funcionario_id === id
  ).length;

  const msg = totalVinculos > 0
    ? `Excluir "${funcionario.nome}"? Ele está vinculado a ${totalVinculos} evento(s). Tudo será removido.`
    : `Excluir "${funcionario.nome}" da base de funcionários?`;

  const confirmou = await App.confirm(msg, 'Excluir funcionário');
  if (!confirmou) return;

  try {
    // Remove vínculos primeiro (integridade referencial)
    if (totalVinculos > 0) {
      const { error: vinculosError } = await App.db
        .from('funcionarios_eventos')
        .delete()
        .eq('funcionario_id', id);

      if (vinculosError) throw new Error(`Erro ao remover vínculos: ${vinculosError.message}`);
    }

    // Remove o funcionário
    const { error } = await App.db
      .from('funcionarios')
      .delete()
      .eq('id', id);

    if (error) throw new Error(`Erro ao excluir funcionário: ${error.message}`);

    await App.refreshAfterChange('funcionarios');
    App.showToast(`${funcionario.nome} foi excluído com sucesso.`, 'success');

  } catch (err) {
    console.error('[Employees] Erro ao excluir funcionário:', err);
    App.showToast(err.message || 'Não foi possível excluir o funcionário.', 'error');
  }
};

// ------------------------------------------------------------
// Popula os selects de evento nos formulários
// ------------------------------------------------------------
App.populateEmployeeEventSelect = function () {
  const select = App.dom.funcionarioEvento;
  if (!select) return;

  const atual = select.value;

  select.innerHTML = '<option value="">Selecione um evento</option>';

  App.state.eventos.forEach((evento) => {
    const opt = document.createElement('option');
    opt.value       = evento.id;
    opt.textContent = `${App.escapeHtml(evento.nome)} — ${App.formatDate(evento.data_realizacao)}`;
    select.appendChild(opt);
  });

  // Mantém a seleção anterior se ainda existir
  if (atual) select.value = atual;
};