// 견종 기준 데이터 — assets/data/breeds.json (웹 data/breeds.json 과 동일 파일)
import 'dart:convert';

import 'package:flutter/services.dart' show rootBundle;

class Breeds {
  static List<String>? _names;

  static Future<List<String>> names() async {
    if (_names != null) return _names!;
    final raw = jsonDecode(await rootBundle.loadString('assets/data/breeds.json'));
    _names = ((raw['breeds'] as List?) ?? const [])
        .map((b) => (b as Map)['name'] as String)
        .toList();
    return _names!;
  }
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
