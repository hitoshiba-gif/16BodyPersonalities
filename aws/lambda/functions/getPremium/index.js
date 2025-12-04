/**
 * Lambda Function: getPremium
 * プレミアムレポートをトークンから取得
 *
 * GET /premium/{token}
 * または
 * GET /premium?token=xxx
 *
 * Response: {
 *   ok: true,
 *   data: {
 *     code: string,
 *     scores: object,
 *     answers: object
 *   }
 * }
 */

const { query } = require('/opt/nodejs/db');
const {
  successResponse,
  errorResponse,
  log
} = require('/opt/nodejs/utils');

exports.handler = async (event) => {
  log('info', 'getPremium invoked', { path: event.path, method: event.httpMethod });

  // OPTIONS リクエスト（CORS preflight）
  if (event.httpMethod === 'OPTIONS') {
    return successResponse({});
  }

  try {
    // トークンの取得（パスパラメータまたはクエリパラメータ）
    const token = event.pathParameters?.token || event.queryStringParameters?.token;

    if (!token || typeof token !== 'string' || token.length < 10) {
      return errorResponse('Invalid or missing token', 400);
    }

    // データベースからプレミアムレポートを取得
    const result = await query(
      `SELECT
         id,
         token,
         code,
         scores,
         answers,
         email,
         created_at,
         access_count
       FROM premium_reports
       WHERE token = $1`,
      [token]
    );

    if (result.rows.length === 0) {
      log('warn', 'Premium report not found', { token });
      return errorResponse('Premium report not found', 404);
    }

    const report = result.rows[0];

    // アクセス数をカウント（非同期、エラーは無視）
    query(
      `UPDATE premium_reports
       SET accessed_at = NOW(), access_count = access_count + 1
       WHERE token = $1`,
      [token]
    ).catch(err => {
      log('warn', 'Failed to update access count', { error: err.message });
    });

    log('info', 'Premium report retrieved', {
      token,
      code: report.code,
      accessCount: report.access_count + 1
    });

    return successResponse({
      data: {
        code: report.code,
        scores: report.scores,
        answers: report.answers
      }
    });

  } catch (error) {
    log('error', 'getPremium error', {
      error: error.message,
      stack: error.stack
    });

    return errorResponse(
      'Failed to get premium report',
      500,
      process.env.NODE_ENV === 'development' ? error.message : undefined
    );
  }
};
