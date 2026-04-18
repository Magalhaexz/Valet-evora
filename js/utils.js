// ============================================================
// utils.js — Utilitários globais da aplicação
// ============================================================

window.App = window.App || {};

// ------------------------------------------------------------
// Geração de ID único
// ------------------------------------------------------------
App.createId = function () {
  if (typeof window.crypto?.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }
  // Fallback para ambientes sem crypto.randomUUID
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
};

// ------------------------------------------------------------
// Normalização de texto (busca sem acentos, case-insensitive)
// "João" → "joao", "Ação" → "acao"
// ------------------------------------------------------------
App.normalizeText = function (value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacríticos
    .toLowerCase()
    .trim();
};

// ------------------------------------------------------------
// Normalização de placa (somente letras e números, maiúsculas)
// "abc-1d23" → "ABC1D23"
// ------------------------------------------------------------
App.normalizePlate = function (value = '') {
  return String(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
};

// ------------------------------------------------------------
// Escape de HTML (previne XSS em templates de string)
// ------------------------------------------------------------
App.escapeHtml = function (value = '') {
  return String(value)
    .replace(/&/g,  '&')
    .replace(/</g,  '<')
    .replace(/>/g,  '>')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#039;');
};

// ------------------------------------------------------------
// Data de hoje no formato ISO (YYYY-MM-DD) respeitando timezone local
// Evita o bug clássico de UTC vs local que muda a data em fusos negativos
// ------------------------------------------------------------
App.getTodayISO = function () {
  const now    = new Date();
  const offset = now.getTimezoneOffset();
  const local  = new Date(now.getTime() - offset * 60_000);
  return local.toISOString().split('T')[0];
};

// Alias semântico usado em alguns arquivos
App.getTodayString = App.getTodayISO;

// ------------------------------------------------------------
// Formata data ISO (YYYY-MM-DD ou datetime) → DD/MM/AAAA
// ------------------------------------------------------------
App.formatDate = function (value) {
  if (!value) return '—';

  const dateOnly = String(value).includes('T')
    ? String(value).split('T')[0]
    : String(value);

  const parts = dateOnly.split('-');
  if (parts.length !== 3) return String(value);

  const [y, m, d] = parts;
  return `${d}/${m}/${y}`;
};

// ------------------------------------------------------------
// Formata datetime ISO → localização pt-BR
// "2026-04-18T13:00:00Z" → "18/04/2026, 10:00:00"
// ------------------------------------------------------------
App.formatDateTime = function (value) {
  if (!value) return '—';

  const date = new Date(value);
  if (isNaN(date.getTime())) return String(value);

  return date.toLocaleString('pt-BR');
};

// ------------------------------------------------------------
// Sanitiza string para uso como nome de arquivo
// "Jantar Corporativo — 18/04/2026" → "jantar_corporativo_18_04_2026"
// ------------------------------------------------------------
App.sanitizeFileName = function (value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
};

// ------------------------------------------------------------
// Debounce — evita execuções excessivas em eventos de input
// Uso: input.addEventListener('input', App._debounce(fn, 200))
// ------------------------------------------------------------
App._debounce = function (fn, delay = 200) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
};

// ------------------------------------------------------------
// Loading state em botões de formulário
// Uso: App._setButtonLoading(btn, true, 'Salvando…')
// ------------------------------------------------------------
App._setButtonLoading = function (btn, isLoading, loadingText = 'Aguarde…') {
  if (!btn) return;

  if (isLoading) {
    btn.disabled             = true;
    btn.dataset.originalText = btn.textContent;
    btn.textContent          = loadingText;
  } else {
    btn.disabled    = false;
    btn.textContent = btn.dataset.originalText || btn.textContent;
    delete btn.dataset.originalText;
  }
};

// ------------------------------------------------------------
// Toast — notificações não-bloqueantes
// Uso: App.showToast('Salvo!', 'success', 3200)
// Tipos: 'success' | 'error' | 'warning' | 'info'
// ------------------------------------------------------------
App.showToast = function (message, type = 'info', duration = 3200) {
  let container = document.getElementById('toastContainer');

  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('aria-atomic', 'true');
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className        = `toast toast--${type}`;
  toast.textContent      = message;
  toast.setAttribute('role', 'status');

  container.appendChild(toast);

  // Força reflow para a animação de entrada funcionar
  void toast.offsetHeight;
  toast.classList.add('toast--visible');

  setTimeout(() => {
    toast.classList.remove('toast--visible');
    toast.classList.add('toast--hidden');
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
  }, duration);
};

// ------------------------------------------------------------
// Modal de confirmação genérico — retorna Promise<boolean>
// Substitui App.askConfirm e App.resolveConfirmModal
//
// Uso:
//   const ok = await App.confirm('Excluir este evento?', 'Excluir evento');
//   if (ok) { ... }
//
// Nota: App.confirm está definido em dom.js (precisa do App.dom)
// Este alias garante retrocompatibilidade caso algum arquivo
// ainda chame App.askConfirm
// ------------------------------------------------------------
App.askConfirm = function ({ title, message } = {}) {
  return App.confirm(message, title);
};