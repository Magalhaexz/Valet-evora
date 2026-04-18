window.App = window.App || {};

App.createId = function () {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
};

App.normalizeText = function (value = '') {
  return String(value).trim().toLowerCase();
};

App.normalizePlate = function (value = '') {
  return String(value).toUpperCase().replace(/[^A-Z0-9]/g, '');
};

App.escapeHtml = function (value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

App.getTodayISO = function () {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60000);
  return local.toISOString().split('T')[0];
};

App.formatDate = function (value) {
  if (!value) return '—';

  const dateOnly = String(value).includes('T')
    ? String(value).split('T')[0]
    : String(value);

  const [y, m, d] = dateOnly.split('-');
  return `${d}/${m}/${y}`;
};

App.formatDateTime = function (value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('pt-BR');
};

App.sanitizeFileName = function (value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
};

App.showToast = function (message, type = 'info', duration = 3200) {
  let container = document.getElementById('toastContainer');

  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.padding = '14px 16px';
  toast.style.borderRadius = '14px';
  toast.style.color = '#f5ead7';
  toast.style.fontSize = '14px';
  toast.style.lineHeight = '1.4';
  toast.style.boxShadow = '0 12px 30px rgba(0,0,0,0.25)';
  toast.style.border = '1px solid rgba(255,255,255,0.08)';
  toast.style.background =
    type === 'success' ? '#17351f' :
    type === 'error' ? '#3d1e1e' :
    type === 'warning' ? '#3a2e17' :
    '#171717';

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-4px)';
    toast.style.transition = 'all 0.25s ease';

    setTimeout(() => toast.remove(), 260);
  }, duration);
};

App.askConfirm = function ({
  title = 'Confirmar ação',
  message = 'Tem certeza que deseja continuar?',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  tone = 'danger'
} = {}) {
  return new Promise((resolve) => {
    if (
      !App.dom.confirmModal ||
      !App.dom.confirmTitle ||
      !App.dom.confirmMessage ||
      !App.dom.btnAcceptConfirmModal ||
      !App.dom.btnCancelConfirmModal
    ) {
      resolve(false);
      return;
    }

    if (App.state.pendingConfirmResolve) {
      App.state.pendingConfirmResolve(false);
      App.state.pendingConfirmResolve = null;
    }

    App.dom.confirmTitle.textContent = title;
    App.dom.confirmMessage.textContent = message;
    App.dom.btnAcceptConfirmModal.textContent = confirmText;
    App.dom.btnCancelConfirmModal.textContent = cancelText;

    App.dom.btnAcceptConfirmModal.className =
      tone === 'secondary' ? 'btn-secondary' :
      tone === 'primary' ? 'btn' :
      'btn-danger';

    App.state.pendingConfirmResolve = resolve;
    App.openModal(App.dom.confirmModal);
  });
};

App.resolveConfirmModal = function (answer) {
  if (App.state.pendingConfirmResolve) {
    const resolve = App.state.pendingConfirmResolve;
    App.state.pendingConfirmResolve = null;
    App.closeModal(App.dom.confirmModal);
    resolve(answer);
    return;
  }

  App.closeModal(App.dom.confirmModal);
};