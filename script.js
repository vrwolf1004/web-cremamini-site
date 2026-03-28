// Themes manifest will be loaded dynamically from theme/themes.json
let THEMES = [];
let LOCALE = null;
let CURRENT_LANG = 'en';
const FALLBACK_THEMES = [
  { id: 'minimalism', name: 'Minimalism', category: 'Neutral' },
  { id: 'light', name: 'Light', category: 'Neutral' },
  { id: 'dark', name: 'Dark', category: 'Neutral' },
  { id: 'midcentury', name: 'Midcentury', category: 'Classic' },
  { id: 'scandinavian', name: 'Scandinavian', category: 'Classic' },
  { id: 'bauhaus', name: 'Bauhaus', category: 'Classic' },
  { id: 'cyberpunk', name: 'Cyberpunk', category: 'Trendy' },
  { id: 'vaporwave', name: 'Vaporwave', category: 'Trendy' },
  { id: 'retro', name: 'Retro', category: 'Trendy' },
  { id: 'biophilic', name: 'Biophilic', category: 'Nature' },
  { id: 'coastal', name: 'Coastal', category: 'Nature' },
  { id: 'organic', name: 'Organic', category: 'Nature' }
];

async function loadThemesManifest(){
  try{
    const res = await fetch('theme/themes.json', {cache: 'no-cache'});
    if(!res.ok) throw new Error('HTTP ' + res.status);
    THEMES = await res.json();
  }catch(e){
    console.warn('themes.json load failed, using fallback themes', e);
    THEMES = FALLBACK_THEMES;
  }
}

async function loadLocale(lang){
  if(!lang) lang = 'en';
  if(LOCALE && CURRENT_LANG===lang) return LOCALE;
  try{
    const res = await fetch(`i18n/${lang}.json`, {cache: 'no-cache'});
    if(!res.ok) throw new Error('HTTP '+res.status);
    LOCALE = await res.json(); CURRENT_LANG = lang; return LOCALE;
  }catch(e){ console.warn('locale load failed', e); LOCALE = null; return null }
}

function applyTranslations(){
  if(!LOCALE) return;
  // text nodes
  $all('[data-i18n]').forEach(el=>{
    const key = el.getAttribute('data-i18n');
    const v = getLocaleString(key);
    if(v !== undefined && v !== null) el.textContent = v;
  });
  // placeholders
  $all('[data-i18n-placeholder]').forEach(el=>{
    const key = el.getAttribute('data-i18n-placeholder');
    const v = getLocaleString(key);
    if(v !== undefined && v !== null) el.setAttribute('placeholder', v);
  });
  // update lang select UI label (if present)
  const langSelect = document.getElementById('lang-select');
  if(langSelect) langSelect.value = CURRENT_LANG;
  // update menu icon to match language
  updateMenuIcon(CURRENT_LANG);
}

// helper to resolve dotted keys like "fruit.apple" from LOCALE
function getLocaleString(key){
  if(!key || !LOCALE) return null;
  // if exact match exists, return
  if(Object.prototype.hasOwnProperty.call(LOCALE, key)) return LOCALE[key];
  // support dotted path
  const parts = key.split('.');
  let cur = LOCALE;
  for(const p of parts){
    if(cur && Object.prototype.hasOwnProperty.call(cur, p)) cur = cur[p];
    else { cur = undefined; break; }
  }
  return cur;
}

function $(sel){return document.querySelector(sel)}
function $all(sel){return Array.from(document.querySelectorAll(sel))}

const DARK_THEMES = ['dark','cyberpunk'];
// 언어별 메뉴 아이콘 (테마와 무관)
const MENU_ICON_MAP_LANG = {
  'ko': 'menu-basic.svg',      // 한국어 - 햄버거
  'en': 'menu-basic.svg',      // 영어 - 햄버거
  'ja': 'menu-vaporwave.svg',  // 일본어 - 라면
  'zh': 'menu-vaporwave.svg',  // 중국어 - 라면
  'fr': 'menu-rococo.svg',     // 프랑스어 - 크루아상
  'es': 'menu-newtro.svg',     // 스페인어 - 피자
  'de': 'menu-bauhaus.svg',    // 독일어 - 프레첼
  'it': 'menu-newtro.svg',     // 이탈리아어 - 피자
  'ru': 'menu-cyberpunk.svg',  // 러시아어 - 라면
  'fi': 'menu-flat.svg'        // 핀란드어 - 샌드위치
};

