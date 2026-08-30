// 인증 서비스 — 웹 store.js 의 이중 모드 구조를 따릅니다.
// 지금은 LocalAuthService(기기 저장)만 있고, Supabase 프로젝트가 준비되면
// 같은 인터페이스의 CloudAuthService 를 추가해 갈아끼웁니다.
import 'dart:convert';

import 'package:crypto/crypto.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../content/legal.dart';
import '../models/consent.dart';

class AuthException implements Exception {
  final String message;
  AuthException(this.message);
  @override
  String toString() => message;
}

class MungUser {
  final String id;
  final String email;
  final String nick;
  final List<ConsentRecord> consents;

  const MungUser({
    required this.id,
    required this.email,
    required this.nick,
    required this.consents,
  });
}

abstract class AuthService {
  Future<MungUser?> current();
  Future<MungUser> signup({
    required String email,
    required String password,
    required String nick,
    required Map<ConsentDoc, bool> consents,
  });
  Future<MungUser> login({required String email, required String password});
  Future<void> logout();
}

/// 입력 검증 — 화면과 서비스가 함께 씁니다.
class AuthValidators {
  static final _email = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$');

  static String? email(String? v) {
    final s = (v ?? '').trim();
    if (s.isEmpty) return '이메일을 적어주세요';
    if (!_email.hasMatch(s)) return '이메일 형식을 확인해주세요';
    return null;
  }

  /// 한국 서비스 통상 기준: 8자 이상, 영문과 숫자를 함께
  static String? password(String? v) {
    final s = v ?? '';
    if (s.length < 8) return '비밀번호는 8자 이상이어야 해요';
    if (!RegExp(r'[A-Za-z]').hasMatch(s) || !RegExp(r'[0-9]').hasMatch(s)) {
      return '영문과 숫자를 섞어주세요';
    }
    return null;
  }

  static String? nick(String? v) {
    final s = (v ?? '').trim();
    if (s.isEmpty) return '닉네임을 적어주세요';
    if (s.length > 20) return '닉네임은 20자까지예요';
    return null;
  }

  /// 필수 동의가 빠졌으면 그 문서를 돌려줍니다 (없으면 null)
  static ConsentDoc? missingRequired(Map<ConsentDoc, bool> consents) {
    for (final d in ConsentDoc.values) {
      if (d.required && consents[d] != true) return d;
    }
    return null;
  }
}

/// 기기 저장 모드 — SharedPreferences(JSON) 에만 저장됩니다.
class LocalAuthService implements AuthService {
  static const _usersKey = 'mungcare.users';
  static const _sessionKey = 'mungcare.session';
  static const _iterations = 10000; // 기기 내 저장용. 서버 전환 시 Supabase Auth 가 담당

  final SharedPreferences prefs;
  LocalAuthService(this.prefs);

  Map<String, dynamic> _users() =>
      (jsonDecode(prefs.getString(_usersKey) ?? '{}') as Map).cast<String, dynamic>();

  Future<void> _saveUsers(Map<String, dynamic> users) =>
      prefs.setString(_usersKey, jsonEncode(users));

  /// salt + 반복 HMAC-SHA256 — 평문·복호화 가능 형태로는 저장하지 않습니다
  static String hashPassword(String password, String salt, [int iter = _iterations]) {
    List<int> digest = utf8.encode(password);
    final key = utf8.encode(salt);
    for (var i = 0; i < iter; i++) {
      digest = Hmac(sha256, key).convert(digest).bytes;
    }
    return base64Encode(digest);
  }

  MungUser _toUser(Map<String, dynamic> u) => MungUser(
        id: u['id'] as String,
        email: u['email'] as String,
        nick: u['nick'] as String,
        consents: ((u['consents'] as List?) ?? const [])
            .map((c) => ConsentRecord.fromJson((c as Map).cast<String, dynamic>()))
            .toList(),
      );

  @override
  Future<MungUser?> current() async {
    final email = prefs.getString(_sessionKey);
    if (email == null) return null;
    final u = _users()[email];
    return u == null ? null : _toUser((u as Map).cast<String, dynamic>());
  }

  @override
  Future<MungUser> signup({
    required String email,
    required String password,
    required String nick,
    required Map<ConsentDoc, bool> consents,
  }) async {
    email = email.trim().toLowerCase();
    for (final check in [
      AuthValidators.email(email),
      AuthValidators.password(password),
      AuthValidators.nick(nick)
    ]) {
      if (check != null) throw AuthException(check);
    }
    final missing = AuthValidators.missingRequired(consents);
    if (missing != null) throw AuthException('${missing.label.replaceFirst('(필수) ', '')} — 필수 동의예요');

    final users = _users();
    if (users.containsKey(email)) throw AuthException('이미 가입된 이메일이에요');

    final now = DateTime.now();
    final salt = base64Encode(utf8.encode('$email|${now.microsecondsSinceEpoch}'));
    final records = ConsentDoc.values
        .where((d) => d.required || consents.containsKey(d))
        .map((d) => ConsentRecord(
            doc: d.key, version: legalVersion, agreedAt: now, agreed: consents[d] == true))
        .toList();

    users[email] = {
      'id': now.microsecondsSinceEpoch.toRadixString(16),
      'email': email,
      'nick': nick.trim(),
      'salt': salt,
      'hash': hashPassword(password, salt),
      'createdAt': now.toIso8601String(),
      'consents': records.map((r) => r.toJson()).toList(),
    };
    await _saveUsers(users);
    await prefs.setString(_sessionKey, email);
    return _toUser((users[email] as Map).cast<String, dynamic>());
  }

  @override
  Future<MungUser> login({required String email, required String password}) async {
    email = email.trim().toLowerCase();
    final u = _users()[email];
    if (u == null) throw AuthException('이메일 또는 비밀번호가 맞지 않아요');
    final m = (u as Map).cast<String, dynamic>();
    if (hashPassword(password, m['salt'] as String) != m['hash']) {
      throw AuthException('이메일 또는 비밀번호가 맞지 않아요');
    }
    await prefs.setString(_sessionKey, email);
    return _toUser(m);
  }

  @override
  Future<void> logout() => prefs.remove(_sessionKey).then((_) {});
}
