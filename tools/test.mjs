#!/usr/bin/env node
/* 계산 · 저장소 로직 회귀 테스트 — 브라우저 없이 Node에서 실행합니다.
   실행:  node tools/test.mjs                                            */
const mem = new Map();
globalThis.localStorage = {
  getItem: k => mem.has(k) ? mem.get(k) : null,
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: k => mem.delete(k)
};
globalThis.btoa = s => Buffer.from(s, 'binary').toString('base64');
globalThis.atob = s => Buffer.from(s, 'base64').toString('binary');

import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const base = pathToFileURL(join(ROOT, 'assets/js/')).href;
const S = await import(base + 'store.js');
const H = await import(base + 'health.js');
const fs = await import('node:fs/promises');
const BREEDS = JSON.parse(await fs.readFile(join(ROOT, 'data/breeds.json'), 'utf8'));
const VAX = JSON.parse(await fs.readFile(join(ROOT, 'data/vaccines.json'), 'utf8'));

let pass = 0, fail = 0;
const t = (name, cond, extra = '') => { cond ? (pass++, console.log('  ✓', name)) : (fail++, console.log('  ✗', name, extra)); };

console.log('\n[모드]');
t('설정이 비었으면 local 모드', S.MODE === 'local', S.MODE);

console.log('\n[인증]');
const CONSENT = { age14: true, privacy: true };
try { await S.auth.signup({ email: 'noc@test.com', password: 'password123', nick: 'x' }); t('동의 없인 가입 불가', false); }
catch (e) { t('동의 없인 가입 불가', /14세|동의/.test(e.message), e.message); }
const signupResult = await S.auth.signup({ email: 'A@Test.com', password: 'password123', nick: '몽이집사', consent: CONSENT });
t('가입 후 로그인 상태', S.auth.current()?.email === 'a@test.com');
t('로컬 가입은 이메일 인증 불필요', signupResult.needsConfirm === false);
t('동의 이력 저장 (privacy+age14)', S.auth.consents().length === 2
  && S.auth.consents().every(c => c.version === S.PRIVACY_VERSION), JSON.stringify(S.auth.consents()));
t('평문 비밀번호 미저장', !JSON.stringify(S._debug.state()).includes('password123'));
await S.auth.logout();
t('로그아웃', S.auth.current() === null);
try { await S.auth.login({ email: 'a@test.com', password: 'wrongpass1' }); t('오답 거부', false); }
catch { t('오답 거부', true); }
await S.auth.login({ email: 'a@test.com', password: 'password123' });
t('정답 로그인', !!S.auth.current());
try { await S.auth.signup({ email: 'a@test.com', password: 'password123', nick: 'x', consent: CONSENT }); t('중복 가입 차단', false); }
catch { t('중복 가입 차단', true); }

console.log('\n[반려견]');
const birth = H.addDays(H.today(), -Math.round(365.25 * 3));
const dog = S.dogs.add({ name: '몽이', breed: '말티즈', birth, weight: 4.2, neutered: true, activity: 'neutered' });
t('등록/활성화', S.dogs.active()?.id === dog.id);
t('나이 라벨 3년', H.ageLabel(birth).startsWith('3년'), H.ageLabel(birth));
t('사람 나이 환산', H.humanAge(birth, 'toy') === 28, H.humanAge(birth, 'toy'));

console.log('\n[칼로리]');
const rer = H.rer(4.2), mer = H.mer(4.2, 'neutered');
t('RER ≈ 205', Math.abs(rer - 70 * Math.pow(4.2, .75)) < .001 && Math.round(rer) === 205, Math.round(rer));
t('MER = RER×1.6', Math.abs(mer - rer * 1.6) < .001);
t('급여량(3600kcal/kg)', Math.round(H.gramsPerDay(mer, 3600)) === 91, Math.round(H.gramsPerDay(mer, 3600)));

console.log('\n[접종 스케줄]');
const v = S.col('vaccines', dog.id);
let plan = H.vaccinePlan(dog, v.raw(), VAX);
const dhppl = plan.find(p => p.code === 'DHPPL');
t('성견+무기록은 기한 초과 대신 이력 등록 안내', dhppl.needsHistory === true && dhppl.due === null && dhppl.overdue === false,
  JSON.stringify({ due: dhppl.due, overdue: dhppl.overdue }));
