/* 식단 관리 — 칼로리 계산 + 급여 기록 */
import { esc, num, fmtDate, empty, modal, field, inputEl, selectEl, textareaEl, toast, confirmModal } from '../ui.js';
import * as H from '../health.js';
import { ICONS } from '../icons.js';

export default {
  head: ctx => ({ title: '밥 기록', sub: ctx.dog ? `${ctx.dog.name}는 하루에 얼마나 먹어야 할까요?` : '' }),

  mount(root, ctx) {
    if (!ctx.dog) { root.innerHTML = `<div class="card">${empty(ICONS.bowl, '먼저 우리 아이를 소개해주세요!', '<a class="btn btn-primary" href="#/profile">소개하러 가기</a>')}</div>`; return; }

    const d = ctx.dog;
    const actKey = d.activity || H.suggestActivity(d);
    const kg = Number(d.weight) || 0;
    const RER = H.rer(kg), MER = H.mer(kg, actKey);
    const kcalPerKgFood = Number(d.foodKcal) || 3600;
    const gday = H.gramsPerDay(MER, kcalPerKgFood);

    const t = H.today();
    const all = ctx.meals.list('date');
    const todayMeals = all.filter(m => m.date === t);
    const kcalToday = todayMeals.reduce((s, m) => s + (+m.kcal || 0), 0);
    const pct = MER ? kcalToday / MER * 100 : 0;

    const days = [...Array(7)].map((_, i) => {
      const day = H.addDays(t, i - 6);
      const k = all.filter(m => m.date === day).reduce((s, m) => s + (+m.kcal || 0), 0);
      return { day, k, lb: ['일', '월', '화', '수', '목', '금', '토'][new Date(day + 'T00:00:00').getDay()] };
    });
    const maxK = Math.max(MER || 1, ...days.map(x => x.k), 1);
    const allergyNames = ctx.allergies.raw().map(a => a.name);

    root.innerHTML = `
    <div class="stack">
      ${!kg ? `<div class="alert warn"><span class="ai">⚖️</span><span><b>몸무게를 알려주세요!</b><br>
        <span style="opacity:.85">밥양 계산은 몸무게가 있어야 해요. <a href="#/profile">프로필에서 적어주시면</a> 바로 계산해드릴게요.</span></span></div>` : ''}

      <div class="grid g4">
        <div class="stat"><div class="k">하루 이만큼</div><div class="v">${num(MER)}<span class="u">kcal</span></div>
          <div class="d">RER ${num(RER)} × ${H.ACTIVITY.find(a => a.key === actKey)?.f}</div></div>
        <div class="stat"><div class="k">사료로 치면</div><div class="v">${gday ? num(gday) : '—'}<span class="u">g/일</span></div>
          <div class="d">사료 ${num(kcalPerKgFood)}kcal/kg 기준</div></div>
        <div class="stat"><div class="k">오늘 먹은 양</div><div class="v">${num(kcalToday)}<span class="u">kcal</span></div>
          <div class="bar ${pct > 115 ? 'bad' : pct > 100 ? 'warn' : 'ok'}" style="margin-top:7px"><i style="width:${Math.min(100, pct)}%"></i></div>
          <div class="d">하루치의 ${num(pct)}%예요</div></div>
        <div class="stat"><div class="k">간식은 여기까지</div><div class="v">${num(MER * 0.1)}<span class="u">kcal</span></div>
          <div class="d">하루 먹는 양의 10% 넘지 않게</div></div>
      </div>

      <div class="grid g2">
        <div class="card">
          <div class="card-head"><h2>📊 요 일주일 얼마나 먹었나</h2><div class="spacer"></div><span class="hint">하루 ${num(MER)}kcal이 기준이에요</span></div>
          <div class="weekchart">
            ${days.map(x => `<div class="col" title="${x.day} · ${num(x.k)}kcal">
              <div class="bar2" style="height:${Math.max(4, x.k / maxK * 100)}%">
                <i style="height:100%;background:${x.k > MER * 1.15 ? 'var(--bad)' : 'var(--brand)'}"></i></div>
              <div class="lb">${x.lb}</div></div>`).join('')}
          </div>
        </div>

        <div class="card">
          <div class="card-head"><h2>🥫 요즘 먹는 사료</h2><div class="spacer"></div>
            <button class="btn btn-sm" data-food>사료 등록하기</button></div>
          ${d.foodName ? `
            <div class="item"><div class="body">
              <div class="ttl">${esc(d.foodName)}</div>
              <div class="meta">${num(kcalPerKgFood)}kcal/kg · 하루 ${gday ? num(gday) + 'g' : '—'} · 1일 ${d.mealsPerDay || 2}회 급여 시 ${gday ? num(gday / (d.mealsPerDay || 2)) : '—'}g씩</div>
            </div></div>
            ${d.foodNote ? `<p style="font-size:12.5px;color:var(--ink-2);margin:10px 0 0;white-space:pre-wrap">${esc(d.foodNote)}</p>` : ''}`
            : empty(ICONS.bowl, '사료를 등록해두면 하루에 몇 g 줘야 할지 알아서 계산해드려요.')}
          <div class="disclaimer" style="margin-top:14px">사료 봉투 뒤에 “대사 에너지(ME)” 라고 적힌 숫자를 그대로 넣어주시면 돼요. 나중엔 제품명만 넣으면 자동으로 채워지게 만들 계획이에요!</div>
        </div>
      </div>

      ${allergyNames.length ? `<div class="alert warn"><span class="ai">⚠️</span><span>
        <b>${esc(allergyNames.join(', '))} 알러지가 있는 아이예요</b><br>
        <span style="opacity:.85">밥 기록할 때 이 재료가 들어가면 저희가 바로 알려드릴게요.</span></span></div>` : ''}

      <div class="card">
        <div class="card-head"><h2>🍽️ 그동안 먹은 것들</h2><div class="spacer"></div>
          <button class="btn btn-sm btn-primary" data-add>+ 밥 기록하기</button></div>
        ${all.length ? `<div class="tbl-wrap"><table>
          <thead><tr><th>날짜</th><th>시간</th><th>구분</th><th>메뉴</th><th>양</th><th>칼로리</th><th>메모</th><th></th></tr></thead>
          <tbody>${all.slice(0, 60).map(m => `<tr>
            <td>${fmtDate(m.date)}</td><td>${esc(m.time || '—')}</td>
            <td><span class="chip ${m.type === '간식' ? 'warn' : m.type === '화식' ? 'ok' : ''}">${esc(m.type || '사료')}</span></td>
            <td><b>${esc(m.name)}</b>${allergyNames.some(a => m.name?.includes(a)) ? ' <span class="chip bad">알러지 성분</span>' : ''}</td>
            <td>${m.grams ? num(m.grams) + 'g' : '—'}</td><td>${m.kcal ? num(m.kcal) : '—'}</td>
            <td style="color:var(--ink-3);max-width:200px">${esc(m.note || '')}</td>
            <td style="text-align:right"><button class="btn btn-sm btn-danger" data-del="${esc(m.id)}">삭제</button></td>
          </tr>`).join('')}</tbody></table></div>`
          : empty(ICONS.bowl, '아직 밥 기록이 없어요.', '<button class="btn btn-primary" data-add>첫 기록 남기기</button>')}
      </div>
    </div>`;

    const addMeal = () => modal({
      title: '밥 먹었어요',
      body: `<div class="inline">${field('날짜', inputEl('date', { type: 'date', value: t, required: true }))}
             ${field('시간', inputEl('time', { type: 'time' }))}</div>`
          + field('뭘 먹었나요?', inputEl('name', { required: true, placeholder: '예: 오리 사료, 소고기 화식' }))
          + `<div class="inline3">
             ${field('구분', selectEl('type', ['사료', '화식', '간식', '영양제', '기타']))}
             ${field('급여량(g)', inputEl('grams', { type: 'number', min: 0, step: '1' }))}
             ${field('칼로리', inputEl('kcal', { type: 'number', min: 0 }))}</div>`
          + field('한 줄 메모', textareaEl('note', { placeholder: '잘 먹었나요? 응가는 괜찮았나요?', rows: 2 })),
      onSubmit: f => {
        const grams = f.grams ? +f.grams : null;
        let kcal = f.kcal ? +f.kcal : null;
        if (!kcal && grams && f.type === '사료') kcal = Math.round(grams / 1000 * kcalPerKgFood);
        if (allergyNames.some(a => f.name.includes(a))) toast('⚠️ 잠깐! 알러지 있는 재료가 들어있어요', 3500);
        ctx.meals.add({ ...f, grams, kcal: kcal || 0 });
        toast('기록해뒀어요!');
      }
    });

    root.querySelectorAll('[data-add]').forEach(b => b.addEventListener('click', addMeal));
    root.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () =>
      confirmModal('기록 지우기', '이 밥 기록을 지울까요?', () => ctx.meals.remove(b.dataset.del))));

    root.querySelector('[data-food]')?.addEventListener('click', () => {
      import('../store.js').then(({ dogs }) => modal({
        title: '요즘 먹는 사료',
        body: field('사료 이름이 뭐예요?', inputEl('foodName', { value: d.foodName, placeholder: '예: 오리&고구마 어덜트' }))
            + `<div class="inline">
               ${field('열량(kcal/kg)', inputEl('foodKcal', { type: 'number', min: 0, value: d.foodKcal || 3600 }), '봉투 뒤 ME 숫자 그대로')}
               ${field('1일 급여 횟수', inputEl('mealsPerDay', { type: 'number', min: 1, max: 6, value: d.mealsPerDay || 2 }))}</div>`
            + field('메모', textareaEl('foodNote', { value: d.foodNote, placeholder: '어디서 샀는지, 사료 바꾸는 중인지 등', rows: 2 })),
        onSubmit: f => {
          dogs.update(d.id, {
            foodName: f.foodName.trim(), foodKcal: +f.foodKcal || 3600,
            mealsPerDay: +f.mealsPerDay || 2, foodNote: f.foodNote
          });
          toast('사료 정보 저장했어요!');
        }
      }));
    });
  }
};
