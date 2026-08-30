// 멍케어 앱 — 반려견 통합 건강 관리 (웹 버전의 Flutter 이식)
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'screens/auth/login_screen.dart';
import 'screens/home/home_screen.dart';
import 'services/auth_scope.dart';
import 'services/auth_service.dart';
import 'theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final prefs = await SharedPreferences.getInstance();
  // Supabase 프로젝트가 준비되면 여기서 CloudAuthService 로 교체합니다
  final auth = LocalAuthService(prefs);
  final loggedIn = await auth.current() != null;
  runApp(MungCareApp(auth: auth, loggedIn: loggedIn));
}

class MungCareApp extends StatelessWidget {
  const MungCareApp({super.key, required this.auth, required this.loggedIn});
  final AuthService auth;
  final bool loggedIn;

  @override
  Widget build(BuildContext context) {
    return AuthScope(
      service: auth,
      child: MaterialApp(
        title: '멍케어',
        debugShowCheckedModeBanner: false,
        theme: mungTheme(Brightness.light),
        darkTheme: mungTheme(Brightness.dark),
        home: loggedIn ? const HomeScreen() : const LoginScreen(),
      ),
    );
  }
}
