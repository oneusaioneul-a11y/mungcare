// 반려견 등록·수정 폼 — 웹 profile.js 의 폼 구성을 이식
import 'package:flutter/material.dart';

import '../../models/dog.dart';
import '../../services/breeds.dart';
import '../../services/dog_store.dart';
import '../../services/health.dart';
import '../../theme.dart';

class DogFormScreen extends StatefulWidget {
  const DogFormScreen({super.key, required this.store, this.dog});
  final DogStore store;
  final Dog? dog; // null 이면 새로 등록

  @override
  State<DogFormScreen> createState() => _DogFormScreenState();
}

class _DogFormScreenState extends State<DogFormScreen> {
  final _form = GlobalKey<FormState>();
  late final TextEditingController _name =
      TextEditingController(text: widget.dog?.name ?? '');
  late final TextEditingController _customBreed = TextEditingController();
  late final TextEditingController _weight =
      TextEditingController(text: widget.dog?.weight?.toString() ?? '');
  List<String> _breeds = [];
  String? _breed;
  bool _customMode = false;
  DateTime? _birth;
  String _sex = 'M';
  String _activity = 'neutered';
  bool _neutered = false;

  @override
  void initState() {
    super.initState();
    final d = widget.dog;
    if (d != null) {
      _birth = d.birth;
      _sex = d.sex;
      _activity = d.activity;
      _neutered = d.neutered;
    }
    Breeds.names().then((names) {
      if (!mounted) return;
      setState(() {
        _breeds = names;
        final b = d?.breed;
        if (b != null && b.isNotEmpty) {
          if (names.contains(b)) {
            _breed = b;
          } else {
            _customMode = true;
            _customBreed.text = b;
          }
        }
      });
    });
  }

  @override
  void dispose() {
    for (final c in [_name, _customBreed, _weight]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _pickBirth() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _birth ?? DateTime(now.year - 2, now.month),
      firstDate: DateTime(now.year - 25),
      lastDate: now,
      helpText: '생일 (모르면 추정 날짜도 좋아요)',
    );
    if (picked != null) {
      setState(() {
        _birth = picked;
        // 나이·중성화에 맞는 급여 활동량을 추천값으로 (직접 고르면 그대로 둠)
        if (widget.dog == null) {
          _activity = suggestActivity(
              Dog(id: '_', name: '_', birth: picked, neutered: _neutered));
        }
      });
    }
  }

  Future<void> _submit() async {
    if (!_form.currentState!.validate()) return;
    final breed = _customMode ? _customBreed.text.trim() : (_breed ?? '');
    final weight = double.tryParse(_weight.text.trim());
    final d = widget.dog;
    if (d == null) {
      await widget.store.addDog(Dog(
        id: DogStore.newId(),
        name: _name.text.trim(),
        breed: breed.isEmpty ? null : breed,
        birth: _birth,
        sex: _sex,
        weight: weight,
        neutered: _neutered,
        activity: _activity,
      ));
    } else {
      d
        ..name = _name.text.trim()
        ..breed = breed.isEmpty ? null : breed
        ..birth = _birth
        ..sex = _sex
        ..neutered = _neutered
        ..activity = _activity;
      await widget.store.updateDog(d);
    }
    if (mounted) Navigator.of(context).pop(true);
  }

  @override
  Widget build(BuildContext context) {
    final editing = widget.dog != null;
    return Scaffold(
      appBar: AppBar(title: Text(editing ? '${widget.dog!.name} 정보 고치기' : '우리 아이 소개하기')),
      body: SafeArea(
        child: Form(
          key: _form,
          child: ListView(
            padding: const EdgeInsets.all(20),
            children: [
              TextFormField(
                controller: _name,
                decoration: const InputDecoration(labelText: '이름'),
                validator: (v) => (v ?? '').trim().isEmpty ? '이름을 적어주세요' : null,
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                initialValue: _customMode ? '__custom' : _breed,
                decoration: const InputDecoration(
                    labelText: '견종', helperText: '목록에 없으면 "직접 입력"을 골라주세요'),
                items: [
                  for (final b in _breeds) DropdownMenuItem(value: b, child: Text(b)),
                  const DropdownMenuItem(value: '__custom', child: Text('직접 입력')),
                ],
                onChanged: (v) => setState(() {
                  _customMode = v == '__custom';
                  if (!_customMode) _breed = v;
                }),
              ),
              if (_customMode) ...[
                const SizedBox(height: 12),
                TextFormField(
                  controller: _customBreed,
                  decoration: const InputDecoration(
                      labelText: '견종 직접 입력', hintText: '예: 코카스파니엘'),
                ),
              ],
              const SizedBox(height: 12),
              ListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('생일', style: TextStyle(fontSize: 14)),
                subtitle: Text(_birth == null
                    ? '접종일이랑 나이별 주의사항 계산에 써요'
                    : '${_birth!.year}-${_birth!.month.toString().padLeft(2, '0')}-${_birth!.day.toString().padLeft(2, '0')} (${ageLabel(_birth)})'),
                trailing: FilledButton.tonal(
                    style: compactButton, onPressed: _pickBirth, child: const Text('고르기')),
              ),
              Row(children: [
                Expanded(
                  child: DropdownButtonFormField<String>(
                    initialValue: _sex,
                    decoration: const InputDecoration(labelText: '성별'),
                    items: const [
                      DropdownMenuItem(value: 'M', child: Text('수컷')),
                      DropdownMenuItem(value: 'F', child: Text('암컷')),
                    ],
                    onChanged: (v) => setState(() => _sex = v!),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: DropdownButtonFormField<String>(
                    initialValue: _activity,
                    isExpanded: true,
                    decoration: const InputDecoration(labelText: '급여 기준 활동량'),
                    items: [
                      for (final a in activityLevels)
                        DropdownMenuItem(
                            value: a.key,
                            child: Text(a.label, overflow: TextOverflow.ellipsis,
                                style: const TextStyle(fontSize: 13.5))),
                    ],
                    onChanged: (v) => setState(() => _activity = v!),
                  ),
                ),
              ]),
              const SizedBox(height: 12),
              if (!editing)
                TextFormField(
                  controller: _weight,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  decoration: const InputDecoration(
                      labelText: '몸무게(kg)', hintText: '예: 4.2',
                      helperText: '첫 체중 기록으로 저장돼요. 수정은 체중 기록에서!'),
                  validator: (v) {
                    final s = (v ?? '').trim();
                    if (s.isEmpty) return null;
                    final n = double.tryParse(s);
                    return (n == null || n <= 0 || n > 120) ? '몸무게를 확인해주세요' : null;
                  },
                ),
              CheckboxListTile(
                value: _neutered,
                onChanged: (v) => setState(() => _neutered = v == true),
                controlAffinity: ListTileControlAffinity.leading,
                contentPadding: EdgeInsets.zero,
                title: const Text('중성화 했어요', style: TextStyle(fontSize: 14)),
              ),
              const SizedBox(height: 12),
              FilledButton(onPressed: _submit, child: Text(editing ? '저장하기' : '등록하기')),
            ],
          ),
        ),
      ),
    );
  }
}
