// ══ Care Manual Editor ══

function openCareModal(petId) {
  const pet = pets.find(p => p.id === petId); if (!pet) return;
  document.getElementById('care-pet-id').value = petId;
  document.getElementById('careModalTitle').textContent = pet.name + ' 照護手冊';
  careSteps = JSON.parse(JSON.stringify(pet.careSteps || []));
  renderStepEditor();
  openModal('careModal');
}

function renderStepEditor() {
  const list = document.getElementById('careStepList');
  if (!careSteps.length) { list.innerHTML = '<div style="padding:16px;text-align:center;color:var(--muted);font-size:0.8rem">點上方模板或「自訂步驟」新增</div>'; return; }
  list.innerHTML = careSteps.map((s, i) => `
    <div class="step-item" draggable="true" data-idx="${i}"
      ondragstart="dStart(event,${i})" ondragover="dOver(event)" ondrop="dDrop(event,${i})" ondragend="dEnd()">
      <span class="step-drag">☰</span>
      <div class="step-body">
        <input value="${esc(s.text)}" placeholder="大標（步驟名稱）" oninput="careSteps[${i}].text=this.value">
        <textarea class="step-desc" placeholder="說明（細項內容）" oninput="careSteps[${i}].desc=this.value">${esc(s.desc || '')}</textarea>
        <div class="step-tags">
          <button class="step-tag ${s.time === 'AM' ? 'am' : ''}" onclick="setStepTime(${i},'AM')">☀️ 早上</button>
          <button class="step-tag ${s.time === 'PM' ? 'pm' : ''}" onclick="setStepTime(${i},'PM')">🌙 晚上</button>
          <button class="step-tag ${s.time === 'BOTH' ? 'both' : ''}" onclick="setStepTime(${i},'BOTH')">早晚</button>
          <button class="step-tag ${!s.time || s.time === 'NONE' ? 'both' : ''}"
            style="${!s.time || s.time === 'NONE' ? 'border-color:var(--muted);background:#f5f5f5;color:var(--muted)' : ''}"
            onclick="setStepTime(${i},'NONE')">不指定</button>
        </div>
      </div>
      <button class="step-del" onclick="removeStep(${i})">✕</button>
    </div>`).join('');
}

function addStep()               { careSteps.push({ id: makeId(), text: '', desc: '', time: 'BOTH' }); renderStepEditor(); }
function addTplStep(title, desc) { careSteps.push({ id: makeId(), text: title, desc: desc, time: 'BOTH' }); renderStepEditor(); }
function removeStep(i)           { careSteps.splice(i, 1); renderStepEditor(); }
function setStepTime(i, t)       { careSteps[i].time = t; renderStepEditor(); }

function saveCareManual() {
  const petId = document.getElementById('care-pet-id').value;
  const pet = pets.find(p => p.id === petId); if (!pet) return;
  pet.careSteps = JSON.parse(JSON.stringify(careSteps));
  dbSet('pets/' + pet.id, pet); closeModal('careModal'); toast('✅ 照護手冊已儲存');
}

// Drag & drop
function dStart(e, i) { dragSrcEl = i; e.dataTransfer.effectAllowed = 'move'; }
function dOver(e)     { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }
function dDrop(e, i)  {
  e.preventDefault();
  if (dragSrcEl === null || dragSrcEl === i) return;
  const moved = careSteps.splice(dragSrcEl, 1)[0];
  careSteps.splice(i, 0, moved);
  dragSrcEl = null; renderStepEditor();
}
function dEnd() { dragSrcEl = null; }

// ══ 備忘 Checklist ══
let checkState = {};
let activeCareId = null;

