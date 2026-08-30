// 화면 트리에 AuthService 를 내려주는 InheritedWidget.
// cloud 모드가 생기면 main.dart 에서 주입하는 구현체만 바꾸면 됩니다.
import 'package:flutter/widgets.dart';

import 'auth_service.dart';

class AuthScope extends InheritedWidget {
  const AuthScope({super.key, required this.service, required super.child});
  final AuthService service;

  static AuthService of(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<AuthScope>()!.service;

  @override
  bool updateShouldNotify(AuthScope oldWidget) => service != oldWidget.service;
}
