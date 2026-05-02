// ── Theme & UI Components (통합) ──────────────────────────────
import { showToast, $, $all } from './common.js';
import { DARK_THEMES, MENU_ICON_MAP_LANG, FALLBACK_THEMES } from './globals.js';
import { getLocaleString, loadLocale } from './i18n.js';
import { containsBadword } from './badwords.js';

// ════════════════════════════════════════════════════════════════
// THEME FUNCTIONS
// ════════════════════════════════════════════════════════════════

async function loadThemesManifest(){
  try{
    const res = await fetch('theme/themes.json', {cache: 'no-cache'});
    if(!res.ok) throw new Error('HTTP ' + res.status);
    window._themes = await res.json();
  }catch(e){
    console.warn('themes.json load failed, using fallback themes', e);
    window._themes = FALLBACK_THEMES;
  }
}

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

function updateMenuIcon(lang){
  const menuIcon = document.getElementById('menu-icon');
  if(!menuIcon) { console.warn('menu-icon element not found'); return; }
  const iconFile = MENU_ICON_MAP_LANG[lang] || 'menu-basic.svg';
  console.log('updateMenuIcon:', lang, '→', iconFile);
  menuIcon.src = 'assets/' + iconFile;
}

function setTheme(id){
  console.log('[setTheme] Theme changed:', id);
  loadThemeCss(id);
  document.body.className = 'theme-' + id;
  document.documentElement.style.colorScheme = DARK_THEMES.includes(id) ? 'dark' : 'light';
  localStorage.setItem('pl_theme', id);
  console.log('[setTheme] localStorage pl_theme set to:', id);
  $all('#theme-list button').forEach(b=>b.classList.toggle('selected', b.dataset.id===id));
  const mobileMenuThemeList = document.getElementById('mobile-menu-theme-list');
  if(mobileMenuThemeList) mobileMenuThemeList.querySelectorAll('button').forEach(b=>b.classList.toggle('selected', b.dataset.id===id));
  const sel = $('#theme-select'); if(sel) sel.value = id;
  try{
    console.log('[setTheme] Calling renderThemeIntro...');
    renderThemeIntro(id);
  }catch(e){}
  try{
    console.log('[setTheme] Loading theme stats...');
    loadThemeStats(id);
  }catch(e){}
  try{
    console.log('[setTheme] Calling renderComments...');
    renderComments();
    console.log('[setTheme] renderComments completed');
  }catch(e){
    console.error('[setTheme] renderComments error:', e);
  }
}

function renderThemePicker(){
  const list = $('#theme-list');
  const select = $('#theme-select');
  console.log('[renderThemePicker] Starting. list element:', list ? 'found' : 'NOT FOUND', 'select element:', select ? 'found' : 'NOT FOUND');

  (window._themes || []).forEach(t=>{
    const container = document.createElement('div');
    container.className = 'theme-item';
    container.dataset.themeId = t.id;

    const btn = document.createElement('button');
    btn.type='button'; btn.textContent=t.name; btn.dataset.id=t.id;
    btn.className = 'theme-btn';
    btn.addEventListener('click', ()=> {
      console.log('[renderThemePicker] Theme button clicked:', t.id);
      setTheme(t.id);
    });

    container.appendChild(btn);
    list.appendChild(container);

    const opt = document.createElement('option'); opt.value=t.id; opt.textContent=`${t.name} — ${t.category}`; select.appendChild(opt);
  });

  select.addEventListener('change', ()=> {
    console.log('[renderThemePicker] Select changed to:', select.value);
    setTheme(select.value);
  });

  const saved = localStorage.getItem('pl_theme') || 'basic';
  console.log('[renderThemePicker] Initial theme from localStorage:', saved);
  setTheme(saved);
}

