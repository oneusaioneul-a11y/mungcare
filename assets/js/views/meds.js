/* 약 관리 — 복용 중인 약, 투약 체크, 재고 알림 */
import { esc, num, fmtDate, empty, modal, field, inputEl, selectEl, textareaEl, checkEl, toast, confirmModal } from '../ui.js';
import * as H from '../health.js';
import { ICONS } from '../icons.js';

const FREQ = ['1일 1회', '1일 2회', '1일 3회', '격일', '주 1회', '월 1회', '필요 시'];
const PURPOSE = ['심장', '관절', '피부', '소화기', '신장', '항생제', '진통·소염', '영양제', '기타'];

export default {
  head: () => ({ title: '약 챙기기', sub: '오늘 약 줬는지, 얼마나 남았는지 같이 봐요' }),

  mount(root, ctx) {
    if (!ctx.dog) { root.innerHTML = `<div class="card">${empty(ICONS.pill, '먼저 우리 아이를 소개해주세요!', '<a class="btn btn-primary" href="#/profile">소개하러 가기</a>')}</div>`; return; }

    const t = H.today();
    const all = ctx.meds.list('createdAt');
    const isEnded = m => m.until && H.daysBetween(t, m.until) < 0;
    const active = all.filter(m => m.active !== false && !isEnded(m));
    const past = all.filter(m => m.active === false || isEnded(m));
    const takenToday = active.filter(m => (m.taken || []).includes(t)).length;

    root.innerHTML = `
    <div class="stack">
      <div class="grid g4">
        <div class="stat"><div class="k">먹는 중</div><div class="v">${active.length}<span class="u">종</span></div>
          <div class="d">끝난 약 ${past.length}가지</div></div>
        <div class="stat"><div class="k">오늘 챙긴 약</div><div class="v">${takenToday}<span class="u">/ ${active.length}</span></div>
          <div class="bar ${takenToday === active.length && active.length ? 'ok' : 'warn'}" style="margin-top:7px">
            <i style="width:${active.length ? takenToday / active.length * 100 : 0}%"></i></div></div>
        <div class="stat"><div class="k">곧 떨어져요</div><div class="v">${active.filter(m => m.stock != null && m.perDay && m.stock / m.perDay <= 5).length}<span class="u">종</span></div>
          <div class="d">5일치도 안 남았어요</div></div>
        <div class="stat"><div class="k">이번 주에 끝나요</div><div class="v">${active.filter(m => m.until && H.daysBetween(t, m.until) <= 7).length}<span class="u">종</span></div>
          <div class="d">재처방 받을지 확인해보세요</div></div>
      </div>

      <div class="card">
        <div class="card-head"><h2>💊 오늘 약 챙겼나요?</h2><div class="spacer"></div>
          <button class="btn btn-sm btn-primary" data-add>+ 약 등록</button></div>
        ${active.length ? active.map(m => row(m, t)).join('')
          : empty(ICONS.pill, '지금 먹는 약은 없네요.', '<button class="btn btn-primary" data-add>약 등록하기</button>')}
      </div>

      ${past.length ? `<div class="card">
        <div class="card-head"><h2>📦 지금은 안 먹는 약 (${past.length})</h2></div>
        <div class="tbl-wrap"><table>
          <thead><tr><th>약 이름</th><th>목적</th><th>기간</th><th>처방</th><th></th></tr></thead>
          <tbody>${past.map(m => `<tr>
            <td><b>${esc(m.name)}</b></td><td>${esc(m.purpose || '—')}</td>
            <td>${m.from ? fmtDate(m.from) : '—'} ~ ${m.until ? fmtDate(m.until) : '—'}</td>
            <td>${esc(m.clinic || '—')}</td>
            <td style="text-align:right">
              <button class="btn btn-sm" data-resume="${esc(m.id)}">다시 먹여요</button>
              <button class="btn btn-sm btn-danger" data-del="${esc(m.id)}">삭제</button></td>
          </tr>`).join('')}</tbody></table></div>
      </div>` : ''}

      <p class="disclaimer">처방받은 약은 마음대로 끊거나 양을 바꾸지 말아주세요. 그리고 사람 먹는 진통제(타이레놀, 부루펜 같은 것)는 강아지에게 정말 위험해요. 절대 주시면 안 돼요!</p>
    </div>`;

    const openForm = m => modal({
      title: m ? '약 정보 고치기' : '약 등록하기', submitLabel: m ? '고쳤어요' : '등록할게요',
      body: `<div class="inline">${field('약 이름이 뭐예요?', inputEl('name', { value: m?.name, required: true, placeholder: '예: 하트가드 플러스' }))}
             ${field('어디에 쓰는 약인가요?', selectEl('purpose', PURPOSE, m?.purpose))}</div>`
        + `<div class="inline">${field('한 번에 얼마나?', inputEl('dose', { value: m?.dose, placeholder: '예: 1정 / 0.5ml' }))}
           ${field('얼마나 자주?', selectEl('freq', FREQ, m?.freq))}</div>`
        + `<div class="inline">${field('시작일', inputEl('from', { type: 'date', value: m?.from || H.today() }))}
           ${field('언제까지 먹나요?', inputEl('until', { type: 'date', value: m?.until }), '계속 먹는 약이면 비워두세요')}</div>`
        + `<div class="inline3">${field('남은 수량', inputEl('stock', { type: 'number', min: 0, step: '0.5', value: m?.stock }))}
           ${field('단위', selectEl('unit', ['정', 'ml', '포', 'g', '회'], m?.unit))}
           ${field('하루에 쓰는 양', inputEl('perDay', { type: 'number', min: 0, step: '0.5', value: m?.perDay }), '떨어질 때 알려드리려고요')}</div>`
        + field('처방받은 병원', inputEl('clinic', { value: m?.clinic || ctx.dog.clinic }))
        + field('메모', textareaEl('note', { value: m?.note, rows: 2, placeholder: '밥 먹고 주기, 졸려하는지 지켜보기 등' })),
      onSubmit: f => {
        const data = { ...f, stock: f.stock ? +f.stock : null, perDay: f.perDay ? +f.perDay : null, active: true };
        if (m) ctx.meds.update(m.id, data); else ctx.meds.add({ ...data, taken: [] });
        toast('기록해뒀어요!');
      }
    });

    root.querySelectorAll('[data-add]').forEach(b => b.addEventListener('click', () => openForm()));
    root.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => openForm(ctx.meds.get(b.dataset.edit))));
    root.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () =>
      confirmModal('약 지우기', '이 약 기록을 지울까요?', () => ctx.meds.remove(b.dataset.del))));
    root.querySelectorAll('[data-stop]').forEach(b => b.addEventListener('click', () => {
      ctx.meds.update(b.dataset.stop, { active: false }); toast('중단으로 옮겨뒀어요.');
    }));
    root.querySelectorAll('[data-resume]').forEach(b => b.addEventListener('click', () => {
      ctx.meds.update(b.dataset.resume, { active: true, until: null }); toast('다시 복용 중으로 바꿨어요!');
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
      toast(done ? '체크 풀었어요.' : '오늘 약 챙겼어요! 👏');
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
        ${daysLeft != null && daysLeft <= 5 ? `<span class="chip ${daysLeft <= 2 ? 'bad' : 'warn'}">${daysLeft}일치 남음</span>` : ''}
        ${untilLeft != null && untilLeft <= 7 ? `<span class="chip info">D-${untilLeft} 종료</span>` : ''}
      </div>
      <div class="meta">${[m.dose, m.freq, m.stock != null ? `${num(m.stock)}${m.unit || '정'} 남음` : null,
        m.from ? `${fmtDate(m.from)}부터 먹는 중` : null, m.clinic].filter(Boolean).map(esc).join(' · ')}</div>
      ${m.note ? `<div class="meta" style="color:var(--ink-2);margin-top:3px">${esc(m.note)}</div>` : ''}
    </div>
    <div class="row" style="align-items:flex-start">
      <button class="btn btn-sm ${done ? '' : 'btn-primary'}" data-take="${esc(m.id)}">${done ? '✓ 오늘 줬어요' : '오늘 줬어요?'}</button>
      <button class="btn btn-sm" data-edit="${esc(m.id)}">수정</button>
      <button class="btn btn-sm" data-stop="${esc(m.id)}">그만 먹여요</button>
    </div>
  </div>`;
}
