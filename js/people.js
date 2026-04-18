window.App = window.App || {};

App.handleSavePerson = async function (event) {
  event.preventDefault();

  if (!App.ensureSupabaseReady()) return;

  const eventoId = App.dom.pessoaEvento?.value || '';

  if (!eventoId) {
    App.showToast('Selecione o evento para vincular a pessoa.', 'warning');
    return;
  }

  const nome = App.dom.pessoaNome?.value.trim() || '';
  const placa = App.normalizePlate(App.dom.pessoaPlaca?.value || '');
  const telefone = App.dom.pessoaTelefone?.value.trim() || '';
  const email = App.dom.pessoaEmail?.value.trim() || '';

  if (!nome || !placa || !telefone) {
    App.showToast('Preencha nome, placa e telefone.', 'warning');
    return;
  }

  let pessoa = App.state.pessoas.find(
    (item) =>
      App.normalizePlate(item.placa) === placa ||
      String(item.telefone || '').trim() === telefone
  );

  try {
    if (pessoa) {
      const { error: updateError } = await App.db
        .from('pessoas')
        .update({
          nome,
          placa,
          telefone,
          email
        })
        .eq('id', pessoa.id);

      if (updateError) {
        console.error('Erro ao atualizar pessoa:', updateError);
        App.showToast('Erro ao atualizar convidado.', 'error');
        return;
      }
    } else {
      pessoa = {
        id: App.createId(),
        nome,
        placa,
        telefone,
        email,
        criado_em: new Date().toISOString()
      };

      const { error: insertError } = await App.db.from('pessoas').insert([pessoa]);

      if (insertError) {
        console.error('Erro ao salvar pessoa:', insertError);
        App.showToast('Erro ao salvar convidado.', 'error');
        return;
      }
    }

    const pessoaId = pessoa.id;

    const jaRegistrada = App.state.presencas.some(
      (presenca) =>
        presenca.evento_id === eventoId &&
        presenca.pessoa_id === pessoaId
    );

    if (jaRegistrada) {
      App.showToast('Essa pessoa já está registrada nesse evento.', 'warning');
      return;
    }

    const novaPresenca = {
      id: App.createId(),
      evento_id: eventoId,
      pessoa_id: pessoaId,
      registrado_em: new Date().toISOString()
    };

    const { error: presencaError } = await App.db
      .from('presencas')
      .insert([novaPresenca]);

    if (presencaError) {
      console.error('Erro ao vincular pessoa ao evento:', presencaError);
      App.showToast('Erro ao vincular convidado ao evento.', 'error');
      return;
    }

    App.dom.formPessoa?.reset();

    await App.refreshAfterChange('pessoas');
    App.showToast('Pessoa cadastrada e vinculada ao evento com sucesso.', 'success');
  } catch (error) {
    console.error('Erro inesperado ao salvar pessoa:', error);
    App.showToast('Não foi possível salvar a pessoa.', 'error');
  }
};

App.renderPeopleList = function () {
  const query = App.dom.buscaPessoas?.value.trim().toLowerCase() || '';

  const pessoasFiltradas = [...App.state.pessoas].filter((pessoa) => {
    const textoBusca = [
      pessoa.nome,
      pessoa.placa,
      pessoa.telefone,
      pessoa.email || ''
    ]
      .join(' ')
      .toLowerCase();

    return textoBusca.includes(query);
  });

  if (!pessoasFiltradas.length) {
    App.renderEmptyState(App.dom.listaPessoas, 'Nenhuma pessoa encontrada.');
    return;
  }

  App.dom.listaPessoas.innerHTML = pessoasFiltradas
    .map((pessoa) => {
      const totalParticipacoes = App.state.presencas.filter(
        (presenca) => presenca.pessoa_id === pessoa.id
      ).length;

      return `
        <div class="list-item">
          <div>
            <h4>${App.escapeHtml(pessoa.nome)}</h4>
            <p>
              <strong>Placa:</strong> ${App.escapeHtml(pessoa.placa || '—')} •
              <strong>Telefone:</strong> ${App.escapeHtml(pessoa.telefone || '—')}
            </p>
            <p>
              ${
                pessoa.email
                  ? `<strong>E-mail:</strong> ${App.escapeHtml(pessoa.email)}`
                  : 'Sem e-mail cadastrado.'
              }
            </p>
            <div class="chips">
              <span class="chip">${totalParticipacoes} evento(s)</span>
            </div>
          </div>

          <button
            class="btn-danger"
            type="button"
            data-action="delete-person"
            data-id="${pessoa.id}"
          >
            Excluir
          </button>
        </div>
      `;
    })
    .join('');
};

App.deletePerson = async function (id) {
  if (!App.ensureSupabaseReady()) return;

  const pessoa = App.getPersonById(id);
  if (!pessoa) return;

  const confirmou = confirm(
    `Excluir "${pessoa.nome}" da base? As participações dela também serão removidas.`
  );

  if (!confirmou) return;

  try {
    const { error: presencasError } = await App.db
      .from('presencas')
      .delete()
      .eq('pessoa_id', id);

    if (presencasError) {
      console.error('Erro ao remover participações da pessoa:', presencasError);
      App.showToast('Erro ao remover participações do convidado.', 'error');
      return;
    }

    const { error: pessoaError } = await App.db
      .from('pessoas')
      .delete()
      .eq('id', id);

    if (pessoaError) {
      console.error('Erro ao excluir pessoa:', pessoaError);
      App.showToast('Erro ao excluir convidado.', 'error');
      return;
    }

    await App.refreshAfterChange('pessoas');
    App.showToast('Pessoa excluída com sucesso.', 'success');
  } catch (error) {
    console.error('Erro inesperado ao excluir pessoa:', error);
    App.showToast('Não foi possível excluir a pessoa.', 'error');
  }
};