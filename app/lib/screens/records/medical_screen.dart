// 진료 기록 — 병원 방문 기록 (웹 medical.js 이식)
import 'package:flutter/material.dart';

import '../../models/dog.dart';
import '../../services/dog_store.dart';
import '../../services/vaccine.dart' show todayStr, isoDate;
import '../../theme.dart';

const medicalKinds = ['정기검진', '진료', '검사', '수술', '입원', '응급', '치과', '재활', '기타'];

class MedicalScreen extends StatefulWidget {
  const MedicalScreen({super.key, required this.store, required this.dog});
  final DogStore store;
  final Dog dog;

  @override
  State<MedicalScreen> createState() => _MedicalScreenState();
}

class _MedicalScreenState extends State<MedicalScreen> {
  Dog get dog => widget.dog;

  Future<void> _openForm([Map<String, dynamic>? r]) async {
    final title = TextEditingController(text: r?['title'] as String? ?? '');
    final hospital = TextEditingController(text: r?['hospital'] as String? ?? '');
    final vet = TextEditingController(text: r?['vet'] as String? ?? '');
    final diagnosis = TextEditingController(text: r?['diagnosis'] as String? ?? '');
    final rx = TextEditingController(text: r?['rx'] as String? ?? '');
    final cost = TextEditingController(text: (r?['cost'] as num?)?.toString() ?? '');
    final note = TextEditingController(text: r?['note'] as String? ?? '');
    var kind = r?['kind'] as String? ?? '진료';
    var date = r?['date'] as String? ?? todayStr();
    String? next = r?['next'] as String?;

    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setD) {
          Future<void> pick(bool isNext) async {
            final now = DateTime.now();
            final picked = await showDatePicker(
              context: ctx,
              initialDate: now,
              firstDate: DateTime(now.year - 20),
              lastDate: DateTime(now.year + 5),
              helpText: isNext ? '다시 오라고 한 날' : '언제 갔나요?',
            );
            if (picked != null) {
              setD(() => isNext ? next = isoDate(picked) : date = isoDate(picked));
            }
          }

          return AlertDialog(
            title: Text(r == null ? '병원 다녀왔어요' : '기록 고치기',
                style: const TextStyle(fontSize: 17)),
            content: SingleChildScrollView(
              child: Column(mainAxisSize: MainAxisSize.min, children: [
                Row(children: [
                  Expanded(
                    child: OutlinedButton(
                        onPressed: () => pick(false), child: Text('방문 $date')),
                  ),
                ]),
                const SizedBox(height: 10),
                DropdownButtonFormField<String>(
                  initialValue: kind,
                  isExpanded: true,
                  decoration: const InputDecoration(labelText: '무슨 일로요?'),
                  items: [
                    for (final k in medicalKinds) DropdownMenuItem(value: k, child: Text(k))
                  ],
                  onChanged: (v) => setD(() => kind = v!),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: title,
                  autofocus: true,
                  decoration: const InputDecoration(
                      labelText: '한 줄로 적으면', hintText: '예: 자꾸 토해서 갔어요'),
                ),
                const SizedBox(height: 10),
                Row(children: [
                  Expanded(
                    child: TextField(
                      controller: hospital,
                      decoration: const InputDecoration(labelText: '어느 병원이요?'),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: TextField(
                      controller: vet,
                      decoration: const InputDecoration(labelText: '선생님 성함'),
                    ),
                  ),
                ]),
                const SizedBox(height: 10),
                TextField(
                  controller: diagnosis,
                  decoration: const InputDecoration(
                      labelText: '뭐라고 하셨나요?', hintText: '예: 급성 위장염'),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: rx,
                  maxLines: 2,
                  decoration: const InputDecoration(
                      labelText: '어떤 처방 받았나요?', hintText: '예: 항구토제 3일분'),
                ),
                const SizedBox(height: 10),
                Row(children: [
                  Expanded(
                    child: OutlinedButton(
                        onPressed: () => pick(true),
                        child: Text(next == null ? '다시 오라고 한 날' : '재방문 $next',
                            style: const TextStyle(fontSize: 12.5))),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: TextField(
                      controller: cost,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: '얼마 나왔나요?'),
                    ),
                  ),
                ]),
                const SizedBox(height: 10),
                TextField(
                  controller: note,
                  maxLines: 3,
                  decoration: const InputDecoration(
                      labelText: '기억해둘 것', hintText: '집에서 지켜볼 것 등'),
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
          );
        },
      ),
    );
    if (ok != true) return;

    final data = {
      'date': date,
      'kind': kind,
      'title': title.text.trim(),
      'hospital': hospital.text.trim(),
      'vet': vet.text.trim(),
      'diagnosis': diagnosis.text.trim(),
      'rx': rx.text.trim(),
      'next': next,
      'cost': int.tryParse(cost.text.trim()),
      'note': note.text.trim(),
    };
    if (r == null) {
      await widget.store.addRecord(dog.id, 'medical', data);
    } else {
      await widget.store.updateRecord(dog.id, 'medical', {...data, 'id': r['id']});
    }
    if (mounted) setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final records = widget.store.records(dog.id, 'medical');
    final totalCost = records.fold<int>(0, (s, r) => s + ((r['cost'] as num?)?.toInt() ?? 0));

    return Scaffold(
      appBar: AppBar(title: Text('진료 기록 — ${dog.name}')),
      floatingActionButton: FloatingActionButton.extended(
          onPressed: () => _openForm(),
          icon: const Icon(Icons.add),
          label: const Text('병원 다녀왔어요')),
      body: records.isEmpty
          ? const Center(
              child: Padding(
                padding: EdgeInsets.all(28),
                child: Text('🏥\n병원 다녀온 이야기를 여기 모아둬요.\n검사 수치랑 처방을 적어두면 다음 진료 때 도움돼요.',
                    textAlign: TextAlign.center, style: TextStyle(fontSize: 14, height: 1.8)),
              ),
            )
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(14),
                    child: Row(children: [
                      Expanded(
                        child: Column(children: [
                          Text('${records.length}',
                              style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800)),
                          Text('전체 기록',
                              style: TextStyle(fontSize: 11, color: Theme.of(context).hintColor)),
                        ]),
                      ),
                      Expanded(
                        child: Column(children: [
                          Text(totalCost == 0 ? '—' : '${_won(totalCost)}원',
                              style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800)),
                          Text('누적 진료비',
                              style: TextStyle(fontSize: 11, color: Theme.of(context).hintColor)),
                        ]),
                      ),
                    ]),
                  ),
                ),
                const SizedBox(height: 4),
                for (final r in records) _card(r),
                const SizedBox(height: 70),
              ],
            ),
    );
  }

  String _won(int n) => n.toString().replaceAllMapped(
      RegExp(r'(\d)(?=(\d{3})+$)'), (m) => '${m[1]},');

  Widget _card(Map<String, dynamic> r) {
    final lines = [
      if ((r['diagnosis'] as String? ?? '').isNotEmpty) '진단: ${r['diagnosis']}',
      if ((r['rx'] as String? ?? '').isNotEmpty) '처방: ${r['rx']}',
      if ((r['note'] as String? ?? '').isNotEmpty) '${r['note']}',
    ].join('\n');

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Expanded(
              child: Text(
                  (r['title'] as String? ?? '').isEmpty ? '${r['kind']}' : '${r['title']}',
                  style: const TextStyle(fontSize: 14.5, fontWeight: FontWeight.w700)),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.surfaceContainerHighest,
                  borderRadius: BorderRadius.circular(20)),
              child: Text('${r['kind']}',
                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700)),
            ),
          ]),
          const SizedBox(height: 4),
          Text(
            [
              r['date'],
              if ((r['hospital'] as String? ?? '').isNotEmpty) r['hospital'],
              if ((r['vet'] as String? ?? '').isNotEmpty) '${r['vet']} 선생님',
              if (r['cost'] != null) '${_won((r['cost'] as num).toInt())}원',
            ].join(' · '),
            style: TextStyle(fontSize: 12, color: Theme.of(context).hintColor),
          ),
          if (lines.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 6),
              child: Text(lines, style: const TextStyle(fontSize: 12.5, height: 1.5)),
            ),
          if (r['next'] != null)
            Padding(
              padding: const EdgeInsets.only(top: 6),
              child: Text('📅 재방문 ${r['next']}',
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
            ),
          Row(mainAxisAlignment: MainAxisAlignment.end, children: [
            TextButton(
                onPressed: () => _openForm(r),
                child: const Text('수정', style: TextStyle(fontSize: 12.5))),
            TextButton(
              onPressed: () async {
                await widget.store.removeRecord(dog.id, 'medical', r['id'] as String);
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
