import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

const NVD_URL = 'https://services.nvd.nist.gov/rest/json/cves/2.0'
const CISA_KEV_URL = 'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json'
const VULN_ALERT_RECIPIENT = 'adrianrazvan.lisman@stefanini.com'

export const dynamic = 'force-dynamic'
export const revalidate = 3600

// Track seen CVE IDs to detect new entries (per-instance on serverless)
const seenCveIds = new Set<string>()

export interface CisaKevEntry {
  cveID: string
  vendorProject: string
  product: string
  vulnerabilityName: string
  dateAdded: string
  shortDescription: string
  requiredAction: string
  dueDate: string
  notes: string
  knownRansomwareCampaignUse: string
}

export interface CvssV31 {
  type: string
  cvssData: {
    version: string
    vectorString: string
    baseScore: number
    baseSeverity: string
    attackVector: string
    attackComplexity: string
    privilegesRequired: string
    userInteraction: string
    scope: string
    confidentialityImpact: string
    integrityImpact: string
    availabilityImpact: string
  }
  exploitabilityScore: number
  impactScore: number
}

export interface NvdCve {
  id: string
  published: string
  lastModified: string
  descriptions: Array<{ lang: string; value: string }>
  metrics: {
    cvssMetricV31?: CvssV31[]
    cvssMetricV40?: Array<{
      cvssData: { baseScore: number; baseSeverity: string; vectorString: string }
    }>
  }
  weaknesses: Array<{ description: Array<{ lang: string; value: string }> }>
  cisaExploitAdd?: string
  cisaActionDue?: string
  cisaRequiredAction?: string
  cisaVulnerabilityName?: string
  references: Array<{ url: string; tags?: string[] }>
}

export interface VulnerabilityEntry extends NvdCve {
  vendorProject?: string
  product?: string
  dateAdded?: string
  knownRansomwareCampaignUse?: string
  shortDescription?: string
}

export interface VulnApiResponse {
  vulnerabilities: VulnerabilityEntry[]
  total: number
  lastUpdated: string
}

