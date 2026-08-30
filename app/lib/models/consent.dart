// 동의 문서와 동의 이력 — 어떤 문서 몇 판에 언제 동의(또는 거부)했는지 보관.
// DB(members.consents)의 doc 값과 1:1 로 맞춥니다.
import '../content/legal.dart';

enum ConsentDoc {
  age14('age14', '(필수) 만 14세 이상이에요', required: true, body: null),
  terms('terms', '(필수) 서비스 이용약관에 동의해요', required: true, body: termsOfService),
  privacy('privacy', '(필수) 개인정보 수집·이용에 동의해요', required: true, body: privacyPolicy),
  marketing('marketing', '(선택) 소식·혜택 알림을 받아볼래요', required: false, body: marketingConsent);

  const ConsentDoc(this.key, this.label, {required this.required, required this.body});

  final String key;      // 저장용 식별자 (DB doc 컬럼)
  final String label;    // 체크박스 문구
  final bool required;   // 필수 여부 (거부 시 가입 불가)
  final String? body;    // [보기]로 띄울 전문 (null 이면 보기 버튼 없음)
}

class ConsentRecord {
  final String doc;
  final String version;
  final DateTime agreedAt;
  final bool agreed; // 선택 동의는 "동의 안 함"도 이력으로 남깁니다

  const ConsentRecord({
    required this.doc,
    required this.version,
    required this.agreedAt,
    this.agreed = true,
  });

  Map<String, dynamic> toJson() => {
        'doc': doc,
        'version': version,
        'agreedAt': agreedAt.toIso8601String(),
        'agreed': agreed,
      };

  factory ConsentRecord.fromJson(Map<String, dynamic> j) => ConsentRecord(
        doc: j['doc'] as String,
        version: j['version'] as String,
        agreedAt: DateTime.parse(j['agreedAt'] as String),
        agreed: j['agreed'] as bool? ?? true,
      );
}
