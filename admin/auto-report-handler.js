// ── Auto Report Handler (자동 신고 처리) ───────────────────────────────
// 목업 구현: DB가 준비되면 실제 Firestore 업데이트로 교체

// 신고 사유별 가중치
const REPORT_WEIGHTS = {
  'badword': 3,      // 욕설/혐오: 높은 가중치
  'spam': 2,         // 스팸: 중간 가중치
  'inappropriate': 2, // 부적절한 내용: 중간 가중치
  'other': 1         // 기타: 낮은 가중치
};

// 자동 삭제 임계값
const AUTO_DELETE_THRESHOLDS = {
  reportCount: 5,    // 신고 5회 이상
  weightedScore: 5   // 가중치 합 5점 이상
};

/**
 * 신고에 대한 가중치 점수 계산
 * @param {Array} reports - commentId별 신고 배열
 * @returns {number} 총 가중치 점수
 */
function calculateReportScore(reports) {
  return reports.reduce((sum, report) => {
    const weight = REPORT_WEIGHTS[report.reason] || 1;
    return sum + weight;
  }, 0);
}

/**
 * 댓글이 자동 삭제 대상인지 판단
 * @param {Array} reports - commentId별 신고 배열
 * @returns {Object} { shouldDelete: boolean, reason: string, score: number }
 */
function shouldAutoDelete(reports) {
  if (!reports || reports.length === 0) {
    return {
      shouldDelete: false,
      reason: 'no reports',
      score: 0
    };
  }

  const reportCount = reports.length;
  const weightedScore = calculateReportScore(reports);

  // 신고 수 확인
  if (reportCount >= AUTO_DELETE_THRESHOLDS.reportCount) {
    return {
      shouldDelete: true,
      reason: `exceeded report count (${reportCount} >= ${AUTO_DELETE_THRESHOLDS.reportCount})`,
      score: weightedScore,
      reportCount
    };
  }

  // 가중치 점수 확인
  if (weightedScore >= AUTO_DELETE_THRESHOLDS.weightedScore) {
    return {
      shouldDelete: true,
      reason: `exceeded weighted score (${weightedScore} >= ${AUTO_DELETE_THRESHOLDS.weightedScore})`,
      score: weightedScore,
      reportCount
    };
  }

  return {
    shouldDelete: false,
    reason: 'within thresholds',
    score: weightedScore,
    reportCount
  };
}

/**
 * 모든 신고를 검사하고 자동 삭제 대상을 반환
 * @param {Array} allReports - 전체 신고 배열
 * @returns {Array} 자동 삭제 대상 [{commentId, reason, reports}]
 */
function findAutoDeleteCandidates(allReports) {
  // commentId별로 신고 그룹화
  const reportMap = {};
  allReports.forEach(report => {
    if (!reportMap[report.commentId]) {
      reportMap[report.commentId] = [];
    }
    reportMap[report.commentId].push(report);
  });

  const candidates = [];

  for (const [commentId, reports] of Object.entries(reportMap)) {
    const decision = shouldAutoDelete(reports);
    if (decision.shouldDelete) {
      candidates.push({
        commentId,
        decision,
        reports
      });
    }
  }

  return candidates;
}

/**
 * 자동 신고 처리 실행 (목업)
 * 실제 DB가 준비되면 Firestore updateDoc으로 교체
 *
 * @param {Array} allReports - 전체 신고 배열
 * @param {Array} allComments - 전체 댓글 배열
 * @returns {Promise<Object>} { processed: number, details: Array }
 */
