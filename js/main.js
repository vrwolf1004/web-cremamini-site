// ── Entry point (DOMContentLoaded) ────────────────────────────
import { showToast } from './common.js';
import { loadLocale, applyTranslations } from './i18n.js';
import { loadThemesManifest, renderThemePicker, setTheme, renderThemeIntro, initFormSamples, initDataTable, initConfirmDialog, initToasts, initTabs, initAccordion, initMobileAccordion, initMobileCommentForm, loadThemeCss, loadThemeStats } from './ui.js';
import { initComments, renderComments, openTranslateModal, closeTranslateModal, openReportModal, closeReportModal, submitReport, validateComment, getCurrentThemeId, ensureAuth, startCooldown, showCommentError } from './comments.js';

// Make comments functions globally accessible for ui.js
window.renderComments = renderComments;
window.validateComment = validateComment;
window.getCurrentThemeId = getCurrentThemeId;
window.ensureAuth = ensureAuth;
window.startCooldown = startCooldown;

document.addEventListener('DOMContentLoaded', ()=>{
  const urlParams = new URLSearchParams(location.search);
  const urlLang = urlParams.get('lang');
  const initialLang = urlLang || localStorage.getItem('pl_lang') || (navigator.language||'en').slice(0,2);
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

      // language selector handler (desktop)
      const langSelect = document.getElementById('lang-select');
      if(langSelect){
        langSelect.addEventListener('change', async (e)=>{
          const L = e.target.value;
          localStorage.setItem('pl_lang', L);
          const u = new URL(location); u.searchParams.set('lang', L); history.replaceState({}, '', u);
          await loadLocale(L);
          applyTranslations();
          renderThemeIntro(localStorage.getItem('pl_theme') || null);
          const mobileMenuLangSelect = document.getElementById('mobile-menu-lang-select');
          if(mobileMenuLangSelect) mobileMenuLangSelect.querySelectorAll('button').forEach(b=>b.classList.toggle('selected', b.dataset.lang===L));
          try{ renderComments(); }catch(e){}
          initDataTable();
        });
      }

      const saved = localStorage.getItem('pl_theme');
      const initialTheme = saved || 'basic';

      // Hide loading overlay (min 2s for animation loop)
      const loadingOverlay = document.getElementById('loading-overlay');
      const startTime = Date.now();
      loadThemeCss(initialTheme, () => {
        const elapsed = Date.now() - startTime;
        const remainingWait = Math.max(0, 2000 - elapsed);
        setTimeout(() => {
          if(loadingOverlay) {
            loadingOverlay.classList.add('hidden');
            setTimeout(() => loadingOverlay.style.display = 'none', 200);
          }
        }, remainingWait);
      });

      renderThemeIntro(initialTheme);

      // Mobile panels
      const mobileMenuBtn = document.getElementById('mobile-menu-btn');
      const mobileMenuPanel = document.getElementById('mobile-menu-panel');
      const mobileMenuThemeList = document.getElementById('mobile-menu-theme-list');
      const mobileMenuLangSelect = document.getElementById('mobile-menu-lang-select');
      const mobileThemePanel = document.getElementById('mobile-theme-panel');
      const mobileLangPanel = document.getElementById('mobile-lang-panel');
      const mobileLangSelect = document.getElementById('mobile-lang-select');
      const mobileThemeList = document.getElementById('mobile-theme-list');
      const mobileThemeSelect = document.getElementById('mobile-theme-select');

      if(mobileMenuBtn && mobileMenuPanel){
        mobileMenuBtn.addEventListener('click', ()=> {
          openMobilePanel('mobile-menu-panel');
          const currentTheme = localStorage.getItem('pl_theme') || (window._themes && window._themes[0] ? window._themes[0].id : 'basic');
          mobileMenuThemeList.querySelectorAll('button').forEach(b=> b.classList.toggle('selected', b.dataset.id===currentTheme));
          const desktopLang = document.getElementById('lang-select');
          const currentLang = desktopLang ? desktopLang.value : (window._currentLang || 'en');
          mobileMenuLangSelect.querySelectorAll('button').forEach(b=> b.classList.toggle('selected', b.dataset.lang===currentLang));
        });
        mobileMenuPanel.querySelectorAll('[data-target]').forEach(b=> b.addEventListener('click', (e)=> closeMobilePanel(e.target.dataset.target)));
      }

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

      if(mobileMenuThemeList){
        const currentTheme = localStorage.getItem('pl_theme') || (window._themes && window._themes[0] ? window._themes[0].id : 'basic');
        (window._themes || []).forEach(t=>{
          const btn = document.createElement('button');
          btn.type='button'; btn.textContent=t.name; btn.dataset.id=t.id;
          if(t.id === currentTheme) btn.classList.add('selected');
          btn.addEventListener('click', ()=>{ setTheme(t.id); });
          mobileMenuThemeList.appendChild(btn);
        });
      }

      if(mobileMenuLangSelect){
        const desktopLang = document.getElementById('lang-select');
        const currentLang = desktopLang ? desktopLang.value : (window._currentLang || 'en');
        if(desktopLang){
          Array.from(desktopLang.options).forEach(o=>{
            const btn = document.createElement('button');
            btn.type='button'; btn.textContent=o.textContent; btn.dataset.lang=o.value;
            if(o.value === currentLang) btn.classList.add('selected');
            btn.classList.add('lang-btn');
            btn.addEventListener('click', async (e)=>{
              const L=o.value;
              localStorage.setItem('pl_lang', L);
              const u=new URL(location); u.searchParams.set('lang', L); history.replaceState({},'',u);
              await loadLocale(L);
              applyTranslations();
              renderThemeIntro(localStorage.getItem('pl_theme')||null);
              renderComments();
              mobileMenuLangSelect.querySelectorAll('button').forEach(b=>b.classList.toggle('selected', b.dataset.lang===L));
            });
            mobileMenuLangSelect.appendChild(btn);
          });
        }
      }

      if(mobileThemePanel){ mobileThemePanel.querySelectorAll('[data-target]').forEach(b=> b.addEventListener('click', (e)=> closeMobilePanel(e.target.dataset.target))); }
      if(mobileLangPanel){ mobileLangPanel.querySelectorAll('[data-target]').forEach(b=> b.addEventListener('click', (e)=> closeMobilePanel(e.target.dataset.target))); }

      if(mobileLangSelect){
        const desktopLang = document.getElementById('lang-select');
        if(desktopLang){
          Array.from(desktopLang.options).forEach(o=> mobileLangSelect.appendChild(o.cloneNode(true)));
          mobileLangSelect.value = desktopLang.value;
          mobileLangSelect.addEventListener('change', async (e)=>{
            const L=e.target.value;
            localStorage.setItem('pl_lang', L);
            const u=new URL(location); u.searchParams.set('lang', L); history.replaceState({},'',u);
            await loadLocale(L);
            applyTranslations();
            renderThemeIntro(localStorage.getItem('pl_theme')||null);
            renderComments();
            closeMobilePanel('mobile-lang-panel');
          });
        }
      }

      if(mobileThemeList && mobileThemeSelect){
        (window._themes || []).forEach(t=>{
          const btn = document.createElement('button'); btn.type='button'; btn.textContent=t.name; btn.dataset.id=t.id; btn.addEventListener('click', ()=>{ setTheme(t.id); });
          mobileThemeList.appendChild(btn);
          const opt = document.createElement('option'); opt.value=t.id; opt.textContent=t.name; mobileThemeSelect.appendChild(opt);
        });
        mobileThemeSelect.addEventListener('change', ()=>{ setTheme(mobileThemeSelect.value); });
      }
    });
  });

  // comments panel toggle
  const commentsToggle = document.getElementById('comments-toggle');
  const commentsPanel = document.getElementById('comments-panel');
  if(commentsToggle && commentsPanel){
    commentsToggle.addEventListener('click', ()=>{
      commentsPanel.classList.toggle('open');
      const isOpen = commentsPanel.classList.contains('open');
      commentsPanel.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
      if(isOpen){ document.body.style.overflow='hidden'; closeMobilePanel('mobile-menu-panel'); }
      else { document.body.style.overflow=''; }
    });
  }

  // 번역 모달 닫기
  const translateCloseBtn = document.getElementById('translate-close');
  if (translateCloseBtn) translateCloseBtn.addEventListener('click', closeTranslateModal);
  const translateModal = document.getElementById('translate-modal');
  if (translateModal) {
    const backdrop = translateModal.querySelector('.modal-backdrop');
    if (backdrop) backdrop.addEventListener('click', closeTranslateModal);
  }

  // 신고 모달 닫기
  const reportCloseBtn = document.getElementById('report-close');
  if (reportCloseBtn) reportCloseBtn.addEventListener('click', closeReportModal);
  const reportSubmitBtn = document.getElementById('report-submit');
  if (reportSubmitBtn) reportSubmitBtn.addEventListener('click', submitReport);
  const reportModal = document.getElementById('report-modal');
  if (reportModal) {
    const backdrop = reportModal.querySelector('.modal-backdrop');
    if (backdrop) backdrop.addEventListener('click', closeReportModal);
  }

  // Update info button
  const updateInfoBtn = document.getElementById('update-info-btn');
  if(updateInfoBtn){
    updateInfoBtn.addEventListener('click', async ()=>{
      try{
        const res = await fetch('updates.json', {cache: 'no-cache'});
        if(!res.ok) throw new Error('HTTP ' + res.status);
        const updates = await res.json();

        // 최신 업데이트 1개만 표시
        if (updates.length === 0) throw new Error('No updates found');
        const latest = updates[0];
        const message = `🆕 ${latest.title}\n\n${latest.items.join('\n')}`;
        showToast(message, 'info');
      }catch(e){
        console.error('updates.json load failed:', e);
        showToast('업데이트 정보를 불러올 수 없습니다', 'error');
      }
    });
  }

  // ── Mobile panel helpers ───────────────────────────────────
  function openMobilePanel(id){
    const p=document.getElementById(id);
    if(!p) return;
    p.setAttribute('aria-hidden','false');
    p.removeAttribute('inert');
    const btn=document.getElementById('mobile-menu-btn');
    if(btn) btn.style.display='none';
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
      const btn=document.getElementById('mobile-menu-btn');
      if(btn) btn.style.display='';
    };
    if(sheet) sheet.addEventListener('transitionend', handler, {once:true});
    else handler();
  }
});
