// 홈 골격 — 가입/로그인 후 진입. 기능 화면들은 웹에서 순차 이식 예정.
import 'package:flutter/material.dart';

import '../../services/auth_scope.dart';
import '../../services/auth_service.dart';
import '../auth/login_screen.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  static const _planned = [
    ('🏠', '오늘 하루', '통합 알림 · 주간 차트 · 타임라인'),
    ('🐶', '아이 프로필', '반려견 정보 · 체중'),
    ('🍚', '밥 · 화식 · 약 · 산책', '매일 기록'),
    ('💉', '접종 · 진료 · 알러지', '병원 · 건강'),
    ('💬', '수다방 · 용품 리뷰', '커뮤니티'),
    ('🏥', '동물병원 · 용품점', '파트너 디렉터리'),
    ('🐾', '유기견 입양', '공공데이터'),
  ];

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<MungUser?>(
      future: AuthScope.of(context).current(),
      builder: (context, snap) {
        final user = snap.data;
        return Scaffold(
          appBar: AppBar(
            title: Text(user == null ? '멍케어' : '반가워요, ${user.nick}님!'),
            actions: [
              IconButton(
                tooltip: '나가기',
                icon: const Icon(Icons.logout),
                onPressed: () async {
                  await AuthScope.of(context).logout();
                  if (context.mounted) {
                    Navigator.of(context).pushAndRemoveUntil(
                        MaterialPageRoute(builder: (_) => const LoginScreen()), (_) => false);
                  }
                },
              ),
            ],
          ),
          body: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              if (user != null)
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('내 동의 내역',
                            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
                        const SizedBox(height: 8),
                        for (final c in user.consents)
                          Padding(
                            padding: const EdgeInsets.only(bottom: 4),
                            child: Text(
                              '${c.agreed ? "✅" : "▫️"} ${c.doc} · ${c.version} · '
                              '${c.agreedAt.toString().substring(0, 16)}',
                              style: const TextStyle(fontSize: 12.5),
                            ),
                          ),
                      ],
                    ),
                  ),
                ),
              const SizedBox(height: 8),
              Text('곧 열릴 기능들이에요 (웹에서 이식 중)',
                  style: TextStyle(fontSize: 13, color: Theme.of(context).hintColor)),
              const SizedBox(height: 8),
              for (final (emoji, title, sub) in _planned)
                Card(
                  child: ListTile(
                    leading: Text(emoji, style: const TextStyle(fontSize: 24)),
                    title: Text(title, style: const TextStyle(fontSize: 14.5, fontWeight: FontWeight.w600)),
                    subtitle: Text(sub, style: const TextStyle(fontSize: 12)),
                    trailing: const Text('준비 중', style: TextStyle(fontSize: 11.5)),
                  ),
                ),
            ],
          ),
        );
      },
    );
  }
}
