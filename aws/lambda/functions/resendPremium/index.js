/**
 * Lambda Function: resendPremium
 * プレミアムURLを再送信
 *
 * POST /premium/resend
 * Body: {
 *   email: string,
 *   code: string (optional - 検証用)
 * }
 */

const { query } = require('/opt/nodejs/db');
const {
  successResponse,
  errorResponse,
  parseBody,
  validateEmail,
  validateCode,
  log
} = require('/opt/nodejs/utils');

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
        Data: '【16BodyPersonalities】完全版レポートURL（再送）',
        Charset: 'UTF-8'
      },
      Body: {
        Html: {
          Data: `
            <html>
              <body style="font-family: sans-serif; color: #333;">
                <h2 style="color: #d63384;">💎 完全版レポートURL（再送）</h2>
                <p>あなたの診断結果: <strong>${code}</strong></p>
                <p>完全版レポートのURLを再送いたします。</p>
                <p style="margin: 20px 0;">
                  <a href="${premiumUrl}" style="background: linear-gradient(135deg, #ff69b4, #ff1493); color: white; padding: 12px 24px; text-decoration: none; border-radius: 999px; display: inline-block;">
                    完全版レポートを見る
                  </a>
                </p>
                <p style="color: #666; font-size: 14px;">
                  URL: <a href="${premiumUrl}">${premiumUrl}</a>
                </p>
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                <p style="color: #999; font-size: 12px;">
                  © 2025 16BodyPersonalities Project
                </p>
              </body>
            </html>
          `,
          Charset: 'UTF-8'
        }
      }
    }
  };

  const command = new SendEmailCommand(params);
  await sesClient.send(command);
}

exports.handler = async (event) => {
  log('info', 'resendPremium invoked', { path: event.path, method: event.httpMethod });

  // OPTIONS リクエスト（CORS preflight）
  if (event.httpMethod === 'OPTIONS') {
    return successResponse({});
  }

  try {
    // リクエストボディのパース
    const body = parseBody(event);
    const { email, code } = body;

    // バリデーション
    if (!validateEmail(email)) {
      return errorResponse('Invalid email format', 400, { email });
    }

    // メールアドレスとコード（オプション）でプレミアムレポートを検索
    let queryText = 'SELECT token, code FROM premium_reports WHERE email = $1';
    let queryParams = [email];

    if (code && validateCode(code)) {
      queryText += ' AND code = $2';
      queryParams.push(code.toUpperCase());
    }

    queryText += ' ORDER BY created_at DESC LIMIT 1';

    const result = await query(queryText, queryParams);

    if (result.rows.length === 0) {
      log('warn', 'Premium report not found for resend', { email, code });
      return errorResponse('Premium report not found for this email', 404);
    }

    const report = result.rows[0];

    // メール送信
    await sendPremiumEmail(email, report.token, report.code);

    log('info', 'Premium URL resent', { email, code: report.code });

    return successResponse({
      message: 'Premium URL has been resent to your email'
    });

  } catch (error) {
    log('error', 'resendPremium error', {
      error: error.message,
      stack: error.stack
    });

    return errorResponse(
      'Failed to resend premium URL',
      500,
      process.env.NODE_ENV === 'development' ? error.message : undefined
    );
  }
};
