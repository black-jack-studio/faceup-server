import { Resend } from "resend";

// Public site URL used to build the verification link. Matches the URL already hardcoded
// for the Capacitor app's allowNavigation list (capacitor.config.ts) and the OAuth callback.
const APP_URL = process.env.APP_URL || "https://faceup-server.onrender.com";

// TODO: once a custom domain is verified on Resend (required to send to arbitrary user
// addresses, not just the account owner's own inbox), set RESEND_FROM_EMAIL to something
// like "FaceUp <noreply@yourdomain.com>". Until then this falls back to Resend's shared
// sandbox sender, which only delivers to the Resend account's own verified email.
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "FaceUp <onboarding@resend.dev>";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function sendVerificationEmail(to: string, token: string): Promise<void> {
  if (!resend) {
    console.warn(
      `⚠️ [Email] RESEND_API_KEY is not set — skipping verification email to ${to}. ` +
      `Set RESEND_API_KEY (and RESEND_FROM_EMAIL once a domain is verified) to enable sending.`
    );
    return;
  }

  const verificationUrl = `${APP_URL}/verify-email?token=${encodeURIComponent(token)}`;

  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: "Verify your email for FaceUp",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h1 style="font-size: 20px;">Verify your email</h1>
        <p>Thanks for creating a FaceUp account. Confirm your email address to finish setting up your account:</p>
        <p>
          <a href="${verificationUrl}" style="display: inline-block; background: #000; color: #fff; padding: 12px 20px; border-radius: 10px; text-decoration: none; font-weight: bold;">
            Verify my email
          </a>
        </p>
        <p style="color: #666; font-size: 13px;">This link expires in 24 hours. If you didn't create a FaceUp account, you can ignore this email.</p>
      </div>
    `,
  });
}

export async function sendPasswordResetCodeEmail(to: string, code: string): Promise<void> {
  if (!resend) {
    console.warn(
      `⚠️ [Email] RESEND_API_KEY is not set — skipping password reset email to ${to}. ` +
      `Set RESEND_API_KEY (and RESEND_FROM_EMAIL once a domain is verified) to enable sending.`
    );
    return;
  }

  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: "Your FaceUp password reset code",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h1 style="font-size: 20px;">Reset your password</h1>
        <p>Enter this code in the app to reset your FaceUp password:</p>
        <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; background: #f4f4f4; padding: 16px; border-radius: 10px;">
          ${code}
        </p>
        <p style="color: #666; font-size: 13px;">This code expires in 15 minutes. If you didn't request a password reset, you can ignore this email — your password won't be changed.</p>
      </div>
    `,
  });
}
