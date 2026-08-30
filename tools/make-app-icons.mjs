#!/usr/bin/env node
/* 앱 아이콘 · 스플래시 원본 생성기
 *
 * 웹의 두들 아이콘(assets/js/icons.js)을 그대로 가져와 앱 아이콘 소스를 만듭니다.
 * 웹과 앱의 마스코트가 갈라지지 않도록, 그림을 새로 그리지 않고 같은 코드에서 렌더합니다.
 *
 *   node tools/make-app-icons.mjs      → app/assets/branding/*.png 생성
 *
 * 필요: rsvg-convert (brew install librsvg)
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'app/assets/branding');
const { dogIcon } = await import(join(ROOT, 'assets/js/icons.js'));

/* 웹 CSS 토큰과 같은 브랜드 색 (assets/css/app.css) */
const BRAND = '#b4622d';
const BRAND_LIGHT = '#d98b4a';
const BG = '#f7f5f2';

/** 웹 두들에서 <svg> 껍데기를 벗기고 내부 그림만 꺼냅니다 */
function doodleBody(key) {
  const svg = dogIcon(key, 64);
  return svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
}

/* 두들은 64×64 뷰박스 안에서 위쪽으로 치우쳐 그려져 있습니다(그림 y≈5~54).
   그대로 놓으면 아래 여백이 커 보여서, 그림의 실제 중심을 상자 중심에 맞춥니다. */
const ART_CENTER_Y = 29.5; // 그림의 세로 중심 (64 기준)

/** 그림을 canvas 안에 지정한 비율로 가운데 배치하는 transform */
function placeDoodle(canvas, scale) {
  const k = (canvas * scale) / 64;
  const x = (canvas - 64 * k) / 2;
  const y = canvas / 2 - ART_CENTER_Y * k;
  return `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${k.toFixed(3)})`;
}

/** 아이콘: 브랜드 그라데이션 위에 두들 — iOS 는 시스템이 모서리를 깎으므로 정사각·불투명 */
function iconSVG({ transparentBg = false } = {}) {
  // 안드로이드 적응형 아이콘은 바깥이 잘리므로 전경은 더 작게 (안전 영역 66%)
  const scale = transparentBg ? 0.6 : 0.78;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${BRAND}"/>
      <stop offset="1" stop-color="${BRAND_LIGHT}"/>
    </linearGradient>
  </defs>
  ${transparentBg ? '' : `<rect width="1024" height="1024" fill="url(#g)"/>`}
  <g transform="${placeDoodle(1024, scale)}">
    ${doodleBody('bichon')}
  </g>
</svg>`;
}

/** 스플래시: 밝은 배경에 두들만 (배경색은 flutter_native_splash 가 칠합니다) */
function splashSVG() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="768" height="768" viewBox="0 0 768 768">
  <g transform="${placeDoodle(768, 0.9)}">
    ${doodleBody('bichon')}
  </g>
</svg>`;
}

function render(svg, outPng, size) {
  const tmp = join(OUT, '_tmp.svg');
  writeFileSync(tmp, svg);
  execFileSync('rsvg-convert', ['-w', String(size), '-h', String(size), tmp, '-o', outPng]);
  rmSync(tmp);
  console.log('  ✓', outPng.replace(ROOT + '/', ''));
}

mkdirSync(OUT, { recursive: true });
console.log('▸ 브랜딩 이미지 생성 (웹 두들 재사용)');
render(iconSVG(), join(OUT, 'icon.png'), 1024);                       // 스토어·런처 아이콘
render(iconSVG({ transparentBg: true }), join(OUT, 'icon_fg.png'), 1024); // 안드로이드 적응형 전경
render(splashSVG(), join(OUT, 'splash.png'), 768);                    // 스플래시 로고
console.log(`배경색: 아이콘 ${BRAND}→${BRAND_LIGHT} / 스플래시 ${BG}`);
