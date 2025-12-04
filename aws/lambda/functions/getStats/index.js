/**
 * Lambda Function: getStats
 * 統計情報を取得する
 *
 * GET /stats
 * Response: {
 *   ok: true,
 *   total: number,
 *   byType: { [code]: count },
 *   byBase: { WAVE: count, NATURAL: count, STRAIGHT: count }
 * }
 */

const { query } = require('/opt/nodejs/db');
const {
  successResponse,
  errorResponse,
  log
} = require('/opt/nodejs/utils');

// キャッシュ（環境変数で設定可能、デフォルト60秒）
let cachedStats = null;
let cacheTimestamp = 0;
const CACHE_TTL = parseInt(process.env.CACHE_TTL || '60') * 1000;

exports.handler = async (event) => {
  log('info', 'getStats invoked', { path: event.path, method: event.httpMethod });

  // OPTIONS リクエスト（CORS preflight）
  if (event.httpMethod === 'OPTIONS') {
    return successResponse({});
  }

  try {
    // キャッシュチェック
    const now = Date.now();
    if (cachedStats && (now - cacheTimestamp) < CACHE_TTL) {
      log('info', 'Returning cached stats', { age: now - cacheTimestamp });
      return successResponse(cachedStats);
    }

    // データベースから統計を取得
    const result = await query(`
      SELECT
        COUNT(*) as total,
        json_object_agg(code, count) FILTER (WHERE code IS NOT NULL) as by_type,
        json_object_agg(base_type, base_count) FILTER (WHERE base_type IS NOT NULL) as by_base
      FROM (
        SELECT
          code,
          COUNT(*) as count,
          CASE
            WHEN code LIKE 'BW%' THEN 'WAVE'
            WHEN code LIKE 'BN%' THEN 'WAVE'
            WHEN code LIKE 'MW%' THEN 'NATURAL'
            WHEN code LIKE 'MN%' THEN 'NATURAL'
            ELSE 'STRAIGHT'
          END as base_type,
          COUNT(*) as base_count
        FROM diagnoses
        GROUP BY code, base_type
      ) sub
    `);

    if (result.rows.length === 0) {
      // データがない場合の初期値
      const emptyStats = {
        total: 0,
        byType: {},
        byBase: { WAVE: 0, NATURAL: 0, STRAIGHT: 0 }
      };
      return successResponse(emptyStats);
    }

    const row = result.rows[0];

    // 基盤体型の集計
    const byBaseAgg = {};
    const typeStats = row.by_type || {};

    Object.keys(typeStats).forEach(code => {
      const prefix = code.substring(0, 2);
      let baseType;

      if (prefix === 'BW' || prefix === 'BN') {
        baseType = 'WAVE';
      } else if (prefix === 'MW' || prefix === 'MN') {
        baseType = 'NATURAL';
      } else {
        baseType = 'STRAIGHT';
      }

      byBaseAgg[baseType] = (byBaseAgg[baseType] || 0) + (typeStats[code] || 0);
    });

    const stats = {
      total: parseInt(row.total) || 0,
      byType: typeStats,
      byBase: {
        WAVE: byBaseAgg.WAVE || 0,
        NATURAL: byBaseAgg.NATURAL || 0,
        STRAIGHT: byBaseAgg.STRAIGHT || 0
      }
    };

    // キャッシュに保存
    cachedStats = stats;
    cacheTimestamp = now;

    log('info', 'Stats retrieved', { total: stats.total });

    return successResponse(stats);

  } catch (error) {
    log('error', 'getStats error', {
      error: error.message,
      stack: error.stack
    });

    return errorResponse(
      'Failed to get statistics',
      500,
      process.env.NODE_ENV === 'development' ? error.message : undefined
    );
  }
};
