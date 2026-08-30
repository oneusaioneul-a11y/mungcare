// 가입 모듈 회귀 테스트 — 검증 규칙·필수 동의·해시·동의 이력
import 'package:flutter_test/flutter_test.dart';
import 'package:mungcare_app/content/legal.dart';
import 'package:mungcare_app/models/consent.dart';
import 'package:mungcare_app/services/auth_service.dart';
import 'package:shared_preferences/shared_preferences.dart';

const fullConsent = {
  ConsentDoc.age14: true,
  ConsentDoc.terms: true,
  ConsentDoc.privacy: true,
  ConsentDoc.marketing: false,
};

Future<LocalAuthService> freshService() async {
  SharedPreferences.setMockInitialValues({});
  return LocalAuthService(await SharedPreferences.getInstance());
}

void main() {
  group('입력 검증', () {
    test('이메일 형식', () {
      expect(AuthValidators.email('abc'), isNotNull);
      expect(AuthValidators.email('a@b.co'), isNull);
    });
    test('비밀번호 — 8자 이상 영문+숫자', () {
      expect(AuthValidators.password('short1'), isNotNull);
      expect(AuthValidators.password('12345678'), isNotNull);
      expect(AuthValidators.password('abcdefgh'), isNotNull);
      expect(AuthValidators.password('abcd1234'), isNull);
    });
    test('닉네임 1~20자', () {
      expect(AuthValidators.nick(''), isNotNull);
      expect(AuthValidators.nick('가' * 21), isNotNull);
      expect(AuthValidators.nick('몽이집사'), isNull);
    });
  });

  group('필수 동의', () {
    test('필수 문서가 빠지면 가입 불가', () async {
      final auth = await freshService();
      for (final missing in [ConsentDoc.age14, ConsentDoc.terms, ConsentDoc.privacy]) {
        final c = Map<ConsentDoc, bool>.of(fullConsent)..[missing] = false;
        expect(
          () => auth.signup(email: 'a@b.co', password: 'abcd1234', nick: 'x', consents: c),
          throwsA(isA<AuthException>()),
          reason: '${missing.key} 미동의는 거부돼야 함',
        );
      }
    });
    test('마케팅(선택)은 거부해도 가입됨 + 거부 이력 기록', () async {
      final auth = await freshService();
      final user = await auth.signup(
          email: 'a@b.co', password: 'abcd1234', nick: '몽이집사', consents: fullConsent);
      final mkt = user.consents.firstWhere((c) => c.doc == 'marketing');
      expect(mkt.agreed, isFalse);
      expect(user.consents.where((c) => c.agreed).map((c) => c.doc),
          containsAll(['age14', 'terms', 'privacy']));
      expect(user.consents.every((c) => c.version == legalVersion), isTrue);
    });
  });

  group('가입 · 로그인', () {
    test('가입 후 세션 유지, 중복 이메일 거부', () async {
      final auth = await freshService();
      await auth.signup(
          email: 'A@Test.com', password: 'abcd1234', nick: 'x', consents: fullConsent);
      expect((await auth.current())?.email, 'a@test.com');
      expect(
        () => auth.signup(
            email: 'a@test.com', password: 'abcd1234', nick: 'y', consents: fullConsent),
        throwsA(isA<AuthException>()),
      );
    });
    test('로그아웃 후 올바른 비밀번호로만 로그인', () async {
      final auth = await freshService();
      await auth.signup(
          email: 'a@b.co', password: 'abcd1234', nick: 'x', consents: fullConsent);
      await auth.logout();
      expect(await auth.current(), isNull);
      expect(() => auth.login(email: 'a@b.co', password: 'wrong123'),
          throwsA(isA<AuthException>()));
      final u = await auth.login(email: 'a@b.co', password: 'abcd1234');
      expect(u.nick, 'x');
    });
    test('평문 비밀번호 미저장', () async {
      SharedPreferences.setMockInitialValues({});
      final prefs = await SharedPreferences.getInstance();
      final auth = LocalAuthService(prefs);
      await auth.signup(
          email: 'a@b.co', password: 'secretpw99', nick: 'x', consents: fullConsent);
      expect(prefs.getString('mungcare.users'), isNot(contains('secretpw99')));
    });
    test('해시는 솔트·반복 적용 (같은 비번, 다른 솔트 → 다른 해시)', () {
      final h1 = LocalAuthService.hashPassword('abcd1234', 'salt-one');
      final h2 = LocalAuthService.hashPassword('abcd1234', 'salt-two');
      expect(h1, isNot(h2));
      expect(LocalAuthService.hashPassword('abcd1234', 'salt-one'), h1);
    });
  });
}
