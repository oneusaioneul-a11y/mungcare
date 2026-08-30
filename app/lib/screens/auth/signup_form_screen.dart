// 회원가입 2단계 — 계정 정보 입력. 성공하면 본인인증(선택) 단계로 갑니다.
import 'package:flutter/material.dart';

import '../../config/features.dart';
import '../../models/consent.dart';
import '../../services/auth_scope.dart';
import '../../services/auth_service.dart';
import '../home/home_screen.dart';
import 'phone_verify_screen.dart';

class SignupFormScreen extends StatefulWidget {
  const SignupFormScreen({super.key, required this.consents});
  final Map<ConsentDoc, bool> consents;

  @override
  State<SignupFormScreen> createState() => _SignupFormScreenState();
}

class _SignupFormScreenState extends State<SignupFormScreen> {
  final _form = GlobalKey<FormState>();
  final _email = TextEditingController();
  final _pw = TextEditingController();
  final _pw2 = TextEditingController();
  final _nick = TextEditingController();
  bool _busy = false;

  @override
  void dispose() {
    for (final c in [_email, _pw, _pw2, _nick]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_form.currentState!.validate()) return;
    setState(() => _busy = true);
    try {
      final auth = AuthScope.of(context);
      await auth.signup(
        email: _email.text,
        password: _pw.text,
        nick: _nick.text,
        consents: widget.consents,
      );
      if (!mounted) return;
      // 본인인증은 기관 계약 전까지 건너뜁니다 (Features.phoneVerify)
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(
            builder: (_) => Features.phoneVerify
                ? const PhoneVerifyScreen(afterSignup: true)
                : const HomeScreen()),
        (_) => false,
      );
    } on AuthException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('계정 만들기')),
      body: SafeArea(
        child: Form(
          key: _form,
          child: ListView(
            padding: const EdgeInsets.all(20),
            children: [
              TextFormField(
                controller: _email,
                keyboardType: TextInputType.emailAddress,
                autofillHints: const [AutofillHints.email],
                decoration: const InputDecoration(labelText: '이메일'),
                validator: AuthValidators.email,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _pw,
                obscureText: true,
                decoration: const InputDecoration(
                    labelText: '비밀번호', helperText: '8자 이상, 영문+숫자'),
                validator: AuthValidators.password,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _pw2,
                obscureText: true,
                decoration: const InputDecoration(labelText: '비밀번호 확인'),
                validator: (v) => v == _pw.text ? null : '비밀번호가 서로 달라요',
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _nick,
                decoration: const InputDecoration(
                    labelText: '닉네임', helperText: '수다방에서 이 이름으로 보여요'),
                validator: AuthValidators.nick,
              ),
              const SizedBox(height: 24),
              FilledButton(
                onPressed: _busy ? null : _submit,
                child: _busy
                    ? const SizedBox(
                        width: 20, height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Text('가입하기'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
