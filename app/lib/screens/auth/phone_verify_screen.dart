// 회원가입 3단계 — 휴대폰 본인인증 (선택).
// 본인확인기관 계약 전이라 MockPhoneVerifier 로 흐름만 재현합니다 (배너로 고지).
import 'package:flutter/material.dart';

import '../../services/phone_verify.dart';
import '../home/home_screen.dart';

class PhoneVerifyScreen extends StatefulWidget {
  const PhoneVerifyScreen({super.key, this.afterSignup = false});
  final bool afterSignup;

  @override
  State<PhoneVerifyScreen> createState() => _PhoneVerifyScreenState();
}

class _PhoneVerifyScreenState extends State<PhoneVerifyScreen> {
  final PhoneVerifier _verifier = MockPhoneVerifier();
  final _phone = TextEditingController();
  final _code = TextEditingController();
  String _carrier = carriers.first;
  String? _requestId;
  bool _busy = false;

  @override
  void dispose() {
    _phone.dispose();
    _code.dispose();
    super.dispose();
  }

  void _toast(String msg) =>
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));

  Future<void> _request() async {
    setState(() => _busy = true);
    try {
      _requestId = await _verifier.request(carrier: _carrier, phone: _phone.text);
      if (mounted) { setState(() {}); _toast('인증번호를 보냈어요'); }
    } on ArgumentError catch (e) {
      _toast(e.message as String);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _confirm() async {
    if (_requestId == null) return;
    setState(() => _busy = true);
    try {
      final ok = await _verifier.confirm(requestId: _requestId!, code: _code.text.trim());
      if (!mounted) return;
      if (!ok) { _toast('인증번호가 맞지 않아요'); return; }
      _toast('본인인증이 완료됐어요!');
      _goHome();
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _goHome() => Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const HomeScreen()), (_) => false);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('휴대폰 본인인증')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            if (!_verifier.live)
              Card(
                color: Theme.of(context).colorScheme.tertiaryContainer,
                child: const Padding(
                  padding: EdgeInsets.all(12),
                  child: Text(
                    '🚧 본인확인기관 연동 준비 중이에요.\n'
                    '지금은 개발용 흐름만 동작합니다 (인증번호 000000).',
                    style: TextStyle(fontSize: 12.5, height: 1.6),
                  ),
                ),
              ),
            const SizedBox(height: 8),
            DropdownButtonFormField<String>(
              initialValue: _carrier,
              decoration: const InputDecoration(labelText: '통신사'),
              items: [for (final c in carriers) DropdownMenuItem(value: c, child: Text(c))],
              onChanged: (v) => setState(() => _carrier = v!),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _phone,
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(labelText: '휴대폰 번호', hintText: '01012345678'),
            ),
            const SizedBox(height: 12),
            FilledButton.tonal(
              onPressed: _busy ? null : _request,
              child: Text(_requestId == null ? '인증번호 받기' : '다시 받기'),
            ),
            if (_requestId != null) ...[
              const SizedBox(height: 12),
              TextField(
                controller: _code,
                keyboardType: TextInputType.number,
                maxLength: 6,
                decoration: const InputDecoration(labelText: '인증번호 6자리'),
              ),
              FilledButton(onPressed: _busy ? null : _confirm, child: const Text('확인')),
            ],
            const SizedBox(height: 20),
            if (widget.afterSignup)
              TextButton(onPressed: _goHome, child: const Text('나중에 할게요 (건너뛰기)')),
          ],
        ),
      ),
    );
  }
}