export async function GET() {
  try {
    const nvdHeaders: Record<string, string> = { 'Content-Type': 'application/json' }
    if (process.env.NVD_API_KEY) nvdHeaders['apiKey'] = process.env.NVD_API_KEY

    // 1. Fetch CISA KEV — always reliable
    const kevRes = await fetch(CISA_KEV_URL, { next: { revalidate: 3600 } })
    if (!kevRes.ok) throw new Error(`CISA KEV error: ${kevRes.status}`)
    const kevData = await kevRes.json()

    const kevList: CisaKevEntry[] = (kevData.vulnerabilities ?? []) as CisaKevEntry[]
    const kevMap = new Map<string, CisaKevEntry>()
    for (const entry of kevList) kevMap.set(entry.cveID, entry)

    // Sort CISA KEV by dateAdded desc, take top 60 for NVD enrichment
    const sorted = [...kevList].sort((a, b) => b.dateAdded.localeCompare(a.dateAdded))
    const top = sorted.slice(0, 60)

    // 2. Try to enrich with NVD data (CVSS, CWE, references)
    //    Fetch each CVE individually to avoid unsupported filter params
    const nvdCveMap = new Map<string, NvdCve>()
    try {
      // Batch requests in groups of 10 to stay within rate limits
      const batchSize = 10
      for (let i = 0; i < top.length; i += batchSize) {
        const batch = top.slice(i, i + batchSize)
        const results = await Promise.allSettled(
          batch.map(kev =>
            fetch(`${NVD_URL}?cveId=${kev.cveID}`, {
              headers: nvdHeaders,
              next: { revalidate: 3600 },
            }).then(r => r.ok ? r.json() : null)
          )
        )
        for (const result of results) {
          if (result.status === 'fulfilled' && result.value) {
            const cve = result.value.vulnerabilities?.[0]?.cve as NvdCve | undefined
            if (cve) nvdCveMap.set(cve.id, cve)
          }
        }
        // Small delay between batches to respect rate limits
        if (i + batchSize < top.length) await new Promise(r => setTimeout(r, 600))
      }
    } catch (nvdErr) {
      console.warn('NVD enrichment failed, using CISA KEV data only:', nvdErr)
    }

    // 3. Merge CISA KEV + NVD
    const vulnerabilities: VulnerabilityEntry[] = top.map(kev => {
      const nvd = nvdCveMap.get(kev.cveID)
      return {
        id: kev.cveID,
        published: nvd?.published ?? kev.dateAdded,
        lastModified: nvd?.lastModified ?? kev.dateAdded,
        descriptions: nvd?.descriptions ?? [{ lang: 'en', value: kev.shortDescription }],
        metrics: nvd?.metrics ?? {},
        weaknesses: nvd?.weaknesses ?? [],
        references: nvd?.references ?? [],
        cisaExploitAdd: kev.dateAdded,
        cisaActionDue: kev.dueDate,
        cisaRequiredAction: kev.requiredAction,
        cisaVulnerabilityName: kev.vulnerabilityName,
        vendorProject: kev.vendorProject,
        product: kev.product,
        dateAdded: kev.dateAdded,
        knownRansomwareCampaignUse: kev.knownRansomwareCampaignUse,
        shortDescription: kev.shortDescription,
      }
    })

    // 4. Detect new vulnerabilities and send email alerts
    const currentIds = new Set(vulnerabilities.map(v => v.id))
    if (seenCveIds.size > 0) {
      const newVulns = vulnerabilities.filter(v => !seenCveIds.has(v.id))
      if (newVulns.length > 0) {
        sendNewVulnAlerts(newVulns).catch(err =>
          console.error('Vuln alert email error:', err)
        )
      }
    }
    // Update seen set
    seenCveIds.clear()
    for (const id of currentIds) seenCveIds.add(id)

    return NextResponse.json({
      vulnerabilities,
      total: kevList.length,
      lastUpdated: new Date().toISOString(),
    } satisfies VulnApiResponse)
  } catch (err) {
    console.error('Vulnerability feed error:', err)
    return NextResponse.json({ error: 'Failed to fetch vulnerability data' }, { status: 500 })
  }
}

// ─── New Vulnerability Email Alert ────────────────────────────────────────────

function getCvssFromEntry(v: VulnerabilityEntry) {
  const m = v.metrics?.cvssMetricV31?.[0]
  if (m) return { score: m.cvssData.baseScore, severity: m.cvssData.baseSeverity, vector: m.cvssData.vectorString }
  const m40 = v.metrics?.cvssMetricV40?.[0]
  if (m40) return { score: m40.cvssData.baseScore, severity: m40.cvssData.baseSeverity, vector: m40.cvssData.vectorString }
  return null
}

function getCweFromEntry(v: VulnerabilityEntry) {
  return v.weaknesses?.[0]?.description?.find(d => d.lang === 'en')?.value ?? null
}

