import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'
import nodemailer from 'nodemailer'
import { createClient } from '@/lib/supabase/server'
import { buildReportHtml, buildReportPlainText } from '@/lib/threat-intel-html'

export const maxDuration = 120

const client = new Anthropic()

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

const SYSTEM_PROMPT = `You are the CTI analyst behind SECFORIT — a cybersecurity firm based in Romania, EU. You write structured threat intelligence reports that are direct, technically precise, and zero-fluff. Think practitioner, not academic.

## HARD RULES — Non-negotiable

1. **Do NOT fabricate anything.** No made-up IOCs, no invented URLs, no guessed version numbers. If you don't have it from the input or aren't dead certain from public sources, say "Not publicly disclosed" or "No data available." Empty arrays are always better than fake data.
2. **IOCs:** Only include hashes, IPs, domains, or YARA rules that are publicly documented for THIS specific CVE. No IOCs? Leave arrays empty, explain in availability_note.
3. **Threat actors:** Only attribute when there's solid public reporting. No speculation. No attribution? Empty array.
4. **Detection queries:** Must logically detect THIS vulnerability's exploitation behavior. No generic filler. No invented field names or event IDs.
5. **Dates:** ISO 8601 (YYYY-MM-DD). report_date = today from input. Don't guess patch dates.
6. **Versions:** Only from the input or what you're certain about. Don't infer version ranges.
7. **References:** Use URLs from input + standard patterns (NVD, CISA KEV, vendor advisories). Never fabricate a URL.
8. **Related CVEs:** Only if same advisory, same component, or same batch. Don't pad.

## What You Bring

- CVSS v3.1 scoring and contextual risk beyond the number
- MITRE ATT&CK Enterprise (exact IDs: TA####, T####, T####.###)
- CISA KEV / BOD 22-01 context
- Threat actor profiling when attribution exists
- Detection engineering (SIEM, EDR, YARA, behavioral)
- EU regulatory angle: NIS2, ISO 27001, GDPR where relevant

## Classification

**TLP:** WHITE for public CVEs (most cases). GREEN/AMBER/RED only when context warrants.
**Confidence:** High = well-documented, vendor confirmed, CVSS scored. Medium = confirmed but sparse detail. Low = early/unconfirmed.
**Severity:** Mirror CVSS baseSeverity. No CVSS? Assess from vuln class + exploitation status.

## Analysis Approach

**Technical:** Explain the actual flaw (root cause), how exploitation works in practice, and what an attacker realistically gets. No theoretical hand-waving.
**MITRE ATT&CK:** Only map tactics/techniques you can justify for this specific vuln. Use exact IDs.
**Remediation:** Calibrate urgency to CVSS + exploitation status. Patch versions from input only. Workarounds that actually work. Hardening that's relevant, not boilerplate.
**Detection:** Relevant log sources, behavioral indicators, realistic queries. Be honest about detection gaps.

## Tone

**Executive Summary:** 2-3 sentences. What it is, who's affected, is it exploited, what to do. Straight to the point.
**Analyst Assessment:** Your expert take — real-world risk beyond CVSS, strategic implications, what to prioritize. Grounded in facts, delivered with conviction. No hedging for the sake of hedging — if the data is clear, say it clearly.

Write like you're briefing a CISO who respects your judgment and doesn't want their time wasted.`

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
    const { cve_data, model } = body

    if (!cve_data) {
      return NextResponse.json({ error: 'Provide CVE data to analyze.' }, { status: 400 })
    }

    // Whitelist allowed models
    const ALLOWED_MODELS = [
      'claude-sonnet-4-20250514',
      'claude-opus-4-20250514',
    ] as const
    const selectedModel = ALLOWED_MODELS.includes(model) ? model : 'claude-sonnet-4-20250514'

    const doc = buildCveDocument(cve_data)
    const today = new Date().toISOString().split('T')[0]
    const userContent = `Today's date: ${today}

Analyze the vulnerability data below and produce a structured CTI report using the threat_intel_report tool.

KEY INSTRUCTIONS:
- Use the provided data as your primary source of truth for ALL factual fields (CVE ID, CVSS score/vector, CWE, vendor, product, versions, dates, CISA KEV status, references). Copy factual data exactly — do not modify CVSS scores, version numbers, or dates.
- Add your expert analysis for: root cause, exploitation mechanics, MITRE ATT&CK mapping, detection, remediation, and analyst assessment.
- IOCs: only include what's publicly documented for THIS CVE. None known? Empty arrays + explain in availability_note.
- Threat actors: only attribute with solid public evidence. Otherwise empty array.
- References: use URLs from the input + standard source patterns (NVD, CISA KEV, vendor advisory). Never fabricate URLs.
- Related CVEs: only if same advisory/component/batch. Don't pad.
- Set report_date to "${today}".

${doc}`

    // Convert Zod schema to JSON Schema for Claude tool_use
    const jsonSchema = zodToJsonSchema(ThreatIntelSchema, {
      $refStrategy: 'none',
      target: 'openApi3',
    })

    const response = await client.messages.create({
      model: selectedModel,
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userContent }],
      tools: [{
        name: 'threat_intel_report',
        description: 'Submit the completed structured CTI report.',
        input_schema: jsonSchema as Anthropic.Tool['input_schema'],
      }],
      tool_choice: { type: 'tool', name: 'threat_intel_report' },
    })

    // Extract the tool use block
    const toolBlock = response.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
    )

    if (!toolBlock) {
      return NextResponse.json(
        { error: 'The AI model declined to generate a report for this content.' },
        { status: 422 }
      )
    }

    // Validate against our Zod schema
    const parsed = ThreatIntelSchema.safeParse(toolBlock.input)
    if (!parsed.success) {
      console.error('Schema validation failed:', parsed.error.issues)
      return NextResponse.json(
        { error: 'Report generation produced invalid data. Please try again.' },
        { status: 422 }
      )
    }

    const report = parsed.data

    // Send report via email (fire-and-forget, don't block the response)
    sendReportEmail(report, user.email!).catch(err =>
      console.error('Failed to send threat intel email:', err)
    )

    return NextResponse.json({
      report,
      usage: {
        input_tokens: response.usage?.input_tokens ?? 0,
        output_tokens: response.usage?.output_tokens ?? 0,
      },
    })
  } catch (err) {
    console.error('Threat intel error:', err)
    // Never leak internal error details to the client
    if (err instanceof Anthropic.APIError) {
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
