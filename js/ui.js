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
  loadThemeCss(id);
  document.body.className = 'theme-' + id;
  document.documentElement.style.colorScheme = DARK_THEMES.includes(id) ? 'dark' : 'light';
  localStorage.setItem('pl_theme', id);
  $all('#theme-list button').forEach(b=>b.classList.toggle('selected', b.dataset.id===id));
  const mobileMenuThemeList = document.getElementById('mobile-menu-theme-list');
  if(mobileMenuThemeList) mobileMenuThemeList.querySelectorAll('button').forEach(b=>b.classList.toggle('selected', b.dataset.id===id));
  const sel = $('#theme-select'); if(sel) sel.value = id;
  try{ renderThemeIntro(id); }catch(e){}
  try{ renderComments(); }catch(e){}
}

function renderThemePicker(){
  const list = $('#theme-list');
  const select = $('#theme-select');
  (window._themes || []).forEach(t=>{
    const btn = document.createElement('button');
    btn.type='button'; btn.textContent=t.name; btn.dataset.id=t.id;
    btn.addEventListener('click', ()=> setTheme(t.id));
    list.appendChild(btn);
    const opt = document.createElement('option'); opt.value=t.id; opt.textContent=`${t.name} — ${t.category}`; select.appendChild(opt);
  });
  select.addEventListener('change', ()=> setTheme(select.value));
  const saved = localStorage.getItem('pl_theme') || 'basic'; setTheme(saved);
}

function renderThemeIntro(selectedId){
  const container = document.getElementById('theme-intro');
  const pageTitle = document.getElementById('page-title');
  if(!container) return;
  if(!selectedId){
    const header = (window._locale && window._locale['themeListHeader']) ? window._locale['themeListHeader'] : 'Theme introductions';
    container.innerHTML = `<h4>${header}</h4><ul>${(window._themes || []).map(t=>`<li><strong>${t.name}</strong> — ${getLocalizedThemeDesc(t.id,t.description)}</li>`).join('')}</ul>`;
    if(pageTitle) pageTitle.textContent = (window._locale && window._locale['pageTitle']) ? window._locale['pageTitle'] : 'Sample Page';
    return;
  }
  const t = (window._themes || []).find(x=>x.id===selectedId) || FALLBACK_THEMES.find(x=>x.id===selectedId);
  if(t){
    container.innerHTML = `<p>${getLocalizedThemeDesc(t.id,t.description)}</p>`;
    if(pageTitle) pageTitle.textContent = (LOCALE && LOCALE['pageTitle']) ? t.name : t.name;
  }else{
    container.innerHTML = `<h4>테마</h4><p>설명 없음</p>`;
    if(pageTitle) pageTitle.textContent = '샘플 페이지';
  }
}

function getLocalizedThemeDesc(id,fallback){
  if(window._locale && window._locale.themes && window._locale.themes[id]) return window._locale.themes[id];
  return fallback || '';
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
  if(ok) ok.addEventListener('click', ()=>{ hide(); showToast((LOCALE && LOCALE.confirmDone) || '확인되었습니다', 'success'); });
  modal.querySelector('.modal-backdrop')?.addEventListener('click', ()=> hide());
}

// ════════════════════════════════════════════════════════════════
// 모듈 export
// ════════════════════════════════════════════════════════════════
export {
  // Theme
  loadThemesManifest, loadThemeCss, updateMenuIcon, setTheme, renderThemePicker, renderThemeIntro, getLocalizedThemeDesc,
  // UI
  initToasts, initFormSamples, initDataTable, initAccordion,
  initMobileAccordion, initMobileCommentForm, initTabs, initConfirmDialog
};
