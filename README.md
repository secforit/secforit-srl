# SECFORIT SRL

**Security by Design. Protection by Default.**

Professional cybersecurity consulting platform for SECFORIT — featuring a public marketing site, a secure client portal, a live vulnerability intelligence feed, and an AI-powered threat intelligence report engine that delivers structured CTI reports via email.

---

## Features

### Public Site
- Marketing pages: Home, Services, Privacy Policy, Cookie Policy
- Contact form with reCAPTCHA Enterprise, honeypot, and rate limiting
- Responsive navigation with dark/light theme support

### Authentication
- Email + password registration (Zod-validated, strength-enforced)
- **Invite-code gating** — registration requires a valid invite code (`INVITE_CODES` env var)
- Supabase Auth with email confirmation and session management
- Passkey (WebAuthn) support via `PasskeyManager`

### Secure Portal (`/portal`)
- Session-protected dashboard with account details
- **Vulnerability Feed** — live feed aggregating NVD CVE data + CISA Known Exploited Vulnerabilities (KEV) catalog, cached hourly
- **Threat Intelligence** — AI-generated CTI reports delivered via branded HTML email

### Threat Intelligence Engine
- Triggers from any CVE in the vulnerability feed with one click
- Uses **OpenAI GPT-4o** with structured outputs (Zod schema enforcement)
- Generates analyst-quality reports covering:
  - Executive summary · CVSS v3.1 breakdown
  - Exploitation status · CISA KEV entry
  - MITRE ATT&CK tactics & techniques
  - Technical root cause & exploitation mechanics
  - IOCs (hashes, IPs, domains, YARA rules)
  - Detection queries (Splunk SPL / Microsoft Sentinel KQL)
  - Prioritised remediation with patch versions
  - Threat actor attribution · Senior analyst assessment
- Report delivered as a **branded HTML email** (TLP-classified, SECFORIT logo)
- Access restricted to an allowlist (`THREAT_INTEL_ALLOWED_EMAILS` env var)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript) |
| UI | React 19, Tailwind CSS 4, Radix UI, shadcn/ui |
| Auth | Supabase Auth + `@supabase/ssr` |
| AI | OpenAI GPT-4o (`openai` SDK v6, structured outputs) |
| Email | Nodemailer over SMTP/TLS |
| Validation | Zod |
| Forms | React Hook Form |
| Icons | Lucide React |
| Analytics | Vercel Analytics |
| Deployment | Vercel |

---

## Project Structure

```
secforit-srl/
├── app/
│   ├── api/
│   │   ├── contact/route.ts          # Contact form handler (SMTP, reCAPTCHA)
│   │   ├── vulnerabilities/route.ts  # NVD + CISA KEV feed aggregation
│   │   └── threat-intel/route.ts     # OpenAI CTI report generation + email
│   ├── auth/
│   │   ├── actions.ts                # Server actions: login, register, logout
│   │   └── callback/route.ts         # Supabase auth callback
│   ├── portal/
│   │   ├── page.tsx                  # User dashboard
│   │   ├── vulnerabilities/page.tsx  # Live vulnerability feed
│   │   └── threat-intel/page.tsx     # Threat intel page
│   ├── login/page.tsx
│   ├── register/page.tsx             # Invite-code gated registration
│   ├── services/page.tsx
│   ├── privacy-policy/page.tsx
│   ├── cookie-policy/page.tsx
│   ├── layout.tsx
│   ├── page.tsx                      # Home / marketing page
│   ├── sitemap.ts
│   └── robots.ts
├── components/
│   ├── ui/                           # shadcn/ui primitives
│   ├── vulnerability-feed.tsx        # CVE feed with Generate CTI Report button
│   ├── threat-intel-report.tsx       # Structured report renderer
│   ├── navigation.tsx
│   ├── passkey-manager.tsx
│   └── ...
├── lib/
│   ├── supabase/                     # Supabase client (browser + server)
│   └── utils.ts
├── public/
│   ├── Logo-SECFORIT.png
│   └── logo-secforit.svg
└── supabase/                         # Supabase config / migrations
```

---

## Environment Variables

Create a `.env.local` file:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Site
NEXT_PUBLIC_SITE_URL=https://www.secforit.ro

# OpenAI (threat intel engine)
OPENAI_API_KEY=

# Threat intel access control (comma-separated emails)
THREAT_INTEL_ALLOWED_EMAILS=analyst@example.com,razvan@secforit.ro

# Registration invite codes (comma-separated)
INVITE_CODES=CODE-ONE,CODE-TWO

# SMTP (email delivery)
SMTP_HOST=
SMTP_PORT=465
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@secforit.ro
CONTACT_TO=razvan@secforit.ro

# reCAPTCHA Enterprise (contact form)
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=
RECAPTCHA_PROJECT_ID=
GOOGLE_API_KEY=
```

---

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
# Production build
npm run build
npm start

# Lint
npm run lint
```

---

## Key Flows

### Registration
1. User visits `/register`
2. Enters email, password (strength-enforced), and an invite code
3. Server validates the invite code against `INVITE_CODES`
4. Supabase sends a confirmation email
5. User confirms and can log in

### Vulnerability Feed
1. Portal page fetches `/api/vulnerabilities` (cached 1h)
2. Route merges CISA KEV catalog + NVD CVE details per entry
3. Feed displays severity, CVSS score, KEV dates, ransomware flags
4. Analyst clicks **Generate CTI Report** on any card

### CTI Report Generation
1. `POST /api/threat-intel` with CVE data as JSON
2. Auth check + allowlist check
3. OpenAI GPT-4o generates structured report (20+ fields, Zod-validated)
4. Branded HTML email sent to analyst via SMTP (async, non-blocking)
5. UI button transitions: idle → loading → **Report sent ✓**

---

## Design System

| Token | Value | Usage |
|---|---|---|
| `--primary` | `#dc2626` | Brand red, CTAs |
| `--background` | `#ffffff` / `#0a0a0a` | Light / dark |
| `--foreground` | `#0a0a0a` / `#ffffff` | Text |
| `--border` | `#e5e5e5` | Borders |

Fonts: **Space Grotesk** (sans) · **JetBrains Mono** (mono)

---

## Deployment

Deployed on [Vercel](https://vercel.com). Set all environment variables in the Vercel project settings.

The threat intel route has `export const maxDuration = 120` to accommodate OpenAI response times on Vercel's serverless functions.
