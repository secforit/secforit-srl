import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 300

// ─── Authorization ────────────────────────────────────────────────────────────

function isAuthorized(email?: string | null): boolean {
  if (!email) return false
  const raw = process.env.THREAT_INTEL_ALLOWED_EMAILS ?? ''
  // If env var not configured, all authenticated users have access
  if (!raw.trim()) return true
  return raw.split(',').map(e => e.trim().toLowerCase()).includes(email.toLowerCase())
}

// ─── Zod schema (for typing only) ────────────────────────────────────────────

const ThreatIntelSchema = z.object({
  classification: z.object({
    tlp: z.enum(['WHITE', 'GREEN', 'AMBER', 'RED']),
    confidence: z.enum(['HIGH', 'MEDIUM', 'LOW']),
    severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFORMATIONAL']),
  }),
  executive_summary: z.string(),
  vulnerability: z.object({
    cve_id: z.string().optional(),
    title: z.string(),
    description: z.string(),
    cvss_score: z.number().optional(),
    cvss_vector: z.string().optional(),
    cvss_breakdown: z.object({
      attack_vector: z.string().optional(),
      attack_complexity: z.string().optional(),
      privileges_required: z.string().optional(),
      user_interaction: z.string().optional(),
      scope: z.string().optional(),
      confidentiality: z.string().optional(),
      integrity: z.string().optional(),
      availability: z.string().optional(),
    }).optional(),
    affected_products: z.array(z.string()),
    related_cves: z.array(z.string()).optional(),
    patch_available: z.boolean(),
    exploit_available: z.boolean(),
    exploit_maturity: z.enum(['PROOF_OF_CONCEPT', 'FUNCTIONAL', 'IN_THE_WILD', 'WEAPONIZED', 'UNKNOWN']).optional(),
  }),
  threat_context: z.object({
    cisa_kev: z.boolean(),
    active_exploitation: z.boolean(),
    threat_actors: z.array(z.object({
      name: z.string(),
      type: z.enum(['APT', 'CYBERCRIMINAL', 'HACKTIVIST', 'INSIDER', 'NATION_STATE', 'UNKNOWN']),
      motivation: z.string().optional(),
    })).optional(),
    targeted_sectors: z.array(z.string()).optional(),
    targeted_regions: z.array(z.string()).optional(),
    ransomware_linked: z.boolean(),
  }),
  technical_analysis: z.object({
    vulnerability_type: z.string(),
    attack_surface: z.string(),
    attack_scenario: z.string(),
    prerequisites: z.array(z.string()),
    post_exploitation: z.array(z.string()).optional(),
    lateral_movement: z.string().optional(),
  }),
  mitre_attack: z.object({
    tactics: z.array(z.object({
      id: z.string(),
      name: z.string(),
    })),
    techniques: z.array(z.object({
      id: z.string(),
      name: z.string(),
      sub_technique: z.string().optional(),
    })),
  }),
  impact_assessment: z.object({
    confidentiality: z.enum(['NONE', 'LOW', 'HIGH']),
    integrity: z.enum(['NONE', 'LOW', 'HIGH']),
    availability: z.enum(['NONE', 'LOW', 'HIGH']),
    business_impact: z.string(),
    estimated_affected_systems: z.string().optional(),
  }),
  iocs: z.object({
    ips: z.array(z.string()).optional(),
    domains: z.array(z.string()).optional(),
    urls: z.array(z.string()).optional(),
    hashes: z.array(z.string()).optional(),
    user_agents: z.array(z.string()).optional(),
    other: z.array(z.string()).optional(),
  }),
  remediation: z.object({
    patches: z.array(z.object({
      vendor: z.string(),
      version: z.string(),
      url: z.string().optional(),
    })).optional(),
    workarounds: z.array(z.string()).optional(),
    priority_actions: z.array(z.string()),
    timeline_recommendation: z.string(),
  }),
  detection: z.object({
    detection_queries: z.array(z.object({
      platform: z.string(),
      query: z.string(),
      description: z.string(),
    })).optional(),
    threat_hunting: z.array(z.string()).optional(),
    log_sources: z.array(z.string()).optional(),
  }),
  references: z.array(z.object({
    title: z.string(),
    url: z.string(),
    type: z.enum(['ADVISORY', 'PATCH', 'ARTICLE', 'TOOL', 'FEED', 'OTHER']),
  })).optional(),
  analyst_assessment: z.string(),
})

