// 계산 엔진 — 웹 assets/js/health.js 의 칼로리·산책 부분 이식.
// 수치 규칙을 바꿀 때는 웹과 양쪽을 함께 고치고 테스트로 동치를 확인합니다.
import 'dart:math' as math;

import '../models/dog.dart';
import 'breeds.dart';

/* ── 칼로리 ── */
double rer(double kg) => kg > 0 ? 70 * math.pow(kg, 0.75).toDouble() : 0;

class ActivityLevel {
  final String key;
  final String label;
  final double f;
  const ActivityLevel(this.key, this.label, this.f);
}

/// 웹 H.ACTIVITY 와 동일 — dog.activity 에 key 가 저장됩니다 (cloud 호환)
const activityLevels = [
  ActivityLevel('puppy0', '퍼피 (4개월 미만)', 3.0),
  ActivityLevel('puppy1', '퍼피 (4~12개월)', 2.0),
  ActivityLevel('intact', '성견 · 중성화 안 함', 1.8),
  ActivityLevel('neutered', '성견 · 중성화 함', 1.6),
  ActivityLevel('active', '활동량 많음', 2.0),
  ActivityLevel('diet', '체중 감량 중', 1.0),
  ActivityLevel('gain', '체중 증량 필요', 1.7),
  ActivityLevel('senior', '노령 · 활동 적음', 1.4),
];

String activityLabel(String key) =>
    activityLevels.where((a) => a.key == key).firstOrNull?.label ?? key;

double mer(double kg, String key) {
  final f = activityLevels.where((a) => a.key == key).firstOrNull?.f ?? 1.6;
  return rer(kg) * f;
}

String suggestActivity(Dog? dog) {
  final y = ageYears(dog?.birth);
  if (y == null) return 'neutered';
  if (y < 0.34) return 'puppy0';
  if (y < 1) return 'puppy1';
  if (y >= 8) return 'senior';
  return (dog?.neutered ?? false) ? 'neutered' : 'intact';
}

/// 사료 kcal/kg 기준 하루 급여량(g)
double? gramsPerDay(double kcalPerDay, double? kcalPerKgFood) {
  if (kcalPerKgFood == null || kcalPerKgFood <= 0) return null;
  return (kcalPerDay / kcalPerKgFood) * 1000;
}

/// 급여 칼로리 기본값 — 사료 kcal 미입력 시 웹과 같은 3600kcal/kg 을 씁니다
const defaultFoodKcalPerKg = 3600.0;

/* ── 산책 목표(분/일) ── */
int walkGoal(String? sizeKey, double? ageY) {
  final base = {'toy': 30, 'small': 40, 'medium': 60, 'large': 75}[sizeKey] ?? 45;
  if (ageY == null) return base;
  if (ageY < 1) return (base * 0.6).round();
  if (ageY >= 10) return (base * 0.6).round();
  if (ageY >= 8) return (base * 0.8).round();
  return base;
}
