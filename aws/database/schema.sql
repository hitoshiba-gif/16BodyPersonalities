-- 16BodyPersonalities PostgreSQL Schema
-- データベース: 16bp_production

-- 拡張機能の有効化
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 診断結果テーブル
CREATE TABLE IF NOT EXISTS diagnoses (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(100) UNIQUE NOT NULL,
  code VARCHAR(4) NOT NULL CHECK (code ~ '^[BM][NW][LU][CS]$'),
  scores JSONB NOT NULL,
  answers JSONB,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_diagnoses_code ON diagnoses(code);
CREATE INDEX IF NOT EXISTS idx_diagnoses_created ON diagnoses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_diagnoses_session ON diagnoses(session_id);

-- プレミアムレポートテーブル
CREATE TABLE IF NOT EXISTS premium_reports (
  id SERIAL PRIMARY KEY,
  token VARCHAR(100) UNIQUE NOT NULL,
  session_id VARCHAR(100),
  code VARCHAR(4) NOT NULL CHECK (code ~ '^[BM][NW][LU][CS]$'),
  scores JSONB NOT NULL,
  answers JSONB NOT NULL,
  stripe_session_id VARCHAR(200),
  email VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  accessed_at TIMESTAMP,
  access_count INTEGER DEFAULT 0
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_premium_token ON premium_reports(token);
CREATE INDEX IF NOT EXISTS idx_premium_stripe ON premium_reports(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_premium_email ON premium_reports(email);
CREATE INDEX IF NOT EXISTS idx_premium_created ON premium_reports(created_at DESC);

-- お問い合わせテーブル
CREATE TABLE IF NOT EXISTS contacts (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied', 'closed'))
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);
CREATE INDEX IF NOT EXISTS idx_contacts_created ON contacts(created_at DESC);

-- 統計集計用のマテリアライズドビュー
CREATE MATERIALIZED VIEW IF NOT EXISTS diagnosis_stats AS
SELECT
  COUNT(*) as total,
  code,
  CASE
    WHEN code LIKE 'BW%' THEN 'WAVE'
    WHEN code LIKE 'BN%' THEN 'WAVE'
    WHEN code LIKE 'MW%' THEN 'NATURAL'
    WHEN code LIKE 'MN%' THEN 'NATURAL'
    ELSE 'STRAIGHT'
  END as base_type,
  COUNT(*) as count
FROM diagnoses
GROUP BY code, base_type;

-- インデックス
CREATE UNIQUE INDEX IF NOT EXISTS idx_stats_code ON diagnosis_stats(code);

-- 統計自動更新用の関数
CREATE OR REPLACE FUNCTION refresh_diagnosis_stats()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY diagnosis_stats;
END;
$$ LANGUAGE plpgsql;

-- 更新トリガー用の関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 更新トリガー
DROP TRIGGER IF EXISTS update_diagnoses_updated_at ON diagnoses;
CREATE TRIGGER update_diagnoses_updated_at
  BEFORE UPDATE ON diagnoses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- プレミアムレポートアクセストラッキング用関数
CREATE OR REPLACE FUNCTION track_premium_access(token_param VARCHAR)
RETURNS void AS $$
BEGIN
  UPDATE premium_reports
  SET
    accessed_at = NOW(),
    access_count = access_count + 1
  WHERE token = token_param;
END;
$$ LANGUAGE plpgsql;

-- 初期データ確認用ビュー
CREATE OR REPLACE VIEW stats_summary AS
SELECT
  (SELECT COUNT(*) FROM diagnoses) as total_diagnoses,
  (SELECT COUNT(*) FROM premium_reports) as total_premium,
  (SELECT COUNT(*) FROM contacts) as total_contacts,
  (SELECT COUNT(*) FROM diagnoses WHERE created_at > NOW() - INTERVAL '24 hours') as diagnoses_24h,
  (SELECT COUNT(*) FROM premium_reports WHERE created_at > NOW() - INTERVAL '24 hours') as premium_24h;

COMMENT ON TABLE diagnoses IS '診断結果を保存するテーブル';
COMMENT ON TABLE premium_reports IS 'プレミアムレポートのトークンと詳細情報';
COMMENT ON TABLE contacts IS 'お問い合わせ情報';
COMMENT ON MATERIALIZED VIEW diagnosis_stats IS '診断統計の集計ビュー（定期的に更新）';
