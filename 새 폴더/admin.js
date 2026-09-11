// 관리자 페이지 로직
const SESSION_KEY = 'festivalAdminLoggedIn';
let currentData = null;

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 1800);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function isLoggedIn() {
  return sessionStorage.getItem(SESSION_KEY) === 'yes';
}

function render() {
  const main = document.getElementById('mainArea');
  if (!currentData) {
    main.innerHTML = `<div class="empty">불러오는 중...</div>`;
    return;
  }
  if (!isLoggedIn()) {
    renderLogin(main);
  } else {
    renderDashboard(main);
  }
}

function renderLogin(main) {
  main.innerHTML = `
    <div class="card login-box">
      <h3>관리자 로그인</h3>
      <label>비밀번호</label>
      <input type="password" id="pwInput" placeholder="관리자 비밀번호">
      <button id="loginBtn" style="width:100%;">로그인</button>
      <div class="small-note">기본 비밀번호: 1234 (로그인 후 변경 가능)</div>
    </div>
  `;
  const doLogin = () => {
    const pw = document.getElementById('pwInput').value;
    if (pw === currentData.adminPassword) {
      sessionStorage.setItem(SESSION_KEY, 'yes');
      render();
    } else {
      showToast('비밀번호가 틀렸습니다');
    }
  };
  document.getElementById('loginBtn').addEventListener('click', doLogin);
  document.getElementById('pwInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doLogin();
  });
}

function renderDashboard(main) {
  main.innerHTML = `
    <div class="card">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <h3 style="margin:0;">새 부스 만들기</h3>
        <button class="ghost" id="logoutBtn">로그아웃</button>
      </div>
      <div style="margin-top:14px;">
        <label>부스 이름</label>
        <input type="text" id="newName" placeholder="예) 분식 부스">
        <label>설명 (선택)</label>
        <input type="text" id="newDesc" placeholder="예) 떡볶이, 순대 판매">
        <label>위치 (선택)</label>
        <input type="text" id="newLoc" placeholder="예) 2-3반 교실">
        <div class="form-row">
          <div>
            <label>운영 시작</label>
            <input type="time" id="newStart" value="10:00">
          </div>
          <div>
            <label>운영 종료</label>
            <input type="time" id="newEnd" value="14:00">
          </div>
        </div>
        <div class="form-row">
          <div>
            <label>슬롯 길이(분)</label>
            <input type="number" id="newSlotMin" value="30" min="5" step="5">
          </div>
          <div>
            <label>슬롯당 정원(명)</label>
            <input type="number" id="newCap" value="4" min="1">
          </div>
        </div>
        <button id="createBtn" style="width:100%;">부스 만들기</button>
      </div>
    </div>

    <div class="section-title" style="display:flex; justify-content:space-between; align-items:center;">
      <span>부스 목록 (${currentData.booths.length})</span>
      <button class="ghost" id="refreshBtn">🔄 새로고침</button>
    </div>
    <div id="boothManageList"></div>

    <div class="card">
      <button class="ghost" id="changePwBtn">비밀번호 변경</button>
      <button class="danger" id="resetBtn">전체 데이터 초기화</button>
    </div>
  `;

  document.getElementById('logoutBtn').addEventListener('click', () => {
    sessionStorage.removeItem(SESSION_KEY);
    render();
  });

  document.getElementById('createBtn').addEventListener('click', createBooth);
  document.getElementById('refreshBtn').addEventListener('click', loadAndRender);

  document.getElementById('changePwBtn').addEventListener('click', async () => {
    const next = prompt('새 관리자 비밀번호를 입력하세요', currentData.adminPassword);
    if (next && next.trim()) {
      currentData.adminPassword = next.trim();
      await Store.save(currentData);
      showToast('비밀번호가 변경되었습니다');
    }
  });

  document.getElementById('resetBtn').addEventListener('click', async () => {
    if (confirm('모든 부스와 예약 데이터가 삭제됩니다. 계속할까요?')) {
      currentData = await Store.resetAll();
      render();
      showToast('초기화되었습니다');
    }
  });

  renderBoothManageList();
}

