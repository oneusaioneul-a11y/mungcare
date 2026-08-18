/* 약 관리 — 복용 중인 약, 투약 체크, 재고 알림 */
import { esc, num, fmtDate, empty, modal, field, inputEl, selectEl, textareaEl, checkEl, toast, confirmModal } from '../ui.js';
import * as H from '../health.js';

const FREQ = ['1일 1회', '1일 2회', '1일 3회', '격일', '주 1회', '월 1회', '필요 시'];
const PURPOSE = ['심장', '관절', '피부', '소화기', '신장', '항생제', '진통·소염', '영양제', '기타'];

export default {
  head: () => ({ title: '약 관리', sub: '복용 중인 약, 투약 체크, 남은 수량 알림' }),

  mount(root, ctx) {
    if (!ctx.dog) { root.innerHTML = `<div class="card">${empty('💊', '반려견을 먼저 등록해 주세요.', '<a class="btn btn-primary" href="#/profile">등록하기</a>')}</div>`; return; }

    const t = H.today();
    const all = ctx.meds.list('createdAt');
    const isEnded = m => m.until && H.daysBetween(t, m.until) < 0;
    const active = all.filter(m => m.active !== false && !isEnded(m));
    const past = all.filter(m => m.active === false || isEnded(m));
    const takenToday = active.filter(m => (m.taken || []).includes(t)).length;

    root.innerHTML = `
    <div class="stack">
      <div class="grid g4">
        <div class="stat"><div class="k">복용 중</div><div class="v">${active.length}<span class="u">종</span></div>
          <div class="d">종료·중단 ${past.length}건</div></div>
        <div class="stat"><div class="k">오늘 투약 완료</div><div class="v">${takenToday}<span class="u">/ ${active.length}</span></div>
          <div class="bar ${takenToday === active.length && active.length ? 'ok' : 'warn'}" style="margin-top:7px">
            <i style="width:${active.length ? takenToday / active.length * 100 : 0}%"></i></div></div>
        <div class="stat"><div class="k">재고 부족</div><div class="v">${active.filter(m => m.stock != null && m.perDay && m.stock / m.perDay <= 5).length}<span class="u">종</span></div>
          <div class="d">5일치 이하</div></div>
        <div class="stat"><div class="k">이번 주 종료 예정</div><div class="v">${active.filter(m => m.until && H.daysBetween(t, m.until) <= 7).length}<span class="u">종</span></div>
          <div class="d">재처방 확인 필요</div></div>
      </div>

      <div class="card">
        <div class="card-head"><h2>💊 오늘의 투약 체크</h2><div class="spacer"></div>
          <button class="btn btn-sm btn-primary" data-add>+ 약 등록</button></div>
        ${active.length ? active.map(m => row(m, t)).join('')
          : empty('💊', '복용 중인 약이 없습니다.', '<button class="btn btn-primary" data-add>약 등록하기</button>')}
      </div>

      ${past.length ? `<div class="card">
        <div class="card-head"><h2>📦 종료 · 중단한 약 (${past.length})</h2></div>
        <div class="tbl-wrap"><table>
          <thead><tr><th>약 이름</th><th>목적</th><th>기간</th><th>처방</th><th></th></tr></thead>
          <tbody>${past.map(m => `<tr>
            <td><b>${esc(m.name)}</b></td><td>${esc(m.purpose || '—')}</td>
            <td>${m.from ? fmtDate(m.from) : '—'} ~ ${m.until ? fmtDate(m.until) : '—'}</td>
            <td>${esc(m.clinic || '—')}</td>
            <td style="text-align:right">
              <button class="btn btn-sm" data-resume="${esc(m.id)}">재개</button>
              <button class="btn btn-sm btn-danger" data-del="${esc(m.id)}">삭제</button></td>
          </tr>`).join('')}</tbody></table></div>
      </div>` : ''}

      <p class="disclaimer">처방약은 수의사의 지시 없이 임의로 중단하거나 용량을 바꾸지 마세요. 사람용 진통제(아세트아미노펜, 이부프로펜 등)는 반려견에게 치명적일 수 있습니다.</p>
    </div>`;

    const openForm = m => modal({
      title: m ? '약 정보 수정' : '약 등록', submitLabel: m ? '수정' : '등록',
      body: `<div class="inline">${field('약 이름', inputEl('name', { value: m?.name, required: true, placeholder: '예: 하트가드 플러스' }))}
             ${field('목적', selectEl('purpose', PURPOSE, m?.purpose))}</div>`
        + `<div class="inline">${field('1회 용량', inputEl('dose', { value: m?.dose, placeholder: '예: 1정 / 0.5ml' }))}
           ${field('투약 주기', selectEl('freq', FREQ, m?.freq))}</div>`
        + `<div class="inline">${field('시작일', inputEl('from', { type: 'date', value: m?.from || H.today() }))}
           ${field('종료 예정일', inputEl('until', { type: 'date', value: m?.until }), '비워두면 계속 복용')}</div>`
        + `<div class="inline3">${field('남은 수량', inputEl('stock', { type: 'number', min: 0, step: '0.5', value: m?.stock }))}
           ${field('단위', selectEl('unit', ['정', 'ml', '포', 'g', '회'], m?.unit))}
           ${field('하루 소모량', inputEl('perDay', { type: 'number', min: 0, step: '0.5', value: m?.perDay }), '재고 알림용')}</div>`
        + field('처방 병원', inputEl('clinic', { value: m?.clinic || ctx.dog.clinic }))
        + field('메모 · 주의사항', textareaEl('note', { value: m?.note, rows: 2, placeholder: '식후 투약, 부작용 관찰 사항 등' })),
      onSubmit: f => {
        const data = { ...f, stock: f.stock ? +f.stock : null, perDay: f.perDay ? +f.perDay : null, active: true };
        if (m) ctx.meds.update(m.id, data); else ctx.meds.add({ ...data, taken: [] });
        toast('저장했습니다.');
      }
    });

    root.querySelectorAll('[data-add]').forEach(b => b.addEventListener('click', () => openForm()));
    root.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => openForm(ctx.meds.get(b.dataset.edit))));
    root.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () =>
      confirmModal('약 삭제', '이 약 기록을 삭제할까요?', () => ctx.meds.remove(b.dataset.del))));
    root.querySelectorAll('[data-stop]').forEach(b => b.addEventListener('click', () => {
      ctx.meds.update(b.dataset.stop, { active: false }); toast('복용을 중단 처리했습니다.');
    }));
    root.querySelectorAll('[data-resume]').forEach(b => b.addEventListener('click', () => {
      ctx.meds.update(b.dataset.resume, { active: true, until: null }); toast('복용을 재개했습니다.');
    }));
    root.querySelectorAll('[data-take]').forEach(b => b.addEventListener('click', () => {
      const m = ctx.meds.get(b.dataset.take);
      const taken = new Set(m.taken || []);
      const done = taken.has(t);
      done ? taken.delete(t) : taken.add(t);
      const patch = { taken: [...taken] };
      if (!done && m.stock != null && m.perDay) patch.stock = Math.max(0, +(m.stock - m.perDay).toFixed(2));
      if (done && m.stock != null && m.perDay) patch.stock = +(m.stock + m.perDay).toFixed(2);
      ctx.meds.update(m.id, patch);
      toast(done ? '투약 체크를 해제했습니다.' : '오늘 투약 완료로 표시했습니다.');
    }));
  }
};

