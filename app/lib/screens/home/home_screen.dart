// 홈 — 가입/로그인 후 진입. 열린 기능부터 연결하고 나머지는 이식 순서대로 열립니다.
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../services/auth_scope.dart';
import '../../services/auth_service.dart';
import '../../services/breeds.dart';
import '../../services/dog_store.dart';
import '../auth/login_screen.dart';
import '../profile/profile_screen.dart';
import '../records/allergy_screen.dart';
import '../records/diet_screen.dart';
import '../records/medical_screen.dart';
import '../records/meds_screen.dart';
import '../records/recipes_screen.dart';
import '../records/vaccine_screen.dart';
import '../records/walk_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  MungUser? _user;
  DogStore? _store;

  static const _planned = [
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

  Widget _featureTile(BuildContext context, String emoji, String title, String sub,
      Widget Function(DogStore, dynamic) builder) {
    return Card(
      child: ListTile(
        leading: Text(emoji, style: const TextStyle(fontSize: 24)),
        title: Text(title, style: const TextStyle(fontSize: 14.5, fontWeight: FontWeight.w600)),
        subtitle: Text(sub, style: const TextStyle(fontSize: 12)),
        trailing: const Icon(Icons.chevron_right),
        onTap: () async {
          final store = _store;
          final dog = store?.active();
          if (store == null || dog == null) {
            ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('먼저 위에서 우리 아이를 소개해주세요!')));
            return;
          }
          await Navigator.of(context)
              .push(MaterialPageRoute(builder: (_) => builder(store, dog)));
          if (mounted) setState(() {});
        },
      ),
    );
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
                _featureTile(context, '🍚', '밥 기록', '하루 권장 칼로리와 오늘 먹은 양',
                    (store, dog) => DietScreen(store: store, dog: dog)),
                _featureTile(context, '🐾', '산책 기록', '주간 합계와 하루 목표',
                    (store, dog) => WalkScreen(store: store, dog: dog)),
                _featureTile(context, '🍲', '화식 레시피', '위험 재료 확인 포함',
                    (store, dog) => RecipesScreen(store: store, dog: dog)),
                _featureTile(context, '💊', '약 챙기기', '오늘 줬는지, 얼마나 남았는지',
                    (store, dog) => MedsScreen(store: store, dog: dog)),
                _featureTile(context, '💉', '접종 · 구충', '다음 일정과 지난 이력',
                    (store, dog) => VaccineScreen(store: store, dog: dog)),
                _featureTile(context, '🏥', '진료 기록', '병원 다녀온 이야기',
                    (store, dog) => MedicalScreen(store: store, dog: dog)),
                _featureTile(context, '🤧', '알러지', '반응하는 것과 대처법',
                    (store, dog) => AllergyScreen(store: store, dog: dog)),
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
