// ── UI components ──────────────────────────────────────────────
function showToast(message, type='info', timeout=3000){
  let container = document.getElementById('toast-container');
  if(!container){
    container = document.createElement('div'); container.id='toast-container'; container.className='toast-container'; document.body.appendChild(container);
  }
  const toast = document.createElement('div'); toast.className = 'toast ' + type; toast.textContent = message;
  container.appendChild(toast);
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

function initFormSamples(){
  const range = document.getElementById('sample-range');
  const rangeVal = document.getElementById('range-val');
  if(range && rangeVal){ range.addEventListener('input', ()=> rangeVal.textContent = range.value); rangeVal.textContent = range.value }

  const primary = document.getElementById('primary-btn');
  if(primary) primary.addEventListener('click', ()=> alert((LOCALE && LOCALE.btnPrimaryClick) || 'Primary 버튼 클릭'));

  const ghost = document.getElementById('ghost-btn');
  if(ghost) ghost.addEventListener('click', ()=> alert((LOCALE && LOCALE.btnGhostClick) || 'Ghost 버튼 클릭'));

  const input = document.getElementById('sample-input'); if(input) input.addEventListener('change', ()=> console.log('input:', input.value));
}

function initDataTable(){
  const tbody = document.querySelector('#sample-table tbody');
  if(!tbody) return;
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
