'use client'

import type { ThreatIntelReport } from '@/app/api/threat-intel/route'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Shield, AlertTriangle, Target, Zap, Eye, Wrench,
  ExternalLink, ChevronRight, AlertCircle, Flame,
  BookOpen, Code2, FileWarning, Activity,
} from 'lucide-react'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function tlpBadge(tlp: string) {
  const map: Record<string, string> = {
    WHITE: 'bg-white text-black border border-zinc-300',
    GREEN: 'bg-green-600 text-white',
    AMBER: 'bg-amber-500 text-black',
    RED: 'bg-red-600 text-white',
  }
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded ${map[tlp] ?? 'bg-zinc-500 text-white'}`}>
      TLP:{tlp}
    </span>
  )
}

function severityBadge(s: string) {
  const map: Record<string, string> = {
    CRITICAL: 'bg-red-600 text-white',
    HIGH: 'bg-orange-500 text-white',
    MEDIUM: 'bg-yellow-500 text-black',
    LOW: 'bg-blue-500 text-white',
  }
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded ${map[s] ?? 'bg-zinc-500 text-white'}`}>{s}</span>
  )
}

function impactBadge(v: string) {
  if (v === 'High') return <span className="text-xs font-semibold text-red-500">High</span>
  if (v === 'Medium') return <span className="text-xs font-semibold text-yellow-500">Medium</span>
  if (v === 'Low') return <span className="text-xs font-semibold text-blue-500">Low</span>
  return <span className="text-xs font-semibold text-zinc-400">None</span>
}

function confidenceBadge(c: string) {
  const map: Record<string, string> = {
    High: 'bg-green-100 text-green-700 border border-green-300 dark:bg-green-900/30 dark:text-green-400',
    Medium: 'bg-yellow-100 text-yellow-700 border border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400',
    Low: 'bg-zinc-100 text-zinc-600 border border-zinc-300 dark:bg-zinc-800 dark:text-zinc-400',
  }
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${map[c] ?? ''}`}>
      {c} confidence
    </span>
  )
}

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-border flex items-center gap-2">
        <span className="text-primary">{icon}</span>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-border last:border-0">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide min-w-36 mt-0.5">{label}</span>
      <span className="text-sm text-foreground flex-1">{value}</span>
    </div>
  )
}

function List({ items }: { items: string[] }) {
  if (!items.length) return <p className="text-xs text-muted-foreground italic">None identified</p>
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-sm text-foreground">
          <ChevronRight className="size-3.5 text-primary shrink-0 mt-0.5" />
          {item}
        </li>
      ))}
    </ul>
  )
}

function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="bg-zinc-950 text-green-400 text-xs rounded-lg p-4 overflow-x-auto whitespace-pre-wrap font-mono border border-zinc-800">
      {code}
    </pre>
  )
}

// ─── Score Bar ────────────────────────────────────────────────────────────────

function CvssBar({ score }: { score: number }) {
  const pct = (score / 10) * 100
  const color = score >= 9 ? 'bg-red-600' : score >= 7 ? 'bg-orange-500' : score >= 4 ? 'bg-yellow-500' : 'bg-blue-500'
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2.5 bg-secondary rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-lg font-bold ${score >= 9 ? 'text-red-500' : score >= 7 ? 'text-orange-500' : score >= 4 ? 'text-yellow-500' : 'text-blue-500'}`}>
        {score.toFixed(1)}
      </span>
    </div>
  )
}

// ─── Main Report ──────────────────────────────────────────────────────────────

