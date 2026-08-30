// 약 챙기기 — 복용 중인 약 목록, 오늘 줬는지 체크, 재고 소진 경고 (웹 meds.js 이식)
import 'package:flutter/material.dart';

import '../../models/dog.dart';
import '../../services/dog_store.dart';
import '../../services/vaccine.dart' show todayStr;
import '../../theme.dart';

const medPurposes = ['심장', '관절', '피부', '소화기', '신장', '항생제', '진통·소염', '영양제', '기타'];
const medFreqs = ['1일 1회', '1일 2회', '1일 3회', '격일', '주 1회', '월 1회', '필요 시'];
const medUnits = ['정', 'ml', '포', 'g', '회'];

class MedsScreen extends StatefulWidget {
  const MedsScreen({super.key, required this.store, required this.dog});
  final DogStore store;
  final Dog dog;

  @override
  State<MedsScreen> createState() => _MedsScreenState();
}

class _MedsScreenState extends State<MedsScreen> {
  Dog get dog => widget.dog;

  /// 남은 일수 — 재고와 하루 사용량이 둘 다 있어야 계산됩니다 (웹과 동일)
  int? _daysLeft(Map<String, dynamic> m) {
    final stock = (m['stock'] as num?)?.toDouble();
    final perDay = (m['perDay'] as num?)?.toDouble();
    if (stock == null || perDay == null || perDay <= 0) return null;
    return (stock / perDay).floor();
  }

  Future<void> _openForm([Map<String, dynamic>? m]) async {
    final name = TextEditingController(text: m?['name'] as String? ?? '');
    final dose = TextEditingController(text: m?['dose'] as String? ?? '');
    final stock = TextEditingController(text: (m?['stock'] as num?)?.toString() ?? '');
    final perDay = TextEditingController(text: (m?['perDay'] as num?)?.toString() ?? '');
    final clinic = TextEditingController(text: m?['clinic'] as String? ?? '');
    final note = TextEditingController(text: m?['note'] as String? ?? '');
    var purpose = m?['purpose'] as String? ?? medPurposes.first;
    var freq = m?['freq'] as String? ?? medFreqs.first;
    var unit = m?['unit'] as String? ?? medUnits.first;

    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setD) => AlertDialog(
          title: Text(m == null ? '약 추가하기' : '약 정보 고치기',
              style: const TextStyle(fontSize: 17)),
          content: SingleChildScrollView(
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              TextField(
                controller: name,
                autofocus: true,
                decoration: const InputDecoration(
                    labelText: '약 이름이 뭐예요?', hintText: '예: 하트가드 플러스'),
              ),
              const SizedBox(height: 10),
              DropdownButtonFormField<String>(
                initialValue: purpose,
                isExpanded: true,
                decoration: const InputDecoration(labelText: '어디에 쓰는 약인가요?'),
                items: [for (final p in medPurposes) DropdownMenuItem(value: p, child: Text(p))],
                onChanged: (v) => setD(() => purpose = v!),
              ),
              const SizedBox(height: 10),
              Row(children: [
                Expanded(
                  child: TextField(
                    controller: dose,
                    decoration: const InputDecoration(
                        labelText: '한 번에 얼마나?', hintText: '1정'),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: DropdownButtonFormField<String>(
                    initialValue: freq,
                    isExpanded: true,
                    decoration: const InputDecoration(labelText: '얼마나 자주?'),
                    items: [
                      for (final f in medFreqs)
                        DropdownMenuItem(
                            value: f, child: Text(f, style: const TextStyle(fontSize: 13)))
                    ],
                    onChanged: (v) => setD(() => freq = v!),
                  ),
                ),
              ]),
              const SizedBox(height: 10),
              Row(children: [
                Expanded(
                  child: TextField(
                    controller: stock,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    decoration: const InputDecoration(labelText: '남은 수량'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: DropdownButtonFormField<String>(
                    initialValue: unit,
                    decoration: const InputDecoration(labelText: '단위'),
                    items: [for (final u in medUnits) DropdownMenuItem(value: u, child: Text(u))],
                    onChanged: (v) => setD(() => unit = v!),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: TextField(
                    controller: perDay,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    decoration: const InputDecoration(labelText: '하루에'),
                  ),
                ),
              ]),
              const SizedBox(height: 4),
              const Align(
                alignment: Alignment.centerLeft,
                child: Text('남은 수량과 하루 사용량을 적으면 떨어질 때 알려드려요',
                    style: TextStyle(fontSize: 11)),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: clinic,
                decoration: const InputDecoration(labelText: '처방받은 병원'),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: note,
                decoration: const InputDecoration(
                    labelText: '메모', hintText: '밥 먹고 주기, 졸려하는지 지켜보기 등'),
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
      'date': m?['date'] as String? ?? todayStr(), // 목록 정렬용(등록일)
      'name': name.text.trim(),
      'purpose': purpose,
      'dose': dose.text.trim(),
      'freq': freq,
      'stock': double.tryParse(stock.text.trim()),
      'unit': unit,
      'perDay': double.tryParse(perDay.text.trim()),
      'clinic': clinic.text.trim(),
      'note': note.text.trim(),
      'taken': m?['taken'] ?? <String>[],
    };
    if (m == null) {
      await widget.store.addRecord(dog.id, 'meds', data);
    } else {
      await widget.store.updateRecord(dog.id, 'meds', {...data, 'id': m['id']});
    }
    if (mounted) setState(() {});
  }

  /// 오늘 줬어요 토글 — 날짜 목록(taken)에 오늘을 넣고 뺍니다
  Future<void> _toggleTaken(Map<String, dynamic> m) async {
    final t = todayStr();
    final taken = List<String>.from((m['taken'] as List?)?.cast<String>() ?? const []);
    final was = taken.contains(t);
    was ? taken.remove(t) : taken.add(t);
    await widget.store.updateRecord(dog.id, 'meds', {...m, 'taken': taken});
    if (mounted) {
      if (!was) {
        ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('${m['name']} 오늘 몫 체크했어요!')));
      }
      setState(() {});
    }
  }

  Future<void> _stop(Map<String, dynamic> m) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('그만 먹여요', style: TextStyle(fontSize: 17)),
        content: Text('${m['name']} 기록을 지울까요?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('취소')),
          FilledButton(
              style: compactButton,
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('지우기')),
        ],
      ),
    );
    if (ok == true) {
      await widget.store.removeRecord(dog.id, 'meds', m['id'] as String);
      if (mounted) setState(() {});
    }
  }

