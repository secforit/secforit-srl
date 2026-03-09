import { NextRequest, NextResponse } from 'next/server'

const NVD_URL = 'https://services.nvd.nist.gov/rest/json/cves/2.0'
const CISA_KEV_URL = 'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json'

export const revalidate = 3600

// Rate limit to protect NVD API key from external abuse
// NOTE: In-memory — resets on redeploy, per-instance on serverless.
const vulnRateMap = new Map<string, { count: number; resetAt: number }>()
const VULN_WINDOW = 60 * 60 * 1000 // 1 hour
const VULN_MAX = 30                 // max requests per IP per hour

function isVulnRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = vulnRateMap.get(ip)
  if (!entry || now > entry.resetAt) {
    vulnRateMap.set(ip, { count: 1, resetAt: now + VULN_WINDOW })
    return false
  }
  entry.count++
  return entry.count > VULN_MAX
}

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

export async function GET(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    if (isVulnRateLimited(ip)) {
      return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 })
    }

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
