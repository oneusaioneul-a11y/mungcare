// 접종 · 구충 — 일정 계산 카드 + 기록 (웹 vaccine.js 이식)
import 'package:flutter/material.dart';

import '../../models/dog.dart';
import '../../services/dog_store.dart';
import '../../services/vaccine.dart';
import '../../theme.dart';

class VaccineScreen extends StatefulWidget {
  const VaccineScreen({super.key, required this.store, required this.dog});
  final DogStore store;
  final Dog dog;

  @override
  State<VaccineScreen> createState() => _VaccineScreenState();
}

class _VaccineScreenState extends State<VaccineScreen> {
  Dog get dog => widget.dog;
  bool _ready = VaxData.core.isNotEmpty;

  @override
  void initState() {
    super.initState();
    if (!_ready) {
      VaxData.load().then((_) { if (mounted) setState(() => _ready = true); });
    }
  }

  List<Map<String, dynamic>> get _records => widget.store.records(dog.id, 'vaccines');

  Future<void> _record(String code, String label, {bool pickDate = false}) async {
    var date = todayStr();
    if (pickDate) {
      final picked = await showDatePicker(
        context: context,
        initialDate: DateTime.now(),
        firstDate: DateTime(DateTime.now().year - 20),
        lastDate: DateTime.now(),
        helpText: '$label — 마지막으로 맞은 날짜',
      );
      if (picked == null) return;
      date = isoDate(picked);
    }
    await widget.store.addRecord(dog.id, 'vaccines', {'code': code, 'date': date, 'label': label});
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$label 기록했어요!')));
      setState(() {});
    }
  }

  String _ddayText(int? dday, bool overdue) {
    if (dday == null) return '';
    if (overdue) return '${-dday}일 지남';
    if (dday == 0) return '오늘!';
    return 'D-$dday';
  }

  @override
  Widget build(BuildContext context) {
    if (!_ready) {
      return Scaffold(
          appBar: AppBar(title: Text('접종 · 구충 — ${dog.name}')),
          body: const Center(child: CircularProgressIndicator()));
    }
    final records = _records;
    final plan = vaccinePlan(dog, records);
    final prev = preventivePlan(records);

    return Scaffold(
      appBar: AppBar(title: Text('접종 · 구충 — ${dog.name}')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text('💉 예방접종',
              style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800)),
          const SizedBox(height: 6),
          for (final v in plan) _vaccineCard(v),
          const SizedBox(height: 14),
          const Text('🪱 구충 · 정기 관리',
              style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800)),
          const SizedBox(height: 6),
          for (final p in prev) _preventiveCard(p),
          const SizedBox(height: 14),
          if (records.isNotEmpty) ...[
            const Text('🗂 최근 기록',
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800)),
            const SizedBox(height: 6),
            for (final r in records.take(20))
              Card(
                child: ListTile(
                  dense: true,
                  title: Text('${r['label'] ?? r['code']}',
                      style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600)),
                  subtitle: Text('${r['date']}', style: const TextStyle(fontSize: 12)),
                  trailing: IconButton(
                    icon: const Icon(Icons.close, size: 16),
                    onPressed: () async {
                      await widget.store.removeRecord(dog.id, 'vaccines', r['id'] as String);
                      setState(() {});
                    },
                  ),
                ),
              ),
          ],
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 10),
            child: Text(VaxData.note,
                style: TextStyle(fontSize: 11.5, color: Theme.of(context).hintColor)),
          ),
        ],
      ),
    );
  }

  Widget _chip(String text, {Color? bg, Color? fg}) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
        decoration: BoxDecoration(
            color: bg ?? Theme.of(context).colorScheme.surfaceContainerHighest,
            borderRadius: BorderRadius.circular(20)),
        child: Text(text,
            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: fg)),
      );

  Widget _vaccineCard(VaccineStatus v) {
    final overdueColor = Colors.red.shade400;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(children: [
              Expanded(
                child: Text('${v.name}${v.required ? ' *' : ''}',
                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
              ),
              if (v.needsHistory)
                _chip('이력 등록 필요', bg: Colors.amber.shade100, fg: Colors.brown.shade800)
              else if (v.due != null)
                _chip(_ddayText(v.dday, v.overdue),
                    bg: v.overdue ? Colors.red.shade50 : null,
                    fg: v.overdue ? overdueColor : null),
            ]),
            const SizedBox(height: 4),
            Text(
              '${v.protects}\n${v.stage}'
              '${v.count > 0 ? ' · 기초 ${v.count}/${v.total}회' : ''}'
              '${v.last != null ? ' · 마지막 ${v.last}' : ''}'
              '${v.due != null ? ' · 다음 ${v.due}' : ''}',
              style: TextStyle(fontSize: 12, height: 1.5, color: Theme.of(context).hintColor),
            ),
            const SizedBox(height: 8),
            Row(children: [
              FilledButton.tonal(
                style: compactButton,
                onPressed: () => _record(v.code, v.name),
                child: const Text('오늘 맞았어요'),
              ),
              const SizedBox(width: 8),
              TextButton(
                onPressed: () => _record(v.code, v.name, pickDate: true),
                child: const Text('지난 이력 등록', style: TextStyle(fontSize: 12.5)),
              ),
            ]),
          ],
        ),
      ),
    );
  }

  Widget _preventiveCard(PreventiveStatus p) {
    return Card(
      child: ListTile(
        title: Row(children: [
          Expanded(
              child: Text(p.name,
                  style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700))),
          _chip(
            p.due == null ? '기록 없음' : _ddayText(p.dday, p.overdue),
            bg: p.overdue ? Colors.red.shade50 : null,
            fg: p.overdue ? Colors.red.shade400 : null,
          ),
        ]),
        subtitle: Text(
          '${p.cycle}일 주기 · ${p.note}'
          '${p.last != null ? '\n마지막 ${p.last} · 다음 ${p.due}' : ''}',
          style: const TextStyle(fontSize: 11.5, height: 1.5),
        ),
        trailing: FilledButton.tonal(
          style: compactButton,
          onPressed: () => _record(p.code, p.name),
          child: const Text('오늘 했어요', style: TextStyle(fontSize: 12)),
        ),
      ),
    );
  }
}
