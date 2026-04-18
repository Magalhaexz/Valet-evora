window.App = window.App || {};

App.handleSaveEmployee = async function (event) {
  event.preventDefault();

  if (!App.ensureSupabaseReady()) return;

  const eventoId = App.dom.funcionarioEvento?.value || '';

  if (!eventoId) {
    App.showToast('Selecione o evento para vincular o funcionário.', 'warning');
    return;
  }

  const nome = App.dom.funcionarioNome?.value.trim() || '';
  const cargo = App.dom.funcionarioCargo?.value.trim() || '';
  const telefone = App.dom.funcionarioTelefone?.value.trim() || '';
  const observacoes = App.dom.funcionarioObs?.value.trim() || '';

  if (!nome || !cargo) {
    App.showToast('Preencha nome e cargo do funcionário.', 'warning');
    return;
  }

  let funcionario = App.state.funcionarios.find(
    (item) =>
      App.normalizeText(item.nome) === App.normalizeText(nome) &&
      App.normalizeText(item.cargo) === App.normalizeText(cargo)
  );

  try {
    if (funcionario) {
      const { error: updateError } = await App.db
        .from('funcionarios')
        .update({ telefone, observacoes })
        .eq('id', funcionario.id);

      if (updateError) {
        console.error('Erro ao atualizar funcionário:', updateError);
        App.showToast('Erro ao atualizar funcionário.', 'error');
        return;
      }
    } else {
      funcionario = {
        id: App.createId(),
        nome,
        cargo,
        telefone,
        observacoes,
        criado_em: new Date().toISOString()
      };

      const { error: insertError } = await App.db.from('funcionarios').insert([funcionario]);

      if (insertError) {
        console.error('Erro ao salvar funcionário:', insertError);
        App.showToast('Erro ao salvar funcionário.', 'error');
        return;
      }
    }

    const funcionarioId = funcionario.id;

    const jaVinculado = App.state.funcionariosEventos.some(
      (vinculo) =>
        vinculo.evento_id === eventoId &&
        vinculo.funcionario_id === funcionarioId
    );

    if (jaVinculado) {
      App.showToast('Esse funcionário já está vinculado a esse evento.', 'warning');
      return;
    }

    const novoVinculo = {
      id: App.createId(),
      evento_id: eventoId,
      funcionario_id: funcionarioId,
      registrado_em: new Date().toISOString()
    };

    const { error: vinculoError } = await App.db
      .from('funcionarios_eventos')
      .insert([novoVinculo]);

    if (vinculoError) {
      console.error('Erro ao vincular funcionário ao evento:', vinculoError);
      App.showToast('Erro ao vincular funcionário ao evento.', 'error');
      return;
    }

    App.dom.formFuncionario?.reset();

    await App.refreshAfterChange('funcionarios');
    App.showToast('Funcionário cadastrado e vinculado ao evento com sucesso.', 'success');
  } catch (error) {
    console.error('Erro inesperado ao salvar funcionário:', error);
    App.showToast('Não foi possível salvar o funcionário.', 'error');
  }
};

App.renderEmployeeList = function () {
  const query = App.dom.buscaFuncionarios?.value.trim().toLowerCase() || '';

  const funcionariosFiltrados = [...App.state.funcionarios].filter((funcionario) => {
    const textoBusca = [
      funcionario.nome,
      funcionario.cargo,
      funcionario.telefone || '',
      funcionario.observacoes || ''
    ].join(' ').toLowerCase();

    return textoBusca.includes(query);
  });

  if (!funcionariosFiltrados.length) {
    App.renderEmptyState(App.dom.listaFuncionarios, 'Nenhum funcionário encontrado.');
    return;
  }

  App.dom.listaFuncionarios.innerHTML = funcionariosFiltrados.map((funcionario) => {
    const totalParticipacoes = App.state.funcionariosEventos.filter(
      (vinculo) => vinculo.funcionario_id === funcionario.id
    ).length;

    return `
      <div class="list-item">
        <div>
          <h4>${App.escapeHtml(funcionario.nome)}</h4>
          <p>
            <strong>Cargo:</strong> ${App.escapeHtml(funcionario.cargo || '—')}
            ${
              funcionario.telefone
                ? ` • <strong>Telefone:</strong> ${App.escapeHtml(funcionario.telefone)}`
                : ''
            }
          </p>
          <p>
            ${
              funcionario.observacoes
                ? App.escapeHtml(funcionario.observacoes)
                : 'Sem observações cadastradas.'
            }
          </p>
          <div class="chips">
            <span class="chip">${totalParticipacoes} evento(s)</span>
          </div>
        </div>

        <button
          class="btn-danger"
          type="button"
          data-action="delete-employee"
          data-id="${funcionario.id}"
        >
          Excluir
        </button>
      </div>
    `;
  }).join('');
};

App.deleteEmployee = async function (id) {
  if (!App.ensureSupabaseReady()) return;

  const funcionario = App.getEmployeeById(id);
  if (!funcionario) return;

  const confirmou = await App.askConfirm({
    title: 'Excluir funcionário',
    message: `Excluir "${funcionario.nome}" da base? As participações dele também serão removidas.`,
    confirmText: 'Excluir funcionário',
    cancelText: 'Cancelar',
    tone: 'danger'
  });

  if (!confirmou) return;

  try {
    const { error: vinculosError } = await App.db
      .from('funcionarios_eventos')
      .delete()
      .eq('funcionario_id', id);

    if (vinculosError) {
      console.error('Erro ao remover vínculos do funcionário:', vinculosError);
      App.showToast('Erro ao remover participações do funcionário.', 'error');
      return;
    }

    const { error: funcionarioError } = await App.db
      .from('funcionarios')
      .delete()
      .eq('id', id);

    if (funcionarioError) {
      console.error('Erro ao excluir funcionário:', funcionarioError);
      App.showToast('Erro ao excluir funcionário.', 'error');
      return;
    }

    await App.refreshAfterChange('funcionarios');
    App.showToast('Funcionário excluído com sucesso.', 'success');
  } catch (error) {
    console.error('Erro inesperado ao excluir funcionário:', error);
    App.showToast('Não foi possível excluir o funcionário.', 'error');
  }
};