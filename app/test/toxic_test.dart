// 화식 위험 재료 — 웹 tools/test.mjs [화식 위험 재료] 와 동일 기대값
import 'package:flutter_test/flutter_test.dart';
import 'package:mungcare_app/services/toxic.dart';

void main() {
  test('양파 감지', () {
    expect(checkToxic('닭가슴살 300g, 양파 50g').length, 1);
  });
  test('자일리톨 감지', () {
    expect(checkToxic('자일리톨 껌').length, 1);
  });
  test('안전 재료 통과', () {
    expect(checkToxic('닭가슴살 / 단호박 / 브로콜리'), isEmpty);
  });
  test('같은 그룹의 다른 키워드도 같은 항목으로 (마늘 = 양파 그룹)', () {
    final hits = checkToxic('마늘 다진 것');
    expect(hits.length, 1);
    expect(hits.single.keywords.first, '양파');
  });
  test('여러 그룹이 걸리면 각각 보고', () {
    final hits = checkToxic('초콜릿과 포도, 그리고 소금');
    expect(hits.length, 3);
    expect(hits.map((h) => h.keywords.first), containsAll(['초콜릿', '포도', '소금']));
  });
  test('빈 값·null 은 안전', () {
    expect(checkToxic(''), isEmpty);
    expect(checkToxic(null), isEmpty);
  });
  test('모든 항목에 이유 문구가 있음', () {
    expect(toxicItems.every((t) => t.why.isNotEmpty && t.keywords.isNotEmpty), isTrue);
  });
}
