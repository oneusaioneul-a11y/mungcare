/* 개인정보처리방침 — 개인정보보호법(제30조)에 따라 공개하는 문서.
   문구를 고치면 store.js 의 PRIVACY_VERSION 을 올리고 동의를 다시 받으세요. */
import { PRIVACY_VERSION, auth } from '../store.js';
import { esc, fmtDate } from '../ui.js';

/* 가입 화면(로그인 전)과 #/privacy(로그인 후)에서 같이 씁니다 */
export function policyHTML() {
  return `
  <div class="policy" style="font-size:13px;line-height:1.75;color:var(--ink-2)">
    <p style="margin:0 0 14px"><b>멍케어 개인정보처리방침</b> · 판 ${esc(PRIVACY_VERSION)}<br>
    멍케어(이하 "서비스")는 「개인정보 보호법」에 따라 이용자의 개인정보를 보호하고,
    관련 권리를 보장하기 위해 아래와 같이 처리방침을 둡니다.</p>

    <h4 style="font-size:13px;margin:14px 0 6px">1. 수집하는 항목 · 목적 · 보유 기간</h4>
    <div class="tbl-wrap"><table>
      <thead><tr><th>구분</th><th>항목</th><th>목적</th><th>보유 기간</th></tr></thead>
      <tbody>
        <tr><td>일반 회원 (필수)</td><td>이메일, 비밀번호(복호화 불가능한 형태로 저장), 닉네임</td>
          <td>회원 식별, 로그인, 비밀번호 재설정</td><td>회원 탈퇴 시 지체 없이 파기</td></tr>
        <tr><td>서비스 이용 정보</td><td>반려견 정보와 건강 기록(밥·약·산책·접종·진료 등), 화식 레시피</td>
          <td>건강 관리 기능 제공(본인만 조회 가능)</td><td>이용자가 삭제하거나 탈퇴하면 파기</td></tr>
        <tr><td>커뮤니티</td><td>작성한 글·댓글·대화·후기·별점 (닉네임으로 표시)</td>
          <td>회원 간 정보 공유</td><td>이용자가 삭제할 때까지</td></tr>
        <tr><td>파트너 회원 (필수)</td><td>상호명, 사업자등록번호, 업종, 연락처, 주소, 소개</td>
          <td>업체 확인과 디렉터리 게시</td><td>파트너 탈퇴 시 지체 없이 파기</td></tr>
      </tbody>
    </table></div>
    <p style="margin:8px 0 0">쿠키·광고 식별자 등 자동 수집 장치는 사용하지 않습니다.
    서버 연결이 꺼진 상태(브라우저 저장 모드)에서는 모든 기록이 이용자 기기 안에만 저장되고 외부로 전송되지 않습니다.</p>

    <h4 style="font-size:13px;margin:14px 0 6px">2. 보관 위치와 처리 위탁</h4>
    <p style="margin:0">서버 저장 모드에서는 데이터가 Supabase(데이터베이스·인증)와 Vercel(웹 호스팅)을 통해 처리됩니다.
    회원 관리·건강 기록·커뮤니티·파트너 데이터는 서로 분리된 저장 영역에 두고,
    다른 이용자의 건강 기록은 조회 자체가 차단되도록 데이터베이스 수준에서 통제합니다.</p>

    <h4 style="font-size:13px;margin:14px 0 6px">3. 제3자 제공</h4>
    <p style="margin:0">이용자의 개인정보를 제3자에게 제공하지 않습니다.
    법령에 근거한 적법한 요청이 있는 경우에만 예외로 합니다.</p>

    <h4 style="font-size:13px;margin:14px 0 6px">4. 만 14세 미만 아동</h4>
    <p style="margin:0">만 14세 미만은 가입할 수 없습니다. 가입 시 만 14세 이상임을 확인받습니다.</p>

    <h4 style="font-size:13px;margin:14px 0 6px">5. 이용자의 권리</h4>
    <p style="margin:0">이용자는 언제든지 자신의 개인정보를 열람·정정·삭제하거나 처리 정지를 요구할 수 있습니다.
    기록은 각 화면에서 직접 수정·삭제할 수 있고, <b>[설정 → 계정이랑 기록 다 지우기]</b>로
    동의를 철회하고 모든 데이터를 파기할 수 있습니다. 동의를 거부할 권리가 있으며,
    필수 항목 동의를 거부하면 회원가입이 제한됩니다.</p>

    <h4 style="font-size:13px;margin:14px 0 6px">6. 파기 절차와 방법</h4>
    <p style="margin:0">보유 기간이 끝나거나 처리 목적이 달성된 개인정보는 지체 없이,
    복구할 수 없는 방법으로 삭제합니다.</p>

    <h4 style="font-size:13px;margin:14px 0 6px">7. 안전성 확보 조치</h4>
    <p style="margin:0">비밀번호는 복호화할 수 없는 형태로만 저장하고, 데이터베이스 행 수준 보안(RLS)으로
    본인 데이터 외 접근을 차단하며, 데이터 영역을 분리해 관리합니다.</p>

    <h4 style="font-size:13px;margin:14px 0 6px">8. 개인정보 보호책임자</h4>
    <p style="margin:0">이름: (운영자 성함) · 연락처: (운영 이메일)<br>
    <span style="color:var(--warn)">※ 운영자 정보를 채워 넣은 뒤 서비스를 공개하세요.</span></p>

    <h4 style="font-size:13px;margin:14px 0 6px">9. 고지 의무</h4>
    <p style="margin:0">이 방침이 바뀌면 시행 7일 전부터 서비스 안에서 알리고, 판 번호를 올립니다.</p>
  </div>`;
}

export default {
  head: () => ({ title: '개인정보처리방침', sub: `판 ${PRIVACY_VERSION}` }),

  mount(root) {
    const consents = auth.consents();
    root.innerHTML = `
    <div class="stack">
      ${consents.length ? `<div class="card">
        <div class="card-head"><h2>✅ 내가 동의한 내역</h2></div>
        <div class="tbl-wrap"><table>
          <thead><tr><th>문서</th><th>판</th><th>동의 일시</th></tr></thead>
          <tbody>${consents.map(c => `<tr>
            <td>${esc({ privacy: '개인정보 수집·이용', age14: '만 14세 이상 확인', partner_terms: '파트너 운영 안내' }[c.doc] || c.doc)}</td>
            <td>${esc(c.version)}</td><td>${fmtDate(c.agreedAt)}</td>
          </tr>`).join('')}</tbody>
        </table></div>
      </div>` : ''}
      <div class="card">${policyHTML()}</div>
    </div>`;
  }
};