async function createBooth() {
  const name = document.getElementById('newName').value.trim();
  const desc = document.getElementById('newDesc').value.trim();
  const loc = document.getElementById('newLoc').value.trim();
  const start = document.getElementById('newStart').value;
  const end = document.getElementById('newEnd').value;
  const slotMin = parseInt(document.getElementById('newSlotMin').value, 10);
  const cap = parseInt(document.getElementById('newCap').value, 10);

  if (!name) { showToast('부스 이름을 입력해주세요'); return; }
  if (!start || !end || start >= end) { showToast('운영 시간을 확인해주세요'); return; }
  if (!slotMin || slotMin <= 0) { showToast('슬롯 길이를 확인해주세요'); return; }
  if (!cap || cap <= 0) { showToast('정원을 확인해주세요'); return; }

  const slots = Store.buildSlots(start, end, slotMin, cap);
  if (slots.length === 0) {
    showToast('운영 시간 안에 생성 가능한 슬롯이 없습니다');
    return;
  }

  currentData.booths.push({
    id: Store.genId('booth'),
    name, description: desc, location: loc,
    isOpen: true,
    slotMinutes: slotMin,
    capacityPerSlot: cap,
    startTime: start,
    endTime: end,
    slots
  });

  await Store.save(currentData);
  render();
  showToast('부스가 생성되었습니다');
}

function renderBoothManageList() {
  const el = document.getElementById('boothManageList');
  if (currentData.booths.length === 0) {
    el.innerHTML = `<div class="empty">아직 만든 부스가 없어요.</div>`;
    return;
  }

  el.innerHTML = currentData.booths.map(booth => {
    const totalCap = booth.slots.reduce((s, sl) => s + sl.capacity, 0);
    const totalRes = booth.slots.reduce((s, sl) => s + sl.reservations.length, 0);

    const slotsHtml = booth.slots.map(slot => {
      const resHtml = slot.reservations.map(r => `
        <div class="res-item">
          <span>${escapeHtml(r.name)} ${r.classInfo ? `(${escapeHtml(r.classInfo)})` : ''}</span>
          <button class="icon-btn" data-booth="${booth.id}" data-slot="${slot.id}" data-res="${r.id}">취소</button>
        </div>
      `).join('');
      return `
        <div style="margin-top:10px; padding-top:10px; border-top:1px dashed var(--border);">
          <strong>${slot.start}~${slot.end}</strong>
          <span class="small-note">(${slot.reservations.length}/${slot.capacity})</span>
          <div class="reservation-list">${resHtml || '<div class="small-note">예약 없음</div>'}</div>
        </div>
      `;
    }).join('');

    return `
      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
          <div>
            <h3 style="margin:0 0 4px;">${escapeHtml(booth.name)}
              <span class="badge ${booth.isOpen ? '' : 'closed'}">${booth.isOpen ? '열림' : '닫힘'}</span>
            </h3>
            <div class="booth-meta">${booth.startTime}~${booth.endTime} · 예약 ${totalRes}/${totalCap}</div>
          </div>
        </div>
        <div style="display:flex; gap:8px; margin-top:10px;">
          <button class="secondary toggle-btn" data-id="${booth.id}">${booth.isOpen ? '부스 닫기' : '부스 열기'}</button>
          <button class="ghost detail-btn" data-id="${booth.id}">예약 현황 보기</button>
          <button class="danger delete-btn" data-id="${booth.id}">삭제</button>
        </div>
        <div class="slot-detail" data-id="${booth.id}" style="display:none; margin-top:8px;">
          ${slotsHtml}
        </div>
      </div>
    `;
  }).join('');

  el.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => toggleBooth(btn.dataset.id));
  });
  el.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteBooth(btn.dataset.id));
  });
  el.querySelectorAll('.detail-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const panel = el.querySelector(`.slot-detail[data-id="${btn.dataset.id}"]`);
      panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    });
  });
  el.querySelectorAll('.icon-btn').forEach(btn => {
    btn.addEventListener('click', () => cancelReservation(btn.dataset.booth, btn.dataset.slot, btn.dataset.res));
  });
}

async function toggleBooth(boothId) {
  const booth = Store.findBooth(currentData, boothId);
  booth.isOpen = !booth.isOpen;
  await Store.save(currentData);
  render();
}

async function deleteBooth(boothId) {
  if (!confirm('이 부스와 모든 예약을 삭제할까요?')) return;
  currentData.booths = currentData.booths.filter(b => b.id !== boothId);
  await Store.save(currentData);
  render();
  showToast('부스가 삭제되었습니다');
}

async function cancelReservation(boothId, slotId, resId) {
  if (!confirm('이 예약을 취소할까요?')) return;
  const booth = Store.findBooth(currentData, boothId);
  const slot = Store.findSlot(booth, slotId);
  slot.reservations = slot.reservations.filter(r => r.id !== resId);
  await Store.save(currentData);
  render();
  showToast('예약이 취소되었습니다');
}

async function loadAndRender() {
  try {
    currentData = await Store.load();
  } catch (e) {
    return;
  }
  render();
}

loadAndRender();
