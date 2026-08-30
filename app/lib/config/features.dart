// 기능 플래그 — 아직 실제로 동작하지 않는 기능을 스토어 빌드에서 감춥니다.
//
// 왜 감추나: 눌러도 "준비 중"만 뜨는 UI 는 Apple 심사 가이드라인 2.1(App Completeness)
// 반려 사유입니다. 구현이 끝나면 여기 값만 true 로 바꾸면 화면이 다시 나타납니다.
class Features {
  /// 카카오·구글·애플 로그인 — Supabase Auth 프로바이더 설정 + 각 플랫폼 키 발급 후 true
  /// (Apple 로그인은 다른 소셜 로그인을 제공하는 앱의 App Store 필수 요건입니다)
  static const socialLogin = false;

  /// 휴대폰 본인인증 — 본인확인기관(NICE·KCB 등) 계약 후 true
  static const phoneVerify = false;
}
