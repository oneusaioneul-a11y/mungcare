// 소셜 로그인 — 카카오·구글·애플. Supabase Auth 의 소셜 프로바이더로 연동합니다.
//
// ⚠️ 아직 스텁입니다. 실제 연동에 필요한 것 (전부 계정·키 발급이 필요해 보류):
//   1. Supabase 프로젝트 생성 (supabase/SETUP.md) 후 Auth → Providers 에서
//      Kakao / Google / Apple 활성화
//   2. Kakao: developers.kakao.com 앱 생성 → REST API 키·Client Secret
//   3. Google: Cloud Console OAuth 클라이언트 (iOS/Android 각각)
//   4. Apple: App Store 배포 시 "Sign in with Apple" 필수 (다른 소셜 로그인을
//      제공하는 앱은 Apple 로그인을 반드시 함께 제공해야 심사 통과)
//   5. supabase_flutter 패키지 추가 후 이 파일의 signIn 을
//      Supabase.instance.client.auth.signInWithOAuth(...) 로 교체
enum SocialProvider {
  kakao('카카오로 계속하기'),
  google('Google로 계속하기'),
  apple('Apple로 계속하기');

  const SocialProvider(this.label);
  final String label;
}

class SocialAuth {
  /// 프로바이더 키가 설정되기 전까지는 안내만 합니다.
  static bool get ready => false;

  static Future<void> signIn(SocialProvider provider) async {
    throw UnsupportedError(
        '${provider.label.replaceAll('로 계속하기', '')} 로그인은 준비 중이에요. 이메일로 가입해주세요!');
  }
}
