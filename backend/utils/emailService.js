const { SMTPClient } = require('emailjs');

const getSenderConfig = () => {
  const senderMail = (process.env.SENDER_MAIL || 'info@neuraltechsoft.com').trim();
  const senderPass = (process.env.SENDER_PASSWORD || '').replace(/\s+/g, '');
  const resendApiKey = (process.env.RESEND_API_KEY || '').trim();
  const resendFrom = (process.env.RESEND_FROM || 'NTS Security <onboarding@resend.dev>').trim();

  return { senderMail, senderPass, resendApiKey, resendFrom };
};

/**
 * Creates a fresh SMTPClient for each transmission to prevent socket reuse errors
 * @param {number} [port=465]
 * @param {boolean} [ssl=true]
 */
const createSmtpClient = (port = 465, ssl = true) => {
  const { senderMail, senderPass } = getSenderConfig();

  return new SMTPClient({
    user: senderMail,
    password: senderPass,
    host: 'smtp.gmail.com',
    ssl: ssl,
    port: port,
    timeout: 10000,
    tls: {
      rejectUnauthorized: false
    }
  });
};

/**
 * Send email via Resend REST API using Node.js native fetch (zero external dependencies)
 */
const sendViaResendHttps = async ({ apiKey, from, to, subject, text, html }) => {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      text,
      html
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || `Resend HTTP error ${response.status}`);
  }
  return data;
};

/**
 * Send Password Reset OTP Email
 * - If RESEND_API_KEY is configured: Uses Resend HTTPS API (Port 443 - works on Render Free tier via native fetch)
 * - Otherwise: Uses direct SMTP via emailjs (Port 465 / 587 - for paid Render or local VPS)
 * @param {Object} params
 * @param {string} params.to - Recipient email address
 * @param {string} params.otp - 6-digit OTP code
 * @param {string} [params.userName] - Recipient name
 */
const sendPasswordResetOtp = async ({ to, otp, userName }) => {
  const { senderMail, resendApiKey, resendFrom } = getSenderConfig();
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

  // 1. If RESEND_API_KEY is present, send over HTTPS Port 443 via native fetch (Immune to Render Free Tier SMTP block)
  if (resendApiKey) {
    try {
      const resendData = await sendViaResendHttps({
        apiKey: resendApiKey,
        from: resendFrom,
        to: cleanTo,
        subject: `Your NTS Password Reset Verification Code: ${otp}`,
        text: plainText,
        html: htmlContent
      });

      console.log(`[EmailService] OTP email sent successfully to ${cleanTo} via Resend HTTPS (port 443). Id: ${resendData?.id}`);
      return resendData;
    } catch (resendErr) {
      console.warn(`[EmailService] Resend HTTPS notice (${resendErr.message}). Attempting SMTP fallback...`);
    }
  }

  // 2. Direct SMTP Attempt (Port 465)
  const msgPayload = {
    text: plainText,
    from: `NTS Task Management <${senderMail}>`,
    to: cleanTo,
    subject: `Your NTS Password Reset Verification Code: ${otp}`,
    attachment: [
      { data: htmlContent, alternative: true }
    ]
  };

  try {
    const primaryClient = createSmtpClient(465, true);
    const message = await primaryClient.sendAsync(msgPayload);
    const msgId = message.header ? message.header['message-id'] : 'delivered';
    console.log(`[EmailService] OTP email sent successfully to ${cleanTo} via port 465. MessageId: ${msgId}`);
    return message;
  } catch (err465) {
    console.warn(`[EmailService] Port 465 notice (${err465.message}). Retrying on Port 587...`);

    // 3. Fallback: Port 587 (STARTTLS)
    try {
      const fallbackClient = createSmtpClient(587, false);
      const message = await fallbackClient.sendAsync(msgPayload);
      const msgId = message.header ? message.header['message-id'] : 'delivered';
      console.log(`[EmailService] OTP email sent successfully to ${cleanTo} via port 587. MessageId: ${msgId}`);
      return message;
    } catch (err587) {
      console.error(`[EmailService] Both Port 465 and Port 587 failed: ${err587.message}`);
      throw new Error(`Email delivery blocked. (Note: On Render Free tier, ports 465 & 587 are blocked. Set RESEND_API_KEY in Render environment variables to send over HTTPS port 443).`);
    }
  }
};

module.exports = {
  createSmtpClient,
  sendPasswordResetOtp
};
