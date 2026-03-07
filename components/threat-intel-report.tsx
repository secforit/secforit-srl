'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { ThreatIntelReport } from '@/app/api/threat-intel/route'
import {
  Shield, AlertTriangle, Cpu, Target, Activity,
  BookOpen, Wrench, Eye, Link2, ChevronRight, Mail, Loader2, CheckCircle2,
} from 'lucide-react'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function TlpBadge({ tlp }: { tlp: string }) {
  const map: Record<string, string> = {
    WHITE: 'bg-white text-black border border-zinc-300',
    GREEN: 'bg-green-600 text-white',
    AMBER: 'bg-amber-500 text-black',
    RED:   'bg-red-600 text-white',
  }
  return (
    <span className={`text-xs font-bold px-2.5 py-0.5 rounded font-mono ${map[tlp] ?? 'bg-zinc-500 text-white'}`}>
      TLP:{tlp}
    </span>
  )
}

function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, string> = {
    CRITICAL:      'bg-red-600 text-white',
    HIGH:          'bg-orange-500 text-white',
    MEDIUM:        'bg-yellow-500 text-black',
    LOW:           'bg-blue-500 text-white',
    INFORMATIONAL: 'bg-zinc-500 text-white',
  }
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded ${map[severity] ?? 'bg-zinc-500 text-white'}`}>
      {severity}
    </span>
  )
}

function ConfidenceBadge({ confidence }: { confidence: string }) {
  const map: Record<string, string> = {
    HIGH:   'bg-green-100 text-green-800 border border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800',
    MEDIUM: 'bg-yellow-100 text-yellow-800 border border-yellow-200 dark:bg-yellow-950 dark:text-yellow-400',
    LOW:    'bg-zinc-100 text-zinc-600 border border-zinc-200 dark:bg-zinc-900 dark:text-zinc-400',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded font-medium ${map[confidence] ?? ''}`}>
      Confidence: {confidence}
    </span>
  )
}

function ImpactDot({ level }: { level: string }) {
  const map: Record<string, string> = { HIGH: 'bg-red-500', LOW: 'bg-yellow-500', NONE: 'bg-zinc-300' }
  return <span className={`inline-block size-2.5 rounded-full ${map[level] ?? 'bg-zinc-300'}`} />
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{title}</h3>
      {children}
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 text-sm py-1.5 border-b border-border last:border-0">
      <span className="text-muted-foreground w-44 shrink-0">{label}</span>
      <span className="text-foreground font-medium">{value}</span>
    </div>
  )
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-sm text-foreground">
          <ChevronRight className="size-3.5 shrink-0 mt-0.5 text-primary" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

