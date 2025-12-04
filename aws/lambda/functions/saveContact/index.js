/**
 * Lambda Function: saveContact
 * お問い合わせを保存
 *
 * POST /contact
 * Body: {
 *   name: string,
 *   email: string,
 *   message: string
 * }
 */

const { query } = require('/opt/nodejs/db');
const {
  successResponse,
  errorResponse,
  parseBody,
  validateEmail,
  log
} = require('/opt/nodejs/utils');

exports.handler = async (event) => {
  log('info', 'saveContact invoked', { path: event.path, method: event.httpMethod });

  // OPTIONS リクエスト（CORS preflight）
  if (event.httpMethod === 'OPTIONS') {
    return successResponse({});
  }

  try {
    // リクエストボディのパース
    const body = parseBody(event);
    const { name, email, message } = body;

    // バリデーション
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return errorResponse('Name is required', 400);
    }

    if (!validateEmail(email)) {
      return errorResponse('Invalid email format', 400, { email });
    }

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return errorResponse('Message is required', 400);
    }

    // 文字数制限
    if (name.length > 255) {
      return errorResponse('Name is too long (max 255 characters)', 400);
    }

    if (message.length > 10000) {
      return errorResponse('Message is too long (max 10000 characters)', 400);
    }

    // データベースに保存
    const result = await query(
      `INSERT INTO contacts (name, email, message, created_at, status)
       VALUES ($1, $2, $3, NOW(), 'new')
       RETURNING id, created_at`,
      [
        name.trim(),
        email.trim(),
        message.trim()
      ]
    );

    const saved = result.rows[0];

    log('info', 'Contact saved', {
      id: saved.id,
      email: email
    });

    // オプション: 管理者に通知メールを送る（実装は省略）
    // await notifyAdmin(saved.id, name, email, message);

    return successResponse({
      id: saved.id,
      message: 'Thank you for contacting us. We will reply as soon as possible.',
      createdAt: saved.created_at
    });

  } catch (error) {
    log('error', 'saveContact error', {
      error: error.message,
      stack: error.stack
    });

    return errorResponse(
      'Failed to save contact',
      500,
      process.env.NODE_ENV === 'development' ? error.message : undefined
    );
  }
};
