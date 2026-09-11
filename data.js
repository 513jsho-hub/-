// 축제부스 예약 - 공용 데이터 저장소 (localStorage 기반, 이 컴퓨터 안에서만 동작)
const STORAGE_KEY = 'festivalBoothData_v1';

const Store = {
  _default() {
    return {
      adminPassword: '1234',
      booths: []
    };
  },

  load() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = this._default();
      this.save(initial);
      return initial;
    }
    try {
      return JSON.parse(raw);
    } catch (e) {
      const initial = this._default();
      this.save(initial);
      return initial;
    }
  },

  save(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  },

  resetAll() {
    const initial = this._default();
    this.save(initial);
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
