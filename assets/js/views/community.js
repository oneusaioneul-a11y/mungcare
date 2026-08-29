/* 커뮤니티 — 이야기 나눔 · 질문 · 리뷰 요청 · 레시피 공유 */
import { community, auth, isCloudMode } from '../store.js';
import { esc, relDate, empty, modal, field, inputEl, textareaEl, selectEl, toast, initials, confirmModal } from '../ui.js';
import { ICONS } from '../icons.js';

const KINDS = [
  { k: '', l: '전체' }, { k: 'free', l: '수다' }, { k: 'question', l: '궁금해요' },
  { k: 'request', l: '이거 어때요' }, { k: 'recipe', l: '레시피' }, { k: 'tip', l: '꿀팁' },
  { k: 'suggest', l: '제안·의견' }
];
const LABEL = { free: '수다', question: '궁금해요', request: '이거 어때요', recipe: '레시피', tip: '꿀팁', suggest: '제안·의견' };
let filter = '';
let chatOpen = true;

export default {
  head: () => ({ title: '수다방', sub: '집사님들끼리 편하게 이야기 나누는 곳이에요' }),

  mount(root, ctx) {
    const me = auth.current();
    const posts = filter ? community.posts(filter) : community.posts();
    // 제안·의견은 많이 추천받은 순서로 보여줍니다
    if (filter === 'suggest') posts.sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0));

    root.innerHTML = `
    <div class="stack">
      ${chatCard(me)}

      <div class="row">
        <div class="seg">${KINDS.map(k => `<button class="${k.k === filter ? 'on' : ''}" data-k="${k.k}">${k.l}</button>`).join('')}</div>
        <div class="spacer"></div>
        <button class="btn btn-sm btn-primary" data-write>✏️ 이야기 남기기</button>
      </div>

      ${filter === 'suggest' ? `<div class="alert info"><span class="ai">💡</span><span>
        <b>서비스나 반려 생활에 대한 제안·의견을 나눠요.</b><br>
        <span style="opacity:.85">공감하면 👍 추천을, 얼마나 좋은 제안인지는 ★ 별점으로 남겨주세요. 추천 많은 순서로 올라와요.</span></span></div>` : ''}

      ${posts.length ? `<div class="stack" style="gap:12px">${posts.map(p => post(p, me)).join('')}</div>`
        : `<div class="card">${empty(ICONS.chat, '아직 조용하네요. 첫 이야기를 들려주세요!',
            '<button class="btn btn-primary" data-write>이야기 남기기</button>')}</div>`}

      ${isCloudMode() ? '' : `<div class="card">
        <div class="card-head"><h2>🌐 잠깐, 알아두실 게 있어요</h2></div>
        <p style="font-size:13px;color:var(--ink-2);line-height:1.65;margin:0">
          지금 여기 쓰신 글은 <b>이 브라우저에만 저장</b>돼서 다른 분들께는 안 보여요. 서버 없이 돌아가는 사이트라서요.
          진짜로 여럿이 같이 쓰는 게시판으로 바꾸려면 GitHub Discussions를 켜고 <b>giscus</b> 를 연결하면 돼요.
          <code>[설정 → 커뮤니티 연동]</code>에 정보만 넣어주시면 바로 아래에 진짜 댓글창이 붙어요!
        </p>
      </div>`}
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
    root.querySelectorAll('[data-rate] [data-star]').forEach(s => s.addEventListener('click', () => {
      community.rate(s.closest('[data-rate]').dataset.rate, +s.dataset.star);
    }));

    /* 라운지 대화창 */
    root.querySelector('[data-chat-toggle]')?.addEventListener('click', () => { chatOpen = !chatOpen; this.mount(root, ctx); });
    root.querySelector('[data-chat-form]')?.addEventListener('submit', e => {
      e.preventDefault();
      const inp = e.target.querySelector('input[name=body]');
      try { if (community.chatSend(inp.value)) inp.value = ''; } catch (err) { toast(err.message); }
    });
    root.querySelectorAll('[data-delchat]').forEach(b => b.addEventListener('click', () => community.chatRemove(b.dataset.delchat)));
    const log = root.querySelector('[data-chatlog]');
    if (log) log.scrollTop = log.scrollHeight;
    root.querySelectorAll('[data-report]').forEach(b => b.addEventListener('click', () => modal({
      title: '이 글을 신고할게요',
      body: field('어떤 점이 문제인가요?', textareaEl('reason', { required: true, rows: 3,
        placeholder: '광고·욕설·잘못된 의학 정보 등 어떤 점이 걱정되는지 적어주세요' })),
      submitLabel: '신고하기',
      onSubmit: async f => {
        await community.report('post', b.dataset.report, f.reason);
        toast('알려주셔서 고마워요. 확인해볼게요!');
      }
    })));
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

/* 라운지 대화창 — 글보다 가벼운 한 줄 인사/잡담 (community 영역에 저장) */
function chatCard(me) {
  const msgs = community.chat().slice(-30);
  return `<div class="card">
    <div class="card-head"><h2>💬 라운지 대화창</h2><div class="spacer"></div>
      <button class="btn btn-ghost btn-sm" data-chat-toggle>${chatOpen ? '접기' : `펼치기${msgs.length ? ` (${msgs.length})` : ''}`}</button></div>
    ${chatOpen ? `
      <div style="max-height:230px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;padding:2px 0" data-chatlog>
        ${msgs.length ? msgs.map(m => `
          <div style="font-size:12.5px;line-height:1.55">
            <b style="color:var(--ink-2)">${esc(m.author)}</b>
            <span style="color:var(--ink-3);font-size:11px"> · ${relDate(m.createdAt)}</span>
            ${me && m.authorId === me.id ? `<button class="btn btn-ghost btn-sm" data-delchat="${esc(m.id)}" style="padding:0 6px;font-size:10.5px">지우기</button>` : ''}
            <br>${esc(m.body)}
          </div>`).join('')
          : '<div style="font-size:12.5px;color:var(--ink-3)">아직 조용해요. 먼저 인사 남겨볼까요? 🐾</div>'}
      </div>
      <form class="row" style="margin-top:10px;gap:7px" data-chat-form>
        <input type="text" name="body" maxlength="500" placeholder="집사님들에게 한마디" style="flex:1" autocomplete="off">
        <button class="btn btn-sm btn-primary">보내기</button>
      </form>` : ''}
  </div>`;
}

function post(p, me) {
  const liked = !!p.liked;
  return `<div class="post">
    <div class="ph">
      <div class="avatar">${esc(initials(p.author))}</div>
      <b style="color:var(--ink)">${esc(p.author)}</b> · ${relDate(p.createdAt)}
      <span class="chip brand">${esc(LABEL[p.kind] || p.kind)}</span>
      <div class="spacer"></div>
      ${me && p.authorId === me.id
        ? `<button class="btn btn-sm btn-danger" data-delpost="${esc(p.id)}">삭제</button>`
        : `<button class="btn btn-sm btn-ghost" data-report="${esc(p.id)}" title="신고하기">🚩</button>`}
    </div>
    <div class="pt">${esc(p.title)}</div>
    <div class="pb">${esc(p.body)}</div>
    ${p.tags?.length ? `<div class="row" style="gap:5px;margin-top:9px">${p.tags.map(t => `<span class="chip">#${esc(t)}</span>`).join('')}</div>` : ''}
    <div class="pf">
      <button class="btn btn-sm ${liked ? 'btn-primary' : ''}" data-like="${esc(p.id)}" title="추천">👍 ${p.likeCount || 0}</button>
      <span style="font-size:12px;color:var(--ink-3)">💬 ${p.comments.length}개</span>
      ${p.kind === 'suggest' ? `
        <span class="stars pick" data-rate="${esc(p.id)}" title="별점 남기기">${[1, 2, 3, 4, 5].map(i =>
          `<span data-star="${i}" style="cursor:pointer">${i <= (p.myStars || 0) ? '★' : '☆'}</span>`).join('')}</span>
        <span style="font-size:12px;color:var(--ink-3)">
          ${p.ratingCount ? `평균 ★${p.ratingAvg} · ${p.ratingCount}명` : '첫 별점을 남겨주세요'}</span>` : ''}
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
