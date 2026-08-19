/* 회원가입 / 로그인 화면 */
import { auth } from '../store.js';
import { esc, toast } from '../ui.js';
import { dogIcon } from '../icons.js';

let mode = 'login';

function html() {
  const isLogin = mode === 'login';
  return `
  <div class="auth-wrap">
    <section class="auth-hero">
      <div class="hero-dogs">
        ${['bichon','maltese','poodleCream','coton','poodle'].map(k => `<div class="dogav">${dogIcon(k, 52)}</div>`).join('')}
      </div>
      <h1>우리 아이 건강,<br>여기저기 흩어놓지 말고<br>한 곳에 모아둬요.</h1>
      <p>밥·약·산책부터 접종이랑 병원 기록까지. 견종이랑 나이에 맞춰서 “이맘때 이건 좀 봐주세요” 하고 미리 귀띔해드릴게요.</p>
      <div class="auth-feats">
        <div class="auth-feat"><b>💉 접종일 알아서 계산</b>생일만 알려주시면 다음 접종일이랑 구충 주기를 챙겨드려요.</div>
        <div class="auth-feat"><b>🩺 이맘때 조심할 것</b>말티즈 슬개골, 코기 허리처럼 지금 나이에 봐줄 것들을 미리 알려드려요.</div>
        <div class="auth-feat"><b>🍚 하루 밥양 계산</b>몸무게랑 활동량 넣으면 하루 몇 g 줘야 할지 딱 나와요.</div>
        <div class="auth-feat"><b>🛒 용품 이야기</b>샴푸며 빗이며, 다른 집사님들 써본 후기를 같이 봐요.</div>
      </div>
    </section>

    <section class="auth-panel">
      <div class="auth-box">
        <h2>${isLogin ? '다시 오셨네요!' : '반가워요!'}</h2>
        <p class="lead">${isLogin ? '이메일로 들어와주세요.' : '몇 개만 적으면 바로 시작할 수 있어요.'}</p>

        <div class="auth-tabs">
          <button class="${isLogin ? 'on' : ''}" data-mode="login">들어가기</button>
          <button class="${!isLogin ? 'on' : ''}" data-mode="signup">처음이에요</button>
        </div>

        <form data-auth-form>
          ${!isLogin ? `<div class="field"><label>뭐라고 불러드릴까요?</label>
            <input type="text" name="nick" required maxlength="20" placeholder="수다방에 보일 이름이에요"></div>` : ''}
          <div class="field"><label>이메일</label>
            <input type="email" name="email" required placeholder="you@example.com" autocomplete="username"></div>
          <div class="field"><label>비밀번호</label>
            <input type="password" name="password" required minlength="8"
              placeholder="8자 이상이면 돼요" autocomplete="${isLogin ? 'current-password' : 'new-password'}"></div>
          ${!isLogin ? `<div class="field"><label>한 번 더 적어주세요</label>
            <input type="password" name="password2" required minlength="8" autocomplete="new-password"></div>
          <label class="check" style="margin-bottom:14px"><input type="checkbox" name="agree" required>
            <span>아래 저장 방식 안내를 읽었어요</span></label>` : ''}
          <button type="submit" class="btn btn-primary btn-block">${isLogin ? '들어가기' : '시작할래요!'}</button>
        </form>

        <div class="auth-note">
          <b>기록은 이 브라우저에만 저장돼요.</b><br>
          서버 없이 돌아가는 사이트라서요. 비밀번호는 안전하게 암호화해서 넣어두지만,
          브라우저 기록을 지우거나 다른 기기·시크릿 창에서 열면 그동안 쌓은 게 안 보여요.
          <b>[설정 → 데이터 내보내기]</b>로 가끔 백업해두시면 마음이 편해요!
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
      btn.disabled = true; btn.textContent = '잠깐만요…';
      try {
        if (mode === 'signup') {
          if (f.password !== f.password2) throw new Error('두 비밀번호가 서로 달라요!');
          await auth.signup(f);
          toast('반가워요! 이제 우리 아이를 소개해주세요 🐶');
          location.hash = '#/profile';
        } else {
          await auth.login(f);
          toast('어서 오세요! 🐾');
        }
        onDone();
      } catch (err) {
        toast(err.message);
        btn.disabled = false;
        btn.textContent = mode === 'login' ? '들어가기' : '시작할래요!';
      }
    });
  }
};
