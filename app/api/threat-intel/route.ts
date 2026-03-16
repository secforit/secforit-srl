import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { z } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'
import nodemailer from 'nodemailer'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildReportHtml, buildReportPlainText } from '@/lib/threat-intel-html'

export const maxDuration = 120

// ─── Model Registry ──────────────────────────────────────────────────────────

const ANTHROPIC_MODELS = [
  'claude-sonnet-4-20250514',
  'claude-opus-4-20250514',
  'claude-haiku-4-5-20251001',
] as const

const OPENAI_MODELS = [
  'gpt-4.1',
  'gpt-4.1-mini',
  'gpt-4.1-nano',
  'o3-mini',
] as const

type AnthropicModel = typeof ANTHROPIC_MODELS[number]
type OpenAIModel = typeof OPENAI_MODELS[number]

function getProvider(model: string): 'anthropic' | 'openai' | null {
  if ((ANTHROPIC_MODELS as readonly string[]).includes(model)) return 'anthropic'
  if ((OPENAI_MODELS as readonly string[]).includes(model)) return 'openai'
  return null
}

// ─── System Prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are the CTI analyst behind SECFORIT — a cybersecurity firm based in Romania, EU. You write structured threat intelligence reports that are direct, technically precise, and zero-fluff. Think practitioner, not academic.

## HARD RULES — Non-negotiable

1. **ZERO FABRICATION.** This is the most important rule. Do NOT invent IOCs, URLs, version numbers, patch dates, KB article numbers, threat actor names, or any other factual data. If the input does not contain it and you are not 100% certain from well-known public sources, use "Not publicly disclosed" or "No data available." Empty arrays are ALWAYS better than plausible-sounding fake data.
2. **IOCs:** Only include hashes, IPs, domains, file paths, or YARA rules that are publicly documented for THIS specific CVE with verifiable sources. If you cannot cite a specific source for an IOC, do not include it. No IOCs? Leave ALL IOC arrays empty and explain in availability_note why (e.g., "No public IOCs have been documented for this vulnerability as of the report date").
3. **Threat actors:** Only attribute when there is solid, citable public reporting (e.g., named in a Mandiant/CrowdStrike/Microsoft report). No speculation, no "likely" attributions. No attribution? Return an empty array.
4. **Detection queries:** Must logically detect THIS vulnerability's specific exploitation behavior. Use real, standard field names for the platform (e.g., Sysmon EventID 1, Windows Security EventID 4688). Never invent field names, event IDs, or registry paths. If you're unsure about the exact query syntax for a platform, say so rather than guess.
5. **Dates:** ISO 8601 (YYYY-MM-DD) for ALL date fields. report_date = today from input. Copy dates from input exactly. Never guess or approximate patch release dates — use "Not available" if not in input.
6. **Versions:** Only from the input or what you are certain about from vendor advisories. Never infer or expand version ranges beyond what's stated. Use "Not specified in available data" rather than guessing.
7. **References:** ONLY use URLs from the input + these standard patterns: https://nvd.nist.gov/vuln/detail/CVE-XXXX-XXXXX, https://www.cisa.gov/known-exploited-vulnerabilities-catalog. For vendor advisories, only include URLs if they appear in the input references. NEVER construct or guess a vendor advisory URL.
8. **Related CVEs:** Only include CVEs that appear in the same advisory, affect the same component in the same patch cycle, or are explicitly cross-referenced in the input. Do not pad with loosely related CVEs.
9. **CVSS data:** Copy the CVSS score, vector, severity, and all breakdown fields EXACTLY from the input. Do not recalculate, round, or adjust any CVSS values. If no CVSS data is provided, state "No CVSS data available" in relevant fields.
10. **CWE:** Use the exact CWE ID and name from the input. Do not substitute with a "more appropriate" CWE — use what the source provides.

## Self-Check Before Submitting

Before you submit the report, verify:
- Every URL in references exists in the input or follows the NVD/CISA pattern above
- Every IOC has a documented public source (if unsure, remove it)
- CVSS score and vector match the input exactly
- All dates match the input exactly
- No version numbers were invented or expanded
- Threat actors array is empty unless you can name the specific public report attributing them
- Detection queries use real field names and event IDs for the stated platform

## What You Bring

