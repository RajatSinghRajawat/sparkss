const nodemailer = require("nodemailer");

// ─── Create Transporter ───
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_PASSWORD,
    },
  });
};

/**
 * Send OTP email to teacher
 * @param {string} email - Recipient email
 * @param {string} otp - OTP code
 * @param {string} purpose - Purpose of OTP (register, reset-password)
 */
const sendOTPEmail = async (email, otp, purpose = "register") => {
  const transporter = createTransporter();

  const subjectMap = {
    register: "Sparks - Verify Your Email for Registration",
    student_register: "Sparks - Verify Your Email (Student Registration)",
    "reset-password": "Sparks - Password Reset OTP",
    "verify-email": "Sparks - Email Verification OTP",
  };

  const htmlTemplate = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #f4f6f9; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px; margin: 40px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
        
        <!-- Header -->
        <tr>
          <td style="background: linear-gradient(135deg, #0A4D9C 0%, #1a6dd4 100%); padding: 32px 40px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; letter-spacing: 1px;">
              ⚡ Sparks
            </h1>
            <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px;">
              Teacher Panel
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding: 40px;">
            <h2 style="color: #1a1a2e; margin: 0 0 12px; font-size: 22px;">
              ${purpose === "register" || purpose === "student_register" ? "Verify Your Email" : "Your OTP Code"}
            </h2>
            <p style="color: #64748b; margin: 0 0 28px; font-size: 15px; line-height: 1.6;">
              ${
                purpose === "register" || purpose === "student_register"
                  ? "Thank you for signing up! Use the code below to complete your registration."
                  : "Use the code below to proceed."
              }
            </p>

            <!-- OTP Box -->
            <div style="background-color: #f0f5ff; border: 2px dashed #0A4D9C; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 28px;">
              <span style="font-size: 36px; font-weight: bold; color: #0A4D9C; letter-spacing: 12px; font-family: 'Courier New', monospace;">
                ${otp}
              </span>
            </div>

            <p style="color: #ef4444; font-size: 13px; margin: 0 0 8px; font-weight: 600;">
              ⏰ This code expires in 5 minutes
            </p>
            <p style="color: #94a3b8; font-size: 13px; margin: 0; line-height: 1.5;">
              If you didn't request this code, please ignore this email. Do not share this OTP with anyone.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background-color: #f8fafc; padding: 20px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">
              © ${new Date().getFullYear()} Sparks. All rights reserved.
            </p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  const mailOptions = {
    from: `"Sparks" <${process.env.SMTP_EMAIL}>`,
    to: email,
    subject: subjectMap[purpose] || subjectMap["register"],
    html: htmlTemplate,
  };

  const info = await transporter.sendMail(mailOptions);
  console.log(`📧 OTP Email sent to ${email} | MessageId: ${info.messageId}`);

  return info;
};

module.exports = { sendOTPEmail };

