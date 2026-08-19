/* icons.js — 손그림(두들) 스타일 SVG 아이콘 세트
   모든 아이콘은 문자열로 반환되며 currentColor 를 따릅니다.
   견종 아이콘은 공통 얼굴 골격에 귀 모양·털결·색만 바꿔 끼우는 방식이라
   새 견종을 추가할 때 BREEDS 항목 한 줄만 늘리면 됩니다. */

const INK = '#3b3129';

/* ── 귀 모양 ──────────────────────────────────────────────── */
const EARS = {
  // 길게 늘어진 귀 — 말티즈 · 꼬통 드 툴레아 · 시츄
  longFloppy: (c, s) => `
    <path d="M17 27c-6 1-9 7-8.5 14 .4 6 3.6 10 7 9.6 3.4-.4 5-4.6 4.6-10.4C19.8 34.4 19.4 30 17 27z" fill="${c}" stroke="${INK}" stroke-width="2.1" stroke-linejoin="round"/>
    <path d="M47 27c6 1 9 7 8.5 14-.4 6-3.6 10-7 9.6-3.4-.4-5-4.6-4.6-10.4.3-5.8.7-10.2 3.1-13.2z" fill="${c}" stroke="${INK}" stroke-width="2.1" stroke-linejoin="round"/>
    <path d="M13 36c-1.4 3.6-1.6 7.6-1 10.6" stroke="${s}" stroke-width="1.8" stroke-linecap="round" fill="none"/>
    <path d="M51 36c1.4 3.6 1.6 7.6 1 10.6" stroke="${s}" stroke-width="1.8" stroke-linecap="round" fill="none"/>`,

  // 곱슬 뭉치 귀 — 비숑 · 푸들
  curlyFloppy: (c, s) => `
    <path d="M16 26c-6.4-.6-10.6 4.4-10 11 .6 6.4 5 10.4 9.8 9 4.6-1.4 5.8-6 4.6-11.6C19.4 30.6 18.6 26.2 16 26z" fill="${c}" stroke="${INK}" stroke-width="2.1" stroke-linejoin="round"/>
    <path d="M48 26c6.4-.6 10.6 4.4 10 11-.6 6.4-5 10.4-9.8 9-4.6-1.4-5.8-6-4.6-11.6.6-3.8 1.4-8.2 4.4-8.4z" fill="${c}" stroke="${INK}" stroke-width="2.1" stroke-linejoin="round"/>
    <path d="M9.5 34.5c1.6.6 2.2 2.4 1.2 3.8M10.4 41c1.7.2 2.7 1.8 2.1 3.4" stroke="${s}" stroke-width="1.7" stroke-linecap="round" fill="none"/>
    <path d="M54.5 34.5c-1.6.6-2.2 2.4-1.2 3.8M53.6 41c-1.7.2-2.7 1.8-2.1 3.4" stroke="${s}" stroke-width="1.7" stroke-linecap="round" fill="none"/>`,

  // 쫑긋 선 귀 — 포메라니안 · 시바 · 코기 · 스피츠
  pointy: (c, s) => `
    <path d="M19 25 13.5 9.5c-.4-1.2.8-2.2 1.9-1.6L28 15.4z" fill="${c}" stroke="${INK}" stroke-width="2.1" stroke-linejoin="round"/>
    <path d="M45 25 50.5 9.5c.4-1.2-.8-2.2-1.9-1.6L36 15.4z" fill="${c}" stroke="${INK}" stroke-width="2.1" stroke-linejoin="round"/>
    <path d="M19.4 22 16 12.6l6.6 4z" fill="${s}" stroke="none"/>
    <path d="M44.6 22 48 12.6l-6.6 4z" fill="${s}" stroke="none"/>`,

  // 둥글게 접힌 귀 — 비글 · 리트리버 · 코커
  roundFloppy: (c, s) => `
    <path d="M16 24c-5.6 1.4-8 8-6.2 15.4C11.6 46.8 16 50.4 19.6 48.6 23.2 46.8 23 41 21.4 34.6 20 29 18.6 24.6 16 24z" fill="${c}" stroke="${INK}" stroke-width="2.1" stroke-linejoin="round"/>
    <path d="M48 24c5.6 1.4 8 8 6.2 15.4C52.4 46.8 48 50.4 44.4 48.6 40.8 46.8 41 41 42.6 34.6 44 29 45.4 24.6 48 24z" fill="${c}" stroke="${INK}" stroke-width="2.1" stroke-linejoin="round"/>
    <path d="M12.6 32.6c-.6 3.6-.2 7 .8 9.6" stroke="${s}" stroke-width="1.8" stroke-linecap="round" fill="none"/>
    <path d="M51.4 32.6c.6 3.6.2 7-.8 9.6" stroke="${s}" stroke-width="1.8" stroke-linecap="round" fill="none"/>`,

  // 작고 살짝 접힌 귀 — 프렌치불독(박쥐귀) · 슈나우저
  bat: (c, s) => `
    <path d="M18 24c-4.6-2-8.4.6-8.8 6.2-.4 5.4 2.6 9.4 6.6 9.6 3.8.2 5.4-3.2 5-8C20.4 27.6 20 24.8 18 24z" fill="${c}" stroke="${INK}" stroke-width="2.1" stroke-linejoin="round"/>
    <path d="M46 24c4.6-2 8.4.6 8.8 6.2.4 5.4-2.6 9.4-6.6 9.6-3.8.2-5.4-3.2-5-8 .4-4.2.8-7 2.8-7.8z" fill="${c}" stroke="${INK}" stroke-width="2.1" stroke-linejoin="round"/>
    <path d="M14.6 29.4c-.8 2.6-.6 5.4.4 7.2" stroke="${s}" stroke-width="1.7" stroke-linecap="round" fill="none"/>
    <path d="M49.4 29.4c.8 2.6.6 5.4-.4 7.2" stroke="${s}" stroke-width="1.7" stroke-linecap="round" fill="none"/>`
};

