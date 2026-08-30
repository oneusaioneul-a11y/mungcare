// 약·알러지 규칙 — 재고 소진일 계산, 알러지 재료 매칭 (웹과 동일 규칙)
import 'package:flutter_test/flutter_test.dart';
import 'package:mungcare_app/models/dog.dart';
import 'package:mungcare_app/services/dog_store.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// 화면과 같은 규칙: 재고와 하루 사용량이 둘 다 있을 때만 계산 (내림)
int? daysLeft(num? stock, num? perDay) {
  if (stock == null || perDay == null || perDay <= 0) return null;
  return (stock / perDay).floor();
}

/// 밥 이름에 포함된 알러지 재료 (웹 diet.js 의 includes 규칙)
List<String> allergyHits(List<String> allergies, String mealName) =>
    allergies.where((a) => a.isNotEmpty && mealName.contains(a)).toList();

Future<DogStore> fresh() async {
  SharedPreferences.setMockInitialValues({});
  return DogStore(await SharedPreferences.getInstance(), 'u1');
}

void main() {
  group('약 재고', () {
    test('남은 일수는 내림 계산', () {
      expect(daysLeft(30, 1), 30);
      expect(daysLeft(7, 2), 3, reason: '3.5일 → 3일');
      expect(daysLeft(0.5, 1), 0);
    });
    test('재고나 하루 사용량이 없으면 계산 안 함', () {
      expect(daysLeft(null, 1), isNull);
      expect(daysLeft(30, null), isNull);
      expect(daysLeft(30, 0), isNull, reason: '0으로 나누지 않음');
    });
  });

  group('알러지 매칭', () {
    test('밥 이름에 재료가 들어 있으면 감지', () {
      expect(allergyHits(['닭고기'], '닭고기 사료'), ['닭고기']);
      expect(allergyHits(['닭고기', '유제품'], '닭고기 우유 간식'), ['닭고기']);
      expect(allergyHits(['닭고기'], '오리 사료'), isEmpty);
    });
    test('빈 이름은 무시', () {
      expect(allergyHits([''], '아무 사료'), isEmpty);
    });
  });

  group('기록 수정', () {
    test('updateRecord 는 id 를 유지하며 덮어씀', () async {
      final s = await fresh();
      final d = await s.addDog(Dog(id: DogStore.newId(), name: '몽이'));
      final m = await s.addRecord(d.id, 'meds', {
        'date': '2026-08-30', 'name': '하트가드', 'stock': 6, 'perDay': 1, 'taken': <String>[]
      });
      await s.updateRecord(d.id, 'meds', {...m, 'taken': ['2026-08-30']});
      final after = s.records(d.id, 'meds').single;
      expect(after['id'], m['id']);
      expect(after['name'], '하트가드');
      expect((after['taken'] as List).single, '2026-08-30');
      expect(s.records(d.id, 'meds').length, 1, reason: '중복 생성되지 않음');
    });
  });
}
