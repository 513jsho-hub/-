// 축제부스 예약 - 공용 데이터 저장소
// 서버(serve.js)의 /api/data 를 통해 저장 - 같은 와이파이의 다른 기기와 데이터가 공유됩니다.
const Store = {
  _default() {
    return {
      adminPassword: '1234',
      booths: []
    };
  },

  async load() {
    try {
      const res = await fetch('/api/data');
      if (!res.ok) throw new Error('서버 응답 오류');
      return await res.json();
    } catch (e) {
      alert('서버에 연결할 수 없습니다. node serve.js 를 실행 중인지 확인해주세요.\n' + e.message);
      throw e;
    }
  },

  async save(data) {
    const res = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('저장 실패');
  },

  async resetAll() {
    const initial = this._default();
    await this.save(initial);
    return initial;
  },

  genId(prefix) {
    return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  },

  // 운영 시작/종료 시간과 슬롯 길이(분)로 시간대 목록 생성
  buildSlots(startTime, endTime, slotMinutes, capacity) {
    const toMin = (t) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    const toTime = (min) => {
      const h = Math.floor(min / 60).toString().padStart(2, '0');
      const m = (min % 60).toString().padStart(2, '0');
      return `${h}:${m}`;
    };
    const start = toMin(startTime);
    const end = toMin(endTime);
    const slots = [];
    for (let t = start; t + slotMinutes <= end; t += slotMinutes) {
      slots.push({
        id: this.genId('slot'),
        start: toTime(t),
        end: toTime(t + slotMinutes),
        capacity: capacity,
        reservations: []
      });
    }
    return slots;
  },

  findBooth(data, boothId) {
    return data.booths.find(b => b.id === boothId);
  },

  findSlot(booth, slotId) {
    return booth.slots.find(s => s.id === slotId);
  }
};
