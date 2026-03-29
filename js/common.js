// ── 공통 함수 모듈 (Common Utilities) ──────────────────────────────

// DOM 선택자
export function $(sel) {
  return document.querySelector(sel);
}

export function $all(sel) {
  return Array.from(document.querySelectorAll(sel));
}

// 토스트 알림
export function showToast(message, type = 'info', timeout = 3000) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = 'toast ' + type;
  toast.textContent = message;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('visible'));
  const tid = setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 300);
  }, timeout);
  toast.addEventListener('click', () => {
    clearTimeout(tid);
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 200);
  });
}

// 로딩 오버레이
export function showLoadingOverlay() {
  const loadingOverlay = document.getElementById('loading-overlay');
  if (loadingOverlay) {
    loadingOverlay.classList.remove('hidden');
  }
}

export function hideLoadingOverlay() {
  const loadingOverlay = document.getElementById('loading-overlay');
  if (loadingOverlay) {
    loadingOverlay.classList.add('hidden');
  }
}
