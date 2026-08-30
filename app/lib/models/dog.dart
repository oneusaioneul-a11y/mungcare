// 반려견 — 웹(care.dogs)과 같은 필드 구성. cloud 전환 시 그대로 매핑됩니다.
class Dog {
  final String id;
  String name;
  String? breed;
  DateTime? birth;
  String sex;          // 'M' | 'F'
  double? weight;      // 최신 체중(kg) — 체중 기록의 최신값과 동기화
  bool neutered;
  String activity;     // 'low' | 'normal' | 'high'
  final DateTime createdAt;

  Dog({
    required this.id,
    required this.name,
    this.breed,
    this.birth,
    this.sex = 'M',
    this.weight,
    this.neutered = false,
    this.activity = 'normal',
    DateTime? createdAt,
  }) : createdAt = createdAt ?? DateTime.now();

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'breed': breed,
        'birth': birth?.toIso8601String(),
        'sex': sex,
        'weight': weight,
        'neutered': neutered,
        'activity': activity,
        'createdAt': createdAt.toIso8601String(),
      };

  factory Dog.fromJson(Map<String, dynamic> j) => Dog(
        id: j['id'] as String,
        name: j['name'] as String,
        breed: j['breed'] as String?,
        birth: j['birth'] == null ? null : DateTime.parse(j['birth'] as String),
        sex: j['sex'] as String? ?? 'M',
        weight: (j['weight'] as num?)?.toDouble(),
        neutered: j['neutered'] as bool? ?? false,
        activity: j['activity'] as String? ?? 'normal',
        createdAt: DateTime.parse(j['createdAt'] as String),
      );
}

class WeightRecord {
  final String id;
  final DateTime date;
  final double kg;

  const WeightRecord({required this.id, required this.date, required this.kg});

  Map<String, dynamic> toJson() =>
      {'id': id, 'date': date.toIso8601String(), 'kg': kg};

  factory WeightRecord.fromJson(Map<String, dynamic> j) => WeightRecord(
        id: j['id'] as String,
        date: DateTime.parse(j['date'] as String),
        kg: (j['kg'] as num).toDouble(),
      );
}