const pupBirth = H.addDays(H.today(), -70);
const pupPlan = H.vaccinePlan({ birth: pupBirth }, [], VAX).find(p => p.code === 'DHPPL');
t('퍼피 기초 1차는 생후 6주', pupPlan.due === H.addDays(pupBirth, 42), pupPlan.due);
t('생후 70일 무접종은 기한 초과', pupPlan.overdue === true && !pupPlan.needsHistory);
const partial = H.vaccinePlan(dog, [{ code: 'DHPPL', date: H.addDays(H.today(), -100) }], VAX).find(p => p.code === 'DHPPL');
t('성견+일부 기록은 연간 추가 접종으로', partial.stage === '연간 추가 접종' && partial.due === H.addDays(H.addDays(H.today(), -100), 365), partial.due);
[6, 8, 10, 12, 14].forEach((w, i) => v.add({ code: 'DHPPL', date: H.addDays(birth, w * 7), label: '종합백신' }));
plan = H.vaccinePlan(dog, v.raw(), VAX);
const d2 = plan.find(p => p.code === 'DHPPL');
t('5차 완료 인식', d2.count === 5 && d2.stage === '연간 추가 접종');
t('마지막+365일이 다음 예정', d2.due === H.addDays(H.addDays(birth, 98), 365), d2.due);

console.log('\n[구충 주기]');
v.add({ code: 'HEARTWORM', date: H.addDays(H.today(), -10), label: '심장사상충' });
const prev = H.preventivePlan(v.raw(), VAX);
const hw = prev.find(p => p.code === 'HEARTWORM');
t('30일 주기 → D-20', hw.dday === 20 && !hw.overdue, hw.dday);
t('미기록 항목은 overdue', prev.find(p => p.code === 'DEWORM_IN').overdue === true);

console.log('\n[견종 위험 엔진]');
const r = H.riskList(BREEDS, dog);
t('말티즈 매칭', r.breed.name === '말티즈');
t('3세 → 슬개골 활성', r.now.some(x => x.cond.includes('슬개골')));
t('기관허탈(5세~)은 예보', r.later.some(x => x.cond.includes('기관 허탈')), JSON.stringify(r.later.map(x=>x.cond)));
t('생애주기=성견', r.stage.key === 'adult');
const pup = { breed: '요크셔테리어', birth: H.addDays(H.today(), -100) };
t('퍼피 저혈당 활성', H.riskList(BREEDS, pup).now.some(x => x.cond.includes('저혈당')));
t('미등록 견종 → 믹스견 폴백', H.riskList(BREEDS, { breed: '코카스파니엘', birth }).breed.name.startsWith('믹스견'));

console.log('\n[알림 엔진]');
const meds = S.col('meds', dog.id);
meds.add({ name: '심장약', stock: 3, perDay: 1, active: true });
const w = S.col('weights', dog.id);
w.add({ date: H.addDays(H.today(), -30), kg: 4.2 }); w.add({ date: H.today(), kg: 5.1 });
const alerts = H.buildAlerts({ dog, vax: plan, prev, meds: meds.raw(), weights: w.raw(), allergies: [], walks: [] });
t('재고 부족 알림', alerts.some(a => a.title.includes('재고 부족')));
t('체중 급변 알림', alerts.some(a => a.title.includes('체중')));
t('bad가 상위 정렬', alerts[0].level === 'bad');
t('무기록 접종은 info 안내 1건으로 묶임 (기한 초과 아님)',
  alerts.filter(a => a.title.includes('접종 이력')).length === 1
  && !alerts.some(a => a.level === 'bad' && a.title.includes('코로나')));

