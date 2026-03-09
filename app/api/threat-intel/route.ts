import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { zodResponseFormat } from 'openai/helpers/zod'
import { z } from 'zod'
import nodemailer from 'nodemailer'
import { createClient } from '@/lib/supabase/server'
import { buildReportHtml, buildReportPlainText } from '@/lib/threat-intel-html'

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

const SYSTEM_PROMPT = `You are a Senior Cyber Threat Intelligence (CTI) Analyst producing structured reports for SECFORIT, a cybersecurity firm in Romania, EU.

## CRITICAL: Accuracy Rules

1. **NEVER fabricate data.** If a detail is not in the provided input and you are not certain of it from your training data, say so explicitly (e.g., "Not publicly disclosed", "No public IOCs available", "Unknown at time of analysis").
2. **IOCs (Indicators of Compromise):** Only include IOCs you are confident are real and publicly documented for THIS specific CVE. Do NOT invent hashes, IPs, domains, or YARA rules. If no IOCs are publicly known, leave arrays empty and explain why in availability_note.
3. **Threat actors:** Only attribute threat actors when there is well-documented public reporting linking them to this CVE. Set confidence accordingly. If no attribution exists, return an empty array.
4. **Detection queries:** Only provide queries that would logically detect exploitation of this specific vulnerability class. Base queries on the actual attack vector (network vs local, affected service/protocol, known exploitation behavior). Do NOT invent log event IDs or field names.
5. **Dates:** Use ISO 8601 format (YYYY-MM-DD). For report_date use today's date from the input. Do not guess patch dates — use only what is provided or well-known.
6. **Version numbers:** Only state affected/fixed versions that are provided in the input or that you are certain of. Do not guess version ranges.
7. **References:** Only include URLs you are confident exist. Use the references provided in the input data. For standard sources (NVD, CISA KEV, vendor advisories), construct URLs from known patterns. Do NOT fabricate URLs.
8. **Related CVEs:** Only list CVEs you are certain are related (same vulnerability batch, same advisory, or same component). Do not pad with unrelated CVEs.

## Your Expertise

- CVSS v3.1 scoring interpretation and contextual risk assessment
- MITRE ATT&CK Enterprise Matrix (tactics TA####, techniques T####, sub-techniques T####.###)
- CISA Known Exploited Vulnerabilities (KEV) catalog and BOD 22-01
- Threat actor profiling (nation-state APTs, cybercriminal groups, ransomware operators)
- Detection engineering (SIEM, EDR, YARA, behavioral analytics)
- EU regulatory context: NIS2 Directive, ISO 27001, GDPR

## Classification Guidelines

### TLP (Traffic Light Protocol)
- WHITE: Publicly disclosed CVE with public advisories — use for most reports
- GREEN: Limited public detail but shared in security community
- AMBER: Pre-disclosure or sensitive organizational context
- RED: Named recipient only

### Confidence
- High: CVE is well-documented with multiple sources, vendor confirmed, CVSS scored
- Medium: CVE confirmed but limited technical detail available
- Low: Early disclosure, limited information, unconfirmed reports

### Severity
Mirror the CVSS baseSeverity from input data. If CVSS is unavailable, assess based on vulnerability class and exploitation status.

## Analysis Guidelines

### Technical Analysis
- Root cause: Explain the underlying code/design flaw (e.g., improper input validation, use-after-free, missing authorization check)
- Exploitation mechanics: Describe how an attacker would realistically exploit this based on the attack vector, complexity, and prerequisites from CVSS
- Post-exploitation: Assess realistic impact based on the vulnerability class — what can an attacker actually achieve?

### MITRE ATT&CK Mapping
Map to tactics and techniques that are directly relevant to how this vulnerability would be exploited and what it enables. Use EXACT official IDs (e.g., TA0001, T1190). Only include mappings you can justify.

### Remediation
- Urgency: Calibrate to CVSS score + exploitation status (actively exploited = Immediate, PoC available = Urgent, theoretical = High/Moderate)
- Patches: Use only version numbers from the input data
- Workarounds: Provide realistic, implementable mitigations based on the vulnerability class
- Hardening: Recommend defense-in-depth measures relevant to the affected technology

### Detection
- Focus on log sources and behavioral indicators relevant to the specific product and attack vector
- Detection queries should target the actual exploitation behavior, not generic patterns
- Be explicit about detection gaps

## Executive Summary
Write 2-3 sentences: what the vulnerability is, who it affects, whether it's being exploited, and the recommended action. Be direct and factual.

## Analyst Assessment
Provide a brief expert opinion on: real-world risk beyond the CVSS score, strategic implications, and what organizations should prioritize. Ground this in the facts provided.`

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

// ─── Rate Limiting ────────────────────────────────────────────────────────────

const intelRateMap = new Map<string, { count: number; resetAt: number }>()
const INTEL_WINDOW = 60 * 60 * 1000 // 1 hour
const INTEL_MAX = 10                 // max reports per user per hour

