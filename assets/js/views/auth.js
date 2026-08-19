/* 회원가입 · 로그인 · 비밀번호 찾기 */
import { auth, isCloudMode } from '../store.js';
import { esc, toast } from '../ui.js';
import { dogIcon } from '../icons.js';

let mode = 'login';       // login | signup | forgot | recovery | sent
let sentTo = '';          // 인증/재설정 메일을 보낸 주소
let sentKind = 'signup';  // signup | reset

const HERO = ['bichon', 'maltese', 'poodleCream', 'coton', 'poodle'];

function hero() {
  return `
    <section class="auth-hero">
      <div class="hero-dogs">${HERO.map(k => `<div class="dogav">${dogIcon(k, 52)}</div>`).join('')}</div>
      <h1>우리 아이 건강,<br>여기저기 흩어놓지 말고<br>한 곳에 모아둬요.</h1>
      <p>밥·약·산책부터 접종이랑 병원 기록까지. 견종이랑 나이에 맞춰서 “이맘때 이건 좀 봐주세요” 하고 미리 귀띔해드릴게요.</p>
      <div class="auth-feats">
        <div class="auth-feat"><b>💉 접종일 알아서 계산</b>생일만 알려주시면 다음 접종일이랑 구충 주기를 챙겨드려요.</div>
        <div class="auth-feat"><b>🩺 이맘때 조심할 것</b>말티즈 슬개골, 코기 허리처럼 지금 나이에 봐줄 것들을 미리 알려드려요.</div>
        <div class="auth-feat"><b>🍚 하루 밥양 계산</b>몸무게랑 활동량 넣으면 하루 몇 g 줘야 할지 딱 나와요.</div>
        <div class="auth-feat"><b>🛒 용품 이야기</b>샴푸며 빗이며, 다른 집사님들 써본 후기를 같이 봐요.</div>
      </div>
    </section>`;
}

function notice() {
  if (isCloudMode()) {
    return `<div class="auth-note">
      <b>기록은 안전하게 서버에 저장돼요.</b><br>
      휴대폰에서 적은 산책 기록이 노트북에서도 그대로 보여요. 비밀번호는 저희도 볼 수 없는 형태로 보관되고,
      다른 분의 건강 기록은 애초에 조회 자체가 막혀 있어요. 커뮤니티에는 닉네임만 보입니다.
    </div>`;
  }
  return `<div class="auth-note">
    <b>지금은 이 브라우저에만 저장되는 모드예요.</b><br>
    서버 연결 설정이 아직 비어 있어서, 기록이 이 기기 밖으로 나가지 않아요.
    다른 기기에서는 안 보이고 이메일 인증·비밀번호 찾기도 쓸 수 없어요.
    <b>[설정 → 파일로 저장하기]</b>로 가끔 백업해두세요!
  </div>`;
}