/* ── 머리 위 털결 ────────────────────────────────────────── */
const TOPS = {
  none: () => '',
  // 비숑 특유의 둥근 파우더퍼프
  puff: (c, s) => `
    <path d="M20 18c-1-4 2-7 5.4-6.2C26.6 8 31 6.6 34 8.6 37.2 6.4 42 8 42.6 12c3.4.4 5 4 3.4 7z" fill="${c}" stroke="${INK}" stroke-width="2.1" stroke-linejoin="round"/>
    <path d="M25 14.6c1 .8 1.2 2.2.4 3.2M33 12c1.1.7 1.5 2.1.8 3.2M40 14.4c1 .8 1.2 2.2.4 3.2" stroke="${s}" stroke-width="1.7" stroke-linecap="round" fill="none"/>`,
  // 푸들 톱노트
  topknot: (c, s) => `
    <path d="M22 19c-2-4.6 1-9 6-8.6 1.6-3.4 6.6-4 9-1 3.4-1.4 7 1 6.8 4.6 3.2 1.4 3.6 5.6.6 7.4z" fill="${c}" stroke="${INK}" stroke-width="2.1" stroke-linejoin="round"/>
    <path d="M27 14c.9.8 1 2.1.2 3M35 11.8c1 .7 1.2 2 .4 2.9M41.6 15c.9.8 1 2.1.2 3" stroke="${s}" stroke-width="1.7" stroke-linecap="round" fill="none"/>`,
  // 앞머리 가르마 — 말티즈 · 시츄
  bangs: (c, s) => `
    <path d="M32 16c-5.6 0-10 3-11.6 7.6 3.4-2 7-2.6 11.6-2.6s8.2.6 11.6 2.6C42 19 37.6 16 32 16z" fill="${c}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
    <path d="M32 17.4v4" stroke="${s}" stroke-width="1.7" stroke-linecap="round"/>`,
  // 코튼 특유의 솜털
  cotton: (c, s) => `
    <path d="M19 21c-1.6-3.8 1-7.4 4.8-7 1.4-3.4 6-4.4 8.6-1.8 2.6-2.8 7.4-1.8 8.8 1.8 3.8-.4 6.4 3.2 4.8 7z" fill="${c}" stroke="${INK}" stroke-width="2.1" stroke-linejoin="round"/>
    <path d="M24 16.4c1 .6 1.4 1.9.8 3M32 14.4c1.1.5 1.6 1.8 1 2.9M39.6 16.4c1 .6 1.4 1.9.8 3" stroke="${s}" stroke-width="1.6" stroke-linecap="round" fill="none"/>`,
  // 슈나우저 눈썹
  brows: (c, s) => `
    <path d="M20 24c1.6-3 5-4 7.6-2.4M44 24c-1.6-3-5-4-7.6-2.4" stroke="${INK}" stroke-width="2.4" stroke-linecap="round" fill="none"/>`
};