async function executeAutoReportHandler(allReports, allComments) {
  console.log('[자동 신고 처리] 시작');

  const candidates = findAutoDeleteCandidates(allReports);

  if (candidates.length === 0) {
    console.log('[자동 신고 처리] 처리 대상 없음');
    return {
      processed: 0,
      details: [],
      timestamp: new Date().toISOString()
    };
  }

  const details = [];

  for (const candidate of candidates) {
    const { commentId, decision, reports } = candidate;
    const comment = allComments.find(c => c.id === commentId);

    const detail = {
      commentId,
      comment: comment?.text.substring(0, 50) || '(삭제됨)',
      reportCount: decision.reportCount,
      weightedScore: decision.score,
      reason: decision.reason,
      status: 'scheduled_for_deletion',
      timestamp: new Date().toISOString()
    };

    details.push(detail);

    console.log(`[자동 신고 처리] 댓글 삭제 대기열에 추가`);
    console.log(`  - commentId: ${commentId}`);
    console.log(`  - 신고 수: ${decision.reportCount}명`);
    console.log(`  - 가중치 점수: ${decision.score}점`);
    console.log(`  - 사유: ${decision.reason}`);
    console.log(`  - 텍스트: "${detail.comment}"`);

    // 🔮 실제 구현 시 (DB 준비 후):
    //
    // try {
    //   const { db, updateDoc, docRef } = window._firebase;
    //
    //   // 1. 댓글 삭제
    //   await updateDoc(docRef(db, 'comments', commentId), {
    //     deleted: true,
    //     autoDeleted: true,
    //     autoDeleteReason: decision.reason
    //   });
    //
    //   // 2. 신고들을 'auto_approved'로 업데이트
    //   for (const report of reports) {
    //     await updateDoc(docRef(db, 'reports', report.id), {
    //       status: 'auto_approved',
    //       processedAt: new Date()
    //     });
    //   }
    // } catch (error) {
    //   console.error(`[자동 신고 처리] 실패: ${commentId}`, error);
    //   detail.status = 'failed';
    //   detail.error = error.message;
    // }
  }

  console.log(`[자동 신고 처리] 완료: ${details.length}개 댓글 처리 대기`);

  return {
    processed: details.length,
    details,
    timestamp: new Date().toISOString()
  };
}

/**
 * 자동 처리 통계 조회
 * @param {Array} allReports - 전체 신고 배열
 * @returns {Object} 통계 데이터
 */
function getAutoHandlerStats(allReports) {
  const reportMap = {};
  allReports.forEach(report => {
    if (!reportMap[report.commentId]) {
      reportMap[report.commentId] = [];
    }
    reportMap[report.commentId].push(report);
  });

  let atRiskCount = 0;
  let highRiskCount = 0;

  for (const reports of Object.values(reportMap)) {
    const decision = shouldAutoDelete(reports);

    // 임계값의 70% 이상: 위험 (노란색)
    const reportThreshold = AUTO_DELETE_THRESHOLDS.reportCount * 0.7;
    const weightThreshold = AUTO_DELETE_THRESHOLDS.weightedScore * 0.7;

    if (!decision.shouldDelete) {
      if (decision.reportCount >= reportThreshold || decision.score >= weightThreshold) {
        atRiskCount++;
      }
    } else {
      highRiskCount++;
    }
  }

  return {
    autoDeleteThresholds: AUTO_DELETE_THRESHOLDS,
    reportWeights: REPORT_WEIGHTS,
    highRiskCount,
    atRiskCount,
    totalComments: Object.keys(reportMap).length
  };
}

/**
 * 디버그: 신고 분석 결과 출력
 * @param {Array} allReports - 전체 신고 배열
 * @param {Array} allComments - 전체 댓글 배열
 */
function debugReportAnalysis(allReports, allComments) {
  console.group('[자동 신고 처리] 상세 분석');

  const reportMap = {};
  allReports.forEach(report => {
    if (!reportMap[report.commentId]) {
      reportMap[report.commentId] = [];
    }
    reportMap[report.commentId].push(report);
  });

  for (const [commentId, reports] of Object.entries(reportMap)) {
    const decision = shouldAutoDelete(reports);
    const comment = allComments.find(c => c.id === commentId);

    console.group(`댓글 ${commentId}`);
    console.log(`텍스트: "${comment?.text.substring(0, 50) || '(삭제됨)'}"`);
    console.log(`신고 수: ${reports.length}`);
    console.log(`가중치: ${REPORT_WEIGHTS[reports[0]?.reason] || 1} × ${reports.length}`);
    console.log(`총 점수: ${decision.score}`);
    console.log(`판정: ${decision.shouldDelete ? '❌ 자동 삭제' : '✅ 유지'}`);
    console.log(`사유: ${decision.reason}`);
    console.groupEnd();
  }

  console.groupEnd();
}