console.log('\n[커뮤니티/백업]');
S.community.post({ kind: 'free', title: '안녕하세요', body: '반갑습니다' });
const p0 = S.community.posts()[0];
S.community.comment(p0.id, '환영합니다');
S.community.toggleLike(p0.id);
t('글/댓글/좋아요', S.community.posts()[0].comments.length === 1 && S.community.posts()[0].likeCount === 1 && S.community.posts()[0].liked === true);
S.community.review('brush-slicker', { stars: 5, body: '좋아요' });
S.community.review('brush-slicker', { stars: 4, body: '수정' });
t('평가는 1인 1건 갱신', S.community.score('brush-slicker').n === 1 && S.community.score('brush-slicker').avg === 4);
const json = S.backup.export();
t('백업 형식 v2', JSON.parse(json).kind === 'mungcare-backup' && JSON.parse(json).version === 2);
S.dogs.remove(dog.id);
t('삭제 확인', S.dogs.all().length === 0);
S.backup.import(json);
t('백업 복원', S.dogs.all().length === 1 && S.dogs.all()[0].name === '몽이');

console.log('\n[제안 · 추천 · 별점]');
const sg = S.community.post({ kind: 'suggest', title: '주말 산책 모임 어때요?', body: '한강에서 만나요' });
S.community.rate(sg.id, 5);
S.community.rate(sg.id, 4);   // 같은 사람이 다시 누르면 갱신
const sg2 = S.community.get(sg.id);
t('별점은 1인 1표 갱신', sg2.ratingCount === 1 && sg2.ratingAvg === 4 && sg2.myStars === 4,
  JSON.stringify({ n: sg2.ratingCount, avg: sg2.ratingAvg, my: sg2.myStars }));
S.community.toggleLike(sg.id);
t('제안 추천(👍) 집계', S.community.get(sg.id).likeCount === 1);

console.log('\n[대화창]');
S.community.chatSend('안녕하세요, 몽이 집사예요!');
t('대화 전송', S.community.chat().length === 1 && S.community.chat()[0].body.includes('몽이'));
try { S.community.chatSend('x'.repeat(501)); t('500자 제한', false); } catch { t('500자 제한', true); }
S.community.chatRemove(S.community.chat()[0].id);
t('내 대화 삭제', S.community.chat().length === 0);

console.log('\n[파트너]');
await S.auth.logout();
try {
  await S.auth.signupPartner({ email: 'vet@test.com', password: 'password123',
    business: { kind: 'hospital', name: '몽몽동물병원', bizNo: '123-45-67890' }, consent: CONSENT });
  t('파트너 약관 미동의 거부', false);
} catch (e) { t('파트너 약관 미동의 거부', e.message.includes('파트너'), e.message); }
try {
  await S.auth.signupPartner({ email: 'bad@test.com', password: 'password123',
    business: { kind: 'store', name: '가게', bizNo: '12-345' },
    consent: { ...CONSENT, partnerTerms: true } });
  t('사업자번호 형식 검증', false);
} catch (e) { t('사업자번호 형식 검증', e.message.includes('사업자등록번호'), e.message); }
await S.auth.signupPartner({ email: 'vet@test.com', password: 'password123',
  business: { kind: 'hospital', name: '몽몽동물병원', bizNo: '123-45-67890', region: '서울' },
  consent: { ...CONSENT, partnerTerms: true } });
const myBiz = S.partners.mine();
t('파트너 가입 · 디렉터리 등록', S.partners.list().length === 1 && myBiz?.name === '몽몽동물병원' && myBiz.verified === false);
t('파트너 동의 이력 3건', S.auth.consents().length === 3 && S.auth.consents().some(c => c.doc === 'partner_terms'));
try { S.partners.review(myBiz.id, { stars: 5, body: '셀프 칭찬' }); t('내 업체 후기 차단', false); }
catch { t('내 업체 후기 차단', true); }
await S.auth.login({ email: 'a@test.com', password: 'password123' });
S.partners.review(myBiz.id, { stars: 5, body: '친절하고 꼼꼼해요' });
S.partners.review(myBiz.id, { stars: 4, body: '수정' });
t('업체 별점도 1인 1건 갱신', S.partners.score(myBiz.id).n === 1 && S.partners.score(myBiz.id).avg === 4);
t('업종 필터', S.partners.list('hospital').length === 1 && S.partners.list('store').length === 0);

console.log('\n[식별자]');
t('레코드 id 가 UUID 형식', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(S.uid()), S.uid());


