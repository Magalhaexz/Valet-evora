window.App = window.App || {};

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
      funcionariosEventosRes
    ] = await Promise.all([
      App.db.from('eventos').select('*').order('data_realizacao', { ascending: true }),
      App.db.from('pessoas').select('*').order('nome', { ascending: true }),
      App.db.from('presencas').select('*').order('registrado_em', { ascending: false }),
      App.db.from('funcionarios').select('*').order('nome', { ascending: true }),
      App.db.from('funcionarios_eventos').select('*').order('registrado_em', { ascending: false })
    ]);

    const errors = [
      eventosRes.error,
      pessoasRes.error,
      presencasRes.error,
      funcionariosRes.error,
      funcionariosEventosRes.error
    ].filter(Boolean);

    if (errors.length) {
      throw new Error(errors.map((err) => err.message).join(' | '));
    }

    App.state.eventos = eventosRes.data || [];
    App.state.pessoas = pessoasRes.data || [];
    App.state.presencas = presencasRes.data || [];
    App.state.funcionarios = funcionariosRes.data || [];
    App.state.funcionariosEventos = funcionariosEventosRes.data || [];

    return true;
  } catch (error) {
    console.error('Erro ao carregar dados:', error);

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

App.refreshAfterChange = async function (viewToOpen = '') {
  const loaded = await App.loadAllData(true);

  if (!loaded) return false;

  App.renderAll();

  if (viewToOpen) {
    App.setView(viewToOpen);
  }

  return true;
};

App.getEventById = function (eventoId) {
  return App.state.eventos.find((evento) => evento.id === eventoId) || null;
};

App.getPersonById = function (pessoaId) {
  return App.state.pessoas.find((pessoa) => pessoa.id === pessoaId) || null;
};

App.getEmployeeById = function (funcionarioId) {
  return App.state.funcionarios.find((funcionario) => funcionario.id === funcionarioId) || null;
};

App.getPeopleByEvent = function (eventoId) {
  return App.state.presencas
    .filter((presenca) => presenca.evento_id === eventoId)
    .map((presenca) => App.getPersonById(presenca.pessoa_id))
    .filter(Boolean);
};

App.getEmployeesByEvent = function (eventoId) {
  return App.state.funcionariosEventos
    .filter((vinculo) => vinculo.evento_id === eventoId)
    .map((vinculo) => App.getEmployeeById(vinculo.funcionario_id))
    .filter(Boolean);
};