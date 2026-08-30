// 화식 레시피 — 직접 만든 레시피 기록 + 위험 재료 검사 (웹 recipes.js 이식)
import 'package:flutter/material.dart';

import '../../models/dog.dart';
import '../../services/dog_store.dart';
import '../../services/toxic.dart';
import '../../services/vaccine.dart' show todayStr;
import '../../theme.dart';

class RecipesScreen extends StatefulWidget {
  const RecipesScreen({super.key, required this.store, required this.dog});
  final DogStore store;
  final Dog dog;

  @override
  State<RecipesScreen> createState() => _RecipesScreenState();
}

class _RecipesScreenState extends State<RecipesScreen> {
  Dog get dog => widget.dog;

  Future<void> _openForm([Map<String, dynamic>? r]) async {
    final title = TextEditingController(text: r?['title'] as String? ?? '');
    final totalG = TextEditingController(text: (r?['totalG'] as num?)?.toString() ?? '');
    final totalKcal = TextEditingController(text: (r?['totalKcal'] as num?)?.toString() ?? '');
    final ingredients = TextEditingController(text: r?['ingredients'] as String? ?? '');
    final steps = TextEditingController(text: r?['steps'] as String? ?? '');
    final note = TextEditingController(text: r?['note'] as String? ?? '');
    var storage = r?['storage'] as String? ?? storageOptions.first;
    var tag = r?['tag'] as String? ?? '';

    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setD) => AlertDialog(
          title: Text(r == null ? '레시피 만들기' : '레시피 고치기',
              style: const TextStyle(fontSize: 17)),
          content: SingleChildScrollView(
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              TextField(
                controller: title,
                autofocus: true,
                decoration: const InputDecoration(
                    labelText: '레시피 이름', hintText: '예: 닭가슴살 단호박 화식'),
              ),
              const SizedBox(height: 10),
              Row(children: [
                Expanded(
                  child: TextField(
                    controller: totalG,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: '다 만들면 (g)', hintText: '600'),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: TextField(
                    controller: totalKcal,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: '총 kcal', hintText: '750'),
                  ),
                ),
              ]),
              const SizedBox(height: 10),
              DropdownButtonFormField<String>(
                initialValue: storage,
                isExpanded: true,
                decoration: const InputDecoration(labelText: '얼마나 두고 먹나요?'),
                items: [
                  for (final s in storageOptions) DropdownMenuItem(value: s, child: Text(s))
                ],
                onChanged: (v) => setD(() => storage = v!),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: ingredients,
                maxLines: 5,
                decoration: const InputDecoration(
                    labelText: '뭐가 들어가나요? (한 줄에 하나씩)',
                    hintText: '닭가슴살 / 300g\n단호박 / 100g\n브로콜리 / 50g'),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: steps,
                maxLines: 4,
                decoration: const InputDecoration(
                    labelText: '어떻게 만드나요?', hintText: '1. 닭가슴살을 끓는 물에 삶아요...'),
              ),
              const SizedBox(height: 10),
              DropdownButtonFormField<String>(
                initialValue: tag,
                isExpanded: true,
                decoration: const InputDecoration(labelText: '어떤 아이한테 좋아요?'),
                items: [
                  const DropdownMenuItem(value: '', child: Text('선택 안 함')),
                  for (final t in recipeTags) DropdownMenuItem(value: t, child: Text(t)),
                ],
                onChanged: (v) => setD(() => tag = v ?? ''),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: note,
                decoration: const InputDecoration(
                    labelText: '먹여보니 어땠나요?', hintText: '잘 먹던가요? 응가는 괜찮았나요?'),
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
    if (ok != true || title.text.trim().isEmpty) return;

    // 이름·재료·조리법을 통째로 검사합니다 (웹과 동일)
    final hits = checkToxic(
        '${ingredients.text} ${title.text} ${steps.text}');
    final data = {
      'date': r?['date'] as String? ?? todayStr(),
      'title': title.text.trim(),
      'totalG': double.tryParse(totalG.text.trim()),
      'totalKcal': double.tryParse(totalKcal.text.trim()),
      'storage': storage,
      'ingredients': ingredients.text.trim(),
      'steps': steps.text.trim(),
      'tag': tag,
      'note': note.text.trim(),
      'toxic': hits.map((h) => h.keywords.first).toList(),
    };
    if (r == null) {
      await widget.store.addRecord(dog.id, 'recipes', data);
    } else {
      await widget.store.updateRecord(dog.id, 'recipes', {...data, 'id': r['id']});
    }
    if (!mounted) return;
    setState(() {});

    // 위험 재료가 있으면 저장은 하되 반드시 알립니다
    if (hits.isNotEmpty) {
      await showDialog<void>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('⚠️ 이 재료는 빼주세요!', style: TextStyle(fontSize: 17)),
          content: SingleChildScrollView(
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              for (final h in hits)
                Container(
                  width: double.infinity,
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                      color: Colors.red.shade50, borderRadius: BorderRadius.circular(10)),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text('🚫 ${h.keywords.join(', ')}',
                        style: TextStyle(
                            fontSize: 13.5,
                            fontWeight: FontWeight.w800,
                            color: Colors.red.shade700)),
                    const SizedBox(height: 3),
                    Text(h.why, style: const TextStyle(fontSize: 12.5, height: 1.5)),
                  ]),
                ),
              const Text('레시피는 저장해뒀어요. 다만 먹이기 전에 이 재료는 꼭 빼주세요!',
                  style: TextStyle(fontSize: 12.5)),
            ]),
          ),
          actions: [
            FilledButton(
                style: compactButton,
                onPressed: () => Navigator.pop(ctx),
                child: const Text('알겠어요')),
          ],
        ),
      );
    } else {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('레시피 저장했어요! 👩‍🍳')));
    }
  }

  void _showToxicGuide() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (_) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.8,
        builder: (_, controller) => ListView(
          controller: controller,
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 32),
          children: [
            const Text('🚫 절대 넣으면 안 되는 재료',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
            const SizedBox(height: 10),
            for (final t in toxicItems)
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(t.keywords.join(' · '),
                        style: TextStyle(
                            fontSize: 13.5,
                            fontWeight: FontWeight.w800,
                            color: Colors.red.shade400)),
                    const SizedBox(height: 3),
                    Text(t.why, style: const TextStyle(fontSize: 12.5, height: 1.5)),
                  ]),
                ),
              ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final list = widget.store.records(dog.id, 'recipes');

    return Scaffold(
      appBar: AppBar(
        title: Text('화식 레시피 — ${dog.name}'),
        actions: [
          IconButton(
            tooltip: '위험 재료 보기',
            icon: const Icon(Icons.warning_amber_rounded),
            onPressed: _showToxicGuide,
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
          onPressed: () => _openForm(),
          icon: const Icon(Icons.add),
          label: const Text('레시피 만들기')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (list.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 24),
              child: Text('🍲\n직접 만든 화식 레시피를 기록해두세요.\n저장할 때 위험한 재료가 있는지 같이 확인해드려요.',
                  textAlign: TextAlign.center, style: TextStyle(fontSize: 14, height: 1.8)),
            )
          else
            for (final r in list) _card(r),
          const SizedBox(height: 8),
          OutlinedButton.icon(
            onPressed: _showToxicGuide,
            icon: const Icon(Icons.warning_amber_rounded, size: 18),
            label: const Text('절대 넣으면 안 되는 재료 보기'),
          ),
          const SizedBox(height: 8),
          Text('레시피는 참고용이에요. 지병이 있는 아이라면 수의사와 상의해주세요.',
              style: TextStyle(fontSize: 11.5, color: Theme.of(context).hintColor)),
          const SizedBox(height: 60),
        ],
      ),
    );
  }

  Widget _card(Map<String, dynamic> r) {
    final toxic = (r['toxic'] as List?)?.cast<String>() ?? const [];
    final g = (r['totalG'] as num?)?.toDouble();
    final kcal = (r['totalKcal'] as num?)?.toDouble();
    // 100g당 칼로리 — 급여량 가늠에 쓰입니다
    final per100 = (g != null && g > 0 && kcal != null) ? (kcal / g * 100).round() : null;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Expanded(
              child: Text('${r['title']}',
                  style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
            ),
            if (toxic.isNotEmpty)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                    color: Colors.red.shade50, borderRadius: BorderRadius.circular(20)),
                child: Text('⚠️ ${toxic.join(', ')}',
                    style: TextStyle(
                        fontSize: 11, fontWeight: FontWeight.w700, color: Colors.red.shade400)),
              )
            else if ((r['tag'] as String? ?? '').isNotEmpty)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.surfaceContainerHighest,
                    borderRadius: BorderRadius.circular(20)),
                child: Text('${r['tag']}',
                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700)),
              ),
          ]),
          const SizedBox(height: 4),
          Text(
            [
              if (g != null) '${g.round()}g',
              if (kcal != null) '${kcal.round()}kcal',
              if (per100 != null) '100g당 ${per100}kcal',
              r['storage'],
            ].where((e) => e != null && '$e'.isNotEmpty).join(' · '),
            style: TextStyle(fontSize: 12, color: Theme.of(context).hintColor),
          ),
          if ((r['ingredients'] as String? ?? '').isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 6),
              child: Text('${r['ingredients']}',
                  style: const TextStyle(fontSize: 12.5, height: 1.6)),
            ),
          if ((r['steps'] as String? ?? '').isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 6),
              child: Text('${r['steps']}',
                  style: TextStyle(
                      fontSize: 12, height: 1.6, color: Theme.of(context).hintColor)),
            ),
          if ((r['note'] as String? ?? '').isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 6),
              child: Text('📝 ${r['note']}', style: const TextStyle(fontSize: 12)),
            ),
          Row(mainAxisAlignment: MainAxisAlignment.end, children: [
            TextButton(
                onPressed: () => _openForm(r),
                child: const Text('수정', style: TextStyle(fontSize: 12.5))),
            TextButton(
              onPressed: () async {
                await widget.store.removeRecord(dog.id, 'recipes', r['id'] as String);
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
