#!/usr/bin/env python3
"""스크린샷용 데모 데이터를 시뮬레이터 앱에 주입합니다.

앱은 SharedPreferences(= iOS NSUserDefaults)에 저장하므로 plist 를 직접 씁니다.
날짜는 실행 시점 기준으로 만들어, 캡처할 때마다 "오늘"이 맞습니다.

  python3 tools/seed-demo.py            부팅된 기기
  python3 tools/seed-demo.py <UDID>     특정 기기
"""
import datetime
import json
import os
import plistlib
import subprocess
import sys

BUNDLE = "kr.mungcare.app"
UDID = sys.argv[1] if len(sys.argv) > 1 else "booted"

today = datetime.date.today()
now = datetime.datetime.now().isoformat()


def ago(n: int) -> str:
    return (today - datetime.timedelta(days=n)).isoformat()


users = {
    "demo@mungcare.app": {
        "id": "u-demo", "email": "demo@mungcare.app", "nick": "몽이집사",
        "salt": "c2FsdA==", "hash": "x", "createdAt": now,
        "consents": [
            {"doc": d, "version": "1.0 (2026-08-30)", "agreedAt": now, "agreed": True}
            for d in ["age14", "terms", "privacy", "marketing"]
        ],
    }
}

records = {
    "meals": [
        {"id": "m1", "date": ago(0), "name": "오리 사료", "type": "사료",
         "grams": 45, "kcal": 162, "note": ""},
        {"id": "m2", "date": ago(0), "name": "닭가슴살 트릿", "type": "간식",
         "grams": 10, "kcal": 22, "note": "산책 다녀와서"},
        {"id": "m3", "date": ago(1), "name": "오리 사료", "type": "사료",
         "grams": 90, "kcal": 324, "note": ""},
    ],
    "walks": [
        {"id": "k1", "date": ago(0), "minutes": 38, "km": 2.1,
         "weather": "맑음", "poop": "보통", "note": "한강 공원 한 바퀴"},
        {"id": "k2", "date": ago(1), "minutes": 25, "km": 1.3,
         "weather": "흐림", "poop": "보통", "note": ""},
        {"id": "k3", "date": ago(2), "minutes": 42, "km": 2.4,
         "weather": "맑음", "poop": "무름", "note": "친구 만나서 신났어요"},
    ],
    "vaccines": [
        {"id": "v1", "code": "DHPPL", "date": ago(200), "label": "종합백신 (DHPPL)"},
        {"id": "v2", "code": "RABIES", "date": ago(120), "label": "광견병"},
        {"id": "v3", "code": "KC", "date": ago(150), "label": "켄넬코프"},
        {"id": "v4", "code": "HEARTWORM", "date": ago(12), "label": "심장사상충 예방"},
        {"id": "v5", "code": "DEWORM_IN", "date": ago(40), "label": "내부 구충"},
    ],
    "meds": [
        {"id": "md1", "date": ago(0), "name": "하트가드 플러스", "purpose": "심장",
         "dose": "1정", "freq": "월 1회", "stock": 3, "unit": "정", "perDay": 1,
         "clinic": "몽몽동물병원", "note": "밥 먹고 주기", "taken": []},
        {"id": "md2", "date": ago(5), "name": "관절 영양제", "purpose": "관절",
         "dose": "1캡슐", "freq": "1일 1회", "stock": 48, "unit": "정", "perDay": 1,
         "clinic": "", "note": "", "taken": [ago(0)]},
    ],
    "medical": [
        {"id": "mc1", "date": ago(18), "kind": "진료", "title": "자꾸 토해서 갔어요",
         "hospital": "몽몽동물병원", "vet": "김수의", "diagnosis": "급성 위장염",
         "rx": "항구토제 3일분, 처방식 급여", "next": ago(-12), "cost": 78000,
         "note": "물 자주 주고 이틀 지켜보기"},
        {"id": "mc2", "date": ago(190), "kind": "정기검진", "title": "연 1회 건강검진",
         "hospital": "몽몽동물병원", "vet": "", "diagnosis": "이상 없음",
         "rx": "", "next": None, "cost": 150000, "note": ""},
    ],
    "allergies": [
        {"id": "al1", "date": ago(60), "name": "닭고기", "type": "식품",
         "severity": "mid", "symptoms": "발이랑 귀를 엄청 긁어요",
         "action": "급여 중단하고 받아둔 약 먹이기", "diagnosed": "yes"},
        {"id": "al2", "date": ago(30), "name": "집먼지", "type": "환경(꽃가루·집먼지)",
         "severity": "low", "symptoms": "재채기", "action": "환기·청소", "diagnosed": ""},
    ],
    "recipes": [
        {"id": "rc1", "date": ago(3), "title": "닭가슴살 단호박 화식",
         "totalG": 600, "totalKcal": 750, "storage": "냉장 3일",
         "ingredients": "닭가슴살 / 300g\n단호박 / 100g\n브로콜리 / 50g\n당근 / 50g",
         "steps": "1. 닭가슴살을 끓는 물에 삶아요\n2. 채소를 잘게 썰어 함께 쪄요\n3. 식힌 뒤 소분해요",
         "tag": "체중 관리", "note": "엄청 잘 먹어요", "toxic": []},
        {"id": "rc2", "date": ago(12), "title": "소고기 야채죽",
         "totalG": 500, "totalKcal": 600, "storage": "냉동 2주",
         "ingredients": "소고기 / 200g\n양파 / 30g\n애호박 / 80g",
         "steps": "1. 재료를 삶아 곱게 다져요", "tag": "기호성 향상",
         "note": "", "toxic": ["양파"]},
    ],
}

data = {
    "dogs": [{
        "id": "d1", "name": "몽이", "breed": "말티즈",
        "birth": "2019-03-15T00:00:00.000", "sex": "M", "weight": 4.5,
        "neutered": True, "activity": "neutered", "createdAt": now,
    }],
    "weights": {"d1": [
        {"id": "w1", "date": ago(60) + "T10:00:00.000", "kg": 4.9},
        {"id": "w2", "date": ago(30) + "T10:00:00.000", "kg": 4.7},
        {"id": "w3", "date": ago(0) + "T10:00:00.000", "kg": 4.5},
    ]},
    "activeDogId": "d1",
    "records": {"d1": records},
}

container = subprocess.run(
    ["xcrun", "simctl", "get_app_container", UDID, BUNDLE, "data"],
    capture_output=True, text=True, check=True,
).stdout.strip()
path = os.path.join(container, "Library", "Preferences", f"{BUNDLE}.plist")

prefs = {}
if os.path.exists(path):
    with open(path, "rb") as f:
        prefs = plistlib.load(f)
else:
    os.makedirs(os.path.dirname(path), exist_ok=True)

prefs["flutter.mungcare.users"] = json.dumps(users, ensure_ascii=False)
prefs["flutter.mungcare.session"] = "demo@mungcare.app"
prefs["flutter.mungcare.data.u-demo"] = json.dumps(data, ensure_ascii=False)
with open(path, "wb") as f:
    plistlib.dump(prefs, f)

print(f"데모 데이터 주입 완료 → {path}")
