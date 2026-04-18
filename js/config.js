window.App = window.App || {};

App.config = {
  APP_NAME: 'ÉVORA',
  AUTO_REFRESH_MS: 8000,
  SUPABASE_URL: 'COLE_SUA_SUPABASE_URL_AQUI',
  SUPABASE_ANON_KEY: 'COLE_SUA_SUPABASE_ANON_KEY_AQUI'
};

App.db = null;

App.isSupabaseConfigured = function () {
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = App.config;

  return Boolean(
    SUPABASE_URL &&
    SUPABASE_ANON_KEY &&
    !SUPABASE_URL.includes('COLE_SUA') &&
    !SUPABASE_ANON_KEY.includes('COLE_SUA')
  );
};

App.initSupabase = function () {
  if (!App.isSupabaseConfigured()) {
    console.warn('Supabase não configurado.');
    App.db = null;
    return null;
  }

  try {
    App.db = supabase.createClient(
      App.config.SUPABASE_URL,
      App.config.SUPABASE_ANON_KEY
    );

    return App.db;
  } catch (error) {
    console.error('Erro ao iniciar Supabase:', error);
    App.db = null;
    return null;
  }
};

App.ensureSupabaseReady = function (showMessage = true) {
  const ready = !!App.db;

  if (!ready && showMessage) {
    App.showToast(
      'Configure a SUPABASE_URL e a SUPABASE_ANON_KEY no arquivo js/config.js.',
      'error',
      4500
    );
  }

  return ready;
};