// 알러지 — 반응하는 것과 대처법을 모아둡니다 (웹 allergy.js 이식).
// 여기 등록해두면 밥 기록에서 해당 재료를 적을 때 경고가 뜹니다.
import 'package:flutter/material.dart';

import '../../models/dog.dart';
import '../../services/dog_store.dart';
import '../../theme.dart';

const allergyTypes = ['식품', '약물', '환경(꽃가루·집먼지)', '벌레·기생충', '접촉(샴푸·소재)', '기타'];
const commonFoods = ['닭고기', '소고기', '유제품', '밀(글루텐)', '계란', '콩', '옥수수', '양고기', '연어', '돼지고기'];

/// 심각도 — 값은 웹과 동일(high/mid/low)
const severities = [
  ('high', '중증 — 아나필락시스·응급 이력'),
  ('mid', '중등도 — 뚜렷한 증상'),
  ('low', '경증 — 가벼운 반응'),
];
String severityLabel(String v) =>
    severities.where((s) => s.$1 == v).map((s) => s.$2).firstOrNull ?? v;

class AllergyScreen extends StatefulWidget {
  const AllergyScreen({super.key, required this.store, required this.dog});
  final DogStore store;
  final Dog dog;

  @override
  State<AllergyScreen> createState() => _AllergyScreenState();
}

class _AllergyScreenState extends State<AllergyScreen> {
  Dog get dog => widget.dog;