/* ── 주둥이 ──────────────────────────────────────────────── */
const MUZZLES = {
  // 기본 — 짧고 동그란 주둥이
  round: (c) => `
    <ellipse cx="32" cy="41" rx="11" ry="8.4" fill="${c}" stroke="${INK}" stroke-width="2" />`,
  // 단두종 — 넓고 납작
  flat: (c) => `
    <ellipse cx="32" cy="42" rx="13" ry="7.4" fill="${c}" stroke="${INK}" stroke-width="2" />`,
  // 장두종 — 길쭉
  long: (c) => `
    <ellipse cx="32" cy="43" rx="9.6" ry="9.6" fill="${c}" stroke="${INK}" stroke-width="2" />`,
  // 수염 있는 주둥이 — 슈나우저
  beard: (c) => `
    <path d="M21 38c0 9 4.6 15 11 15s11-6 11-15c0-4-4.6-6-11-6s-11 2-11 6z" fill="${c}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`
};

/**
 * 견종 아이콘 SVG 생성
 * fur: 얼굴 색 / shade: 결 표현용 그림자색 / muzzleFur: 주둥이 색
 */
function dogFace({ fur, shade, muzzleFur, ear, top, muzzle, tongue = false, patch = null }) {
  const m = muzzleFur || '#fffdfa';
  return `
  <g stroke-linecap="round">
    ${EARS[ear](fur, shade)}
    <path d="M32 15c-11.4 0-19.4 7.4-19.4 18.4C12.6 45 20.6 53.4 32 53.4S51.4 45 51.4 33.4C51.4 22.4 43.4 15 32 15z"
          fill="${fur}" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>
    ${patch || ''}
    ${TOPS[top](fur, shade)}
    ${MUZZLES[muzzle](m)}
    <ellipse cx="24.6" cy="33.4" rx="2.5" ry="2.9" fill="${INK}"/>
    <ellipse cx="39.4" cy="33.4" rx="2.5" ry="2.9" fill="${INK}"/>
    <circle cx="25.5" cy="32.3" r=".95" fill="#fff"/>
    <circle cx="40.3" cy="32.3" r=".95" fill="#fff"/>
    <path d="M28.6 38.6c0-1.9 1.5-3.1 3.4-3.1s3.4 1.2 3.4 3.1c0 1.6-1.5 2.8-3.4 2.8s-3.4-1.2-3.4-2.8z" fill="${INK}"/>
    <path d="M32 41.4v2.4" stroke="${INK}" stroke-width="1.8"/>
    <path d="M32 43.8c-1.4 2-4.4 1.8-5.2-.4M32 43.8c1.4 2 4.4 1.8 5.2-.4" stroke="${INK}" stroke-width="1.9" fill="none"/>
    ${tongue ? `<path d="M30.6 46.4c0 2 .7 3.4 1.5 3.4s1.5-1.4 1.5-3.4z" fill="#ef8f96" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/>` : ''}
    <ellipse cx="18.8" cy="39.4" rx="3" ry="2" fill="#f4b3ae" opacity=".62"/>
    <ellipse cx="45.2" cy="39.4" rx="3" ry="2" fill="#f4b3ae" opacity=".62"/>
  </g>`;
}

