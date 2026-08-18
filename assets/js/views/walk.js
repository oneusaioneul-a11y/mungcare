/* 산책 관리 */
import { esc, num, fmtDate, empty, modal, field, inputEl, selectEl, textareaEl, toast, confirmModal } from '../ui.js';
import * as H from '../health.js';

const WEATHER = ['맑음', '흐림', '비', '눈', '더움', '추움'];
const POOP = ['정상', '무름', '설사', '변비', '없음'];

export default {
  head: () => ({ title: '산책 관리', sub: '산책 시간·거리와 컨디션을 기록합니다' }),

  mount(root, ctx) {
    if (!ctx.dog) { root.innerHTML = `<div class="card">${empty('🐾', '반려견을 먼저 등록해 주세요.', '<a class="btn btn-primary" href="#/profile">등록하기</a>')}</div>`; return; }

    const t = H.today();
    const all = ctx.walks.list('date');
    const goal = H.walkGoal(ctx.risk?.size || 'medium', H.ageYears(ctx.dog.birth));
    const in7 = all.filter(w => H.daysBetween(w.date, t) < 7);
    const in30 = all.filter(w => H.daysBetween(w.date, t) < 30);
    const min7 = in7.reduce((s, w) => s + (+w.minutes || 0), 0);
    const km30 = in30.reduce((s, w) => s + (+w.km || 0), 0);
    const streak = (() => { let n = 0; for (let i = 0; i < 400; i++) { const d = H.addDays(t, -i); if (all.some(w => w.date === d)) n++; else if (i > 0) break; } return n; })();

    const days = [...Array(14)].map((_, i) => {
      const day = H.addDays(t, i - 13);
      const mins = all.filter(w => w.date === day).reduce((s, w) => s + (+w.minutes || 0), 0);
      return { day, mins, lb: String(new Date(day + 'T00:00:00').getDate()) };
    });
    const maxM = Math.max(goal, ...days.map(x => x.mins), 1);

    root.innerHTML = `
    <div class="stack">
      <div class="grid g4">
        <div class="stat"><div class="k">최근 7일</div><div class="v">${num(min7)}<span class="u">분</span></div>
          <div class="bar ${min7 >= goal * 7 ? 'ok' : min7 >= goal * 4 ? 'warn' : 'bad'}" style="margin-top:7px">
            <i style="width:${Math.min(100, min7 / (goal * 7) * 100)}%"></i></div>
          <div class="d">목표 ${num(goal * 7)}분 (하루 ${goal}분)</div></div>
        <div class="stat"><div class="k">최근 30일 거리</div><div class="v">${num(km30, 1)}<span class="u">km</span></div>
          <div class="d">${in30.length}회 산책</div></div>
        <div class="stat"><div class="k">연속 산책</div><div class="v">${streak}<span class="u">일</span></div>
          <div class="d">${streak >= 7 ? '잘 지키고 있어요 👏' : '매일 조금씩이 중요합니다'}</div></div>
        <div class="stat"><div class="k">1회 평균</div><div class="v">${in30.length ? num(in30.reduce((s, w) => s + (+w.minutes || 0), 0) / in30.length) : '—'}<span class="u">분</span></div>
          <div class="d">최근 30일 기준</div></div>
      </div>

      <div class="card">
        <div class="card-head"><h2>📈 최근 2주 산책 시간</h2><div class="spacer"></div>
          <button class="btn btn-sm btn-primary" data-add>+ 산책 기록</button></div>
        <div class="weekchart" style="height:110px">
          ${days.map(x => `<div class="col" title="${x.day} · ${x.mins}분">
            <div class="bar2" style="height:${Math.max(4, x.mins / maxM * 100)}%">
              <i style="height:100%;background:${x.mins >= goal ? 'var(--ok)' : x.mins ? 'var(--brand)' : 'var(--line-2)'}"></i></div>
            <div class="lb">${x.lb}</div></div>`).join('')}
        </div>
      </div>

      ${hotWarning(ctx)}

      <div class="card">
        <div class="card-head"><h2>🐾 산책 기록 (${all.length})</h2></div>
        ${all.length ? `<div class="tbl-wrap"><table>
          <thead><tr><th>날짜</th><th>시간</th><th>거리</th><th>날씨</th><th>배변</th><th>메모</th><th></th></tr></thead>
          <tbody>${all.slice(0, 60).map(w => `<tr>
            <td>${fmtDate(w.date)}</td>
            <td><b>${num(w.minutes)}분</b>${+w.minutes >= goal ? ' <span class="chip ok">목표 달성</span>' : ''}</td>
            <td>${w.km ? num(w.km, 1) + 'km' : '—'}</td>
            <td>${esc(w.weather || '—')}</td>
            <td>${w.poop ? `<span class="chip ${['설사', '무름'].includes(w.poop) ? 'warn' : ''}">${esc(w.poop)}</span>` : '—'}</td>
            <td style="color:var(--ink-3);max-width:220px">${esc(w.note || '')}</td>
            <td style="text-align:right"><button class="btn btn-sm btn-danger" data-del="${esc(w.id)}">삭제</button></td>
          </tr>`).join('')}</tbody></table></div>`
          : empty('🐾', '산책 기록이 없습니다.', '<button class="btn btn-primary" data-add>첫 산책 기록하기</button>')}
      </div>
    </div>`;

    const openForm = () => modal({
      title: '산책 기록',
      body: `<div class="inline">${field('날짜', inputEl('date', { type: 'date', value: t, required: true }))}
             ${field('시간(분)', inputEl('minutes', { type: 'number', min: 0, value: 30, required: true }))}</div>`
        + `<div class="inline3">${field('거리(km)', inputEl('km', { type: 'number', step: '0.1', min: 0 }))}
           ${field('날씨', selectEl('weather', WEATHER))}
           ${field('배변 상태', selectEl('poop', POOP))}</div>`
        + field('메모', textareaEl('note', { rows: 2, placeholder: '컨디션, 다른 강아지와의 반응, 절뚝임 여부 등' })),
      onSubmit: f => { ctx.walks.add({ ...f, minutes: +f.minutes, km: f.km ? +f.km : null }); toast('산책을 기록했습니다.'); }
    });

    root.querySelectorAll('[data-add]').forEach(b => b.addEventListener('click', openForm));
    root.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () =>
      confirmModal('기록 삭제', '이 산책 기록을 삭제할까요?', () => ctx.walks.remove(b.dataset.del))));
  }
};

function hotWarning(ctx) {
  const b = ctx.risk?.breed;
  const brachy = b && /불독|시츄|퍼그|페키니즈/.test(b.name);
  const m = new Date().getMonth() + 1;
  const summer = m >= 6 && m <= 9;
  if (!summer && !brachy) return '';
  return `<div class="alert warn"><span class="ai">🌡️</span><span>
    <b>${brachy ? '단두종은 체온 조절이 어렵습니다.' : '여름철 산책 주의'}</b><br><span style="opacity:.85">
    아스팔트에 손등을 5초간 댈 수 없다면 발바닥 화상 위험이 있습니다. 한낮을 피해 이른 아침·늦은 저녁에 산책하고,
    과호흡·잇몸 변색이 보이면 즉시 그늘로 이동해 미지근한 물로 체온을 낮춘 뒤 병원으로 가세요.</span></span></div>`;
}
