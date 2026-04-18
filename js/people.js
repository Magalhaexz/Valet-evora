window.App = window.App || {};

/* ============================================================
   PESSOAS — cadastro + reaproveitamento de cadastro existente
   ============================================================ */

App.renderPeople = function () {
  const dom = App.dom;
  if (!dom.viewPeople) return;

  const pessoas  = App.state.pessoas  || [];
  const eventos  = App.state.eventos  || [];
  const presencas = App.state.presencas || [];

  dom.viewPeople.innerHTML = `
    <div class="topbar">
      <div class="headline">
        <h2 id="viewTitle">Pessoas</h2>
        <p class="section-subtitle section-subtitle--flush">
          Cadastre ou reative convidados por evento.
        </p>
      </div>
      <div class="top-actions">
        <button class="btn" id="btnNovaPessoa">+ Nova pessoa</button>
      </div>
    </div>

    <div class="shell">

      <!-- Busca rápida -->
      <div class="card">
        <p class="subsection-title">Buscar pessoa existente</p>
        <div class="toolbar">
          <input
            class="search"
            id="inputBuscaPessoa"
            type="text"
            placeholder="Nome ou placa…"
            autocomplete="off"
          />
        </div>
        <div id="resultadoBusca"></div>
      </div>

      <!-- Lista completa -->
      <div class="card">
        <p class="subsection-title">Todas as pessoas</p>
        <div id="listaPessoas" class="list"></div>
      </div>

    </div>

    <!-- Modal: vincular pessoa existente a evento -->
    <div class="modal-overlay hidden" id="modalVincular">
      <div class="modal-panel modal-panel-sm">
        <div class="modal-header">
          <h3 class="modal-title" id="modalVincularNome">Vincular ao evento</h3>
        </div>
        <div class="modal-body">
          <p class="modal-text" id="modalVincularInfo"></p>
          <div class="field" style="margin-top:18px">
            <label for="selectEventoVincular">Evento</label>
            <select id="selectEventoVincular"></select>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn-secondary" id="btnCancelarVincular">Cancelar</button>
          <button class="btn"           id="btnConfirmarVincular">Vincular</button>
        </div>
      </div>
    </div>

    <!-- Modal: nova pessoa completa -->
    <div class="modal-overlay hidden" id="modalNovaPessoa">
      <div class="modal-panel">
        <div class="modal-header">
          <h3 class="modal-title">Nova pessoa</h3>
        </div>
        <div class="modal-body">
          <div class="form-grid">
            <div class="field">
              <label for="inputNomePessoa">Nome</label>
              <input id="inputNomePessoa" type="text" placeholder="Nome completo" />
            </div>
            <div class="field">
              <label for="inputPlacaPessoa">Placa</label>
              <input id="inputPlacaPessoa" type="text" placeholder="ABC1234" maxlength="8" />
            </div>
            <div class="field">
              <label for="inputTelPessoa">Telefone</label>
              <input id="inputTelPessoa" type="tel" placeholder="(11) 99999-9999" />
            </div>
            <div class="field">
              <label for="selectEventoPessoa">Evento</label>
              <select id="selectEventoPessoa"></select>
            </div>
            <div class="field full">
              <label for="inputObsPessoa">Observações</label>
              <textarea id="inputObsPessoa" placeholder="Anotações opcionais…"></textarea>
            </div>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn-secondary" id="btnCancelarNovaPessoa">Cancelar</button>
          <button class="btn"           id="btnSalvarNovaPessoa">Salvar</button>
        </div>
      </div>
    </div>
  `;

  App._renderListaPessoas(pessoas, presencas, eventos);
  App._bindPeopleEvents(eventos);
};

