// ── Admin Dashboard ───────────────────────────────────────────────

let currentReports = [];
let currentComments = [];
let currentFilter = 'all';
let dashboardLoadingTimer = null;

// ── 토스트 유틸리티 (login.js와 공유) ───────────────────────────────
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

async function initDashboard() {
  console.log('[대시보드] 초기화 시작');

  // 1️⃣ 로딩 상태 시작
  showLoadingBar();

  // 2️⃣ 3초 후 진행 상황 표시
  dashboardLoadingTimer = setTimeout(() => {
    showToast('데이터 로드 중...', 'info', 0);
  }, LOADING_TIMEOUT);

  try {
    // 3️⃣ 데이터 로드
    console.log('[대시보드] 데이터 로드 중...');
    await loadReports();
    await loadComments();
    console.log(`[대시보드] 신고 ${currentReports.length}개, 댓글 ${currentComments.length}개 로드`);

    // 4️⃣ UI 이벤트 바인딩
    const filterSelect = document.getElementById('filter-status');
    if (filterSelect) {
      filterSelect.addEventListener('change', (e) => {
        currentFilter = e.target.value;
        renderReportsList();
      });
    }

    const modalCloseBtn = document.getElementById('modal-close');
    const modal = document.getElementById('report-modal');
    const backdrop = document.querySelector('.modal-backdrop');

    if (modalCloseBtn) {
      modalCloseBtn.addEventListener('click', () => {
        if (modal) modal.hidden = true;
      });
    }

    if (backdrop) {
      backdrop.addEventListener('click', () => {
        if (modal) modal.hidden = true;
      });
    }

    // 5️⃣ 화면 렌더링
    console.log('[대시보드] 화면 렌더링 중...');
    renderReportsList();
    updateStats();
    console.log('[대시보드] 렌더링 완료');

    // 6️⃣ 로딩 완료
    if (dashboardLoadingTimer) clearTimeout(dashboardLoadingTimer);
    hideLoadingBar();
    showToast('페이지 로딩완료', 'success', 2000);
    console.log('[대시보드] 완료!');
  } catch (error) {
    console.error('[대시보드] 오류 발생:', error);
    if (dashboardLoadingTimer) clearTimeout(dashboardLoadingTimer);
    hideLoadingBar();
    showToast('대시보드 로딩 실패', 'error', 3000);
  }
}

async function loadReports() {
  try {
    if (!window._firebase) {
      console.warn('Firebase not initialized');
      return;
    }

    // 익명 로그인 보장
    const { auth, signInAnonymously } = window._firebase;
    try {
      await signInAnonymously(auth);
    } catch (e) {
      console.log('Already authenticated');
    }

    const { db, collection: col, getDocs, query, orderBy, limit } = window._firebase;
    const reportsRef = query(col(db, 'reports'), orderBy('time', 'desc'), limit(50));
    const snapshot = await getDocs(reportsRef);

    currentReports = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log('Reports loaded:', currentReports.length);
  } catch (e) {
    console.error('Failed to load reports:', e);
  }
}

async function loadComments() {
  try {
    if (!window._firebase) {
      console.warn('Firebase not initialized');
      return;
    }

    const { db, collection: col, getDocs, query, limit } = window._firebase;
    const commentsRef = query(col(db, 'comments'), limit(100));
    const snapshot = await getDocs(commentsRef);

    currentComments = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log('Comments loaded:', currentComments.length);
  } catch (e) {
    console.error('Failed to load comments:', e);
  }
}

function getCommentById(commentId) {
  return currentComments.find(c => c.id === commentId);
}

function getReportsByCommentId(commentId) {
  return currentReports.filter(r => r.commentId === commentId);
}

function renderReportsList() {
  const listEl = document.getElementById('reports-list');
  if (!listEl) return;

  // 신고된 댓글별로 그룹화
  const reportMap = {};
  currentReports.forEach(report => {
    if (!reportMap[report.commentId]) {
      reportMap[report.commentId] = [];
    }
    reportMap[report.commentId].push(report);
  });

  // 필터 적용
  const filtered = Object.entries(reportMap).filter(([commentId, reports]) => {
    if (currentFilter === 'all') return true;
    // 처리 상태는 나중에 구현
    return true;
  });

  if (filtered.length === 0) {
    listEl.innerHTML = '<p class="empty-message">신고된 댓글이 없습니다.</p>';
    return;
  }

  listEl.innerHTML = filtered.map(([commentId, reports]) => {
    const comment = getCommentById(commentId);
    if (!comment) return '';

    const reasons = reports.map(r => r.reason || 'unknown');
    const uniqueReasons = [...new Set(reasons)];

    // 신고 상태 (모두 같다고 가정)
    const status = reports[0]?.status || 'pending';

    return `
      <div class="report-item" onclick="openReportModal('${commentId}')">
        <div class="report-info">
          <h3>${escapeHtml(comment.text.substring(0, 50))}${comment.text.length > 50 ? '...' : ''}</h3>
          <p class="report-meta">
            신고 수: <strong>${reports.length}명</strong> •
            테마: <strong>${comment.themeId || 'basic'}</strong>
          </p>
          <div>
            ${uniqueReasons.map(reason => `<span class="report-reason-badge">${escapeHtml(getReasonLabel(reason))}</span>`).join('')}
            <span class="report-status-badge ${status}">${getStatusLabel(status)}</span>
          </div>
        </div>
        <div class="report-count">
          <span class="report-count-number">${reports.length}</span>
          <span class="report-count-label">신고</span>
        </div>
      </div>
    `;
  }).join('');
}

