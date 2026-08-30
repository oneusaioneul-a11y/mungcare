// 밥 기록 — 하루 권장 칼로리(MER)·오늘 섭취·간식 한도 + 기록 목록 (웹 diet.js 이식)
import 'package:flutter/material.dart';

import '../../models/dog.dart';
import '../../services/dog_store.dart';
import '../../services/health.dart';
import '../../theme.dart';

const mealTypes = ['사료', '화식', '간식', '영양제', '기타'];

String today() {
  final n = DateTime.now();
  return '${n.year}-${n.month.toString().padLeft(2, '0')}-${n.day.toString().padLeft(2, '0')}';
}

class DietScreen extends StatefulWidget {
  const DietScreen({super.key, required this.store, required this.dog});
  final DogStore store;
  final Dog dog;

  @override
  State<DietScreen> createState() => _DietScreenState();
}

class _DietScreenState extends State<DietScreen> {
  Dog get dog => widget.dog;

  double? get _mer => dog.weight == null ? null : mer(dog.weight!, dog.activity);

  Future<void> _addMeal() async {
    final name = TextEditingController();
    final grams = TextEditingController();
    final kcal = TextEditingController();
    final note = TextEditingController();
    String type = '사료';

    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setD) => AlertDialog(
          title: const Text('밥 먹었어요', style: TextStyle(fontSize: 17)),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: name,
                  autofocus: true,
                  decoration: const InputDecoration(
                      labelText: '뭘 먹었나요?', hintText: '예: 오리 사료, 소고기 화식'),
                ),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 6,
                  children: [
                    for (final t in mealTypes)
                      ChoiceChip(
                        label: Text(t, style: const TextStyle(fontSize: 12.5)),
                        selected: type == t,
                        onSelected: (_) => setD(() => type = t),
                      ),
                  ],
                ),
                const SizedBox(height: 10),
                Row(children: [
                  Expanded(
                    child: TextField(
                      controller: grams,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: '급여량(g)'),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: TextField(
                      controller: kcal,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                          labelText: 'kcal', hintText: '사료는 자동 계산'),
                    ),
                  ),
                ]),
                const SizedBox(height: 10),
                TextField(
                  controller: note,
                  decoration: const InputDecoration(
                      labelText: '한 줄 메모', hintText: '잘 먹었나요? 응가는 괜찮았나요?'),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('취소')),
            FilledButton(
                style: compactButton,
                onPressed: () => Navigator.pop(ctx, true),
                child: const Text('기록하기')),
          ],
        ),
      ),
    );
    if (ok != true || name.text.trim().isEmpty) return;

    // 등록된 알러지 재료가 이름에 들어 있으면 알려줍니다 (웹과 동일 규칙)
    final mealName = name.text.trim();
    final hits = widget.store
        .records(dog.id, 'allergies')
        .map((a) => a['name'] as String)
        .where((a) => a.isNotEmpty && mealName.contains(a))
        .toList();
    if (hits.isNotEmpty && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text('⚠️ 잠깐! ${hits.join(', ')} — 알러지 있는 재료가 들어있어요'),
        duration: const Duration(milliseconds: 3500),
      ));
    }

    final g = double.tryParse(grams.text.trim());
    var k = double.tryParse(kcal.text.trim());
    // 사료는 kcal 미입력 시 kcal/kg 기준으로 자동 계산 (웹과 동일, 기본 3600)
    if (k == null && g != null && type == '사료') {
      k = (g / 1000 * defaultFoodKcalPerKg).roundToDouble();
    }
    await widget.store.addRecord(dog.id, 'meals', {
      'date': today(),
      'name': mealName,
      'type': type,
      'grams': g,
      'kcal': k ?? 0,
      'note': note.text.trim(),
    });
    if (mounted) setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final meals = widget.store.records(dog.id, 'meals');
    final t = today();
    final kcalToday = meals
        .where((m) => m['date'] == t)
        .fold<double>(0, (s, m) => s + ((m['kcal'] as num?)?.toDouble() ?? 0));
    final m = _mer;
    final gday = m == null ? null : gramsPerDay(m, defaultFoodKcalPerKg);

    return Scaffold(
      appBar: AppBar(title: Text('밥 기록 — ${dog.name}')),
      floatingActionButton: FloatingActionButton.extended(
          onPressed: _addMeal, icon: const Icon(Icons.add), label: const Text('밥 먹었어요')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: m == null
                  ? const Text('프로필에 몸무게를 기록하면 하루 권장 칼로리를 계산해드려요.',
                      style: TextStyle(fontSize: 13))
                  : Row(children: [
                      _stat('하루 이만큼', '${m.round()}', 'kcal'),
                      _stat('오늘 먹은 양', '${kcalToday.round()}', 'kcal',
                          warn: kcalToday > m),
                      _stat('간식은 여기까지', '${(m * 0.1).round()}', 'kcal'),
                    ]),
            ),
          ),
          if (gday != null)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 8),
              child: Text(
                '사료 ${defaultFoodKcalPerKg.round()}kcal/kg 기준 하루 ${gday.round()}g '
                '(${activityLabel(dog.activity)})',
                style: TextStyle(fontSize: 12, color: Theme.of(context).hintColor),
              ),
            ),
          const SizedBox(height: 4),
          if (meals.isEmpty)
            const Card(
                child: Padding(
                    padding: EdgeInsets.all(20),
                    child: Text('🍚 아직 기록이 없어요. 오늘 첫 끼부터 남겨볼까요?',
                        style: TextStyle(fontSize: 13.5))))
          else
            for (final rec in meals)
              Card(
                child: ListTile(
                  dense: true,
                  title: Text('${rec['name']}',
                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                  subtitle: Text(
                      '${rec['date']} · ${rec['type']}'
                      '${rec['grams'] != null ? ' · ${(rec['grams'] as num).round()}g' : ''}'
                      '${(rec['kcal'] as num? ?? 0) > 0 ? ' · ${(rec['kcal'] as num).round()}kcal' : ''}'
                      '${(rec['note'] as String? ?? '').isNotEmpty ? '\n${rec['note']}' : ''}',
                      style: const TextStyle(fontSize: 12)),
                  trailing: IconButton(
                    icon: const Icon(Icons.close, size: 16),
                    onPressed: () async {
                      await widget.store.removeRecord(dog.id, 'meals', rec['id'] as String);
                      setState(() {});
                    },
                  ),
                ),
              ),
        ],
      ),
    );
  }

  Widget _stat(String label, String value, String unit, {bool warn = false}) => Expanded(
        child: Column(children: [
          Text.rich(TextSpan(children: [
            TextSpan(
                text: value,
                style: TextStyle(
                    fontSize: 17, fontWeight: FontWeight.w800,
                    color: warn ? Colors.red.shade400 : null)),
            TextSpan(text: unit, style: const TextStyle(fontSize: 11)),
          ])),
          Text(label, style: TextStyle(fontSize: 11, color: Theme.of(context).hintColor)),
        ]),
      );
}