async function renderThemeIntro(selectedId){
  const container = document.getElementById('theme-intro');
  const themeContent = document.getElementById('theme-content');
  const pageTitle = document.getElementById('page-title');
  if(!container) return;
  if(!selectedId){
    const header = (window._locale && window._locale['themeListHeader']) ? window._locale['themeListHeader'] : 'Theme introductions';
    container.innerHTML = `<h4>${header}</h4><ul>${(window._themes || []).map(t=>`<li><strong>${t.name}</strong> — ${getLocalizedThemeDesc(t.id,t.description)}</li>`).join('')}</ul>`;
    if(pageTitle) pageTitle.textContent = (window._locale && window._locale['pageTitle']) ? window._locale['pageTitle'] : 'Sample Page';
    if(themeContent) themeContent.innerHTML = '';
    return;
  }
  const t = (window._themes || []).find(x=>x.id===selectedId) || FALLBACK_THEMES.find(x=>x.id===selectedId);
  if(t){
    // 현재 언어에서 번역 가져오기
    const useItText = (window._locale && window._locale['themeActionsUseIt']) ? window._locale['themeActionsUseIt'] : '이 테마를 써볼까요?';
    const ratingText = (window._locale && window._locale['themeActionsRating']) ? window._locale['themeActionsRating'] : '이 테마 어떤가요?';

    const actionsHTML = `
      <div class="theme-actions-section" style="margin-top: 0; padding: 12px; background: rgba(0,0,0,0.02); border-radius: 6px; margin-bottom: 16px;">
        <div style="font-size: 0.9rem; font-weight: 600; color: var(--text); margin-bottom: 8px;">${useItText}</div>
        <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 16px;">
          <button id="download-btn-intro" type="button" style="flex: 1; padding: 8px 12px; background: var(--accent); color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.9rem; white-space: nowrap;">⬇ Download</button>
          <button id="copy-btn-intro" type="button" style="flex: 1; padding: 8px 12px; background: var(--accent); color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.9rem; white-space: nowrap;">📋 Copy</button>
          <button id="howto-btn-intro" type="button" style="flex: 1; padding: 8px 12px; background: transparent; color: var(--accent); border: 1px solid var(--accent); border-radius: 6px; cursor: pointer; font-size: 0.9rem; white-space: nowrap;">❓ How to</button>
        </div>
        <div style="font-size: 0.9rem; font-weight: 600; color: var(--text); margin-bottom: 8px;">${ratingText}</div>
        <div class="theme-stats" style="display: flex; gap: 16px; padding: 8px 0; font-size: 0.9rem; margin-bottom: 12px;">
          <span class="stat-rating" style="display: flex; align-items: center; gap: 4px;">⭐ — <small>(0)</small></span>
          <span class="stat-likes" style="display: flex; align-items: center; gap: 4px;">👍 0</span>
          <span class="stat-downloads" style="display: flex; align-items: center; gap: 4px;">📥 0</span>
        </div>
        <div class="theme-engagement" style="display: flex; gap: 8px; align-items: center;">
          <label style="font-size: 0.85rem; color: var(--muted);">평가하기:</label>
          <div class="rating-selector" style="display: flex; gap: 4px;"></div>
          <button class="like-btn-intro" type="button" style="padding: 6px 10px; background: transparent; border: none; font-size: 1.2rem; cursor: pointer; color: #ff69b4;">👍</button>
        </div>
      </div>
    `;
    const guideHTML = `<p>${getLocalizedThemeDesc(t.id,t.description)}</p>`;
    container.innerHTML = guideHTML;
    if(themeContent) themeContent.innerHTML = actionsHTML;

    // 다운로드/복사/사용방법 버튼 이벤트 리스너
    const dlBtn = document.getElementById('download-btn-intro');
    const cpBtn = document.getElementById('copy-btn-intro');
    const howtoBtn = document.getElementById('howto-btn-intro');
    if(dlBtn) dlBtn.addEventListener('click', ()=> downloadThemeCss(t.id, t.name));
    if(cpBtn) cpBtn.addEventListener('click', ()=> copyThemeCssCode(t.id, t.name));
    if(howtoBtn) howtoBtn.addEventListener('click', ()=> openHowToModal(t.name));

    // 별점 선택기 (모든 rating-selector)
    const ratingContainers = document.querySelectorAll('.rating-selector');
    let currentRating = 0;
    ratingContainers.forEach(ratingContainer => {
      const updateRatingDisplay = (selectedRating) => {
        const allBtns = ratingContainer.querySelectorAll('button');
        allBtns.forEach((btn, idx) => {
          const btnRating = idx + 1;
          btn.innerHTML = (btnRating <= selectedRating) ? '⭐' : '☆';
        });
      };

      for(let i = 1; i <= 5; i++){
        const ratingBtn = document.createElement('button');
        ratingBtn.type = 'button';
        ratingBtn.style.cssText = 'background: transparent; border: none; font-size: 1rem; cursor: pointer; color: #ffd700; text-shadow: 0 0 4px rgba(0,0,0,0.5); padding: 4px 2px; border-radius: 4px; transition: all 0.2s ease;';
        ratingBtn.innerHTML = '☆';
        ratingBtn.dataset.rating = i;
        ratingBtn.title = `Rate ${i}/5`;
        ratingBtn.addEventListener('click', ()=> {
          currentRating = i;
          updateRatingDisplay(i);
          rateTheme(t.id, i);
        });
        ratingBtn.addEventListener('mouseenter', () => updateRatingDisplay(i));
        ratingBtn.addEventListener('mouseleave', () => updateRatingDisplay(currentRating));
        ratingContainer.appendChild(ratingBtn);
      }
    });

    // 좋아요 버튼 (모든 like-btn-intro)
    const likeBtns = document.querySelectorAll('.like-btn-intro');
    likeBtns.forEach(likeBtn => {
      likeBtn.addEventListener('click', ()=> {
        toggleLikeTheme(t.id);
        likeBtn.classList.add('liked');
        setTimeout(()=> likeBtn.classList.remove('liked'), 300);
      });
    });

    // 통계 업데이트
    await loadThemeStats(t.id);

    if(pageTitle) pageTitle.textContent = (window._locale && window._locale['pageTitle']) ? t.name : t.name;
  }else{
    container.innerHTML = `<h4>테마</h4><p>설명 없음</p>`;
    if(pageTitle) pageTitle.textContent = '샘플 페이지';
  }
}

