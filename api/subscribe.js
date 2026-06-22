/**
 * POST /api/subscribe
 *
 * Handles the lead-capture form on the Likuid home page.
 *   1. Validate + honeypot.
 *   2. (Optional) email the person a branded thank-you via Postmark.
 *   3. Push the lead into the Veepveep CRM.
 *
 * Unlike the Credit Canary equivalents, the Postmark step here is fail-open:
 * if Postmark isn't configured the confirmation email is simply skipped and we
 * still register the lead + return success. This means the form works as soon
 * as LEAD_API_KEY is set on Vercel, with Postmark as an optional upgrade.
 *
 * Env vars (set on Vercel):
 *   LEAD_API_KEY                              (Veepveep CRM — required for CRM push)
 *   POSTMARK_TOKEN, POSTMARK_FROM_EMAIL       (optional — enables confirmation email)
 *   POSTMARK_FROM_NAME, POSTMARK_MESSAGE_STREAM (optional)
 *
 * Request body (JSON): { email, company, url, website(honeypot) }
 */

const SITE_URL = "https://likuid.ai";
const FROM_FALLBACK_NAME = "Likuid";
const CONTACT_EMAIL = "hello@likuid.ai";

function isEmail(s) {
  return typeof s === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

function buildHtml() {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Thanks from Likuid</title></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0B0F1A;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc;"><tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
      <tr><td style="padding:24px 32px;background:#08090a;">
        <span style="font-size:22px;font-weight:800;letter-spacing:-0.02em;color:#ffffff;">Likuid</span>
      </td></tr>
      <tr><td style="padding:32px 32px 8px 32px;">
        <h1 style="margin:0 0 8px 0;font-size:24px;line-height:32px;font-weight:700;letter-spacing:-0.02em;color:#0B0F1A;">Thanks &mdash; we&rsquo;ve got your details.</h1>
        <p style="margin:0 0 16px 0;font-size:16px;line-height:24px;color:#33475b;">Thanks for your interest in Likuid. <strong style="color:#0B0F1A;">A member of our team will be in touch shortly.</strong></p>
        <p style="margin:0 0 24px 0;font-size:16px;line-height:24px;color:#33475b;">If there&rsquo;s anything specific you&rsquo;d like to see, just reply to this email.</p>
      </td></tr>
      <tr><td style="padding:0 32px 28px 32px;">
        <p style="margin:0;font-size:14px;line-height:22px;color:#6f8093;">Questions any time: <a href="mailto:${CONTACT_EMAIL}" style="color:#3FA9F5;">${CONTACT_EMAIL}</a></p>
      </td></tr>
      <tr><td style="padding:24px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;">
        <p style="margin:0;font-size:12px;line-height:18px;color:#6f8093;">Sent by Likuid. <a href="mailto:${CONTACT_EMAIL}?subject=unsubscribe" style="color:#6f8093;">Unsubscribe</a></p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

function buildText() {
  return [
    "Thanks — we've got your details.",
    "",
    "Thanks for your interest in Likuid. A member of our team will be in touch shortly.",
    "",
    "If there's anything specific you'd like to see, just reply to this email.",
    "",
    `Questions any time: ${CONTACT_EMAIL}`,
  ].join("\n");
}

// Push the lead into the Veepveep CRM. Fail-open: never throws.
async function pushLeadToCrm({ email, company, pageUrl }) {
  const key = (process.env.LEAD_API_KEY || "").trim();
  if (!key) {
    console.warn("LEAD_API_KEY not set — skipping CRM lead push");
    return;
  }
  try {
    const crmRes = await fetch("https://www.veepveep.co.uk/api/leads", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        email,
        company,
        source: "likuid-website",
        asset: "Home page enquiry",
        kind: "enquiry",
        message: "Likuid home-page lead capture",
        url: pageUrl || `${SITE_URL}/`,
      }),
    });
    if (!crmRes.ok) {
      const detail = await crmRes.text().catch(() => "");
      console.error("CRM lead push failed:", crmRes.status, detail);
    }
  } catch (err) {
    console.error("CRM lead push error:", err);
  }
}

// Send the confirmation email via Postmark. Fail-open: returns false on any issue.
async function sendConfirmation(email, company) {
  const token = process.env.POSTMARK_TOKEN;
  const fromEmail = process.env.POSTMARK_FROM_EMAIL;
  if (!token || !fromEmail) {
    console.warn("Postmark not configured — skipping confirmation email");
    return false;
  }
  const fromName = process.env.POSTMARK_FROM_NAME || FROM_FALLBACK_NAME;
  const stream = process.env.POSTMARK_MESSAGE_STREAM || "outbound";
  try {
    const res = await fetch("https://api.postmarkapp.com/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Postmark-Server-Token": token,
      },
      body: JSON.stringify({
        From: `${fromName} <${fromEmail}>`,
        To: email,
        Subject: "Thanks — we've got your details",
        HtmlBody: buildHtml(),
        TextBody: buildText(),
        MessageStream: stream,
        Tag: "likuid-lead",
        Metadata: { company },
        Headers: [{ Name: "List-Unsubscribe", Value: `<mailto:${CONTACT_EMAIL}?subject=unsubscribe>` }],
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("Postmark send failed:", res.status, detail);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Postmark send error:", err);
    return false;
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const company = typeof body.company === "string" ? body.company.trim() : "";
  const pageUrl = typeof body.url === "string" ? body.url.trim() : "";
  const honeypot = typeof body.website === "string" ? body.website.trim() : "";

  // Honeypot: a filled hidden field means a bot — fake success, do nothing.
  if (honeypot) {
    res.status(200).json({ ok: true });
    return;
  }

  if (!isEmail(email)) {
    res.status(400).json({ error: "Please enter a valid email address." });
    return;
  }

  try {
    // CRM push + optional confirmation email, both fail-open.
    await pushLeadToCrm({ email, company, pageUrl });
    await sendConfirmation(email, company);
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("subscribe error:", err);
    // The lead helpers are fail-open, so reaching here is unexpected — still 200
    // so the visitor isn't blocked; the lead is logged above either way.
    res.status(200).json({ ok: true });
  }
};
