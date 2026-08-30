/* Firebase Functions — 공공데이터 프록시.
 *
 * 핸들러 본문은 저장소 루트의 api/*.js 를 그대로 씁니다(단일 소스).
 * 배포 시 tools/deploy-firebase.sh 가 api/ 를 functions/api/ 로 복사합니다.
 * Vercel 의 (req, res) 시그니처와 Firebase onRequest 의 Express req/res 가
 * 호환되어 별도 변환 없이 감싸기만 하면 됩니다.
 */
import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';

import gov from './api/gov.js';
import govStatus from './api/gov-status.js';

// 공공데이터 서비스키 — Secret Manager 에 보관합니다
// 설정:  firebase functions:secrets:set DATA_GO_KR_KEY
const DATA_GO_KR_KEY = defineSecret('DATA_GO_KR_KEY');

const opts = {
  region: 'asia-northeast3',   // 서울
  secrets: [DATA_GO_KR_KEY],
  memory: '256MiB',
  timeoutSeconds: 30,
  cors: false,                 // 같은 도메인에서만 부르므로 불필요
};

export const govProxy = onRequest(opts, (req, res) => gov(req, res));
export const govStatusCheck = onRequest(opts, (req, res) => govStatus(req, res));
