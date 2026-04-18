// ============================================================
// config.js — Configuração global e inicialização do Supabase
// ============================================================

window.App = window.App || {};

// ------------------------------------------------------------
// Configurações da aplicação
// ------------------------------------------------------------
App.config = {
  APP_NAME: 'ÉVORA',
  AUTO_REFRESH_MS: 8000,

  // ⚠️ ATENÇÃO: Em produção, use variáveis de ambiente via build tool
  // (ex: Vite, Parcel) ou um backend proxy. Nunca exponha a service key.
  // A anon key é segura desde que as políticas RLS estejam ativas no Supabase.
  SUPABASE_URL:      'https://yccvpwjxfstjbvuvrgch.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljY3Zwd2p4ZnN0amJ2dXZyZ2NoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0NTI1NzIsImV4cCI6MjA5MjAyODU3Mn0.QwN4nQarFcPWCiKcMioNN5grraQmxKpm9frakXY2q3U',
};

// Instância do cliente Supabase (preenchida em initSupabase)
App.db = null;

// ------------------------------------------------------------
// Valida se as credenciais foram preenchidas corretamente
// ------------------------------------------------------------
App.isSupabaseConfigured = function () {
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = App.config;

  const urlValida =
    typeof SUPABASE_URL === 'string' &&
    SUPABASE_URL.startsWith('https://') &&
    SUPABASE_URL.includes('.supabase.co') &&
    !SUPABASE_URL.includes('COLE_SUA');

  const keyValida =
    typeof SUPABASE_ANON_KEY === 'string' &&
    SUPABASE_ANON_KEY.length > 20 &&
    !SUPABASE_ANON_KEY.includes('COLE_SUA');

  return urlValida && keyValida;
};

// ------------------------------------------------------------
// Inicializa o cliente Supabase
// ------------------------------------------------------------
App.initSupabase = function () {
  if (!App.isSupabaseConfigured()) {
    console.warn('[Config] Supabase não configurado. Verifique SUPABASE_URL e SUPABASE_ANON_KEY.');
    App.db = null;
    return null;
  }

  // Garante que a biblioteca foi carregada via CDN
  if (typeof supabase === 'undefined' || typeof supabase.createClient !== 'function') {
    console.error('[Config] Biblioteca do Supabase não encontrada. Verifique o script no index.html.');
    App.db = null;
    return null;
  }

  try {
    App.db = supabase.createClient(
      App.config.SUPABASE_URL,
      App.config.SUPABASE_ANON_KEY,
      {
        auth: {
          persistSession:    true,   // mantém sessão no localStorage
          autoRefreshToken:  true,   // renova o token automaticamente
          detectSessionInUrl: false, // desativa magic-link via URL (não usado aqui)
        },
      }
    );

    console.info('[Config] Supabase inicializado com sucesso.');
    return App.db;

  } catch (err) {
    console.error('[Config] Erro ao iniciar Supabase:', err);
    App.db = null;
    return null;
  }
};

// ------------------------------------------------------------
// Guard: garante que o Supabase está pronto antes de qualquer operação
// ------------------------------------------------------------
App.ensureSupabaseReady = function (showMessage = true) {
  const ready = Boolean(App.db);

  if (!ready && showMessage) {
    App.showToast(
      'Supabase não configurado. Verifique as credenciais em js/config.js.',
      'error',
      4500
    );
  }

  return ready;
};