  @override
  Widget build(BuildContext context) {
    final meds = widget.store.records(dog.id, 'meds');
    final t = todayStr();

    return Scaffold(
      appBar: AppBar(title: Text('약 챙기기 — ${dog.name}')),
      floatingActionButton: FloatingActionButton.extended(
          onPressed: () => _openForm(), icon: const Icon(Icons.add), label: const Text('약 추가')),
      body: meds.isEmpty
          ? const Center(
              child: Padding(
                padding: EdgeInsets.all(28),
                child: Text('💊\n먹고 있는 약이 있으면 등록해두세요.\n오늘 줬는지, 얼마나 남았는지 같이 챙겨드려요.',
                    textAlign: TextAlign.center, style: TextStyle(fontSize: 14, height: 1.8)),
              ),
            )
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                for (final m in meds) _medCard(m, t),
                const SizedBox(height: 70),
              ],
            ),
    );
  }

  Widget _medCard(Map<String, dynamic> m, String t) {
    final taken = (m['taken'] as List?)?.cast<String>() ?? const [];
    final done = taken.contains(t);
    final left = _daysLeft(m);
    final meta = [
      m['dose'],
      m['freq'],
      if (m['stock'] != null) '${(m['stock'] as num)}${m['unit'] ?? '정'} 남음',
      m['clinic'],
    ].where((e) => e != null && '$e'.isNotEmpty).join(' · ');

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            const Text('💊', style: TextStyle(fontSize: 20)),
            const SizedBox(width: 8),
            Expanded(
              child: Text('${m['name']}',
                  style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
            ),
            if (left != null && left <= 5)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                    color: left <= 2 ? Colors.red.shade50 : Colors.amber.shade100,
                    borderRadius: BorderRadius.circular(20)),
                child: Text('$left일치 남음',
                    style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: left <= 2 ? Colors.red.shade400 : Colors.brown.shade800)),
              ),
          ]),
          const SizedBox(height: 4),
          Text('${m['purpose'] ?? ''}${meta.isNotEmpty ? ' · $meta' : ''}',
              style: TextStyle(fontSize: 12, color: Theme.of(context).hintColor)),
          if ((m['note'] as String? ?? '').isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 3),
              child: Text('${m['note']}', style: const TextStyle(fontSize: 12)),
            ),
          const SizedBox(height: 8),
          Row(children: [
            done
                ? FilledButton.tonal(
                    style: compactButton,
                    onPressed: () => _toggleTaken(m),
                    child: const Text('✓ 오늘 줬어요'))
                : FilledButton(
                    style: compactButton,
                    onPressed: () => _toggleTaken(m),
                    child: const Text('오늘 줬어요?')),
            const Spacer(),
            TextButton(
                onPressed: () => _openForm(m),
                child: const Text('수정', style: TextStyle(fontSize: 12.5))),
            TextButton(
                onPressed: () => _stop(m),
                child: const Text('그만', style: TextStyle(fontSize: 12.5))),
          ]),
        ]),
      ),
    );
  }
}
