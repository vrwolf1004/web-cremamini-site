// ── Global state ──────────────────────────────────────────────
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

// ── DOM helpers (common.js에서 import) ────────────────────────────
// import { $, $all } from './common.js'

// ── Theme constants ────────────────────────────────────────────
const DARK_THEMES = ['dark','cyberpunk'];
const MENU_ICON_MAP_LANG = {
  'ko': 'menu-basic.svg',
  'en': 'menu-basic.svg',
  'ja': 'menu-vaporwave.svg',
  'zh': 'menu-vaporwave.svg',
  'fr': 'menu-rococo.svg',
  'es': 'menu-newtro.svg',
  'de': 'menu-bauhaus.svg',
  'it': 'menu-newtro.svg',
  'ru': 'menu-cyberpunk.svg',
  'fi': 'menu-flat.svg'
};

// ── Comment state ──────────────────────────────────────────────
let _cachedComments = [];
let _currentUid = null;
let _lastCommentTime = 0;
let _submitting = false;
let _currentThemeId = 'basic';
let _unsubscribeComments = null;
const COMMENT_MAX = 100;
const COMMENT_COOLDOWN = 30000;

// ── Initialize window properties for mutable state ────────────
if (!window._themes) window._themes = null;
if (!window._locale) window._locale = null;
if (!window._currentLang) window._currentLang = 'en';
if (!window._cachedComments) window._cachedComments = [];
if (!window._currentUid) window._currentUid = null;
if (!window._lastCommentTime) window._lastCommentTime = 0;
if (!window._submitting) window._submitting = false;
if (!window._currentThemeId) window._currentThemeId = 'basic';
if (!window._unsubscribeComments) window._unsubscribeComments = null;

// ── 모듈 export ────────────────────────────────────────────────
export {
  FALLBACK_THEMES,
  DARK_THEMES, MENU_ICON_MAP_LANG,
  COMMENT_MAX, COMMENT_COOLDOWN
};
