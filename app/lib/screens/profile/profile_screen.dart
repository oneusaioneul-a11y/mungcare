// 아이 프로필 — 반려견 카드(나이·체중) + 다견 전환 + 체중 기록
import 'package:flutter/material.dart';

import '../../models/dog.dart';
import '../../services/breeds.dart';
import '../../services/dog_store.dart';
import '../../services/health.dart';
import '../../theme.dart';
import 'dog_form_screen.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key, required this.store});
  final DogStore store;

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  DogStore get store => widget.store;

  Future<void> _openForm([Dog? dog]) async {
    await Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => DogFormScreen(store: store, dog: dog)));
    if (mounted) setState(() {});
  }

  Future<void> _addWeight(Dog dog) async {
    final c = TextEditingController();
    final kg = await showDialog<double>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('체중 기록', style: TextStyle(fontSize: 17)),
        content: TextField(
          controller: c,
          autofocus: true,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          decoration: const InputDecoration(labelText: '몸무게(kg)', hintText: '예: 4.2'),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('취소')),
          FilledButton(
            style: compactButton,
            onPressed: () => Navigator.pop(ctx, double.tryParse(c.text.trim())),
            child: const Text('저장'),
          ),
        ],
      ),
    );
    if (kg == null || kg <= 0 || kg > 120) {
      if (kg != null && mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('몸무게를 확인해주세요')));
      }
      return;
    }
    await store.addWeight(dog.id, WeightRecord(id: DogStore.newId(), date: DateTime.now(), kg: kg));
    if (mounted) setState(() {});
  }

  Future<void> _deleteDog(Dog dog) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('${dog.name} 정보 삭제', style: const TextStyle(fontSize: 17)),
        content: const Text('체중 기록까지 모두 지워져요. 되돌릴 수 없어요.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('취소')),
          FilledButton(
              style: compactButton,
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('삭제')),
        ],
      ),
    );
    if (ok == true) {
      await store.removeDog(dog.id);
      if (mounted) setState(() {});
    }
  }

  String _fmtDate(DateTime d) =>
      '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  @override
  Widget build(BuildContext context) {
    final dogs = store.dogs();
    final dog = store.active();
    final ws = dog == null ? const <WeightRecord>[] : store.weights(dog.id);

    return Scaffold(
      appBar: AppBar(title: const Text('아이 프로필')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _openForm(),
        icon: const Icon(Icons.add),
        label: Text(dogs.isEmpty ? '우리 아이 소개하기' : '다른 아이 추가'),
      ),
      body: dog == null
          ? const Center(
              child: Text('🐶\n아직 소개해준 아이가 없어요.\n아래 버튼으로 시작해요!',
                  textAlign: TextAlign.center, style: TextStyle(fontSize: 15, height: 1.8)))
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                if (dogs.length > 1)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: SegmentedButton<String>(
                      segments: [
                        for (final d in dogs)
                          ButtonSegment(value: d.id, label: Text(d.name)),
                      ],
                      selected: {dog.id},
                      onSelectionChanged: (s) async {
                        await store.setActive(s.first);
                        setState(() {});
                      },
                    ),
                  ),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(children: [
                          Text(dog.sex == 'F' ? '🐕‍🦺' : '🐕', style: const TextStyle(fontSize: 40)),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(dog.name,
                                    style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
                                Text(
                                  '${dog.breed ?? '견종은 아직'} · ${ageLabel(dog.birth)}'
                                  '${dog.neutered ? ' · 중성화' : ''}',
                                  style: TextStyle(fontSize: 12.5, color: Theme.of(context).hintColor),
                                ),
                              ],
                            ),
                          ),
                          IconButton(onPressed: () => _openForm(dog), icon: const Icon(Icons.edit, size: 20)),
                          IconButton(onPressed: () => _deleteDog(dog), icon: const Icon(Icons.delete_outline, size: 20)),
                        ]),
                        const SizedBox(height: 10),
                        Row(children: [
                          _stat('현재 체중', dog.weight == null ? '-' : '${dog.weight}kg'),
                          _stat('활동량', activityLabel(dog.activity)),
                          _stat('성별', dog.sex == 'F' ? '암컷' : '수컷'),
                        ]),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(children: [
                          const Text('⚖️ 체중 기록',
                              style: TextStyle(fontSize: 14.5, fontWeight: FontWeight.w700)),
                          const Spacer(),
                          FilledButton.tonal(
                              style: compactButton,
                              onPressed: () => _addWeight(dog),
                              child: const Text('기록하기')),
                        ]),
                        const SizedBox(height: 6),
                        if (ws.isEmpty)
                          Text('아직 기록이 없어요. 꾸준히 재면 변화가 보여요!',
                              style: TextStyle(fontSize: 12.5, color: Theme.of(context).hintColor))
                        else
                          for (final w in ws)
                            Row(children: [
                              Text(_fmtDate(w.date), style: const TextStyle(fontSize: 13)),
                              const SizedBox(width: 12),
                              Text('${w.kg}kg',
                                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                              const Spacer(),
                              IconButton(
                                icon: const Icon(Icons.close, size: 16),
                                onPressed: () async {
                                  await store.removeWeight(dog.id, w.id);
                                  setState(() {});
                                },
                              ),
                            ]),
                      ],
                    ),
                  ),
                ),
              ],
            ),
    );
  }

  Widget _stat(String label, String value) => Expanded(
        child: Column(children: [
          Text(value, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800)),
          Text(label, style: TextStyle(fontSize: 11.5, color: Theme.of(context).hintColor)),
        ]),
      );
}