/* ── Renderiza a lista completa ── */
App._renderListaPessoas = function (pessoas, presencas, eventos) {
  const el = document.getElementById('listaPessoas');
  if (!el) return;

  if (!pessoas.length) {
    el.innerHTML = `<div class="empty">Nenhuma pessoa cadastrada ainda.</div>`;
    return;
  }

  el.innerHTML = pessoas.map(p => {
    const eventosVinculados = presencas
      .filter(pr => pr.pessoa_id === p.id)
      .map(pr => {
        const ev = (App.state.eventos || []).find(e => e.id === pr.evento_id);
        return ev ? `<span class="chip chip--guest">${App.escapeHtml(ev.nome)}</span>` : '';
      })
      .filter(Boolean)
      .join('');

    return `
      <div class="list-item">
        <div class="list-item-body">
          <h4>${App.escapeHtml(p.nome)}</h4>
          <span class="list-item-meta">
            ${p.placa    ? 'Placa: ' + App.escapeHtml(p.placa) + ' &nbsp;·&nbsp; ' : ''}
            ${p.telefone ? 'Tel: '   + App.escapeHtml(p.telefone) : ''}
          </span>
          ${p.observacoes ? `<span class="list-item-obs">${App.escapeHtml(p.observacoes)}</span>` : ''}
          ${eventosVinculados ? `<div class="chips">${eventosVinculados}</div>` : ''}
        </div>
        <div class="list-item-actions">
          <button class="btn-secondary btn-vincular-existente"
            data-id="${p.id}"
            data-nome="${App.escapeHtml(p.nome)}"
            data-placa="${App.escapeHtml(p.placa || '')}"
            data-tel="${App.escapeHtml(p.telefone || '')}">
            + Evento
          </button>
          <button class="btn-danger btn-excluir-pessoa" data-id="${p.id}">
            Remover
          </button>
        </div>
      </div>
    `;
  }).join('');
};

/* ── Bind de todos os eventos da view ── */
App._bindPeopleEvents = function (eventos) {
  /* ---- busca rápida ---- */
  const inputBusca = document.getElementById('inputBuscaPessoa');
  if (inputBusca) {
    inputBusca.addEventListener('input', App._debounce(function () {
      App._buscarPessoa(this.value.trim(), eventos);
    }, 240));
  }

  /* ---- botão nova pessoa ---- */
  const btnNova = document.getElementById('btnNovaPessoa');
  if (btnNova) {
    btnNova.addEventListener('click', function () {
      App._abrirModalNovaPessoa(eventos);
    });
  }

  /* ---- botões na lista: vincular e excluir ---- */
  const lista = document.getElementById('listaPessoas');
  if (lista) {
    lista.addEventListener('click', function (e) {
      const btnVincular = e.target.closest('.btn-vincular-existente');
      const btnExcluir  = e.target.closest('.btn-excluir-pessoa');

      if (btnVincular) {
        App._abrirModalVincular({
          id:    btnVincular.dataset.id,
          nome:  btnVincular.dataset.nome,
          placa: btnVincular.dataset.placa,
          tel:   btnVincular.dataset.tel,
        }, eventos);
      }

      if (btnExcluir) {
        App._excluirPessoa(btnExcluir.dataset.id);
      }
    });
  }
};

/* ── Busca rápida ── */
App._buscarPessoa = function (query, eventos) {
  const resultado = document.getElementById('resultadoBusca');
  if (!resultado) return;

  if (!query) {
    resultado.innerHTML = '';
    return;
  }

  const q       = App.normalizeText(query);
  const pessoas = App.state.pessoas || [];

  const encontradas = pessoas.filter(p =>
    App.normalizeText(p.nome   || '').includes(q) ||
    App.normalizeText(p.placa  || '').includes(q) ||
    App.normalizePlate(p.placa || '').includes(App.normalizePlate(query))
  );

  if (!encontradas.length) {
    resultado.innerHTML = `<div class="empty">Nenhuma pessoa encontrada. Use "+ Nova pessoa" para cadastrar.</div>`;
    return;
  }

  resultado.innerHTML = `
    <div class="list" style="margin-top:12px">
      ${encontradas.map(p => `
        <div class="list-item">
          <div class="list-item-body">
            <h4>${App.escapeHtml(p.nome)}</h4>
            <span class="list-item-meta">
              ${p.placa    ? 'Placa: ' + App.escapeHtml(p.placa) + ' &nbsp;·&nbsp; ' : ''}
              ${p.telefone ? 'Tel: '   + App.escapeHtml(p.telefone) : ''}
            </span>
          </div>
          <div class="list-item-actions">
            <button class="btn btn-vincular-busca"
              data-id="${p.id}"
              data-nome="${App.escapeHtml(p.nome)}"
              data-placa="${App.escapeHtml(p.placa || '')}"
              data-tel="${App.escapeHtml(p.telefone || '')}">
              Vincular a evento
            </button>
          </div>
        </div>
      `).join('')}
    </div>
  `;

  resultado.querySelectorAll('.btn-vincular-busca').forEach(btn => {
    btn.addEventListener('click', function () {
      App._abrirModalVincular({
        id:    this.dataset.id,
        nome:  this.dataset.nome,
        placa: this.dataset.placa,
        tel:   this.dataset.tel,
      }, eventos);
    });
  });
};

