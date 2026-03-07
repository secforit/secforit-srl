import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { createClient } from '@/lib/supabase/server'
import type { ThreatIntelReport } from '@/app/api/threat-intel/route'

function tlpColor(tlp: string) {
  return { WHITE: '#555555', GREEN: '#2d7a2d', AMBER: '#b45309', RED: '#dc2626' }[tlp] ?? '#555555'
}
function severityColor(severity: string) {
  return { CRITICAL: '#dc2626', HIGH: '#ea580c', MEDIUM: '#d97706', LOW: '#2563eb', INFORMATIONAL: '#6b7280' }[severity] ?? '#6b7280'
}
function badge(text: string, bg: string, color = '#ffffff') {
  return `<span style="display:inline-block;padding:2px 10px;border-radius:4px;background:${bg};color:${color};font-size:11px;font-weight:700;font-family:monospace;margin-right:6px;">${text}</span>`
}
function section(title: string, content: string) {
  return `<tr><td style="padding:28px 0 0;">
    <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#6b7280;border-bottom:1px solid #e5e7eb;padding-bottom:8px;margin-bottom:14px;">${title}</div>
    ${content}
  </td></tr>`
}
function kvRow(label: string, value: string) {
  return `<tr>
    <td style="padding:5px 0;font-size:13px;color:#6b7280;width:170px;vertical-align:top;">${label}</td>
    <td style="padding:5px 0;font-size:13px;color:#111827;font-weight:500;">${value}</td>
  </tr>`
}
function bullets(items: string[]) {
  return `<ul style="margin:6px 0;padding-left:20px;">${items.map(i=>`<li style="font-size:13px;color:#374151;padding:2px 0;">${i}</li>`).join('')}</ul>`
}
function codeBox(text: string) {
  return `<div style="background:#f3f4f6;border:1px solid #e5e7eb;border-radius:6px;padding:10px 14px;font-family:monospace;font-size:12px;color:#1f2937;word-break:break-all;margin:4px 0;">${text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>`
}

