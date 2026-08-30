#!/usr/bin/env node
// Google Play에 AAB 업로드 — 서비스 계정 키로 Play Developer API 사용
//
// 사전 준비 (1회):
//   1) Play Console → 설정 → API 액세스 → Google Cloud 프로젝트 연결
//   2) 서비스 계정 생성 → JSON 키 다운로드 → tools/play_keys/play-sa.json 로 저장(git 제외)
//   3) Play Console → 사용자 및 권한 → 그 서비스 계정 초대 → "출시 관리" 권한 부여
//   4) 앱(kr.mungcare.app)이 Play Console에 이미 생성되어 있어야 함
//
// 사용법:
//   node tools/upload-play.mjs <packageName> <aab경로> [track]
//   track 기본값 internal (internal|alpha|beta|production)
//
// 예:
//   node tools/upload-play.mjs kr.mungcare.app app/build/app/outputs/bundle/release/app-release.aab internal
//
// 의존성: tools/ 에서 `npm install googleapis` (최초 1회)

import { google } from 'googleapis';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const [pkg, aab, track = 'internal'] = process.argv.slice(2);
if (!pkg || !aab) {
  console.error('사용법: node tools/upload-play.mjs <packageName> <aab경로> [track]');
  process.exit(1);
}
const keyFile = path.join(__dir, 'play_keys', 'play-sa.json');
if (!fs.existsSync(keyFile)) { console.error('서비스 계정 키 없음:', keyFile); process.exit(1); }
if (!fs.existsSync(aab)) { console.error('AAB 없음:', aab); process.exit(1); }

const auth = new google.auth.GoogleAuth({ keyFile, scopes: ['https://www.googleapis.com/auth/androidpublisher'] });
const publisher = google.androidpublisher({ version: 'v3', auth });

(async () => {
  const { data: edit } = await publisher.edits.insert({ packageName: pkg });
  const editId = edit.id;
  console.log('edit 시작:', editId);

  const { data: bundle } = await publisher.edits.bundles.upload({
    packageName: pkg, editId,
    media: { mimeType: 'application/octet-stream', body: fs.createReadStream(aab) },
  });
  console.log('업로드된 versionCode:', bundle.versionCode);

  await publisher.edits.tracks.update({
    packageName: pkg, editId, track,
    requestBody: { track, releases: [{ versionCodes: [String(bundle.versionCode)], status: 'completed' }] },
  });
  await publisher.edits.commit({ packageName: pkg, editId });
  console.log(`완료: ${pkg} → ${track} 트랙에 versionCode ${bundle.versionCode} 배포`);
})().catch((e) => { console.error('실패:', e.errors || e.message || e); process.exit(1); });
