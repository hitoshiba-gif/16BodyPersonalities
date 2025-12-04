/**
 * Lambda Function: savePremium
 * プレミアムレポートを保存してトークンを発行
 *
 * POST /premium
 * Body: {
 *   code: string,
 *   scores: object,
 *   answers: object,
 *   sessionId: string,
 *   stripe_session: string (optional),
 *   email: string (optional),
 *   noMail: boolean (optional)
 * }
 */

const { query } = require('/opt/nodejs/db');
const {
  successResponse,
  errorResponse,
  parseBody,
  validateCode,
  validateSessionId,
  validateEmail,
  generateToken,
  log
} = require('/opt/nodejs/utils');

// AWS SES用（メール送信）- オプショナル
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
const sesClient = new SESClient({ region: process.env.AWS_REGION || 'ap-northeast-1' });

/**
 * プレミアムURLをメール送信
 */
async function sendPremiumEmail(email, token, code) {
  const baseUrl = process.env.BASE_URL || 'https://16bodypersonalities.com';
  const premiumUrl = `${baseUrl}/premium.html?token=${token}`;

  const params = {
    Source: process.env.FROM_EMAIL || 'noreply@16bodypersonalities.com',
    Destination: {
      ToAddresses: [email]
    },
    Message: {
      Subject: {
        Data: '【16BodyPersonalities】完全版レポートのご案内',
        Charset: 'UTF-8'
      },
      Body: {
        Html: {
          Data: `
            <html>
              <body style="font-family: sans-serif; color: #333;">
                <h2 style="color: #d63384;">💎 完全版レポートをご購入いただきありがとうございます</h2>
                <p>あなたの診断結果: <strong>${code}</strong></p>
                <p>以下のリンクから、いつでも完全版レポートをご覧いただけます。</p>
                <p style="margin: 20px 0;">
                  <a href="${premiumUrl}" style="background: linear-gradient(135deg, #ff69b4, #ff1493); color: white; padding: 12px 24px; text-decoration: none; border-radius: 999px; display: inline-block;">
                    完全版レポートを見る
                  </a>
                </p>
                <p style="color: #666; font-size: 14px;">
                  URL: <a href="${premiumUrl}">${premiumUrl}</a>
                </p>
                <p style="color: #666; font-size: 12px; margin-top: 30px;">
                  このURLは「あなた専用」です。大切に保管してください。<br>
                  レポートがアップデートされた場合でも、同じURLで最新版をご覧いただけます。
                </p>
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                <p style="color: #999; font-size: 12px;">
                  © 2025 16BodyPersonalities Project<br>
                  このメールに心当たりがない場合は、破棄してください。
                </p>
              </body>
            </html>
          `,
          Charset: 'UTF-8'
        },
        Text: {
          Data: `
【16BodyPersonalities】完全版レポートのご案内

💎 完全版レポートをご購入いただきありがとうございます

あなたの診断結果: ${code}

以下のURLから、いつでも完全版レポートをご覧いただけます。
${premiumUrl}

このURLは「あなた専用」です。大切に保管してください。
レポートがアップデートされた場合でも、同じURLで最新版をご覧いただけます。

---
© 2025 16BodyPersonalities Project
このメールに心当たりがない場合は、破棄してください。
          `,
          Charset: 'UTF-8'
        }
      }
    }
  };

  try {
    const command = new SendEmailCommand(params);
    await sesClient.send(command);
    log('info', 'Email sent successfully', { email, token });
  } catch (error) {
    log('error', 'Failed to send email', { email, error: error.message });
    throw error;
  }
}

exports.handler = async (event) => {
  log('info', 'savePremium invoked', { path: event.path, method: event.httpMethod });

  // OPTIONS リクエスト（CORS preflight）
  if (event.httpMethod === 'OPTIONS') {
    return successResponse({});
  }

  try {
    // リクエストボディのパース
    const body = parseBody(event);
    const { code, scores, answers, sessionId, stripe_session, email, noMail } = body;

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

    if (!answers || typeof answers !== 'object') {
      return errorResponse('Invalid answers format', 400);
    }

    if (email && !validateEmail(email)) {
      return errorResponse('Invalid email format', 400, { email });
    }

    // トークン生成
    const token = generateToken();

    // データベースに保存
    const result = await query(
      `INSERT INTO premium_reports
       (token, session_id, code, scores, answers, stripe_session_id, email, created_at, access_count)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), 0)
       RETURNING id, token, created_at`,
      [
        token,
        sessionId,
        code.toUpperCase(),
        JSON.stringify(scores),
        JSON.stringify(answers),
        stripe_session || null,
        email || null
      ]
    );

    const saved = result.rows[0];

    log('info', 'Premium report saved', {
      id: saved.id,
      token: saved.token,
      code: code,
      hasEmail: !!email
    });

    // メール送信（noMailがfalseで、emailが指定されている場合）
    if (!noMail && email) {
      try {
        await sendPremiumEmail(email, token, code.toUpperCase());
      } catch (emailError) {
        // メール送信失敗してもトークンは返す
        log('warn', 'Email sending failed but token was issued', {
          token,
          error: emailError.message
        });
      }
    }

    const baseUrl = process.env.BASE_URL || 'https://16bodypersonalities.com';

    return successResponse({
      token: saved.token,
      link: `${baseUrl}/premium.html?token=${saved.token}`,
      createdAt: saved.created_at,
      emailSent: !noMail && !!email
    });

  } catch (error) {
    log('error', 'savePremium error', {
      error: error.message,
      stack: error.stack
    });

    return errorResponse(
      'Failed to save premium report',
      500,
      process.env.NODE_ENV === 'development' ? error.message : undefined
    );
  }
};