function buildHtml(report: ThreatIntelReport, generatedBy: string): string {
  const cveId = report.vulnerability.cve_id ?? ''
  const tlpC = tlpColor(report.classification.tlp)
  const sevC = severityColor(report.classification.severity)

  const iocHtml = (['ips','domains','urls','hashes','user_agents','other'] as const)
    .flatMap(k => {
      const items = report.iocs[k] as string[] | undefined
      if (!items?.length) return []
      const label = {ips:'IP Addresses',domains:'Domains',urls:'URLs',hashes:'Hashes',user_agents:'User Agents',other:'Other'}[k]
      return [`<div style="margin-bottom:10px;"><div style="font-size:12px;font-weight:600;color:#6b7280;margin-bottom:4px;">${label}</div>${items.map(codeBox).join('')}</div>`]
    }).join('')

  const detectionHtml = (report.detection.detection_queries ?? []).map(q =>
    `<div style="margin-bottom:14px;"><div style="font-size:12px;font-weight:700;color:#374151;margin-bottom:6px;">${q.platform} — ${q.description}</div>${codeBox(q.query)}</div>`
  ).join('')

  const mitreHtml = [
    ...report.mitre_attack.tactics.map(t=>`<li style="font-size:13px;color:#374151;padding:2px 0;"><span style="font-family:monospace;font-weight:600;color:#7c3aed;">${t.id}</span> — ${t.name}</li>`),
    ...report.mitre_attack.techniques.map(t=>`<li style="font-size:13px;color:#374151;padding:2px 0;"><a href="https://attack.mitre.org/techniques/${t.id.replace('.','/')}/" style="font-family:monospace;color:#2563eb;text-decoration:none;">${t.id}</a> — ${t.name}${t.sub_technique?`: ${t.sub_technique}`:''}</li>`),
  ].join('')

  const hasIocs = Object.values(report.iocs).some(v => v && (v as string[]).length > 0)

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:32px 16px;">
<tr><td align="center">
<table width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;">
  <tr><td style="background:#0f172a;border-radius:12px 12px 0 0;padding:28px 32px;">
    <div style="font-size:11px;font-weight:700;letter-spacing:0.12em;color:#94a3b8;text-transform:uppercase;margin-bottom:6px;">SECFORIT · Threat Intelligence Report</div>
    <div style="font-size:20px;font-weight:700;color:#f8fafc;">${cveId?`<span style="font-family:monospace;">${cveId}</span> — `:''}${report.vulnerability.title}</div>
    <div style="margin-top:12px;">${badge(`TLP:${report.classification.tlp}`,tlpC)}${badge(report.classification.severity,sevC)}${badge(`Confidence: ${report.classification.confidence}`,'#334155','#cbd5e1')}${report.threat_context.cisa_kev?badge('CISA KEV','#7f1d1d'):''}${report.threat_context.ransomware_linked?badge('Ransomware','#7c2d12'):''}</div>
    <div style="margin-top:10px;font-size:11px;color:#64748b;">Generated ${new Date().toUTCString()} · ${generatedBy}</div>
  </td></tr>
  <tr><td style="background:#ffffff;padding:32px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
  <table width="100%" cellpadding="0" cellspacing="0">

    ${section('Executive Summary',`<p style="font-size:14px;color:#374151;line-height:1.7;margin:0;">${report.executive_summary}</p>`)}

    ${section('Vulnerability Details',`<table width="100%" cellpadding="0" cellspacing="0">
      ${kvRow('CVE ID', cveId?`<span style="font-family:monospace;">${cveId}</span>`:'—')}
      ${kvRow('Type', report.technical_analysis.vulnerability_type)}
      ${kvRow('CVSS Score', report.vulnerability.cvss_score!==undefined?`<strong>${report.vulnerability.cvss_score.toFixed(1)}</strong> (${report.classification.severity})`:'—')}
      ${kvRow('CVSS Vector', report.vulnerability.cvss_vector?`<span style="font-family:monospace;font-size:11px;">${report.vulnerability.cvss_vector}</span>`:'—')}
      ${kvRow('Patch Available', report.vulnerability.patch_available?'✅ Yes':'❌ No')}
      ${kvRow('Exploit Available', report.vulnerability.exploit_available?'⚠️ Yes':'No')}
      ${kvRow('Exploit Maturity', report.vulnerability.exploit_maturity?.replace(/_/g,' ')?? '—')}
    </table>
    <p style="font-size:13px;color:#374151;line-height:1.6;margin:12px 0;">${report.vulnerability.description}</p>
    <div><strong style="font-size:12px;color:#6b7280;">Affected Products:</strong>${bullets(report.vulnerability.affected_products)}</div>`)}

    ${section('Threat Context',`<table width="100%" cellpadding="0" cellspacing="0">
      ${kvRow('CISA KEV', report.threat_context.cisa_kev?'🔴 Yes — Confirmed exploited':'No')}
      ${kvRow('Active Exploitation', report.threat_context.active_exploitation?'🔴 Confirmed':'Not confirmed')}
      ${kvRow('Ransomware Linked', report.threat_context.ransomware_linked?'🟠 Yes':'No')}
    </table>
    ${report.threat_context.threat_actors?.length?`<div style="margin-top:10px;"><strong style="font-size:12px;color:#6b7280;">Threat Actors:</strong>${bullets(report.threat_context.threat_actors.map(a=>`${a.name} (${a.type.replace(/_/g,' ')})${a.motivation?` — ${a.motivation}`:''}`))}` :''}
    ${report.threat_context.targeted_sectors?.length?`<div style="margin-top:6px;"><strong style="font-size:12px;color:#6b7280;">Targeted Sectors:</strong> <span style="font-size:13px;color:#374151;">${report.threat_context.targeted_sectors.join(', ')}</span></div>`:''}
    `)}

    ${section('Technical Analysis',`
      <div style="margin-bottom:12px;"><strong style="font-size:12px;color:#6b7280;display:block;margin-bottom:4px;">Attack Scenario</strong><p style="font-size:13px;color:#374151;margin:0;line-height:1.6;white-space:pre-wrap;">${report.technical_analysis.attack_scenario}</p></div>
      <div><strong style="font-size:12px;color:#6b7280;">Prerequisites:</strong>${bullets(report.technical_analysis.prerequisites)}</div>
      ${report.technical_analysis.post_exploitation?.length?`<div style="margin-top:10px;"><strong style="font-size:12px;color:#6b7280;">Post-Exploitation:</strong>${bullets(report.technical_analysis.post_exploitation)}</div>`:''}`)}

    ${section('MITRE ATT&CK',`<ul style="margin:0;padding-left:20px;">${mitreHtml}</ul>`)}

    ${section('Impact Assessment',`<table width="100%" cellpadding="0" cellspacing="0">
      ${kvRow('Confidentiality', report.impact_assessment.confidentiality)}
      ${kvRow('Integrity', report.impact_assessment.integrity)}
      ${kvRow('Availability', report.impact_assessment.availability)}
    </table>
    <p style="font-size:13px;color:#374151;margin:10px 0 0;line-height:1.6;">${report.impact_assessment.business_impact}</p>`)}

    ${hasIocs ? section('Indicators of Compromise', iocHtml) : ''}

    ${section('Remediation',`
      <ol style="margin:0;padding-left:20px;">${report.remediation.priority_actions.map(a=>`<li style="font-size:13px;color:#374151;padding:3px 0;">${a}</li>`).join('')}</ol>
      <div style="margin-top:10px;"><strong style="font-size:12px;color:#6b7280;">Timeline:</strong> <span style="font-size:13px;color:#374151;">${report.remediation.timeline_recommendation}</span></div>
      ${report.remediation.workarounds?.length?`<div style="margin-top:10px;"><strong style="font-size:12px;color:#6b7280;">Workarounds:</strong>${bullets(report.remediation.workarounds)}</div>`:''}`)}

    ${(detectionHtml || report.detection.threat_hunting?.length) ? section('Detection',`${detectionHtml}${report.detection.threat_hunting?.length?`<div><strong style="font-size:12px;color:#6b7280;display:block;margin-bottom:4px;">Threat Hunting:</strong>${bullets(report.detection.threat_hunting!)}</div>`:''}`) : ''}

    ${section('Analyst Assessment',`<p style="font-size:13px;color:#374151;line-height:1.7;margin:0;font-style:italic;">${report.analyst_assessment}</p>`)}

  </table>
  </td></tr>
  <tr><td style="background:#f8fafc;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;padding:18px 32px;text-align:center;">
    <p style="margin:0;font-size:11px;color:#9ca3af;">SECFORIT Security Operations · <a href="https://www.secforit.ro" style="color:#6b7280;">secforit.ro</a><br>Classified ${badge(`TLP:${report.classification.tlp}`,tlpC)} — handle accordingly.</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { report, to } = await request.json() as { report: ThreatIntelReport; to?: string }
    if (!report) return NextResponse.json({ error: 'Missing report' }, { status: 400 })

    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, CONTACT_TO } = process.env
    if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !SMTP_FROM) {
      return NextResponse.json({ error: 'SMTP not configured' }, { status: 500 })
    }

    const recipient = to || user.email || CONTACT_TO!
    const cveId = report.vulnerability.cve_id ?? 'Threat Intel'

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: parseInt(SMTP_PORT, 10),
      secure: parseInt(SMTP_PORT, 10) === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    })

    await transporter.sendMail({
      from: `"SECFORIT Threat Intel" <${SMTP_FROM}>`,
      to: recipient,
      subject: `[TLP:${report.classification.tlp}] Threat Intel — ${cveId} — ${report.classification.severity}`,
      html: buildHtml(report, user.email ?? 'SECFORIT Analyst'),
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Send email error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to send' }, { status: 500 })
  }
}
