import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { createClient } from '@/lib/supabase/server'
import { buildReportHtml, buildReportPlainText } from '@/lib/threat-intel-html'
import type { ThreatIntelReport } from '@/app/api/threat-intel/route'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
    }

    const body = await req.json()
    const { report, action } = body as { report: ThreatIntelReport; action: 'download' | 'email' }

    if (!report || !action) {
      return NextResponse.json({ error: 'Missing report or action.' }, { status: 400 })
    }

    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.secforit.ro').replace(/\/$/, '')
    const html = buildReportHtml(report, siteUrl)

    if (action === 'download') {
      return new NextResponse(html, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Disposition': `attachment; filename="CTI-${report.vulnerability.cve_id}-${report.classification.report_date}.html"`,
        },
      })
    }

    if (action === 'email') {
      const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env
      if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !SMTP_FROM) {
        return NextResponse.json({ error: 'Email delivery is not configured.' }, { status: 500 })
      }

      const transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: parseInt(SMTP_PORT, 10),
        secure: true,
        auth: { user: SMTP_USER, pass: SMTP_PASS },
      })

      await transporter.sendMail({
        from: `"SECFORIT Threat Intel" <${SMTP_FROM}>`,
        to: user.email!,
        subject: `[CTI] ${report.vulnerability.cve_id} — ${report.classification.severity} | ${report.vulnerability.title}`,
        text: buildReportPlainText(report),
        html,
      })

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 })
  } catch (err) {
    console.error('Threat intel export error:', err)
    return NextResponse.json({ error: 'Export failed.' }, { status: 500 })
  }
}
