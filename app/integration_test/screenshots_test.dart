// 스토어 스크린샷용 화면 이동 — 캡처는 바깥의 tools/make-screenshots.sh 가 합니다.
//
// 각 화면에 도착하면 SHOT:<이름> 을 출력하고 잠깐 멈춥니다. 스크립트가 그 줄을 보고
// `xcrun simctl io screenshot` 으로 기기 해상도 그대로 저장합니다.
// (시뮬레이터 제어 권한 없이도 어느 기기에서든 같은 순서로 재현됩니다)
//
// 실행 전 데모 데이터를 넣어두세요:  python3 tools/seed-demo.py <UDID>
import 'package:flutter/foundation.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:mungcare_app/main.dart';
import 'package:mungcare_app/services/auth_service.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// 화면이 안정된 뒤 바깥 스크립트에 캡처 시점을 알리고 기다립니다.
Future<void> shot(WidgetTester tester, String name) async {
  await tester.pumpAndSettle();
  await tester.pump(const Duration(milliseconds: 400)); // 그림자·잔여 애니메이션 정착
  debugPrint('SHOT:$name');
  // 바깥에서 캡처할 시간을 줍니다. pump 로 프레임을 계속 돌려 화면이 살아있게 유지.
  for (var i = 0; i < 30; i++) {
    await tester.pump(const Duration(milliseconds: 100));
  }
}

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('스토어 스크린샷', (tester) async {
    final prefs = await SharedPreferences.getInstance(); // 데모 데이터를 그대로 사용
    await tester.pumpWidget(MungCareApp(auth: LocalAuthService(prefs), loggedIn: true));
    await tester.pumpAndSettle();

    await shot(tester, '01-home');

    Future<void> openFromHome(String tile, String name) async {
      await tester.tap(find.text(tile));
      await tester.pumpAndSettle();
      await shot(tester, name);
      await tester.pageBack();
      await tester.pumpAndSettle();
    }

    await openFromHome('밥 기록', '02-diet');
    await openFromHome('접종 · 구충', '03-vaccine');
    await openFromHome('약 챙기기', '04-meds');
    await openFromHome('진료 기록', '05-medical');
    await openFromHome('화식 레시피', '06-recipes');
    await openFromHome('몽이', '07-profile'); // 프로필 카드(아이 이름)
  });
}
