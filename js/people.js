window.App = window.App || {};

// ============================================================
// people.js — Cadastro, edição, listagem e reaproveitamento de pessoas
// ============================================================

App._normalizeEmail = function (value) {
  return App.normalizeText(String(value || '').toLowerCase());
};

App._normalizePhone = function (value) {
  return String(value || '').replace(/\D/g, '');
};

App._findExistingPerson = function (payload, excludeId) {
  excludeId = excludeId || null;

  var nome = App.normalizeText(payload.nome || '');
  var placa = App.normalizePlate(payload.placa || '');
  var telefone = App._normalizePhone(payload.telefone || '');
  var email = App._normalizeEmail(payload.email || '');

  return (App.state.pessoas || []).find(function (pessoa) {
    if (!pessoa || pessoa.id === excludeId) return false;

    var samePlate = placa && App.normalizePlate(pessoa.placa || '') === placa;
    var sameEmail = email && App._normalizeEmail(pessoa.email || '') === email;
    var sameNamePhone = nome && telefone &&
      App.normalizeText(pessoa.nome || '') === nome &&
      App._normalizePhone(pessoa.telefone || '') === telefone;
    var sameName = nome && App.normalizeText(pessoa.nome || '') === nome;

    return samePlate || sameEmail || sameNamePhone || sameName;
  }) || null;
};

App.handleSavePerson = async function (event) {
  event.preventDefault();
  if (!App.ensureSupabaseReady()) return;

  var eventoId = String(App.dom.pessoaEvento?.value || '').trim();
  var nome = String(App.dom.pessoaNome?.value || '').trim();
  var placa = App.normalizePlate(App.dom.pessoaPlaca?.value || '');
  var telefone = String(App.dom.pessoaTelefone?.value || '').trim();
  var email = String(App.dom.pessoaEmail?.value || '').trim().toLowerCase();

  if (!eventoId) {
    App.showToast('Selecione o evento para vincular a pessoa.', 'warning');
    return;
  }

  if (!nome || !placa || !telefone) {
    App.showToast('Preencha nome, placa e telefone.', 'warning');
    return;
  }

  var eventoSelecionado = App.getEventById(eventoId);
  if (!eventoSelecionado) {
    App.showToast('Evento selecionado não encontrado.', 'error');
    return;
  }

  var submitBtn = App.dom.formPessoa?.querySelector('button[type="submit"]');
  App._setButtonLoading(submitBtn, true, 'Salvando…');

  try {
    var pessoaExistente = App._findExistingPerson({
      nome: nome,
      placa: placa,
      telefone: telefone,
      email: email,
    });

    var pessoaId;
    var nomeExibicao;

    if (pessoaExistente) {
      pessoaId = pessoaExistente.id;
      nomeExibicao = pessoaExistente.nome;

      var updatePayload = {
        nome: nome || pessoaExistente.nome,
        placa: placa || pessoaExistente.placa,
        telefone: telefone || pessoaExistente.telefone,
        email: email || pessoaExistente.email || null,
      };

      var updateResult = await App.db
        .from('pessoas')
        .update(updatePayload)
        .eq('id', pessoaId);

      if (updateResult.error) {
        throw new Error('Erro ao atualizar pessoa: ' + updateResult.error.message);
      }
    } else {
      var novaPessoa = {
        id: App.createId(),
        nome: nome,
        placa: placa,
        telefone: telefone,
        email: email || null,
        criado_em: new Date().toISOString(),
      };

      var insertResult = await App.db.from('pessoas').insert([novaPessoa]);
      if (insertResult.error) {
        throw new Error('Erro ao salvar pessoa: ' + insertResult.error.message);
      }

      pessoaId = novaPessoa.id;
      nomeExibicao = novaPessoa.nome;
    }

    var jaVinculada = (App.state.presencas || []).some(function (presenca) {
      return presenca.pessoa_id === pessoaId && presenca.evento_id === eventoId;
    });

    if (jaVinculada) {
      await App.refreshAfterChange('pessoas');
      App.showToast(nomeExibicao + ' já está vinculada a esse evento.', 'warning');
      return;
    }

    var presenca = {
      id: App.createId(),
      pessoa_id: pessoaId,
      evento_id: eventoId,
      registrado_em: new Date().toISOString(),
    };

    var vinculoResult = await App.db.from('presencas').insert([presenca]);
    if (vinculoResult.error) {
      throw new Error('Erro ao vincular pessoa ao evento: ' + vinculoResult.error.message);
    }

    App.dom.formPessoa?.reset();
    await App.refreshAfterChange('pessoas');

    if (pessoaExistente) {
      App.showToast('Cadastro reaproveitado e presença registrada no novo evento.', 'success');
    } else {
      App.showToast('Pessoa cadastrada e vinculada ao evento com sucesso.', 'success');
    }
  } catch (err) {
    console.error('[People] Erro ao salvar pessoa:', err);
    App.showToast(err.message || 'Não foi possível salvar a pessoa.', 'error');
  } finally {
    App._setButtonLoading(submitBtn, false, 'Salvar pessoa no evento');
  }
};

