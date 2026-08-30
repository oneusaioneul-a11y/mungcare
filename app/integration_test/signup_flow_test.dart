// 실기기/시뮬레이터 E2E — 약관 동의 → 가입 → 본인인증(모의) → 홈 진입까지 실제 UI로 검증
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:mungcare_app/main.dart';
import 'package:mungcare_app/services/auth_service.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('회원가입 전체 플로우', (tester) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
    final auth = LocalAuthService(prefs);
    await tester.pumpWidget(MungCareApp(auth: auth, loggedIn: false));
    await tester.pumpAndSettle();

    // 로그인 화면 → 회원가입
    await tester.tap(find.text('아직 계정이 없어요 — 회원가입'));
    await tester.pumpAndSettle();

    // 약관 동의: 필수만 체크했을 때 진행 가능, 전체 동의 동작 확인
    expect(find.text('약관 동의'), findsOneWidget);
    final continueBtn = find.widgetWithText(FilledButton, '동의하고 계속하기');
    expect(tester.widget<FilledButton>(continueBtn).onPressed, isNull,
        reason: '동의 전에는 비활성');
    await tester.tap(find.text('전체 동의'));
    await tester.pumpAndSettle();
    expect(tester.widget<FilledButton>(continueBtn).onPressed, isNotNull);
    await tester.tap(continueBtn);
    await tester.pumpAndSettle();

    // 계정 정보 입력
    await tester.enterText(find.widgetWithText(TextFormField, '이메일'), 'demo@mungcare.app');
    await tester.enterText(find.widgetWithText(TextFormField, '비밀번호'), 'mungcare1');
    await tester.enterText(find.widgetWithText(TextFormField, '비밀번호 확인'), 'mungcare1');
    await tester.enterText(find.widgetWithText(TextFormField, '닉네임'), '몽이집사');
    await tester.tap(find.text('가입하기'));
    await tester.pumpAndSettle();

    // 본인인증(모의): 000000 으로 통과
    expect(find.text('휴대폰 본인인증'), findsOneWidget);
    await tester.enterText(find.widgetWithText(TextField, '휴대폰 번호'), '01012345678');
    await tester.tap(find.text('인증번호 받기'));
    await tester.pumpAndSettle();
    await tester.enterText(find.widgetWithText(TextField, '인증번호 6자리'), '000000');
    await tester.tap(find.widgetWithText(FilledButton, '확인'));
    await tester.pumpAndSettle();

    // 홈 진입 + 프로필 시작 카드
    expect(find.textContaining('반가워요, 몽이집사님'), findsOneWidget);
    expect(find.text('우리 아이 소개하기'), findsOneWidget);

    // 저장소 검증: 동의 이력 4건(필수 3 + 선택 1) 전부 동의(전체 동의였으므로)
    final user = await auth.current();
    expect(user, isNotNull);
    expect(user!.consents.length, 4);
    expect(user.consents.every((c) => c.agreed), isTrue);

    // ── 이어서: 아이 프로필 등록 ──
    await tester.tap(find.text('우리 아이 소개하기')); // 홈 카드 → 프로필 화면
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FloatingActionButton, '우리 아이 소개하기'));
    await tester.pumpAndSettle();
    await tester.enterText(find.widgetWithText(TextFormField, '이름'), '몽이');
    await tester.enterText(find.widgetWithText(TextFormField, '몸무게(kg)'), '4.2');
    await tester.tap(find.text('등록하기'));
    await tester.pumpAndSettle();

    // 프로필 화면: 카드 + 첫 체중 기록
    expect(find.text('몽이'), findsWidgets);
    expect(find.textContaining('4.2kg'), findsWidgets);

    // 체중 기록 추가 → 현재 체중 갱신
    await tester.tap(find.text('기록하기'));
    await tester.pumpAndSettle();
    await tester.enterText(find.widgetWithText(TextField, '몸무게(kg)'), '4.5');
    await tester.tap(find.text('저장'));
    await tester.pumpAndSettle();
    expect(find.text('4.5kg'), findsWidgets);

    // 홈으로 돌아오면 요약 카드에 반영
    await tester.pageBack();
    await tester.pumpAndSettle();
    expect(find.textContaining('말티즈'), findsNothing); // 견종 미입력이었음
    expect(find.textContaining('4.5kg'), findsOneWidget);
  });
}
