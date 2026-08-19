/* 진료 기록 — 병원 방문, 진단, 처방, 검사 결과, 비용 */
import { esc, num, won, fmtDate, empty, modal, field, inputEl, selectEl, textareaEl, toast, confirmModal } from '../ui.js';
import * as H from '../health.js';
import { ICONS } from '../icons.js';

const KIND = ['정기검진', '진료', '검사', '수술', '입원', '응급', '치과', '재활', '기타'];

export default {
  head: () => ({ title: '진료 기록', sub: '병원 다녀온 이야기를 여기 모아둬요' }),

  mount(root, ctx) {
    if (!ctx.dog) { root.innerHTML = `<div class="card">${empty(ICONS.hospital, '먼저 우리 아이를 소개해주세요!', '<a class="btn btn-primary" href="#/profile">소개하러 가기</a>')}</div>`; return; }

    const all = ctx.medical.list('date');
    const t = H.today();
    const thisYear = all.filter(r => r.date?.startsWith(String(new Date().getFullYear())));
    const cost = thisYear.reduce((s, r) => s + (+r.cost || 0), 0);
    const lastCheck = all.filter(r => r.kind === '정기검진')[0];
    const sinceCheck = lastCheck ? H.daysBetween(lastCheck.date, t) : null;
    const ageY = H.ageYears(ctx.dog.birth);
    const checkCycle = ageY != null && ageY >= 7 ? 180 : 365;

    root.innerHTML = `
    <div class="stack">
      <div class="grid g4">
        <div class="stat"><div class="k">모아둔 기록</div><div class="v">${all.length}<span class="u">건</span></div>
          <div class="d">올해만 ${thisYear.length}번</div></div>
        <div class="stat"><div class="k">올해 병원비</div><div class="v" style="font-size:20px">${cost ? num(cost) : '—'}<span class="u">원</span></div>
          <div class="d">적어두신 금액을 더했어요</div></div>
        <div class="stat"><div class="k">마지막 건강검진</div><div class="v" style="font-size:19px">${lastCheck ? fmtDate(lastCheck.date) : '없음'}</div>
          <div class="d">${sinceCheck != null ? `${sinceCheck}일 지났어요` : '기록을 남겨보세요'}</div></div>
        <div class="stat"><div class="k">다음 검진은 이때쯤</div><div class="v" style="font-size:19px">${lastCheck ? fmtDate(H.addDays(lastCheck.date, checkCycle)) : '—'}</div>
          <div class="d">${ageY != null && ageY >= 7 ? '나이 있는 아이는 6개월마다' : '1년에 한 번이면 충분해요'}</div></div>
      </div>

      ${sinceCheck != null && sinceCheck > checkCycle ? `<div class="alert bad"><span class="ai">🏥</span><span>
        <b>검진이 ${sinceCheck - checkCycle}일쯤 밀렸어요.</b><br><span style="opacity:.85">
        ${ageY >= 7 ? '나이가 있는 아이는 6개월마다 피검사·소변검사 받아두면 마음이 놓여요.' : '1년에 한 번만 봐줘도 이상이 있으면 일찍 잡을 수 있어요.'}</span></span></div>` : ''}

      <div class="card">
        <div class="card-head"><h2>🏥 병원 다녀온 날들</h2><div class="spacer"></div>
          <button class="btn btn-sm btn-primary" data-add>+ 병원 다녀왔어요</button></div>
        ${all.length ? `<div class="tl">${all.map(r => `
          <div class="tl-item">
            <div class="dt">${fmtDate(r.date)} · <span class="chip ${r.kind === '응급' || r.kind === '수술' ? 'bad' : r.kind === '정기검진' ? 'ok' : ''}">${esc(r.kind || '진료')}</span></div>
            <div class="tt">${esc(r.title || r.diagnosis || '진료')}</div>
            <div class="bd">
              ${r.hospital ? `🏥 ${esc(r.hospital)}${r.vet ? ` · ${esc(r.vet)} 원장` : ''}<br>` : ''}
              ${r.diagnosis ? `<b>진단</b> ${esc(r.diagnosis)}<br>` : ''}
              ${r.tests ? `<b>검사</b> ${esc(r.tests)}<br>` : ''}
              ${r.rx ? `<b>처방</b> ${esc(r.rx)}<br>` : ''}
              ${r.next ? `<b>재진</b> ${fmtDate(r.next)}${H.daysBetween(t, r.next) >= 0 ? ` (D-${H.daysBetween(t, r.next)})` : ''}<br>` : ''}
              ${r.cost ? `<b>비용</b> ${won(+r.cost)}<br>` : ''}
              ${r.note ? `<span style="white-space:pre-wrap">${esc(r.note)}</span>` : ''}
            </div>
            <div class="row" style="margin-top:7px">
              <button class="btn btn-sm" data-edit="${esc(r.id)}">수정</button>
              <button class="btn btn-sm btn-danger" data-del="${esc(r.id)}">삭제</button>
            </div>
          </div>`).join('')}</div>`
          : empty(ICONS.hospital, '아직 진료 기록이 없어요.', '<button class="btn btn-primary" data-add>첫 기록 남기기</button>')}
      </div>

      <div class="alert info"><span class="ai">🔗</span><span>
        <b>병원이랑 직접 연결하는 건 아직 준비 중이에요.</b><br><span style="opacity:.85">
        지금은 직접 적어주셔야 해요. 나중엔 명세서 사진만 찍으면 알아서 들어가게 만들 생각이에요.
        일단은 병원 다녀오신 날 명세서 보면서 바로 적어두시면, 나중에 찾아보기 정말 편해요!</span></span></div>
    </div>`;

    const openForm = r => modal({
      title: r ? '기록 고치기' : '병원 다녀왔어요', wide: true, submitLabel: r ? '고쳤어요' : '저장할게요',
      body: `<div class="inline">${field('언제 갔나요?', inputEl('date', { type: 'date', value: r?.date || H.today(), required: true }))}
             ${field('무슨 일로요?', selectEl('kind', KIND, r?.kind))}</div>`
        + field('한 줄로 적으면', inputEl('title', { value: r?.title, placeholder: '예: 자꾸 토해서 갔어요' }))
        + `<div class="inline">${field('어느 병원이요?', inputEl('hospital', { value: r?.hospital || ctx.dog.clinic }))}
           ${field('선생님 성함', inputEl('vet', { value: r?.vet }))}</div>`
        + field('뭐라고 하셨나요?', inputEl('diagnosis', { value: r?.diagnosis, placeholder: '예: 급성 위장염' }))
        + field('무슨 검사 했나요?', textareaEl('tests', { value: r?.tests, rows: 2, placeholder: '예: 혈액검사 ALT 120(정상 10~100), 복부 초음파 이상 없음' }))
        + field('어떤 처방 받았나요?', textareaEl('rx', { value: r?.rx, rows: 2, placeholder: '예: 항구토제 3일분, 처방식 급여' }))
        + `<div class="inline">${field('다시 오라고 한 날', inputEl('next', { type: 'date', value: r?.next }))}
           ${field('얼마 나왔나요?', inputEl('cost', { type: 'number', min: 0, value: r?.cost }))}</div>`
        + field('기억해둘 것', textareaEl('note', { value: r?.note, rows: 3, placeholder: '선생님이 해주신 말씀, 집에서 지켜볼 것 등' })),
      onSubmit: f => {
        const data = { ...f, cost: f.cost ? +f.cost : null };
        if (r) ctx.medical.update(r.id, data); else ctx.medical.add(data);
        toast('기록해뒀어요!');
      }
    });

    root.querySelectorAll('[data-add]').forEach(b => b.addEventListener('click', () => openForm()));
    root.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => openForm(ctx.medical.get(b.dataset.edit))));
    root.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () =>
      confirmModal('기록 지우기', '이 진료 기록을 지울까요?', () => ctx.medical.remove(b.dataset.del))));
  }
};
