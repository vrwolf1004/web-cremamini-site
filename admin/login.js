// ── Admin Login ───────────────────────────────────────────────────

const ADMIN_PASSWORD = 'picklayer2024admin'; // 환경변수로 관리할 수 있음
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30분
const LOADING_TIMEOUT = 3000; // 3초

let sessionTimer = null;
let loginLoadingTimer = null;

// ── 토스트 유틸리티 ───────────────────────────────────────────────
function showToast(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  if (duration > 0) {
    setTimeout(() => {
      toast.style.animation = 'slideInRight 0.3s ease-out reverse';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  return toast;
}

// ── 로딩바 유틸리티 ───────────────────────────────────────────────
function showLoadingBar() {
  const loadingBar = document.getElementById('loading-bar');
  if (loadingBar) {
    loadingBar.classList.remove('hidden');
  }
}

function hideLoadingBar() {
  const loadingBar = document.getElementById('loading-bar');
  if (loadingBar) {
    loadingBar.classList.add('hidden');
  }
}

function initLoginPage() {
  const form = document.getElementById('login-form');
  const passwordInput = document.getElementById('admin-password');
  const errorEl = document.getElementById('login-error');

  if (!form) return;

  // 이미 로그인되어 있으면 대시보드로 이동
  if (isAdminLoggedIn()) {
    showDashboard();
    return;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.textContent = '';

    const password = passwordInput.value.trim();

    if (!password) {
      errorEl.textContent = '패스워드를 입력하세요.';
      return;
    }

    if (password !== ADMIN_PASSWORD) {
      errorEl.textContent = '패스워드가 올바르지 않습니다.';
      passwordInput.value = '';
      passwordInput.focus();
      return;
    }

    // 1️⃣ 로그인 로딩 시작
    console.log('[로그인] 패스워드 검증 완료, 로딩 시작');
    showLoadingBar();
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    // 2️⃣ 3초 후 진행 상황 표시
    loginLoadingTimer = setTimeout(() => {
      showToast('접속 처리 중...', 'info', 0);
      console.log('[로그인] 3초 대기 - 접속 처리 중 토스트 표시');
    }, LOADING_TIMEOUT);

    // 3️⃣ 로그인 처리 시뮬레이션 (실제로는 서버 통신)
    setTimeout(() => {
      console.log('[로그인] 처리 완료');

      // 4️⃣ 로딩 타이머 정리
      if (loginLoadingTimer) clearTimeout(loginLoadingTimer);

      // 5️⃣ 로딩바 숨김
      hideLoadingBar();

      // 6️⃣ 성공 토스트 표시
      showToast('접속 완료', 'success', 2000);
      console.log('[로그인] 접속 완료 토스트 표시');

      setAdminToken();

      // 7️⃣ 대시보드로 이동
      setTimeout(() => {
        console.log('[로그인] 대시보드로 이동');
        showDashboard();
      }, 500);
    }, 1000);
  });
}

function setAdminToken() {
  const token = generateToken();
  localStorage.setItem('admin-token', token);
  localStorage.setItem('admin-login-time', Date.now().toString());
}

function isAdminLoggedIn() {
  const token = localStorage.getItem('admin-token');
  const loginTime = localStorage.getItem('admin-login-time');

  if (!token || !loginTime) return false;

  // 세션 타임아웃 확인
  const elapsed = Date.now() - parseInt(loginTime);
  if (elapsed > SESSION_TIMEOUT) {
    clearAdminToken();
    return false;
  }

  return true;
}

function clearAdminToken() {
  localStorage.removeItem('admin-token');
  localStorage.removeItem('admin-login-time');
  if (sessionTimer) clearInterval(sessionTimer);
}

function generateToken() {
  return 'admin_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function showDashboard() {
  const loginSection = document.getElementById('login-section');
  const dashboardSection = document.getElementById('dashboard-section');

  if (loginSection) {
    loginSection.hidden = true;
    loginSection.style.display = 'none';
  }
  if (dashboardSection) dashboardSection.hidden = false;

  // 로딩바 초기화
  hideLoadingBar();

  // 대시보드 초기화
  initDashboard();
  startSessionTimer();

  // 로그아웃 버튼
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }
}

function handleLogout() {
  if (confirm('로그아웃하시겠습니까?')) {
    clearAdminToken();
    location.reload();
  }
}

function startSessionTimer() {
  const timerEl = document.getElementById('session-timer');
  if (!timerEl) return;

  let remaining = 30 * 60; // 30분 (초 단위)

  if (sessionTimer) clearInterval(sessionTimer);

  sessionTimer = setInterval(() => {
    remaining--;

    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    timerEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    if (remaining <= 0) {
      clearInterval(sessionTimer);
      clearAdminToken();
      alert('세션이 만료되었습니다. 다시 로그인하세요.');
      location.reload();
    }
  }, 1000);
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
  // PC 전용 체크 (모바일 접근 차단)
  if (isMobileDevice()) {
    document.body.innerHTML = '<p style="text-align:center;margin-top:50px;color:#999;">모바일에서는 접근할 수 없습니다.</p>';
    return;
  }

  initLoginPage();
});

function isMobileDevice() {
  const userAgent = navigator.userAgent.toLowerCase();
  return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/.test(userAgent);
}