App.renderPeopleList = function () {
  var container = App.dom.listaPessoas;
  if (!container) return;

  var query = App.normalizeText(App.dom.buscaPessoas?.value || '');

  var presencasPorPessoa = (App.state.presencas || []).reduce(function (acc, presenca) {
    if (!acc[presenca.pessoa_id]) acc[presenca.pessoa_id] = [];
    acc[presenca.pessoa_id].push(presenca);
    return acc;
  }, {});

  var lista = (App.state.pessoas || []).filter(function (pessoa) {
    if (!query) return true;

    var eventosDaPessoa = (presencasPorPessoa[pessoa.id] || []).map(function (presenca) {
      var evento = App.getEventById(presenca.evento_id);
      return evento ? evento.nome : '';
    }).join(' ');

    var texto = App.normalizeText([
      pessoa.nome,
      pessoa.placa || '',
      pessoa.telefone || '',
      pessoa.email || '',
      eventosDaPessoa,
    ].join(' '));

    return texto.includes(query);
  });

  if (!lista.length) {
    App.renderEmptyState(
      container,
      query ? 'Nenhuma pessoa encontrada para essa busca.' : 'Nenhuma pessoa cadastrada ainda.'
    );
    return;
  }

  container.innerHTML = lista.map(function (pessoa) {
    var vinculos = presencasPorPessoa[pessoa.id] || [];
    var chipsEventos = vinculos
      .map(function (presenca) {
        var evento = App.getEventById(presenca.evento_id);
        if (!evento) return '';
        return '<span class="chip chip--guest">' + App.escapeHtml(evento.nome) + '</span>';
      })
      .filter(Boolean)
      .join('');

    var meta = [
      '<strong>Placa:</strong> ' + App.escapeHtml(pessoa.placa || '—'),
      '<strong>Tel:</strong> ' + App.escapeHtml(pessoa.telefone || '—'),
      pessoa.email ? '<strong>E-mail:</strong> ' + App.escapeHtml(pessoa.email) : null,
    ].filter(Boolean).join(' • ');

    return '\n      <div class="list-item" data-id="' + App.escapeHtml(pessoa.id) + '">\n        <div class="list-item-body">\n          <h4>' + App.escapeHtml(pessoa.nome || 'Sem nome') + '</h4>\n          <p class="list-item-meta">' + meta + '</p>\n          <div class="chips">\n            <span class="chip">' + vinculos.length + ' evento' + (vinculos.length !== 1 ? 's' : '') + '</span>\n            ' + chipsEventos + '\n          </div>\n        </div>\n        <div class="list-item-actions">\n          <button class="btn-secondary" type="button" data-action="edit-person" data-id="' + App.escapeHtml(pessoa.id) + '">Editar</button>\n          <button class="btn-danger" type="button" data-action="delete-person" data-id="' + App.escapeHtml(pessoa.id) + '">Excluir</button>\n        </div>\n      </div>\n    ';
  }).join('');
};