function getLocalizedThemeDesc(id,fallback){
  if(window._locale && window._locale.themes && window._locale.themes[id]) return window._locale.themes[id];
  return fallback || '';
}

async function downloadThemeCss(themeId, themeName){
  try{
    const response = await fetch(`theme/${themeId}.css`);
    if(!response.ok) throw new Error('Failed to fetch CSS');
    const cssCode = await response.text();
    const blob = new Blob([cssCode], {type: 'text/css'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${themeId}.css`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Downloaded: ${themeName}.css`, 'success');

    // 다운로드 수 추적
    await trackDownload(themeId);
    await loadThemeStats(themeId);
  }catch(e){
    console.error('Download failed:', e);
    showToast('Download failed', 'error');
  }
}

async function copyThemeCssCode(themeId, themeName){
  try{
    const response = await fetch(`theme/${themeId}.css`);
    if(!response.ok) throw new Error('Failed to fetch CSS');
    const cssCode = await response.text();
    await navigator.clipboard.writeText(cssCode);
    showToast(`Copied: ${themeName} CSS code`, 'success');
  }catch(e){
    console.error('Copy failed:', e);
    showToast('Copy failed', 'error');
  }
}

// ════════════════════════════════════════════════════════════════
// USER ENGAGEMENT SYSTEM (평점, 좋아요, 다운로드 추적)
// ════════════════════════════════════════════════════════════════

async function rateTheme(themeId, rating){
  if(!window._firebase || !window._firebase.db) {
    showToast('Firebase not initialized', 'error');
    return;
  }

  // Rate limiting (5분 = 300000ms)
  const lastRateTime = localStorage.getItem(`lastRate_${themeId}`);
  if(lastRateTime){
    const elapsed = Date.now() - parseInt(lastRateTime);
    if(elapsed < 300000){
      const remaining = Math.ceil((300000 - elapsed) / 1000);
      showToast(`${remaining}초 후에 다시 평가할 수 있습니다`, 'error');
      return;
    }
  }

  try{
    await window._firebase.ensureAuth();
    const { db, collection, setDoc, doc, serverTimestamp } = window._firebase;
    const uid = window._currentUid || 'anonymous';

    await setDoc(doc(db, `theme_ratings/${themeId}/ratings`, uid), {
      rating: parseInt(rating),
      timestamp: serverTimestamp(),
      uid
    });

    localStorage.setItem(`lastRate_${themeId}`, Date.now().toString());

    showToast(`✨ ${rating}점으로 평가했습니다!`, 'success');
    await loadThemeStats(themeId);
  }catch(e){
    console.error('Rating failed:', e);
    showToast('평가 저장 실패', 'error');
  }
}

async function toggleLikeTheme(themeId){
  if(!window._firebase || !window._firebase.db) {
    showToast('Firebase not initialized', 'error');
    return;
  }
  try{
    await window._firebase.ensureAuth();
    const { db, collection, setDoc, deleteDoc, doc, serverTimestamp, getDoc } = window._firebase;
    const uid = window._currentUid || 'anonymous';
    const likeDocRef = doc(db, `theme_likes/${themeId}/likes`, uid);

    const likeDoc = await getDoc(likeDocRef);
    if(likeDoc.exists()){
      await deleteDoc(likeDocRef);
      showToast('좋아요를 취소했습니다', 'success');
    }else{
      await setDoc(likeDocRef, {
        timestamp: serverTimestamp(),
        uid
      });
      showToast('👍 좋아요!', 'success');
    }

    await loadThemeStats(themeId);
  }catch(e){
    console.error('Like toggle failed:', e);
    showToast('좋아요 처리 실패', 'error');
  }
}

async function trackDownload(themeId){
  if(!window._firebase || !window._firebase.db) {
    console.warn('Firebase not initialized, skipping download tracking');
    return;
  }

  // Rate limiting (5분 = 300000ms)
  const lastDownloadTime = localStorage.getItem(`lastDownload_${themeId}`);
  if(lastDownloadTime){
    const elapsed = Date.now() - parseInt(lastDownloadTime);
    if(elapsed < 300000){
      console.log(`[trackDownload] Rate limited for ${themeId}`);
      return;
    }
  }

  try{
    const { db, doc, updateDoc, increment } = window._firebase;
    const downloadDocRef = doc(db, 'theme_downloads', themeId);

    await updateDoc(downloadDocRef, {
      count: increment(1),
      lastDownloaded: new Date()
    }).catch(async (error) => {
      if(error.code === 'not-found'){
        await window._firebase.setDoc(downloadDocRef, {
          count: 1,
          lastDownloaded: new Date(),
          themeId
        });
      }
    });

    localStorage.setItem(`lastDownload_${themeId}`, Date.now().toString());

    console.log(`[trackDownload] ${themeId} download count increased`);
  }catch(e){
    console.error('Download tracking failed:', e);
  }
}

async function loadThemeStats(themeId){
  if(!window._firebase || !window._firebase.db) return;

  try{
    const { db, collection, getDocs, query, where } = window._firebase;

    let totalRating = 0, ratingCount = 0;
    let likeCount = 0;
    let downloadCount = 0;

    try{
      const ratingsSnap = await getDocs(collection(db, `theme_ratings/${themeId}/ratings`));
      ratingsSnap.forEach(doc => {
        totalRating += doc.data().rating || 0;
        ratingCount++;
      });
    }catch(e){}

    try{
      const likesSnap = await getDocs(collection(db, `theme_likes/${themeId}/likes`));
      likeCount = likesSnap.size;
    }catch(e){}

    try{
      const downloadDoc = await window._firebase.getDoc(window._firebase.doc(db, 'theme_downloads', themeId));
      downloadCount = downloadDoc.exists() ? downloadDoc.data().count : 0;
    }catch(e){}

    const avgRating = ratingCount > 0 ? (totalRating / ratingCount).toFixed(1) : 0;

    window._themeStats = window._themeStats || {};
    window._themeStats[themeId] = {
      avgRating,
      ratingCount,
      likeCount,
      downloadCount,
      totalRating
    };

    // UI 업데이트
    const statsContainer = document.querySelector('#theme-intro .theme-stats');
    if(statsContainer){
      const ratingText = ratingCount > 0 ? `⭐ ${avgRating} <small>(${ratingCount})</small>` : '⭐ — <small>(0)</small>';
      statsContainer.innerHTML = `
        <span class="stat-rating">${ratingText}</span>
        <span class="stat-likes">👍 ${likeCount}</span>
        <span class="stat-downloads">📥 ${downloadCount}</span>
      `;
    }

    console.log(`[loadThemeStats] ${themeId}:`, window._themeStats[themeId]);
  }catch(e){
    console.error('Stats loading failed:', e);
  }
}

// ════════════════════════════════════════════════════════════════
// UI FUNCTIONS
// ════════════════════════════════════════════════════════════════

function initToasts(){
  const b = document.getElementById('show-toast');
  const s = document.getElementById('show-success-toast');
  const e = document.getElementById('show-error-toast');
  if(b) b.addEventListener('click', ()=> showToast((window._locale && window._locale.toastInfo) || '간단한 안내 메시지입니다.'));
  if(s) s.addEventListener('click', ()=> showToast((window._locale && window._locale.toastSuccess) || '성공했습니다', 'success'));
  if(e) e.addEventListener('click', ()=> showToast((window._locale && window._locale.toastError) || '오류가 발생했습니다', 'error'));
}

function initFormSamples(){
  const range = document.getElementById('sample-range');
  const rangeVal = document.getElementById('range-val');
  if(range && rangeVal){ range.addEventListener('input', ()=> rangeVal.textContent = range.value); rangeVal.textContent = range.value }

  const primary = document.getElementById('primary-btn');
  if(primary) primary.addEventListener('click', ()=> alert((window._locale && window._locale.btnPrimaryClick) || 'Primary 버튼 클릭'));

  const ghost = document.getElementById('ghost-btn');
  if(ghost) ghost.addEventListener('click', ()=> alert((window._locale && window._locale.btnGhostClick) || 'Ghost 버튼 클릭'));

  const input = document.getElementById('sample-input'); if(input) input.addEventListener('change', ()=> console.log('input:', input.value));
}

function initDataTable(){
  const tbody = document.querySelector('#sample-table tbody');
  if(!tbody) return;
  const rawRows = (window._locale && window._locale.gridRows) || [
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

function initMobileAccordion(){
  const mobileAcc = document.querySelector('.mobile-accordion');
  if(!mobileAcc) return;
  mobileAcc.querySelectorAll('.accordion-header').forEach(header => {
    header.addEventListener('click', () => {
      const item = header.parentElement;
      const isCurrentlyOpen = item.classList.contains('open');
      mobileAcc.querySelectorAll('.accordion-item').forEach(accItem => {
        accItem.classList.remove('open');
        accItem.querySelector('.accordion-icon').textContent = '▼';
      });
      if(!isCurrentlyOpen) {
        item.classList.add('open');
        header.querySelector('.accordion-icon').textContent = '▲';
      }
    });
  });
}

function initMobileCommentForm(){
  const form = document.getElementById('mobile-comment-form');
  if(!form) return;

  const input = document.getElementById('mobile-comment-input');
  const charCount = document.getElementById('mobile-comment-char-count');
  const errorEl = document.getElementById('mobile-comment-error');
  const submitBtn = document.getElementById('mobile-comment-submit');

  input.addEventListener('input', () => {
    const len = input.value.length;
    charCount.textContent = len + ' / 100';
    charCount.classList.toggle('warn', len > 80);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    const err = validateComment(text);
    if(err){
      errorEl.textContent = getLocaleString(err) || err;
      setTimeout(() => { errorEl.textContent = ''; }, 2000);
      return;
    }

    const now = Date.now();
    const elapsed = now - _lastCommentTime;
    if (_lastCommentTime && elapsed < COMMENT_COOLDOWN) {
      const wait = Math.ceil((COMMENT_COOLDOWN - elapsed) / 1000);
      errorEl.textContent = `${wait}${getLocaleString('cooldownWait') || '초 후에 다시 시도하세요.'}`;
      return;
    }

    errorEl.textContent = '';
    submitBtn.disabled = true;

    try{
      const { db, collection, addDoc, serverTimestamp } = window._firebase;
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
      _lastCommentTime = Date.now();
      startCooldown(submitBtn);
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
  if(ok) ok.addEventListener('click', ()=>{ hide(); showToast((window._locale && window._locale.confirmDone) || '확인되었습니다', 'success'); });
  modal.querySelector('.modal-backdrop')?.addEventListener('click', ()=> hide());
}

function openHowToModal(themeName){
  const modal = document.getElementById('how-to-modal');
  if(!modal) return;

  const title = modal.querySelector('.modal-title');
  if(title) title.textContent = `How to use: ${themeName}`;

  modal.setAttribute('aria-hidden', 'false');

  // Setup close button listener
  const closeBtn = modal.querySelector('#how-to-close');
  if(closeBtn && !closeBtn._listenerAttached){
    closeBtn.addEventListener('click', ()=> closeHowToModal());
    closeBtn._listenerAttached = true;
  }

  // Setup backdrop close listener
  const backdrop = modal.querySelector('.modal-backdrop');
  if(backdrop && !backdrop._listenerAttached){
    backdrop.addEventListener('click', ()=> closeHowToModal());
    backdrop._listenerAttached = true;
  }
}

function closeHowToModal(){
  const modal = document.getElementById('how-to-modal');
  if(!modal) return;
  modal.setAttribute('aria-hidden', 'true');
}

// ════════════════════════════════════════════════════════════════
// 모듈 export
// ════════════════════════════════════════════════════════════════
export {
  // Theme
  loadThemesManifest, loadThemeCss, updateMenuIcon, setTheme, renderThemePicker, renderThemeIntro, getLocalizedThemeDesc,
  downloadThemeCss, copyThemeCssCode,
  // User Engagement
  rateTheme, toggleLikeTheme, trackDownload, loadThemeStats,
  // UI
  initToasts, initFormSamples, initDataTable, initAccordion,
  initMobileAccordion, initMobileCommentForm, initTabs, initConfirmDialog,
  openHowToModal, closeHowToModal
};