/* ── Modal: vincular pessoa existente a novo evento ── */
App._abrirModalVincular = function (pessoa, eventos) {
  const modal     = document.getElementById('modalVincular');
  const titulo    = document.getElementById('modalVincularNome');
  const info      = document.getElementById('modalVincularInfo');
  const selectEv  = document.getElementById('selectEventoVincular');
  const btnCancel = document.getElementById('btnCancelarVincular');
  const btnOk     = document.getElementById('btnConfirmarVincular');

  if (!modal) return;

  titulo.textContent = pessoa.nome;
  info.textContent   = [
    pessoa.placa ? 'Placa: ' + pessoa.placa : '',
    pessoa.tel   ? 'Tel: '   + pessoa.tel   : '',
  ].filter(Boolean).join('  ·  ') || 'Selecione o evento para vincular.';

  selectEv.innerHTML = eventos.length
    ? eventos.map(ev =>
        `<option value="${ev.id}">${App.escapeHtml(ev.nome)} — ${App.formatDate(ev.data)}</option>`
      ).join('')
    : `<option value="">Nenhum evento cadastrado</option>`;

  modal.classList.remove('hidden');
  document.body.classList.add('modal-open');

  const fechar = function () {
    modal.classList.add('hidden');
    document.body.classList.remove('modal-open');
  };

  btnCancel.onclick = fechar;
  modal.onclick     = function (e) { if (e.target === modal) fechar(); };

  btnOk.onclick = async function () {
    const eventoId = selectEv.value;
    if (!eventoId) {
      App.showToast('Selecione um evento.', 'warning');
      return;
    }

    App._setButtonLoading(btnOk, true, 'Vinculando…');

    const jaVinculado = (App.state.presencas || []).some(
      pr => pr.pessoa_id === pessoa.id && pr.evento_id === eventoId
    );

    if (jaVinculado) {
      App.showToast('Esta pessoa já está vinculada a esse evento.', 'warning');
      App._setButtonLoading(btnOk, false);
      return;
    }

    const nova = {
      id:        App.createId(),
      pessoa_id: pessoa.id,
      evento_id: eventoId,
    };

    if (App.ensureSupabaseReady()) {
      const { error } = await App.db.from('presencas').insert(nova);
      if (error) {
        App.showToast('Erro ao vincular: ' + error.message, 'error');
        App._setButtonLoading(btnOk, false);
        return;
      }
    }

    App.state.presencas = App.state.presencas || [];
    App.state.presencas.push(nova);

    App.showToast('Pessoa vinculada ao evento com sucesso!', 'success');
    App._setButtonLoading(btnOk, false);
    fechar();
    App.renderAll();
  };
};

