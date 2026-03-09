import type { ThreatIntelReport } from '@/app/api/threat-intel/route'

// ─── HTML Report Builder ─────────────────────────────────────────────────────

export function buildReportHtml(report: ThreatIntelReport, siteUrl = 'https://www.secforit.ro'): string {
  const severityColor: Record<string, string> = {
    CRITICAL: '#dc2626', HIGH: '#ea580c', MEDIUM: '#d97706', LOW: '#2563eb',
  }
  const sevColor = severityColor[report.classification.severity] ?? '#71717a'

  const tlpBg: Record<string, string> = { WHITE: '#ffffff', GREEN: '#16a34a', AMBER: '#d97706', RED: '#dc2626' }
  const tlpColor: Record<string, string> = { WHITE: '#000000', GREEN: '#ffffff', AMBER: '#000000', RED: '#ffffff' }

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

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>[CTI] ${report.vulnerability.cve_id} — ${report.vulnerability.title}</title>
</head>
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
        ${report.threat_context.ransomware_association ? '<span style="background:#fef2f2;border:1px solid #fecaca;border-radius:20px;font-size:11px;color:#dc2626;font-weight:600;padding:3px 10px;">Ransomware</span>' : ''}
      </div>
    </td>
  </tr>

  <!-- Body -->
  <tr>
    <td style="background:#fff;padding:0 32px 32px;border-left:1px solid #e4e4e7;border-right:1px solid #e4e4e7;">

      ${sectionHeader('Executive Summary')}
      <p style="margin:0 0 16px;font-size:14px;color:#3f3f46;line-height:1.7;">${report.executive_summary}</p>

      ${sectionHeader('Exploitation Status')}
      <div style="background:${report.threat_context.exploitation_status === 'Actively Exploited in the Wild' ? '#fef2f2' : report.threat_context.exploitation_status === 'Proof-of-Concept Available' ? '#fff7ed' : '#f0fdf4'};border:1px solid ${report.threat_context.exploitation_status === 'Actively Exploited in the Wild' ? '#fecaca' : report.threat_context.exploitation_status === 'Proof-of-Concept Available' ? '#fed7aa' : '#bbf7d0'};border-radius:6px;padding:12px 16px;margin-bottom:12px;">
        <p style="margin:0;font-size:13px;font-weight:700;color:${report.threat_context.exploitation_status === 'Actively Exploited in the Wild' ? '#dc2626' : report.threat_context.exploitation_status === 'Proof-of-Concept Available' ? '#ea580c' : '#16a34a'};">${report.threat_context.exploitation_status}</p>
        <p style="margin:6px 0 0;font-size:13px;color:#3f3f46;line-height:1.6;">${report.threat_context.exploitation_description}</p>
      </div>

      ${report.threat_context.cisa_kev.in_catalog ? `
      ${sectionHeader('CISA KEV Catalog')}
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;border:1px solid #e4e4e7;border-radius:6px;margin-bottom:16px;">
        ${infoRow('Date Added', report.threat_context.cisa_kev.date_added)}
        ${infoRow('Remediation Due', `<span style="color:#dc2626;font-weight:600;">${report.threat_context.cisa_kev.remediation_due}</span>`)}
        ${report.threat_context.cisa_kev.directive ? infoRow('Directive', report.threat_context.cisa_kev.directive) : ''}
      </table>` : ''}

      ${sectionHeader('Vulnerability Details')}
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;border:1px solid #e4e4e7;border-radius:6px;margin-bottom:16px;">
        ${infoRow('CWE', `<span style="font-family:monospace;">${report.vulnerability.cwe_id}</span> — ${report.vulnerability.cwe_name}`)}
        ${infoRow('Advisory', report.vulnerability.vendor_advisory_id)}
        ${infoRow('Patch Date', report.vulnerability.patch_release_date)}
        ${infoRow('Affected', report.vulnerability.affected_versions.map(v => `<span style="background:#fef2f2;color:#dc2626;font-family:monospace;font-size:11px;padding:2px 6px;border-radius:3px;margin-right:4px;">${v}</span>`).join(''))}
        ${infoRow('Fixed', report.vulnerability.fixed_versions.map(v => `<span style="background:#f0fdf4;color:#16a34a;font-family:monospace;font-size:11px;padding:2px 6px;border-radius:3px;margin-right:4px;">${v}</span>`).join(''))}
      </table>
      <p style="margin:0 0 16px;font-size:13px;color:#3f3f46;line-height:1.7;">${report.vulnerability.cwe_explanation}</p>

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

      ${sectionHeader('Remediation')}
      <div style="background:${report.remediation.urgency.startsWith('Immediate') ? '#fef2f2' : report.remediation.urgency.startsWith('Urgent') ? '#fff7ed' : '#fffbeb'};border:1px solid ${report.remediation.urgency.startsWith('Immediate') ? '#fecaca' : report.remediation.urgency.startsWith('Urgent') ? '#fed7aa' : '#fde68a'};border-radius:6px;padding:12px 16px;margin-bottom:14px;">
        <p style="margin:0;font-size:13px;font-weight:700;color:${report.remediation.urgency.startsWith('Immediate') ? '#dc2626' : '#d97706'};">${report.remediation.urgency}</p>
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

      ${sectionHeader('Senior Analyst Assessment')}
      <div style="background:#fafafa;border-left:3px solid #dc2626;border-radius:0 6px 6px 0;padding:16px 20px;margin-bottom:16px;">
        <p style="margin:0;font-size:13px;color:#3f3f46;line-height:1.8;white-space:pre-line;">${report.analyst_assessment}</p>
      </div>

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
        &copy; ${new Date().getFullYear()} SECFORIT &middot; Romania, EU &middot;
        <a href="https://www.secforit.ro/privacy-policy" style="color:#a1a1aa;">Privacy Policy</a>
      </p>
      <p style="margin:6px 0 0;color:#a1a1aa;font-size:11px;">
        This report was generated by SECFORIT Threat Intelligence. Handle according to TLP:${report.classification.tlp} guidelines.
      </p>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`
}

// ─── Plain Text Builder ──────────────────────────────────────────────────────

export function buildReportPlainText(report: ThreatIntelReport): string {
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
