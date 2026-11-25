const { SMTPClient } = require('emailjs');

const senderMail = (process.env.SENDER_MAIL || 'info@neuraltechsoft.com').trim();
const senderPass = (process.env.SENDER_PASSWORD || '').replace(/\s+/g, '');

if (!senderMail || !senderPass) {
  console.warn('[EmailService] Warning: SENDER_MAIL or SENDER_PASSWORD is not set in .env');
}

// Initialize native SMTP client via emailjs (direct SSL over port 465)
const client = new SMTPClient({
  user: senderMail,
  password: senderPass,
  host: 'smtp.gmail.com',
  ssl: true,
  port: 465,
  timeout: 10000
});

/**
 * Send Password Reset OTP Email using emailjs
 * @param {Object} params
 * @param {string} params.to - Recipient email address
 * @param {string} params.otp - 6-digit OTP code
 * @param {string} [params.userName] - Recipient name
 */
const sendPasswordResetOtp = async ({ to, otp, userName }) => {
  const recipientName = userName && userName.trim() ? userName.trim() : 'Team Member';
  const cleanTo = to.trim().toLowerCase();

  const plainText = `Hello ${recipientName},\n\nYour One-Time Password (OTP) for resetting your NTS Task Management password is: ${otp}\n\nThis verification code will expire in 10 minutes.\n\nIf you did not request a password reset, please ignore this email.\n\nRegards,\nNeuralTechSoft Team`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>NTS Password Reset OTP</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 30px 15px;">
        <tr>
          <td align="center">
            <table width="100%" max-width="520" cellpadding="0" cellspacing="0" style="max-width: 520px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #1e40af 0%, #2563eb 100%); padding: 30px 24px; text-align: center;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 700; letter-spacing: 0.5px;">
                    NTS Task Management System
                  </h1>
                  <p style="margin: 6px 0 0; color: #bfdbfe; font-size: 13px;">
                    NeuralTechSoft
                  </p>
                </td>
              </tr>

              <!-- Content -->
              <tr>
                <td style="padding: 32px 28px;">
                  <h2 style="margin: 0 0 16px; color: #0f172a; font-size: 18px; font-weight: 600;">
                    Password Reset Verification
                  </h2>
                  <p style="margin: 0 0 20px; color: #475569; font-size: 14px; line-height: 1.6;">
                    Hello <strong>${recipientName}</strong>,
                  </p>
                  <p style="margin: 0 0 24px; color: #475569; font-size: 14px; line-height: 1.6;">
                    We received a request to reset the password for your account. Please use the following 6-digit One-Time Password (OTP) to complete the verification:
                  </p>

                  <!-- OTP Code Box -->
                  <div style="background-color: #f0fdf4; border: 2px dashed #22c55e; border-radius: 12px; padding: 22px 16px; text-align: center; margin: 24px 0;">
                    <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #15803d; letter-spacing: 1.5px; margin-bottom: 8px;">
                      Your Verification Code (OTP)
                    </div>
                    <div style="font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 800; letter-spacing: 10px; color: #166534; padding-left: 10px;">
                      ${otp}
                    </div>
                  </div>

                  <p style="margin: 20px 0 0; color: #64748b; font-size: 13px; line-height: 1.5;">
                    ⏱️ <strong>Note:</strong> This verification code is valid for <strong>10 minutes</strong>. For your security, do not share this code with anyone.
                  </p>
                  
                  <p style="margin: 16px 0 0; color: #94a3b8; font-size: 12px; line-height: 1.5;">
                    If you did not request this password reset, please ignore this email or notify your system administrator immediately.
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 24px; text-align: center;">
                  <p style="margin: 0; color: #64748b; font-size: 12px;">
                    © ${new Date().getFullYear()} NeuralTechSoft. All rights reserved.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  try {
    const message = await client.sendAsync({
      text: plainText,
      from: `NTS Task Management <${senderMail}>`,
      to: cleanTo,
      subject: `Your NTS Password Reset Verification Code: ${otp}`,
      attachment: [
        { data: htmlContent, alternative: true }
      ]
    });

    const msgId = message.header ? message.header['message-id'] : 'delivered';
    console.log(`[EmailService] OTP email sent successfully to ${cleanTo} via emailjs. MessageId: ${msgId}`);
    return message;
  } catch (err) {
    console.error(`[EmailService] Failed to send OTP email to ${cleanTo} via emailjs:`, err.message || err);
    throw err;
  }
};

module.exports = {
  client,
  sendPasswordResetOtp
};
