import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { zodResponseFormat } from 'openai/helpers/zod'
import { z } from 'zod'
import nodemailer from 'nodemailer'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 120

const client = new OpenAI()

// ─── Authorization ────────────────────────────────────────────────────────────

function isAuthorized(email: string | undefined): boolean {
  if (!email) return false
  const allowed = (process.env.THREAT_INTEL_ALLOWED_EMAILS ?? '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean)
  return allowed.includes(email.toLowerCase())
}

// ─── System Prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a Senior Cyber Threat Intelligence (CTI) Analyst with 15+ years of experience across vulnerability research, threat actor tracking, malware analysis, incident response, and security operations. You hold deep expertise in:

- CVSS v3.1 scoring interpretation and contextual risk assessment
- MITRE ATT&CK Enterprise Matrix (tactics, techniques, sub-techniques)
- CISA advisories, Known Exploited Vulnerabilities (KEV) catalog, and BOD 22-01
- Threat actor profiling (nation-state, cybercriminal, ransomware ecosystems)
- Detection engineering (SIEM queries, YARA, behavioral analytics)
- Regulatory frameworks: NIS2, ISO 27001, SOC 2, GDPR

## Analytical Framework

### Intelligence Confidence Scale
- **High**: Multiple independent corroborating sources, direct technical evidence available
- **Medium**: Single credible source, partial technical evidence, or vendor-confirmed but undetailed
- **Low**: Single unconfirmed report, circumstantial indicators, or limited public disclosure

### Traffic Light Protocol (TLP)
- TLP:WHITE — Publicly disclosed, unrestricted redistribution permitted
- TLP:GREEN — Shared within the security community, not for public posting
- TLP:AMBER — Limited distribution within the recipient organization only
- TLP:RED — Restricted to named recipients, not for further sharing

### MITRE ATT&CK Mapping (Enterprise Matrix)
Map ALL observed or reasonably inferred adversary behaviors to Tactics (TA####), Techniques (T####), and Sub-techniques (T####.###) using EXACT official IDs and names.

## Intelligence Extraction Requirements

### Vulnerability Intelligence
- All CVE identifiers with CVSS v3.1 vector string and base score
- CWE classification with precise technical explanation
- Affected products and vulnerable version ranges
- Fixed/patched versions with patch dates
- Vendor advisory IDs and co-disclosed CVEs
- Workaround details and KB article references

### Threat Context
- Exploitation status with confirming organizations
- CISA KEV catalog entry: date added, mandatory remediation deadline, governing directive
- Named threat actor attribution with confidence level
- Ransomware campaign associations

### Technical Analysis
- Root cause at code/architecture level
- Exact affected component, function, or endpoint
- Full exploitation mechanics step-by-step
- All prerequisites: auth state, network position, user interaction
- Post-exploitation capabilities: RCE, credential theft, lateral movement, persistence

### Indicators of Compromise
Extract ALL available IOCs. If none exist, explicitly state why (too recent, no malware samples published, etc.)

### Remediation Intelligence
- Patch urgency calibrated to CVSS score + active exploitation
- Every patch option per product with exact version numbers
- Every workaround with step-by-step implementation and effectiveness rating
- Hardening measures and network segmentation recommendations
- Federal compliance deadlines

### Detection Engineering
- Specific log sources and event IDs capturing exploitation
- Behavioral indicators: process trees, network connections, file artifacts
- Detection queries (Splunk SPL, KQL for Sentinel, or YARA)
- EDR/endpoint visibility gaps specific to this product
- Threat hunting recommendations

## Output Quality Standards
- **Precise**: Exact version numbers, ISO 8601 dates, MITRE IDs, CVSS vectors
- **Actionable**: Every section enables immediate defensive action
- **Evidence-based**: Attribute claims to sources, do not fabricate details
- **Transparent about gaps**: State what is unknown and why
- **Proportionate**: Calibrate urgency to actual exploitation evidence`

// ─── Schema ───────────────────────────────────────────────────────────────────

const ThreatIntelSchema = z.object({
  classification: z.object({
    tlp: z.enum(['WHITE', 'GREEN', 'AMBER', 'RED']),
    confidence: z.enum(['High', 'Medium', 'Low']),
    severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
    report_date: z.string(),
  }),
  executive_summary: z.string(),
  vulnerability: z.object({
    cve_id: z.string(),
    title: z.string(),
    cvss_score: z.number(),
    cvss_severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
    cvss_vector: z.string(),
    cvss_breakdown: z.object({
      attack_vector: z.enum(['Network', 'Adjacent', 'Local', 'Physical']),
      attack_complexity: z.enum(['Low', 'High']),
      privileges_required: z.enum(['None', 'Low', 'High']),
      user_interaction: z.enum(['None', 'Required']),
      scope: z.enum(['Unchanged', 'Changed']),
      confidentiality: z.enum(['None', 'Low', 'High']),
      integrity: z.enum(['None', 'Low', 'High']),
      availability: z.enum(['None', 'Low', 'High']),
    }),
    cwe_id: z.string(),
    cwe_name: z.string(),
    cwe_explanation: z.string(),
    vendor: z.string(),
    product: z.string(),
    affected_versions: z.array(z.string()),
    fixed_versions: z.array(z.string()),
    vendor_advisory_id: z.string(),
    patch_release_date: z.string(),
    related_cves: z.array(z.object({
      cve_id: z.string(),
      description: z.string(),
      cvss_score: z.number(),
    })),
  }),
  threat_context: z.object({
    exploitation_status: z.enum([
      'Actively Exploited in the Wild',
      'Proof-of-Concept Available',
      'No Known Exploitation',
      'Theoretical',
    ]),
    exploitation_confirmed_by: z.array(z.string()),
    exploitation_description: z.string(),
    cisa_kev: z.object({
      in_catalog: z.boolean(),
      date_added: z.string(),
      remediation_due: z.string(),
      directive: z.string(),
    }),
    threat_actors: z.array(z.object({
      name: z.string(),
      category: z.string(),
      confidence: z.enum(['High', 'Medium', 'Low']),
      notes: z.string(),
    })),
    ransomware_association: z.boolean(),
    ransomware_notes: z.string(),
  }),
  technical_analysis: z.object({
    vulnerability_class: z.string(),
    root_cause: z.string(),
    affected_component: z.string(),
    attack_prerequisites: z.array(z.string()),
    exploitation_mechanics: z.string(),
    exploit_complexity: z.string(),
    post_exploitation: z.object({
      immediate_impact: z.string(),
      lateral_movement: z.string(),
      persistence: z.string(),
      data_at_risk: z.array(z.string()),
    }),
    attack_scenario: z.string(),
  }),
  mitre_attack: z.object({
    tactics: z.array(z.object({
      id: z.string(),
      name: z.string(),
    })),
    techniques: z.array(z.object({
      id: z.string(),
      name: z.string(),
      tactic: z.string(),
      relevance: z.string(),
    })),
  }),
  impact_assessment: z.object({
    confidentiality_impact: z.enum(['High', 'Medium', 'Low', 'None']),
    integrity_impact: z.enum(['High', 'Medium', 'Low', 'None']),
    availability_impact: z.enum(['High', 'Medium', 'Low', 'None']),
    business_impact: z.string(),
    affected_environments: z.array(z.string()),
    risk_multipliers: z.array(z.string()),
    strategic_significance: z.string(),
  }),
  iocs: z.object({
    file_hashes: z.array(z.string()),
    ip_addresses: z.array(z.string()),
    domains: z.array(z.string()),
    file_paths: z.array(z.string()),
    commands: z.array(z.string()),
    yara_rules: z.array(z.string()),
    network_signatures: z.array(z.string()),
    availability_note: z.string(),
  }),
  remediation: z.object({
    urgency: z.enum(['Immediate (0-24h)', 'Urgent (1-3 days)', 'High (within 2 weeks)', 'Moderate (30 days)']),
    urgency_rationale: z.string(),
    patches: z.array(z.object({
      product: z.string(),
      fixed_version: z.string(),
      kb_article: z.string(),
      notes: z.string(),
    })),
    workarounds: z.array(z.object({
      title: z.string(),
      effectiveness: z.enum(['Full Mitigation', 'Partial Mitigation', 'Reduces Attack Surface']),
      steps: z.array(z.string()),
      limitations: z.string(),
    })),
    hardening_measures: z.array(z.string()),
    compliance_deadline: z.string(),
    priority_actions: z.array(z.string()),
  }),
  detection: z.object({
    log_sources: z.array(z.string()),
    behavioral_indicators: z.array(z.string()),
    detection_queries: z.array(z.object({
      platform: z.string(),
      description: z.string(),
      query: z.string(),
    })),
    edr_gap: z.string(),
    threat_hunting: z.array(z.string()),
    monitoring_recommendations: z.array(z.string()),
  }),
  references: z.array(z.object({
    title: z.string(),
    source: z.string(),
    url: z.string(),
    type: z.enum(['Vendor Advisory', 'CVE Entry', 'KEV Catalog', 'News Article', 'Workaround KB', 'Research Paper', 'Other']),
  })),
  analyst_assessment: z.string(),
})

export type ThreatIntelReport = z.infer<typeof ThreatIntelSchema>

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // Auth — must be authenticated + authorized
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
    }
    if (!isAuthorized(user.email)) {
      return NextResponse.json({ error: 'Your account is not authorized to generate threat intelligence reports.' }, { status: 403 })
    }

    const body = await req.json()
    const { cve_data } = body

    if (!cve_data) {
      return NextResponse.json({ error: 'Provide CVE data to analyze.' }, { status: 400 })
    }

    const doc = buildCveDocument(cve_data)
    const userContent = `Analyze the following vulnerability intelligence data and generate a comprehensive structured CTI report. Use your knowledge to enrich the analysis beyond what is provided — include MITRE ATT&CK mapping, exploitation mechanics, detection queries, and post-exploitation analysis. For fields not in the provided data, apply your expert knowledge of this vulnerability class. Where specific details are not publicly known, state this clearly.\n\n${doc}`

    const completion = await client.chat.completions.parse({
      model: 'gpt-4o-2024-08-06',
      max_tokens: 16000,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
      response_format: zodResponseFormat(ThreatIntelSchema, 'threat_intelligence_report'),
    })

    const report = completion.choices[0]?.message?.parsed

    if (!report) {
      return NextResponse.json(
        { error: 'The AI model declined to generate a report for this content.' },
        { status: 422 }
      )
    }

    // Send report via email (fire-and-forget, don't block the response)
    sendReportEmail(report, user.email!).catch(err =>
      console.error('Failed to send threat intel email:', err)
    )

    return NextResponse.json({
      report,
      usage: {
        input_tokens: completion.usage?.prompt_tokens ?? 0,
        output_tokens: completion.usage?.completion_tokens ?? 0,
      },
    })
  } catch (err) {
    console.error('Threat intel error:', err)
    if (err instanceof OpenAI.APIError) {
      if (err.status === 401) {
        return NextResponse.json({ error: 'Invalid OpenAI API key.' }, { status: 401 })
      }
      if (err.status === 400) {
        return NextResponse.json({ error: 'Invalid request: ' + err.message }, { status: 400 })
      }
    }
    return NextResponse.json({ error: 'Failed to generate report. Please try again.' }, { status: 500 })
  }
}

// ─── Email Delivery ───────────────────────────────────────────────────────────

async function sendReportEmail(report: ThreatIntelReport, recipientEmail: string) {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.secforit.ro').replace(/\/$/, '')
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !SMTP_FROM) {
    console.warn('SMTP not configured — skipping threat intel email delivery')
    return
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT, 10),
    secure: true,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    tls: { rejectUnauthorized: false },
  })

  const severityColor: Record<string, string> = {
    CRITICAL: '#dc2626',
    HIGH: '#ea580c',
    MEDIUM: '#d97706',
    LOW: '#2563eb',
  }
  const sevColor = severityColor[report.classification.severity] ?? '#71717a'

  const tlpBg: Record<string, string> = {
    WHITE: '#ffffff',
    GREEN: '#16a34a',
    AMBER: '#d97706',
    RED: '#dc2626',
  }
  const tlpColor: Record<string, string> = {
    WHITE: '#000000',
    GREEN: '#ffffff',
    AMBER: '#000000',
    RED: '#ffffff',
  }

  const listItems = (items: string[]) =>
    items.map(i => `<li style="margin:4px 0;color:#3f3f46;font-size:13px;line-height:1.6;">${i}</li>`).join('')

  const sectionHeader = (title: string) =>
    `<h3 style="margin:24px 0 8px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#71717a;border-bottom:1px solid #e4e4e7;padding-bottom:6px;">${title}</h3>`

  const infoRow = (label: string, value: string) =>
    `<tr>
      <td style="padding:8px 12px;font-size:12px;font-weight:600;color:#71717a;text-transform:uppercase;letter-spacing:0.5px;white-space:nowrap;vertical-align:top;border-bottom:1px solid #f4f4f5;">${label}</td>
      <td style="padding:8px 12px;font-size:13px;color:#0a0a0a;vertical-align:top;border-bottom:1px solid #f4f4f5;">${value}</td>
    </tr>`

  const cvssScore = report.vulnerability.cvss_score
  const cvssBarWidth = Math.round((cvssScore / 10) * 100)
  const cvssBarColor = cvssScore >= 9 ? '#dc2626' : cvssScore >= 7 ? '#ea580c' : cvssScore >= 4 ? '#d97706' : '#2563eb'

  const iocSection = (label: string, items: string[]) =>
    items.length === 0 ? '' : `
      ${sectionHeader(label)}
      <div style="background:#0a0a0a;border-radius:6px;padding:12px 16px;margin-bottom:8px;">
        ${items.map(i => `<div style="font-family:monospace;font-size:12px;color:#4ade80;word-break:break-all;margin:3px 0;">${i}</div>`).join('')}
      </div>`

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
<tr><td align="center">
<table width="680" cellpadding="0" cellspacing="0" style="max-width:680px;width:100%;">

  <!-- Header -->
  <tr>
    <td style="background:#0a0a0a;padding:24px 32px;border-radius:8px 8px 0 0;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td>
            <img src="${siteUrl}/Logo-SECFORIT.png" alt="SECFORIT" width="160" height="44" style="height:36px;width:auto;display:block;" />
            <span style="color:#737373;font-size:12px;display:block;margin-top:6px;">Threat Intelligence Report</span>
          </td>
          <td align="right">
            <span style="background:${tlpBg[report.classification.tlp]};color:${tlpColor[report.classification.tlp]};font-size:11px;font-weight:700;padding:3px 10px;border-radius:4px;letter-spacing:0.5px;margin-right:6px;">TLP:${report.classification.tlp}</span>
            <span style="background:${sevColor};color:#fff;font-size:11px;font-weight:700;padding:3px 10px;border-radius:4px;letter-spacing:0.5px;">${report.classification.severity}</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- CVE Title Block -->
  <tr>
    <td style="background:#fff;padding:28px 32px 20px;border-left:1px solid #e4e4e7;border-right:1px solid #e4e4e7;">
      <div style="margin-bottom:4px;">
        <span style="font-family:monospace;font-size:16px;font-weight:700;color:#dc2626;">${report.vulnerability.cve_id}</span>
        <span style="font-size:14px;color:#71717a;margin-left:8px;">${report.vulnerability.vendor} · ${report.vulnerability.product}</span>
      </div>
      <h1 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#0a0a0a;line-height:1.3;">${report.vulnerability.title}</h1>

      <!-- CVSS Bar -->
      <div style="margin-bottom:6px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding-right:16px;">
              <div style="height:8px;background:#e4e4e7;border-radius:4px;overflow:hidden;">
                <div style="height:100%;width:${cvssBarWidth}%;background:${cvssBarColor};border-radius:4px;"></div>
              </div>
            </td>
            <td style="white-space:nowrap;">
              <span style="font-size:20px;font-weight:700;color:${cvssBarColor};">${cvssScore.toFixed(1)}</span>
              <span style="font-size:11px;color:#71717a;margin-left:4px;">/ 10</span>
            </td>
          </tr>
        </table>
        <p style="margin:4px 0 0;font-family:monospace;font-size:11px;color:#a1a1aa;">${report.vulnerability.cvss_vector}</p>
      </div>

      <!-- Classification pills -->
      <div style="margin-top:14px;">
        <span style="background:#f4f4f5;border:1px solid #e4e4e7;border-radius:20px;font-size:11px;color:#3f3f46;padding:3px 10px;margin-right:6px;">${report.classification.confidence} confidence</span>
        <span style="background:#f4f4f5;border:1px solid #e4e4e7;border-radius:20px;font-size:11px;color:#3f3f46;padding:3px 10px;margin-right:6px;">${report.classification.report_date}</span>
        ${report.threat_context.ransomware_association ? '<span style="background:#fef2f2;border:1px solid #fecaca;border-radius:20px;font-size:11px;color:#dc2626;font-weight:600;padding:3px 10px;">🔥 Ransomware</span>' : ''}
      </div>
    </td>
  </tr>

  <!-- Body -->
  <tr>
    <td style="background:#fff;padding:0 32px 32px;border-left:1px solid #e4e4e7;border-right:1px solid #e4e4e7;">

      <!-- Executive Summary -->
      ${sectionHeader('Executive Summary')}
      <p style="margin:0 0 16px;font-size:14px;color:#3f3f46;line-height:1.7;">${report.executive_summary}</p>

      <!-- Exploitation Status -->
      ${sectionHeader('Exploitation Status')}
      <div style="background:${report.threat_context.exploitation_status === 'Actively Exploited in the Wild' ? '#fef2f2' : report.threat_context.exploitation_status === 'Proof-of-Concept Available' ? '#fff7ed' : '#f0fdf4'};border:1px solid ${report.threat_context.exploitation_status === 'Actively Exploited in the Wild' ? '#fecaca' : report.threat_context.exploitation_status === 'Proof-of-Concept Available' ? '#fed7aa' : '#bbf7d0'};border-radius:6px;padding:12px 16px;margin-bottom:12px;">
        <p style="margin:0;font-size:13px;font-weight:700;color:${report.threat_context.exploitation_status === 'Actively Exploited in the Wild' ? '#dc2626' : report.threat_context.exploitation_status === 'Proof-of-Concept Available' ? '#ea580c' : '#16a34a'};">${report.threat_context.exploitation_status}</p>
        <p style="margin:6px 0 0;font-size:13px;color:#3f3f46;line-height:1.6;">${report.threat_context.exploitation_description}</p>
      </div>

      <!-- CISA KEV -->
      ${report.threat_context.cisa_kev.in_catalog ? `
      ${sectionHeader('CISA KEV Catalog')}
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;border:1px solid #e4e4e7;border-radius:6px;margin-bottom:16px;">
        ${infoRow('Date Added', report.threat_context.cisa_kev.date_added)}
        ${infoRow('Remediation Due', `<span style="color:#dc2626;font-weight:600;">${report.threat_context.cisa_kev.remediation_due}</span>`)}
        ${report.threat_context.cisa_kev.directive ? infoRow('Directive', report.threat_context.cisa_kev.directive) : ''}
      </table>` : ''}

      <!-- Vulnerability Details -->
      ${sectionHeader('Vulnerability Details')}
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;border:1px solid #e4e4e7;border-radius:6px;margin-bottom:16px;">
        ${infoRow('CWE', `<span style="font-family:monospace;">${report.vulnerability.cwe_id}</span> — ${report.vulnerability.cwe_name}`)}
        ${infoRow('Advisory', report.vulnerability.vendor_advisory_id)}
        ${infoRow('Patch Date', report.vulnerability.patch_release_date)}
        ${infoRow('Affected', report.vulnerability.affected_versions.map(v => `<span style="background:#fef2f2;color:#dc2626;font-family:monospace;font-size:11px;padding:2px 6px;border-radius:3px;margin-right:4px;">${v}</span>`).join(''))}
        ${infoRow('Fixed', report.vulnerability.fixed_versions.map(v => `<span style="background:#f0fdf4;color:#16a34a;font-family:monospace;font-size:11px;padding:2px 6px;border-radius:3px;margin-right:4px;">${v}</span>`).join(''))}
      </table>

      <p style="margin:0 0 16px;font-size:13px;color:#3f3f46;line-height:1.7;">${report.vulnerability.cwe_explanation}</p>

      <!-- Technical Analysis -->
      ${sectionHeader('Technical Analysis')}
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;border:1px solid #e4e4e7;border-radius:6px;margin-bottom:12px;">
        ${infoRow('Class', report.technical_analysis.vulnerability_class)}
        ${infoRow('Component', report.technical_analysis.affected_component)}
        ${infoRow('Complexity', report.technical_analysis.exploit_complexity)}
      </table>
      <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#0a0a0a;">Root Cause</p>
      <p style="margin:0 0 12px;font-size:13px;color:#3f3f46;line-height:1.7;">${report.technical_analysis.root_cause}</p>
      <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#0a0a0a;">Exploitation Mechanics</p>
      <p style="margin:0 0 12px;font-size:13px;color:#3f3f46;line-height:1.7;white-space:pre-line;">${report.technical_analysis.exploitation_mechanics}</p>

      <!-- MITRE ATT&CK -->
      ${sectionHeader('MITRE ATT&CK')}
      <div style="margin-bottom:10px;">
        ${report.mitre_attack.tactics.map(t =>
          `<span style="display:inline-block;background:#eff6ff;border:1px solid #bfdbfe;border-radius:4px;font-size:11px;font-weight:600;color:#1d4ed8;padding:3px 8px;margin:2px;">${t.id} · ${t.name}</span>`
        ).join('')}
      </div>
      ${report.mitre_attack.techniques.map(t => `
        <div style="background:#fafafa;border:1px solid #e4e4e7;border-radius:6px;padding:10px 14px;margin-bottom:6px;">
          <div style="margin-bottom:4px;">
            <span style="font-family:monospace;font-size:12px;font-weight:700;color:#dc2626;">${t.id}</span>
            <span style="font-size:13px;font-weight:600;color:#0a0a0a;margin-left:8px;">${t.name}</span>
            <span style="font-size:11px;color:#71717a;margin-left:6px;">${t.tactic}</span>
          </div>
          <p style="margin:0;font-size:12px;color:#71717a;line-height:1.5;">${t.relevance}</p>
        </div>`).join('')}

      <!-- Impact -->
      ${sectionHeader('Impact Assessment')}
      <table cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
        <tr>
          ${(['Confidentiality', 'Integrity', 'Availability'] as const).map((label, i) => {
            const val = [report.impact_assessment.confidentiality_impact, report.impact_assessment.integrity_impact, report.impact_assessment.availability_impact][i]
            const c = val === 'High' ? '#dc2626' : val === 'Medium' ? '#d97706' : val === 'Low' ? '#2563eb' : '#71717a'
            return `<td style="padding-right:12px;text-align:center;">
              <div style="background:#fafafa;border:1px solid #e4e4e7;border-radius:6px;padding:10px 16px;min-width:80px;">
                <p style="margin:0 0 4px;font-size:11px;color:#71717a;">${label}</p>
                <p style="margin:0;font-size:13px;font-weight:700;color:${c};">${val}</p>
              </div>
            </td>`
          }).join('')}
        </tr>
      </table>
      <p style="margin:0 0 16px;font-size:13px;color:#3f3f46;line-height:1.7;">${report.impact_assessment.business_impact}</p>

      <!-- Remediation -->
      ${sectionHeader('Remediation')}
      <div style="background:${report.remediation.urgency.startsWith('Immediate') ? '#fef2f2' : report.remediation.urgency.startsWith('Urgent') ? '#fff7ed' : '#fffbeb'};border:1px solid ${report.remediation.urgency.startsWith('Immediate') ? '#fecaca' : report.remediation.urgency.startsWith('Urgent') ? '#fed7aa' : '#fde68a'};border-radius:6px;padding:12px 16px;margin-bottom:14px;">
        <p style="margin:0;font-size:13px;font-weight:700;color:${report.remediation.urgency.startsWith('Immediate') ? '#dc2626' : '#d97706'};">⚡ ${report.remediation.urgency}</p>
        <p style="margin:4px 0 0;font-size:13px;color:#3f3f46;">${report.remediation.urgency_rationale}</p>
      </div>
      <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#0a0a0a;">Priority Actions</p>
      <ol style="margin:0 0 14px;padding-left:20px;">
        ${report.remediation.priority_actions.map(a => `<li style="margin:4px 0;font-size:13px;color:#3f3f46;line-height:1.6;">${a}</li>`).join('')}
      </ol>
      ${report.remediation.patches.length > 0 ? `
        <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#0a0a0a;">Patches</p>
        ${report.remediation.patches.map(p => `
          <div style="background:#fafafa;border:1px solid #e4e4e7;border-radius:6px;padding:10px 14px;margin-bottom:6px;">
            <span style="font-size:13px;font-weight:600;color:#0a0a0a;">${p.product}</span>
            <span style="background:#f0fdf4;color:#16a34a;font-family:monospace;font-size:11px;padding:2px 6px;border-radius:3px;margin-left:8px;">${p.fixed_version}</span>
            ${p.kb_article !== 'N/A' ? `<span style="background:#f4f4f5;border:1px solid #e4e4e7;font-family:monospace;font-size:11px;padding:2px 6px;border-radius:3px;margin-left:4px;">${p.kb_article}</span>` : ''}
            ${p.notes ? `<p style="margin:4px 0 0;font-size:12px;color:#71717a;">${p.notes}</p>` : ''}
          </div>`).join('')}` : ''}
      <p style="margin:12px 0 8px;font-size:13px;font-weight:600;color:#0a0a0a;">Hardening Measures</p>
      <ul style="margin:0 0 16px;padding-left:20px;">
        ${listItems(report.remediation.hardening_measures)}
      </ul>

      <!-- IOCs -->
      ${sectionHeader('Indicators of Compromise')}
      <div style="background:#fefce8;border:1px solid #fde68a;border-radius:6px;padding:10px 14px;margin-bottom:12px;">
        <p style="margin:0;font-size:12px;color:#92400e;">${report.iocs.availability_note}</p>
      </div>
      ${iocSection('File Hashes', report.iocs.file_hashes)}
      ${iocSection('IP Addresses', report.iocs.ip_addresses)}
      ${iocSection('Domains', report.iocs.domains)}
      ${iocSection('File Paths', report.iocs.file_paths)}
      ${iocSection('Commands', report.iocs.commands)}
      ${iocSection('Network Signatures', report.iocs.network_signatures)}

      <!-- Detection -->
      ${sectionHeader('Detection Engineering')}
      <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#71717a;text-transform:uppercase;">Log Sources</p>
      <div style="margin-bottom:12px;">
        ${report.detection.log_sources.map(s => `<span style="display:inline-block;background:#f4f4f5;border:1px solid #e4e4e7;border-radius:4px;font-family:monospace;font-size:11px;color:#3f3f46;padding:2px 8px;margin:2px;">${s}</span>`).join('')}
      </div>
      <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#71717a;text-transform:uppercase;">Behavioral Indicators</p>
      <ul style="margin:0 0 12px;padding-left:20px;">
        ${listItems(report.detection.behavioral_indicators)}
      </ul>
      ${report.detection.detection_queries.length > 0 ? `
        <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#0a0a0a;">Detection Queries</p>
        ${report.detection.detection_queries.map(q => `
          <div style="margin-bottom:10px;">
            <span style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:4px;font-size:11px;font-weight:600;color:#1d4ed8;padding:2px 8px;">${q.platform}</span>
            <span style="font-size:12px;color:#71717a;margin-left:8px;">${q.description}</span>
            <div style="background:#0a0a0a;border-radius:6px;padding:12px 14px;margin-top:6px;overflow:auto;">
              <pre style="margin:0;font-family:monospace;font-size:11px;color:#4ade80;white-space:pre-wrap;word-break:break-all;">${q.query}</pre>
            </div>
          </div>`).join('')}` : ''}
      <p style="margin:12px 0 6px;font-size:12px;font-weight:600;color:#71717a;text-transform:uppercase;">Threat Hunting</p>
      <ul style="margin:0 0 16px;padding-left:20px;">
        ${listItems(report.detection.threat_hunting)}
      </ul>

      <!-- Threat Actors -->
      ${report.threat_context.threat_actors.length > 0 ? `
        ${sectionHeader('Threat Actor Attribution')}
        ${report.threat_context.threat_actors.map(a => `
          <div style="background:#fafafa;border:1px solid #e4e4e7;border-radius:6px;padding:12px 16px;margin-bottom:8px;">
            <table cellpadding="0" cellspacing="0"><tr>
              <td style="font-size:13px;font-weight:700;color:#0a0a0a;padding-right:10px;">${a.name}</td>
              <td style="font-size:11px;background:#f4f4f5;border:1px solid #e4e4e7;border-radius:10px;padding:2px 8px;color:#3f3f46;padding-right:10px;">${a.category}</td>
              <td style="font-size:11px;color:#71717a;">${a.confidence} confidence</td>
            </tr></table>
            <p style="margin:6px 0 0;font-size:13px;color:#71717a;">${a.notes}</p>
          </div>`).join('')}` : ''}

      <!-- Analyst Assessment -->
      ${sectionHeader('Senior Analyst Assessment')}
      <div style="background:#fafafa;border-left:3px solid #dc2626;border-radius:0 6px 6px 0;padding:16px 20px;margin-bottom:16px;">
        <p style="margin:0;font-size:13px;color:#3f3f46;line-height:1.8;white-space:pre-line;">${report.analyst_assessment}</p>
      </div>

      <!-- References -->
      ${sectionHeader('References')}
      ${report.references.map(ref => `
        <div style="display:flex;align-items:flex-start;gap:12px;padding:10px 0;border-bottom:1px solid #f4f4f5;">
          <span style="background:#f4f4f5;border:1px solid #e4e4e7;border-radius:3px;font-size:10px;color:#71717a;padding:2px 6px;white-space:nowrap;flex-shrink:0;">${ref.type}</span>
          <div>
            <p style="margin:0;font-size:13px;font-weight:600;color:#0a0a0a;">${ref.title}</p>
            <p style="margin:2px 0 0;font-size:11px;color:#71717a;">${ref.source}</p>
            ${ref.url && ref.url !== 'Not publicly available' ? `<a href="${ref.url}" style="font-size:11px;color:#dc2626;word-break:break-all;">${ref.url}</a>` : ''}
          </div>
        </div>`).join('')}

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
        This report was generated automatically by SECFORIT Threat Intelligence. Handle according to TLP:${report.classification.tlp} guidelines.
      </p>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`

  await transporter.sendMail({
    from: `"SECFORIT Threat Intel" <${SMTP_FROM}>`,
    to: recipientEmail,
    subject: `[CTI] ${report.vulnerability.cve_id} — ${report.classification.severity} | ${report.vulnerability.title}`,
    text: buildPlainText(report),
    html,
  })
}

function buildPlainText(report: ThreatIntelReport): string {
  const { vulnerability: v, classification: c, threat_context: tc, technical_analysis: ta,
    executive_summary, remediation, detection, analyst_assessment } = report

  return `SECFORIT THREAT INTELLIGENCE REPORT
TLP:${c.tlp} | ${c.severity} | ${c.confidence} confidence | ${c.report_date}

${v.cve_id} — ${v.title}
${v.vendor} · ${v.product}
CVSS: ${v.cvss_score.toFixed(1)} | ${v.cvss_vector}

EXECUTIVE SUMMARY
${executive_summary}

EXPLOITATION STATUS
${tc.exploitation_status}
${tc.exploitation_description}

VULNERABILITY
CWE: ${v.cwe_id} — ${v.cwe_name}
Advisory: ${v.vendor_advisory_id}
Patch Date: ${v.patch_release_date}
Affected: ${v.affected_versions.join(', ')}
Fixed: ${v.fixed_versions.join(', ')}

TECHNICAL ANALYSIS
Class: ${ta.vulnerability_class}
Component: ${ta.affected_component}
Root Cause: ${ta.root_cause}

REMEDIATION (${remediation.urgency})
${remediation.urgency_rationale}

Priority Actions:
${remediation.priority_actions.map((a, i) => `${i + 1}. ${a}`).join('\n')}

DETECTION
Log Sources: ${detection.log_sources.join(', ')}

Behavioral Indicators:
${detection.behavioral_indicators.map(i => `- ${i}`).join('\n')}

ANALYST ASSESSMENT
${analyst_assessment}

---
© ${new Date().getFullYear()} SECFORIT · Romania, EU · https://www.secforit.ro
Handle per TLP:${c.tlp} guidelines.`
}

// ─── CVE Document Builder ─────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildCveDocument(cve: Record<string, any>): string {
  const desc = cve.descriptions?.find((d: { lang: string }) => d.lang === 'en')?.value ?? cve.shortDescription ?? 'N/A'
  const cvss = cve.metrics?.cvssMetricV31?.[0]?.cvssData
  const cwe = cve.weaknesses?.[0]?.description?.find((d: { lang: string }) => d.lang === 'en')?.value ?? 'N/A'
  const refs = (cve.references ?? []).map((r: { url: string }) => r.url).join('\n  - ')

  return `## Vulnerability Intelligence Brief

**CVE ID**: ${cve.id ?? 'Unknown'}
**Vulnerability Name**: ${cve.cisaVulnerabilityName ?? cve.id ?? 'N/A'}
**Vendor / Product**: ${cve.vendorProject ?? 'N/A'} — ${cve.product ?? 'N/A'}

### CVSS Scoring
- Base Score: ${cvss?.baseScore ?? 'N/A'} (${cvss?.baseSeverity ?? 'N/A'})
- Vector: ${cvss?.vectorString ?? 'N/A'}
- Attack Vector: ${cvss?.attackVector ?? 'N/A'}
- Attack Complexity: ${cvss?.attackComplexity ?? 'N/A'}
- Privileges Required: ${cvss?.privilegesRequired ?? 'N/A'}
- User Interaction: ${cvss?.userInteraction ?? 'N/A'}
- Scope: ${cvss?.scope ?? 'N/A'}
- Confidentiality / Integrity / Availability: ${cvss?.confidentialityImpact ?? 'N/A'} / ${cvss?.integrityImpact ?? 'N/A'} / ${cvss?.availabilityImpact ?? 'N/A'}

### Weakness Classification
- CWE: ${cwe}

### Description
${desc}

### Publication Dates
- NVD Published: ${cve.published ?? 'N/A'}
- NVD Last Modified: ${cve.lastModified ?? 'N/A'}

### CISA KEV Status
- In Catalog: ${cve.cisaExploitAdd || cve.dateAdded ? 'Yes' : 'Unknown'}
- Date Added: ${cve.dateAdded ?? cve.cisaExploitAdd ?? 'N/A'}
- Remediation Due: ${cve.cisaActionDue ?? 'N/A'}
- Required Action: ${cve.cisaRequiredAction ?? 'N/A'}

### Known Ransomware Association
${cve.knownRansomwareCampaignUse === 'Known' ? 'Yes — linked to active ransomware campaigns' : cve.knownRansomwareCampaignUse ?? 'Not specified'}

### References
  - ${refs || 'N/A'}`
}