function isIntelRateLimited(userId: string): boolean {
  const now = Date.now()
  const entry = intelRateMap.get(userId)
  if (!entry || now > entry.resetAt) {
    intelRateMap.set(userId, { count: 1, resetAt: now + INTEL_WINDOW })
    return false
  }
  entry.count++
  return entry.count > INTEL_MAX
}

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

    // Rate limit per user
    if (isIntelRateLimited(user.id)) {
      return NextResponse.json({ error: 'Rate limit exceeded. Maximum 10 reports per hour.' }, { status: 429 })
    }

    const body = await req.json()
    const { cve_data } = body

    if (!cve_data) {
      return NextResponse.json({ error: 'Provide CVE data to analyze.' }, { status: 400 })
    }

    const doc = buildCveDocument(cve_data)
    const today = new Date().toISOString().split('T')[0]
    const userContent = `Today's date: ${today}

Analyze the vulnerability data below and produce a structured CTI report.

IMPORTANT INSTRUCTIONS:
- Use the provided data as your primary source of truth for all factual fields (CVE ID, CVSS score/vector, CWE, vendor, product, versions, dates, CISA KEV status, references).
- Copy factual data exactly — do not modify CVSS scores, version numbers, or dates from the input.
- Add your expert analysis for: root cause explanation, exploitation mechanics, MITRE ATT&CK mapping, detection guidance, remediation prioritization, and analyst assessment.
- For IOCs: only include indicators you are certain are publicly documented for this specific CVE. If none are known, leave arrays empty and explain in availability_note.
- For threat actors: only attribute if well-documented public reporting exists. Otherwise return an empty array.
- For references: include the URLs provided in the input data plus standard sources (NVD page, CISA KEV entry if applicable, vendor advisory if identifiable). Do not invent URLs.
- For related CVEs: only include CVEs you are confident are related (same advisory, same component, or same vulnerability batch).
- Set report_date to "${today}".

${doc}`

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
    // Never leak internal error details to the client
    if (err instanceof OpenAI.APIError) {
      if (err.status === 401) {
        return NextResponse.json({ error: 'AI service configuration error.' }, { status: 500 })
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
  })

  await transporter.sendMail({
    from: `"SECFORIT Threat Intel" <${SMTP_FROM}>`,
    to: recipientEmail,
    subject: `[CTI] ${report.vulnerability.cve_id} — ${report.classification.severity} | ${report.vulnerability.title}`,
    text: buildReportPlainText(report),
    html: buildReportHtml(report, siteUrl),
  })
}

// ─── CVE Document Builder ─────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildCveDocument(cve: Record<string, any>): string {
  const desc = cve.descriptions?.find((d: { lang: string }) => d.lang === 'en')?.value ?? cve.shortDescription ?? 'N/A'
  const cvss = cve.metrics?.cvssMetricV31?.[0]?.cvssData
  const cvssMetric = cve.metrics?.cvssMetricV31?.[0]
  const cwe = cve.weaknesses?.[0]?.description?.find((d: { lang: string }) => d.lang === 'en')?.value ?? 'N/A'
  const refs = (cve.references ?? []) as Array<{ url: string; tags?: string[] }>
  const refsFormatted = refs.length > 0
    ? refs.map(r => `  - ${r.url}${r.tags?.length ? ` [${r.tags.join(', ')}]` : ''}`).join('\n')
    : '  - None provided'

  const inKev = !!(cve.cisaExploitAdd || cve.dateAdded)

  return `## SOURCE DATA — Use this as the primary source of truth

### Identification
- CVE ID: ${cve.id ?? 'Unknown'}
- Vulnerability Name: ${cve.cisaVulnerabilityName ?? 'N/A'}
- Vendor: ${cve.vendorProject ?? 'N/A'}
- Product: ${cve.product ?? 'N/A'}

### Description (from NVD/CISA)
${desc}

### CVSS v3.1 Scoring${cvss ? `
- Base Score: ${cvss.baseScore} (${cvss.baseSeverity})
- Vector String: ${cvss.vectorString}
- Attack Vector: ${cvss.attackVector}
- Attack Complexity: ${cvss.attackComplexity}
- Privileges Required: ${cvss.privilegesRequired}
- User Interaction: ${cvss.userInteraction}
- Scope: ${cvss.scope}
- Confidentiality Impact: ${cvss.confidentialityImpact}
- Integrity Impact: ${cvss.integrityImpact}
- Availability Impact: ${cvss.availabilityImpact}${cvssMetric?.exploitabilityScore != null ? `\n- Exploitability Score: ${cvssMetric.exploitabilityScore}` : ''}${cvssMetric?.impactScore != null ? `\n- Impact Score: ${cvssMetric.impactScore}` : ''}` : '\n- No CVSS v3.1 data available'}

### Weakness
- CWE: ${cwe}

### Dates
- NVD Published: ${cve.published ?? 'N/A'}
- NVD Last Modified: ${cve.lastModified ?? 'N/A'}

### CISA KEV Catalog
- In Catalog: ${inKev ? 'YES' : 'Unknown / Not found'}${inKev ? `
- Date Added to KEV: ${cve.dateAdded ?? cve.cisaExploitAdd ?? 'N/A'}
- Remediation Due Date: ${cve.cisaActionDue ?? 'N/A'}
- Required Action: ${cve.cisaRequiredAction ?? 'N/A'}` : ''}

### Ransomware Association
- Known Ransomware Campaign Use: ${cve.knownRansomwareCampaignUse === 'Known' ? 'YES — linked to active ransomware campaigns' : cve.knownRansomwareCampaignUse === 'Unknown' ? 'Unknown' : cve.knownRansomwareCampaignUse ?? 'Not specified'}

### References (from NVD)
${refsFormatted}

---
NOTE: The data above comes from NVD and CISA KEV. Use it as-is for factual fields. Apply your expertise for analysis, MITRE mapping, detection, and remediation guidance. Do not fabricate any data not grounded in the input or your confident knowledge of this CVE.`
}