function updateMenuIcon(lang){
  const menuIcon = document.getElementById('menu-icon');
  if(!menuIcon) return;
  const iconFile = MENU_ICON_MAP_LANG[lang] || 'menu-basic.svg';
  menuIcon.src = 'assets/' + iconFile;
}

function setTheme(id){
  // load theme CSS then set class & UI state
  loadThemeCss(id);
  document.body.className = 'theme-' + id;
  document.documentElement.style.colorScheme = DARK_THEMES.includes(id) ? 'dark' : 'light';
  localStorage.setItem('pl_theme', id);
  $all('#theme-list button').forEach(b=>b.classList.toggle('selected', b.dataset.id===id));
  // mobile menu 테마 버튼도 업데이트
  const mobileMenuThemeList = document.getElementById('mobile-menu-theme-list');
  if(mobileMenuThemeList) mobileMenuThemeList.querySelectorAll('button').forEach(b=>b.classList.toggle('selected', b.dataset.id===id));
  const sel = $('#theme-select'); if(sel) sel.value = id;
  // update intro area when theme changes
  try{ renderThemeIntro(id); }catch(e){}
  // 테마가 바뀌면 댓글 목록 갱신 (테마별 필터)
  try{ renderComments(); }catch(e){}
}

function renderThemePicker(){
  const list = $('#theme-list');
  const select = $('#theme-select');
  THEMES.forEach(t=>{
    const btn = document.createElement('button');
    btn.type='button'; btn.textContent=t.name; btn.dataset.id=t.id;
    btn.addEventListener('click', ()=> setTheme(t.id));
    list.appendChild(btn);
    const opt = document.createElement('option'); opt.value=t.id; opt.textContent=`${t.name} — ${t.category}`; select.appendChild(opt);
  });
  // mobile select
  select.addEventListener('change', ()=> setTheme(select.value));
  const saved = localStorage.getItem('pl_theme') || 'basic'; setTheme(saved);
}

function renderThemeIntro(selectedId){
  const container = document.getElementById('theme-intro');
  const pageTitle = document.getElementById('page-title');
  if(!container) return;
  if(!selectedId){
    // show list of all (use localized header)
    const header = (LOCALE && LOCALE['themeListHeader']) ? LOCALE['themeListHeader'] : 'Theme introductions';
    container.innerHTML = `<h4>${header}</h4><ul>${THEMES.map(t=>`<li><strong>${t.name}</strong> — ${getLocalizedThemeDesc(t.id,t.description)}</li>`).join('')}</ul>`;
    if(pageTitle) pageTitle.textContent = (LOCALE && LOCALE['pageTitle']) ? LOCALE['pageTitle'] : 'Sample Page';
    return;
  }
  const t = THEMES.find(x=>x.id===selectedId) || FALLBACK_THEMES.find(x=>x.id===selectedId);
  if(t){
    // don't duplicate the main title — show only description here
    container.innerHTML = `<p>${getLocalizedThemeDesc(t.id,t.description)}</p>`;
    if(pageTitle) pageTitle.textContent = (LOCALE && LOCALE['pageTitle']) ? t.name : t.name;
  }else{
    container.innerHTML = `<h4>테마</h4><p>설명 없음</p>`;
    if(pageTitle) pageTitle.textContent = '샘플 페이지';
  }
}

function getLocalizedThemeDesc(id,fallback){
  if(LOCALE && LOCALE.themes && LOCALE.themes[id]) return LOCALE.themes[id];
  return fallback || '';
}

/* Toast utility */
function showToast(message, type='info', timeout=3000){
  let container = document.getElementById('toast-container');
  if(!container){
    container = document.createElement('div'); container.id='toast-container'; container.className='toast-container'; document.body.appendChild(container);
  }
  const toast = document.createElement('div'); toast.className = 'toast ' + type; toast.textContent = message;
  container.appendChild(toast);
  // enter animation
  requestAnimationFrame(()=> toast.classList.add('visible'));
  const tid = setTimeout(()=>{ toast.classList.remove('visible'); setTimeout(()=> toast.remove(),300); }, timeout);
  toast.addEventListener('click', ()=>{ clearTimeout(tid); toast.classList.remove('visible'); setTimeout(()=> toast.remove(),200); });
}