function row(m, t) {
  const done = (m.taken || []).includes(t);
  const daysLeft = m.stock != null && m.perDay ? Math.floor(m.stock / m.perDay) : null;
  const untilLeft = m.until ? H.daysBetween(t, m.until) : null;
  return `<div class="item">
    <div style="width:38px;height:38px;border-radius:11px;background:var(--surface-2);display:grid;place-items:center;font-size:18px;flex:none">💊</div>
    <div class="body">
      <div class="row" style="gap:7px">
        <span class="ttl">${esc(m.name)}</span>
        ${m.purpose ? `<span class="chip">${esc(m.purpose)}</span>` : ''}
        ${daysLeft != null && daysLeft <= 5 ? `<span class="chip ${daysLeft <= 2 ? 'bad' : 'warn'}">재고 ${daysLeft}일치</span>` : ''}
        ${untilLeft != null && untilLeft <= 7 ? `<span class="chip info">D-${untilLeft} 종료</span>` : ''}
      </div>
      <div class="meta">${[m.dose, m.freq, m.stock != null ? `남은 수량 ${num(m.stock)}${m.unit || '정'}` : null,
        m.from ? `${fmtDate(m.from)}부터` : null, m.clinic].filter(Boolean).map(esc).join(' · ')}</div>
      ${m.note ? `<div class="meta" style="color:var(--ink-2);margin-top:3px">${esc(m.note)}</div>` : ''}
    </div>
    <div class="row" style="align-items:flex-start">
      <button class="btn btn-sm ${done ? '' : 'btn-primary'}" data-take="${esc(m.id)}">${done ? '✓ 오늘 완료' : '오늘 투약'}</button>
      <button class="btn btn-sm" data-edit="${esc(m.id)}">수정</button>
      <button class="btn btn-sm" data-stop="${esc(m.id)}">중단</button>
    </div>
  </div>`;
}