export type ThreatIntelReport = z.infer<typeof ThreatIntelSchema>

// ─── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a Senior Cyber Threat Intelligence (CTI) Analyst with 15+ years of experience in vulnerability research, incident response, and threat hunting. Your role is to produce professional, structured threat intelligence reports that are accurate, actionable, and calibrated to real-world risk.

CORE RESPONSIBILITIES:
- Analyze vulnerabilities, exploits, and threat actor activity with technical depth
- Map findings to MITRE ATT&CK framework (always use real tactic/technique IDs)
- Assess business impact and provide prioritized remediation guidance
- Classify intelligence using TLP (Traffic Light Protocol) appropriately
- Provide detection queries in KQL (Microsoft Sentinel/Defender), Splunk SPL, or Sigma format when possible

ANALYSIS STANDARDS:
- Be specific and technical — avoid vague or generic statements
- Assign confidence levels (HIGH/MEDIUM/LOW) based on evidence quality
- Distinguish between confirmed facts and analyst assessments
- Reference CVE IDs, CWE classifications, and CVSS scores precisely
- Include CISA KEV status prominently when applicable
- Map all relevant MITRE ATT&CK techniques with correct IDs (e.g., T1190 for Exploit Public-Facing Application)

OUTPUT REQUIREMENTS:
- executive_summary: 2-3 sentences for C-level audience
- technical_analysis: Deep dive for security engineers
- attack_scenario: Step-by-step exploitation chain
- iocs: Only include IOCs with high confidence (omit if none confirmed)
- detection_queries: Practical, copy-paste ready queries
- priority_actions: Numbered, ordered by urgency
- analyst_assessment: Closing professional assessment with risk outlook

CLASSIFICATION:
- TLP:RED — Critical zero-days with active nation-state exploitation, no public patch
- TLP:AMBER — Actively exploited, limited disclosure recommended
- TLP:GREEN — Community sharing appropriate, widely known
- TLP:WHITE — Fully public information, no restriction