function initToasts(){
  const b = document.getElementById('show-toast');
  const s = document.getElementById('show-success-toast');
  const e = document.getElementById('show-error-toast');
  if(b) b.addEventListener('click', ()=> showToast((LOCALE && LOCALE.toastInfo) || '간단한 안내 메시지입니다.'));
  if(s) s.addEventListener('click', ()=> showToast((LOCALE && LOCALE.toastSuccess) || '성공했습니다', 'success'));
  if(e) e.addEventListener('click', ()=> showToast((LOCALE && LOCALE.toastError) || '오류가 발생했습니다', 'error'));
}

/* Firebase comment system */
let _cachedComments = [];
let _currentUid = null;
let _lastCommentTime = 0;
let _submitting = false;
let _currentThemeId = 'basic';
let _unsubscribeComments = null;
const COMMENT_MAX = 100;
const COMMENT_COOLDOWN = 30000; // 30초

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
    body.textContent = c.text; // textContent로 XSS 방지
  }

  el.appendChild(meta); el.appendChild(body);

  const actions = document.createElement('div'); actions.className = 'comment-actions';

  // 번역 버튼 (삭제되지 않은 댓글만)
  if (!c.deleted) {
    const translateBtn = document.createElement('button');
    translateBtn.className = 'comment-translate-btn';
    translateBtn.textContent = '🔗';
    translateBtn.title = getLocaleString('translate') || '번역';
    translateBtn.addEventListener('click', () => {
      openTranslateModal(c.text);
    });
    actions.appendChild(translateBtn);
  }

  // 답글 버튼 (최상위 댓글에만)
  if (!isReply) {
    const replyBtn = document.createElement('button');
    replyBtn.className = 'comment-reply-btn';
    replyBtn.textContent = getLocaleString('reply') || '답글';
    replyBtn.addEventListener('click', () => toggleReplyForm(c.id, el));
    actions.appendChild(replyBtn);
  }

  // 삭제 버튼 (본인 댓글만, 이미 삭제된 댓글은 제외)
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

  // replies 영역 이전에 삽입 (없으면 el 끝에)
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

