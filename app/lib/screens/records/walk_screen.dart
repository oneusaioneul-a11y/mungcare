// 산책 기록 — 주간 합계·목표·한 달 거리 + 기록 목록 (웹 walk.js 이식)
import 'package:flutter/material.dart';

import '../../models/dog.dart';
import '../../services/breeds.dart';
import '../../services/dog_store.dart';
import '../../services/health.dart';
import '../../theme.dart';
import 'diet_screen.dart' show today;

const weathers = ['맑음', '흐림', '비', '눈', '더움', '추움'];
const poops = ['안 눴어요', '보통', '무름', '설사', '딱딱함'];

class WalkScreen extends StatefulWidget {
  const WalkScreen({super.key, required this.store, required this.dog});
  final DogStore store;
  final Dog dog;

  @override
  State<WalkScreen> createState() => _WalkScreenState();
}

class _WalkScreenState extends State<WalkScreen> {
  Dog get dog => widget.dog;

  Future<void> _addWalk() async {
    final minutes = TextEditingController(text: '30');
    final km = TextEditingController();
    final note = TextEditingController();
    String weather = weathers.first;
    String poop = '보통';

    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setD) => AlertDialog(
          title: const Text('산책 다녀왔어요', style: TextStyle(fontSize: 17)),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(children: [
                  Expanded(
                    child: TextField(
                      controller: minutes,
                      autofocus: true,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: '얼마나 걸었나요? (분)'),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: TextField(
                      controller: km,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: const InputDecoration(labelText: '거리(km)'),
                    ),
                  ),
                ]),
                const SizedBox(height: 10),
                DropdownButtonFormField<String>(
                  initialValue: weather,
                  decoration: const InputDecoration(labelText: '날씨'),
                  items: [for (final w in weathers) DropdownMenuItem(value: w, child: Text(w))],
                  onChanged: (v) => setD(() => weather = v!),
                ),
                const SizedBox(height: 10),
                DropdownButtonFormField<String>(
                  initialValue: poop,
                  decoration: const InputDecoration(labelText: '응가는 어땠나요?'),
                  items: [for (final p in poops) DropdownMenuItem(value: p, child: Text(p))],
                  onChanged: (v) => setD(() => poop = v!),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: note,
                  decoration: const InputDecoration(
                      labelText: '한 줄 메모', hintText: '다리 절뚝이진 않았나요?'),
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
    final min = int.tryParse(minutes.text.trim());
    if (ok != true || min == null || min <= 0) return;

    await widget.store.addRecord(dog.id, 'walks', {
      'date': today(),
      'minutes': min,
      'km': double.tryParse(km.text.trim()),
      'weather': weather,
      'poop': poop,
      'note': note.text.trim(),
    });
    if (mounted) setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final walks = widget.store.records(dog.id, 'walks');
    final now = DateTime.now();
    String d(int daysAgo) {
      final x = now.subtract(Duration(days: daysAgo));
      return '${x.year}-${x.month.toString().padLeft(2, '0')}-${x.day.toString().padLeft(2, '0')}';
    }

    final week = {for (var i = 0; i < 7; i++) d(i)};
    final month = {for (var i = 0; i < 30; i++) d(i)};
    final min7 = walks.where((w) => week.contains(w['date']))
        .fold<int>(0, (s, w) => s + ((w['minutes'] as num?)?.toInt() ?? 0));
    final km30 = walks.where((w) => month.contains(w['date']))
        .fold<double>(0, (s, w) => s + ((w['km'] as num?)?.toDouble() ?? 0));
    final goal = walkGoal(Breeds.sizeOf(dog.breed), ageYears(dog.birth));

    return Scaffold(
      appBar: AppBar(title: Text('산책 기록 — ${dog.name}')),
      floatingActionButton: FloatingActionButton.extended(
          onPressed: _addWalk, icon: const Icon(Icons.add), label: const Text('산책 다녀왔어요')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Row(children: [
                _stat('요 일주일', '$min7', '분'),
                _stat('하루 목표', '$goal', '분'),
                _stat('한 달 거리', km30.toStringAsFixed(1), 'km'),
              ]),
            ),
          ),
          const SizedBox(height: 8),
          if (walks.isEmpty)
            const Card(
                child: Padding(
                    padding: EdgeInsets.all(20),
                    child: Text('🐾 아직 산책 기록이 없어요. 오늘 한 바퀴 어때요?',
                        style: TextStyle(fontSize: 13.5))))
          else
            for (final rec in walks)
              Card(
                child: ListTile(
                  dense: true,
                  title: Row(children: [
                    Text('${(rec['minutes'] as num).round()}분',
                        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
                    if ((rec['minutes'] as num) >= goal)
                      const Padding(
                        padding: EdgeInsets.only(left: 6),
                        child: Text('목표 채웠어요 🎉', style: TextStyle(fontSize: 11.5)),
                      ),
                  ]),
                  subtitle: Text(
                      '${rec['date']}'
                      '${rec['km'] != null ? ' · ${(rec['km'] as num).toStringAsFixed(1)}km' : ''}'
                      ' · ${rec['weather'] ?? ''} · 응가 ${rec['poop'] ?? '-'}'
                      '${(rec['note'] as String? ?? '').isNotEmpty ? '\n${rec['note']}' : ''}',
                      style: const TextStyle(fontSize: 12)),
                  trailing: IconButton(
                    icon: const Icon(Icons.close, size: 16),
                    onPressed: () async {
                      await widget.store.removeRecord(dog.id, 'walks', rec['id'] as String);
                      setState(() {});
                    },
                  ),
                ),
              ),
        ],
      ),
    );
  }

  Widget _stat(String label, String value, String unit) => Expanded(
        child: Column(children: [
          Text.rich(TextSpan(children: [
            TextSpan(text: value, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800)),
            TextSpan(text: unit, style: const TextStyle(fontSize: 11)),
          ])),
          Text(label, style: TextStyle(fontSize: 11, color: Theme.of(context).hintColor)),
        ]),
      );
}
