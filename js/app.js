// ══ State ══
let sitters = [], pets = [], records = [];
let careSteps = [];
let dragSrcEl = null;
let _saveTimer = null;

// ══ 密碼保護 ══
function checkLogin() {
  const pw = document.getElementById('login-pw').value;
  if (pw === '') {
    document.getElementById('login-screen').style.display = 'none';
    sessionStorage.setItem('tw_auth', '1');
  } else {
    document.getElementById('login-err').style.display = 'block';
    document.getElementById('login-pw').value = '';
  }
}
if (sessionStorage.getItem('tw_auth') === '1') {
  document.getElementById('login-screen').style.display = 'none';
}

// ══ Boot ══
window.onload = () => {
  const waitForDB = setInterval(() => {
    if (!window._dbReady) return;
    clearInterval(waitForDB);
    initApp();
  }, 100);
};

function initApp() {
  setupDateListeners();
  const db = window._db, r = window._ref, ov = window._onValue;
  ov(r(db, 'sitters'), (snap) => { sitters = snap.val() || []; renderSitterList(); populateOpSelect(); populatePetSelects(); renderCarePetGrid(); });
  ov(r(db, 'pets'),    (snap) => { pets = snap.val() || [];    renderPetList(); populatePetSelects(); renderCarePetGrid(); });
  ov(r(db, 'records'), (snap) => { records = snap.val() || []; updateMonthFilter(); renderRecords(); });
  setDateDefaults();
}

function setDateDefaults() {
  const t = todayStr();
  ['s-ci-date', 's-co-date', 'v-start', 'v-end'].forEach(id => {
    const el = document.getElementById(id);
    if (el && !el.value) el.value = t;
  });
  const ciT = document.getElementById('s-ci-time');
  const coT = document.getElementById('s-co-time');
  if (ciT && !ciT.value) ciT.value = '07:00';
  if (coT && !coT.value) coT.value = '07:00';
}

function setupDateListeners() {
  document.getElementById('s-ci-date').addEventListener('change', function () {
    const co = document.getElementById('s-co-date');
    if (!co.dataset.manual) co.value = this.value;
    stayCalc();
  });
  document.getElementById('s-co-date').addEventListener('change', function () { this.dataset.manual = '1'; stayCalc(); });
  document.getElementById('s-ci-time').addEventListener('change', stayCalc);
  document.getElementById('s-co-time').addEventListener('change', stayCalc);
  document.getElementById('v-end').addEventListener('change', function () { this.dataset.manual = '1'; visitCalc(); });
}

// ══ Helpers ══
const todayStr = () => new Date().toISOString().slice(0, 10);
const makeId = () => Date.now() + '_' + Math.random().toString(36).slice(2);
const esc = s => String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const fmt = n => '$' + Math.round(n).toLocaleString();
const getOp = () => document.getElementById('operatorSel').value || '未知';

// ══ Firebase 儲存（防抖）══
function saveData() {
  if (!window._dbReady) return;
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => {
    const db = window._db, r = window._ref, s = window._set;
    s(r(db, 'sitters'), sitters.length ? sitters : []);
    s(r(db, 'pets'),    pets.length ? pets : []);
    s(r(db, 'records'), records.length ? records : []);
  }, 400);
}

// ══ Tabs ══
function switchTab(tab) {
  ['sitters', 'pets', 'care', 'stay', 'visit', 'records'].forEach(t => {
    document.getElementById('page-' + t).classList.toggle('active', t === tab);
    document.getElementById('tab-' + t).classList.toggle('active', t === tab);
  });
  if (['stay', 'visit', 'care'].includes(tab)) populatePetSelects();
  if (tab === 'care') renderCarePetGrid();
  if (tab === 'records') { updateMonthFilter(); renderRecords(); }
}

function renderAll() {
  renderSitterList(); populateOpSelect();
  renderPetList(); populatePetSelects();
  renderCarePetGrid();
  updateMonthFilter(); renderRecords();
}

// ══ Modal helpers ══
function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
function closeBg(id, e) { if (e.target === document.getElementById(id)) closeModal(id); }

// ══ Toast ══
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2400);
}