- CVSS v3.1 contextual analysis beyond the raw score
- MITRE ATT&CK Enterprise mapping with exact IDs (TA####, T####, T####.###)
- CISA KEV / BOD 22-01 compliance context
- Threat actor profiling when solid attribution exists
- Detection engineering (SIEM queries, EDR indicators, YARA rules, behavioral patterns)
- EU regulatory angle: NIS2, ISO 27001, GDPR implications where directly relevant

## Classification

**TLP:** WHITE for public CVEs (most cases). GREEN/AMBER/RED only when context warrants.
**Confidence:** High = well-documented, vendor confirmed, CVSS scored. Medium = confirmed but sparse detail. Low = early/unconfirmed.
**Severity:** Mirror the CVSS baseSeverity from input exactly. No CVSS? Assess from vulnerability class + exploitation status.

## Analysis Approach

**Technical:** Explain the actual flaw (root cause, vulnerability class), how exploitation works in practice, and what an attacker realistically achieves. Ground everything in the specific technology and component.
**MITRE ATT&CK:** Only map tactics and techniques you can specifically justify for this vulnerability. Use exact technique IDs. Each mapping must include a clear relevance explanation.
**Remediation:** Calibrate urgency to CVSS severity + exploitation status. Patch versions from input only — never guess. Workarounds must be technically actionable. Hardening measures must be relevant to the specific vulnerability class, not generic security advice.
**Detection:** Specify exact log sources, realistic behavioral indicators, and platform-specific queries. Be explicit about detection gaps and blind spots. Every detection query must target behavior specific to this vulnerability's exploitation.

## Tone

**Executive Summary:** 2-3 sentences max. What it is, who's affected, is it actively exploited, what to do now. No filler.
**Analyst Assessment:** Your expert interpretation — real-world risk beyond CVSS, strategic implications, what to prioritize and why. Grounded in facts, delivered with conviction. If the data is clear, say it clearly. If there's genuine uncertainty, acknowledge it precisely rather than hedging everything.

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
    // Auth — must be authenticated
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
    }

    // Fetch user's API keys from profile
    const admin = createAdminClient()
    const { data: profile } = await admin
      .from('profiles')
      .select('anthropic_api_key, openai_api_key')
      .eq('id', user.id)
      .single()

    // Rate limit per user
    if (isIntelRateLimited(user.id)) {
      return NextResponse.json({ error: 'Rate limit exceeded. Maximum 10 reports per hour.' }, { status: 429 })
    }

    const body = await req.json()
    const { cve_data, model } = body

    if (!cve_data) {
      return NextResponse.json({ error: 'Provide CVE data to analyze.' }, { status: 400 })
    }

    // Determine provider and validate model
    const provider = getProvider(model)
    if (!provider) {
      return NextResponse.json({ error: 'Unsupported model.' }, { status: 400 })
    }

    // Check that the user has the right API key for the selected provider
    if (provider === 'anthropic' && !profile?.anthropic_api_key) {
      return NextResponse.json(
        { error: 'No Anthropic API key configured. Go to Settings to add your key.' },
        { status: 403 }
      )
    }
    if (provider === 'openai' && !profile?.openai_api_key) {
      return NextResponse.json(
        { error: 'No OpenAI API key configured. Go to Settings to add your key.' },
        { status: 403 }
      )
    }

    const doc = buildCveDocument(cve_data)
    const today = new Date().toISOString().split('T')[0]
    const userContent = `Today's date: ${today}

Analyze the vulnerability data below and produce a structured CTI report using the threat_intel_report tool.

## CRITICAL ACCURACY REQUIREMENTS
1. **Copy factual data EXACTLY from the input below.** This includes: CVE ID, CVSS score, CVSS vector string, CVSS breakdown values, CWE ID, vendor, product, version numbers, all dates, and CISA KEV fields. Do NOT recalculate, round, or "correct" any of these values.
2. **References:** ONLY include URLs that appear in the input data below, plus these standard URLs:
   - https://nvd.nist.gov/vuln/detail/${cve_data.id ?? '[CVE-ID]'}
   - https://www.cisa.gov/known-exploited-vulnerabilities-catalog (only if the CVE is in KEV)
   Do NOT construct vendor advisory URLs unless they appear in the input.
3. **IOCs:** Leave ALL IOC arrays empty unless you are certain of publicly documented IOCs for THIS specific CVE. Explain in availability_note.
4. **Threat actors:** Return empty array unless a specific public threat report (name the source) attributes activity to THIS CVE.
5. **Set report_date to "${today}".**

## YOUR EXPERT ANALYSIS (add value here)
- Root cause analysis and exploitation mechanics specific to the technology
- MITRE ATT&CK mapping with justifications
- Detection queries using real platform field names and event IDs
- Remediation prioritization calibrated to real-world risk
- Analyst assessment with actionable strategic guidance

${doc}`

    // Convert Zod schema to JSON Schema
    const jsonSchema = zodToJsonSchema(ThreatIntelSchema, {
      $refStrategy: 'none',
      target: 'openApi3',
    })

    let report: ThreatIntelReport
    let usage = { input_tokens: 0, output_tokens: 0 }

    if (provider === 'anthropic') {
      const result = await callAnthropic(
        profile!.anthropic_api_key!,
        model as AnthropicModel,
        userContent,
        jsonSchema,
      )
      report = result.report
      usage = result.usage
    } else {
      const result = await callOpenAI(
        profile!.openai_api_key!,
        model as OpenAIModel,
        userContent,
        jsonSchema,
      )
      report = result.report
      usage = result.usage
    }

    // Send report via email (fire-and-forget, don't block the response)
    sendReportEmail(report, user.email!).catch(err =>
      console.error('Failed to send threat intel email:', err)
    )

    return NextResponse.json({ report, usage })
  } catch (err) {
    console.error('Threat intel error:', err)
    // Never leak internal error details to the client
    if (err instanceof Anthropic.APIError) {
      if (err.status === 401) {
        return NextResponse.json({ error: 'Invalid Anthropic API key. Please check your key in Settings.' }, { status: 401 })
      }
      if (err.status === 429) {
        return NextResponse.json({ error: 'Anthropic API rate limit reached. Please try again later.' }, { status: 429 })
      }
    }
    if (err instanceof OpenAI.APIError) {
      if (err.status === 401) {
        return NextResponse.json({ error: 'Invalid OpenAI API key. Please check your key in Settings.' }, { status: 401 })
      }
      if (err.status === 429) {
        return NextResponse.json({ error: 'OpenAI API rate limit reached. Please try again later.' }, { status: 429 })
      }
    }
    return NextResponse.json({ error: 'Failed to generate report. Please try again.' }, { status: 500 })
  }
}