  Future<void> _openForm({Map<String, dynamic>? a, String? preset}) async {
    final name = TextEditingController(text: a?['name'] as String? ?? preset ?? '');
    final symptoms = TextEditingController(text: a?['symptoms'] as String? ?? '');
    final action = TextEditingController(text: a?['action'] as String? ?? '');
    var type = a?['type'] as String? ?? (preset != null ? '식품' : allergyTypes.first);
    var severity = a?['severity'] as String? ?? 'mid';
    var diagnosed = (a?['diagnosed'] as String? ?? '') == 'yes';

    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setD) => AlertDialog(
          title: Text(a == null ? '알러지 등록' : '알러지 고치기',
              style: const TextStyle(fontSize: 17)),
          content: SingleChildScrollView(
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              TextField(
                controller: name,
                autofocus: true,
                decoration: const InputDecoration(
                    labelText: '뭐에 반응하나요?', hintText: '예: 닭고기'),
              ),
              const SizedBox(height: 10),
              DropdownButtonFormField<String>(
                initialValue: type,
                isExpanded: true,
                decoration: const InputDecoration(labelText: '어떤 종류예요?'),
                items: [
                  for (final t in allergyTypes)
                    DropdownMenuItem(
                        value: t, child: Text(t, style: const TextStyle(fontSize: 13.5)))
                ],
                onChanged: (v) => setD(() => type = v!),
              ),
              const SizedBox(height: 10),
              DropdownButtonFormField<String>(
                initialValue: severity,
                isExpanded: true,
                decoration: const InputDecoration(labelText: '얼마나 심한가요?'),
                items: [
                  for (final s in severities)
                    DropdownMenuItem(
                        value: s.$1, child: Text(s.$2, style: const TextStyle(fontSize: 13)))
                ],
                onChanged: (v) => setD(() => severity = v!),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: symptoms,
                maxLines: 2,
                decoration: const InputDecoration(
                    labelText: '어떤 증상이 나와요?', hintText: '예: 발이랑 귀를 엄청 긁어요'),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: action,
                maxLines: 2,
                decoration: const InputDecoration(
                    labelText: '그럴 땐 이렇게', hintText: '예: 급여 중단하고 병원에 연락'),
              ),
              CheckboxListTile(
                value: diagnosed,
                onChanged: (v) => setD(() => diagnosed = v == true),
                controlAffinity: ListTileControlAffinity.leading,
                contentPadding: EdgeInsets.zero,
                title: const Text('검사로 확인했어요', style: TextStyle(fontSize: 13.5)),
                subtitle: const Text('체크 안 하면 "의심 중"으로 표시돼요',
                    style: TextStyle(fontSize: 11.5)),
              ),
            ]),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('취소')),
            FilledButton(
                style: compactButton,
                onPressed: () => Navigator.pop(ctx, true),
                child: const Text('저장')),
          ],
        ),
      ),
    );
    if (ok != true || name.text.trim().isEmpty) return;

    final data = {
      'date': a?['date'] as String? ?? DateTime.now().toIso8601String().substring(0, 10),
      'name': name.text.trim(),
      'type': type,
      'severity': severity,
      'symptoms': symptoms.text.trim(),
      'action': action.text.trim(),
      'diagnosed': diagnosed ? 'yes' : '',
    };
    if (a == null) {
      await widget.store.addRecord(dog.id, 'allergies', data);
    } else {
      await widget.store.updateRecord(dog.id, 'allergies', {...data, 'id': a['id']});
    }
    if (mounted) setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final items = widget.store.records(dog.id, 'allergies');
    final registered = items.map((a) => a['name'] as String).toSet();

    return Scaffold(
      appBar: AppBar(title: Text('알러지 — ${dog.name}')),
      floatingActionButton: FloatingActionButton.extended(
          onPressed: () => _openForm(), icon: const Icon(Icons.add), label: const Text('알러지 등록')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (items.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 16),
              child: Text('🤧 아직 등록한 알러지가 없어요.\n한 번 적어두면 밥 기록할 때 저희가 챙겨서 알려드려요.',
                  textAlign: TextAlign.center, style: TextStyle(fontSize: 13.5, height: 1.8)),
            )
          else
            for (final a in items) _card(a),
          const SizedBox(height: 10),
          Text('흔한 식품 알러지 — 눌러서 바로 등록',
              style: TextStyle(fontSize: 12.5, color: Theme.of(context).hintColor)),
          const SizedBox(height: 6),
          Wrap(
            spacing: 6,
            runSpacing: 2,
            children: [
              for (final f in commonFoods)
                ActionChip(
                  label: Text(f, style: const TextStyle(fontSize: 12.5)),
                  onPressed: registered.contains(f) ? null : () => _openForm(preset: f),
                ),
            ],
          ),
          const SizedBox(height: 12),
          Text('알러지는 수의사 진단이 필요한 영역이에요. 여기 기록은 참고용으로만 써주세요.',
              style: TextStyle(fontSize: 11.5, color: Theme.of(context).hintColor)),
          const SizedBox(height: 60),
        ],
      ),
    );
  }

  Widget _card(Map<String, dynamic> a) {
    final sev = a['severity'] as String? ?? 'mid';
    final (bg, fg) = switch (sev) {
      'high' => (Colors.red.shade50, Colors.red.shade400),
      'low' => (Colors.green.shade50, Colors.green.shade700),
      _ => (Colors.amber.shade100, Colors.brown.shade800),
    };
    final label = switch (sev) { 'high' => '중증', 'low' => '경증', _ => '중등도' };

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Expanded(
              child: Text('${a['name']}',
                  style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(20)),
              child: Text(label,
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: fg)),
            ),
          ]),
          const SizedBox(height: 4),
          Text(
            '${a['type']} · ${a['diagnosed'] == 'yes' ? '검사로 확인' : '의심 중'}',
            style: TextStyle(fontSize: 12, color: Theme.of(context).hintColor),
          ),
          if ((a['symptoms'] as String? ?? '').isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 6),
              child: Text('증상: ${a['symptoms']}',
                  style: const TextStyle(fontSize: 12.5, height: 1.5)),
            ),
          if ((a['action'] as String? ?? '').isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 3),
              child: Text('대처: ${a['action']}',
                  style: const TextStyle(fontSize: 12.5, height: 1.5)),
            ),
          Row(mainAxisAlignment: MainAxisAlignment.end, children: [
            TextButton(
                onPressed: () => _openForm(a: a),
                child: const Text('수정', style: TextStyle(fontSize: 12.5))),
            TextButton(
              onPressed: () async {
                await widget.store.removeRecord(dog.id, 'allergies', a['id'] as String);
                setState(() {});
              },
              child: const Text('삭제', style: TextStyle(fontSize: 12.5)),
            ),
          ]),
        ]),
      ),
    );
  }
}
