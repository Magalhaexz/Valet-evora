// ============================================================
// data.js — Carregamento e consulta de dados via Supabase
// ============================================================

window.App = window.App || {};

// ------------------------------------------------------------
// Carrega todos os dados do Supabase em paralelo
// ------------------------------------------------------------
App.loadAllData = async function (showFeedback = false) {
  if (!App.ensureSupabaseReady(showFeedback)) return false;
  if (!App.state.currentUser) return false;

  App.state.isLoading = true;

  try {
    const [
      eventosRes,
      pessoasRes,
      presencasRes,
      funcionariosRes,
      funcionariosEventosRes,
    ] = await Promise.all([
      App.db.from('eventos').select('*').order('data_realizacao', { ascending: true }),
      App.db.from('pessoas').select('*').order('nome',            { ascending: true }),
      App.db.from('presencas').select('*').order('registrado_em', { ascending: false }),
      App.db.from('funcionarios').select('*').order('nome',       { ascending: true }),
      App.db.from('funcionarios_eventos').select('*').order('registrado_em', { ascending: false }),
    ]);

    // Coleta todos os erros e lança um único erro descritivo
    const errors = [
      eventosRes.error       && `eventos: ${eventosRes.error.message}`,
      pessoasRes.error       && `pessoas: ${pessoasRes.error.message}`,
      presencasRes.error     && `presencas: ${presencasRes.error.message}`,
      funcionariosRes.error  && `funcionarios: ${funcionariosRes.error.message}`,
      funcionariosEventosRes.error && `funcionarios_eventos: ${funcionariosEventosRes.error.message}`,
    ].filter(Boolean);

    if (errors.length) {
      throw new Error(`Falha ao carregar tabelas — ${errors.join(' | ')}`);
    }

    // Salva no estado global
    App.state.eventos            = eventosRes.data            ?? [];
    App.state.pessoas            = pessoasRes.data            ?? [];
    App.state.presencas          = presencasRes.data          ?? [];
    App.state.funcionarios       = funcionariosRes.data       ?? [];
    App.state.funcionariosEventos = funcionariosEventosRes.data ?? [];

    // Reconstrói os índices para buscas O(1)
    App._buildIndexes();

    console.info(
      `[Data] Dados carregados — ` +
      `${App.state.eventos.length} eventos, ` +
      `${App.state.pessoas.length} pessoas, ` +
      `${App.state.funcionarios.length} funcionários.`
    );

    return true;

  } catch (err) {
    console.error('[Data] Erro ao carregar dados:', err);

    if (showFeedback) {
      App.showToast(
        'Não foi possível carregar os dados. Verifique as tabelas e policies do Supabase.',
        'error',
        5000
      );
    }

    return false;

  } finally {
    App.state.isLoading = false;
  }
};

// ------------------------------------------------------------
// Índices em memória para buscas O(1) por ID
// Evita .find() em loops e melhora performance com bases grandes
// ------------------------------------------------------------
App._buildIndexes = function () {
  App._idx = {
    eventos:      new Map(App.state.eventos.map(e  => [e.id, e])),
    pessoas:      new Map(App.state.pessoas.map(p  => [p.id, p])),
    funcionarios: new Map(App.state.funcionarios.map(f => [f.id, f])),
  };
};

// ------------------------------------------------------------
// Recarrega os dados e re-renderiza após uma mudança
// ------------------------------------------------------------
App.refreshAfterChange = async function (viewToOpen = '') {
  const loaded = await App.loadAllData(true);
  if (!loaded) return false;

  App.renderAll();

  if (viewToOpen) App.setView(viewToOpen);

  return true;
};

// ------------------------------------------------------------
// Lookups por ID — usam índice se disponível, com fallback seguro
// ------------------------------------------------------------
App.getEventById = function (eventoId) {
  return App._idx?.eventos?.get(eventoId)
    ?? App.state.eventos.find(e => e.id === eventoId)
    ?? null;
};

App.getPersonById = function (pessoaId) {
  return App._idx?.pessoas?.get(pessoaId)
    ?? App.state.pessoas.find(p => p.id === pessoaId)
    ?? null;
};

App.getEmployeeById = function (funcionarioId) {
  return App._idx?.funcionarios?.get(funcionarioId)
    ?? App.state.funcionarios.find(f => f.id === funcionarioId)
    ?? null;
};

// ------------------------------------------------------------
// Retorna as PRESENÇAS completas de um evento (com metadados do vínculo)
// Útil para histórico, exportação e exibição detalhada
// ------------------------------------------------------------
App.getPresencasByEvent = function (eventoId) {
  return App.state.presencas
    .filter(p => p.evento_id === eventoId)
    .map(presenca => ({
      ...App.getPersonById(presenca.pessoa_id),
      _presenca_id:   presenca.id,
      _registrado_em: presenca.registrado_em,
    }))
    .filter(p => p.id); // descarta presenças com pessoa deletada
};

/**
 * Atalho: retorna apenas os objetos de pessoa vinculados ao evento.
 * Use quando não precisar dos metadados do vínculo.
 */
App.getPeopleByEvent = function (eventoId) {
  return App.getPresencasByEvent(eventoId).map(({ _presenca_id, _registrado_em, ...pessoa }) => pessoa);
};

// ------------------------------------------------------------
// Retorna os VÍNCULOS completos de funcionários em um evento
// ------------------------------------------------------------
App.getVinculosByEvent = function (eventoId) {
  return App.state.funcionariosEventos
    .filter(v => v.evento_id === eventoId)
    .map(vinculo => ({
      ...App.getEmployeeById(vinculo.funcionario_id),
      _vinculo_id:    vinculo.id,
      _registrado_em: vinculo.registrado_em,
    }))
    .filter(f => f.id); // descarta vínculos com funcionário deletado
};

/**
 * Atalho: retorna apenas os objetos de funcionário vinculados ao evento.
 */
App.getEmployeesByEvent = function (eventoId) {
  return App.getVinculosByEvent(eventoId).map(({ _vinculo_id, _registrado_em, ...func }) => func);
};

// ------------------------------------------------------------
// Estatísticas para o dashboard
// ------------------------------------------------------------
App.getStats = function () {
  const hoje = App.getTodayString(); // ex: '2026-04-18'

  const eventos      = App.state.eventos;
  const total        = eventos.length;
  const hoje_count   = eventos.filter(e => e.data_realizacao === hoje).length;
  const proximos     = eventos.filter(e => e.data_realizacao > hoje).length;
  const funcionarios = App.state.funcionarios.length;

  return { total, hoje_count, proximos, funcionarios };
};