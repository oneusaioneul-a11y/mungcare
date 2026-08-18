/* 설정 — 계정, 화면, 데이터 백업, 커뮤니티 연동 */
import { auth, backup, settings } from '../store.js';
import { esc, fmtDate, modal, field, inputEl, toast, confirmModal } from '../ui.js';

export default {
  head: () => ({ title: '설정', sub: '계정 · 데이터 백업 · 연동' }),

  mount(root, ctx) {
    const u = auth.current();
    let giscus = {};
    try { giscus = JSON.parse(localStorage.getItem('bc.giscus') || '{}'); } catch {}

    root.innerHTML = `
    <div class="stack">
      <div class="grid g2">
        <div class="card">
          <div class="card-head"><h2>👤 계정</h2></div>
          <div class="tbl-wrap"><table><tbody>
            <tr><th style="width:100px">닉네임</th><td>${esc(u.nick)}</td></tr>
            <tr><th>이메일</th><td>${esc(u.email)}</td></tr>
            <tr><th>가입일</th><td>${fmtDate(u.createdAt)}</td></tr>
            <tr><th>등록 반려견</th><td>${ctx.dogs.length}마리 — ${esc(ctx.dogs.map(d => d.name).join(', ') || '없음')}</td></tr>
          </tbody></table></div>
          <div class="row" style="margin-top:14px">
            <button class="btn btn-sm" data-nick>닉네임 변경</button>
            <button class="btn btn-sm" data-pw>비밀번호 변경</button>
          </div>
        </div>

        <div class="card">
          <div class="card-head"><h2>🎨 화면</h2></div>
          <div class="row">
            <button class="btn ${settings.get('theme') !== 'dark' ? 'btn-primary' : ''}" data-theme="light">☀️ 라이트</button>
            <button class="btn ${settings.get('theme') === 'dark' ? 'btn-primary' : ''}" data-theme="dark">🌙 다크</button>
          </div>
          <p style="font-size:12.5px;color:var(--ink-3);margin:14px 0 0">
            글꼴은 S-Core Dream(에스코어드림)을 사용합니다. 네트워크가 느린 환경에서는 시스템 글꼴로 먼저 표시된 뒤 전환됩니다.</p>
        </div>
      </div>

      <div class="card">
        <div class="card-head"><h2>💾 데이터 백업 · 복원</h2></div>
        <div class="alert warn" style="margin-bottom:14px"><span class="ai">⚠️</span><span>
          <b>이 사이트의 모든 기록은 이 브라우저에만 저장됩니다.</b><br><span style="opacity:.85">
          브라우저 저장소를 지우거나(방문 기록 삭제, 시크릿 모드 종료), 다른 기기·브라우저로 접속하면 기록이 보이지 않습니다.
          중요한 의료 기록은 주기적으로 파일로 내려받아 보관하세요.</span></span></div>
        <div class="row">
          <button class="btn btn-primary" data-export>⬇️ 데이터 내보내기 (.json)</button>
          <button class="btn" data-import>⬆️ 백업 파일 가져오기</button>
          <div class="spacer"></div>
          <button class="btn btn-danger" data-wipe>계정 및 모든 데이터 삭제</button>
        </div>
      </div>

      <div class="card">
        <div class="card-head"><h2>💬 커뮤니티 연동 (giscus)</h2>
          <span class="chip ${giscus.repo ? 'ok' : ''}">${giscus.repo ? '연결됨' : '미연결'}</span></div>
        <p style="font-size:13px;color:var(--ink-2);line-height:1.65;margin:0 0 12px">
          GitHub Discussions를 백엔드로 사용하면 실제로 여러 사용자가 함께 쓰는 댓글·게시판을 정적 사이트에서도 운영할 수 있습니다.
          저장소 설정에서 Discussions를 켜고 <a href="https://giscus.app" target="_blank" rel="noopener">giscus.app</a>에서 발급받은 값을 입력하세요.</p>
        <div class="inline">
          ${field('저장소 (owner/repo)', inputEl('gRepo', { value: giscus.repo, placeholder: 'redreta/dog-health' }))}
          ${field('Repository ID', inputEl('gRepoId', { value: giscus.repoId, placeholder: 'R_kg...' }))}
        </div>
        <div class="inline">
          ${field('Category', inputEl('gCat', { value: giscus.category || 'General' }))}
          ${field('Category ID', inputEl('gCatId', { value: giscus.categoryId, placeholder: 'DIC_kw...' }))}
        </div>
        <button class="btn btn-primary btn-sm" data-giscus-save>연동 정보 저장</button>
      </div>

      <div class="card">
        <div class="card-head"><h2>🗺️ 앞으로 추가될 기능</h2></div>
        <div class="grid g2" style="gap:9px">
          ${[['🏥 동물병원 진료 기록 연계', 'EMR 연동 또는 명세서 인식으로 진료 이력 자동 등록'],
             ['🥫 사료 제품 DB 연계', '제품명만 입력하면 kcal/kg·성분·알러젠 자동 매칭'],
             ['📷 화식 레시피 사진·영양 분석', '재료별 영양소 자동 계산과 균형 진단'],
             ['🔔 접종·투약 푸시 알림', 'PWA 설치 후 기기 알림으로 일정 안내'],
             ['👥 실시간 커뮤니티 서버', '기기 간 동기화되는 계정과 게시판'],
             ['🛒 실시간 가격 비교', '여러 판매처 가격 추이와 최저가 알림']
            ].map(([t, d]) => `<div style="border:1px solid var(--line);border-radius:var(--radius-sm);padding:11px 13px">
              <div style="font-weight:700;font-size:13px">${esc(t)}</div>
              <div style="font-size:12.5px;color:var(--ink-3);margin-top:3px">${esc(d)}</div></div>`).join('')}
        </div>
      </div>
    </div>`;

    root.querySelectorAll('[data-theme]').forEach(b => b.addEventListener('click', () => settings.set('theme', b.dataset.theme)));

    root.querySelector('[data-nick]')?.addEventListener('click', () => modal({
      title: '닉네임 변경',
      body: field('새 닉네임', inputEl('nick', { value: u.nick, required: true })),
      onSubmit: f => { auth.updateNick(f.nick); toast('변경되었습니다.'); }
    }));

    root.querySelector('[data-pw]')?.addEventListener('click', () => modal({
      title: '비밀번호 변경',
      body: field('현재 비밀번호', inputEl('old', { type: 'password', required: true }))
        + field('새 비밀번호', inputEl('nw', { type: 'password', required: true }), '8자 이상')
        + field('새 비밀번호 확인', inputEl('nw2', { type: 'password', required: true })),
      onSubmit: async f => {
        if (f.nw !== f.nw2) throw new Error('새 비밀번호가 서로 다릅니다.');
        await auth.changePassword(f.old, f.nw);
        toast('비밀번호를 변경했습니다.');
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
      toast('백업 파일을 내려받았습니다.');
    });

    root.querySelector('[data-import]')?.addEventListener('click', () => {
      const inp = document.createElement('input');
      inp.type = 'file'; inp.accept = 'application/json,.json';
      inp.onchange = () => {
        const f = inp.files?.[0]; if (!f) return;
        const rd = new FileReader();
        rd.onload = () => {
          confirmModal('백업 복원', '현재 계정의 모든 기록이 백업 파일 내용으로 덮어써집니다. 계속할까요?', () => {
            try { backup.import(rd.result); toast('복원되었습니다.'); }
            catch (e) { toast(e.message); }
          }, '복원');
        };
        rd.readAsText(f);
      };
      inp.click();
    });

    root.querySelector('[data-wipe]')?.addEventListener('click', () =>
      confirmModal('계정 삭제', '계정과 모든 반려견 기록이 영구히 삭제됩니다. 되돌릴 수 없습니다. 정말 삭제할까요?',
        () => { backup.wipeAccount(); toast('삭제되었습니다.'); location.hash = '#/'; }));

    root.querySelector('[data-giscus-save]')?.addEventListener('click', () => {
      const g = {
        repo: root.querySelector('[name=gRepo]').value.trim(),
        repoId: root.querySelector('[name=gRepoId]').value.trim(),
        category: root.querySelector('[name=gCat]').value.trim() || 'General',
        categoryId: root.querySelector('[name=gCatId]').value.trim()
      };
      localStorage.setItem('bc.giscus', JSON.stringify(g));
      toast(g.repo && g.repoId && g.categoryId ? '저장했습니다. 커뮤니티 화면에서 확인하세요.' : '저장했습니다. (일부 값이 비어 있어 위젯은 표시되지 않습니다)');
      this.mount(root, ctx);
    });
  }
};