/* ── 견종 정의 ───────────────────────────────────────────── */
export const BREED_ICONS = {
  bichon:      { label: '비숑 프리제',      fur: '#fffdf9', shade: '#e3dace', ear: 'curlyFloppy', top: 'puff',    muzzle: 'round' },
  maltese:     { label: '말티즈',           fur: '#fffefb', shade: '#e6ddd0', ear: 'longFloppy',  top: 'bangs',   muzzle: 'round' },
  poodle:      { label: '푸들 (애프리콧)',  fur: '#eecfa6', shade: '#d1ab7c', ear: 'curlyFloppy', top: 'topknot', muzzle: 'long' },
  poodleCream: { label: '크림 푸들',        fur: '#f8eeda', shade: '#e0cfae', ear: 'curlyFloppy', top: 'topknot', muzzle: 'long' },
  poodleBlack: { label: '푸들 (블랙)',      fur: '#4b4139', shade: '#6d6055', ear: 'curlyFloppy', top: 'topknot', muzzle: 'long', muzzleFur: '#5c5049' },
  coton:       { label: '꼬통 드 툴레아',   fur: '#fffdf6', shade: '#e7dfce', ear: 'longFloppy',  top: 'cotton',  muzzle: 'round' },
  pomeranian:  { label: '포메라니안',       fur: '#f0bd7c', shade: '#d29a56', ear: 'pointy',      top: 'none',    muzzle: 'round', tongue: true },
  shihtzu:     { label: '시츄',             fur: '#f3e3c8', shade: '#d8c19c', ear: 'longFloppy',  top: 'bangs',   muzzle: 'flat' },
  yorkshire:   { label: '요크셔테리어',     fur: '#a8874f', shade: '#7d6437', ear: 'pointy',      top: 'bangs',   muzzle: 'round',
                 patch: `<path d="M32 15c-8 0-14.2 3.8-17.2 10 4.4 2.6 10.4 4 17.2 4s12.8-1.4 17.2-4C46.2 18.8 40 15 32 15z" fill="#5b4a33" stroke="none"/>` },
  chihuahua:   { label: '치와와',           fur: '#e8c79c', shade: '#c8a273', ear: 'pointy',      top: 'none',    muzzle: 'long' },
  schnauzer:   { label: '미니어처 슈나우저', fur: '#a9a49c', shade: '#847f77', ear: 'bat',         top: 'brows',   muzzle: 'beard', muzzleFur: '#ddd8cf' },
  frenchie:    { label: '프렌치불독',       fur: '#c9c2b6', shade: '#a49c8e', ear: 'bat',         top: 'none',    muzzle: 'flat',  tongue: true },
  corgi:       { label: '웰시코기',         fur: '#e5a961', shade: '#c1873f', ear: 'pointy',      top: 'none',    muzzle: 'round', tongue: true,
                 patch: `<path d="M32 15c-4 0-7.6 1-10.4 2.8 2.6 6 6 9.6 10.4 9.6s7.8-3.6 10.4-9.6C39.6 16 36 15 32 15z" fill="#fffdf7" stroke="none"/>` },
  shiba:       { label: '시바이누',         fur: '#e39f52', shade: '#bd7c33', ear: 'pointy',      top: 'none',    muzzle: 'round',
                 patch: `<path d="M32 27c-5 0-9 2.4-10.8 6.4 3.2 1.4 6.8 2.2 10.8 2.2s7.6-.8 10.8-2.2C41 29.4 37 27 32 27z" fill="#fffdf7" stroke="none"/>` },
  jindo:       { label: '진돗개',           fur: '#f0e2cb', shade: '#cdb894', ear: 'pointy',      top: 'none',    muzzle: 'long' },
  beagle:      { label: '비글',             fur: '#e6c48f', shade: '#c19c62', ear: 'roundFloppy', top: 'none',    muzzle: 'long',
                 patch: `<path d="M32 15c-7 0-12.6 3-16 8 4.6 1.8 10 2.8 16 2.8s11.4-1 16-2.8c-3.4-5-9-8-16-8z" fill="#7b5a3a" stroke="none"/>` },
  retriever:   { label: '골든리트리버',     fur: '#efc784', shade: '#cfa159', ear: 'roundFloppy', top: 'none',    muzzle: 'long',  tongue: true },
  labrador:    { label: '래브라도리트리버', fur: '#e0d5bf', shade: '#bcae91', ear: 'roundFloppy', top: 'none',    muzzle: 'long',  tongue: true },
  dachshund:   { label: '닥스훈트',         fur: '#b0743d', shade: '#8b551f', ear: 'roundFloppy', top: 'none',    muzzle: 'long' },
  samoyed:     { label: '사모예드',         fur: '#fffdf8', shade: '#e2dacb', ear: 'pointy',      top: 'none',    muzzle: 'round', tongue: true },
  spitz:       { label: '스피츠',           fur: '#fffefa', shade: '#e5ddcf', ear: 'pointy',      top: 'none',    muzzle: 'round' },
  border:      { label: '보더콜리',         fur: '#3f3a35', shade: '#5f584f', ear: 'roundFloppy', top: 'none',    muzzle: 'long',  muzzleFur: '#fffdf7',
                 patch: `<path d="M32 15c-3.4 0-6.6.7-9.2 2 2.2 7.4 5.4 11.6 9.2 11.6s7-4.2 9.2-11.6c-2.6-1.3-5.8-2-9.2-2z" fill="#fffdf7" stroke="none"/>` },
  jackrussell: { label: '잭러셀테리어',     fur: '#fffdf7', shade: '#e4dbcb', ear: 'roundFloppy', top: 'none',    muzzle: 'long',
                 patch: `<path d="M20 22c-3.4 2.6-5.6 6.6-6.2 11.4 3.4 1.6 7 1 9.4-1.6z" fill="#c08a4e" stroke="none"/>` },
  mix:         { label: '믹스견 / 기타',    fur: '#e9d9c0', shade: '#c8b394', ear: 'roundFloppy', top: 'none',    muzzle: 'round', tongue: true }
};

