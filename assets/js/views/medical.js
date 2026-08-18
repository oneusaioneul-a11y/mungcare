/* 진료 기록 — 병원 방문, 진단, 처방, 검사 결과, 비용 */
import { esc, num, won, fmtDate, empty, modal, field, inputEl, selectEl, textareaEl, toast, confirmModal } from '../ui.js';
import * as H from '../health.js';

const KIND = ['정기검진', '진료', '검사', '수술', '입원', '응급', '치과', '재활', '기타'];

export default {
  head: () => ({ title: '진료 기록', sub: '병원 방문 이력을 한 곳에 모아 둡니다' }),

  mount(root, ctx) {
    if (!ctx.dog) { root.innerHTML = `<div class="card">${empty('🏥', '반려견을 먼저 등록해 주세요.', '<a class="btn btn-primary" href="#/profile">등록하기</a>')}</div>`; return; }

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
        <div class="stat"><div class="k">전체 기록</div><div class="v">${all.length}<span class="u">건</span></div>
          <div class="d">올해 ${thisYear.length}건</div></div>
        <div class="stat"><div class="k">올해 진료비</div><div class="v" style="font-size:20px">${cost ? num(cost) : '—'}<span class="u">원</span></div>
          <div class="d">입력된 금액 합계</div></div>
        <div class="stat"><div class="k">마지막 정기검진</div><div class="v" style="font-size:19px">${lastCheck ? fmtDate(lastCheck.date) : '없음'}</div>
          <div class="d">${sinceCheck != null ? `${sinceCheck}일 경과` : '기록을 남겨보세요'}</div></div>
        <div class="stat"><div class="k">다음 검진 권장</div><div class="v" style="font-size:19px">${lastCheck ? fmtDate(H.addDays(lastCheck.date, checkCycle)) : '—'}</div>
          <div class="d">${ageY != null && ageY >= 7 ? '노령견 6개월 주기' : '연 1회 주기'}</div></div>
      </div>

      ${sinceCheck != null && sinceCheck > checkCycle ? `<div class="alert bad"><span class="ai">🏥</span><span>
        <b>정기검진이 ${sinceCheck - checkCycle}일 지연되었습니다.</b><br><span style="opacity:.85">
        ${ageY >= 7 ? '노령견은 6개월마다 혈액·소변 검사를 권장합니다.' : '연 1회 종합 검진으로 조기에 이상을 발견할 수 있습니다.'}</span></span></div>` : ''}

      <div class="card">
        <div class="card-head"><h2>🏥 진료 이력</h2><div class="spacer"></div>
          <button class="btn btn-sm btn-primary" data-add>+ 진료 기록</button></div>
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
          : empty('🏥', '진료 기록이 없습니다.', '<button class="btn btn-primary" data-add>첫 기록 남기기</button>')}
      </div>

      <div class="alert info"><span class="ai">🔗</span><span>
        <b>병원 진료 기록 연계는 준비 중입니다.</b><br><span style="opacity:.85">
        현재는 보호자가 직접 입력하는 방식입니다. 향후 동물병원 EMR 연동 또는 진료 명세서 이미지 인식을 통한
        자동 등록을 지원할 예정입니다. 지금은 진료 후 받은 명세서를 보고 바로 입력해 두시면 이력 관리가 쉬워집니다.</span></span></div>
    </div>`;

    const openForm = r => modal({
      title: r ? '진료 기록 수정' : '진료 기록', wide: true, submitLabel: r ? '수정' : '저장',
      body: `<div class="inline">${field('방문일', inputEl('date', { type: 'date', value: r?.date || H.today(), required: true }))}
             ${field('구분', selectEl('kind', KIND, r?.kind))}</div>`
        + field('제목', inputEl('title', { value: r?.title, placeholder: '예: 구토 증상으로 내원' }))
        + `<div class="inline">${field('병원', inputEl('hospital', { value: r?.hospital || ctx.dog.clinic }))}
           ${field('담당 수의사', inputEl('vet', { value: r?.vet }))}</div>`
        + field('진단', inputEl('diagnosis', { value: r?.diagnosis, placeholder: '예: 급성 위장염' }))
        + field('검사 · 결과', textareaEl('tests', { value: r?.tests, rows: 2, placeholder: '예: 혈액검사 ALT 120(정상 10~100), 복부 초음파 이상 없음' }))
        + field('처방 · 치료', textareaEl('rx', { value: r?.rx, rows: 2, placeholder: '예: 항구토제 3일분, 처방식 급여' }))
        + `<div class="inline">${field('재진 예정일', inputEl('next', { type: 'date', value: r?.next }))}
           ${field('비용(원)', inputEl('cost', { type: 'number', min: 0, value: r?.cost }))}</div>`
        + field('메모', textareaEl('note', { value: r?.note, rows: 3, placeholder: '수의사 설명, 주의사항, 집에서 관찰할 점 등' })),
      onSubmit: f => {
        const data = { ...f, cost: f.cost ? +f.cost : null };
        if (r) ctx.medical.update(r.id, data); else ctx.medical.add(data);
        toast('저장했습니다.');
      }
    });

    root.querySelectorAll('[data-add]').forEach(b => b.addEventListener('click', () => openForm()));
    root.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => openForm(ctx.medical.get(b.dataset.edit))));
    root.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () =>
      confirmModal('기록 삭제', '이 진료 기록을 삭제할까요?', () => ctx.medical.remove(b.dataset.del))));
  }
};
