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
        <div style="display:flex;align-items:center;gap:6px;margin-top:6px">
          <input type="file" id="sp-${i}" accept="image/*" style="display:none" onchange="uploadStepPhoto(${i},this)">
          <button class="step-photo-btn" type="button" onclick="document.getElementById('sp-${i}').click()">📷 ${s.photoData ? '更換照片' : '上傳照片'}</button>
          ${s.photoData ? `<button class="step-photo-del" type="button" onclick="careSteps[${i}].photoData='';renderStepEditor()">✕ 刪除</button>` : ''}
        </div>
        ${s.photoData ? `<img src="${s.photoData}" class="step-photo-preview">` : ''}
      </div>
      <button class="step-del" onclick="removeStep(${i})">✕</button>
    </div>`).join('');
}

function addStep()               { careSteps.push({ id: makeId(), text: '', desc: '', time: 'NONE', photoData: '' }); renderStepEditor(); }
function addTplStep(title, desc) { careSteps.push({ id: makeId(), text: title, desc: desc, time: 'NONE', photoData: '' }); renderStepEditor(); }
function removeStep(i)           { careSteps.splice(i, 1); renderStepEditor(); }
function setStepTime(i, t)       { careSteps[i].time = t; renderStepEditor(); }

function uploadStepPhoto(i, input) {
  const file = input.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX = 700;
      let w = img.width, h = img.height;
      if (w > h) { if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; } }
      else        { if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; } }
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      careSteps[i].photoData = canvas.toDataURL('image/jpeg', 0.65);
      renderStepEditor();
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

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
let editCheckStepId = null;

function renderCarePetGrid() {
  const grid = document.getElementById('care-pet-grid');
  if (!grid) return;
  const hasCare = pets.filter(p => p.careSteps && p.careSteps.length);
  if (!hasCare.length) {
    grid.innerHTML = '<div class="empty"><div class="icon">📝</div>尚未建立任何照護手冊<br><small>請至寵物頁面點「照護手冊」按鈕建立</small></div>';
    document.getElementById('care-checklist-wrap').innerHTML = '';
    return;
  }
  if (activeCareId) {
    const pet = pets.find(p => p.id === activeCareId);
    grid.innerHTML = `<div class="care-pet-header">
      <button class="care-back-btn" onclick="backToPetGrid()">← 返回</button>
      <span class="care-pet-hdr-name">🐾 ${pet ? esc(pet.name) : ''}</span>
      ${pet ? `<button class="pet-grid-edit-btn" onclick="openPetModal('${pet.id}')" style="border:none;background:none;padding:4px 8px">✏️</button>` : ''}
    </div>`;
    return;
  }
  grid.innerHTML = `<div class="pet-grid">${hasCare.map(p => `
    <div class="pet-grid-card">
      <div class="pet-grid-main" onclick="toggleCareAccordion('${p.id}')">
        <div class="pet-grid-name">🐾 ${esc(p.name)}</div>
        <div class="pet-grid-steps">${p.careSteps.length} 個步驟</div>
      </div>
      <button class="pet-grid-edit-btn" onclick="openPetModal('${p.id}')" title="編輯寵物資料">✏️</button>
    </div>`).join('')}</div>`;
}

function backToPetGrid() {
  activeCareId = null;
  editCheckStepId = null;
  document.getElementById('care-checklist-wrap').innerHTML = '';
  renderCarePetGrid();
}

function toggleCareAccordion(petId) {
  activeCareId = petId;
  editCheckStepId = null;
  const pet = pets.find(p => p.id === petId); if (!pet) return;
  checkState = {};
  pet.careSteps.forEach(s => checkState[s.id] = false);
  renderCarePetGrid();
  renderChecklistNew(pet);
}

function editCheckStep(stepId) {
  editCheckStepId = stepId;
  const pet = pets.find(p => p.id === activeCareId);
  if (pet) renderChecklistNew(pet);
}
function cancelCheckStepEdit() {
  editCheckStepId = null;
  const pet = pets.find(p => p.id === activeCareId);
  if (pet) renderChecklistNew(pet);
}
function saveCheckStep(petId, stepId) {
  const pet = pets.find(p => p.id === petId); if (!pet) return;
  const step = pet.careSteps.find(s => s.id === stepId); if (!step) return;
  const textEl = document.getElementById('cse-text-' + stepId);
  const descEl = document.getElementById('cse-desc-' + stepId);
  if (textEl) step.text = textEl.value;
  if (descEl) step.desc = descEl.value;
  editCheckStepId = null;
  dbSet('pets/' + petId, pet);
  renderChecklistNew(pet);
  renderCarePetGrid();
  toast('✅ 步驟已更新');
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

  const renderStep = (s) => {
    if (editCheckStepId === s.id) {
      return `<div class="check-item editing">
        <div class="check-edit-form">
          <input id="cse-text-${s.id}" value="${esc(s.text)}" placeholder="步驟名稱">
          <textarea id="cse-desc-${s.id}">${esc(s.desc || '')}</textarea>
          <div class="check-edit-actions">
            <button class="btn-ghost" style="font-size:0.74rem" onclick="saveCheckStep('${pet.id}','${s.id}')">✓ 儲存</button>
            <button class="btn-ghost" style="font-size:0.74rem" onclick="cancelCheckStepEdit()">取消</button>
          </div>
        </div>
      </div>`;
    }
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
          ${s.photoData ? `<img src="${s.photoData}" class="check-step-photo" onclick="window.open(this.src)">` : ''}
        </div>
        <button class="check-edit-btn" onclick="editCheckStep('${s.id}')" title="編輯此步驟">✏️</button>
      </div>`;
  };

  const stepsHtml = steps.map(renderStep).join('') || '<div style="padding:16px;text-align:center;color:var(--muted);font-size:0.8rem">暫無照護步驟</div>';

  const svcBadgeMap = {
    stay:  '<span class="svc-badge svc-badge-stay">🏠 住宿</span>',
    visit: '<span class="svc-badge svc-badge-visit">🚗 到府</span>',
    both:  '<span class="svc-badge svc-badge-both">🏠🚗 兩種都有</span>',
  };
  const svcBadge = svcBadgeMap[pet.serviceType] || '';

  const wrap = document.getElementById('care-checklist-wrap');
  wrap.innerHTML = `
    <div style="margin-top:12px">
      ${svcBadge ? `<div style="margin-bottom:8px">${svcBadge}</div>` : ''}
      <div class="care-prog">
        <span class="care-prog-txt">${done}/${total} 完成</span>
        <div class="care-bar-wrap"><div class="care-bar" style="width:${pct}%"></div></div>
        <span class="care-num">${pct}%</span>
      </div>
      <div class="card">
        ${stepsHtml}
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
