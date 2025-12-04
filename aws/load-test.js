// k6 load test script for 16BodyPersonalities API
// Usage: k6 run load-test.js
// Install k6: brew install k6

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// カスタムメトリクス
const errorRate = new Rate('errors');

// 負荷パターン
export let options = {
  // シナリオ1: 通常負荷
  // stages: [
  //   { duration: '30s', target: 5 },   // 30秒で5ユーザーに増加
  //   { duration: '2m', target: 5 },    // 2分間5ユーザーを維持
  //   { duration: '30s', target: 0 },   // 30秒で0に減少
  // ],

  // シナリオ2: ピーク負荷（5分で1000回リクエスト）
  stages: [
    { duration: '1m', target: 20 },    // 1分で20ユーザーに増加
    { duration: '5m', target: 20 },    // 5分間20ユーザーを維持（約1200リクエスト）
    { duration: '1m', target: 0 },     // 1分で0に減少
  ],

  thresholds: {
    'http_req_duration': ['p(95)<1000'], // 95%のリクエストが1秒以内
    'http_req_failed': ['rate<0.05'],    // エラー率5%未満
    'errors': ['rate<0.05'],
  },
};

// API設定（実際のURLに置き換えてください）
const API_BASE_URL = __ENV.API_URL || 'https://YOUR_API_ID.execute-api.ap-northeast-1.amazonaws.com/prod';

// テストデータ
const CODES = ['BNLS', 'MNLC', 'MWLC', 'MWLS', 'MNLS', 'BNLC', 'BWUC', 'BWUS'];

function randomCode() {
  return CODES[Math.floor(Math.random() * CODES.length)];
}

function randomScores() {
  return {
    frame: {
      mean: 1 + Math.random() * 4,
      sd: 0.5 + Math.random() * 1
    },
    surface: {
      mean: 1 + Math.random() * 4,
      sd: 0.5 + Math.random() * 1
    },
    balance: {
      mean: 1 + Math.random() * 4,
      sd: 0.5 + Math.random() * 1
    },
    line: {
      mean: 1 + Math.random() * 4,
      sd: 0.5 + Math.random() * 1
    }
  };
}

export function setup() {
  console.log(`Starting load test against ${API_BASE_URL}`);
  console.log('Testing API availability...');

  // 統計エンドポイントの疎通確認
  let res = http.get(`${API_BASE_URL}/stats`);
  if (res.status !== 200) {
    throw new Error(`API is not available. Status: ${res.status}`);
  }

  console.log('API is available. Starting load test...');
}

export default function() {
  // ランダムな操作を選択（実際のユーザー行動に近づける）
  const action = Math.random();

  if (action < 0.6) {
    // 60%: 診断保存
    testSaveDiagnosis();
  } else if (action < 0.9) {
    // 30%: 統計取得
    testGetStats();
  } else {
    // 10%: プレミアム関連
    testPremiumFlow();
  }

  // ユーザーの操作間隔をシミュレート（1-3秒）
  sleep(1 + Math.random() * 2);
}

function testSaveDiagnosis() {
  const payload = JSON.stringify({
    code: randomCode(),
    scores: randomScores(),
    answers: {
      frame: [3, 4, 2, 3, 4, 3, 2, 4, 3, 3, 4, 2],
      surface: [2, 3, 4, 3, 2, 3, 4, 3, 2, 3, 4, 3],
      balance: [4, 3, 2, 3, 4, 3, 2, 3, 4, 3, 2, 3],
      line: [3, 4, 3, 2, 3, 4, 3, 2, 3, 4, 3, 2]
    },
    sessionId: `k6-${__VU}-${__ITER}-${Date.now()}`,
    userAgent: 'k6/load-test'
  });

  const res = http.post(`${API_BASE_URL}/diagnoses`, payload, {
    headers: {
      'Content-Type': 'application/json'
    },
    tags: { name: 'SaveDiagnosis' }
  });

  const success = check(res, {
    'saveDiagnosis: status 200': (r) => r.status === 200,
    'saveDiagnosis: response has ok': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.ok === true;
      } catch {
        return false;
      }
    },
    'saveDiagnosis: response time < 2s': (r) => r.timings.duration < 2000,
  });

  errorRate.add(!success);
}

function testGetStats() {
  const res = http.get(`${API_BASE_URL}/stats`, {
    tags: { name: 'GetStats' }
  });

  const success = check(res, {
    'getStats: status 200': (r) => r.status === 200,
    'getStats: response has data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.ok === true && body.total !== undefined;
      } catch {
        return false;
      }
    },
    'getStats: response time < 500ms': (r) => r.timings.duration < 500,
  });

  errorRate.add(!success);
}

function testPremiumFlow() {
  // プレミアム保存のテスト
  const payload = JSON.stringify({
    code: randomCode(),
    scores: randomScores(),
    answers: {
      frame: [3, 4, 2, 3, 4, 3, 2, 4, 3, 3, 4, 2],
      surface: [2, 3, 4, 3, 2, 3, 4, 3, 2, 3, 4, 3],
      balance: [4, 3, 2, 3, 4, 3, 2, 3, 4, 3, 2, 3],
      line: [3, 4, 3, 2, 3, 4, 3, 2, 3, 4, 3, 2]
    },
    sessionId: `k6-premium-${__VU}-${__ITER}`,
    stripe_session: `cs_test_k6_${Date.now()}`,
    email: `test-${__VU}-${__ITER}@example.com`,
    noMail: true  // テストなのでメールは送らない
  });

  const res = http.post(`${API_BASE_URL}/premium`, payload, {
    headers: {
      'Content-Type': 'application/json'
    },
    tags: { name: 'SavePremium' }
  });

  const success = check(res, {
    'savePremium: status 200': (r) => r.status === 200,
    'savePremium: response has token': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.ok === true && body.token !== undefined;
      } catch {
        return false;
      }
    },
    'savePremium: response time < 3s': (r) => r.timings.duration < 3000,
  });

  errorRate.add(!success);

  // トークンでプレミアムレポート取得
  if (success && res.status === 200) {
    try {
      const token = JSON.parse(res.body).token;
      sleep(0.5);  // 少し待つ

      const premiumRes = http.get(`${API_BASE_URL}/premium/${token}`, {
        tags: { name: 'GetPremium' }
      });

      check(premiumRes, {
        'getPremium: status 200': (r) => r.status === 200,
        'getPremium: response has data': (r) => {
          try {
            const body = JSON.parse(r.body);
            return body.ok === true && body.data !== undefined;
          } catch {
            return false;
          }
        },
      });
    } catch (e) {
      console.error('Premium flow error:', e);
    }
  }
}

export function teardown(data) {
  console.log('Load test completed.');
}