// ─── Provider Calls ──────────────────────────────────────────────────────────

async function callAnthropic(
  apiKey: string,
  model: AnthropicModel,
  userContent: string,
  jsonSchema: ReturnType<typeof zodToJsonSchema>,
): Promise<{ report: ThreatIntelReport; usage: { input_tokens: number; output_tokens: number } }> {
  const client = new Anthropic({ apiKey })

  const response = await client.messages.create({
    model,
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

  const toolBlock = response.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
  )

  if (!toolBlock) {
    throw new Error('Model declined to generate report')
  }

  const parsed = ThreatIntelSchema.safeParse(toolBlock.input)
  if (!parsed.success) {
    console.error('Schema validation failed:', parsed.error.issues)
    throw new Error('Report generation produced invalid data')
  }

  return {
    report: parsed.data,
    usage: {
      input_tokens: response.usage?.input_tokens ?? 0,
      output_tokens: response.usage?.output_tokens ?? 0,
    },
  }
}

async function callOpenAI(
  apiKey: string,
  model: OpenAIModel,
  userContent: string,
  jsonSchema: ReturnType<typeof zodToJsonSchema>,
): Promise<{ report: ThreatIntelReport; usage: { input_tokens: number; output_tokens: number } }> {
  const client = new OpenAI({ apiKey })

  const response = await client.chat.completions.create({
    model,
    max_completion_tokens: 16000,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userContent },
    ],
    tools: [{
      type: 'function',
      function: {
        name: 'threat_intel_report',
        description: 'Submit the completed structured CTI report.',
        parameters: jsonSchema as Record<string, unknown>,
        strict: true,
      },
    }],
    tool_choice: { type: 'function', function: { name: 'threat_intel_report' } },
  })

  const toolCall = response.choices?.[0]?.message?.tool_calls?.[0]
  if (!toolCall || toolCall.type !== 'function' || !toolCall.function?.arguments) {
    throw new Error('Model declined to generate report')
  }

  let rawData: unknown
  try {
    rawData = JSON.parse(toolCall.function.arguments)
  } catch {
    throw new Error('Model returned invalid JSON')
  }

  const parsed = ThreatIntelSchema.safeParse(rawData)
  if (!parsed.success) {
    console.error('Schema validation failed:', parsed.error.issues)
    throw new Error('Report generation produced invalid data')
  }

  return {
    report: parsed.data,
    usage: {
      input_tokens: response.usage?.prompt_tokens ?? 0,
      output_tokens: response.usage?.completion_tokens ?? 0,
    },
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
