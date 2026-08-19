#!/usr/bin/env node
/* 두들 아이콘 미리보기 페이지 생성 —  node tools/icons-preview.mjs  → icons-preview.html */
import { writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { BREED_ICONS, dogIcon, ICONS } = await import(pathToFileURL(join(ROOT, 'assets/js/icons.js')).href);

const card = (inner, label, color = '') =>
  `<div class="c"${color ? ` style="color:${color}"` : ''}>${inner}<b>${label}</b></div>`;

const html = `<!doctype html><meta charset="utf-8"><title>멍케어 두들 아이콘</title>
<link rel="stylesheet" href="assets/css/app.css">
<style>
  body{padding:28px}
  .g{display:grid;grid-template-columns:repeat(auto-fill,minmax(122px,1fr));gap:14px}
  .c{background:var(--surface);border:2px solid var(--line);border-radius:20px;padding:15px 10px;
     text-align:center;box-shadow:3px 3px 0 -1px var(--line)}
  .c svg{margin:0 auto}
  .c b{display:block;font-size:11.5px;margin-top:7px;color:var(--ink-2);font-weight:600;line-height:1.35}
  h1{font-size:22px;margin-bottom:6px}
  h2{font-size:15px;margin:26px 0 12px;color:var(--ink-2)}
  .lead{color:var(--ink-3);font-size:13px;margin:0 0 8px}
</style>
<h1>🐕 멍케어 두들 아이콘</h1>
<p class="lead">공통 얼굴 골격에 귀 모양·털결·색만 바꿔 끼우는 방식이라, 새 견종은 <code>assets/js/icons.js</code> 에 한 줄만 추가하면 돼요.</p>
<h2>견종 ${Object.keys(BREED_ICONS).length}종</h2>
<div class="g">${Object.keys(BREED_ICONS).map(k => card(dogIcon(k, 76), BREED_ICONS[k].label)).join('')}</div>
<h2>UI 아이콘 ${Object.keys(ICONS).length}종</h2>
<div class="g">${Object.keys(ICONS).map(k =>
  card(ICONS[k].replace('class="di"', 'style="width:44px;height:44px"'), k, 'var(--brand)')).join('')}</div>`;

writeFileSync(join(ROOT, 'icons-preview.html'), html);
console.log('icons-preview.html 생성 완료 — 로컬 서버로 열어보세요');