/** 견종 아이콘 SVG 문자열 */
export function dogIcon(key, size = 44) {
  const spec = BREED_ICONS[key] || BREED_ICONS.mix;
  return `<svg class="dg" viewBox="0 0 64 64" width="${size}" height="${size}" role="img" aria-label="${spec.label}">${dogFace(spec)}</svg>`;
}

/** data/breeds.json 의 견종명 → 아이콘 키 매핑 */
const NAME_MAP = [
  ['비숑', 'bichon'], ['말티즈', 'maltese'], ['꼬통', 'coton'], ['코튼', 'coton'],
  ['푸들', 'poodle'], ['포메', 'pomeranian'], ['시츄', 'shihtzu'], ['요크', 'yorkshire'],
  ['치와와', 'chihuahua'], ['슈나우저', 'schnauzer'], ['프렌치', 'frenchie'], ['코기', 'corgi'],
  ['시바', 'shiba'], ['진돗개', 'jindo'], ['비글', 'beagle'], ['골든', 'retriever'],
  ['래브라도', 'labrador'], ['닥스', 'dachshund'], ['사모예드', 'samoyed'], ['스피츠', 'spitz'],
  ['보더', 'border'], ['잭러셀', 'jackrussell']
];
export function iconKeyForBreed(breedName) {
  if (!breedName) return 'mix';
  for (const [needle, key] of NAME_MAP) if (breedName.includes(needle)) return key;
  return 'mix';
}

