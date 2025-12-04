// Lambda Layer: Database Connection Pool
const { Pool } = require('pg');

// 接続プールをグローバルに保持（Lambda再利用で接続を維持）
let pool;

/**
 * PostgreSQL接続プールを取得
 */
function getPool() {
  if (!pool) {
    pool = new Pool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      max: parseInt(process.env.DB_POOL_MAX || '1'), // Lambda1つあたり1接続（高同時実行対応）
      min: parseInt(process.env.DB_POOL_MIN || '0'),
      idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || '10000'),
      connectionTimeoutMillis: 10000, // タイムアウト延長（接続待機時間）
      ssl: process.env.DB_SSL === 'true' ? {
        rejectUnauthorized: false
      } : false
    });

    // エラーハンドリング
    pool.on('error', (err) => {
      console.error('Unexpected DB pool error:', err);
    });
  }
  return pool;
}

/**
 * クエリ実行ヘルパー
 */
async function query(text, params) {
  const client = getPool();
  const start = Date.now();
  try {
    const res = await client.query(text, params);
    const duration = Date.now() - start;
    console.log('Query executed', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Query error', { text, error: error.message });
    throw error;
  }
}

/**
 * トランザクション実行ヘルパー
 */
async function transaction(callback) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * 接続プールを閉じる（通常は不要だが、テスト時などに使用）
 */
async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

module.exports = {
  getPool,
  query,
  transaction,
  closePool
};