Always produce complete, professional-grade intelligence that could be shared directly with a CISO or SOC team.`

// ─── Tool schema (JSON Schema for tool_use structured output) ─────────────────

const TOOL_SCHEMA = {
  name: 'create_threat_intel_report',
  description: 'Create a structured threat intelligence report from the analyzed document or CVE data.',
  input_schema: {
    type: 'object',
    properties: {
      classification: {
        type: 'object',
        properties: {
          tlp: { type: 'string', enum: ['WHITE', 'GREEN', 'AMBER', 'RED'] },
          confidence: { type: 'string', enum: ['HIGH', 'MEDIUM', 'LOW'] },
          severity: { type: 'string', enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFORMATIONAL'] },
        },
        required: ['tlp', 'confidence', 'severity'],
      },
      executive_summary: { type: 'string' },
      vulnerability: {
        type: 'object',
        properties: {
          cve_id: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          cvss_score: { type: 'number' },
          cvss_vector: { type: 'string' },
          cvss_breakdown: {
            type: 'object',
            properties: {
              attack_vector: { type: 'string' },
              attack_complexity: { type: 'string' },
              privileges_required: { type: 'string' },
              user_interaction: { type: 'string' },
              scope: { type: 'string' },
              confidentiality: { type: 'string' },
              integrity: { type: 'string' },
              availability: { type: 'string' },
            },
          },
          affected_products: { type: 'array', items: { type: 'string' } },
          related_cves: { type: 'array', items: { type: 'string' } },
          patch_available: { type: 'boolean' },
          exploit_available: { type: 'boolean' },
          exploit_maturity: { type: 'string', enum: ['PROOF_OF_CONCEPT', 'FUNCTIONAL', 'IN_THE_WILD', 'WEAPONIZED', 'UNKNOWN'] },
        },
        required: ['title', 'description', 'affected_products', 'patch_available', 'exploit_available'],
      },
      threat_context: {
        type: 'object',
        properties: {
          cisa_kev: { type: 'boolean' },
          active_exploitation: { type: 'boolean' },
          threat_actors: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                type: { type: 'string', enum: ['APT', 'CYBERCRIMINAL', 'HACKTIVIST', 'INSIDER', 'NATION_STATE', 'UNKNOWN'] },
                motivation: { type: 'string' },
              },
              required: ['name', 'type'],
            },
          },
          targeted_sectors: { type: 'array', items: { type: 'string' } },
          targeted_regions: { type: 'array', items: { type: 'string' } },
          ransomware_linked: { type: 'boolean' },
        },
        required: ['cisa_kev', 'active_exploitation', 'ransomware_linked'],
      },
      technical_analysis: {
        type: 'object',
        properties: {
          vulnerability_type: { type: 'string' },
          attack_surface: { type: 'string' },
          attack_scenario: { type: 'string' },
          prerequisites: { type: 'array', items: { type: 'string' } },
          post_exploitation: { type: 'array', items: { type: 'string' } },
          lateral_movement: { type: 'string' },
        },
        required: ['vulnerability_type', 'attack_surface', 'attack_scenario', 'prerequisites'],
      },
      mitre_attack: {
        type: 'object',
        properties: {
          tactics: {
            type: 'array',
            items: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' } }, required: ['id', 'name'] },
          },
          techniques: {
            type: 'array',
            items: {
              type: 'object',
              properties: { id: { type: 'string' }, name: { type: 'string' }, sub_technique: { type: 'string' } },
              required: ['id', 'name'],
            },
          },
        },
        required: ['tactics', 'techniques'],
      },
      impact_assessment: {
        type: 'object',
        properties: {
          confidentiality: { type: 'string', enum: ['NONE', 'LOW', 'HIGH'] },
          integrity: { type: 'string', enum: ['NONE', 'LOW', 'HIGH'] },
          availability: { type: 'string', enum: ['NONE', 'LOW', 'HIGH'] },
          business_impact: { type: 'string' },
          estimated_affected_systems: { type: 'string' },
        },
        required: ['confidentiality', 'integrity', 'availability', 'business_impact'],
      },
      iocs: {
        type: 'object',
        properties: {
          ips: { type: 'array', items: { type: 'string' } },
          domains: { type: 'array', items: { type: 'string' } },
          urls: { type: 'array', items: { type: 'string' } },
          hashes: { type: 'array', items: { type: 'string' } },
          user_agents: { type: 'array', items: { type: 'string' } },
          other: { type: 'array', items: { type: 'string' } },
        },
      },
      remediation: {
        type: 'object',
        properties: {
          patches: {
            type: 'array',
            items: { type: 'object', properties: { vendor: { type: 'string' }, version: { type: 'string' }, url: { type: 'string' } }, required: ['vendor', 'version'] },
          },
          workarounds: { type: 'array', items: { type: 'string' } },
          priority_actions: { type: 'array', items: { type: 'string' } },
          timeline_recommendation: { type: 'string' },
        },
        required: ['priority_actions', 'timeline_recommendation'],
      },
      detection: {
        type: 'object',
        properties: {
          detection_queries: {
            type: 'array',
            items: { type: 'object', properties: { platform: { type: 'string' }, query: { type: 'string' }, description: { type: 'string' } }, required: ['platform', 'query', 'description'] },
          },
          threat_hunting: { type: 'array', items: { type: 'string' } },
          log_sources: { type: 'array', items: { type: 'string' } },
        },
      },
      references: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            url: { type: 'string' },
            type: { type: 'string', enum: ['ADVISORY', 'PATCH', 'ARTICLE', 'TOOL', 'FEED', 'OTHER'] },
          },
          required: ['title', 'url', 'type'],
        },
      },
      analyst_assessment: { type: 'string' },
    },
    required: [
      'classification', 'executive_summary', 'vulnerability', 'threat_context',
      'technical_analysis', 'mitre_attack', 'impact_assessment', 'iocs',
      'remediation', 'detection', 'analyst_assessment',
    ],
  },
} satisfies Anthropic.Tool

// ─── CVE document builder ─────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildCveDocument(cve: Record<string, any>): string {
  const lines: string[] = [`# CVE Intelligence Brief\n`]

  if (cve.id) lines.push(`**CVE ID:** ${cve.id}`)
  if (cve.cisaVulnerabilityName) lines.push(`**Vulnerability Name:** ${cve.cisaVulnerabilityName}`)
  if (cve.vendorProject || cve.product) {
    lines.push(`**Affected:** ${[cve.vendorProject, cve.product].filter(Boolean).join(' — ')}`)
  }

  const desc = cve.descriptions?.find((d: {lang: string; value: string}) => d.lang === 'en')?.value
  if (desc) lines.push(`\n**Description:** ${desc}`)
  if (cve.shortDescription && cve.shortDescription !== desc) {
    lines.push(`**CISA Summary:** ${cve.shortDescription}`)
  }

  const v31 = cve.metrics?.cvssMetricV31?.[0]
  if (v31) {
    lines.push(`\n## CVSS v3.1`)
    lines.push(`- Base Score: ${v31.cvssData.baseScore} (${v31.cvssData.baseSeverity})`)
    lines.push(`- Vector: ${v31.cvssData.vectorString}`)
    const d = v31.cvssData
    lines.push(`- Attack Vector: ${d.attackVector}, Complexity: ${d.attackComplexity}`)
    lines.push(`- Privileges Required: ${d.privilegesRequired}, User Interaction: ${d.userInteraction}`)
    lines.push(`- Impact: C:${d.confidentialityImpact} / I:${d.integrityImpact} / A:${d.availabilityImpact}`)
  }

  if (cve.weaknesses?.length) {
    const cwe = cve.weaknesses[0].description?.find((d: {lang: string; value: string}) => d.lang === 'en')?.value
    if (cwe) lines.push(`\n**CWE:** ${cwe}`)
  }

  lines.push(`\n## CISA KEV Data`)
  lines.push(`- In KEV Catalog: Yes`)
  if (cve.dateAdded) lines.push(`- Date Added to KEV: ${cve.dateAdded}`)
  if (cve.cisaActionDue) lines.push(`- Federal Remediation Due: ${cve.cisaActionDue}`)
  if (cve.cisaRequiredAction) lines.push(`- Required Action: ${cve.cisaRequiredAction}`)
  if (cve.knownRansomwareCampaignUse) {
    lines.push(`- Ransomware Campaign Use: ${cve.knownRansomwareCampaignUse}`)
  }

  lines.push(`\n## Timeline`)
  if (cve.published) lines.push(`- Published: ${cve.published}`)
  if (cve.lastModified) lines.push(`- Last Modified: ${cve.lastModified}`)

  if (cve.references?.length) {
    lines.push(`\n## References`)
    cve.references.slice(0, 10).forEach((r: {url: string; tags?: string[]}) => {
      lines.push(`- ${r.url}${r.tags?.length ? ` (${r.tags.join(', ')})` : ''}`)
    })
  }

  return lines.join('\n')
}