function CodeBlock({ platform, query, description }: { platform: string; query: string; description: string }) {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-secondary border-b border-border">
        <span className="text-xs font-semibold text-foreground font-mono">{platform}</span>
        <span className="text-xs text-muted-foreground">{description}</span>
      </div>
      <pre className="p-4 text-xs font-mono text-foreground bg-background overflow-x-auto whitespace-pre-wrap break-all">
        {query}
      </pre>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ThreatIntelReport({ report }: { report: ThreatIntelReport }) {
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSendEmail() {
    setSending(true)
    setSent(false)
    try {
      const res = await fetch('/api/threat-intel/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report }),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.error ?? 'Send failed')
      }
      setSent(true)
      setTimeout(() => setSent(false), 4000)
    } catch (err) {
      console.error(err)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 pb-4 border-b border-border">
        <TlpBadge tlp={report.classification.tlp} />
        <SeverityBadge severity={report.classification.severity} />
        <ConfidenceBadge confidence={report.classification.confidence} />
        {report.threat_context.cisa_kev && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-red-100 text-red-700 border border-red-200 dark:bg-red-950 dark:text-red-400">
            CISA KEV
          </span>
        )}
        {report.threat_context.ransomware_linked && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-orange-100 text-orange-700 border border-orange-200 dark:bg-orange-950 dark:text-orange-400">
            Ransomware Linked
          </span>
        )}
        <button
          onClick={handleSendEmail}
          disabled={sending || sent}
          className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${sent ? 'border-green-500 text-green-600 bg-green-50 dark:bg-green-950/30' : 'border-border text-foreground hover:bg-secondary'} disabled:opacity-60`}
        >
          {sending ? <Loader2 className="size-3.5 animate-spin" /> : sent ? <CheckCircle2 className="size-3.5" /> : <Mail className="size-3.5" />}
          {sending ? 'Sending…' : sent ? 'Sent!' : 'Send via Email'}
        </button>
      </div>

      {/* Executive summary */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
        <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Executive Summary</p>
        <p className="text-sm text-foreground leading-relaxed">{report.executive_summary}</p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="vulnerability">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="vulnerability" className="gap-1.5 text-xs"><Shield className="size-3.5" />Vulnerability</TabsTrigger>
          <TabsTrigger value="threat" className="gap-1.5 text-xs"><AlertTriangle className="size-3.5" />Threat Context</TabsTrigger>
          <TabsTrigger value="technical" className="gap-1.5 text-xs"><Cpu className="size-3.5" />Technical</TabsTrigger>
          <TabsTrigger value="mitre" className="gap-1.5 text-xs"><Target className="size-3.5" />MITRE ATT&CK</TabsTrigger>
          <TabsTrigger value="impact" className="gap-1.5 text-xs"><Activity className="size-3.5" />Impact</TabsTrigger>
          <TabsTrigger value="iocs" className="gap-1.5 text-xs"><BookOpen className="size-3.5" />IOCs</TabsTrigger>
          <TabsTrigger value="remediation" className="gap-1.5 text-xs"><Wrench className="size-3.5" />Remediation</TabsTrigger>
          <TabsTrigger value="detection" className="gap-1.5 text-xs"><Eye className="size-3.5" />Detection</TabsTrigger>
          {report.references && report.references.length > 0 && (
            <TabsTrigger value="references" className="gap-1.5 text-xs"><Link2 className="size-3.5" />References</TabsTrigger>
          )}
        </TabsList>

        {/* Vulnerability tab */}
        <TabsContent value="vulnerability" className="mt-4 space-y-4">
          <Card title="Vulnerability Details">
            <Row label="CVE ID" value={<span className="font-mono">{report.vulnerability.cve_id ?? '—'}</span>} />
            <Row label="Title" value={report.vulnerability.title} />
            <Row label="Type" value={report.technical_analysis.vulnerability_type} />
            {report.vulnerability.cvss_score !== undefined && (
              <Row label="CVSS Score" value={
                <span className="flex items-center gap-2">
                  <span className="font-mono font-bold">{report.vulnerability.cvss_score.toFixed(1)}</span>
                  {report.vulnerability.cvss_vector && (
                    <span className="font-mono text-xs text-muted-foreground">{report.vulnerability.cvss_vector}</span>
                  )}
                </span>
              } />
            )}
            <Row label="Patch Available" value={report.vulnerability.patch_available ? '✓ Yes' : '✗ No'} />
            <Row label="Exploit Available" value={report.vulnerability.exploit_available ? '✓ Yes' : '✗ No'} />
            {report.vulnerability.exploit_maturity && (
              <Row label="Exploit Maturity" value={report.vulnerability.exploit_maturity.replace(/_/g, ' ')} />
            )}
          </Card>

          <Card title="Description">
            <p className="text-sm text-foreground leading-relaxed">{report.vulnerability.description}</p>
          </Card>

          {report.vulnerability.cvss_breakdown && (
            <Card title="CVSS Breakdown">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {Object.entries(report.vulnerability.cvss_breakdown)
                  .filter(([, v]) => v)
                  .map(([key, value]) => (
                    <div key={key} className="bg-background border border-border rounded-lg px-3 py-2">
                      <p className="text-xs text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</p>
                      <p className="text-xs font-semibold text-foreground capitalize">{String(value).toLowerCase().replace(/_/g, ' ')}</p>
                    </div>
                  ))
                }
              </div>
            </Card>
          )}

          <Card title="Affected Products">
            <List items={report.vulnerability.affected_products} />
          </Card>

          {report.vulnerability.related_cves && report.vulnerability.related_cves.length > 0 && (
            <Card title="Related CVEs">
              <div className="flex flex-wrap gap-2">
                {report.vulnerability.related_cves.map(cve => (
                  <a
                    key={cve}
                    href={`https://nvd.nist.gov/vuln/detail/${cve}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs px-2 py-1 rounded bg-secondary border border-border text-primary hover:underline"
                  >
                    {cve}
                  </a>
                ))}
              </div>
            </Card>
          )}
        </TabsContent>

        {/* Threat context tab */}
        <TabsContent value="threat" className="mt-4 space-y-4">
          <Card title="Threat Overview">
            <Row label="CISA KEV" value={report.threat_context.cisa_kev ? '✓ Yes — confirmed exploited' : 'No'} />
            <Row label="Active Exploitation" value={report.threat_context.active_exploitation ? '✓ Confirmed' : 'Not confirmed'} />
            <Row label="Ransomware Linked" value={report.threat_context.ransomware_linked ? '✓ Yes' : 'No'} />
          </Card>

          {report.threat_context.threat_actors && report.threat_context.threat_actors.length > 0 && (
            <Card title="Threat Actors">
              <div className="space-y-3">
                {report.threat_context.threat_actors.map((actor, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-background border border-border">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground">{actor.name}</p>
                      <div className="flex gap-2 mt-1">
                        <span className="text-xs px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{actor.type.replace(/_/g, ' ')}</span>
                        {actor.motivation && (
                          <span className="text-xs text-muted-foreground">{actor.motivation}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {report.threat_context.targeted_sectors && report.threat_context.targeted_sectors.length > 0 && (
            <Card title="Targeted Sectors">
              <div className="flex flex-wrap gap-2">
                {report.threat_context.targeted_sectors.map(s => (
                  <span key={s} className="text-xs px-2.5 py-1 rounded-full bg-secondary border border-border text-foreground">{s}</span>
                ))}
              </div>
            </Card>
          )}

          {report.threat_context.targeted_regions && report.threat_context.targeted_regions.length > 0 && (
            <Card title="Targeted Regions">
              <div className="flex flex-wrap gap-2">
                {report.threat_context.targeted_regions.map(r => (
                  <span key={r} className="text-xs px-2.5 py-1 rounded-full bg-secondary border border-border text-foreground">{r}</span>
                ))}
              </div>
            </Card>
          )}
        </TabsContent>

        {/* Technical tab */}
        <TabsContent value="technical" className="mt-4 space-y-4">
          <Card title="Attack Surface">
            <p className="text-sm text-foreground leading-relaxed">{report.technical_analysis.attack_surface}</p>
          </Card>

          <Card title="Attack Scenario">
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{report.technical_analysis.attack_scenario}</p>
          </Card>

          <Card title="Prerequisites">
            <List items={report.technical_analysis.prerequisites} />
          </Card>

          {report.technical_analysis.post_exploitation && report.technical_analysis.post_exploitation.length > 0 && (
            <Card title="Post-Exploitation Capabilities">
              <List items={report.technical_analysis.post_exploitation} />
            </Card>
          )}

          {report.technical_analysis.lateral_movement && (
            <Card title="Lateral Movement">
              <p className="text-sm text-foreground leading-relaxed">{report.technical_analysis.lateral_movement}</p>
            </Card>
          )}
        </TabsContent>

        {/* MITRE ATT&CK tab */}
        <TabsContent value="mitre" className="mt-4 space-y-4">
          <Card title="Tactics">
            <div className="flex flex-wrap gap-2">
              {report.mitre_attack.tactics.map(t => (
                <a
                  key={t.id}
                  href={`https://attack.mitre.org/tactics/${t.id}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary border border-border text-sm hover:border-primary transition-colors"
                >
                  <span className="font-mono text-xs text-primary font-bold">{t.id}</span>
                  <span className="text-foreground">{t.name}</span>
                </a>
              ))}
            </div>
          </Card>

          <Card title="Techniques">
            <div className="space-y-2">
              {report.mitre_attack.techniques.map(t => (
                <a
                  key={t.id}
                  href={`https://attack.mitre.org/techniques/${t.id.replace('.', '/')}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 p-3 rounded-lg bg-background border border-border hover:border-primary transition-colors"
                >
                  <span className="font-mono text-xs text-primary font-bold shrink-0 pt-0.5">{t.id}</span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{t.name}</p>
                    {t.sub_technique && (
                      <p className="text-xs text-muted-foreground mt-0.5">{t.sub_technique}</p>
                    )}
                  </div>
                </a>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* Impact tab */}
        <TabsContent value="impact" className="mt-4 space-y-4">
          <Card title="CIA Triad Impact">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Confidentiality', level: report.impact_assessment.confidentiality },
                { label: 'Integrity',       level: report.impact_assessment.integrity },
                { label: 'Availability',    level: report.impact_assessment.availability },
              ].map(({ label, level }) => (
                <div key={label} className="rounded-lg border border-border bg-background p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-2">{label}</p>
                  <ImpactDot level={level} />
                  <p className="text-sm font-bold text-foreground mt-1.5">{level}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Business Impact">
            <p className="text-sm text-foreground leading-relaxed">{report.impact_assessment.business_impact}</p>
          </Card>

          {report.impact_assessment.estimated_affected_systems && (
            <Card title="Estimated Affected Systems">
              <p className="text-sm text-foreground">{report.impact_assessment.estimated_affected_systems}</p>
            </Card>
          )}
        </TabsContent>

        {/* IOCs tab */}
        <TabsContent value="iocs" className="mt-4 space-y-4">
          {Object.entries(report.iocs).map(([type, values]) => {
            if (!values || (values as string[]).length === 0) return null
            return (
              <Card key={type} title={type.replace(/_/g, ' ').toUpperCase()}>
                <div className="space-y-1">
                  {(values as string[]).map((ioc, i) => (
                    <p key={i} className="font-mono text-xs px-3 py-1.5 rounded bg-background border border-border text-foreground break-all">
                      {ioc}
                    </p>
                  ))}
                </div>
              </Card>
            )
          })}
          {Object.values(report.iocs).every(v => !v || (v as string[]).length === 0) && (
            <div className="rounded-xl border border-border bg-card p-8 text-center">
              <p className="text-sm text-muted-foreground">No confirmed IOCs identified for this vulnerability.</p>
            </div>
          )}
        </TabsContent>

        {/* Remediation tab */}
        <TabsContent value="remediation" className="mt-4 space-y-4">
          <Card title="Priority Actions">
            <List items={report.remediation.priority_actions} />
          </Card>

          <Card title="Timeline Recommendation">
            <p className="text-sm text-foreground leading-relaxed">{report.remediation.timeline_recommendation}</p>
          </Card>

          {report.remediation.patches && report.remediation.patches.length > 0 && (
            <Card title="Available Patches">
              <div className="space-y-2">
                {report.remediation.patches.map((patch, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-background border border-border">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground">{patch.vendor}</p>
                      <p className="text-xs text-muted-foreground">Version: {patch.version}</p>
                    </div>
                    {patch.url && (
                      <a
                        href={patch.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline shrink-0"
                      >
                        View patch →
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {report.remediation.workarounds && report.remediation.workarounds.length > 0 && (
            <Card title="Workarounds">
              <List items={report.remediation.workarounds} />
            </Card>
          )}
        </TabsContent>

        {/* Detection tab */}
        <TabsContent value="detection" className="mt-4 space-y-4">
          {report.detection.detection_queries && report.detection.detection_queries.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Detection Queries</h3>
              {report.detection.detection_queries.map((q, i) => (
                <CodeBlock key={i} platform={q.platform} query={q.query} description={q.description} />
              ))}
            </div>
          )}

          {report.detection.threat_hunting && report.detection.threat_hunting.length > 0 && (
            <Card title="Threat Hunting Recommendations">
              <List items={report.detection.threat_hunting} />
            </Card>
          )}

          {report.detection.log_sources && report.detection.log_sources.length > 0 && (
            <Card title="Required Log Sources">
              <div className="flex flex-wrap gap-2">
                {report.detection.log_sources.map(src => (
                  <span key={src} className="text-xs px-2.5 py-1 rounded-full bg-secondary border border-border text-foreground font-mono">{src}</span>
                ))}
              </div>
            </Card>
          )}
        </TabsContent>

        {/* References tab */}
        {report.references && report.references.length > 0 && (
          <TabsContent value="references" className="mt-4">
            <Card title="References">
              <div className="space-y-2">
                {report.references.map((ref, i) => (
                  <a
                    key={i}
                    href={ref.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-3 p-3 rounded-lg bg-background border border-border hover:border-primary transition-colors"
                  >
                    <span className="text-xs px-1.5 py-0.5 rounded bg-secondary border border-border text-muted-foreground shrink-0 font-mono">{ref.type}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{ref.title}</p>
                      <p className="text-xs text-primary truncate mt-0.5">{ref.url}</p>
                    </div>
                  </a>
                ))}
              </div>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Analyst assessment */}
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Analyst Assessment</p>
        <p className="text-sm text-foreground leading-relaxed">{report.analyst_assessment}</p>
      </div>
    </div>
  )
}