App.openEditPersonModal = function (id) {
  var pessoa = App.getPersonById(id);
  if (!pessoa) {
    App.showToast('Pessoa não encontrada.', 'error');
    return;
  }

  App.dom.editPessoaId.value = pessoa.id;
  App.dom.editPessoaNome.value = pessoa.nome || '';
  App.dom.editPessoaPlaca.value = pessoa.placa || '';
  App.dom.editPessoaTelefone.value = pessoa.telefone || '';
  App.dom.editPessoaEmail.value = pessoa.email || '';

  App.openModal(App.dom.editPessoaModal);
};

App.handleUpdatePerson = async function (event) {
  event.preventDefault();
  if (!App.ensureSupabaseReady()) return;

  var id = String(App.dom.editPessoaId?.value || '').trim();
  var nome = String(App.dom.editPessoaNome?.value || '').trim();
  var placa = App.normalizePlate(App.dom.editPessoaPlaca?.value || '');
  var telefone = String(App.dom.editPessoaTelefone?.value || '').trim();
  var email = String(App.dom.editPessoaEmail?.value || '').trim().toLowerCase();

  if (!id || !nome || !placa || !telefone) {
    App.showToast('Preencha nome, placa e telefone.', 'warning');
    return;
  }

  var conflito = App._findExistingPerson({
    nome: nome,
    placa: placa,
    telefone: telefone,
    email: email,
  }, id);

  if (conflito) {
    App.showToast('Já existe outra pessoa com esses dados na base.', 'warning');
    return;
  }

  var submitBtn = App.dom.editPessoaForm?.querySelector('button[type="submit"]');
  App._setButtonLoading(submitBtn, true, 'Salvando…');

  try {
    var result = await App.db
      .from('pessoas')
      .update({
        nome: nome,
        placa: placa,
        telefone: telefone,
        email: email || null,
      })
      .eq('id', id);

    if (result.error) {
      throw new Error('Erro ao atualizar pessoa: ' + result.error.message);
    }

    App.closeModal(App.dom.editPessoaModal);
    await App.refreshAfterChange('pessoas');
    App.showToast('Cadastro atualizado com sucesso.', 'success');
  } catch (err) {
    console.error('[People] Erro ao atualizar pessoa:', err);
    App.showToast(err.message || 'Não foi possível atualizar a pessoa.', 'error');
  } finally {
    App._setButtonLoading(submitBtn, false, 'Salvar alterações');
  }
};

App.deletePerson = async function (id) {
  if (!App.ensureSupabaseReady()) return;

  var pessoa = App.getPersonById(id);
  if (!pessoa) {
    App.showToast('Pessoa não encontrada.', 'error');
    return;
  }

  var totalVinculos = (App.state.presencas || []).filter(function (presenca) {
    return presenca.pessoa_id === id;
  }).length;

  var mensagem = totalVinculos > 0
    ? 'Excluir "' + pessoa.nome + '"? Ela está vinculada a ' + totalVinculos + ' evento(s).'
    : 'Excluir "' + pessoa.nome + '" da base de convidados?';

  var confirmou = await App.confirm(mensagem, 'Excluir pessoa');
  if (!confirmou) return;

  try {
    if (totalVinculos > 0) {
      var presencasResult = await App.db.from('presencas').delete().eq('pessoa_id', id);
      if (presencasResult.error) {
        throw new Error('Erro ao remover presenças: ' + presencasResult.error.message);
      }
    }

    var pessoaResult = await App.db.from('pessoas').delete().eq('id', id);
    if (pessoaResult.error) {
      throw new Error('Erro ao excluir pessoa: ' + pessoaResult.error.message);
    }

    await App.refreshAfterChange('pessoas');
    App.showToast('Pessoa removida com sucesso.', 'success');
  } catch (err) {
    console.error('[People] Erro ao excluir pessoa:', err);
    App.showToast(err.message || 'Não foi possível excluir a pessoa.', 'error');
  }
};
