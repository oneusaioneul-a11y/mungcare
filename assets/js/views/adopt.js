/* 유기견 입양 정보 — 공공데이터(동물보호관리시스템) 실시간 조회 */
import { esc, num, fmtDate, empty, modal, toast } from '../ui.js';
import { ICONS, dogIcon } from '../icons.js';
import * as G from '../gov.js';
import * as H from '../health.js';

const STATE = {
  sido: '', sigungu: '', kind: '', state: 'notice',
  days: 30, page: 1, rows: 24,
  sidoList: null, sigunguList: null, kindList: null,
  result: null, loading: false, error: null, checked: false
};

const PROCESS = [
  { v: 'notice', l: '공고 중' },
  { v: 'protect', l: '보호 중' },
  { v: '', l: '전체' }
];

export default {
  head: () => ({ title: '유기견 입양 정보', sub: '전국 보호소에 있는 아이들을 실시간으로 보여드려요' }),

  async mount(root, ctx) {
    this.root = root; this.ctx = ctx;
    this.paint();
    if (!STATE.checked) { STATE.checked = true; await this.loadRefs(); }
    if (!STATE.result && !STATE.error) await this.search();
  },

  async loadRefs() {
    try {
      const [sido, kinds] = await Promise.all([G.shelter.sido(), G.shelter.kinds()]);
      STATE.sidoList = sido.items || [];
      STATE.kindList = kinds.items || [];
    } catch (e) { /* 검색 자체에서 오류를 보여주므로 조용히 넘어갑니다 */ }
    this.paint();
  },

  async search(reset = false) {
    if (reset) STATE.page = 1;
    STATE.loading = true; STATE.error = null; this.paint();
    try {
      const bgnde = H.addDays(H.today(), -Number(STATE.days)).replaceAll('-', '');
      const endde = H.today().replaceAll('-', '');
      const res = await G.shelter.search({
        bgnde, endde,
        upr_cd: STATE.sido || undefined,
        org_cd: STATE.sigungu || undefined,
        kind: STATE.kind || undefined,
        state: STATE.state || undefined,
        pageNo: STATE.page, numOfRows: STATE.rows
      });
      STATE.result = { ...res, animals: (res.items || []).map(G.normalizeAnimal) };
    } catch (e) {
      STATE.error = e.message; STATE.result = null;
    } finally {
      STATE.loading = false; this.paint();
    }
  },

  paint() {
    const root = this.root;
    const r = STATE.result;

    root.innerHTML = `
    <div class="stack">
      <div class="card" style="display:flex;align-items:center;gap:15px">
        <div class="dogav md">${dogIcon('mix', 56)}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:15px;font-weight:700">가족을 기다리는 아이들이에요</div>
          <div style="font-size:12.5px;color:var(--ink-3);margin-top:2px">
            농림축산검역본부 동물보호관리시스템의 공고 정보를 그대로 가져옵니다.
            공고 기간이 끝나기 전에 연락하셔야 해요.
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-head"><h2>${ICONS.paw} 찾아보기</h2><div class="spacer"></div>
          ${r ? `<span class="chip brand">${num(r.total)}마리</span>` : ''}</div>
        <div class="inline3">
          <div class="field"><label>지역</label>
            <select data-f="sido">
              <option value="">전국</option>
              ${(STATE.sidoList || []).map(s =>
                `<option value="${esc(s.orgCd)}" ${s.orgCd === STATE.sido ? 'selected' : ''}>${esc(s.orgdownNm)}</option>`).join('')}
            </select></div>
          <div class="field"><label>시군구</label>
            <select data-f="sigungu" ${STATE.sido ? '' : 'disabled'}>
              <option value="">전체</option>
              ${(STATE.sigunguList || []).map(s =>
                `<option value="${esc(s.orgCd)}" ${s.orgCd === STATE.sigungu ? 'selected' : ''}>${esc(s.orgdownNm)}</option>`).join('')}
            </select></div>
          <div class="field"><label>견종</label>
            <select data-f="kind">
              <option value="">모든 견종</option>
              ${(STATE.kindList || []).map(k =>
                `<option value="${esc(k.kindCd)}" ${String(k.kindCd) === STATE.kind ? 'selected' : ''}>${esc(k.knm || k.kindNm)}</option>`).join('')}
            </select></div>
        </div>
        <div class="row">
          <div class="seg">${PROCESS.map(p =>
            `<button class="${p.v === STATE.state ? 'on' : ''}" data-state="${p.v}">${p.l}</button>`).join('')}</div>
          <div class="seg">${[7, 30, 90].map(d =>
            `<button class="${d === STATE.days ? 'on' : ''}" data-days="${d}">최근 ${d}일</button>`).join('')}</div>
          <div class="spacer"></div>
          <button class="btn btn-primary btn-sm" data-search>찾아보기</button>
        </div>
      </div>

      ${STATE.loading ? `<div class="card">${empty(ICONS.sparkle, '보호소에 물어보는 중이에요…')}</div>` : ''}

      ${STATE.error ? `<div class="card">
        <div class="alert warn"><span class="ai">📡</span><span>
          <b>아직 데이터를 가져올 수 없어요.</b><br>
          <span style="opacity:.85">${esc(STATE.error)}</span></span></div>
        <div class="row" style="margin-top:12px">
          <button class="btn btn-sm" data-retry>다시 시도</button>
          <button class="btn btn-sm" data-diag>연결 상태 확인하기</button>
        </div>
      </div>` : ''}

      ${r && !STATE.loading ? (r.animals.length ? `
        <div class="grid g4">${r.animals.map(a => this.card(a)).join('')}</div>
        ${this.pager(r)}
      ` : `<div class="card">${empty(ICONS.heart, '조건에 맞는 아이가 없어요. 지역이나 기간을 넓혀보실래요?')}</div>`) : ''}

      <p class="disclaimer">출처: 농림축산식품부 · 농림축산검역본부 동물보호관리시스템(공공데이터포털).
      입양 전에는 반드시 해당 보호소에 직접 연락해 아이의 상태와 절차를 확인해주세요.
      공고가 끝난 아이는 이미 다른 가족을 만났을 수 있어요.</p>
    </div>`;

    this.bind();
  },

  card(a) {
    const left = G.daysLeft(a.noticeTo);
    return `<div class="prod" data-open="${esc(a.id)}" style="cursor:pointer;padding:0;overflow:hidden">
      <div style="aspect-ratio:1;background:var(--surface-2);position:relative">
        ${a.photo
          ? `<img src="${esc(a.photo)}" alt="${esc(a.breed)}" loading="lazy"
                  style="width:100%;height:100%;object-fit:cover" onerror="this.style.display='none'">`
          : `<div style="width:100%;height:100%;display:grid;place-items:center">${dogIcon('mix', 72)}</div>`}
        ${left != null ? `<span class="chip ${left < 0 ? '' : left <= 3 ? 'bad' : 'brand'}"
          style="position:absolute;top:8px;left:8px;background:var(--surface)">
          ${left < 0 ? '공고 종료' : left === 0 ? '오늘 마감' : `공고 D-${left}`}</span>` : ''}
      </div>
      <div style="padding:12px 13px 14px">
        <div class="nm" style="font-size:13.5px">${esc(a.breed)}</div>
        <div style="font-size:12px;color:var(--ink-3);margin-top:3px">
          ${esc(a.sex)} · ${esc(a.age || '나이 미상')}${a.weight ? ` · ${esc(a.weight)}` : ''}</div>
        <div style="font-size:11.5px;color:var(--ink-3);margin-top:5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
          📍 ${esc(a.center || a.foundPlace || '보호소 정보 없음')}</div>
      </div>
    </div>`;
  },

  pager(r) {
    const pages = Math.ceil(r.total / STATE.rows);
    if (pages <= 1) return '';
    return `<div class="row" style="justify-content:center;gap:8px">
      <button class="btn btn-sm" data-page="${STATE.page - 1}" ${STATE.page <= 1 ? 'disabled' : ''}>← 이전</button>
      <span style="font-size:13px;color:var(--ink-3)">${STATE.page} / ${num(pages)}</span>
      <button class="btn btn-sm" data-page="${STATE.page + 1}" ${STATE.page >= pages ? 'disabled' : ''}>다음 →</button>
    </div>`;
  },

  bind() {
    const root = this.root;

    root.querySelector('[data-f="sido"]')?.addEventListener('change', async e => {
      STATE.sido = e.target.value; STATE.sigungu = ''; STATE.sigunguList = null;
      if (STATE.sido) {
        try { STATE.sigunguList = (await G.shelter.sigungu(STATE.sido)).items || []; } catch {}
      }
      this.paint();
    });
    root.querySelector('[data-f="sigungu"]')?.addEventListener('change', e => { STATE.sigungu = e.target.value; });
    root.querySelector('[data-f="kind"]')?.addEventListener('change', e => { STATE.kind = e.target.value; });

    root.querySelectorAll('[data-state]').forEach(b => b.addEventListener('click', () => {
      STATE.state = b.dataset.state; this.search(true);
    }));
    root.querySelectorAll('[data-days]').forEach(b => b.addEventListener('click', () => {
      STATE.days = Number(b.dataset.days); this.search(true);
    }));
    root.querySelector('[data-search]')?.addEventListener('click', () => this.search(true));
    root.querySelector('[data-retry]')?.addEventListener('click', () => this.search());
    root.querySelectorAll('[data-page]').forEach(b => b.addEventListener('click', () => {
      STATE.page = Number(b.dataset.page); this.search();
      root.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }));

    root.querySelector('[data-diag]')?.addEventListener('click', async () => {
      try {
        const s = await G.status();
        modal({
          title: '공공데이터 연결 상태', footer: false,
          body: `<p style="font-size:13px;color:var(--ink-2);margin:0 0 12px">
              ${s.liveServices?.length
                ? `<b style="color:var(--ok)">연결됨</b> — 열려 있는 서비스: ${esc(s.liveServices.join(', '))}`
                : `<b style="color:var(--warn)">아직 열리지 않았어요</b><br>${esc(s.hint || '')}`}</p>
            <div class="tbl-wrap"><table><thead><tr><th>서비스</th><th>상태</th><th>메시지</th></tr></thead><tbody>
              ${(s.checks || []).map(c => `<tr>
                <td>${esc(c.name)}</td>
                <td>${c.ok ? '<span class="chip ok">정상</span>' : `<span class="chip bad">${esc(c.code || '실패')}</span>`}</td>
                <td style="color:var(--ink-3)">${esc(c.message || (c.ok ? `${num(c.totalCount)}건` : ''))}</td>
              </tr>`).join('')}
            </tbody></table></div>`,
          onSubmit: () => {}
        });
      } catch { toast('상태를 확인하지 못했어요.'); }
    });

    root.querySelectorAll('[data-open]').forEach(el => el.addEventListener('click', () => {
      const a = STATE.result?.animals.find(x => String(x.id) === el.dataset.open);
      if (a) this.detail(a);
    }));
  },

  detail(a) {
    const left = G.daysLeft(a.noticeTo);
    modal({
      title: `${a.breed} · ${a.sex}`, wide: true, footer: false,
      body: `
        <div class="grid g2" style="gap:16px">
          <div>${a.photo
            ? `<img src="${esc(a.photo)}" alt="" style="width:100%;border-radius:var(--radius-sm);border:2px solid var(--line)">`
            : `<div style="aspect-ratio:1;display:grid;place-items:center;background:var(--surface-2);border-radius:var(--radius-sm)">${dogIcon('mix', 96)}</div>`}
          </div>
          <div>
            <div class="row" style="gap:6px;margin-bottom:10px">
              <span class="chip brand">${esc(a.state || '상태 미상')}</span>
              ${left != null ? `<span class="chip ${left < 0 ? '' : left <= 3 ? 'bad' : 'warn'}">
                ${left < 0 ? '공고 종료' : `공고 D-${left}`}</span>` : ''}
              <span class="chip">${esc(a.neuter)}</span>
            </div>
            <div class="tbl-wrap"><table><tbody>
              <tr><th style="width:82px">품종</th><td>${esc(a.breed)}</td></tr>
              <tr><th>나이 · 체중</th><td>${esc(a.age || '—')} · ${esc(a.weight || '—')}</td></tr>
              <tr><th>털색</th><td>${esc(a.color || '—')}</td></tr>
              <tr><th>발견</th><td>${a.foundAt ? fmtDate(a.foundAt) : '—'}<br>
                <span style="color:var(--ink-3);font-size:12px">${esc(a.foundPlace || '')}</span></td></tr>
              <tr><th>공고 기간</th><td>${a.noticeFrom ? fmtDate(a.noticeFrom) : '—'} ~ ${a.noticeTo ? fmtDate(a.noticeTo) : '—'}</td></tr>
              <tr><th>특징</th><td style="white-space:pre-wrap">${esc(a.feature || '—')}</td></tr>
            </tbody></table></div>
          </div>
        </div>

        <div class="card" style="margin-top:16px;box-shadow:none">
          <div class="card-head"><h2>🏠 어디로 연락하면 되나요?</h2></div>
          <div class="tbl-wrap"><table><tbody>
            <tr><th style="width:82px">보호소</th><td><b>${esc(a.center || '—')}</b></td></tr>
            <tr><th>전화</th><td>${a.centerTel
              ? `<a href="tel:${esc(String(a.centerTel).replace(/[^0-9-+]/g, ''))}"><b>${esc(a.centerTel)}</b></a>` : '—'}</td></tr>
            <tr><th>주소</th><td>${esc(a.centerAddr || '—')}</td></tr>
            <tr><th>관할</th><td>${esc(a.org || '—')} ${a.charge ? `· 담당 ${esc(a.charge)}` : ''}
              ${a.officeTel ? ` · ${esc(a.officeTel)}` : ''}</td></tr>
            ${a.comment ? `<tr><th>안내</th><td style="white-space:pre-wrap">${esc(a.comment)}</td></tr>` : ''}
          </tbody></table></div>
          <p class="disclaimer" style="margin-top:12px">
            공고 정보는 실시간으로 바뀔 수 있어요. 방문 전에 꼭 전화로 아이가 아직 있는지, 입양 절차가 어떻게 되는지 확인해주세요.</p>
        </div>`,
      onSubmit: () => {}
    });
  }
};
