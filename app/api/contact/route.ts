import { NextRequest, NextResponse } from "next/server"
import nodemailer from "nodemailer"

// ---------------------------------------------------------------------------
// In-memory rate limiter (per IP, resets on server restart)
// ---------------------------------------------------------------------------
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_WINDOW = 15 * 60 * 1000 // 15 minutes
const RATE_LIMIT_MAX = 5 // max submissions per window

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
function sanitize(str: string): string {
  return str
    .replace(/[<>]/g, "") // strip angle brackets (basic XSS prevention)
    .trim()
}

function isValidEmail(email: string): boolean {
  // RFC 5322 simplified — covers real-world addresses
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

    // --- Build email ---
    const companyLine = company ? `\nCompany: ${company}` : ""

    const htmlBody = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #dc2626; padding: 20px 24px; border-radius: 8px 8px 0 0;">
          <h1 style="color: #ffffff; margin: 0; font-size: 20px;">New Contact Form Submission</h1>
        </div>
        <div style="background: #ffffff; padding: 24px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 8px 8px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #525252; font-weight: 600; width: 100px;">Name:</td>
              <td style="padding: 8px 0; color: #0a0a0a;">${name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #525252; font-weight: 600;">Email:</td>
              <td style="padding: 8px 0; color: #0a0a0a;"><a href="mailto:${email}" style="color: #dc2626;">${email}</a></td>
            </tr>
            ${company ? `<tr><td style="padding: 8px 0; color: #525252; font-weight: 600;">Company:</td><td style="padding: 8px 0; color: #0a0a0a;">${company}</td></tr>` : ""}
          </table>
          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 16px 0;" />
          <div style="color: #525252; font-weight: 600; margin-bottom: 8px;">Message:</div>
          <div style="color: #0a0a0a; white-space: pre-wrap; line-height: 1.6;">${message}</div>
        </div>
        <div style="text-align: center; padding: 16px; color: #a3a3a3; font-size: 12px;">
          Sent from secforit.ro contact form
        </div>
      </div>
    `

    // --- Send email ---
    await transporter.sendMail({
      from: `"SECFORIT Contact" <${SMTP_FROM}>`,
      to: CONTACT_TO,
      replyTo: email,
      subject: `Contact Form: ${name}${companyLine}`,
      text: `Name: ${name}\nEmail: ${email}${companyLine}\n\nMessage:\n${message}`,
      html: htmlBody,
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
