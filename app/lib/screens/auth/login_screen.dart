// 로그인 — 이메일 로그인 + 소셜 버튼(준비 중) + 회원가입 진입
import 'package:flutter/material.dart';

import '../../config/features.dart';
import '../../services/auth_scope.dart';
import '../../services/auth_service.dart';
import '../../services/social_auth.dart';
import '../home/home_screen.dart';
import 'consent_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _email = TextEditingController();
  final _pw = TextEditingController();
  bool _busy = false;

  @override
  void dispose() {
    _email.dispose();
    _pw.dispose();
    super.dispose();
  }

  void _toast(String msg) =>
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));

  Future<void> _login() async {
    setState(() => _busy = true);
    try {
      await AuthScope.of(context).login(email: _email.text, password: _pw.text);
      if (!mounted) return;
      Navigator.of(context).pushAndRemoveUntil(
          MaterialPageRoute(builder: (_) => const HomeScreen()), (_) => false);
    } on AuthException catch (e) {
      _toast(e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _social(SocialProvider p) async {
    try {
      await SocialAuth.signIn(p);
    } on UnsupportedError catch (e) {
      _toast(e.message ?? '준비 중이에요');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(24, 48, 24, 24),
          children: [
            // 앱 아이콘·스플래시와 같은 두들 (웹 브랜드 마크에서 생성)
            Image.asset('assets/branding/splash.png', width: 96, height: 96),
            const SizedBox(height: 8),
            const Text('멍케어',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 26, fontWeight: FontWeight.w800)),
            Text('우리 아이 건강 수첩',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 13.5, color: Theme.of(context).hintColor)),
            const SizedBox(height: 32),
            TextField(
              controller: _email,
              keyboardType: TextInputType.emailAddress,
              autofillHints: const [AutofillHints.email],
              decoration: const InputDecoration(labelText: '이메일'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _pw,
              obscureText: true,
              onSubmitted: (_) => _login(),
              decoration: const InputDecoration(labelText: '비밀번호'),
            ),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: _busy ? null : _login,
              child: const Text('로그인'),
            ),
            TextButton(
              onPressed: () => Navigator.of(context)
                  .push(MaterialPageRoute(builder: (_) => const ConsentScreen())),
              child: const Text('아직 계정이 없어요 — 회원가입'),
            ),
            // 소셜 로그인은 프로바이더 키 발급 전까지 감춥니다 (Features.socialLogin)
            if (Features.socialLogin) ...[
              const SizedBox(height: 12),
              Row(children: [
                const Expanded(child: Divider()),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 10),
                  child: Text('또는',
                      style: TextStyle(fontSize: 12, color: Theme.of(context).hintColor)),
                ),
                const Expanded(child: Divider()),
              ]),
              const SizedBox(height: 12),
              for (final p in SocialProvider.values) ...[
                OutlinedButton(
                  onPressed: () => _social(p),
                  style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(46)),
                  child: Text(p.label),
                ),
                const SizedBox(height: 8),
              ],
            ],
          ],
        ),
      ),
    );
  }
}
