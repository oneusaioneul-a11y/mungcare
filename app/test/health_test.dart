// 칼로리·산책 엔진 — 웹 tools/test.mjs 의 기대값과 동일해야 합니다 (엔진 동치 검증)
import 'package:flutter_test/flutter_test.dart';
import 'package:mungcare_app/models/dog.dart';
import 'package:mungcare_app/services/health.dart';

void main() {
  test('RER ≈ 205 (4.2kg)', () {
    expect(rer(4.2).round(), 205);
  });
  test('MER = RER × 1.6 (중성화 성견)', () {
    expect(mer(4.2, 'neutered'), closeTo(rer(4.2) * 1.6, 0.001));
  });
  test('급여량: 3600kcal/kg 기준 91g', () {
    expect(gramsPerDay(mer(4.2, 'neutered'), 3600)!.round(), 91);
  });
  test('활동량 추천 — 나이·중성화 기준', () {
    Dog d({DateTime? birth, bool neutered = false}) =>
        Dog(id: 'x', name: 'x', birth: birth, neutered: neutered);
    final now = DateTime.now();
    expect(suggestActivity(d()), 'neutered', reason: '생일 미입력');
    expect(suggestActivity(d(birth: now.subtract(const Duration(days: 60)))), 'puppy0');
    expect(suggestActivity(d(birth: now.subtract(const Duration(days: 200)))), 'puppy1');
    expect(suggestActivity(d(birth: DateTime(now.year - 3), neutered: true)), 'neutered');
    expect(suggestActivity(d(birth: DateTime(now.year - 3))), 'intact');
    expect(suggestActivity(d(birth: DateTime(now.year - 9))), 'senior');
  });
  test('산책 목표 — 크기·나이 반영', () {
    expect(walkGoal('toy', 3), 30);
    expect(walkGoal('large', 3), 75);
    expect(walkGoal('toy', 0.5), 18, reason: '1살 미만은 60%');
    expect(walkGoal('medium', 11), 36, reason: '10살 이상은 60%');
    expect(walkGoal(null, 3), 45, reason: '크기 모르면 기본 45분');
  });
}
