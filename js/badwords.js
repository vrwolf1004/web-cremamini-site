// ── Badwords filter ────────────────────────────────────────────
let _badwords = { words: [], patterns: [] };

async function loadBadwords() {
  const files = [
    'badwords/common.json',
    'badwords/ko.json', 'badwords/en.json', 'badwords/ja.json', 'badwords/zh.json',
    'badwords/fr.json', 'badwords/es.json', 'badwords/de.json', 'badwords/it.json',
    'badwords/ru.json', 'badwords/fi.json'
  ];
  try {
    const results = await Promise.allSettled(files.map(f => fetch(f).then(r => r.ok ? r.json() : null)));
    results.forEach(r => {
      if (r.status === 'fulfilled' && r.value) {
        _badwords.words.push(...(r.value.words || []));
        _badwords.patterns.push(...(r.value.patterns || []));
      }
    });
  } catch (e) { /* 필터 로드 실패 시 무시 */ }
}
loadBadwords();

function containsBadword(text) {
  const lower = text.toLowerCase();
  if (_badwords.words && _badwords.words.some(w => lower.includes(w.toLowerCase()))) return true;
  if (_badwords.patterns && _badwords.patterns.some(p => new RegExp(p, 'i').test(text))) return true;
  return false;
}
