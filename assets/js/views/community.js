/* 커뮤니티 — 이야기 나눔 · 질문 · 리뷰 요청 · 레시피 공유 */
import { community, auth } from '../store.js';
import { esc, relDate, empty, modal, field, inputEl, textareaEl, selectEl, toast, initials, confirmModal } from '../ui.js';

const KINDS = [
  { k: '', l: '전체' }, { k: 'free', l: '자유' }, { k: 'question', l: '질문' },
  { k: 'request', l: '리뷰 요청' }, { k: 'recipe', l: '레시피 공유' }, { k: 'tip', l: '노하우' }
];
const LABEL = { free: '자유', question: '질문', request: '리뷰 요청', recipe: '레시피', tip: '노하우' };
let filter = '';

export default {
  head: () => ({ title: '이야기 나눔', sub: '보호자들이 경험과 정보를 나누는 공간입니다' }),

  mount(root, ctx) {
    const me = auth.current();
    const posts = filter ? community.posts(filter) : community.posts();

    root.innerHTML = `
    <div class="stack">
      <div class="row">
        <div class="seg">${KINDS.map(k => `<button class="${k.k === filter ? 'on' : ''}" data-k="${k.k}">${k.l}</button>`).join('')}</div>
        <div class="spacer"></div>
        <button class="btn btn-sm btn-primary" data-write>✏️ 글쓰기</button>
      </div>

      ${posts.length ? `<div class="stack" style="gap:12px">${posts.map(p => post(p, me)).join('')}</div>`
        : `<div class="card">${empty('💬', '아직 글이 없습니다. 첫 이야기를 남겨 주세요.',
            '<button class="btn btn-primary" data-write>글쓰기</button>')}</div>`}

      <div class="card">
        <div class="card-head"><h2>🌐 커뮤니티는 이렇게 동작합니다</h2></div>
        <p style="font-size:13px;color:var(--ink-2);line-height:1.65;margin:0">
          지금 이 게시판의 글은 <b>이 브라우저에만 저장</b>되어 다른 사람에게 보이지 않습니다.
          GitHub Pages에는 서버가 없기 때문입니다. 실제로 여러 사용자가 함께 쓰는 게시판으로 전환하려면
          저장소에서 GitHub Discussions를 켜고 <b>giscus</b> 위젯을 연결하면 되며,
          <code>[설정 → 커뮤니티 연동]</code>에서 저장소 정보를 넣는 즉시 이 화면 아래에 실서비스 댓글이 함께 표시됩니다.
        </p>
      </div>
      <div id="giscus-slot"></div>
    </div>`;

    root.querySelectorAll('[data-k]').forEach(b => b.addEventListener('click', () => { filter = b.dataset.k; this.mount(root, ctx); }));

    root.querySelectorAll('[data-write]').forEach(b => b.addEventListener('click', () => modal({
      title: '글쓰기', wide: true,
      body: field('분류', selectEl('kind', KINDS.filter(k => k.k).map(k => ({ value: k.k, label: k.l })), filter || 'free'))
        + field('제목', inputEl('title', { required: true, placeholder: '제목을 입력하세요' }))
        + field('내용', textareaEl('body', { required: true, rows: 7, placeholder: '견종·나이 등 상황을 함께 적어주시면 더 좋은 답변을 받을 수 있습니다.' }))
        + field('태그', inputEl('tags', { placeholder: '쉼표로 구분 · 예: 슬개골, 소형견, 사료' })),
      onSubmit: f => {
        community.post({ kind: f.kind, title: f.title, body: f.body, tags: f.tags.split(',').map(s => s.trim()).filter(Boolean) });
        toast('등록했습니다.');
      }
    })));

    root.querySelectorAll('[data-like]').forEach(b => b.addEventListener('click', () => community.toggleLike(b.dataset.like)));
    root.querySelectorAll('[data-delpost]').forEach(b => b.addEventListener('click', () =>
      confirmModal('글 삭제', '이 글과 댓글이 모두 삭제됩니다. 계속할까요?', () => community.remove(b.dataset.delpost))));
    root.querySelectorAll('[data-delcmt]').forEach(b => b.addEventListener('click', () =>
      community.uncomment(b.dataset.post, b.dataset.delcmt)));
    root.querySelectorAll('[data-cmt-form]').forEach(f => f.addEventListener('submit', e => {
      e.preventDefault();
      const v = f.querySelector('input[name=body]').value.trim();
      if (!v) return;
      community.comment(f.dataset.cmtForm, v);
    }));

    mountGiscus(root.querySelector('#giscus-slot'));
  }
};

function post(p, me) {
  const liked = me && (p.likes || []).includes(me.id);
  return `<div class="post">
    <div class="ph">
      <div class="avatar">${esc(initials(p.author))}</div>
      <b style="color:var(--ink)">${esc(p.author)}</b> · ${relDate(p.createdAt)}
      <span class="chip brand">${esc(LABEL[p.kind] || p.kind)}</span>
      <div class="spacer"></div>
      ${me && p.authorId === me.id ? `<button class="btn btn-sm btn-danger" data-delpost="${esc(p.id)}">삭제</button>` : ''}
    </div>
    <div class="pt">${esc(p.title)}</div>
    <div class="pb">${esc(p.body)}</div>
    ${p.tags?.length ? `<div class="row" style="gap:5px;margin-top:9px">${p.tags.map(t => `<span class="chip">#${esc(t)}</span>`).join('')}</div>` : ''}
    <div class="pf">
      <button class="btn btn-sm ${liked ? 'btn-primary' : ''}" data-like="${esc(p.id)}">👍 ${(p.likes || []).length}</button>
      <span style="font-size:12px;color:var(--ink-3)">💬 댓글 ${p.comments.length}</span>
    </div>
    ${p.comments.map(c => `<div class="cmt">
      <div class="ch"><b style="color:var(--ink-2)">${esc(c.author)}</b> · ${relDate(c.createdAt)}
        ${me && c.authorId === me.id ? `<button class="btn btn-sm btn-danger" style="padding:1px 7px;font-size:11px" data-post="${esc(p.id)}" data-delcmt="${esc(c.id)}">삭제</button>` : ''}</div>
      <div class="cb">${esc(c.body)}</div></div>`).join('')}
    <form class="row" style="margin-top:10px;gap:7px" data-cmt-form="${esc(p.id)}">
      <input type="text" name="body" placeholder="댓글을 남겨 주세요" style="flex:1">
      <button class="btn btn-sm">등록</button>
    </form>
  </div>`;
}

/* 설정에 giscus 저장소가 입력되어 있으면 실제 GitHub Discussions 댓글을 붙입니다 */
function mountGiscus(slot) {
  if (!slot) return;
  let cfg = null;
  try { cfg = JSON.parse(localStorage.getItem('bc.giscus') || 'null'); } catch {}
  if (!cfg?.repo || !cfg?.repoId || !cfg?.categoryId) return;
  slot.innerHTML = '<div class="card"><div class="card-head"><h2>💬 GitHub Discussions 댓글</h2></div><div id="giscus-mount"></div></div>';
  const s = document.createElement('script');
  s.src = 'https://giscus.app/client.js';
  s.async = true; s.crossOrigin = 'anonymous';
  Object.assign(s.dataset, {
    repo: cfg.repo, repoId: cfg.repoId, category: cfg.category || 'General', categoryId: cfg.categoryId,
    mapping: 'pathname', strict: '0', reactionsEnabled: '1', emitMetadata: '0',
    inputPosition: 'top', theme: document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light', lang: 'ko'
  });
  slot.querySelector('#giscus-mount').appendChild(s);
}
