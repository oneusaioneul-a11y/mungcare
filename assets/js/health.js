/* health.js — 건강 관련 계산 및 위험 알림 엔진.
   여기의 모든 수치는 일반적인 참고 기준이며 수의학적 진단을 대체하지 않습니다. */

export const DAY = 86400000;
/* 날짜는 항상 '현지 시간' 기준으로 다룹니다.
   toISOString()은 UTC로 변환하므로 KST(+9)에서는 하루가 밀립니다. */
const pad = n => String(n).padStart(2, '0');
export const iso = d => { const x = new Date(d); return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`; };
export const today = () => iso(new Date());
export const parse = s => { const d = new Date(s + (String(s).length === 10 ? 'T00:00:00' : '')); return isNaN(d) ? null : d; };
export const daysBetween = (a, b) => Math.round((parse(iso(b)) - parse(iso(a))) / DAY);
export const addDays = (s, n) => iso(new Date(parse(s).getTime() + n * DAY));

export function ageYears(birth) {
  const b = parse(birth); if (!b) return null;
  return (Date.now() - b.getTime()) / (365.2425 * DAY);
}
export function ageLabel(birth) {
  const y = ageYears(birth);
  if (y == null) return '나이 미등록';
  if (y < 1) { const m = Math.max(0, Math.round(y * 12)); return `${m}개월`; }
  const yy = Math.floor(y), mm = Math.round((y - yy) * 12);
  return mm ? `${yy}년 ${mm}개월` : `${yy}년`;
}
export function humanAge(birth, sizeKey = 'medium') {
  // 견종 크기별 사람 나이 환산(근사): 1년=15세, 2년=24세, 이후 크기별 가산
  const y = ageYears(birth); if (y == null) return null;
  const per = { toy: 4, small: 4.5, medium: 5, large: 6 }[sizeKey] || 5;
  if (y <= 1) return Math.round(y * 15);
  if (y <= 2) return Math.round(15 + (y - 1) * 9);
  return Math.round(24 + (y - 2) * per);
}

/* ── 칼로리 ─────────────────────────────────────────────── */
export function rer(kg) { return kg > 0 ? 70 * Math.pow(kg, 0.75) : 0; }
export const ACTIVITY = [
  { key: 'puppy0', label: '퍼피 (4개월 미만)', f: 3.0 },
  { key: 'puppy1', label: '퍼피 (4~12개월)', f: 2.0 },
  { key: 'intact', label: '성견 · 중성화 안 함', f: 1.8 },
  { key: 'neutered', label: '성견 · 중성화 함', f: 1.6 },
  { key: 'active', label: '활동량 많음', f: 2.0 },
  { key: 'diet', label: '체중 감량 중', f: 1.0 },
  { key: 'gain', label: '체중 증량 필요', f: 1.7 },
  { key: 'senior', label: '노령 · 활동 적음', f: 1.4 }
];
export function mer(kg, key) {
  const f = ACTIVITY.find(a => a.key === key)?.f ?? 1.6;
  return rer(kg) * f;
}
export function suggestActivity(dog) {
  const y = ageYears(dog?.birth);
  if (y == null) return 'neutered';
  if (y < 0.34) return 'puppy0';
  if (y < 1) return 'puppy1';
  if (y >= 8) return 'senior';
  return dog?.neutered ? 'neutered' : 'intact';
}
/** 사료 kcal/kg 기준 하루 급여량(g) */
export function gramsPerDay(kcalPerDay, kcalPerKgFood) {
  if (!kcalPerKgFood) return null;
  return (kcalPerDay / kcalPerKgFood) * 1000;
}

/* ── 산책 목표 ──────────────────────────────────────────── */
export function walkGoal(sizeKey, ageY) {
  const base = { toy: 30, small: 40, medium: 60, large: 75 }[sizeKey] || 45;
  if (ageY == null) return base;
  if (ageY < 1) return Math.round(base * 0.6);
  if (ageY >= 10) return Math.round(base * 0.6);
  if (ageY >= 8) return Math.round(base * 0.8);
  return base;
}

/* ── 예방접종 스케줄 ────────────────────────────────────── */
export function vaccinePlan(dog, records, VAX) {
  const out = [];
  const birth = dog?.birth;
  for (const v of VAX.core) {
    const done = records.filter(r => r.code === v.code).sort((a, b) => a.date.localeCompare(b.date));
    const last = done[done.length - 1];
    let due = null, stage = '';
    if (done.length < v.puppy.length && birth) {
      const wk = v.puppy[done.length];
      due = addDays(birth, wk * 7);
      stage = `기초 ${done.length + 1}차 (생후 ${wk}주)`;
    } else if (last) {
      due = addDays(last.date, v.booster);
      stage = '연간 추가 접종';
    } else if (!birth) {
      stage = '생년월일 등록 필요';
    }
    out.push({
      code: v.code, name: v.name, protects: v.protects, required: v.required,
      count: done.length, total: v.puppy.length, last: last?.date || null, due, stage,
      overdue: due ? daysBetween(due, today()) > 0 : false,
      dday: due ? daysBetween(today(), due) : null
    });
  }
  return out;
}

export function preventivePlan(records, VAX) {
  return VAX.preventives.map(p => {
    const done = records.filter(r => r.code === p.code).sort((a, b) => a.date.localeCompare(b.date));
    const last = done[done.length - 1];
    const due = last ? addDays(last.date, p.cycle) : null;
    return {
      code: p.code, name: p.name, note: p.note, cycle: p.cycle, last: last?.date || null, due,
      dday: due ? daysBetween(today(), due) : null,
      overdue: due ? daysBetween(due, today()) > 0 : !last
    };
  });
}

/* ── 견종·연령 위험 엔진 ────────────────────────────────── */
export function breedInfo(BREEDS, name) {
  if (!name) return null;
  return BREEDS.breeds.find(b => b.name === name)
      || BREEDS.breeds.find(b => name.includes(b.name.split('(')[0]))
      || BREEDS.breeds.find(b => b.name.startsWith('믹스견'));
}
export function stageFor(BREEDS, ageY) {
  if (ageY == null) return null;
  return BREEDS.ageStages.find(s => ageY >= s.from && ageY < s.to) || BREEDS.ageStages[BREEDS.ageStages.length - 1];
}
export function riskList(BREEDS, dog) {
  const b = breedInfo(BREEDS, dog?.breed);
  if (!b) return { breed: null, size: 'medium', now: [], later: [], stage: null };
  const y = ageYears(dog?.birth);
  const now = [], later = [];
  for (const r of b.risks) {
    const active = y == null ? r.from === 0 : (y >= r.from && (r.to == null || y < r.to));
    const upcoming = y != null && r.from > y && r.from - y <= 2;
    if (active) now.push(r); else if (upcoming) later.push({ ...r, inYears: +(r.from - y).toFixed(1) });
  }
  const order = { high: 0, mid: 1, low: 2 };
  now.sort((a, b2) => order[a.severity] - order[b2.severity]);
  return { breed: b, size: b.size, now, later, stage: stageFor(BREEDS, y) };
}

/* ── 통합 알림 ──────────────────────────────────────────── */
export function buildAlerts({ dog, vax, prev, meds, weights, allergies, walks }) {
  const a = [];
  if (!dog) return a;

  vax.filter(v => v.due).forEach(v => {
    if (v.overdue) a.push({ level: 'bad', icon: '💉', title: `${v.name} 접종 기한 초과`,
      body: `${v.stage} · 예정일 ${v.due}`, amt: `${Math.abs(v.dday)}일 지남`, to: '#/vaccine' });
    else if (v.dday <= 14) a.push({ level: 'warn', icon: '💉', title: `${v.name} 접종 예정`,
      body: `${v.stage} · ${v.due}`, amt: `D-${v.dday}`, to: '#/vaccine' });
  });

  prev.forEach(p => {
    if (!p.last) a.push({ level: 'info', icon: '🛡️', title: `${p.name} 기록 없음`,
      body: p.note, amt: '등록 필요', to: '#/vaccine' });
    else if (p.overdue) a.push({ level: 'bad', icon: '🛡️', title: `${p.name} 지연`,
      body: `마지막 ${p.last} · ${p.cycle}일 주기`, amt: `${Math.abs(p.dday)}일 지남`, to: '#/vaccine' });
    else if (p.dday <= 5) a.push({ level: 'warn', icon: '🛡️', title: `${p.name} 예정`,
      body: `다음 ${p.due}`, amt: `D-${p.dday}`, to: '#/vaccine' });
  });

  meds.filter(m => m.active !== false).forEach(m => {
    if (m.until && daysBetween(m.until, today()) > 0) return;
    if (m.until) {
      const left = daysBetween(today(), m.until);
      if (left <= 3) a.push({ level: 'info', icon: '💊', title: `${m.name} 투약 종료 임박`,
        body: `${m.dose || ''} ${m.freq || ''}`.trim(), amt: `D-${left}`, to: '#/meds' });
    }
    if (m.stock != null && m.perDay) {
      const days = Math.floor(m.stock / m.perDay);
      if (days <= 5) a.push({ level: days <= 2 ? 'bad' : 'warn', icon: '💊', title: `${m.name} 재고 부족`,
        body: `남은 수량 ${m.stock}${m.unit || '정'}`, amt: `약 ${days}일치`, to: '#/meds' });
    }
  });

  if (allergies?.length) {
    const sev = allergies.filter(x => x.severity === 'high');
    if (sev.length) a.push({ level: 'bad', icon: '⚠️', title: '심한 알러지가 있는 아이예요',
      body: sev.map(x => x.name).join(', ') + ' — 간식이나 사료 살 때 성분표 꼭 봐주세요!', to: '#/allergy' });
  }

  const w = [...(weights || [])].sort((x, y) => y.date.localeCompare(x.date));
  if (w.length >= 2) {
    const diff = (w[0].kg - w[1].kg) / w[1].kg * 100;
    const gap = daysBetween(w[1].date, w[0].date);
    if (Math.abs(diff) >= 10 && gap <= 90) a.push({ level: 'bad', icon: '⚖️',
      title: `체중이 ${gap}일 사이 ${diff > 0 ? '증가' : '감소'}`,
      body: `${w[1].kg}kg → ${w[0].kg}kg 이에요. 이렇게 갑자기 바뀌면 한 번 진료받아보시는 게 좋아요.`,
      amt: `${diff > 0 ? '+' : ''}${diff.toFixed(1)}%`, to: '#/profile' });
  }

  const last7 = (walks || []).filter(x => daysBetween(x.date, today()) < 7);
  if (!last7.length && (walks || []).length) a.push({ level: 'warn', icon: '🐾',
    title: '일주일째 산책 기록이 없어요', body: '산책은 관절이랑 체중, 스트레스 관리의 기본이에요. 짧게라도 나가볼까요?', to: '#/walk' });

  const order = { bad: 0, warn: 1, info: 2, ok: 3 };
  return a.sort((x, y) => order[x.level] - order[y.level]);
}
