import { NextRequest, NextResponse } from "next/server"
import nodemailer from "nodemailer"

// ---------------------------------------------------------------------------
// In-memory rate limiter (per IP, resets on server restart)
// ---------------------------------------------------------------------------
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_WINDOW = 60 * 60 * 1000 // 1 hour
const RATE_LIMIT_MAX = 3 // max submissions per window

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW })
    return false
  }

  entry.count++
  return entry.count > RATE_LIMIT_MAX
}

// ---------------------------------------------------------------------------
// Input validation & sanitization
// ---------------------------------------------------------------------------

/** HTML-escape all dangerous characters to prevent injection in email templates */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function sanitize(str: string): string {
  return escapeHtml(str.trim())
}

function isValidEmail(email: string): boolean {
  // RFC 5321: max 254 chars; RFC 5322 simplified format check
  if (email.length > 254) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

interface ContactBody {
  name: string
  email: string
  company?: string
  message: string
}

function validateBody(
  body: unknown
): { valid: true; data: ContactBody } | { valid: false; error: string } {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Invalid request body." }
  }

  const { name, email, company, message } = body as Record<string, unknown>

  if (typeof name !== "string" || name.trim().length < 2) {
    return { valid: false, error: "Name must be at least 2 characters." }
  }
  if (name.trim().length > 100) {
    return { valid: false, error: "Name must be under 100 characters." }
  }

  if (typeof email !== "string" || !isValidEmail(email.trim())) {
    return { valid: false, error: "Please provide a valid email address." }
  }

  if (company !== undefined && typeof company !== "string") {
    return { valid: false, error: "Invalid company field." }
  }
  if (typeof company === "string" && company.trim().length > 200) {
    return { valid: false, error: "Company name must be under 200 characters." }
  }

  if (typeof message !== "string" || message.trim().length < 10) {
    return { valid: false, error: "Message must be at least 10 characters." }
  }
  if (message.trim().length > 5000) {
    return { valid: false, error: "Message must be under 5000 characters." }
  }

  return {
    valid: true,
    data: {
      name: sanitize(name),
      email: sanitize(email),
      company: company ? sanitize(company as string) : undefined,
      message: sanitize(message),
    },
  }
}

