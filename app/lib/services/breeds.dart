// 견종 기준 데이터 — assets/data/breeds.json (웹 data/breeds.json 과 동일 파일)
import 'dart:convert';

import 'package:flutter/services.dart' show rootBundle;

class Breeds {
  static List<String>? _names;
  static Map<String, String> _sizes = {};

  static Future<List<String>> names() async {
    if (_names != null) return _names!;
    final raw = jsonDecode(await rootBundle.loadString('assets/data/breeds.json'));
    final list = ((raw['breeds'] as List?) ?? const []).cast<Map>();
    _names = list.map((b) => b['name'] as String).toList();
    _sizes = {for (final b in list) b['name'] as String: (b['size'] as String? ?? 'small')};
    return _names!;
  }

  /// 견종의 크기 분류 (toy/small/medium/large) — 목록에 없으면 null
  static String? sizeOf(String? breed) => breed == null ? null : _sizes[breed];
}

/// 나이 계산 (웹 health.js ageYears/ageLabel 이식)
double? ageYears(DateTime? birth) {
  if (birth == null) return null;
  return DateTime.now().difference(birth).inDays / 365.25;
}

String ageLabel(DateTime? birth) {
  final y = ageYears(birth);
  if (y == null) return '생일 미입력';
  final months = (y * 12).floor();
  if (months < 12) return '$months개월';
  return '${months ~/ 12}살 ${months % 12}개월';
}