function showCommentError(){
  const lists = [$('#comment-list'), $('#mobile-comment-list')].filter(l => l);
  lists.forEach(list => {
    list.innerHTML = `<div class="comment-error">접속이 안 됩니다</div>`;
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

  // Google Translate 링크 설정
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

function subscribeComments() {
  if (!window._firebase) return;
  if (_unsubscribeComments) { _unsubscribeComments(); _unsubscribeComments = null; }
  showCommentLoading();
  const { db, collection: col, onSnapshot, query, orderBy, limit } = window._firebase;
  const q = query(col(db, 'comments'), orderBy('time', 'desc'), limit(200));
  _unsubscribeComments = onSnapshot(
    q,
    snap => renderCommentsList(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    error => showCommentError()
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

  // 요소 검증
  if (!form || !input || !submitBtn || !charCount) {
    console.warn('Comment elements not found');
    return;
  }

  // 글자 수 카운터 초기값 설정
  charCount.textContent = `0 / ${COMMENT_MAX}`;

  // 글자 수 카운터 + 에러 초기화
  input.addEventListener('input', () => {
    const len = input.value.length;
    charCount.textContent = `${len} / ${COMMENT_MAX}`;
    charCount.classList.toggle('warn', len >= 90);
    showCommentError('');
  });

  // 실시간 댓글 리스너 시작
  ensureAuth().then(() => subscribeComments());

  // 댓글 등록
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

document.addEventListener('DOMContentLoaded', ()=>{
  // load manifest first, then render picker
  // load chosen language first (URL ?lang= -> localStorage -> navigator), then themes and UI
  const urlParams = new URLSearchParams(location.search);
  const urlLang = urlParams.get('lang');
  const initialLang = urlLang || localStorage.getItem('pl_lang') || (navigator.language||'en').slice(0,2);
  // ensure URL reflects chosen lang for shareability
  if(!urlLang){ const u = new URL(location); u.searchParams.set('lang', initialLang); history.replaceState({}, '', u); }
  loadLocale(initialLang).then(()=>{
    applyTranslations();
    loadThemesManifest().then(()=>{
      renderThemePicker(); initComments();
      initFormSamples();
      initDataTable();
      initConfirmDialog();
      initToasts();
      initTabs();
      initAccordion();
      initMobileAccordion();
      initMobileCommentForm();
      // language selector handler
      const langSelect = document.getElementById('lang-select');
      if(langSelect){
        langSelect.addEventListener('change', async (e)=>{
          const L = e.target.value;
          localStorage.setItem('pl_lang', L);
          // update URL for sharing
          const u = new URL(location); u.searchParams.set('lang', L); history.replaceState({}, '', u);
          await loadLocale(L);
          applyTranslations();
          renderThemeIntro(localStorage.getItem('pl_theme') || null);
          // mobile menu 언어 버튼도 업데이트
          const mobileMenuLangSelect = document.getElementById('mobile-menu-lang-select');
          if(mobileMenuLangSelect) mobileMenuLangSelect.querySelectorAll('button').forEach(b=>b.classList.toggle('selected', b.dataset.lang===L));
          // re-render comments to pick up translated "no comments" and other dynamic text
          try{ renderComments(); }catch(e){}
          initDataTable();
        });
      }
      // initial intro: show all or selected
      const saved = localStorage.getItem('pl_theme');
      const initialTheme = saved || 'basic';

      // Hide loading overlay after theme CSS is fully loaded + minimum 2s for animation loop
      const loadingOverlay = document.getElementById('loading-overlay');
      const startTime = Date.now();
      loadThemeCss(initialTheme, () => {
        const elapsed = Date.now() - startTime;
        const minWaitTime = 2000; // One complete animation loop
        const remainingWait = Math.max(0, minWaitTime - elapsed);
        setTimeout(() => {
          if(loadingOverlay) {
            loadingOverlay.classList.add('hidden');
            setTimeout(() => loadingOverlay.style.display = 'none', 200);
          }
        }, remainingWait);
      });

      renderThemeIntro(initialTheme);

      // mobile menu button and panels (after THEMES loaded)
      const mobileMenuBtn = document.getElementById('mobile-menu-btn');
      const mobileMenuPanel = document.getElementById('mobile-menu-panel');
      const mobileMenuThemeList = document.getElementById('mobile-menu-theme-list');
      const mobileMenuLangSelect = document.getElementById('mobile-menu-lang-select');
      const mobileThemePanel = document.getElementById('mobile-theme-panel');
      const mobileLangPanel = document.getElementById('mobile-lang-panel');
      const mobileLangSelect = document.getElementById('mobile-lang-select');
      const mobileThemeList = document.getElementById('mobile-theme-list');
      const mobileThemeSelect = document.getElementById('mobile-theme-select');

      // menu button toggle
      if(mobileMenuBtn && mobileMenuPanel){
        mobileMenuBtn.addEventListener('click', ()=> {
          openMobilePanel('mobile-menu-panel');
          // 메뉴 열 때 현재 선택 상태 업데이트
          const currentTheme = localStorage.getItem('pl_theme') || THEMES[0].id;
          mobileMenuThemeList.querySelectorAll('button').forEach(b=> b.classList.toggle('selected', b.dataset.id===currentTheme));
          const desktopLang = document.getElementById('lang-select');
          const currentLang = desktopLang ? desktopLang.value : CURRENT_LANG;
          mobileMenuLangSelect.querySelectorAll('button').forEach(b=> b.classList.toggle('selected', b.dataset.lang===currentLang));
        });
        mobileMenuPanel.querySelectorAll('[data-target]').forEach(b=> b.addEventListener('click', (e)=> closeMobilePanel(e.target.dataset.target)));
      }

      // 저장 버튼

      // 모바일 메뉴 - 댓글 보기 버튼
      const mobileMenuCommentsBtn = document.getElementById('mobile-menu-comments');
      if(mobileMenuCommentsBtn){
        mobileMenuCommentsBtn.addEventListener('click', ()=> {
          closeMobilePanel('mobile-menu-panel');
          const commentsPanel = document.getElementById('comments-panel');
          if(commentsPanel){
            commentsPanel.setAttribute('aria-hidden', 'false');
            commentsPanel.removeAttribute('inert');
          }
        });
      }

      // populate menu theme list with current selection highlighted
      if(mobileMenuThemeList){
        const currentTheme = localStorage.getItem('pl_theme') || THEMES[0].id;
        THEMES.forEach(t=>{
          const btn = document.createElement('button');
          btn.type='button';
          btn.textContent=t.name;
          btn.dataset.id=t.id;
          if(t.id === currentTheme) btn.classList.add('selected');
          btn.addEventListener('click', ()=>{ setTheme(t.id); });
          mobileMenuThemeList.appendChild(btn);
        });
      }

      // populate menu lang buttons with current language highlighted
      if(mobileMenuLangSelect){
        const desktopLang = document.getElementById('lang-select');
        const currentLang = desktopLang ? desktopLang.value : CURRENT_LANG;
        if(desktopLang){
          Array.from(desktopLang.options).forEach(o=>{
            const btn = document.createElement('button');
            btn.type='button';
            btn.textContent=o.textContent;
            btn.dataset.lang=o.value;
            if(o.value === currentLang) btn.classList.add('selected');
            btn.classList.add('lang-btn');
            btn.addEventListener('click', async (e)=>{ const L=o.value; localStorage.setItem('pl_lang', L); const u=new URL(location); u.searchParams.set('lang', L); history.replaceState({},'',u); await loadLocale(L); applyTranslations(); renderThemeIntro(localStorage.getItem('pl_theme')||null); renderComments(); mobileMenuLangSelect.querySelectorAll('button').forEach(b=>b.classList.toggle('selected', b.dataset.lang===L)); });
            mobileMenuLangSelect.appendChild(btn);
          });
        }
      }

      // close panels when selecting from theme/lang
      if(mobileThemePanel){ mobileThemePanel.querySelectorAll('[data-target]').forEach(b=> b.addEventListener('click', (e)=> closeMobilePanel(e.target.dataset.target))); }
      if(mobileLangPanel){ mobileLangPanel.querySelectorAll('[data-target]').forEach(b=> b.addEventListener('click', (e)=> closeMobilePanel(e.target.dataset.target))); }

      // populate mobile lang select to mirror desktop
      if(mobileLangSelect){
        const desktopLang = document.getElementById('lang-select');
        if(desktopLang){
          Array.from(desktopLang.options).forEach(o=> mobileLangSelect.appendChild(o.cloneNode(true)));
          mobileLangSelect.value = desktopLang.value;
          mobileLangSelect.addEventListener('change', async (e)=>{ const L=e.target.value; localStorage.setItem('pl_lang', L); const u=new URL(location); u.searchParams.set('lang', L); history.replaceState({},'',u); await loadLocale(L); applyTranslations(); renderThemeIntro(localStorage.getItem('pl_theme')||null); renderComments(); closeMobilePanel('mobile-lang-panel'); });
        }
      }
      // populate mobile theme list/select
      if(mobileThemeList && mobileThemeSelect){
        THEMES.forEach(t=>{
          const btn = document.createElement('button'); btn.type='button'; btn.textContent=t.name; btn.dataset.id=t.id; btn.addEventListener('click', ()=>{ setTheme(t.id); });
          mobileThemeList.appendChild(btn);
          const opt = document.createElement('option'); opt.value=t.id; opt.textContent=t.name; mobileThemeSelect.appendChild(opt);
        });
        mobileThemeSelect.addEventListener('change', ()=>{ setTheme(mobileThemeSelect.value); });
      }
    });
  });

  // comments binder toggle
  const commentsToggle = document.getElementById('comments-toggle');
  const commentsPanel = document.getElementById('comments-panel');
  if(commentsToggle && commentsPanel){
    commentsToggle.addEventListener('click', ()=>{ commentsPanel.classList.toggle('open'); const isOpen = commentsPanel.classList.contains('open'); commentsPanel.setAttribute('aria-hidden', isOpen ? 'false' : 'true'); if(isOpen){ document.body.style.overflow='hidden'; closeMobilePanel('mobile-menu-panel'); } else { document.body.style.overflow=''; } });
  }

  // 번역 모달 닫기
  const translateCloseBtn = document.getElementById('translate-close');
  if (translateCloseBtn) {
    translateCloseBtn.addEventListener('click', closeTranslateModal);
  }
  const translateModal = document.getElementById('translate-modal');
  if (translateModal) {
    const backdrop = translateModal.querySelector('.modal-backdrop');
    if (backdrop) backdrop.addEventListener('click', closeTranslateModal);
  }

  // close mobile panel helper functions
  function openMobilePanel(id){
    const p=document.getElementById(id);
    if(!p) return;
    p.setAttribute('aria-hidden','false');
    p.removeAttribute('inert');
    // 메뉴 열릴 때 햄버거 버튼 숨기기
    const btn=document.getElementById('mobile-menu-btn');
    if(btn) btn.style.display='none';
    // display 적용 후 다음 프레임에서 transform transition 트리거
    requestAnimationFrame(()=>{ requestAnimationFrame(()=>{ p.classList.add('panel-open'); }); });
  }
  function closeMobilePanel(id){
    const p=document.getElementById(id);
    if(!p) return;
    p.classList.remove('panel-open');
    const sheet=p.querySelector('.panel-sheet');
    const handler=()=>{
      p.setAttribute('aria-hidden','true');
      p.setAttribute('inert','');
      // 메뉴 닫힐 때 햄버거 버튼 표시
      const btn=document.getElementById('mobile-menu-btn');
      if(btn) btn.style.display='';
    };
    if(sheet) sheet.addEventListener('transitionend', handler, {once:true});
    else handler();
  }

});

// Update info button (footer)
const updateInfoBtn = document.getElementById('update-info-btn');
if(updateInfoBtn){
  updateInfoBtn.addEventListener('click', ()=>{
    const updates = [
      '✨ 모바일 광고 위치 변경 (메뉴 → 기본화면 하단)',
      '🎨 모바일 패널 헤더 padding 조정',
      '📱 광고 구조 최종 정리 (PC/모바일 환경별 분리)',
      '🔘 버튼 반응형 개선 (여러 줄 자동 처리)',
      '📝 토스트 버튼 텍스트 "기본"으로 변경',
      '🌐 언어별 메뉴 아이콘 (테마 무관)',
      '✅ Google AdSense 광고 준비 완료'
    ];
    const message = updates.join('\n');
    showToast(message, 'info');
  });
}

/* Dynamically load theme CSS file (single link element) */
function loadThemeCss(id, onLoaded){
  const existing = document.getElementById('theme-link');
  const href = `theme/${id}.css`;
  if(existing){
    if(existing.getAttribute('href') === href){
      if(onLoaded) onLoaded();
      return;
    }
    existing.setAttribute('href', href);
    if(onLoaded) existing.onload = onLoaded;
  }else{
    const link = document.createElement('link');
    link.rel = 'stylesheet'; link.id = 'theme-link'; link.href = href;
    if(onLoaded) link.onload = onLoaded;
    document.head.appendChild(link);
  }
}

// theme intro is updated directly inside `setTheme`

/* Form samples behavior */
function initFormSamples(){
  const range = document.getElementById('sample-range');
  const rangeVal = document.getElementById('range-val');
  if(range && rangeVal){ range.addEventListener('input', ()=> rangeVal.textContent = range.value); rangeVal.textContent = range.value }

  // simple toggles can reflect state in console
  const primary = document.getElementById('primary-btn');
  if(primary) primary.addEventListener('click', ()=> alert((LOCALE && LOCALE.btnPrimaryClick) || 'Primary 버튼 클릭'));

  const ghost = document.getElementById('ghost-btn');
  if(ghost) ghost.addEventListener('click', ()=> alert((LOCALE && LOCALE.btnGhostClick) || 'Ghost 버튼 클릭'));

  // sample input focus demo
  const input = document.getElementById('sample-input'); if(input) input.addEventListener('change', ()=> console.log('input:', input.value));
}

/* Data table / datagrid */
function initDataTable(){
  const tbody = document.querySelector('#sample-table tbody');
  if(!tbody) return;
  // sample rows
  const rawRows = (LOCALE && LOCALE.gridRows) || [
    {name:'Alice', status:'Active'}, {name:'Bob', status:'Inactive'},
    {name:'Charlie', status:'Active'}, {name:'Daisy', status:'Pending'}
  ];
  const rows = rawRows.map((r,i) => [String(i+1), r.name, r.status]);
  tbody.innerHTML = '';
  rows.forEach(r=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td>`;
    tr.addEventListener('click', ()=>{
      tbody.querySelectorAll('tr').forEach(x=>x.classList.remove('selected'));
      tr.classList.add('selected');
    });
    tbody.appendChild(tr);
  });
}

/* Confirm dialog */
function initAccordion(){
  const acc = document.getElementById('sample-accordion');
  if(!acc) return;
  acc.querySelectorAll('.accordion-header').forEach(header => {
    header.addEventListener('click', () => {
      const item = header.parentElement;
      const isOpen = item.classList.contains('open');
      acc.querySelectorAll('.accordion-item').forEach(i => {
        i.classList.remove('open');
        i.querySelector('.accordion-icon').textContent = '▼';
      });
      if(!isOpen){
        item.classList.add('open');
        header.querySelector('.accordion-icon').textContent = '▲';
      }
    });
  });
}

// Mobile accordion toggle (independent, not mutually exclusive)
function initMobileAccordion(){
  const mobileAcc = document.querySelector('.mobile-accordion');
  if(!mobileAcc) return;
  mobileAcc.querySelectorAll('.accordion-header').forEach(header => {
    header.addEventListener('click', () => {
      const item = header.parentElement;
      const isCurrentlyOpen = item.classList.contains('open');

      // 모든 아코디언 항목 닫기
      mobileAcc.querySelectorAll('.accordion-item').forEach(accItem => {
        accItem.classList.remove('open');
        accItem.querySelector('.accordion-icon').textContent = '▼';
      });

      // 클릭한 항목이 열려있지 않았으면 열기
      if(!isCurrentlyOpen) {
        item.classList.add('open');
        header.querySelector('.accordion-icon').textContent = '▲';
      }
    });
  });
}

// Mobile comment form handler
function initMobileCommentForm(){
  const form = document.getElementById('mobile-comment-form');
  if(!form) return;

  const input = document.getElementById('mobile-comment-input');
  const charCount = document.getElementById('mobile-comment-char-count');
  const errorEl = document.getElementById('mobile-comment-error');
  const submitBtn = document.getElementById('mobile-comment-submit');

  // 문자 수 업데이트
  input.addEventListener('input', () => {
    const len = input.value.length;
    charCount.textContent = len + ' / 100';
    charCount.classList.toggle('warn', len > 80);
  });

  // 폼 제출
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    const err = validateComment(text);
    if(err){
      errorEl.textContent = getLocaleString(err) || err;
      setTimeout(() => { errorEl.textContent = ''; }, 2000);
      return;
    }
    errorEl.textContent = '';
    submitBtn.disabled = true;

    try{
      await ensureAuth();
      const themeId = getCurrentThemeId();
      await addDoc(collection(db, 'comments'), {
        text,
        uid: _currentUid,
        time: serverTimestamp(),
        parentId: null,
        themeId
      });
      input.value = '';
      charCount.textContent = '0 / 100';
      try{ renderComments(); }catch(e){}
    }catch(e){
      errorEl.textContent = getLocaleString('commentFailed') || '등록 실패';
      console.error(e);
    }finally{
      submitBtn.disabled = false;
    }
  });
}

function initTabs(){
  const tabs = document.getElementById('sample-tabs');
  if(!tabs) return;
  tabs.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tabs.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      const panel = document.getElementById('sample-' + tab.dataset.tab);
      if(panel) panel.classList.add('active');
    });
  });
}


function initConfirmDialog(){
  const modal = document.getElementById('confirm-modal');
  const open = document.getElementById('open-confirm');
  const ok = document.getElementById('confirm-ok');
  const cancel = document.getElementById('confirm-cancel');
  if(!modal) return;
  function show(){ modal.setAttribute('aria-hidden','false'); }
  function hide(){ modal.setAttribute('aria-hidden','true'); }
  if(open) open.addEventListener('click', ()=> show());
  if(cancel) cancel.addEventListener('click', ()=> hide());
  if(ok) ok.addEventListener('click', ()=>{ hide(); showToast((LOCALE && LOCALE.confirmDone) || '확인되었습니다', 'success'); });
  // close on backdrop click
  modal.querySelector('.modal-backdrop')?.addEventListener('click', ()=> hide());
}