export function ThreatIntelReport({ report }: { report: ThreatIntelReport }) {
  const { classification, vulnerability, threat_context, technical_analysis,
    mitre_attack, impact_assessment, iocs, remediation, detection, references,
    executive_summary, analyst_assessment } = report

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div className="flex flex-wrap items-center gap-2">
            {tlpBadge(classification.tlp)}
            {severityBadge(classification.severity)}
            {confidenceBadge(classification.confidence)}
            {threat_context.ransomware_association && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-red-100 text-red-700 border border-red-200 dark:bg-red-950 dark:text-red-400">
                <Flame className="size-3" /> Ransomware
              </span>
            )}
          </div>
          <span className="text-xs text-muted-foreground">{classification.report_date}</span>
        </div>
        <h1 className="text-xl font-bold text-foreground mb-1">
          <span className="text-primary font-mono">{vulnerability.cve_id}</span>
          {' — '}{vulnerability.title}
        </h1>
        <p className="text-sm text-muted-foreground mb-4">
          {vulnerability.vendor} · {vulnerability.product}
        </p>
        <CvssBar score={vulnerability.cvss_score} />
        <p className="text-xs text-muted-foreground mt-1 font-mono">{vulnerability.cvss_vector}</p>
      </div>

      {/* ── Executive Summary ── */}
      <Card title="Executive Summary" icon={<BookOpen className="size-4" />}>
        <p className="text-sm text-foreground leading-relaxed">{executive_summary}</p>
      </Card>

      {/* ── Tabs ── */}
      <Tabs defaultValue="vuln">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-card border border-border p-1 rounded-xl">
          {[
            ['vuln', 'Vulnerability'],
            ['threat', 'Threat Context'],
            ['technical', 'Technical'],
            ['mitre', 'MITRE ATT&CK'],
            ['impact', 'Impact'],
            ['iocs', 'IOCs'],
            ['remediation', 'Remediation'],
            ['detection', 'Detection'],
            ['refs', 'References'],
          ].map(([val, label]) => (
            <TabsTrigger key={val} value={val} className="text-xs px-3 py-1.5 rounded-lg">
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ── Vulnerability Tab ── */}
        <TabsContent value="vuln" className="mt-4 space-y-4">
          <Card title="Vulnerability Details" icon={<AlertCircle className="size-4" />}>
            <Row label="CVE ID" value={<span className="font-mono font-bold text-primary">{vulnerability.cve_id}</span>} />
            <Row label="Advisory" value={vulnerability.vendor_advisory_id} />
            <Row label="Patch Date" value={vulnerability.patch_release_date} />
            <Row label="CWE" value={<span className="font-mono">{vulnerability.cwe_id} — {vulnerability.cwe_name}</span>} />
            <Row label="Affected Versions" value={
              <div className="flex flex-wrap gap-1">
                {vulnerability.affected_versions.map(v => (
                  <span key={v} className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded font-mono dark:bg-red-950 dark:text-red-400">{v}</span>
                ))}
              </div>
            } />
            <Row label="Fixed Versions" value={
              <div className="flex flex-wrap gap-1">
                {vulnerability.fixed_versions.map(v => (
                  <span key={v} className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded font-mono dark:bg-green-950 dark:text-green-400">{v}</span>
                ))}
              </div>
            } />
          </Card>
          <Card title="CWE Explanation" icon={<FileWarning className="size-4" />}>
            <p className="text-sm text-foreground leading-relaxed">{vulnerability.cwe_explanation}</p>
          </Card>
          <Card title="CVSS v3.1 Breakdown" icon={<Activity className="size-4" />}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {Object.entries(vulnerability.cvss_breakdown).map(([key, val]) => (
                <div key={key} className="bg-background border border-border rounded-lg px-3 py-2">
                  <p className="text-xs text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</p>
                  <p className="text-xs font-semibold text-foreground capitalize">{val}</p>
                </div>
              ))}
            </div>
          </Card>
          {vulnerability.related_cves.length > 0 && (
            <Card title="Related CVEs" icon={<AlertTriangle className="size-4" />}>
              <div className="space-y-2">
                {vulnerability.related_cves.map(c => (
                  <div key={c.cve_id} className="flex items-start gap-3 p-3 rounded-lg bg-background border border-border">
                    <span className="font-mono text-sm font-bold text-primary">{c.cve_id}</span>
                    <span className="text-sm text-muted-foreground flex-1">{c.description}</span>
                    <span className="text-xs font-bold text-orange-500">{c.cvss_score.toFixed(1)}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </TabsContent>

        {/* ── Threat Context Tab ── */}
        <TabsContent value="threat" className="mt-4 space-y-4">
          <Card title="Exploitation Status" icon={<Zap className="size-4" />}>
            <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg font-semibold text-sm mb-4 ${
              threat_context.exploitation_status === 'Actively Exploited in the Wild'
                ? 'bg-red-100 text-red-700 border border-red-200 dark:bg-red-950 dark:text-red-400'
                : threat_context.exploitation_status === 'Proof-of-Concept Available'
                ? 'bg-orange-100 text-orange-700 border border-orange-200 dark:bg-orange-950 dark:text-orange-400'
                : 'bg-green-100 text-green-700 border border-green-200 dark:bg-green-950 dark:text-green-400'
            }`}>
              {threat_context.exploitation_status === 'Actively Exploited in the Wild' && <AlertTriangle className="size-4" />}
              {threat_context.exploitation_status}
            </div>
            <p className="text-sm text-foreground leading-relaxed mb-3">{threat_context.exploitation_description}</p>
            {threat_context.exploitation_confirmed_by.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {threat_context.exploitation_confirmed_by.map(s => (
                  <span key={s} className="text-xs px-2 py-0.5 bg-secondary border border-border rounded-full">{s}</span>
                ))}
              </div>
            )}
          </Card>

          <Card title="CISA KEV Catalog" icon={<Shield className="size-4" />}>
            <div className="flex items-center gap-2 mb-3">
              <span className={`size-2.5 rounded-full ${threat_context.cisa_kev.in_catalog ? 'bg-red-500' : 'bg-zinc-400'}`} />
              <span className="text-sm font-semibold">{threat_context.cisa_kev.in_catalog ? 'Listed in KEV Catalog' : 'Not in KEV Catalog'}</span>
            </div>
            {threat_context.cisa_kev.in_catalog && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-background border border-border rounded-lg px-3 py-2">
                  <p className="text-muted-foreground">Date Added</p>
                  <p className="font-semibold">{threat_context.cisa_kev.date_added}</p>
                </div>
                <div className="bg-background border border-border rounded-lg px-3 py-2">
                  <p className="text-muted-foreground">Remediation Due</p>
                  <p className="font-semibold text-red-500">{threat_context.cisa_kev.remediation_due}</p>
                </div>
                {threat_context.cisa_kev.directive && (
                  <div className="col-span-2 bg-background border border-border rounded-lg px-3 py-2">
                    <p className="text-muted-foreground">Directive</p>
                    <p className="font-semibold">{threat_context.cisa_kev.directive}</p>
                  </div>
                )}
              </div>
            )}
          </Card>

          {threat_context.threat_actors.length > 0 && (
            <Card title="Threat Actor Attribution" icon={<Target className="size-4" />}>
              <div className="space-y-3">
                {threat_context.threat_actors.map((a, i) => (
                  <div key={i} className="p-4 rounded-lg bg-background border border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-sm">{a.name}</span>
                      <span className="text-xs px-2 py-0.5 bg-secondary border border-border rounded-full">{a.category}</span>
                      {confidenceBadge(a.confidence)}
                    </div>
                    <p className="text-sm text-muted-foreground">{a.notes}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {threat_context.ransomware_association && (
            <Card title="Ransomware Association" icon={<Flame className="size-4" />}>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 border border-red-200 dark:bg-red-950/30 dark:border-red-800">
                <Flame className="size-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-foreground">{threat_context.ransomware_notes}</p>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* ── Technical Tab ── */}
        <TabsContent value="technical" className="mt-4 space-y-4">
          <Card title="Technical Analysis" icon={<Code2 className="size-4" />}>
            <Row label="Vuln. Class" value={<span className="font-semibold">{technical_analysis.vulnerability_class}</span>} />
            <Row label="Component" value={technical_analysis.affected_component} />
            <Row label="Complexity" value={technical_analysis.exploit_complexity} />
          </Card>
          <Card title="Root Cause" icon={<AlertTriangle className="size-4" />}>
            <p className="text-sm text-foreground leading-relaxed">{technical_analysis.root_cause}</p>
          </Card>
          <Card title="Attack Prerequisites" icon={<Target className="size-4" />}>
            <List items={technical_analysis.attack_prerequisites} />
          </Card>
          <Card title="Exploitation Mechanics" icon={<Zap className="size-4" />}>
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{technical_analysis.exploitation_mechanics}</p>
          </Card>
          <Card title="Post-Exploitation Impact" icon={<AlertTriangle className="size-4" />}>
            <Row label="Immediate Impact" value={technical_analysis.post_exploitation.immediate_impact} />
            <Row label="Lateral Movement" value={technical_analysis.post_exploitation.lateral_movement} />
            <Row label="Persistence" value={technical_analysis.post_exploitation.persistence} />
            <Row label="Data at Risk" value={
              <div className="flex flex-wrap gap-1">
                {technical_analysis.post_exploitation.data_at_risk.map(d => (
                  <span key={d} className="text-xs px-2 py-0.5 bg-secondary border border-border rounded-full">{d}</span>
                ))}
              </div>
            } />
          </Card>
          <Card title="Complete Attack Scenario" icon={<BookOpen className="size-4" />}>
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{technical_analysis.attack_scenario}</p>
          </Card>
        </TabsContent>

        {/* ── MITRE Tab ── */}
        <TabsContent value="mitre" className="mt-4 space-y-4">
          <Card title="Tactics" icon={<Target className="size-4" />}>
            <div className="flex flex-wrap gap-2">
              {mitre_attack.tactics.map(t => (
                <a
                  key={t.id}
                  href={`https://attack.mitre.org/tactics/${t.id}/`}
                  target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-lg hover:bg-primary/20 transition-colors"
                >
                  {t.id} · {t.name}
                  <ExternalLink className="size-2.5" />
                </a>
              ))}
            </div>
          </Card>
          <Card title="Techniques & Sub-techniques" icon={<Activity className="size-4" />}>
            <div className="space-y-3">
              {mitre_attack.techniques.map(t => (
                <div key={t.id} className="p-4 rounded-lg bg-background border border-border">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <a
                      href={`https://attack.mitre.org/techniques/${t.id.replace('.', '/')}/`}
                      target="_blank" rel="noopener noreferrer"
                      className="font-mono text-sm font-bold text-primary hover:underline flex items-center gap-1"
                    >
                      {t.id} <ExternalLink className="size-3" />
                    </a>
                    <span className="text-sm font-semibold text-foreground">{t.name}</span>
                    <span className="text-xs px-2 py-0.5 bg-secondary border border-border rounded-full text-muted-foreground">{t.tactic}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{t.relevance}</p>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* ── Impact Tab ── */}
        <TabsContent value="impact" className="mt-4 space-y-4">
          <Card title="CIA Triad Impact" icon={<Shield className="size-4" />}>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                ['Confidentiality', impact_assessment.confidentiality_impact],
                ['Integrity', impact_assessment.integrity_impact],
                ['Availability', impact_assessment.availability_impact],
              ].map(([label, val]) => (
                <div key={label} className="bg-background border border-border rounded-xl p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">{label}</p>
                  {impactBadge(val)}
                </div>
              ))}
            </div>
            <p className="text-sm text-foreground leading-relaxed">{impact_assessment.business_impact}</p>
          </Card>
          <Card title="Risk Factors" icon={<AlertTriangle className="size-4" />}>
            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Affected Environments</p>
                <div className="flex flex-wrap gap-1">
                  {impact_assessment.affected_environments.map(e => (
                    <span key={e} className="text-xs px-2 py-0.5 bg-secondary border border-border rounded-full">{e}</span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Risk Multipliers</p>
                <List items={impact_assessment.risk_multipliers} />
              </div>
            </div>
          </Card>
          <Card title="Strategic Significance" icon={<Target className="size-4" />}>
            <p className="text-sm text-foreground leading-relaxed">{impact_assessment.strategic_significance}</p>
          </Card>
        </TabsContent>

        {/* ── IOCs Tab ── */}
        <TabsContent value="iocs" className="mt-4 space-y-4">
          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 text-sm text-amber-800 dark:text-amber-300">
            <p className="font-semibold mb-1">IOC Availability Note</p>
            <p>{iocs.availability_note}</p>
          </div>
          {[
            ['File Hashes', iocs.file_hashes],
            ['IP Addresses', iocs.ip_addresses],
            ['Domains', iocs.domains],
            ['File Paths', iocs.file_paths],
            ['Commands', iocs.commands],
            ['Network Signatures', iocs.network_signatures],
          ].map(([label, items]) => (
            items.length > 0 && (
              <Card key={String(label)} title={String(label)} icon={<Code2 className="size-4" />}>
                <div className="space-y-1">
                  {(items as string[]).map((item, i) => (
                    <div key={i} className="font-mono text-xs bg-background border border-border rounded p-2 break-all">{item}</div>
                  ))}
                </div>
              </Card>
            )
          ))}
          {iocs.yara_rules.length > 0 && (
            <Card title="YARA Rules" icon={<Code2 className="size-4" />}>
              {iocs.yara_rules.map((rule, i) => <CodeBlock key={i} code={rule} />)}
            </Card>
          )}
        </TabsContent>

        {/* ── Remediation Tab ── */}
        <TabsContent value="remediation" className="mt-4 space-y-4">
          <div className={`p-4 rounded-xl border font-semibold text-sm flex items-center gap-2 ${
            remediation.urgency.startsWith('Immediate')
              ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-950/20 dark:border-red-800 dark:text-red-400'
              : remediation.urgency.startsWith('Urgent')
              ? 'bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-950/20 dark:border-orange-800 dark:text-orange-400'
              : 'bg-yellow-50 border-yellow-200 text-yellow-700 dark:bg-yellow-950/20 dark:border-yellow-800 dark:text-yellow-400'
          }`}>
            <AlertTriangle className="size-4 shrink-0" />
            <span>Urgency: {remediation.urgency}</span>
            <span className="font-normal ml-1">— {remediation.urgency_rationale}</span>
          </div>

          <Card title="Priority Actions" icon={<Zap className="size-4" />}>
            <ol className="space-y-2">
              {remediation.priority_actions.map((a, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="size-5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                  <span className="text-sm text-foreground">{a}</span>
                </li>
              ))}
            </ol>
          </Card>

          <Card title="Available Patches" icon={<Wrench className="size-4" />}>
            <div className="space-y-3">
              {remediation.patches.map((p, i) => (
                <div key={i} className="p-4 rounded-lg bg-background border border-border">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-sm font-semibold">{p.product}</span>
                    <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded font-mono dark:bg-green-950 dark:text-green-400">{p.fixed_version}</span>
                    {p.kb_article !== 'N/A' && (
                      <span className="text-xs px-2 py-0.5 bg-secondary border border-border rounded font-mono">{p.kb_article}</span>
                    )}
                  </div>
                  {p.notes && <p className="text-xs text-muted-foreground">{p.notes}</p>}
                </div>
              ))}
            </div>
          </Card>

          {remediation.workarounds.length > 0 && (
            <Card title="Workarounds" icon={<Wrench className="size-4" />}>
              {remediation.workarounds.map((w, i) => (
                <div key={i} className="mb-4 p-4 rounded-lg bg-background border border-border last:mb-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-semibold">{w.title}</span>
                    <span className={`text-xs px-2 py-0.5 rounded font-semibold ${
                      w.effectiveness === 'Full Mitigation' ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400'
                      : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400'
                    }`}>{w.effectiveness}</span>
                  </div>
                  <ol className="space-y-1 mb-2">
                    {w.steps.map((s, j) => (
                      <li key={j} className="flex items-start gap-2 text-sm">
                        <span className="text-muted-foreground text-xs mt-0.5">{j + 1}.</span>
                        {s}
                      </li>
                    ))}
                  </ol>
                  {w.limitations && <p className="text-xs text-muted-foreground italic">{w.limitations}</p>}
                </div>
              ))}
            </Card>
          )}

          <Card title="Hardening Measures" icon={<Shield className="size-4" />}>
            <List items={remediation.hardening_measures} />
          </Card>
        </TabsContent>

        {/* ── Detection Tab ── */}
        <TabsContent value="detection" className="mt-4 space-y-4">
          <Card title="Log Sources" icon={<Eye className="size-4" />}>
            <div className="flex flex-wrap gap-2">
              {detection.log_sources.map(s => (
                <span key={s} className="text-xs px-2 py-1 bg-secondary border border-border rounded font-mono">{s}</span>
              ))}
            </div>
          </Card>
          <Card title="Behavioral Indicators" icon={<Activity className="size-4" />}>
            <List items={detection.behavioral_indicators} />
          </Card>
          {detection.detection_queries.length > 0 && (
            <Card title="Detection Queries" icon={<Code2 className="size-4" />}>
              <div className="space-y-4">
                {detection.detection_queries.map((q, i) => (
                  <div key={i}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded">{q.platform}</span>
                      <span className="text-sm text-muted-foreground">{q.description}</span>
                    </div>
                    <CodeBlock code={q.query} />
                  </div>
                ))}
              </div>
            </Card>
          )}
          <Card title="EDR Coverage Gap" icon={<AlertTriangle className="size-4" />}>
            <p className="text-sm text-foreground leading-relaxed">{detection.edr_gap}</p>
          </Card>
          <Card title="Threat Hunting" icon={<Target className="size-4" />}>
            <List items={detection.threat_hunting} />
          </Card>
          <Card title="Monitoring Recommendations" icon={<Eye className="size-4" />}>
            <List items={detection.monitoring_recommendations} />
          </Card>
        </TabsContent>

        {/* ── References Tab ── */}
        <TabsContent value="refs" className="mt-4 space-y-2">
          {references.map((ref, i) => (
            <div key={i} className="flex items-start gap-3 p-4 rounded-xl border border-border bg-card">
              <span className="text-xs px-2 py-0.5 bg-secondary border border-border rounded shrink-0 mt-0.5">{ref.type}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{ref.title}</p>
                <p className="text-xs text-muted-foreground">{ref.source}</p>
              </div>
              {ref.url !== 'Not publicly available' && ref.url && (
                <a href={ref.url} target="_blank" rel="noopener noreferrer"
                  className="text-primary hover:underline shrink-0">
                  <ExternalLink className="size-4" />
                </a>
              )}
            </div>
          ))}
        </TabsContent>
      </Tabs>

      {/* ── Analyst Assessment ── */}
      <Card title="Senior Analyst Assessment" icon={<Shield className="size-4" />}>
        <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{analyst_assessment}</p>
      </Card>
    </div>
  )
}
