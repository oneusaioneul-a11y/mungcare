// 화식에 넣으면 안 되는 재료 — 웹 views/recipes.js 의 TOXIC 목록 이식.
// 목록을 고칠 때는 웹과 양쪽을 함께 고칩니다.
class ToxicItem {
  final List<String> keywords;
  final String why;
  const ToxicItem(this.keywords, this.why);
}

const toxicItems = <ToxicItem>[
  ToxicItem(['양파', '대파', '쪽파', '부추', '마늘'],
      '적혈구를 깨뜨려서 빈혈이 와요. 익혀도 독성이 안 없어져요!'),
  ToxicItem(['포도', '건포도'], '조금만 먹어도 갑자기 신장이 망가질 수 있어요.'),
  ToxicItem(['초콜릿', '카카오', '코코아'], '토하고, 심장이 이상하게 뛰고, 발작까지 올 수 있어요.'),
  ToxicItem(['자일리톨'], '혈당이 뚝 떨어지고 간이 상해요. 정말 조금만 먹어도 위험해요.'),
  ToxicItem(['마카다미아'], '뒷다리에 힘이 빠지고 덜덜 떨면서 열이 나요.'),
  ToxicItem(['아보카도'], '토하고 설사해요. 씨앗은 목에 걸릴 수도 있고요.'),
  ToxicItem(['알코올', '술', '맥주'], '한 모금도 안 돼요. 정신을 잃을 수 있어요.'),
  ToxicItem(['커피', '카페인', '녹차'], '심장이 빨리 뛰고 발작이 올 수 있어요.'),
  ToxicItem(['닭뼈', '갈비뼈', '익힌 뼈'],
      '익힌 뼈는 날카롭게 쪼개져서 장을 찢을 수 있어요. 생뼈랑 달라요!'),
  ToxicItem(['소금', '간장', '된장'], '짠 건 신장에 부담이에요. 화식은 간 안 하는 게 원칙이에요.'),
];

/// 글에 포함된 위험 재료를 찾습니다 (웹 checkToxic 과 동일 규칙)
List<ToxicItem> checkToxic(String? text) {
  final s = text ?? '';
  return toxicItems.where((t) => t.keywords.any(s.contains)).toList();
}

const recipeTags = ['체중 관리', '노령견', '퍼피', '알러지 저자극', '신장 케어', '기호성 향상', '피부·피모'];
const storageOptions = ['냉장 3일', '냉장 5일', '냉동 2주', '냉동 1개월'];
