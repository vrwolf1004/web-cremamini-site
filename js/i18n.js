// ── i18n ──────────────────────────────────────────────────────
import { $all } from './common.js';
import { updateMenuIcon, initDataTable } from './ui.js';

async function loadLocale(lang){
  if(!lang) lang = 'en';
  if(window._locale && window._currentLang===lang) return window._locale;
  try{
    const res = await fetch(`i18n/${lang}.json`, {cache: 'no-cache'});
    if(!res.ok) throw new Error('HTTP '+res.status);
    window._locale = await res.json(); window._currentLang = lang; return window._locale;
  }catch(e){ console.warn('locale load failed', e); window._locale = null; return null }
}

function applyTranslations(){
  if(!window._locale) return;
  $all('[data-i18n]').forEach(el=>{
    const key = el.getAttribute('data-i18n');
    const v = getLocaleString(key);
    if(v !== undefined && v !== null) el.textContent = v;
  });
  $all('[data-i18n-placeholder]').forEach(el=>{
    const key = el.getAttribute('data-i18n-placeholder');
    const v = getLocaleString(key);
    if(v !== undefined && v !== null) el.setAttribute('placeholder', v);
  });
  const langSelect = document.getElementById('lang-select');
  if(langSelect) langSelect.value = window._currentLang;
  updateMenuIcon(window._currentLang);
  initDataTable();
}

// dotted key 지원: "fruit.apple" → LOCALE.fruit.apple
function getLocaleString(key){
  if(!key || !window._locale) return null;
  if(Object.prototype.hasOwnProperty.call(window._locale, key)) return window._locale[key];
  const parts = key.split('.');
  let cur = window._locale;
  for(const p of parts){
    if(cur && Object.prototype.hasOwnProperty.call(cur, p)) cur = cur[p];
    else { cur = undefined; break; }
  }
  return cur;
}

// ── 모듈 export ────────────────────────────────────────────────
export { loadLocale, applyTranslations, getLocaleString };

// CURRENT_LANG getter (for compatibility)
export function getCurrentLang() {
  return window._currentLang || 'en';
}