/* ── UI 두들 아이콘 ──────────────────────────────────────── */
const ui = (body, sw = 2) =>
  `<svg class="di" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}"
        stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

export const ICONS = {
  home:    ui(`<path d="M3.4 11.2 12 4.1l8.6 7.1"/><path d="M5.4 10.6v8.1c0 .7.6 1.3 1.3 1.3h10.6c.7 0 1.3-.6 1.3-1.3v-8.1"/><path d="M9.6 20v-4.6c0-.7.6-1.2 1.3-1.2h2.2c.7 0 1.3.5 1.3 1.2V20"/>`),
  dog:     ui(`<path d="M6.6 6.2 5 2.9c-.2-.4.2-.9.6-.7l3.6 1.9"/><path d="M17.4 6.2 19 2.9c.2-.4-.2-.9-.6-.7l-3.6 1.9"/><path d="M12 3.9c-3.9 0-6.6 2.7-6.6 6.6 0 4.2 2.8 7.4 6.6 7.4s6.6-3.2 6.6-7.4c0-3.9-2.7-6.6-6.6-6.6z"/><path d="M9.6 10.1v.9M14.4 10.1v.9"/><path d="M12 12.9c-.9 1.2-2.6 1-3-.3M12 12.9c.9 1.2 2.6 1 3-.3"/>`),
  stethos: ui(`<path d="M5.4 3v4.2c0 2.2 1.6 3.9 3.6 3.9s3.6-1.7 3.6-3.9V3"/><path d="M4 3h2.6M11.2 3h2.6"/><path d="M9 11.1v2.4c0 3 2.4 5.4 5.3 5.4 2.5 0 4.5-1.9 4.5-4.3"/><circle cx="18.8" cy="12.6" r="2.1"/>`),
  bowl:    ui(`<path d="M2.9 10.6h18.2c0 4.6-3.2 8-9.1 8s-9.1-3.4-9.1-8z"/><path d="M6.1 10.4c-.6-2.6 1.4-4.6 3.5-3.9.6-1.9 3.2-2.4 4.4-.9 1.6-.9 3.6.2 3.7 2 1.5.5 1.9 2.2 1.3 2.8"/>`),
  chef:    ui(`<path d="M7.4 12.4c-2.3-.5-3.7-2.3-3.2-4.4.4-1.9 2.3-3 4.1-2.5C8.7 3.5 10.4 2.4 12 2.4s3.3 1.1 3.7 3.1c1.8-.5 3.7.6 4.1 2.5.5 2.1-.9 3.9-3.2 4.4"/><path d="M7.4 12.4h9.2v6.4c0 .7-.6 1.3-1.3 1.3H8.7c-.7 0-1.3-.6-1.3-1.3z"/><path d="M7.6 15.9h8.8"/>`),
  pill:    ui(`<rect x="2.6" y="9" width="18.8" height="6.4" rx="3.2" transform="rotate(-32 12 12.2)"/><path d="M9.1 7.6 14.9 16"/>`),
  paw:     ui(`<ellipse cx="6.4" cy="9.4" rx="2.1" ry="2.6" transform="rotate(-18 6.4 9.4)"/><ellipse cx="10.7" cy="6.4" rx="2" ry="2.6"/><ellipse cx="15.5" cy="6.6" rx="2" ry="2.6" transform="rotate(12 15.5 6.6)"/><ellipse cx="19" cy="10.2" rx="2.1" ry="2.5" transform="rotate(26 19 10.2)"/><path d="M12.6 11.4c3.2 0 5.7 2.3 5.7 5 0 2.2-1.8 3.6-4 3.6-1.1 0-1.6-.4-2.8-.4s-1.7.4-2.8.4c-2.2 0-3.9-1.4-3.9-3.6 0-2.7 2.6-5 5.7-5z"/>`),
  syringe: ui(`<path d="M20.8 3.2 17.4 6.6"/><path d="M18.9 5.1 15 1.9"/><path d="m14.6 6.1 3.3 3.3-8.2 8.2-4.4 1.1 1.1-4.4z"/><path d="m11.8 8.9 3.3 3.3M9.4 11.3l3.3 3.3"/><path d="m5.3 18.7-2.6 2.6"/>`),
  hospital:ui(`<path d="M3.7 20.3V8.4L12 3.1l8.3 5.3v11.9"/><path d="M2.6 20.3h18.8"/><path d="M12 8.8v5M9.5 11.3h5"/><path d="M9.4 20.3v-3.8h5.2v3.8"/>`),
  alert:   ui(`<path d="M12 3.3c.5 0 1 .3 1.2.8l7.5 13.6c.5.9-.1 2-1.2 2H4.5c-1.1 0-1.7-1.1-1.2-2l7.5-13.6c.2-.5.7-.8 1.2-.8z"/><path d="M12 9.1v4.3M12 16.6v.1"/>`),
  cart:    ui(`<path d="M2.6 3.4h2.5l2.4 10.9c.1.6.7 1.1 1.3 1.1h9.1c.6 0 1.2-.5 1.3-1.1l1.4-6.6H6.2"/><circle cx="9.4" cy="19.2" r="1.5"/><circle cx="17.4" cy="19.2" r="1.5"/>`),
  chat:    ui(`<path d="M20.6 12.3c0 4-3.9 7.2-8.6 7.2-1 0-2-.2-2.9-.4l-5 1.6 1.7-4.2c-1.4-1.2-2.3-2.9-2.3-4.8 0-4 3.9-7.2 8.6-7.2s8.5 3.2 8.5 7.2z"/><path d="M8.6 11.9h.1M12 11.9h.1M15.4 11.9h.1"/>`),
  gear:    ui(`<circle cx="12" cy="12" r="3.1"/><path d="M19.6 14.6a1.6 1.6 0 0 0 .3 1.8l.1.1a1.9 1.9 0 1 1-2.7 2.7l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5v.2a1.9 1.9 0 1 1-3.8 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a1.9 1.9 0 1 1-2.7-2.7l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1h-.2a1.9 1.9 0 1 1 0-3.8h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a1.9 1.9 0 1 1 2.7-2.7l.1.1a1.6 1.6 0 0 0 1.8.3h.1a1.6 1.6 0 0 0 1-1.5v-.2a1.9 1.9 0 1 1 3.8 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a1.9 1.9 0 1 1 2.7 2.7l-.1.1a1.6 1.6 0 0 0-.3 1.8v.1a1.6 1.6 0 0 0 1.5 1h.2a1.9 1.9 0 1 1 0 3.8h-.1a1.6 1.6 0 0 0-1.5 1z"/>`, 1.7),
  scale:   ui(`<path d="M3.6 20.4h16.8V9.1c0-.7-.6-1.3-1.3-1.3H4.9c-.7 0-1.3.6-1.3 1.3z"/><path d="M8.4 7.8c0-2 1.6-3.6 3.6-3.6s3.6 1.6 3.6 3.6"/><path d="M12 11.2v4.3M12 15.5l2.6-2.2"/>`),
  bone:    ui(`<path d="M7.4 8.2a2.4 2.4 0 1 0-3.1 3.1 2.4 2.4 0 1 0 3.1 3.1l9.2-6.2a2.4 2.4 0 1 0 3.1-3.1 2.4 2.4 0 1 0-3.1-3.1z" transform="rotate(12 12 8.6)"/>`),
  heart:   ui(`<path d="M12 20.1S3.4 15 3.4 9.1A4.6 4.6 0 0 1 12 6.7a4.6 4.6 0 0 1 8.6 2.4c0 5.9-8.6 11-8.6 11z"/>`),
  sparkle: ui(`<path d="M12 3.2 13.7 9l5.8 1.7-5.8 1.7L12 18.2 10.3 12.4 4.5 10.7 10.3 9z"/><path d="M18.6 3.4v2.4M17.4 4.6h2.4"/>`)
};

/* ── 배경 패턴 (발자국 두들) ─────────────────────────────── */
export const PAW_PATTERN =
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='72' height='72' viewBox='0 0 72 72'%3E%3Cg fill='%23b4622d' fill-opacity='.055'%3E%3Cellipse cx='16' cy='22' rx='4.4' ry='5.4'/%3E%3Cellipse cx='9' cy='16' rx='2.4' ry='3'/%3E%3Cellipse cx='15' cy='12' rx='2.4' ry='3'/%3E%3Cellipse cx='21' cy='13' rx='2.4' ry='3'/%3E%3Cellipse cx='52' cy='58' rx='4.4' ry='5.4'/%3E%3Cellipse cx='45' cy='52' rx='2.4' ry='3'/%3E%3Cellipse cx='51' cy='48' rx='2.4' ry='3'/%3E%3Cellipse cx='57' cy='49' rx='2.4' ry='3'/%3E%3C/g%3E%3C/svg%3E")`;