console.log('\n[클라우드 컬럼 매핑]');
const C = await import(base + 'drivers/cloud.js');
const dogRow = C.toRow('dogs', C.clean({
  id: 'x', dogId: null, userId: 'u1', name: '몽이', adoptedAt: '2024-01-02',
  foodName: '연어', foodKcal: '3700', mealsPerDay: '2', foodNote: '', weight: '4.2', notes: '메모'
}));
t('dogs: camelCase → snake_case', dogRow.adopted_at === '2024-01-02' && dogRow.food_name === '연어'
   && dogRow.meals_per_day === 2 && dogRow.food_kcal === 3700, JSON.stringify(dogRow));
t('dogs: 빈 문자열은 null 로', dogRow.food_note === null);
t('dogs: 숫자 문자열은 숫자로', typeof dogRow.weight === 'number' && dogRow.weight === 4.2);
t('dogs: 매핑 없는 필드는 그대로', dogRow.name === '몽이' && dogRow.notes === '메모');

const medRow = C.toRow('meds', C.clean({ id: 'm', name: '심장약', perDay: '1', stock: '30', from: '2026-01-01' }));
t('meds: perDay → per_day', medRow.per_day === 1 && medRow.stock === 30 && medRow.from === '2026-01-01');

const recRow = C.toRow('recipes', C.clean({ title: '화식', totalG: '600', totalKcal: '750', toxic: [] }));
t('recipes: totalG/totalKcal → total_g/total_kcal', recRow.total_g === 600 && recRow.total_kcal === 750);

const alRow = C.toRow('allergies', C.clean({ name: '닭고기', foundAt: '2025-05-05', severity: 'high' }));
t('allergies: foundAt → found_at', alRow.found_at === '2025-05-05');

// 왕복 변환이 원본을 보존하는지
const back = C.fromRow('dogs', dogRow);
t('왕복 변환 보존', back.adoptedAt === '2024-01-02' && back.foodName === '연어'
   && back.mealsPerDay === 2 && back.name === '몽이', JSON.stringify(back));

const walkBack = C.fromRow('walks', { id: 'w', dog_id: 'd1', user_id: 'u1', date: '2026-08-19', minutes: 30, created_at: 'ts' });
t('walks 왕복', walkBack.dogId === 'd1' && walkBack.userId === 'u1' && walkBack.createdAt === 'ts');

const postRow = C.toRow('posts', C.clean({ id: 'p1', userId: 'u1', kind: 'free', title: 'ㅎㅇ', body: '본문', tags: ['a'], productId: 'brush-slicker' }));
t('posts: productId → product_id', postRow.product_id === 'brush-slicker' && postRow.user_id === 'u1'
   && !('productId' in postRow) && !('userId' in postRow), JSON.stringify(postRow));

const cmtRow = C.toRow('comments', C.clean({ id: 'c1', postId: 'p1', userId: 'u1', body: '댓글' }));
t('comments: postId → post_id', cmtRow.post_id === 'p1' && cmtRow.user_id === 'u1' && !('postId' in cmtRow));

// 앱이 실제로 보내는 키가 전부 snake_case 인지 (컬럼 오류 예방)
const camel = o => Object.keys(o).filter(k => /[A-Z]/.test(k));
t('전송 키에 camelCase 잔존 없음',
  [dogRow, medRow, recRow, alRow, postRow, cmtRow].every(r => camel(r).length === 0),
  JSON.stringify([dogRow, medRow, recRow, alRow, postRow, cmtRow].flatMap(camel)));

t('오류 메시지 한국어화', C.translate('Invalid login credentials').includes('맞지 않아요')
   && C.translate('Email not confirmed').includes('인증'));
t('모르는 오류는 원문 유지', C.translate('something odd') === 'something odd');

console.log('\n[화식 위험 재료]');
const R = await import(base + 'views/recipes.js');
t('양파 감지', R.checkToxic('닭가슴살 300g, 양파 50g').length === 1);
t('자일리톨 감지', R.checkToxic('자일리톨 껌').length === 1);
t('안전 재료 통과', R.checkToxic('닭가슴살 / 단호박 / 브로콜리').length === 0);

console.log(`\n결과: ${pass} 통과 / ${fail} 실패\n`);
process.exit(fail ? 1 : 0);