// ---------------------------------------------------------------------------
// reCAPTCHA Enterprise verification
// ---------------------------------------------------------------------------
async function verifyRecaptcha(token: string): Promise<boolean> {
  const projectId = process.env.RECAPTCHA_PROJECT_ID
  const apiKey = process.env.GOOGLE_API_KEY
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY

  if (!projectId || !apiKey) {
    console.warn('reCAPTCHA Enterprise not configured — skipping verification')
    return true
  }

  try {
    const res = await fetch(
      `https://recaptchaenterprise.googleapis.com/v1/projects/${projectId}/assessments?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: { token, siteKey, expectedAction: 'contact_form' },
        }),
      }
    )

    const data = await res.json()

    if (!data.tokenProperties?.valid) return false
    if (data.tokenProperties.action !== 'contact_form') return false
    return (data.riskAnalysis?.score ?? 0) >= 0.5
  } catch {
    console.error('reCAPTCHA Enterprise verification failed')
    return false
  }
}

// ---------------------------------------------------------------------------
// Honeypot field name — bots will fill this, real users won't see it
// ---------------------------------------------------------------------------
const HONEYPOT_FIELD = "_hp_website"

// ---------------------------------------------------------------------------
// POST /api/contact
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    // --- Rate limiting ---
    const forwarded = req.headers.get("x-forwarded-for")
    const ip = forwarded?.split(",")[0]?.trim() || "unknown"

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      )
    }

    // --- Parse body ---
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 }
      )
    }

    // --- Honeypot check ---
    if (
      body &&
      typeof body === "object" &&
      (body as Record<string, unknown>)[HONEYPOT_FIELD]
    ) {
      // Silently succeed so the bot thinks it worked
      return NextResponse.json({ success: true })
    }

    // --- reCAPTCHA verification ---
    const recaptchaToken =
      body && typeof body === "object"
        ? (body as Record<string, unknown>).recaptchaToken
        : undefined

    if (typeof recaptchaToken === "string" && recaptchaToken.length > 0) {
      const isHuman = await verifyRecaptcha(recaptchaToken)
      if (!isHuman) {
        // Silently succeed so bots think it worked
        return NextResponse.json({ success: true })
      }
    } else if (process.env.RECAPTCHA_SECRET_KEY) {
      // If reCAPTCHA is configured but no token was sent, reject
      return NextResponse.json({ success: true }) // silent fake success
    }

    // --- Validate ---
    const result = validateBody(body)
    if (!result.valid) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    const { name, email, company, message } = result.data

    // --- Verify environment ---
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, CONTACT_TO } =
      process.env

    if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !SMTP_FROM || !CONTACT_TO) {
      console.error("Missing SMTP environment variables")
      return NextResponse.json(
        { error: "Server configuration error. Please try again later." },
        { status: 500 }
      )
    }

    // --- Create transporter ---
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: parseInt(SMTP_PORT, 10),
      secure: true, // SSL/TLS on port 465
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
      tls: {
        // Allow self-signed certs if needed (common with cPanel)
        rejectUnauthorized: false,
      },
    })

    // --- Build internal notification email ---
    const notificationHtml = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:#0a0a0a;padding:28px 32px;border-radius:8px 8px 0 0;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <span style="color:#dc2626;font-size:22px;font-weight:700;letter-spacing:1px;">SECFORIT</span>
                  <span style="color:#737373;font-size:13px;margin-left:10px;">Security Operations</span>
                </td>
                <td align="right">
                  <span style="background:#dc2626;color:#fff;font-size:11px;font-weight:600;padding:4px 10px;border-radius:4px;letter-spacing:0.5px;">NEW INQUIRY</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#ffffff;padding:32px;border-left:1px solid #e4e4e7;border-right:1px solid #e4e4e7;">
            <p style="margin:0 0 24px;color:#3f3f46;font-size:15px;line-height:1.5;">
              A new contact form submission has been received. Details below:
            </p>

            <!-- Contact details -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;border:1px solid #e4e4e7;border-radius:6px;margin-bottom:24px;">
              <tr>
                <td style="padding:14px 20px;border-bottom:1px solid #e4e4e7;">
                  <span style="color:#71717a;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Full Name</span><br>
                  <span style="color:#0a0a0a;font-size:15px;font-weight:500;margin-top:4px;display:block;">${name}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:14px 20px;border-bottom:1px solid #e4e4e7;">
                  <span style="color:#71717a;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Email Address</span><br>
                  <a href="mailto:${email}" style="color:#dc2626;font-size:15px;font-weight:500;margin-top:4px;display:block;text-decoration:none;">${email}</a>
                </td>
              </tr>
              ${company ? `<tr>
                <td style="padding:14px 20px;border-bottom:1px solid #e4e4e7;">
                  <span style="color:#71717a;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Company</span><br>
                  <span style="color:#0a0a0a;font-size:15px;font-weight:500;margin-top:4px;display:block;">${company}</span>
                </td>
              </tr>` : ""}
              <tr>
                <td style="padding:14px 20px;">
                  <span style="color:#71717a;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Message</span><br>
                  <p style="color:#0a0a0a;font-size:15px;line-height:1.7;margin:8px 0 0;white-space:pre-wrap;">${message}</p>
                </td>
              </tr>
            </table>

            <!-- Reply CTA -->
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#dc2626;border-radius:6px;">
                  <a href="mailto:${email}?subject=Re: Your inquiry to SECFORIT" style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;letter-spacing:0.3px;">
                    Reply to ${name} →
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f4f4f5;padding:20px 32px;border-radius:0 0 8px 8px;border:1px solid #e4e4e7;border-top:none;">
            <p style="margin:0;color:#a1a1aa;font-size:12px;line-height:1.6;">
              This message was submitted via the contact form at <a href="https://www.secforit.ro" style="color:#dc2626;text-decoration:none;">secforit.ro</a>.
              Do not reply directly to this email — use the button above to reach the sender.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

    // --- Build confirmation email (to sender) ---
    const confirmationHtml = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:#0a0a0a;padding:28px 32px;border-radius:8px 8px 0 0;">
            <span style="color:#dc2626;font-size:22px;font-weight:700;letter-spacing:1px;">SECFORIT</span>
            <span style="color:#737373;font-size:13px;margin-left:10px;">Security Operations</span>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#ffffff;padding:40px 32px;border-left:1px solid #e4e4e7;border-right:1px solid #e4e4e7;">
            <h1 style="margin:0 0 8px;color:#0a0a0a;font-size:22px;font-weight:700;">Thank you, ${name}.</h1>
            <p style="margin:0 0 28px;color:#71717a;font-size:15px;">We have received your message and will get back to you within <strong style="color:#0a0a0a;">24 hours</strong> on business days.</p>

            <!-- Divider -->
            <div style="border-top:2px solid #dc2626;margin-bottom:28px;width:48px;"></div>

            <!-- Message recap -->
            <p style="margin:0 0 12px;color:#71717a;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Your message</p>
            <div style="background:#fafafa;border:1px solid #e4e4e7;border-left:3px solid #dc2626;border-radius:0 6px 6px 0;padding:16px 20px;margin-bottom:32px;">
              <p style="margin:0;color:#3f3f46;font-size:14px;line-height:1.7;white-space:pre-wrap;">${message}</p>
            </div>

            <!-- Contact info -->
            <p style="margin:0 0 16px;color:#3f3f46;font-size:14px;line-height:1.6;">
              In the meantime, feel free to reach us directly at
              <a href="mailto:razvan@secforit.ro" style="color:#dc2626;text-decoration:none;font-weight:600;">razvan@secforit.ro</a>
              or visit us at
              <a href="https://www.secforit.ro" style="color:#dc2626;text-decoration:none;font-weight:600;">secforit.ro</a>.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f4f4f5;padding:20px 32px;border-radius:0 0 8px 8px;border:1px solid #e4e4e7;border-top:none;">
            <p style="margin:0;color:#a1a1aa;font-size:12px;line-height:1.6;">
              © ${new Date().getFullYear()} SECFORIT · Romania, EU ·
              <a href="https://www.secforit.ro/privacy-policy" style="color:#a1a1aa;">Privacy Policy</a>
            </p>
            <p style="margin:6px 0 0;color:#a1a1aa;font-size:11px;">
              You are receiving this email because you submitted a contact form at secforit.ro.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

    // --- Send notification to team ---
    await transporter.sendMail({
      from: `"SECFORIT" <${SMTP_FROM}>`,
      to: CONTACT_TO,
      replyTo: email,
      subject: `New inquiry from ${name}${company ? " · " + company : ""}`,
      text: `Name: ${name}\nEmail: ${email}${company ? "\nCompany: " + company : ""}\n\nMessage:\n${message}`,
      html: notificationHtml,
    })

    // --- Send confirmation to sender ---
    await transporter.sendMail({
      from: `"SECFORIT" <${SMTP_FROM}>`,
      to: email,
      subject: `We received your message, ${name.split(" ")[0]}`,
      text: `Hi ${name},\n\nThank you for reaching out. We have received your message and will get back to you within 24 hours on business days.\n\nYour message:\n${message}\n\n— SECFORIT Team\nhttps://www.secforit.ro`,
      html: confirmationHtml,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Contact form error:", error)
    return NextResponse.json(
      { error: "Failed to send message. Please try again later." },
      { status: 500 }
    )
  }
}
