// 홈 — 가입/로그인 후 진입. 열린 기능부터 연결하고 나머지는 이식 순서대로 열립니다.
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../services/auth_scope.dart';
import '../../services/auth_service.dart';
import '../../services/breeds.dart';
import '../../services/dog_store.dart';
import '../auth/login_screen.dart';
import '../profile/profile_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  MungUser? _user;
  DogStore? _store;

  static const _planned = [
    ('🍚', '밥 · 화식 · 약 · 산책', '매일 기록'),
    ('💉', '접종 · 진료 · 알러지', '병원 · 건강'),
    ('💬', '수다방 · 용품 리뷰', '커뮤니티'),
    ('🏥', '동물병원 · 용품점', '파트너 디렉터리'),
    ('🐾', '유기견 입양', '공공데이터'),
  ];

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _init();
  }

  Future<void> _init() async {
    final user = await AuthScope.of(context).current();
    if (user == null || !mounted) return;
    final prefs = await SharedPreferences.getInstance();
    if (!mounted) return;
    setState(() {
      _user = user;
      _store = DogStore(prefs, user.id);
    });
  }

  @override
  Widget build(BuildContext context) {
    final user = _user;
    final dog = _store?.active();
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
      body: _store == null
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Card(
                  child: ListTile(
                    leading: Text(dog == null ? '🐶' : (dog.sex == 'F' ? '🐕‍🦺' : '🐕'),
                        style: const TextStyle(fontSize: 28)),
                    title: Text(dog == null ? '우리 아이 소개하기' : dog.name,
                        style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
                    subtitle: Text(
                        dog == null
                            ? '아이를 등록하면 나이·체중 관리가 시작돼요'
                            : '${dog.breed ?? '견종은 아직'} · ${ageLabel(dog.birth)}'
                              '${dog.weight != null ? ' · ${dog.weight}kg' : ''}',
                        style: const TextStyle(fontSize: 12.5)),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () async {
                      await Navigator.of(context).push(MaterialPageRoute(
                          builder: (_) => ProfileScreen(store: _store!)));
                      if (mounted) setState(() {});
                    },
                  ),
                ),
                const SizedBox(height: 12),
                Text('곧 열릴 기능들이에요 (웹에서 이식 중)',
                    style: TextStyle(fontSize: 13, color: Theme.of(context).hintColor)),
                const SizedBox(height: 8),
                for (final (emoji, title, sub) in _planned)
                  Card(
                    child: ListTile(
                      leading: Text(emoji, style: const TextStyle(fontSize: 24)),
                      title: Text(title,
                          style: const TextStyle(fontSize: 14.5, fontWeight: FontWeight.w600)),
                      subtitle: Text(sub, style: const TextStyle(fontSize: 12)),
                      trailing: const Text('준비 중', style: TextStyle(fontSize: 11.5)),
                    ),
                  ),
              ],
            ),
    );
  }
}
