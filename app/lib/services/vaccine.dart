// 예방접종·구충 스케줄 엔진 — 웹 health.js vaccinePlan/preventivePlan 이식.
// 규칙(성견 무기록 → needsHistory 등)을 바꿀 때는 웹과 함께 고치고 테스트로 동치 확인.
import 'dart:convert';

import 'package:flutter/services.dart' show rootBundle;

import '../models/dog.dart';
import 'breeds.dart' show ageYears;

/* ── 날짜 (yyyy-MM-dd 문자열, 현지 시간 기준 — 웹과 동일 규칙) ── */
String isoDate(DateTime d) =>
    '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';
String todayStr() => isoDate(DateTime.now());
DateTime parseDate(String s) => DateTime.parse('${s}T00:00:00');
String addDaysStr(String s, int n) => isoDate(parseDate(s).add(Duration(days: n)));
int daysBetweenStr(String a, String b) =>
    parseDate(b).difference(parseDate(a)).inDays;

/* ── 기준 데이터 (assets/data/vaccines.json — 웹과 동일 파일) ── */
class CoreVaccine {
  final String code, name, protects;
  final List<int> puppyWeeks;
  final int booster;
  final bool required;
  const CoreVaccine(this.code, this.name, this.protects, this.puppyWeeks, this.booster, this.required);
}

class Preventive {
  final String code, name, note;
  final int cycle;
  const Preventive(this.code, this.name, this.note, this.cycle);
}

class VaxData {
  static List<CoreVaccine>? _core;
  static List<Preventive>? _preventives;
  static String note = '';

  static Future<void> load() async {
    if (_core != null) return;
    final raw = jsonDecode(await rootBundle.loadString('assets/data/vaccines.json'));
    note = raw['note'] as String? ?? '';
    _core = [
      for (final v in (raw['core'] as List).cast<Map>())
        CoreVaccine(v['code'] as String, v['name'] as String, v['protects'] as String? ?? '',
            (v['puppy'] as List).cast<int>(), v['booster'] as int? ?? 365, v['required'] as bool? ?? false)
    ];
    _preventives = [
      for (final p in (raw['preventives'] as List).cast<Map>())
        Preventive(p['code'] as String, p['name'] as String, p['note'] as String? ?? '',
            p['cycle'] as int? ?? 30)
    ];
  }

  static List<CoreVaccine> get core => _core ?? const [];
  static List<Preventive> get preventives => _preventives ?? const [];

  /// 테스트용 주입
  static void inject(List<CoreVaccine> core, List<Preventive> prev) {
    _core = core;
    _preventives = prev;
  }
}

/* ── 스케줄 계산 ── */
class VaccineStatus {
  final String code, name, protects, stage;
  final bool required, needsHistory, overdue;
  final int count, total;
  final String? last, due;
  final int? dday;
  const VaccineStatus({
    required this.code, required this.name, required this.protects, required this.stage,
    required this.required, required this.needsHistory, required this.overdue,
    required this.count, required this.total, this.last, this.due, this.dday,
  });
}

List<VaccineStatus> vaccinePlan(Dog? dog, List<Map<String, dynamic>> records) {
  final out = <VaccineStatus>[];
  final birth = dog?.birth;
  final birthStr = birth == null ? null : isoDate(birth);
  final ageY = ageYears(birth);
  for (final v in VaxData.core) {
    final done = records.where((r) => r['code'] == v.code).toList()
      ..sort((a, b) => (a['date'] as String).compareTo(b['date'] as String));
    final last = done.isEmpty ? null : done.last['date'] as String;
    String? due;
    var stage = '';
    var needsHistory = false;
    if (ageY != null && ageY < 1 && done.length < v.puppyWeeks.length) {
      final wk = v.puppyWeeks[done.length];
      due = addDaysStr(birthStr!, wk * 7);
      stage = '기초 ${done.length + 1}차 (생후 $wk주)';
    } else if (last != null) {
      due = addDaysStr(last, v.booster);
      stage = '연간 추가 접종';
    } else if (birth == null) {
      stage = '생년월일 등록 필요';
    } else {
      // 성견 무기록: 퍼피 스케줄로 계산하면 수년 지난 경고만 쌓이므로 이력 등록을 권합니다
      stage = '과거 접종 이력 등록 필요';
      needsHistory = true;
    }
    out.add(VaccineStatus(
      code: v.code, name: v.name, protects: v.protects, required: v.required,
      count: done.length, total: v.puppyWeeks.length, last: last, due: due, stage: stage,
      needsHistory: needsHistory,
      overdue: due != null && daysBetweenStr(due, todayStr()) > 0,
      dday: due == null ? null : daysBetweenStr(todayStr(), due),
    ));
  }
  return out;
}

class PreventiveStatus {
  final String code, name, note;
  final int cycle;
  final String? last, due;
  final int? dday;
  final bool overdue;
  const PreventiveStatus({
    required this.code, required this.name, required this.note, required this.cycle,
    this.last, this.due, this.dday, required this.overdue,
  });
}

List<PreventiveStatus> preventivePlan(List<Map<String, dynamic>> records) {
  return [
    for (final p in VaxData.preventives)
      () {
        final done = records.where((r) => r['code'] == p.code).toList()
          ..sort((a, b) => (a['date'] as String).compareTo(b['date'] as String));
        final last = done.isEmpty ? null : done.last['date'] as String;
        final due = last == null ? null : addDaysStr(last, p.cycle);
        return PreventiveStatus(
          code: p.code, name: p.name, note: p.note, cycle: p.cycle, last: last, due: due,
          dday: due == null ? null : daysBetweenStr(todayStr(), due),
          overdue: due != null ? daysBetweenStr(due, todayStr()) > 0 : last == null,
        );
      }()
  ];
}
