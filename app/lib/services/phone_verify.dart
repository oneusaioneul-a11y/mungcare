// 휴대폰 본인인증 — 본인확인기관(NICE평가정보·KCB 등) 연동 자리.
//
// ⚠️ 실제 본인인증은 본인확인기관과의 유료 계약 + 사업자 심사가 필요합니다.
// 계약 전까지는 MockPhoneVerifier 가 개발·심사용으로 흐름만 재현합니다
// (인증번호 000000 입력 시 통과 — 화면에 "준비 중" 배너로 명시).
//
// 연동 시 할 일:
//   1. 본인확인기관 계약 → 사이트코드·키 발급
//   2. 기관 SDK/표준창(웹뷰) 연동으로 이 인터페이스 구현체 교체
//   3. 인증 결과(CI/DI)는 privacy 문서 1조에 이미 고지되어 있음 — 저장 정책 확정
abstract class PhoneVerifier {
  /// 실 기관 연동 여부 (false 면 화면에 준비 중 배너 표시)
  bool get live;

  /// 인증번호 발송 요청. 요청 식별자를 돌려줍니다.
  Future<String> request({required String carrier, required String phone});

  /// 인증번호 확인. 성공 시 true.
  Future<bool> confirm({required String requestId, required String code});
}

class MockPhoneVerifier implements PhoneVerifier {
  @override
  bool get live => false;

  @override
  Future<String> request({required String carrier, required String phone}) async {
    final digits = phone.replaceAll(RegExp(r'[^0-9]'), '');
    if (!RegExp(r'^01[016789][0-9]{7,8}$').hasMatch(digits)) {
      throw ArgumentError('휴대폰 번호를 확인해주세요');
    }
    await Future.delayed(const Duration(milliseconds: 400));
    return 'mock-${DateTime.now().millisecondsSinceEpoch}';
  }

  @override
  Future<bool> confirm({required String requestId, required String code}) async {
    await Future.delayed(const Duration(milliseconds: 300));
    return code == '000000';
  }
}

const carriers = ['SKT', 'KT', 'LG U+', '알뜰폰'];