function openReportModal(commentId) {
  const comment = getCommentById(commentId);
  const reports = getReportsByCommentId(commentId);

  if (!comment) return;

  // 모달 내용 설정
  document.getElementById('modal-comment-text').textContent = comment.text;

  const time = comment.time ? new Date(comment.time.toDate?.() || comment.time).toLocaleString('ko-KR') : '알 수 없음';
  document.getElementById('modal-comment-meta').textContent = `작성일: ${time} • 테마: ${comment.themeId || 'basic'} • 작성자 UID: ${comment.uid.substring(0, 8)}...`;

  // 신고 사유별 카운트
  const reasonCounts = {};
  reports.forEach(r => {
    const reason = r.reason || 'unknown';
    reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
  });

  const reasonsHtml = Object.entries(reasonCounts)
    .map(([reason, count]) => `<div class="report-reason-item">${escapeHtml(getReasonLabel(reason))}: ${count}명</div>`)
    .join('');

  document.getElementById('modal-report-reasons').innerHTML = reasonsHtml;
  document.getElementById('modal-report-count').textContent = `${reports.length}명`;

  // 버튼 이벤트
  const approveBtn = document.getElementById('modal-approve-btn');
  const rejectBtn = document.getElementById('modal-reject-btn');

  if (approveBtn) {
    approveBtn.onclick = () => handleReportApprove(commentId);
  }

  if (rejectBtn) {
    rejectBtn.onclick = () => handleReportReject(commentId);
  }

  // 모달 표시
  const modal = document.getElementById('report-modal');
  if (modal) modal.hidden = false;
}

async function handleReportApprove(commentId) {
  if (!confirm('이 댓글을 삭제하시겠습니까?')) return;

  try {
    if (!window._firebase) return;

    const { db, updateDoc, docRef } = window._firebase;

    // 댓글 삭제
    await updateDoc(docRef(db, 'comments', commentId), { deleted: true });

    // 해당 댓글의 모든 신고를 "approved"로 업데이트
    const reportsToUpdate = currentReports.filter(r => r.commentId === commentId);
    for (const report of reportsToUpdate) {
      await updateDoc(docRef(db, 'reports', report.id), { status: 'approved' });
    }

    alert('댓글이 삭제되었습니다.');

    // 모달 닫기 및 목록 새로고침
    const modal = document.getElementById('report-modal');
    if (modal) modal.hidden = true;

    await loadReports();
    await loadComments();
    renderReportsList();
    updateStats();
  } catch (e) {
    console.error('Failed to approve report:', e);
    alert('처리 중 오류가 발생했습니다.');
  }
}

async function handleReportReject(commentId) {
  if (!confirm('이 신고를 반려하시겠습니까?')) return;

  try {
    if (!window._firebase) return;

    const { db, updateDoc, docRef } = window._firebase;

    // 해당 댓글의 모든 신고를 "rejected"로 업데이트
    const reportsToUpdate = currentReports.filter(r => r.commentId === commentId);
    for (const report of reportsToUpdate) {
      await updateDoc(docRef(db, 'reports', report.id), { status: 'rejected' });
    }

    alert('신고가 반려되었습니다.');

    const modal = document.getElementById('report-modal');
    if (modal) modal.hidden = true;

    await loadReports();
    await loadComments();
    renderReportsList();
    updateStats();
  } catch (e) {
    console.error('Failed to reject report:', e);
  }
}

function updateStats() {
  const totalReports = currentReports.length;
  // status가 없거나 "pending"인 신고들만 카운트 (처리 대기)
  const pendingReports = new Set(
    currentReports
      .filter(r => !r.status || r.status === 'pending')
      .map(r => r.commentId)
  ).size;
  const resolvedReports = currentComments.filter(c => c.deleted).length;

  document.getElementById('total-reports').textContent = totalReports;
  document.getElementById('pending-reports').textContent = pendingReports;
  document.getElementById('resolved-reports').textContent = resolvedReports;
}

function getReasonLabel(reason) {
  const labels = {
    'spam': '스팸',
    'badword': '욕설/혐오',
    'inappropriate': '부적절한 내용',
    'other': '기타'
  };
  return labels[reason] || reason;
}

function getStatusLabel(status) {
  const labels = {
    'pending': '대기 중',
    'approved': '승인됨',
    'rejected': '반려됨'
  };
  return labels[status] || '대기 중';
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