function renderCarePetGrid() {
  const grid = document.getElementById('care-pet-grid');
  if (!grid) return;
  const hasCare = pets.filter(p => p.careSteps && p.careSteps.length);
  if (!hasCare.length) {
    grid.innerHTML = '<div class="empty"><div class="icon">📝</div>尚未建立任何照護手冊<br><small>請至寵物頁面點「照護手冊」按鈕建立</small></div>';
    document.getElementById('care-checklist-wrap').innerHTML = '';
    return;
  }
  grid.innerHTML = `<div class="pet-grid">${hasCare.map(p => `
    <button class="pet-grid-btn ${activeCareId === p.id ? 'active' : ''}" onclick="toggleCareAccordion('${p.id}')">
      <div class="pet-grid-name">🐾 ${esc(p.name)}</div>
      <div class="pet-grid-steps">${p.careSteps.length} 個步驟</div>
    </button>`).join('')}</div>`;
}

function toggleCareAccordion(petId) {
  if (activeCareId === petId) {
    activeCareId = null;
    document.getElementById('care-checklist-wrap').innerHTML = '';
  } else {
    activeCareId = petId;
    const pet = pets.find(p => p.id === petId); if (!pet) return;
    checkState = {};
    pet.careSteps.forEach(s => checkState[s.id] = false);
    renderChecklistNew(pet);
  }
  renderCarePetGrid();
}

function renderChecklistNew(pet) {
  const steps = pet.careSteps;
  const total = steps.length;
  const done  = Object.values(checkState).filter(Boolean).length;
  const pct   = total ? Math.round(done / total * 100) : 0;
  const chipMap = {
    AM:   '<span class="time-chip chip-am">☀️ 早上</span>',
    PM:   '<span class="time-chip chip-pm">🌙 晚上</span>',
    BOTH: '<span class="time-chip chip-both">早晚</span>',
    NONE: '', '': ''
  };
  const mapLinks = (text) => {
    if (!text) return '';
    const q = encodeURIComponent(text);
    return `<div style="display:flex;gap:6px;margin-top:5px">
      <a href="https://maps.google.com/?q=${q}" target="_blank" style="font-size:0.68rem;padding:2px 9px;border-radius:20px;background:#e8f4fd;color:#2a7ae2;border:1px solid #b3d4f5;text-decoration:none">📍 Google Map</a>
      <a href="maps://maps.apple.com/?q=${q}" style="font-size:0.68rem;padding:2px 9px;border-radius:20px;background:#e8f5ee;color:#2a7a4a;border:1px solid #a3d4b3;text-decoration:none">🍎 Apple Map</a>
    </div>`;
  };
  const wrap = document.getElementById('care-checklist-wrap');
  wrap.innerHTML = `
    <div style="margin-top:12px">
      <div class="care-prog">
        <span class="care-prog-txt">${done}/${total} 完成</span>
        <div class="care-bar-wrap"><div class="care-bar" style="width:${pct}%"></div></div>
        <span class="care-num">${pct}%</span>
      </div>
      <div class="card">
        ${steps.map(s => {
          const isAddr = s.text.includes('地址');
          return `
          <div class="check-item ${checkState[s.id] ? 'done' : ''}" id="ci-${s.id}">
            <div class="check-box ${checkState[s.id] ? 'checked' : ''}" onclick="toggleCheck('${pet.id}','${s.id}')">
              <span class="check-tick">✓</span>
            </div>
            <div class="check-content">
              <div class="check-label">${esc(s.text)}</div>
              ${s.desc ? `<div style="font-size:0.76rem;color:var(--muted);margin-top:3px;white-space:pre-wrap">${esc(s.desc)}</div>` : ''}
              ${isAddr && s.desc ? mapLinks(s.desc) : ''}
              ${chipMap[s.time || ''] || ''}
            </div>
          </div>`;
        }).join('')}
      </div>
      <button class="btn-primary" style="background:linear-gradient(135deg,#7ab89a,#4a9a7a)" onclick="resetChecklistNew('${pet.id}')">↺ 重置清單</button>
    </div>`;
}

function toggleCheck(petId, stepId) {
  checkState[stepId] = !checkState[stepId];
  const pet = pets.find(p => p.id === petId); if (pet) renderChecklistNew(pet);
}
function resetChecklistNew(petId) {
  const pet = pets.find(p => p.id === petId); if (!pet) return;
  pet.careSteps.forEach(s => checkState[s.id] = false);
  renderChecklistNew(pet);
}
