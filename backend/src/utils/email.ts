import nodemailer from 'nodemailer';
import crypto from 'crypto';

// 이메일 전송 설정
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// 인증 토큰 생성
export function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// 이메일 인증 메일 발송
export async function sendVerificationEmail(
  email: string,
  token: string,
  username: string
): Promise<void> {
  const verificationUrl = `${process.env.FRONTEND_URL || 'http://berrple.com'}/verify-email?token=${token}`;

  const mailOptions = {
    from: `"LOL Card Game" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'LOL Card Game - 이메일 인증',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">환영합니다, ${username}님!</h2>
        <p>LOL Card Game에 가입해 주셔서 감사합니다.</p>
        <p>아래 버튼을 클릭하여 이메일 인증을 완료해 주세요:</p>
        <div style="margin: 30px 0; text-align: center;">
          <a href="${verificationUrl}"
             style="background-color: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            이메일 인증하기
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">
          또는 아래 링크를 복사하여 브라우저에 붙여넣으세요:<br>
          <a href="${verificationUrl}">${verificationUrl}</a>
        </p>
        <p style="color: #666; font-size: 14px;">
          이 링크는 24시간 동안 유효합니다.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #999; font-size: 12px;">
          본인이 요청하지 않은 경우 이 이메일을 무시하세요.
        </p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Verification email sent to ${email}`);
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw new Error('Failed to send verification email');
  }
}

// 비밀번호 재설정 이메일 발송
export async function sendPasswordResetEmail(
  email: string,
  token: string,
  username: string
): Promise<void> {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://berrple.com'}/reset-password?token=${token}`;

  const mailOptions = {
    from: `"LOL Card Game" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'LOL Card Game - 비밀번호 재설정',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">비밀번호 재설정</h2>
        <p>${username}님, 비밀번호 재설정을 요청하셨습니다.</p>
        <p>아래 버튼을 클릭하여 새 비밀번호를 설정하세요:</p>
        <div style="margin: 30px 0; text-align: center;">
          <a href="${resetUrl}"
             style="background-color: #2196F3; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            비밀번호 재설정
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">
          또는 아래 링크를 복사하여 브라우저에 붙여넣으세요:<br>
          <a href="${resetUrl}">${resetUrl}</a>
        </p>
        <p style="color: #666; font-size: 14px;">
          이 링크는 1시간 동안 유효합니다.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #999; font-size: 12px;">
          본인이 요청하지 않은 경우 이 이메일을 무시하고 비밀번호를 변경하지 마세요.
        </p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Password reset email sent to ${email}`);
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw new Error('Failed to send password reset email');
  }
}
