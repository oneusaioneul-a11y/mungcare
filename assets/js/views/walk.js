/* 산책 관리 */
import { esc, num, fmtDate, empty, modal, field, inputEl, selectEl, textareaEl, toast, confirmModal } from '../ui.js';
import * as H from '../health.js';
import { ICONS } from '../icons.js';

const WEATHER = ['맑음', '흐림', '비', '눈', '더움', '추움'];
const POOP = ['정상', '무름', '설사', '변비', '없음'];

export default {
  head: () => ({ title: '산책 기록', sub: '얼마나 걸었고 컨디션은 어땠는지 남겨봐요' }),

  mount(root, ctx) {
    if (!ctx.dog) { root.innerHTML = `<div class="card">${empty(ICONS.paw, '먼저 우리 아이를 소개해주세요!', '<a class="btn btn-primary" href="#/profile">소개하러 가기</a>')}</div>`; return; }

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
          <div class="d">일주일에 ${num(goal * 7)}분이면 좋아요</div></div>
        <div class="stat"><div class="k">한 달 동안 걸은 거리</div><div class="v">${num(km30, 1)}<span class="u">km</span></div>
          <div class="d">${in30.length}번 나갔어요</div></div>
        <div class="stat"><div class="k">며칠째 연속</div><div class="v">${streak}<span class="u">일</span></div>
          <div class="d">${streak >= 7 ? '와, 꾸준하시네요! 👏' : '조금씩이라도 매일이 최고예요'}</div></div>
        <div class="stat"><div class="k">한 번 나가면</div><div class="v">${in30.length ? num(in30.reduce((s, w) => s + (+w.minutes || 0), 0) / in30.length) : '—'}<span class="u">분</span></div>
          <div class="d">최근 한 달 평균이에요</div></div>
      </div>

      <div class="card">
        <div class="card-head"><h2>📈 요 2주 산책 기록</h2><div class="spacer"></div>
          <button class="btn btn-sm btn-primary" data-add>+ 산책 다녀왔어요</button></div>
        <div class="weekchart" style="height:110px">
          ${days.map(x => `<div class="col" title="${x.day} · ${x.mins}분">
            <div class="bar2" style="height:${Math.max(4, x.mins / maxM * 100)}%">
              <i style="height:100%;background:${x.mins >= goal ? 'var(--ok)' : x.mins ? 'var(--brand)' : 'var(--line-2)'}"></i></div>
            <div class="lb">${x.lb}</div></div>`).join('')}
        </div>
      </div>

      ${hotWarning(ctx)}

      <div class="card">
        <div class="card-head"><h2>🐾 지금까지 다닌 산책 (${all.length})</h2></div>
        ${all.length ? `<div class="tbl-wrap"><table>
          <thead><tr><th>날짜</th><th>시간</th><th>거리</th><th>날씨</th><th>배변</th><th>메모</th><th></th></tr></thead>
          <tbody>${all.slice(0, 60).map(w => `<tr>
            <td>${fmtDate(w.date)}</td>
            <td><b>${num(w.minutes)}분</b>${+w.minutes >= goal ? ' <span class="chip ok">목표 채웠어요</span>' : ''}</td>
            <td>${w.km ? num(w.km, 1) + 'km' : '—'}</td>
            <td>${esc(w.weather || '—')}</td>
            <td>${w.poop ? `<span class="chip ${['설사', '무름'].includes(w.poop) ? 'warn' : ''}">${esc(w.poop)}</span>` : '—'}</td>
            <td style="color:var(--ink-3);max-width:220px">${esc(w.note || '')}</td>
            <td style="text-align:right"><button class="btn btn-sm btn-danger" data-del="${esc(w.id)}">삭제</button></td>
          </tr>`).join('')}</tbody></table></div>`
          : empty(ICONS.paw, '아직 산책 기록이 없어요.', '<button class="btn btn-primary" data-add>산책 기록 남기기</button>')}
      </div>
    </div>`;

    const openForm = () => modal({
      title: '산책 다녀왔어요',
      body: `<div class="inline">${field('날짜', inputEl('date', { type: 'date', value: t, required: true }))}
             ${field('얼마나 걸었나요? (분)', inputEl('minutes', { type: 'number', min: 0, value: 30, required: true }))}</div>`
        + `<div class="inline3">${field('거리(km)', inputEl('km', { type: 'number', step: '0.1', min: 0 }))}
           ${field('날씨', selectEl('weather', WEATHER))}
           ${field('응가는 어땠나요?', selectEl('poop', POOP))}</div>`
        + field('한 줄 메모', textareaEl('note', { rows: 2, placeholder: '다른 강아지랑 잘 놀았나요? 다리 절뚝이진 않았나요?' })),
      onSubmit: f => { ctx.walks.add({ ...f, minutes: +f.minutes, km: f.km ? +f.km : null }); toast('산책 잘 다녀왔네요! 🐾'); }
    });

    root.querySelectorAll('[data-add]').forEach(b => b.addEventListener('click', openForm));
    root.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () =>
      confirmModal('기록 지우기', '이 산책 기록을 지울까요?', () => ctx.walks.remove(b.dataset.del))));
  }
};

function hotWarning(ctx) {
  const b = ctx.risk?.breed;
  const brachy = b && /불독|시츄|퍼그|페키니즈/.test(b.name);
  const m = new Date().getMonth() + 1;
  const summer = m >= 6 && m <= 9;
  if (!summer && !brachy) return '';
  return `<div class="alert warn"><span class="ai">🌡️</span><span>
    <b>${brachy ? '코가 짧은 아이라 더위에 특히 약해요' : '여름 산책은 조심조심'}</b><br><span style="opacity:.85">
    바닥에 손등을 5초 못 대겠다 싶으면 발바닥 데요. 한낮은 피하고 이른 아침이나 늦은 저녁에 나가주세요.
    숨을 너무 헐떡이거나 잇몸 색이 변하면 바로 그늘로 옮겨서 미지근한 물로 몸을 식히고, 병원으로 가주세요.</span></span></div>`;
}