function fmtDate(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function sevColor(s?: string) {
  switch (s?.toUpperCase()) {
    case 'CRITICAL': return { bg: '#dc2626', text: '#ffffff' }
    case 'HIGH':     return { bg: '#ea580c', text: '#ffffff' }
    case 'MEDIUM':   return { bg: '#d97706', text: '#000000' }
    case 'LOW':      return { bg: '#2563eb', text: '#ffffff' }
    default:         return { bg: '#71717a', text: '#ffffff' }
  }
}

function buildVulnCardHtml(v: VulnerabilityEntry): string {
  const cvss = getCvssFromEntry(v)
  const cwe = getCweFromEntry(v)
  const desc = v.shortDescription ?? v.descriptions?.find(d => d.lang === 'en')?.value ?? '—'
  const isRansomware = v.knownRansomwareCampaignUse === 'Known'
  const sc = cvss ? sevColor(cvss.severity) : sevColor()
  const borderColor = cvss?.severity?.toUpperCase() === 'CRITICAL' ? '#dc2626'
    : cvss?.severity?.toUpperCase() === 'HIGH' ? '#ea580c'
    : cvss?.severity?.toUpperCase() === 'MEDIUM' ? '#d97706'
    : cvss?.severity?.toUpperCase() === 'LOW' ? '#2563eb' : '#71717a'

  const refs = (v.references ?? []).slice(0, 5)

  return `
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
    <tr>
      <td style="border-left:4px solid ${borderColor};background:#ffffff;border:1px solid #e4e4e7;border-left:4px solid ${borderColor};border-radius:8px;padding:20px 24px;">
        <!-- CVE ID + Severity -->
        <table cellpadding="0" cellspacing="0"><tr>
          <td style="padding-right:12px;">
            <a href="https://nvd.nist.gov/vuln/detail/${v.id}" style="font-family:monospace;font-size:14px;font-weight:700;color:#dc2626;text-decoration:none;">${v.id}</a>
          </td>
          ${cvss ? `<td style="padding-right:8px;">
            <span style="background:${sc.bg};color:${sc.text};font-size:11px;font-weight:700;padding:3px 10px;border-radius:4px;">${cvss.severity} ${cvss.score.toFixed(1)}</span>
          </td>` : ''}
          ${isRansomware ? `<td>
            <span style="background:#fef2f2;color:#dc2626;border:1px solid #fecaca;font-size:11px;font-weight:600;padding:3px 10px;border-radius:4px;">Ransomware</span>
          </td>` : ''}
        </tr></table>

        <!-- Title -->
        <p style="margin:10px 0 6px;font-size:15px;font-weight:600;color:#0a0a0a;line-height:1.4;">
          ${v.cisaVulnerabilityName ?? v.id}
        </p>

        <!-- Vendor / Product / CWE -->
        ${(v.vendorProject || v.product) ? `
        <div style="margin-bottom:10px;">
          <span style="background:#f4f4f5;border:1px solid #e4e4e7;border-radius:12px;font-size:11px;color:#3f3f46;padding:3px 10px;">${[v.vendorProject, v.product].filter(Boolean).join(' · ')}</span>
          ${cwe ? `<span style="background:#f4f4f5;border:1px solid #e4e4e7;border-radius:12px;font-family:monospace;font-size:11px;color:#71717a;padding:3px 10px;margin-left:4px;">${cwe}</span>` : ''}
        </div>` : ''}

        <!-- Description -->
        <p style="margin:0 0 14px;font-size:13px;color:#3f3f46;line-height:1.7;">${desc}</p>

        <!-- CVSS Vector -->
        ${cvss?.vector ? `<p style="margin:0 0 12px;font-family:monospace;font-size:11px;color:#a1a1aa;">${cvss.vector}</p>` : ''}

        <!-- Dates -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
          <tr>
            ${[
              ['Published', v.published],
              ['KEV Added', v.dateAdded ?? v.cisaExploitAdd],
              ['Action Due', v.cisaActionDue],
              ['Last Modified', v.lastModified],
            ].map(([label, val]) => `
              <td style="padding-right:8px;vertical-align:top;">
                <div style="background:#f4f4f5;border:1px solid #e4e4e7;border-radius:6px;padding:8px 10px;">
                  <p style="margin:0;font-size:10px;color:#71717a;text-transform:uppercase;">${label}</p>
                  <p style="margin:2px 0 0;font-size:12px;font-weight:600;color:#0a0a0a;">${fmtDate(val ?? undefined)}</p>
                </div>
              </td>`).join('')}
          </tr>
        </table>

        <!-- CISA Required Action -->
        ${v.cisaRequiredAction ? `
        <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:6px;padding:10px 14px;margin-bottom:12px;">
          <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#ea580c;text-transform:uppercase;">CISA Required Action</p>
          <p style="margin:0;font-size:13px;color:#9a3412;line-height:1.6;">${v.cisaRequiredAction}</p>
        </div>` : ''}

        <!-- References -->
        ${refs.length > 0 ? `
        <p style="margin:0 0 6px;font-size:11px;font-weight:600;color:#71717a;text-transform:uppercase;">References</p>
        ${refs.map(r => `
          <div style="margin-bottom:4px;">
            <a href="${r.url}" style="font-size:12px;color:#dc2626;word-break:break-all;text-decoration:none;">${r.url}</a>
            ${r.tags?.length ? `<span style="font-size:10px;color:#a1a1aa;margin-left:6px;">${r.tags[0]}</span>` : ''}
          </div>`).join('')}` : ''}
      </td>
    </tr>
  </table>`
}

async function sendNewVulnAlerts(vulns: VulnerabilityEntry[]) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !SMTP_FROM) {
    console.warn('SMTP not configured — skipping vuln alert emails')
    return
  }

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.secforit.ro').replace(/\/$/, '')

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>New Vulnerability Alert</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
<tr><td align="center">
<table width="680" cellpadding="0" cellspacing="0" style="max-width:680px;width:100%;">

  <!-- Header -->
  <tr>
    <td style="background:#18181b;padding:24px 32px;border-radius:8px 8px 0 0;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td>
            <img src="${siteUrl}/Logo-SECFORIT.png" alt="SECFORIT" width="160" height="44" style="height:36px;width:auto;display:block;" />
            <span style="color:#a1a1aa;font-size:12px;display:block;margin-top:6px;">Vulnerability Alert</span>
          </td>
          <td align="right">
            <span style="background:#dc2626;color:#fff;font-size:12px;font-weight:700;padding:4px 12px;border-radius:4px;">${vulns.length} New CVE${vulns.length > 1 ? 's' : ''}</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Body -->
  <tr>
    <td style="background:#ffffff;padding:24px 32px 32px;border-left:1px solid #e4e4e7;border-right:1px solid #e4e4e7;">
      <p style="margin:0 0 20px;font-size:14px;color:#3f3f46;line-height:1.6;">
        ${vulns.length} new ${vulns.length > 1 ? 'vulnerabilities have' : 'vulnerability has'} been added to the CISA Known Exploited Vulnerabilities catalog.
      </p>
      ${vulns.map(v => buildVulnCardHtml(v)).join('')}
    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td style="background:#f4f4f5;padding:20px 32px;border-radius:0 0 8px 8px;border:1px solid #e4e4e7;border-top:none;">
      <p style="margin:0;color:#a1a1aa;font-size:12px;line-height:1.6;">
        &copy; ${new Date().getFullYear()} SECFORIT &middot; Romania, EU &middot;
        <a href="${siteUrl}/portal/vulnerabilities" style="color:#dc2626;text-decoration:none;">View Feed</a>
      </p>
      <p style="margin:6px 0 0;color:#a1a1aa;font-size:11px;">
        Automated alert from SECFORIT Vulnerability Intelligence. Source: CISA KEV + NVD.
      </p>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`

  const plainText = vulns.map(v => {
    const cvss = getCvssFromEntry(v)
    return `${v.id} — ${v.cisaVulnerabilityName ?? v.id}
