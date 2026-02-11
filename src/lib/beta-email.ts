import "server-only";
import { logger } from "./logger";
import type { BetaLead } from "@prisma/client";

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587", 10);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASSWORD = process.env.SMTP_PASSWORD;
const SMTP_FROM = process.env.SMTP_FROM || "noreply@styleqr.com";
const SMTP_FROM_NAME = process.env.SMTP_FROM_NAME || "StyleQR";
const APP_URL =
  process.env.NEXTAUTH_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
  "http://localhost:3000";

interface ConvertResult {
  user: { id: string; email: string };
  district: { id: string; name: string };
  restaurant: { id: string; name: string };
}

interface ApprovalEmailOptions {
  tempPassword?: string;
  user?: ConvertResult["user"];
  district?: ConvertResult["district"];
  restaurant?: ConvertResult["restaurant"];
}

function getBetaApprovalTemplate(
  lead: BetaLead,
  options?: ApprovalEmailOptions
): { subject: string; html: string; text: string } {
  const isConverted = !!options?.tempPassword;
  const loginUrl = `${APP_URL.replace(/\/$/, "")}/login`;

  const subject = isConverted
    ? `StyleQR: Your account is ready — ${lead.restaurant}`
    : `StyleQR: You're approved for beta — next steps`;

  const passwordLine = options?.tempPassword
    ? ` Use this temporary password: ${options.tempPassword} (change after first login).`
    : " We'll send your temporary password separately, or your admin will provide it.";

  const steps = isConverted
    ? [
        `1. Log in at ${loginUrl} with email: ${lead.email}.${passwordLine}`,
        "2. Add your menu: Dashboard → Menu → Categories & Items.",
        "3. Configure payments: Dashboard → Settings → Payment gateways (Stripe test mode).",
        "4. Create QR codes: Dashboard → QR → Tables. Print and place on tables.",
        "5. Test an order: Scan a QR, add items, complete a test payment.",
      ]
    : [
        "1. We'll create your account and send you login details shortly.",
        "2. Add your menu: Dashboard → Menu → Categories & Items.",
        "3. Configure payments: Dashboard → Settings → Payment gateways (Stripe test mode).",
        "4. Create QR codes: Dashboard → QR → Tables. Print and place on tables.",
        "5. Test an order: Scan a QR, add items, complete a test payment.",
      ];

  const stepsHtml = steps.map((s) => `<li style="margin-bottom:8px">${s}</li>`).join("");

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #27272a; max-width: 600px; margin: 0 auto; padding: 24px;">
  <div style="margin-bottom: 24px;">
    <h1 style="font-size: 24px; color: #18181b;">StyleQR Beta Access</h1>
  </div>
  <p>Hi ${lead.name},</p>
  ${
    isConverted
      ? `<p>Your StyleQR account is ready for <strong>${lead.restaurant}</strong>.</p>`
      : `<p>You've been approved for StyleQR beta. We're setting up your account and will send login details shortly.</p>`
  }
  <h2 style="font-size: 18px; margin-top: 24px;">Setup checklist</h2>
  <ol style="padding-left: 20px; margin: 16px 0;">
    ${stepsHtml}
  </ol>
  <p style="margin-top: 24px;">
    <a href="${loginUrl}" style="display: inline-block; padding: 12px 24px; background: #18181b; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">Log in to StyleQR</a>
  </p>
  <p style="margin-top: 24px; font-size: 14px; color: #71717a;">
    Beta mode: Stripe test keys in use. Manual onboarding only.
  </p>
  <p style="margin-top: 16px; font-size: 14px; color: #71717a;">
    — StyleQR Team
  </p>
</body>
</html>
`;

  const text = `
StyleQR Beta Access

Hi ${lead.name},

${isConverted ? `Your StyleQR account is ready for ${lead.restaurant}.` : `You've been approved for StyleQR beta. We're setting up your account and will send login details shortly.`}

Setup checklist:
${steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}

Log in: ${loginUrl}

Beta mode: Stripe test keys in use. Manual onboarding only.

— StyleQR Team
`;

  return { subject, html, text };
}

/**
 * Send beta approval/onboarding email.
 * No-op if SMTP not configured (logs instead).
 */
export async function sendBetaApprovalEmail(
  lead: BetaLead,
  options?: ApprovalEmailOptions
): Promise<void> {
  const { subject, html, text } = getBetaApprovalTemplate(lead, options);

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD) {
    logger.info("Beta approval email skipped (SMTP not configured)", {
      to: lead.email,
      subject,
      leadId: lead.id,
    });
    return;
  }

  try {
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.default.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: `"${SMTP_FROM_NAME}" <${SMTP_FROM}>`,
      to: lead.email,
      subject,
      text,
      html,
    });

    logger.info("Beta approval email sent", { to: lead.email, leadId: lead.id });
  } catch (error) {
    logger.error(
      "Beta email send failed",
      { to: lead.email, leadId: lead.id },
      error instanceof Error ? error : undefined
    );
    throw error;
  }
}
