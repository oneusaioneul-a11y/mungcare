/* 회원가입 / 로그인 화면 */
import { auth } from '../store.js';
import { esc, toast } from '../ui.js';

let mode = 'login';

function html() {
  const isLogin = mode === 'login';
  return `
  <div class="auth-wrap">
    <section class="auth-hero">
      <div style="font-size:44px">🐕</div>
      <h1>우리 아이의 건강,<br>흩어진 기록 대신 한 곳에서.</h1>
      <p>식단·약·산책부터 예방접종과 진료 기록까지. 견종과 나이에 맞춰 조심해야 할 질환을 미리 알려주는 통합 반려견 건강 관리 서비스입니다.</p>
      <div class="auth-feats">
        <div class="auth-feat"><b>💉 접종 자동 스케줄</b>생년월일만 넣으면 다음 접종일과 구충 주기를 계산합니다.</div>
        <div class="auth-feat"><b>🩺 견종별 위험 예보</b>말티즈의 슬개골, 코기의 디스크처럼 지금 나이에 조심할 질환을 알려줍니다.</div>
        <div class="auth-feat"><b>🍚 칼로리 기반 식단</b>체중·활동량으로 하루 권장 칼로리와 급여량(g)을 계산합니다.</div>
        <div class="auth-feat"><b>🛒 용품 리뷰 · 커뮤니티</b>목욕 용품·빗 정보와 보호자들의 실사용 평가를 함께 봅니다.</div>
      </div>
    </section>

    <section class="auth-panel">
      <div class="auth-box">
        <h2>${isLogin ? '다시 오셨네요' : '반갑습니다'}</h2>
        <p class="lead">${isLogin ? '계정으로 로그인해 주세요.' : '몇 가지만 입력하면 바로 시작할 수 있어요.'}</p>

        <div class="auth-tabs">
          <button class="${isLogin ? 'on' : ''}" data-mode="login">로그인</button>
          <button class="${!isLogin ? 'on' : ''}" data-mode="signup">회원가입</button>
        </div>

        <form data-auth-form>
          ${!isLogin ? `<div class="field"><label>닉네임</label>
            <input type="text" name="nick" required maxlength="20" placeholder="커뮤니티에 표시될 이름"></div>` : ''}
          <div class="field"><label>이메일</label>
            <input type="email" name="email" required placeholder="you@example.com" autocomplete="username"></div>
          <div class="field"><label>비밀번호</label>
            <input type="password" name="password" required minlength="8"
              placeholder="8자 이상" autocomplete="${isLogin ? 'current-password' : 'new-password'}"></div>
          ${!isLogin ? `<div class="field"><label>비밀번호 확인</label>
            <input type="password" name="password2" required minlength="8" autocomplete="new-password"></div>
          <label class="check" style="margin-bottom:14px"><input type="checkbox" name="agree" required>
            <span>아래 저장 방식 안내를 확인했습니다.</span></label>` : ''}
          <button type="submit" class="btn btn-primary btn-block">${isLogin ? '로그인' : '가입하고 시작하기'}</button>
        </form>

        <div class="auth-note">
          <b>계정과 기록은 이 브라우저에만 저장됩니다.</b><br>
          이 사이트는 GitHub Pages 정적 호스팅으로 운영되어 서버 데이터베이스가 없습니다.
          비밀번호는 PBKDF2로 해싱해 저장하지만, 브라우저 저장소를 지우거나 다른 기기·시크릿 창에서 접속하면
          기록이 보이지 않습니다. <b>[설정 → 데이터 내보내기]</b>로 주기적으로 백업해 주세요.
        </div>
      </div>
    </section>
  </div>`;
}

export default {
  mount(root, { onDone }) {
    root.innerHTML = html();
    root.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => {
      mode = b.dataset.mode; this.mount(root, { onDone });
    }));
    const form = root.querySelector('[data-auth-form]');
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(form).entries());
      const btn = form.querySelector('button[type=submit]');
      btn.disabled = true; btn.textContent = '처리 중…';
      try {
        if (mode === 'signup') {
          if (f.password !== f.password2) throw new Error('비밀번호가 서로 다릅니다.');
          await auth.signup(f);
          toast('가입 완료! 먼저 반려견을 등록해 주세요.');
          location.hash = '#/profile';
        } else {
          await auth.login(f);
          toast('로그인되었습니다.');
        }
        onDone();
      } catch (err) {
        toast(err.message);
        btn.disabled = false;
        btn.textContent = mode === 'login' ? '로그인' : '가입하고 시작하기';
      }
    });
  }
};
