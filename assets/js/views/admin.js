/* 운영자 도구 — 신고 처리 · 파트너 사업자 확인 · 회원 현황
   role='admin' 계정에만 사이드바에 보입니다. 서버 강제는 RLS(members.is_admin())가 담당. */
import { admin, partners, isCloudMode } from '../store.js';
import { esc, relDate, empty, toast, confirmModal } from '../ui.js';
import { ICONS } from '../icons.js';
import { kindLabel } from './partners.js';

const TYPE_LABEL = { post: '글', comment: '댓글', review: '용품 후기', chat: '대화', partner: '업체' };
const STATUS = [
  { v: 'open', l: '접수됨', cls: 'warn' },
  { v: 'resolved', l: '조치 완료', cls: 'ok' },
  { v: 'dismissed', l: '문제 없음', cls: '' }
];
const statusOf = v => STATUS.find(s => s.v === v) || STATUS[0];

let tab = 'reports';
let reportFilter = 'open';
let reportsLoaded = false;
let memberCache = null;

export default {
  head: () => ({ title: '운영자 도구', sub: '신고 처리 · 파트너 확인 · 회원 현황' }),

  mount(root, ctx) {
    if (!admin.isAdmin()) {
      root.innerHTML = `<div class="card">${empty(ICONS.alert, '운영자 계정에서만 볼 수 있는 화면이에요.')}</div>`;
      return;
    }
    root.innerHTML = `
    <div class="stack">
      <div class="seg">
        <button class="${tab === 'reports' ? 'on' : ''}" data-tab="reports">🚨 신고함</button>
        <button class="${tab === 'partners' ? 'on' : ''}" data-tab="partners">🤝 파트너 확인</button>
        <button class="${tab === 'members' ? 'on' : ''}" data-tab="members">👥 회원</button>
      </div>
      <div id="admin-body"></div>
    </div>`;
    root.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => {
      tab = b.dataset.tab; this.mount(root, ctx);
    }));
    const body = root.querySelector('#admin-body');
    if (tab === 'reports') this.reportsTab(body, root, ctx);
    else if (tab === 'partners') this.partnersTab(body, root, ctx);
    else this.membersTab(body);
  },

  /* ── 신고함 ── */
  async reportsTab(body, root, ctx) {
    if (!isCloudMode()) {
      body.innerHTML = `<div class="card">${empty(ICONS.chat,
        '신고함은 서버 연결(cloud 모드)에서만 쓸 수 있어요. 로컬 모드에는 신고 기능이 없어요.')}</div>`;
      return;
    }
    if (!reportsLoaded) {
      body.innerHTML = `<div class="card"><span class="hint">신고 내역을 불러오는 중…</span></div>`;
      try { await admin.loadReports(); reportsLoaded = true; }
      catch (e) { body.innerHTML = `<div class="card">${empty(ICONS.alert, e.message)}</div>`; return; }
    }
    const list = admin.reports(reportFilter === 'all' ? undefined : reportFilter);
    body.innerHTML = `
      <div class="row" style="margin-bottom:10px">
        <div class="seg">
          ${STATUS.map(s => `<button class="${reportFilter === s.v ? 'on' : ''}" data-rf="${s.v}">${s.l}</button>`).join('')}
          <button class="${reportFilter === 'all' ? 'on' : ''}" data-rf="all">전체</button>
        </div>
        <div class="spacer"></div><span class="hint">${list.length}건</span>
      </div>
      ${list.length ? `<div class="stack">${list.map(r => this.reportCard(r)).join('')}</div>`
        : `<div class="card">${empty(ICONS.heart, reportFilter === 'open' ? '처리할 신고가 없어요. 평화롭네요!' : '해당하는 신고가 없어요.')}</div>`}`;

    body.querySelectorAll('[data-rf]').forEach(b => b.addEventListener('click', () => {
      reportFilter = b.dataset.rf; this.reportsTab(body, root, ctx);
    }));
    body.querySelectorAll('[data-status]').forEach(b => b.addEventListener('click', async () => {
      try {
        await admin.setReportStatus(b.dataset.id, b.dataset.status);
        toast(b.dataset.status === 'resolved' ? '조치 완료로 표시했어요.' : b.dataset.status === 'dismissed' ? '문제 없음으로 표시했어요.' : '다시 접수 상태로 돌렸어요.');
        this.reportsTab(body, root, ctx);
      } catch (e) { toast(e.message); }
    }));
    body.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => {
      confirmModal('콘텐츠 삭제', '신고된 콘텐츠를 삭제할까요? 되돌릴 수 없어요.', async () => {
        try {
          await admin.removeTarget(b.dataset.type, b.dataset.del);
          await admin.setReportStatus(b.dataset.id, 'resolved');
          toast('콘텐츠를 삭제하고 조치 완료로 표시했어요.');
          this.reportsTab(body, root, ctx);
        } catch (e) { toast(e.message); }
      });
    }));
  },

  reportCard(r) {
    const s = statusOf(r.status);
    const snippet = admin.findTarget(r.targetType, r.targetId);
    const deletable = ['post', 'comment', 'review', 'chat'].includes(r.targetType);
    return `<div class="card">
      <div class="card-head">
        <h2>${esc(TYPE_LABEL[r.targetType] || r.targetType)} 신고</h2>
        <span class="chip ${s.cls}">${s.l}</span>
        <div class="spacer"></div>
        <span class="hint">${esc(r.reporter)} · ${relDate(r.createdAt)}</span>
      </div>
      <div style="font-size:13px;margin-bottom:6px"><b>사유</b> — ${esc(r.reason)}</div>
      <div style="font-size:12.5px;color:var(--ink-2);background:var(--surface-2);border-radius:8px;padding:8px 10px;margin-bottom:10px">
        ${snippet ? esc(String(snippet).slice(0, 200)) : `<span style="color:var(--ink-3)">원문을 찾지 못했어요 (이미 삭제됐거나 화면에 로드되지 않은 콘텐츠) · id: ${esc(r.targetId)}</span>`}
      </div>
      <div class="row" style="gap:6px">
        ${r.status === 'open' ? `
          ${deletable ? `<button class="btn btn-sm" data-del="${esc(r.targetId)}" data-type="${esc(r.targetType)}" data-id="${esc(r.id)}">콘텐츠 삭제</button>` : ''}
          <button class="btn btn-sm" data-status="resolved" data-id="${esc(r.id)}">조치 완료</button>
          <button class="btn btn-sm btn-ghost" data-status="dismissed" data-id="${esc(r.id)}">문제 없음</button>`
        : `<button class="btn btn-sm btn-ghost" data-status="open" data-id="${esc(r.id)}">다시 열기</button>
           ${r.resolvedAt ? `<span class="hint">처리: ${relDate(r.resolvedAt)}</span>` : ''}`}
      </div>
    </div>`;
  },

  /* ── 파트너 확인 ── */
  partnersTab(body, root, ctx) {
    const list = partners.list();
    const waiting = list.filter(p => !p.verified);
    const done = list.filter(p => p.verified);
    const card = p => `<div class="card">
      <div class="card-head"><h2>${esc(p.name)}</h2>
        ${p.verified ? '<span class="chip ok">✓ 확인된 업체</span>' : '<span class="chip warn">확인 대기</span>'}
        <div class="spacer"></div>
        <button class="btn btn-sm ${p.verified ? 'btn-ghost' : ''}" data-verify="${esc(p.id)}" data-v="${p.verified ? '' : '1'}">
          ${p.verified ? '확인 해제' : '확인 처리'}</button>
      </div>
      <div style="font-size:12.5px;color:var(--ink-2)">
        ${esc(kindLabel(p.kind))} · ${esc(p.region || '지역 미입력')} ${p.tel ? `· ${esc(p.tel)}` : ''}<br>
        사업자등록번호: <b>${esc(p.bizNo || '-')}</b> · 가입 ${relDate(p.createdAt)}
      </div>
    </div>`;
    body.innerHTML = `
      <p class="disclaimer" style="margin-top:0">국세청 사업자등록상태 조회 등으로 등록번호를 확인한 뒤 [확인 처리]를 눌러주세요.
      확인된 업체는 디렉터리에 ✓ 배지가 붙어요.</p>
      ${waiting.length ? `<h3 style="font-size:13px;margin:6px 0">확인 대기 (${waiting.length})</h3>
        <div class="stack">${waiting.map(card).join('')}</div>` : ''}
      ${done.length ? `<h3 style="font-size:13px;margin:14px 0 6px">확인 완료 (${done.length})</h3>
        <div class="stack">${done.map(card).join('')}</div>` : ''}
      ${!list.length ? `<div class="card">${empty(ICONS.heart, '아직 가입한 파트너가 없어요.')}</div>` : ''}`;

    body.querySelectorAll('[data-verify]').forEach(b => b.addEventListener('click', async () => {
      try {
        await admin.setPartnerVerified(b.dataset.verify, !!b.dataset.v);
        toast(b.dataset.v ? '확인된 업체로 표시했어요.' : '확인을 해제했어요.');
        this.partnersTab(body, root, ctx);
      } catch (e) { toast(e.message); }
    }));
  },

  /* ── 회원 현황 ── */
  async membersTab(body) {
    if (!memberCache) {
      body.innerHTML = `<div class="card"><span class="hint">회원 목록을 불러오는 중…</span></div>`;
      try { memberCache = await admin.members(); }
      catch (e) { body.innerHTML = `<div class="card">${empty(ICONS.alert, e.message)}</div>`; return; }
    }
    const list = memberCache;
    body.innerHTML = `
      <div class="card">
        <div class="card-head"><h2>회원 ${list.length}명</h2><div class="spacer"></div>
          <button class="btn btn-sm btn-ghost" data-reload>새로고침</button></div>
        <div style="overflow-x:auto"><table class="table" style="width:100%;font-size:12.5px;border-collapse:collapse">
          <thead><tr style="text-align:left;color:var(--ink-3)">
            <th style="padding:6px 8px">닉네임</th><th style="padding:6px 8px">역할</th><th style="padding:6px 8px">가입</th></tr></thead>
          <tbody>${list.map(m => `<tr style="border-top:1px solid var(--line)">
            <td style="padding:6px 8px">${esc(m.nick)}${m.email ? ` <span class="hint">${esc(m.email)}</span>` : ''}</td>
            <td style="padding:6px 8px">${m.role === 'admin' ? '<span class="chip ok">운영자</span>' : '회원'}</td>
            <td style="padding:6px 8px">${m.createdAt ? relDate(m.createdAt) : '-'}</td></tr>`).join('')}
          </tbody></table></div>
        <p class="disclaimer" style="margin-bottom:0">운영자 승격·강등, 계정 삭제는 Supabase 대시보드(Table Editor · Authentication)에서 해주세요.</p>
      </div>`;
    body.querySelector('[data-reload]')?.addEventListener('click', () => { memberCache = null; this.membersTab(body); });
  }
};
