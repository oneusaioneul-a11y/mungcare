/* 설정 — 계정, 화면, 데이터 백업, 커뮤니티 연동 */
import { auth, backup, settings, isCloudMode } from '../store.js';
import { esc, fmtDate, modal, field, inputEl, toast, confirmModal } from '../ui.js';
import authView from './auth.js';

export default {
  head: () => ({ title: '설정', sub: '계정이랑 백업, 연동 같은 것들' }),

  mount(root, ctx) {
    const u = auth.current();
    let giscus = {};
    try { giscus = JSON.parse(localStorage.getItem('bc.giscus') || '{}'); } catch {}

    root.innerHTML = `
    <div class="stack">
      <div class="grid g2">
        <div class="card">
          <div class="card-head"><h2>👤 내 정보</h2><div class="spacer"></div>
            <span class="chip ${isCloudMode() ? 'ok' : 'warn'}">${isCloudMode() ? '☁️ 서버 저장' : '이 기기에만'}</span></div>
          <div class="tbl-wrap"><table><tbody>
            <tr><th style="width:100px">부르는 이름</th><td>${esc(u.nick)}</td></tr>
            <tr><th>이메일</th><td>${esc(u.email)}</td></tr>
            <tr><th>함께한 날부터</th><td>${fmtDate(u.createdAt)}</td></tr>
            <tr><th>우리 아이들</th><td>${ctx.dogs.length}마리 — ${esc(ctx.dogs.map(d => d.name).join(', ') || '아직 없어요')}</td></tr>
          </tbody></table></div>
          <div class="row" style="margin-top:14px">
            <button class="btn btn-sm" data-nick>이름 바꾸기</button>
            <button class="btn btn-sm" data-pw>비밀번호 바꾸기</button>
          </div>
        </div>

        <div class="card">
          <div class="card-head"><h2>🎨 화면 색</h2></div>
          <div class="row">
            <button class="btn ${settings.get('theme') !== 'dark' ? 'btn-primary' : ''}" data-theme="light">☀️ 라이트</button>
            <button class="btn ${settings.get('theme') === 'dark' ? 'btn-primary' : ''}" data-theme="dark">🌙 다크</button>
          </div>
          <p style="font-size:12.5px;color:var(--ink-3);margin:14px 0 0">
            글꼴은 에스코어드림을 써요. 인터넷이 느리면 기본 글꼴로 먼저 보였다가 스르륵 바뀔 거예요.</p>
        </div>
      </div>

      <div class="card">
        <div class="card-head"><h2>🔒 개인정보</h2><div class="spacer"></div>
          <a class="btn btn-sm" href="#/privacy">처리방침 · 내 동의 내역</a></div>
        <p style="font-size:12.5px;color:var(--ink-2);margin:0">
          가입할 때 동의하신 내용은 언제든 다시 볼 수 있어요.
          동의를 철회하고 싶으시면 아래 <b>[${isCloudMode() ? '우리 아이 기록 다 지우기' : '계정이랑 기록 다 지우기'}]</b>로
          모든 기록을 파기할 수 있어요.</p>
      </div>

      <div class="card">
        <div class="card-head"><h2>💾 백업하고 되돌리기</h2></div>
        ${isCloudMode()
          ? `<div class="alert ok" style="margin-bottom:14px"><span class="ai">☁️</span><span>
              <b>기록이 서버에 저장되고 있어요.</b><br><span style="opacity:.85">
              휴대폰에서 적은 게 노트북에서도 그대로 보여요. 그래도 병원 기록처럼 중요한 건
              가끔 파일로 받아두시면 마음이 편해요.</span></span></div>`
          : `<div class="alert warn" style="margin-bottom:14px"><span class="ai">⚠️</span><span>
              <b>여기 쌓인 기록은 전부 이 브라우저에만 있어요.</b><br><span style="opacity:.85">
              방문 기록을 지우거나 시크릿 창을 닫거나, 다른 기기에서 열면 안 보여요.
              병원 기록처럼 중요한 건 가끔 파일로 받아서 따로 보관해두세요!</span></span></div>`}
        <div class="row">
          <button class="btn btn-primary" data-export>⬇️ 파일로 저장하기</button>
          ${isCloudMode() ? '' : '<button class="btn" data-import>⬆️ 백업 불러오기</button>'}
          <div class="spacer"></div>
          <button class="btn btn-danger" data-wipe>${isCloudMode() ? '우리 아이 기록 다 지우기' : '계정이랑 기록 다 지우기'}</button>
        </div>
      </div>

      ${isCloudMode() ? '' : `<div class="card">
        <div class="card-head"><h2>💬 커뮤니티 연동 (giscus)</h2>
          <span class="chip ${giscus.repo ? 'ok' : ''}">${giscus.repo ? '연결됨' : '미연결'}</span></div>
        <p style="font-size:13px;color:var(--ink-2);line-height:1.65;margin:0 0 12px">
          GitHub Discussions를 쓰면 서버 없이도 여럿이 같이 쓰는 진짜 게시판을 만들 수 있어요.
          저장소에서 Discussions를 켜고 <a href="https://giscus.app" target="_blank" rel="noopener">giscus.app</a>에서 받은 값을 여기 넣어주세요.</p>
        <div class="inline">
          ${field('저장소 (owner/repo)', inputEl('gRepo', { value: giscus.repo, placeholder: 'redreta/dog-health' }))}
          ${field('Repository ID', inputEl('gRepoId', { value: giscus.repoId, placeholder: 'R_kg...' }))}
        </div>
        <div class="inline">
          ${field('Category', inputEl('gCat', { value: giscus.category || 'General' }))}
          ${field('Category ID', inputEl('gCatId', { value: giscus.categoryId, placeholder: 'DIC_kw...' }))}
        </div>
        <button class="btn btn-primary btn-sm" data-giscus-save>저장할게요</button>
      </div>`}

      <div class="card">
        <div class="card-head"><h2>📡 공공데이터 연결</h2><div class="spacer"></div>
          <button class="btn btn-sm" data-gov-check>지금 확인하기</button></div>
        <p style="font-size:13px;color:var(--ink-2);line-height:1.65;margin:0 0 10px">
          유기견 입양 정보는 <b>농림축산검역본부 동물보호관리시스템</b>(공공데이터포털)에서 실시간으로 가져와요.
          서비스키는 서버에만 두고, 브라우저는 우리 서버를 거쳐서 부릅니다.</p>
        <div id="gov-status" style="font-size:13px;color:var(--ink-3)">확인 버튼을 눌러보세요.</div>
      </div>

      <div class="card">
        <div class="card-head"><h2>🗺️ 앞으로 이런 것도 만들 거예요</h2></div>
        <div class="grid g2" style="gap:9px">
          ${[['🏥 병원 기록 자동으로', '명세서 사진만 찍으면 알아서 들어가게'],
             ['🥫 사료 검색', '제품명만 넣으면 칼로리랑 성분이 쫙'],
             ['📷 화식 영양 분석', '재료 넣으면 영양 균형이 맞는지 봐드려요'],
             ['🔔 알림 받기', '접종일이나 약 시간에 폰으로 딩동'],

             ['🛒 최저가 알림', '가격 떨어지면 알려드릴게요']
            ].map(([t, d]) => `<div style="border:1px solid var(--line);border-radius:var(--radius-sm);padding:11px 13px">
              <div style="font-weight:700;font-size:13px">${esc(t)}</div>
              <div style="font-size:12.5px;color:var(--ink-3);margin-top:3px">${esc(d)}</div></div>`).join('')}
        </div>
      </div>
    </div>`;

    root.querySelectorAll('[data-theme]').forEach(b => b.addEventListener('click', () => settings.set('theme', b.dataset.theme)));

    root.querySelector('[data-nick]')?.addEventListener('click', () => modal({
      title: '이름 바꾸기',
      body: field('뭐라고 불러드릴까요?', inputEl('nick', { value: u.nick, required: true })),
      onSubmit: async f => { await auth.updateNick(f.nick); toast('바꿔뒀어요!'); }
    }));

    root.querySelector('[data-pw]')?.addEventListener('click', () => modal({
      title: '비밀번호 바꾸기',
      body: field('지금 비밀번호', inputEl('old', { type: 'password', required: true }))
        + field('새 비밀번호', inputEl('nw', { type: 'password', required: true }), '8자 이상이면 돼요')
        + field('한 번 더 적어주세요', inputEl('nw2', { type: 'password', required: true })),
      onSubmit: async f => {
        if (f.nw !== f.nw2) throw new Error('두 비밀번호가 서로 달라요!');
        await auth.changePassword(f.old, f.nw);
        toast('비밀번호 바꿨어요.');
      }
    }));

    root.querySelector('[data-export]')?.addEventListener('click', () => {
      const json = backup.export();
      const blob = new Blob([json], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `멍케어_백업_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      toast('백업 파일 받았어요! 잘 보관해주세요');
    });

    root.querySelector('[data-import]')?.addEventListener('click', () => {
      const inp = document.createElement('input');
      inp.type = 'file'; inp.accept = 'application/json,.json';
      inp.onchange = () => {
        const f = inp.files?.[0]; if (!f) return;
        const rd = new FileReader();
        rd.onload = () => {
          confirmModal('백업 불러오기', '지금 기록이 백업 파일 내용으로 전부 바뀌어요. 그래도 할까요?', () => {
            try { backup.import(rd.result); toast('원래대로 되돌렸어요!'); }
            catch (e) { toast(e.message); }
          }, '복원');
        };
        rd.readAsText(f);
      };
      inp.click();
    });

    root.querySelector('[data-wipe]')?.addEventListener('click', () =>
      confirmModal(
        isCloudMode() ? '기록 전부 지우기' : '계정 지우기',
        isCloudMode()
          ? '등록한 아이와 밥·약·산책·병원 기록이 서버에서 전부 사라지고 로그아웃돼요. 되돌릴 수 없는데, 정말 지울까요?'
          : '계정이랑 우리 아이 기록이 전부 사라져요. 되돌릴 수 없는데, 정말 지울까요?',
        async () => { await backup.wipeAccount(); authView.reset(); toast('지웠어요.'); location.hash = '#/'; }));

    root.querySelector('[data-gov-check]')?.addEventListener('click', async e => {
      const box = root.querySelector('#gov-status');
      e.target.disabled = true; box.textContent = '확인하는 중이에요…';
      try {
        const G = await import('../gov.js');
        const s2 = await G.status();
        const live = s2.liveServices || [];
        box.innerHTML = `
          <div class="alert ${live.length ? 'ok' : 'warn'}" style="margin-bottom:10px">
            <span class="ai">${live.length ? '✅' : '⏳'}</span>
            <span>${live.length
              ? `<b>연결됐어요!</b> 열려 있는 서비스: ${esc(live.join(', '))}`
              : `<b>아직 열리지 않았어요.</b><br><span style="opacity:.85">${esc(s2.hint || '')}</span>`}</span></div>
          <div class="tbl-wrap"><table><thead><tr><th>서비스</th><th>상태</th><th>메시지</th></tr></thead><tbody>
          ${(s2.checks || []).map(c => `<tr><td>${esc(c.name)}</td>
            <td>${c.ok ? '<span class="chip ok">정상</span>' : `<span class="chip bad">코드 ${esc(c.code || '?')}</span>`}</td>
            <td style="color:var(--ink-3)">${esc(c.message || (c.ok ? c.totalCount + '건' : ''))}</td></tr>`).join('')}
          </tbody></table></div>`;
      } catch (err) {
        box.textContent = err?.message || '확인하지 못했어요. 잠시 후 다시 시도해주세요.';
      } finally { e.target.disabled = false; }
    });

    root.querySelector('[data-giscus-save]')?.addEventListener('click', () => {
      const g = {
        repo: root.querySelector('[name=gRepo]').value.trim(),
        repoId: root.querySelector('[name=gRepoId]').value.trim(),
        category: root.querySelector('[name=gCat]').value.trim() || 'General',
        categoryId: root.querySelector('[name=gCatId]').value.trim()
      };
      localStorage.setItem('bc.giscus', JSON.stringify(g));
      toast(g.repo && g.repoId && g.categoryId ? '저장했어요! 수다방에서 확인해보세요' : '저장했어요. 아직 빈 칸이 있어서 댓글창은 안 보일 거예요');
      this.mount(root, ctx);
    });
  }
};
