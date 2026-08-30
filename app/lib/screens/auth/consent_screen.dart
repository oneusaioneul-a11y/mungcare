// 회원가입 1단계 — 약관 동의 (한국 표준: 전체 동의 + 필수/선택 구분 + 전문 보기)
import 'package:flutter/material.dart';

import '../../models/consent.dart';
import 'signup_form_screen.dart';

class ConsentScreen extends StatefulWidget {
  const ConsentScreen({super.key});

  @override
  State<ConsentScreen> createState() => _ConsentScreenState();
}

class _ConsentScreenState extends State<ConsentScreen> {
  final Map<ConsentDoc, bool> _checked = {for (final d in ConsentDoc.values) d: false};

  bool get _allChecked => ConsentDoc.values.every((d) => _checked[d] == true);
  bool get _requiredOk => ConsentDoc.values.where((d) => d.required).every((d) => _checked[d] == true);

  void _toggleAll(bool? v) =>
      setState(() { for (final d in ConsentDoc.values) { _checked[d] = v == true; } });

  void _showDoc(ConsentDoc doc) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (_) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.85,
        builder: (_, controller) => SingleChildScrollView(
          controller: controller,
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 32),
          child: Text(doc.body ?? '', style: const TextStyle(fontSize: 13.5, height: 1.75)),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('약관 동의')),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('멍케어에 오신 걸 환영해요! 🐕',
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
              const SizedBox(height: 6),
              Text('가입하려면 아래 내용을 확인하고 동의해주세요.',
                  style: TextStyle(fontSize: 13.5, color: Theme.of(context).hintColor)),
              const SizedBox(height: 20),
              Card(
                child: CheckboxListTile(
                  value: _allChecked,
                  onChanged: _toggleAll,
                  controlAffinity: ListTileControlAffinity.leading,
                  title: const Text('전체 동의',
                      style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
                ),
              ),
              const SizedBox(height: 8),
              ...ConsentDoc.values.map((d) => CheckboxListTile(
                    value: _checked[d],
                    onChanged: (v) => setState(() => _checked[d] = v == true),
                    controlAffinity: ListTileControlAffinity.leading,
                    contentPadding: const EdgeInsets.only(left: 4),
                    title: Row(children: [
                      Expanded(child: Text(d.label, style: const TextStyle(fontSize: 14))),
                      if (d.body != null)
                        TextButton(
                          onPressed: () => _showDoc(d),
                          child: const Text('보기', style: TextStyle(fontSize: 12.5)),
                        ),
                    ]),
                  )),
              const Spacer(),
              FilledButton(
                onPressed: _requiredOk
                    ? () => Navigator.of(context).push(MaterialPageRoute(
                        builder: (_) => SignupFormScreen(consents: Map.of(_checked))))
                    : null,
                child: const Text('동의하고 계속하기'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
