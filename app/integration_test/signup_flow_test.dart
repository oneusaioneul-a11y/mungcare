// 실기기/시뮬레이터 E2E — 약관 동의 → 가입 → 본인인증(모의) → 홈 진입까지 실제 UI로 검증
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:mungcare_app/main.dart';
import 'package:mungcare_app/services/auth_service.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// 스낵바는 ScaffoldMessenger 큐에 쌓이므로(앞선 기록 알림들이 순서를 기다림)
/// 고정 시간 대신 나타날 때까지 폴링합니다.
Future<void> pumpUntilFound(WidgetTester tester, Finder finder,
    {Duration timeout = const Duration(seconds: 25)}) async {
  final deadline = DateTime.now().add(timeout);
  while (DateTime.now().isBefore(deadline)) {
    await tester.pump(const Duration(milliseconds: 100));
    if (finder.evaluate().isNotEmpty) return;
  }
  fail('시간 안에 나타나지 않았어요: $finder');
}

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

    // ── 밥 기록: 권장 칼로리 표시 + 사료 kcal 자동 계산 ──
    await tester.tap(find.text('밥 기록'));
    await tester.pumpAndSettle();
    expect(find.text('하루 이만큼'), findsOneWidget);
    await tester.tap(find.text('밥 먹었어요'));
    await tester.pumpAndSettle();
    await tester.enterText(find.widgetWithText(TextField, '뭘 먹었나요?'), '오리 사료');
    await tester.enterText(find.widgetWithText(TextField, '급여량(g)'), '50');
    await tester.tap(find.widgetWithText(FilledButton, '기록하기'));
    await tester.pumpAndSettle();
    // 50g × 3600kcal/kg = 180 — 기록 줄 + '오늘 먹은 양' 통계 양쪽에 반영
    expect(find.textContaining('180kcal'), findsWidgets);

    // ── 산책 기록: 추가 후 주간 합계 반영 ──
    await tester.pageBack();
    await tester.pumpAndSettle();
    await tester.tap(find.text('산책 기록'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('산책 다녀왔어요'));
    await tester.pumpAndSettle();
    await tester.enterText(find.widgetWithText(TextField, '얼마나 걸었나요? (분)'), '35');
    await tester.tap(find.widgetWithText(FilledButton, '기록하기'));
    await tester.pumpAndSettle();
    expect(find.text('35분'), findsWidgets);
    expect(find.text('요 일주일'), findsOneWidget);

    // ── 접종 · 구충: 생일 미입력 안내 → 접종 기록 → 연간 일정 전환 ──
    await tester.pageBack();
    await tester.pumpAndSettle();
    await tester.tap(find.text('접종 · 구충'));
    await tester.pumpAndSettle();
    expect(find.textContaining('생년월일 등록 필요'), findsWidgets);
    await tester.tap(find.text('오늘 맞았어요').first); // DHPPL
    await tester.pumpAndSettle();
    expect(find.textContaining('연간 추가 접종'), findsWidgets);
    expect(find.text('D-365'), findsOneWidget);
    // 구충 섹션까지 스크롤해서 심장사상충(30일 주기) 기록 → D-30
    await tester.dragUntilVisible(find.text('심장사상충 예방'),
        find.byType(ListView), const Offset(0, -250));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, '오늘 했어요').first);
    await tester.pumpAndSettle();
    expect(find.text('D-30'), findsOneWidget);

    // ── 알러지 등록 → 밥 기록에서 경고가 뜨는지 (화면 간 연동) ──
    await tester.pageBack();
    await tester.pumpAndSettle();
    await tester.tap(find.text('알러지'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(ActionChip, '닭고기'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, '저장'));
    await tester.pumpAndSettle();
    expect(find.text('닭고기'), findsWidgets);
    expect(find.text('중등도'), findsOneWidget);

    await tester.pageBack();
    await tester.pumpAndSettle();
    await tester.tap(find.text('밥 기록'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('밥 먹었어요'));
    await tester.pumpAndSettle();
    await tester.enterText(find.widgetWithText(TextField, '뭘 먹었나요?'), '닭고기 간식');
    await tester.tap(find.widgetWithText(FilledButton, '기록하기'));
    await pumpUntilFound(tester, find.textContaining('알러지 있는 재료'));
    await tester.pumpAndSettle();

    // ── 약 등록 → 재고 경고 ──
    await tester.pageBack();
    await tester.pumpAndSettle();
    await tester.tap(find.text('약 챙기기'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('약 추가'));
    await tester.pumpAndSettle();
    await tester.enterText(find.widgetWithText(TextField, '약 이름이 뭐예요?'), '하트가드');
    await tester.enterText(find.widgetWithText(TextField, '남은 수량'), '3');
    await tester.enterText(find.widgetWithText(TextField, '하루에'), '1');
    await tester.tap(find.widgetWithText(FilledButton, '저장'));
    await tester.pumpAndSettle();
    expect(find.text('3일치 남음'), findsOneWidget, reason: '5일 이하면 경고 칩');
    await tester.tap(find.text('오늘 줬어요?'));
    await tester.pumpAndSettle();
    expect(find.text('✓ 오늘 줬어요'), findsOneWidget);

    // ── 화식 레시피: 위험 재료가 있으면 저장은 하되 경고 대화상자 ──
    await tester.pageBack();
    await tester.pumpAndSettle();
    await tester.tap(find.text('화식 레시피'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('레시피 만들기'));
    await tester.pumpAndSettle();
    await tester.enterText(find.widgetWithText(TextField, '레시피 이름'), '닭가슴살 화식');
    await tester.enterText(
        find.widgetWithText(TextField, '뭐가 들어가나요? (한 줄에 하나씩)'), '닭가슴살 300g\n양파 50g');
    await tester.tap(find.widgetWithText(FilledButton, '저장'));
    await tester.pumpAndSettle();
    expect(find.text('⚠️ 이 재료는 빼주세요!'), findsOneWidget);
    expect(find.textContaining('빈혈'), findsOneWidget);
    await tester.tap(find.widgetWithText(FilledButton, '알겠어요'));
    await tester.pumpAndSettle();
    // 저장은 되어 있고, 카드에 위험 재료 배지가 붙음
    expect(find.text('닭가슴살 화식'), findsOneWidget);
    expect(find.textContaining('⚠️ 양파'), findsOneWidget);
  });
}
