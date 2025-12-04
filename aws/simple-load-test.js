#!/usr/bin/env node
/**
 * Simple Load Test - 50 records
 * 50件の診断データを一気にAPIに送信してテストする
 */

const https = require('https');

const API_URL = 'https://uk952hkt2e.execute-api.ap-northeast-1.amazonaws.com/prod';
const TOTAL_REQUESTS = 50;

// 診断コード
const CODES = ['BNLS', 'MNLC', 'MWLC', 'MWLS', 'MNLS', 'BNLC', 'BWUC', 'BWUS', 'BWLC', 'BWLS', 'BNUS', 'MWUC', 'MNUC', 'MNUS', 'BNUC'];

function randomCode() {
  return CODES[Math.floor(Math.random() * CODES.length)];
}

function randomValue() {
  return 1 + Math.random() * 4; // 1.0 ~ 5.0
}

function generateScores() {
  return {
    frame: {
      pos: Math.random() > 0.5,
      code: Math.random() > 0.5 ? 'B' : 'M',
      mean: randomValue(),
      total: Math.floor(randomValue() * 12)
    },
    surface: {
      pos: Math.random() > 0.5,
      code: Math.random() > 0.5 ? 'W' : 'N',
      mean: randomValue(),
      total: Math.floor(randomValue() * 12)
    },
    balance: {
      pos: Math.random() > 0.5,
      code: Math.random() > 0.5 ? 'U' : 'L',
      mean: randomValue(),
      total: Math.floor(randomValue() * 12)
    },
    line: {
      pos: Math.random() > 0.5,
      code: Math.random() > 0.5 ? 'S' : 'C',
      mean: randomValue(),
      total: Math.floor(randomValue() * 12)
    }
  };
}

function generateAnswers() {
  return {
    frame: Array.from({ length: 12 }, () => Math.floor(1 + Math.random() * 5)),
    surface: Array.from({ length: 12 }, () => Math.floor(1 + Math.random() * 5)),
    balance: Array.from({ length: 12 }, () => Math.floor(1 + Math.random() * 5)),
    line: Array.from({ length: 12 }, () => Math.floor(1 + Math.random() * 5))
  };
}

function sendRequest(index) {
  return new Promise((resolve, reject) => {
    const sessionId = `load-test-${Date.now()}-${index}`;
    const code = randomCode();

    const payload = JSON.stringify({
      code,
      scores: generateScores(),
      answers: generateAnswers(),
      sessionId,
      userAgent: 'Node.js Load Test Script'
    });

    const url = new URL(`${API_URL}/diagnoses`);

    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const startTime = Date.now();
    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        const duration = Date.now() - startTime;
        try {
          const response = JSON.parse(data);
          resolve({
            index,
            sessionId,
            code,
            status: res.statusCode,
            duration,
            success: res.statusCode === 200 && response.ok,
            response
          });
        } catch (error) {
          reject({
            index,
            sessionId,
            error: error.message,
            status: res.statusCode,
            duration,
            rawData: data
          });
        }
      });
    });

    req.on('error', (error) => {
      reject({
        index,
        sessionId,
        error: error.message,
        duration: Date.now() - startTime
      });
    });

    req.write(payload);
    req.end();
  });
}

async function runLoadTest() {
  console.log('=================================================');
  console.log('  16BodyPersonalities API Load Test');
  console.log('=================================================');
  console.log(`API URL: ${API_URL}`);
  console.log(`Total Requests: ${TOTAL_REQUESTS}`);
  console.log(`Starting at: ${new Date().toISOString()}`);
  console.log('=================================================\n');

  const startTime = Date.now();

  // 全リクエストを並列実行
  console.log('Sending requests in parallel...\n');
  const promises = [];
  for (let i = 0; i < TOTAL_REQUESTS; i++) {
    promises.push(sendRequest(i + 1));
  }

  const results = await Promise.allSettled(promises);
  const endTime = Date.now();
  const totalDuration = endTime - startTime;

  // 結果集計
  const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
  const failed = results.length - successful;
  const durations = results
    .filter(r => r.status === 'fulfilled')
    .map(r => r.value.duration);

  const avgDuration = durations.length > 0
    ? (durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(2)
    : 0;

  const minDuration = durations.length > 0 ? Math.min(...durations) : 0;
  const maxDuration = durations.length > 0 ? Math.max(...durations) : 0;

  // 詳細結果表示
  console.log('\n=== Results ===\n');
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      const { sessionId, code, status, duration, success } = result.value;
      const icon = success ? '✅' : '❌';
      console.log(`${icon} #${index + 1}: ${code} (${sessionId}) - ${status} - ${duration}ms`);
    } else {
      console.log(`❌ #${index + 1}: FAILED - ${result.reason.error}`);
    }
  });

  // サマリー
  console.log('\n=================================================');
  console.log('  Summary');
  console.log('=================================================');
  console.log(`Total Requests:    ${TOTAL_REQUESTS}`);
  console.log(`Successful:        ${successful} (${(successful/TOTAL_REQUESTS*100).toFixed(1)}%)`);
  console.log(`Failed:            ${failed} (${(failed/TOTAL_REQUESTS*100).toFixed(1)}%)`);
  console.log(`Total Duration:    ${totalDuration}ms (${(totalDuration/1000).toFixed(2)}s)`);
  console.log(`Avg Response Time: ${avgDuration}ms`);
  console.log(`Min Response Time: ${minDuration}ms`);
  console.log(`Max Response Time: ${maxDuration}ms`);
  console.log(`Throughput:        ${(TOTAL_REQUESTS / (totalDuration / 1000)).toFixed(2)} req/s`);
  console.log('=================================================\n');

  // 終了コード
  process.exit(failed > 0 ? 1 : 0);
}

// 実行
runLoadTest().catch(error => {
  console.error('Load test failed:', error);
  process.exit(1);
});
