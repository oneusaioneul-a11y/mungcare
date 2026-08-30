// 반려견·기록 저장소 — 사용자별 SharedPreferences JSON.
// 웹 store.js 의 state.data[userId] 구조를 따르고, cloud 전환 시 같은 인터페이스로 교체합니다.
import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../models/dog.dart';

class DogStore {
  final SharedPreferences prefs;
  final String userId;
  DogStore(this.prefs, this.userId);

  String get _key => 'mungcare.data.$userId';

  Map<String, dynamic> _load() =>
      (jsonDecode(prefs.getString(_key) ?? '{}') as Map).cast<String, dynamic>();

  Future<void> _save(Map<String, dynamic> data) => prefs.setString(_key, jsonEncode(data));

  static String newId() =>
      '${DateTime.now().microsecondsSinceEpoch.toRadixString(16)}-${identityHashCode(Object()).toRadixString(16)}';

  /* ── 반려견 ── */
  List<Dog> dogs() => ((_load()['dogs'] as List?) ?? const [])
      .map((d) => Dog.fromJson((d as Map).cast<String, dynamic>()))
      .toList();

  Dog? active() {
    final list = dogs();
    if (list.isEmpty) return null;
    final id = _load()['activeDogId'] as String?;
    return list.firstWhere((d) => d.id == id, orElse: () => list.first);
  }

  Future<void> setActive(String dogId) async {
    final data = _load();
    data['activeDogId'] = dogId;
    await _save(data);
  }

  Future<Dog> addDog(Dog dog) async {
    final data = _load();
    final list = (data['dogs'] as List?) ?? [];
    list.add(dog.toJson());
    data['dogs'] = list;
    data['activeDogId'] = dog.id;
    await _save(data);
    // 등록 시 입력한 몸무게는 첫 체중 기록으로도 남깁니다 (웹과 동일)
    if (dog.weight != null) {
      await addWeight(dog.id, WeightRecord(id: newId(), date: DateTime.now(), kg: dog.weight!));
    }
    return dog;
  }

  Future<void> updateDog(Dog dog) async {
    final data = _load();
    data['dogs'] = ((data['dogs'] as List?) ?? [])
        .map((d) => (d as Map)['id'] == dog.id ? dog.toJson() : d)
        .toList();
    await _save(data);
  }

  Future<void> removeDog(String dogId) async {
    final data = _load();
    data['dogs'] = ((data['dogs'] as List?) ?? []).where((d) => (d as Map)['id'] != dogId).toList();
    (data['weights'] as Map?)?.remove(dogId);
    (data['records'] as Map?)?.remove(dogId);
    if (data['activeDogId'] == dogId) data.remove('activeDogId');
    await _save(data);
  }

  /* ── 일반 기록 (meals·walks·meds… — 웹 col() 과 같은 자유 필드 구조) ── */
  List<Map<String, dynamic>> records(String dogId, String type) {
    final list = (((_load()['records'] as Map?)?[dogId] as Map?)?[type] as List?) ?? const [];
    final rs = list.map((r) => (r as Map).cast<String, dynamic>()).toList();
    rs.sort((a, b) => (b['date'] as String? ?? '').compareTo(a['date'] as String? ?? ''));
    return rs;
  }

  Future<Map<String, dynamic>> addRecord(String dogId, String type, Map<String, dynamic> rec) async {
    rec = {'id': newId(), ...rec};
    final data = _load();
    final byDog = ((data['records'] as Map?) ?? {}).cast<String, dynamic>();
    final byType = ((byDog[dogId] as Map?) ?? {}).cast<String, dynamic>();
    byType[type] = [...((byType[type] as List?) ?? []), rec];
    byDog[dogId] = byType;
    data['records'] = byDog;
    await _save(data);
    return rec;
  }

  Future<void> removeRecord(String dogId, String type, String recId) async {
    final data = _load();
    final byDog = ((data['records'] as Map?) ?? {}).cast<String, dynamic>();
    final byType = ((byDog[dogId] as Map?) ?? {}).cast<String, dynamic>();
    byType[type] = ((byType[type] as List?) ?? []).where((r) => (r as Map)['id'] != recId).toList();
    byDog[dogId] = byType;
    data['records'] = byDog;
    await _save(data);
  }

  /* ── 체중 기록 ── */
  List<WeightRecord> weights(String dogId) {
    final list = ((_load()['weights'] as Map?)?[dogId] as List?) ?? const [];
    final rs = list.map((w) => WeightRecord.fromJson((w as Map).cast<String, dynamic>())).toList();
    rs.sort((a, b) => b.date.compareTo(a.date)); // 최신순
    return rs;
  }

  Future<void> addWeight(String dogId, WeightRecord rec) async {
    final data = _load();
    final all = ((data['weights'] as Map?) ?? {}).cast<String, dynamic>();
    final list = ((all[dogId] as List?) ?? []).toList();
    list.add(rec.toJson());
    all[dogId] = list;
    data['weights'] = all;
    await _save(data);
    await _syncDogWeight(dogId);
  }

  Future<void> removeWeight(String dogId, String recId) async {
    final data = _load();
    final all = ((data['weights'] as Map?) ?? {}).cast<String, dynamic>();
    all[dogId] = ((all[dogId] as List?) ?? []).where((w) => (w as Map)['id'] != recId).toList();
    data['weights'] = all;
    await _save(data);
    await _syncDogWeight(dogId);
  }

  /// 프로필의 현재 체중을 남은 기록 중 최신값으로 맞춥니다 (삭제 시에도 — 웹 QC에서 잡았던 규칙)
  Future<void> _syncDogWeight(String dogId) async {
    final rs = weights(dogId);
    final list = dogs();
    final dog = list.where((d) => d.id == dogId).firstOrNull;
    if (dog == null) return;
    dog.weight = rs.isEmpty ? null : rs.first.kg;
    await updateDog(dog);
  }
}
