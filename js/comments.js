// ── Comments ───────────────────────────────────────────────────
function getCurrentThemeId() {
  return localStorage.getItem('pl_theme') || 'basic';
}

async function ensureAuth() {
  if (_currentUid) return _currentUid;
  const { auth, signInAnonymously } = window._firebase;
  const cred = await signInAnonymously(auth);
  _currentUid = cred.user.uid;
  return _currentUid;
}

function validateComment(text) {
  if (!text || text.trim().length === 0) return getLocaleString('emptyComment') || '내용을 입력하세요.';
  if (text.length > COMMENT_MAX) return (getLocaleString('commentTooLong') || '100자 이하로 입력하세요.').replace('100', COMMENT_MAX);
  if (/https?:\/\//i.test(text) || /www\./i.test(text)) return getLocaleString('urlNotAllowed') || 'URL은 입력할 수 없습니다.';
  if (/(.)\1{9,}/.test(text)) return getLocaleString('tooManyRepeats') || '반복 문자가 너무 많습니다.';
  if (containsBadword(text)) return getLocaleString('badwordBlocked') || '부적절한 표현이 포함되어 있습니다.';
  return null;
}

function showCommentError(msg) {
  const el = $('#comment-error');
  if (!el) return;
  el.textContent = msg || '';
}

function startCooldown(btn) {
  let remaining = COMMENT_COOLDOWN / 1000;
  btn.disabled = true;
  const label = getLocaleString('submit') || '등록';
  const timer = setInterval(() => {
    remaining--;
    btn.textContent = `${remaining}s`;
    if (remaining <= 0) {
      clearInterval(timer);
      btn.disabled = false;
      btn.textContent = label;
    }
  }, 1000);
}

function createCommentEl(c, isReply) {
  const { db, updateDoc, docRef } = window._firebase;
  const el = document.createElement('div');
  el.className = isReply ? 'comment-item comment-reply' : 'comment-item';
  el.dataset.id = c.id;

  const meta = document.createElement('div'); meta.className = 'comment-meta';
  const t = c.time ? c.time.toDate() : new Date();
  meta.textContent = t.toLocaleString(undefined, {year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false});

  const body = document.createElement('div'); body.className = 'comment-body';
  if (c.deleted) {
    body.textContent = getLocaleString('deletedComment') || '[삭제된 댓글]';
    body.classList.add('deleted');
  } else {
    body.textContent = c.text;
  }

  el.appendChild(meta); el.appendChild(body);

  const actions = document.createElement('div'); actions.className = 'comment-actions';

  if (!c.deleted) {
    const translateBtn = document.createElement('button');
    translateBtn.className = 'comment-translate-btn';
    translateBtn.textContent = '🔗';
    translateBtn.title = getLocaleString('translate') || '번역';
    translateBtn.addEventListener('click', () => openTranslateModal(c.text));
    actions.appendChild(translateBtn);
  }

  if (!isReply) {
    const replyBtn = document.createElement('button');
    replyBtn.className = 'comment-reply-btn';
    replyBtn.textContent = '💬 ' + (getLocaleString('reply') || '답글');
    replyBtn.addEventListener('click', () => toggleReplyForm(c.id, el));
    actions.appendChild(replyBtn);
  }

  if (_currentUid && c.uid === _currentUid && !c.deleted) {
    const del = document.createElement('button');
    del.className = 'comment-delete';
    del.textContent = '×';
    del.title = getLocaleString('deleteComment') || '댓글 삭제';

    let deleteConfirmed = false;
    let deleteTimer = null;

    del.addEventListener('click', async () => {
      if (!deleteConfirmed) {
        deleteConfirmed = true;
        const origText = del.textContent;
        del.textContent = getLocaleString('confirmDeleteComment') || '정말 삭제?';
        del.classList.add('confirm');
        deleteTimer = setTimeout(() => {
          deleteConfirmed = false;
          del.textContent = origText;
          del.classList.remove('confirm');
        }, 2000);
      } else {
        clearTimeout(deleteTimer);
        try {
          del.disabled = true;
          await updateDoc(docRef(db, 'comments', c.id), { deleted: true });
          showToast(getLocaleString('deleteSuccess') || '댓글이 삭제되었습니다', 'success');
        } catch (e) {
          showToast(getLocaleString('deleteFailed') || '삭제에 실패했습니다', 'error');
          console.error(e);
          del.disabled = false;
          deleteConfirmed = false;
          del.textContent = '×';
          del.classList.remove('confirm');
        }
      }
    });
    actions.appendChild(del);
  }

  if (!c.deleted) {
    const reportBtn = document.createElement('button');
    reportBtn.className = 'comment-report-btn';
    reportBtn.textContent = '🚩';
    reportBtn.title = getLocaleString('reportComment') || '댓글 신고';
    reportBtn.addEventListener('click', () => openReportModal(c.id, c.text));
    actions.appendChild(reportBtn);
  }

  if (actions.children.length > 0) el.appendChild(actions);
  return el;
}

function toggleReplyForm(parentId, parentEl) {
  const existing = parentEl.querySelector('.reply-form');
  if (existing) { existing.remove(); return; }

  const { db, collection: col, addDoc, serverTimestamp } = window._firebase;

  const form = document.createElement('div'); form.className = 'reply-form';
  const ta = document.createElement('textarea');
  ta.className = 'textarea'; ta.rows = 2; ta.maxLength = COMMENT_MAX;
  ta.placeholder = getLocaleString('replyPlaceholder') || '답글을 입력하세요 (익명)';

  const rowMeta = document.createElement('div'); rowMeta.className = 'reply-meta-row';
  const charEl = document.createElement('span'); charEl.className = 'reply-char-count'; charEl.textContent = `0 / ${COMMENT_MAX}`;
  rowMeta.appendChild(charEl);

  ta.addEventListener('input', () => {
    const len = ta.value.length;
    charEl.textContent = `${len} / ${COMMENT_MAX}`;
    charEl.classList.toggle('warn', len >= 90);
  });

  const btnRow = document.createElement('div'); btnRow.className = 'reply-actions';
  const submitBtn = document.createElement('button'); submitBtn.className = 'btn'; submitBtn.type = 'button';
  submitBtn.textContent = getLocaleString('submit') || '등록';
  const cancelBtn = document.createElement('button'); cancelBtn.className = 'btn ghost'; cancelBtn.type = 'button';
  cancelBtn.textContent = getLocaleString('cancel') || '취소';
  cancelBtn.addEventListener('click', () => form.remove());

  submitBtn.addEventListener('click', async () => {
    const text = ta.value.trim();
    const err = validateComment(text);
    if (err) { charEl.style.color = 'var(--error, #e53e3e)'; charEl.textContent = err; return; }

    const now = Date.now();
    const elapsed = now - _lastCommentTime;
    if (_lastCommentTime && elapsed < COMMENT_COOLDOWN) {
      charEl.style.color = 'var(--error, #e53e3e)';
      const wait = Math.ceil((COMMENT_COOLDOWN - elapsed) / 1000);
      charEl.textContent = `${wait}${getLocaleString('cooldownWait') || '초 후 시도하세요.'}`;
      return;
    }

    try {
      submitBtn.disabled = true;
      const uid = await ensureAuth();
      await addDoc(col(db, 'comments'), {
        text, uid,
        time: serverTimestamp(),
        parentId,
        themeId: getCurrentThemeId()
      });
      _lastCommentTime = Date.now();
      form.remove();
    } catch (e) {
      charEl.style.color = 'var(--error, #e53e3e)';
      charEl.textContent = '등록 실패. 다시 시도하세요.';
      submitBtn.disabled = false;
    }
  });

  btnRow.appendChild(submitBtn); btnRow.appendChild(cancelBtn);
  form.appendChild(ta); form.appendChild(rowMeta); form.appendChild(btnRow);

  const repliesEl = parentEl.querySelector('.comment-replies');
  if (repliesEl) parentEl.insertBefore(form, repliesEl);
  else parentEl.appendChild(form);
  ta.focus();
}

function renderCommentsList(comments) {
  _cachedComments = comments;
  const lists = [$('#comment-list'), $('#mobile-comment-list')].filter(l => l);
  if (lists.length === 0) return;

  const themeId = getCurrentThemeId();
  const themed = comments.filter(c => (c.themeId || 'basic') === themeId);

  lists.forEach(list => {
    list.innerHTML = '';
    if (themed.length === 0) {
      list.innerHTML = `<div class="comment-empty">${getLocaleString('noComments') || '아직 댓글이 없습니다.'}</div>`;
      return;
    }
    const topLevel = themed.filter(c => !c.parentId);
    const replies = themed.filter(c => !!c.parentId);
    topLevel.forEach(c => {
      const el = createCommentEl(c, false);
      const myReplies = replies.filter(r => r.parentId === c.id);
      if (myReplies.length > 0) {
        const repliesEl = document.createElement('div'); repliesEl.className = 'comment-replies';
        myReplies.forEach(r => repliesEl.appendChild(createCommentEl(r, true)));
        el.appendChild(repliesEl);
      }
      list.appendChild(el);
    });
  });
}

function showCommentLoading(){
  const lists = [$('#comment-list'), $('#mobile-comment-list')].filter(l => l);
  lists.forEach(list => {
    list.innerHTML = `<div class="comment-loading">로딩 중...</div>`;
  });
}

function showCommentListError(){
  const lists = [$('#comment-list'), $('#mobile-comment-list')].filter(l => l);
  lists.forEach(list => {
    list.innerHTML = `<div class="comment-error">${getLocaleString('connectionError') || '접속이 안 됩니다'}</div>`;
  });
}

function renderComments() { renderCommentsList(_cachedComments); }

function openTranslateModal(text) {
  const modal = document.getElementById('translate-modal');
  const origEl = document.getElementById('translate-original');
  const googleBtn = document.getElementById('translate-google');
  if (!modal) return;
  origEl.textContent = text;
  modal.setAttribute('aria-hidden', 'false');
  if (googleBtn) {
    googleBtn.onclick = () => {
      const targetLang = CURRENT_LANG || 'ko';
      const encodedText = encodeURIComponent(text);
      const url = `https://translate.google.com/?sl=auto&tl=${targetLang}&text=${encodedText}&op=translate`;
      window.open(url, '_blank');
    };
  }
}

function closeTranslateModal() {
  const modal = document.getElementById('translate-modal');
  if (modal) modal.setAttribute('aria-hidden', 'true');
}

function openReportModal(commentId, commentText) {
  const modal = document.getElementById('report-modal');
  if (!modal) return;
  document.getElementById('report-comment-id').value = commentId;
  document.getElementById('report-comment-text').textContent = commentText;
  document.querySelectorAll('input[name="report-reason"]').forEach(r => r.checked = false);
  modal.setAttribute('aria-hidden', 'false');
}

function closeReportModal() {
  const modal = document.getElementById('report-modal');
  if (modal) modal.setAttribute('aria-hidden', 'true');
}

async function submitReport() {
  const { db, collection: col, addDoc, serverTimestamp } = window._firebase;
  const commentId = document.getElementById('report-comment-id').value;
  const reason = document.querySelector('input[name="report-reason"]:checked')?.value;

  if (!reason) {
    showToast(getLocaleString('selectReportReason') || '신고 사유를 선택해주세요', 'error');
    return;
  }

  try {
    const uid = await ensureAuth();
    await addDoc(col(db, 'reports'), {
      commentId,
      reason,
      uid,
      time: serverTimestamp(),
      themeId: getCurrentThemeId()
    });
    showToast(getLocaleString('reportSuccess') || '신고되었습니다. 감사합니다!', 'success');
    closeReportModal();
  } catch (e) {
    showToast(getLocaleString('reportFailed') || '신고에 실패했습니다', 'error');
    console.error(e);
  }
}

function subscribeComments() {
  if (!window._firebase) return;
  if (_unsubscribeComments) { _unsubscribeComments(); _unsubscribeComments = null; }
  showCommentLoading();
  const { db, collection: col, onSnapshot, query, orderBy, limit } = window._firebase;
  const q = query(col(db, 'comments'), orderBy('time', 'desc'), limit(200));
  _unsubscribeComments = onSnapshot(
    q,
    snap => renderCommentsList(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    error => showCommentListError()
  );
}

function initComments() {
  if (!window._firebase) {
    $('#comment-list').innerHTML = '<div class="comment-empty">댓글 기능 준비 중입니다.</div>'; return;
  }
  const { db, collection: col, addDoc, serverTimestamp } = window._firebase;
  const form = $('#comment-form');
  const input = $('#comment-input');
  const submitBtn = $('#comment-submit');
  const charCount = $('#comment-char-count');

  if (!form || !input || !submitBtn || !charCount) {
    console.warn('Comment elements not found');
    return;
  }

  charCount.textContent = `0 / ${COMMENT_MAX}`;

  input.addEventListener('input', () => {
    const len = input.value.length;
    charCount.textContent = `${len} / ${COMMENT_MAX}`;
    charCount.classList.toggle('warn', len >= 90);
    showCommentError('');
  });

  ensureAuth().then(() => subscribeComments());

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (_submitting) return;

    const text = input.value.trim();
    const err = validateComment(text);
    if (err) { showCommentError(err); return; }

    const now = Date.now();
    const elapsed = now - _lastCommentTime;
    if (_lastCommentTime && elapsed < COMMENT_COOLDOWN) {
      const wait = Math.ceil((COMMENT_COOLDOWN - elapsed) / 1000);
      showCommentError(`${wait}${getLocaleString('cooldownWait') || '초 후에 다시 시도하세요.'}`);
      return;
    }

    try {
      _submitting = true;
      submitBtn.disabled = true;
      const uid = await ensureAuth();
      await addDoc(col(db, 'comments'), {
        text, uid,
        time: serverTimestamp(),
        parentId: null,
        themeId: getCurrentThemeId()
      });
      input.value = '';
      charCount.textContent = `0 / ${COMMENT_MAX}`;
      showCommentError('');
      _lastCommentTime = Date.now();
      startCooldown(submitBtn);
    } catch (err) {
      showCommentError('등록에 실패했습니다. 다시 시도해주세요.');
      submitBtn.disabled = false;
    } finally {
      _submitting = false;
    }
  });
}