function body() {
  /* ── 메일 보냄 안내 ── */
  if (mode === 'sent') {
    const isSignup = sentKind === 'signup';
    return `
      <div class="auth-box">
        <div style="font-size:40px;margin-bottom:10px">📬</div>
        <h2>메일함을 확인해주세요!</h2>
        <p class="lead"><b>${esc(sentTo)}</b> 로 ${isSignup ? '인증' : '비밀번호 재설정'} 메일을 보냈어요.</p>
        <div class="bubble" style="margin-bottom:18px">
          ${isSignup
            ? '메일 속 링크를 누르면 가입이 끝나고 바로 시작할 수 있어요. 몇 분 걸릴 수도 있고, 안 보이면 스팸함도 한 번 봐주세요!'
            : '메일 속 링크를 누르면 새 비밀번호를 정하는 화면으로 돌아와요. 링크는 잠시 후 만료되니 빨리 눌러주세요.'}
        </div>
        ${isSignup ? `<button class="btn btn-block" data-resend>인증 메일 다시 보내기</button>` : ''}
        <button class="btn btn-ghost btn-block" style="margin-top:8px" data-mode="login">로그인 화면으로</button>
      </div>`;
  }

  /* ── 재설정 링크로 들어와 새 비밀번호 정하기 ── */
  if (mode === 'recovery') {
    return `
      <div class="auth-box">
        <div style="font-size:38px;margin-bottom:8px">🔑</div>
        <h2>새 비밀번호를 정해주세요</h2>
        <p class="lead">앞으로 이 비밀번호로 들어오시면 돼요.</p>
        <form data-auth-form>
          <div class="field"><label>새 비밀번호</label>
            <input type="password" name="password" required minlength="8" placeholder="8자 이상이면 돼요" autocomplete="new-password"></div>
          <div class="field"><label>한 번 더 적어주세요</label>
            <input type="password" name="password2" required minlength="8" autocomplete="new-password"></div>
          <button type="submit" class="btn btn-primary btn-block">이걸로 할게요</button>
        </form>
      </div>`;
  }

  /* ── 비밀번호 찾기 ── */
  if (mode === 'forgot') {
    return `
      <div class="auth-box">
        <h2>비밀번호를 잊으셨나요?</h2>
        <p class="lead">가입하실 때 쓰신 이메일을 알려주시면 재설정 링크를 보내드릴게요.</p>
        <form data-auth-form>
          <div class="field"><label>이메일</label>
            <input type="email" name="email" required placeholder="you@example.com" autocomplete="username"></div>
          <button type="submit" class="btn btn-primary btn-block">재설정 메일 보내기</button>
        </form>
        <button class="btn btn-ghost btn-block" style="margin-top:10px" data-mode="login">← 로그인으로 돌아가기</button>
        ${notice()}
      </div>`;
  }

  /* ── 로그인 / 회원가입 ── */
  const isLogin = mode === 'login';
  return `
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

      ${isLogin && isCloudMode()
        ? `<button class="btn btn-ghost btn-block" style="margin-top:10px" data-mode="forgot">비밀번호를 잊으셨나요?</button>` : ''}
      ${notice()}
    </div>`;
}

export default {
  mount(root, opts) {
    const { onDone, recovery } = opts;
    if (recovery && mode !== 'recovery') mode = 'recovery';

    root.innerHTML = `<div class="auth-wrap">${hero()}<section class="auth-panel">${body()}</section></div>`;

    root.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => {
      mode = b.dataset.mode;
      this.mount(root, { onDone, recovery: false });
    }));

    root.querySelector('[data-resend]')?.addEventListener('click', async e => {
      e.target.disabled = true;
      try { await auth.resendConfirm(sentTo); toast('메일을 다시 보냈어요! 잠시만 기다려주세요'); }
      catch (err) { toast(err.message); }
      finally { setTimeout(() => { e.target.disabled = false; }, 30000); }
    });

    const form = root.querySelector('[data-auth-form]');
    form?.addEventListener('submit', async e => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(form).entries());
      const btn = form.querySelector('button[type=submit]');
      const label = btn.textContent;
      btn.disabled = true; btn.textContent = '잠깐만요…';

      try {
        if (mode === 'signup') {
          if (f.password !== f.password2) throw new Error('두 비밀번호가 서로 달라요!');
          const { needsConfirm } = await auth.signup(f);
          if (needsConfirm) {
            sentTo = f.email.trim(); sentKind = 'signup'; mode = 'sent';
            this.mount(root, { onDone, recovery: false });
            return;
          }
          toast('반가워요! 이제 우리 아이를 소개해주세요 🐶');
          location.hash = '#/profile';
          onDone();

        } else if (mode === 'login') {
          await auth.login(f);
          toast('어서 오세요! 🐾');
          onDone();

        } else if (mode === 'forgot') {
          await auth.sendReset(f.email);
          sentTo = f.email.trim(); sentKind = 'reset'; mode = 'sent';
          this.mount(root, { onDone, recovery: false });

        } else if (mode === 'recovery') {
          if (f.password !== f.password2) throw new Error('두 비밀번호가 서로 달라요!');
          await auth.setNewPassword(f.password);
          toast('비밀번호를 바꿨어요! 이제 들어가실 수 있어요');
          mode = 'login';
          this.mount(root, { onDone, recovery: false });
          onDone();
        }
      } catch (err) {
        toast(err.message);
        btn.disabled = false; btn.textContent = label;
      }
    });
  }
};
