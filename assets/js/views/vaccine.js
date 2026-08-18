/* 예방접종 · 구충 · 정기검진 */
import { esc, num, fmtDate, empty, modal, field, inputEl, selectEl, textareaEl, toast, confirmModal } from '../ui.js';
import * as H from '../health.js';

export default {
  head: () => ({ title: '예방접종 · 구충', sub: '생년월일 기준으로 다음 접종일을 자동 계산합니다' }),

  mount(root, ctx) {
    if (!ctx.dog) { root.innerHTML = `<div class="card">${empty('💉', '반려견을 먼저 등록해 주세요.', '<a class="btn btn-primary" href="#/profile">등록하기</a>')}</div>`; return; }
    const VAX = ctx.DB.vaccines;
    if (!VAX) { root.innerHTML = `<div class="card">${empty('⚠️', '접종 기준 데이터를 불러오지 못했습니다.')}</div>`; return; }

    const records = ctx.vaccines.list('date');
    const all = [...VAX.core.map(v => ({ v: v.code, l: v.name })), ...VAX.preventives.map(v => ({ v: v.code, l: v.name }))];
    const overdue = [...ctx.vaxPlan.filter(v => v.overdue), ...ctx.prevPlan.filter(p => p.last && p.overdue)];

    root.innerHTML = `
    <div class="stack">
      ${!ctx.dog.birth ? `<div class="alert warn"><span class="ai">📅</span><span>
        <b>생년월일이 등록되지 않았습니다.</b><br><span style="opacity:.85">
        퍼피 기초 접종 스케줄은 생년월일이 있어야 계산됩니다. <a href="#/profile">프로필에서 등록</a>해 주세요.</span></span></div>` : ''}

      ${overdue.length ? `<div class="alert bad"><span class="ai">⏰</span><span>
        <b>기한이 지난 항목이 ${overdue.length}건 있습니다.</b><br><span style="opacity:.85">
        ${esc(overdue.map(o => o.name).join(', '))}</span></span></div>` : ''}

      <div class="card">
        <div class="card-head"><h2>💉 핵심 예방접종</h2><div class="spacer"></div>
          <button class="btn btn-sm btn-primary" data-add>+ 접종 기록</button></div>
        <div class="tbl-wrap"><table>
          <thead><tr><th>백신</th><th>예방 대상</th><th>진행</th><th>마지막 접종</th><th>다음 예정</th><th>상태</th></tr></thead>
          <tbody>${ctx.vaxPlan.map(v => `<tr>
            <td><b>${esc(v.name)}</b>${v.required ? ' <span class="chip bad">필수</span>' : ''}</td>
            <td style="color:var(--ink-3);font-size:12px;max-width:230px">${esc(v.protects)}</td>
            <td><div class="bar ${v.count >= v.total ? 'ok' : ''}" style="width:74px"><i style="width:${Math.min(100, v.count / v.total * 100)}%"></i></div>
              <span style="font-size:11.5px;color:var(--ink-3)">${v.count}/${v.total}차</span></td>
            <td>${v.last ? fmtDate(v.last) : '<span style="color:var(--ink-3)">기록 없음</span>'}</td>
            <td>${v.due ? fmtDate(v.due) : '—'}<div style="font-size:11.5px;color:var(--ink-3)">${esc(v.stage)}</div></td>
            <td>${statusChip(v)}</td>
          </tr>`).join('')}</tbody></table></div>
      </div>

      <div class="card">
        <div class="card-head"><h2>🛡️ 구충 · 정기검진 주기</h2></div>
        <div class="grid g2">
          ${ctx.prevPlan.map(p => `
            <div style="border:1px solid var(--line);border-radius:var(--radius-sm);padding:13px">
              <div class="row"><div style="font-weight:700;font-size:13.5px;flex:1">${esc(p.name)}</div>${statusChip(p)}</div>
              <div style="font-size:12px;color:var(--ink-3);margin:5px 0 8px">${esc(p.note)}</div>
              <div style="font-size:12.5px">마지막 <b>${p.last ? fmtDate(p.last) : '기록 없음'}</b>
                ${p.due ? ` · 다음 <b>${fmtDate(p.due)}</b>` : ''}</div>
              <button class="btn btn-sm" style="margin-top:9px" data-quick="${esc(p.code)}">오늘 완료로 기록</button>
            </div>`).join('')}
        </div>
      </div>

      <div class="card">
        <div class="card-head"><h2>📒 전체 접종 · 구충 기록 (${records.length})</h2><div class="spacer"></div>
          <button class="btn btn-sm" data-add>+ 기록 추가</button></div>
        ${records.length ? `<div class="tbl-wrap"><table>
          <thead><tr><th>날짜</th><th>항목</th><th>병원</th><th>제조사·로트</th><th>메모</th><th></th></tr></thead>
          <tbody>${records.map(r => `<tr>
            <td>${fmtDate(r.date)}</td>
            <td><b>${esc(r.label || r.code)}</b></td>
            <td>${esc(r.hospital || '—')}</td>
            <td style="color:var(--ink-3)">${esc(r.lot || '—')}</td>
            <td style="color:var(--ink-3);max-width:200px">${esc(r.note || '')}</td>
            <td style="text-align:right"><button class="btn btn-sm btn-danger" data-del="${esc(r.id)}">삭제</button></td>
          </tr>`).join('')}</tbody></table></div>`
          : empty('📒', '아직 접종 기록이 없습니다.', '<button class="btn btn-primary" data-add>첫 기록 추가</button>')}
      </div>

      <p class="disclaimer">${esc(VAX.note)} 광견병은 법정 예방접종으로, 지자체 지원 사업을 통해 저렴하게 접종할 수 있는 시기가 있습니다.</p>
    </div>`;

    const openForm = (preCode) => modal({
      title: '접종 · 구충 기록',
      body: field('항목', selectEl('code', all.map(a => ({ value: a.v, label: a.l })), preCode))
        + `<div class="inline">${field('접종일', inputEl('date', { type: 'date', value: H.today(), required: true }))}
           ${field('병원', inputEl('hospital', { value: ctx.dog.clinic || '' }))}</div>`
        + field('제조사 · 로트번호', inputEl('lot', { placeholder: '선택 사항' }))
        + field('메모', textareaEl('note', { rows: 2, placeholder: '접종 후 반응, 체온 등' })),
      onSubmit: f => {
        const label = all.find(a => a.v === f.code)?.l || f.code;
        ctx.vaccines.add({ ...f, label });
        toast('기록했습니다. 다음 일정이 자동 계산됩니다.');
      }
    });

    root.querySelectorAll('[data-add]').forEach(b => b.addEventListener('click', () => openForm()));
    root.querySelectorAll('[data-quick]').forEach(b => b.addEventListener('click', () => {
      const code = b.dataset.quick;
      const label = all.find(a => a.v === code)?.l || code;
      ctx.vaccines.add({ code, label, date: H.today(), hospital: ctx.dog.clinic || '' });
      toast(`${label} — 오늘로 기록했습니다.`);
    }));
    root.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () =>
      confirmModal('기록 삭제', '이 기록을 삭제하면 다음 예정일 계산도 함께 바뀝니다. 삭제할까요?',
        () => ctx.vaccines.remove(b.dataset.del))));
  }
};

function statusChip(x) {
  if (!x.last && !x.due) return '<span class="chip">기록 없음</span>';
  if (x.overdue) return `<span class="chip bad">${x.dday != null ? Math.abs(x.dday) + '일 지남' : '기한 초과'}</span>`;
  if (x.dday != null && x.dday <= 14) return `<span class="chip warn">D-${x.dday}</span>`;
  if (x.dday != null) return `<span class="chip ok">D-${x.dday}</span>`;
  return '<span class="chip">—</span>';
}