${v.vendorProject ? `Vendor: ${v.vendorProject}` : ''}${v.product ? ` · ${v.product}` : ''}
${cvss ? `CVSS: ${cvss.score.toFixed(1)} ${cvss.severity}` : ''}
${v.shortDescription ?? v.descriptions?.find(d => d.lang === 'en')?.value ?? ''}
KEV Added: ${fmtDate(v.dateAdded)} | Due: ${fmtDate(v.cisaActionDue)}
${v.cisaRequiredAction ? `Action: ${v.cisaRequiredAction}` : ''}
NVD: https://nvd.nist.gov/vuln/detail/${v.id}
`
  }).join('\n---\n\n')

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT, 10),
    secure: true,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  })

  const cveIds = vulns.map(v => v.id).join(', ')
  await transporter.sendMail({
    from: `"SECFORIT Vuln Alert" <${SMTP_FROM}>`,
    to: VULN_ALERT_RECIPIENT,
    subject: `[VULN] ${vulns.length} New CVE${vulns.length > 1 ? 's' : ''}: ${cveIds}`,
    text: `SECFORIT VULNERABILITY ALERT\n${vulns.length} new vulnerabilities detected.\n\n${plainText}\n---\n© ${new Date().getFullYear()} SECFORIT · https://www.secforit.ro`,
    html,
  })

  console.log(`Vuln alert sent for ${vulns.length} new CVEs: ${cveIds}`)
}
