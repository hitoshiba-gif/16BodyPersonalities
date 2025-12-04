/**
 * Lambda Function: saveDiagnosis
 * 診断結果を保存する
 *
 * POST /diagnoses
 * Body: {
 *   code: string,
 *   scores: object,
 *   answers: object (optional),
 *   sessionId: string,
 *   userAgent: string (optional)
 * }
 */

const { query } = require('/opt/nodejs/db');
const {
  successResponse,
  errorResponse,
  parseBody,
  validateCode,
  validateSessionId,
  log
} = require('/opt/nodejs/utils');

exports.handler = async (event) => {
  log('info', 'saveDiagnosis invoked', { path: event.path, method: event.httpMethod });

  // OPTIONS リクエスト（CORS preflight）
  if (event.httpMethod === 'OPTIONS') {
    return successResponse({});
  }

  try {
    // リクエストボディのパース
    const body = parseBody(event);
    const { code, scores, answers, sessionId, userAgent } = body;

    // バリデーション
    if (!validateCode(code)) {
      return errorResponse('Invalid code format', 400, { code });
    }

    if (!validateSessionId(sessionId)) {
      return errorResponse('Invalid sessionId', 400);
    }

    if (!scores || typeof scores !== 'object') {
      return errorResponse('Invalid scores format', 400);
    }

    // データベースに保存（既存の場合は更新）
    const result = await query(
      `INSERT INTO diagnoses (session_id, code, scores, answers, user_agent, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       ON CONFLICT (session_id)
       DO UPDATE SET
         code = EXCLUDED.code,
         scores = EXCLUDED.scores,
         answers = EXCLUDED.answers,
         user_agent = EXCLUDED.user_agent,
         updated_at = NOW()
       RETURNING id, session_id, code, created_at`,
      [
        sessionId,
        code.toUpperCase(),
        JSON.stringify(scores),
        answers ? JSON.stringify(answers) : null,
        userAgent || null
      ]
    );

    const saved = result.rows[0];

    log('info', 'Diagnosis saved', {
      id: saved.id,
      sessionId: saved.session_id,
      code: saved.code
    });

    // 統計ビューを更新（非同期、エラーは無視）
    query('SELECT refresh_diagnosis_stats()').catch(err => {
      log('warn', 'Failed to refresh stats', { error: err.message });
    });

    return successResponse({
      id: saved.id,
      sessionId: saved.session_id,
      code: saved.code,
      createdAt: saved.created_at
    });

  } catch (error) {
    log('error', 'saveDiagnosis error', {
      error: error.message,
      stack: error.stack
    });

    return errorResponse(
      'Failed to save diagnosis',
      500,
      process.env.NODE_ENV === 'development' ? error.message : undefined
    );
  }
};
