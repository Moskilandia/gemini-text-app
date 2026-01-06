import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendInviteEmail(
  to: string,
  inviteUrl: string,
  orgName: string
) {
  await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to,
    subject: `You’re invited to join ${orgName} on Reasonly`,
    html: `
      <p>You’ve been invited to join <strong>${orgName}</strong> on Reasonly.</p>
      <p>Click below to accept the invite:</p>
      <p>
        <a href="${inviteUrl}" style="padding:10px 14px;background:#111827;color:#fff;border-radius:6px;text-decoration:none;">
          Join Team
        </a>
      </p>
      <p>This invite expires in 7 days.</p>
    `,
  });
}
