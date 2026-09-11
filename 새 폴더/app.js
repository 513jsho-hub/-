// 학생용 부스 예약 페이지 로직
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 1800);
}

function render() {
  const data = Store.load();
  const listEl = document.getElementById('boothList');
  const openBooths = data.booths.filter(b => b.isOpen);

  if (openBooths.length === 0) {
    listEl.innerHTML = `<div class="empty">아직 열린 부스가 없어요.<br>관리자가 부스를 열면 여기에 표시됩니다.</div>`;
    return;
  }

  listEl.innerHTML = openBooths.map(booth => {
    const slotsHtml = booth.slots.map(slot => {
      const reserved = slot.reservations.length;
      const remaining = slot.capacity - reserved;
      const isFull = remaining <= 0;
      return `
        <div class="slot-btn ${isFull ? 'full' : ''}" data-booth="${booth.id}" data-slot="${slot.id}">
          <span class="time">${slot.start}~${slot.end}</span>
          <span class="cap">${isFull ? '마감' : `${remaining}자리 남음`}</span>
        </div>
      `;
    }).join('');

    return `
      <div class="card booth-card">
        <h3>${escapeHtml(booth.name)}${booth.location ? `<span class="badge">${escapeHtml(booth.location)}</span>` : ''}</h3>
        <div class="booth-meta">운영시간 ${booth.startTime} ~ ${booth.endTime} · 슬롯당 ${booth.capacityPerSlot}명</div>
        ${booth.description ? `<div class="booth-desc">${escapeHtml(booth.description)}</div>` : ''}
        <div class="slot-grid">${slotsHtml || '<div class="small-note">예약 가능한 시간대가 없습니다.</div>'}</div>
      </div>
    `;
  }).join('');

  listEl.querySelectorAll('.slot-btn:not(.full)').forEach(el => {
    el.addEventListener('click', () => openReserveModal(el.dataset.booth, el.dataset.slot));
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function openReserveModal(boothId, slotId) {
  const data = Store.load();
  const booth = Store.findBooth(data, boothId);
  const slot = Store.findSlot(booth, slotId);
  const remaining = slot.capacity - slot.reservations.length;

  const root = document.getElementById('modalRoot');
  root.innerHTML = `
    <div class="modal-backdrop" id="backdrop">
      <div class="modal">
        <h3>${escapeHtml(booth.name)} 예약</h3>
        <div class="small-note">${slot.start} ~ ${slot.end} · 남은 자리 ${remaining}명</div>
        <div style="margin-top:14px;">
          <label>이름</label>
          <input type="text" id="resName" placeholder="예) 홍길동">
          <label>학년/반/번호</label>
          <input type="text" id="resClass" placeholder="예) 2학년 3반 15번">
        </div>
        <div style="display:flex; gap:8px; margin-top:6px;">
          <button class="ghost" id="cancelBtn" style="flex:1;">취소</button>
          <button id="confirmBtn" style="flex:1;">예약하기</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('cancelBtn').addEventListener('click', closeModal);
  document.getElementById('backdrop').addEventListener('click', (e) => {
    if (e.target.id === 'backdrop') closeModal();
  });
  document.getElementById('confirmBtn').addEventListener('click', () => {
    const name = document.getElementById('resName').value.trim();
    const classInfo = document.getElementById('resClass').value.trim();
    if (!name) {
      showToast('이름을 입력해주세요');
      return;
    }
    reserve(boothId, slotId, name, classInfo);
  });
}

function closeModal() {
  document.getElementById('modalRoot').innerHTML = '';
}

function reserve(boothId, slotId, name, classInfo) {
  const data = Store.load();
  const booth = Store.findBooth(data, boothId);
  const slot = Store.findSlot(booth, slotId);

  if (slot.reservations.length >= slot.capacity) {
    showToast('죄송해요, 방금 마감되었어요');
    closeModal();
    render();
    return;
  }

  slot.reservations.push({
    id: Store.genId('res'),
    name,
    classInfo,
    createdAt: new Date().toISOString()
  });

  Store.save(data);
  closeModal();
  render();
  showToast('예약이 완료되었습니다!');
}

render();
