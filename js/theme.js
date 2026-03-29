// ── Theme ──────────────────────────────────────────────────────
import { THEMES, DARK_THEMES, MENU_ICON_MAP_LANG, FALLBACK_THEMES } from './globals.js';
import { $, $all } from './common.js';
import { getLocaleString, LOCALE } from './i18n.js';

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
  THEMES.forEach(t=>{
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
    const header = (LOCALE && LOCALE['themeListHeader']) ? LOCALE['themeListHeader'] : 'Theme introductions';
    container.innerHTML = `<h4>${header}</h4><ul>${THEMES.map(t=>`<li><strong>${t.name}</strong> — ${getLocalizedThemeDesc(t.id,t.description)}</li>`).join('')}</ul>`;
    if(pageTitle) pageTitle.textContent = (LOCALE && LOCALE['pageTitle']) ? LOCALE['pageTitle'] : 'Sample Page';
    return;
  }
  const t = THEMES.find(x=>x.id===selectedId) || FALLBACK_THEMES.find(x=>x.id===selectedId);
  if(t){
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

// ── 모듈 export ────────────────────────────────────────────────
export { loadThemesManifest, loadThemeCss, updateMenuIcon, setTheme, renderThemePicker, renderThemeIntro, getLocalizedThemeDesc };