/* ── Modal: nova pessoa completa ── */
App._abrirModalNovaPessoa = function (eventos) {
  const modal     = document.getElementById('modalNovaPessoa');
  const selectEv  = document.getElementById('selectEventoPessoa');
  const btnCancel = document.getElementById('btnCancelarNovaPessoa');
  const btnSalvar = document.getElementById('btnSalvarNovaPessoa');

  if (!modal) return;

  selectEv.innerHTML = eventos.length
    ? eventos.map(ev =>
        `<option value="${ev.id}">${App.escapeHtml(ev.nome)} — ${App.formatDate(ev.data)}</option>`
      ).join('')
    : `<option value="">Nenhum evento cadastrado</option>`;

  modal.classList.remove('hidden');
  document.body.classList.add('modal-open');

  const fechar = function () {
    modal.classList.add('hidden');
    document.body.classList.remove('modal-open');
  };

  btnCancel.onclick = fechar;
  modal.onclick     = function (e) { if (e.target === modal) fechar(); };

  btnSalvar.onclick = async function () {
    const nome  = document.getElementById('inputNomePessoa').value.trim();
    const placa = App.normalizePlate(document.getElementById('inputPlacaPessoa').value);
    const tel   = document.getElementById('inputTelPessoa').value.trim();
    const obs   = document.getElementById('inputObsPessoa').value.trim();
    const evId  = selectEv.value;

    if (!nome) {
      App.showToast('Informe o nome.', 'warning');
      return;
    }
    if (!evId) {
      App.showToast('Selecione um evento.', 'warning');
      return;
    }

    App._setButtonLoading(btnSalvar, true, 'Salvando…');

    /* Verifica se já existe pelo nome normalizado */
    const existente = (App.state.pessoas || []).find(
      p => App.normalizeText(p.nome) === App.normalizeText(nome)
    );

    let pessoaId;

    if (existente) {
      pessoaId = existente.id;
      App.showToast('Cadastro existente reutilizado.', 'info');
    } else {
      const novaPessoa = {
        id:          App.createId(),
        nome,
        placa:       placa || null,
        telefone:    tel   || null,
        observacoes: obs   || null,
      };

      if (App.ensureSupabaseReady()) {
        const { error } = await App.db.from('pessoas').insert(novaPessoa);
        if (error) {
          App.showToast('Erro ao salvar: ' + error.message, 'error');
          App._setButtonLoading(btnSalvar, false);
          return;
        }
      }

      App.state.pessoas = App.state.pessoas || [];
      App.state.pessoas.push(novaPessoa);
      pessoaId = novaPessoa.id;
    }

    /* Verifica se já está vinculada ao evento */
    const jaVinculado = (App.state.presencas || []).some(
      pr => pr.pessoa_id === pessoaId && pr.evento_id === evId
    );

    if (!jaVinculado) {
      const novaPresenca = {
        id:        App.createId(),
        pessoa_id: pessoaId,
        evento_id: evId,
      };

      if (App.ensureSupabaseReady()) {
        const { error } = await App.db.from('presencas').insert(novaPresenca);
        if (error) {
          App.showToast('Erro ao vincular ao evento: ' + error.message, 'error');
          App._setButtonLoading(btnSalvar, false);
          return;
        }
      }

      App.state.presencas = App.state.presencas || [];
      App.state.presencas.push(novaPresenca);
    }

    App.showToast('Pessoa salva e vinculada ao evento!', 'success');
    App._setButtonLoading(btnSalvar, false);
    fechar();
    App.renderAll();
  };
};

/* ── Excluir pessoa ── */
App._excluirPessoa = async function (id) {
  const ok = await App.confirm('Remover esta pessoa da base?', 'Confirmar remoção');
  if (!ok) return;

  if (App.ensureSupabaseReady()) {
    await App.db.from('presencas').delete().eq('pessoa_id', id);
    const { error } = await App.db.from('pessoas').delete().eq('id', id);
    if (error) {
      App.showToast('Erro ao remover: ' + error.message, 'error');
      return;
    }
  }

  App.state.pessoas  = (App.state.pessoas  || []).filter(p  => p.id !== id);
  App.state.presencas = (App.state.presencas || []).filter(pr => pr.pessoa_id !== id);

  App.showToast('Pessoa removida.', 'success');
  App.renderAll();
};