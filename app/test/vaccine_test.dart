// 접종·구충 엔진 — 웹 tools/test.mjs [접종 스케줄]·[구충 주기]와 동일 기대값 (동치 검증)
import 'package:flutter_test/flutter_test.dart';
import 'package:mungcare_app/models/dog.dart';
import 'package:mungcare_app/services/vaccine.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUpAll(() => VaxData.load());

  Dog adult() => Dog(id: 'd', name: '몽이', birth: DateTime(2019, 3, 15));
  VaccineStatus dhppl(Dog? d, List<Map<String, dynamic>> recs) =>
      vaccinePlan(d, recs).firstWhere((p) => p.code == 'DHPPL');

  test('성견+무기록은 기한 초과 대신 이력 등록 안내', () {
    final v = dhppl(adult(), []);
    expect(v.needsHistory, isTrue);
    expect(v.due, isNull);
    expect(v.overdue, isFalse);
  });

  test('퍼피 기초 1차는 생후 6주 · 생후 70일 무접종은 기한 초과', () {
    final birth = DateTime.now().subtract(const Duration(days: 70));
    final v = dhppl(Dog(id: 'p', name: '퍼피', birth: birth), []);
    expect(v.due, addDaysStr(isoDate(birth), 42));
    expect(v.overdue, isTrue);
    expect(v.needsHistory, isFalse);
    expect(v.stage, contains('기초 1차'));
  });

  test('성견+일부 기록은 연간 추가 접종으로 (마지막+365일)', () {
    final last = addDaysStr(todayStr(), -100);
    final v = dhppl(adult(), [{'code': 'DHPPL', 'date': last}]);
    expect(v.stage, '연간 추가 접종');
    expect(v.due, addDaysStr(last, 365));
    expect(v.overdue, isFalse);
  });

  test('기초 5차 완료 인식 + 마지막+365일이 다음 예정', () {
    final birth = isoDate(adult().birth!);
    final recs = [
      for (final w in [6, 8, 10, 12, 14])
        {'code': 'DHPPL', 'date': addDaysStr(birth, w * 7), 'label': '종합백신'}
    ];
    final v = dhppl(adult(), recs);
    expect(v.count, 5);
    expect(v.stage, '연간 추가 접종');
    expect(v.due, addDaysStr(addDaysStr(birth, 98), 365));
  });

  test('생일 미입력은 등록 안내', () {
    final v = dhppl(Dog(id: 'x', name: 'x'), []);
    expect(v.stage, '생년월일 등록 필요');
    expect(v.needsHistory, isFalse);
  });

  test('구충: 30일 주기 → D-20, 미기록 항목은 overdue', () {
    final recs = [{'code': 'HEARTWORM', 'date': addDaysStr(todayStr(), -10)}];
    final prev = preventivePlan(recs);
    final hw = prev.firstWhere((p) => p.code == 'HEARTWORM');
    expect(hw.dday, 20);
    expect(hw.overdue, isFalse);
    expect(prev.firstWhere((p) => p.code == 'DEWORM_IN').overdue, isTrue);
  });
}
