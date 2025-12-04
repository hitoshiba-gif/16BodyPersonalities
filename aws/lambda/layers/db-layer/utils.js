// Lambda Layer: Utility Functions

/**
 * CORS対応レスポンスヘッダー
 */
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Content-Type': 'application/json'
};

/**
 * 成功レスポンス
 */
function successResponse(data, statusCode = 200) {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify({
      ok: true,
      ...data
    })
  };
}

/**
 * エラーレスポンス
 */
function errorResponse(message, statusCode = 500, details = null) {
  console.error('Error response:', { message, statusCode, details });
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify({
      ok: false,
      error: message,
      ...(details && { details })
    })
  };
}

/**
 * バリデーション: 診断コード
 */
function validateCode(code) {
  if (!code || typeof code !== 'string') {
    return false;
  }
  return /^[BM][NW][LU][CS]$/.test(code.toUpperCase());
}

/**
 * バリデーション: メールアドレス
 */
function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * バリデーション: セッションID
 */
function validateSessionId(sessionId) {
  if (!sessionId || typeof sessionId !== 'string') {
    return false;
  }
  return sessionId.length > 5 && sessionId.length < 200;
}

/**
 * トークン生成（プレミアムレポート用）
 */
function generateToken() {
  const crypto = require('crypto');
  return crypto.randomBytes(32).toString('hex');
}

/**
 * JSONのパース（安全版）
 */
function safeJsonParse(str, defaultValue = null) {
  try {
    return JSON.parse(str);
  } catch (error) {
    console.warn('JSON parse error:', error.message);
    return defaultValue;
  }
}

/**
 * リクエストボディのパース
 */
function parseBody(event) {
  if (!event.body) {
    return {};
  }

  if (typeof event.body === 'object') {
    return event.body;
  }

  return safeJsonParse(event.body, {});
}

/**
 * 基盤体型の判定
 */
function getBaseType(code) {
  if (!code || code.length < 2) {
    return null;
  }

  const prefix = code.substring(0, 2).toUpperCase();

  if (prefix === 'BW' || prefix === 'BN') {
    return 'WAVE';
  } else if (prefix === 'MW' || prefix === 'MN') {
    return 'NATURAL';
  }
  return 'STRAIGHT';
}

/**
 * ログ出力（構造化ログ）
 */
function log(level, message, data = {}) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...data
  };
  console.log(JSON.stringify(logEntry));
}

module.exports = {
  CORS_HEADERS,
  successResponse,
  errorResponse,
  validateCode,
  validateEmail,
  validateSessionId,
  generateToken,
  safeJsonParse,
  parseBody,
  getBaseType,
  log
};