// ─── Route ───────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isAuthorized(user.email)) {
    return NextResponse.json({ error: 'Access denied. Analyst role required.' }, { status: 403 })
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const pdf = formData.get('pdf') as File | null
  const cveDataRaw = formData.get('cve_data') as string | null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let userContent: any[]

  if (pdf) {
    const buffer = await pdf.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')
    userContent = [
      { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 }, title: pdf.name },
      { type: 'text', text: 'Analyze this document and produce a complete threat intelligence report.' },
    ]
  } else if (cveDataRaw) {
    const cveData = JSON.parse(cveDataRaw)
    userContent = [
      { type: 'text', text: `${buildCveDocument(cveData)}\n\nProduce a complete threat intelligence report for this CVE. The vulnerability is confirmed exploited in the wild (CISA KEV). Be specific about exploitation methods, threat actors, and detection.` },
    ]
  } else {
    return NextResponse.json({ error: 'Provide either a PDF file or cve_data JSON' }, { status: 400 })
  }

  // SSE streaming response — keeps connection alive during long Anthropic calls
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: string) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${data}\n\n`))
      }

      // Ping every 8 seconds to prevent gateway timeout
      const ping = setInterval(() => send('ping', '{}'), 8000)

      try {
        send('status', JSON.stringify({ message: 'Analyzing with Claude…' }))

        const response = await client.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 4096,
          tools: [TOOL_SCHEMA],
          tool_choice: { type: 'tool', name: 'create_threat_intel_report' },
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: userContent }],
        })

        const toolBlock = response.content.find(b => b.type === 'tool_use')
        if (!toolBlock || toolBlock.type !== 'tool_use') throw new Error('No structured output returned')

        const report = ThreatIntelSchema.parse(toolBlock.input)
        send('result', JSON.stringify({ report }))
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Internal error'
        send('error', JSON.stringify({ error: msg }))
      } finally {
        clearInterval(ping)
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
