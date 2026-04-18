window.App = window.App || {};

App.createId = function () {
  if (typeof window.crypto !== 'undefined' && typeof window.crypto.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
};

App.normalizeText = function (value) {
  if (!value) return '';
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
};

App.normalizePlate = function (value) {
  if (!value) return '';
  return String(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
};

App.escapeHtml = function (value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

App.getTodayISO = function () {
  var now = new Date();
  var offset = now.getTimezoneOffset();
  var local = new Date(now.getTime() - offset * 60000);
  return local.toISOString().split('T')[0];
};

App.getTodayString = App.getTodayISO;

App.formatDate = function (value) {
  if (!value) return '—';
  var str = String(value);
  var dateOnly = str.indexOf('T') !== -1 ? str.split('T')[0] : str;
  var parts = dateOnly.split('-');
  if (parts.length !== 3) return str;
  return parts[2] + '/' + parts[1] + '/' + parts[0];
};

App.formatDateTime = function (value) {
  if (!value) return '—';
  var date = new Date(value);
  if (isNaN(date.getTime())) return String(value);
  return date.toLocaleString('pt-BR');
};

App.sanitizeFileName = function (value) {
  if (!value) return '';
  var s = String(value).normalize('NFD');
  s = s.replace(/[\u0300-\u036f]/g, '');
  s = s.replace(/[^\w-]+/g, '_');
  s = s.replace(/_+/g, '_');
  s = s.replace(/^_+/, '');
  s = s.replace(/_+$/, '');
  return s.toLowerCase();
};

App._debounce = function (fn, delay) {
  if (!delay) delay = 200;
  var timer;
  return function () {
    var args = arguments;
    var ctx = this;
    clearTimeout(timer);
    timer = setTimeout(function () {
      fn.apply(ctx, args);
    }, delay);
  };
};

App._setButtonLoading = function (btn, isLoading, loadingText) {
  if (!btn) return;
  if (!loadingText) loadingText = 'Aguarde…';
  if (isLoading) {
    btn.disabled = true;
    btn.dataset.originalText = btn.textContent;
    btn.textContent = loadingText;
  } else {
    btn.disabled = false;
    btn.textContent = btn.dataset.originalText || btn.textContent;
    delete btn.dataset.originalText;
  }
};

App.showToast = function (message, type, duration) {
  if (!type) type = 'info';
  if (!duration) duration = 3200;

  var container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('aria-atomic', 'true');
    document.body.appendChild(container);
  }

  var toast = document.createElement('div');
  toast.className = 'toast toast--' + type;
  toast.textContent = message;
  toast.setAttribute('role', 'status');
  container.appendChild(toast);

  void toast.offsetHeight;
  toast.classList.add('toast--visible');

  setTimeout(function () {
    toast.classList.remove('toast--visible');
    toast.classList.add('toast--hidden');
    toast.addEventListener('transitionend', function () {
      toast.remove();
    }, { once: true });
  }, duration);
};

App.askConfirm = function (opts) {
  if (!opts) opts = {};
  return App.confirm(opts.message, opts.title);
};
