/* 커뮤니티 — 이야기 나눔 · 질문 · 리뷰 요청 · 레시피 공유 */
import { community, auth } from '../store.js';
import { esc, relDate, empty, modal, field, inputEl, textareaEl, selectEl, toast, initials, confirmModal } from '../ui.js';
import { ICONS } from '../icons.js';

const KINDS = [
  { k: '', l: '전체' }, { k: 'free', l: '수다' }, { k: 'question', l: '궁금해요' },
  { k: 'request', l: '이거 어때요' }, { k: 'recipe', l: '레시피' }, { k: 'tip', l: '꿀팁' }
];
const LABEL = { free: '수다', question: '궁금해요', request: '이거 어때요', recipe: '레시피', tip: '꿀팁' };
let filter = '';

export default {
  head: () => ({ title: '수다방', sub: '집사님들끼리 편하게 이야기 나누는 곳이에요' }),

  mount(root, ctx) {
    const me = auth.current();
    const posts = filter ? community.posts(filter) : community.posts();

    root.innerHTML = `
    <div class="stack">
      <div class="row">
        <div class="seg">${KINDS.map(k => `<button class="${k.k === filter ? 'on' : ''}" data-k="${k.k}">${k.l}</button>`).join('')}</div>
        <div class="spacer"></div>
        <button class="btn btn-sm btn-primary" data-write>✏️ 이야기 남기기</button>
      </div>

      ${posts.length ? `<div class="stack" style="gap:12px">${posts.map(p => post(p, me)).join('')}</div>`
        : `<div class="card">${empty(ICONS.chat, '아직 조용하네요. 첫 이야기를 들려주세요!',
            '<button class="btn btn-primary" data-write>이야기 남기기</button>')}</div>`}

      <div class="card">
        <div class="card-head"><h2>🌐 잠깐, 알아두실 게 있어요</h2></div>
        <p style="font-size:13px;color:var(--ink-2);line-height:1.65;margin:0">
          지금 여기 쓰신 글은 <b>이 브라우저에만 저장</b>돼서 다른 분들께는 안 보여요. 서버 없이 돌아가는 사이트라서요.
          진짜로 여럿이 같이 쓰는 게시판으로 바꾸려면 GitHub Discussions를 켜고 <b>giscus</b> 를 연결하면 돼요.
          <code>[설정 → 커뮤니티 연동]</code>에 정보만 넣어주시면 바로 아래에 진짜 댓글창이 붙어요!
        </p>
      </div>
      <div id="giscus-slot"></div>
    </div>`;

    root.querySelectorAll('[data-k]').forEach(b => b.addEventListener('click', () => { filter = b.dataset.k; this.mount(root, ctx); }));

    root.querySelectorAll('[data-write]').forEach(b => b.addEventListener('click', () => modal({
      title: '이야기 남기기', wide: true,
      body: field('어떤 이야기예요?', selectEl('kind', KINDS.filter(k => k.k).map(k => ({ value: k.k, label: k.l })), filter || 'free'))
        + field('제목', inputEl('title', { required: true, placeholder: '한 줄로 적어주세요' }))
        + field('내용', textareaEl('body', { required: true, rows: 7, placeholder: '견종이랑 나이 같은 상황을 같이 적어주시면 더 좋은 답을 받으실 수 있어요!' }))
        + field('태그', inputEl('tags', { placeholder: '쉼표로 나눠서 · 예: 슬개골, 소형견, 사료' })),
      onSubmit: f => {
        community.post({ kind: f.kind, title: f.title, body: f.body, tags: f.tags.split(',').map(s => s.trim()).filter(Boolean) });
        toast('올렸어요!');
      }
    })));

    root.querySelectorAll('[data-like]').forEach(b => b.addEventListener('click', () => community.toggleLike(b.dataset.like)));
    root.querySelectorAll('[data-delpost]').forEach(b => b.addEventListener('click', () =>
      confirmModal('글 지우기', '댓글까지 같이 지워져요. 그래도 지울까요?', () => community.remove(b.dataset.delpost))));
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
      <span style="font-size:12px;color:var(--ink-3)">💬 ${p.comments.length}개</span>
    </div>
    ${p.comments.map(c => `<div class="cmt">
      <div class="ch"><b style="color:var(--ink-2)">${esc(c.author)}</b> · ${relDate(c.createdAt)}
        ${me && c.authorId === me.id ? `<button class="btn btn-sm btn-danger" style="padding:1px 7px;font-size:11px" data-post="${esc(p.id)}" data-delcmt="${esc(c.id)}">삭제</button>` : ''}</div>
      <div class="cb">${esc(c.body)}</div></div>`).join('')}
    <form class="row" style="margin-top:10px;gap:7px" data-cmt-form="${esc(p.id)}">
      <input type="text" name="body" placeholder="한마디 남겨주세요" style="flex:1">
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
