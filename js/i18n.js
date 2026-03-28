// ── i18n ──────────────────────────────────────────────────────
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
  if(langSelect) langSelect.value = CURRENT_LANG;
  updateMenuIcon(CURRENT_LANG);
  initDataTable();
}

// dotted key 지원: "fruit.apple" → LOCALE.fruit.apple
function getLocaleString(key){
  if(!key || !LOCALE) return null;
  if(Object.prototype.hasOwnProperty.call(LOCALE, key)) return LOCALE[key];
  const parts = key.split('.');
  let cur = LOCALE;
  for(const p of parts){
    if(cur && Object.prototype.hasOwnProperty.call(cur, p)) cur = cur[p];
    else { cur = undefined; break; }
  }
  return cur;
}
