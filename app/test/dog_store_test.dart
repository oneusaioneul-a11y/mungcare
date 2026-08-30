// 반려견·체중 저장소 회귀 테스트 — 웹 store.js 의 규칙과 동일해야 합니다
import 'package:flutter_test/flutter_test.dart';
import 'package:mungcare_app/models/dog.dart';
import 'package:mungcare_app/services/dog_store.dart';
import 'package:shared_preferences/shared_preferences.dart';

Future<DogStore> fresh() async {
  SharedPreferences.setMockInitialValues({});
  return DogStore(await SharedPreferences.getInstance(), 'u1');
}

Dog mongE() => Dog(id: DogStore.newId(), name: '몽이', breed: '말티즈',
    birth: DateTime(2019, 3, 15), weight: 4.2);

void main() {
  test('등록 시 몸무게가 첫 체중 기록으로 남음', () async {
    final s = await fresh();
    final d = await s.addDog(mongE());
    expect(s.dogs().length, 1);
    expect(s.active()?.id, d.id);
    expect(s.weights(d.id).length, 1);
    expect(s.weights(d.id).first.kg, 4.2);
  });

  test('체중 추가 → 프로필 현재 체중 갱신 (최신값)', () async {
    final s = await fresh();
    final d = await s.addDog(mongE());
    await s.addWeight(d.id, WeightRecord(id: DogStore.newId(), date: DateTime.now(), kg: 4.5));
    expect(s.active()?.weight, 4.5);
  });

  test('체중 삭제 시 남은 최신 기록으로 갱신 — 기록이 없으면 null (웹 QC 규칙)', () async {
    final s = await fresh();
    final d = await s.addDog(mongE());
    final rec = WeightRecord(id: DogStore.newId(), date: DateTime.now(), kg: 4.5);
    await s.addWeight(d.id, rec);
    await s.removeWeight(d.id, rec.id);
    expect(s.active()?.weight, 4.2);
    await s.removeWeight(d.id, s.weights(d.id).first.id);
    expect(s.active()?.weight, isNull);
  });

  test('다견 전환·삭제', () async {
    final s = await fresh();
    final a = await s.addDog(mongE());
    final b = await s.addDog(Dog(id: DogStore.newId(), name: '초코'));
    expect(s.active()?.id, b.id, reason: '새로 등록한 아이가 활성');
    await s.setActive(a.id);
    expect(s.active()?.name, '몽이');
    await s.removeDog(a.id);
    expect(s.dogs().length, 1);
    expect(s.active()?.name, '초코', reason: '활성견 삭제 시 남은 아이로');
    expect(s.weights(a.id), isEmpty, reason: '체중 기록도 함께 삭제');
  });

  test('사용자별 저장 분리', () async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    final s1 = DogStore(prefs, 'u1');
    final s2 = DogStore(prefs, 'u2');
    await s1.addDog(mongE());
    expect(s2.dogs(), isEmpty);
  });
}
