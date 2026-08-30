/* 개인정보처리방침 — 개인정보보호법(제30조)에 따라 공개하는 문서.
   문구를 고치면 store.js 의 PRIVACY_VERSION 을 올리고 동의를 다시 받으세요. */
import { PRIVACY_VERSION, auth } from '../store.js';
import { esc, fmtDate } from '../ui.js';

/* 서비스 이용약관 — 앱(app/lib/content/legal.dart)과 같은 내용. 수정 시 양쪽을 함께 고칠 것.
   ※ 초안: 서비스 공개 전 법률 검토 권장 */
export function termsHTML() {
  const h4 = t => `<h4 style="font-size:13px;margin:14px 0 6px">${t}</h4>`;
  return `
  <div class="policy" style="font-size:13px;line-height:1.75;color:var(--ink-2)">
    <p style="margin:0 0 14px"><b>멍케어 서비스 이용약관</b> · 판 ${esc(PRIVACY_VERSION)}</p>
    ${h4('제1조 (목적)')}
    <p style="margin:0">이 약관은 멍케어(이하 "서비스")가 제공하는 반려견 건강 관리, 커뮤니티, 용품 리뷰,
    유기견 입양 정보, 파트너 디렉터리 서비스의 이용 조건과 절차, 서비스와 회원의 권리·의무를 정합니다.</p>
    ${h4('제2조 (정의)')}
    <p style="margin:0">① "회원"은 이 약관에 동의하고 가입한 사람입니다. ② "파트너 회원"은 동물병원·용품점 등
    사업자로 가입한 회원입니다. ③ "게시물"은 회원이 서비스에 올린 글·댓글·대화·후기·별점 등입니다.</p>
    ${h4('제3조 (약관의 효력과 변경)')}
    <p style="margin:0">약관은 서비스 화면 게시로 효력이 생깁니다. 서비스는 관련 법을 지키는 범위에서 약관을
    바꿀 수 있으며, 바뀐 약관은 적용 7일 전부터(회원에게 불리한 변경은 30일 전부터) 서비스 안에서 알립니다.
    동의하지 않는 회원은 탈퇴할 수 있으며, 고지 기간이 지난 뒤에도 계속 이용하면 동의한 것으로 봅니다.</p>
    ${h4('제4조 (회원가입)')}
    <p style="margin:0">가입은 이 약관과 개인정보 수집·이용에 동의하고 정해진 정보를 입력하면 성립합니다.
    만 14세 미만은 가입할 수 없고, 타인 정보 도용·허위 가입 시 이용이 제한될 수 있습니다.</p>
    ${h4('제5조 (서비스의 내용과 책임 한계)')}
    <p style="margin:0">① 접종 일정·질환 위험·칼로리 등 건강 정보는 수의학 참고 자료 기반의 일반적 안내이며
    수의사의 진단·처방을 대신하지 않습니다. 이상 증상은 반드시 동물병원에서 진료받으세요.
    ② 파트너 업체 정보는 각 업체가 직접 등록한 것이며 "확인" 표시는 사업자등록 확인을 뜻할 뿐 품질 보증이
    아닙니다. ③ 유기견 입양 정보는 공공데이터를 그대로 보여주며 최신성·정확성은 원 기관 데이터에 따릅니다.</p>
    ${h4('제6조 (회원의 의무)')}
    <p style="margin:0">타인 정보 도용·허위 등록, 욕설·비방·차별·음란물 등 공서양속에 어긋나는 게시물,
    광고·스팸·도배 등 운영 방해, 서비스 취약점 악용·비정상 접근을 해서는 안 됩니다.</p>
    ${h4('제7조 (게시물)')}
    <p style="margin:0">게시물의 저작권은 작성한 회원에게 있습니다. 서비스는 게시물을 운영·홍보 범위 안에서
    보여줄 수 있고, 법령·약관 위반 게시물은 신고 처리 절차에 따라 숨기거나 삭제될 수 있습니다.</p>
    ${h4('제8조 (계약 해지와 이용 제한)')}
    <p style="margin:0">회원은 언제든지 [설정]의 탈퇴 기능으로 해지할 수 있습니다. 약관을 위반한 회원에게는
    경고·이용 정지·강제 탈퇴 등의 조치를 할 수 있습니다.</p>
    ${h4('제9조 (면책)')}
    <p style="margin:0">천재지변·통신 장애 등 통제할 수 없는 사유로 생긴 손해, 회원 간 또는 회원과 파트너 간
    거래·분쟁에 대해 서비스는 고의·중과실이 없는 한 책임지지 않습니다.</p>
    ${h4('제10조 (분쟁 해결)')}
    <p style="margin:0">이 약관은 대한민국 법에 따르며, 분쟁은 민사소송법상 관할 법원에 제기합니다.</p>
    <p style="margin:8px 0 0">부칙: 이 약관은 2026-08-30부터 적용됩니다.</p>
  </div>`;
}

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
          <thead><tr><th>문서</th><th>판</th><th>일시</th><th>동의</th></tr></thead>
          <tbody>${consents.map(c => `<tr>
            <td>${esc({ privacy: '개인정보 수집·이용', age14: '만 14세 이상 확인', terms: '서비스 이용약관',
              partner_terms: '파트너 운영 안내', marketing: '마케팅 수신 (선택)' }[c.doc] || c.doc)}</td>
            <td>${esc(c.version)}</td><td>${fmtDate(c.agreedAt)}</td>
            <td>${c.agreed === false ? '동의 안 함' : '동의'}</td>
          </tr>`).join('')}</tbody>
        </table></div>
      </div>` : ''}
      <div class="card">${policyHTML()}</div>
    </div>`;
  }
};
