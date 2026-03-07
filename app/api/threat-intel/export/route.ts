import { NextRequest, NextResponse } from 'next/server'
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, BorderStyle, Table, TableRow, TableCell,
  WidthType, ShadingType, Header, ImageRun,
} from 'docx'
import type { ThreatIntelReport } from '@/app/api/threat-intel/route'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function tlpColor(tlp: string): string {
  return { WHITE: 'FFFFFF', GREEN: '2d7a2d', AMBER: 'c47a00', RED: 'c0392b' }[tlp] ?? '333333'
}

function severityColor(severity: string): string {
  return { CRITICAL: 'c0392b', HIGH: 'd35400', MEDIUM: 'e67e22', LOW: '2980b9', INFORMATIONAL: '7f8c8d' }[severity] ?? '7f8c8d'
}

function heading1(text: string) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 200 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: '1a1a2e', space: 4 } },
  })
}

function heading2(text: string) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 150 },
  })
}

function body(text: string, opts: { bold?: boolean; color?: string } = {}) {
  return new Paragraph({
    children: [new TextRun({ text, bold: opts.bold, color: opts.color, size: 22 })],
    spacing: { before: 80, after: 80 },
  })
}

function bullet(text: string) {
  return new Paragraph({
    text,
    bullet: { level: 0 },
    spacing: { before: 60, after: 60 },
  })
}

function labelValue(label: string, value: string) {
  return new Paragraph({
    children: [
      new TextRun({ text: `${label}: `, bold: true, size: 22 }),
      new TextRun({ text: value, size: 22 }),
    ],
    spacing: { before: 80, after: 80 },
  })
}

function colorBadge(text: string, hex: string) {
  return new Paragraph({
    children: [
      new TextRun({
        text: `  ${text}  `,
        bold: true,
        color: 'FFFFFF',
        size: 20,
        shading: { type: ShadingType.SOLID, fill: hex },
      }),
    ],
    spacing: { before: 100, after: 100 },
  })
}

function emptyLine() {
  return new Paragraph({ text: '', spacing: { before: 60, after: 60 } })
}

function codeBlock(text: string) {
  return new Paragraph({
    children: [new TextRun({ text, font: 'Courier New', size: 18, color: '1a1a2e' })],
    shading: { type: ShadingType.SOLID, fill: 'f4f4f4' },
    border: {
      top: { style: BorderStyle.SINGLE, size: 2, color: 'cccccc' },
      bottom: { style: BorderStyle.SINGLE, size: 2, color: 'cccccc' },
      left: { style: BorderStyle.SINGLE, size: 2, color: 'cccccc' },
      right: { style: BorderStyle.SINGLE, size: 2, color: 'cccccc' },
    },
    spacing: { before: 100, after: 100 },
    indent: { left: 200, right: 200 },
  })
}

function twoColTable(rows: [string, string][]) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(([label, value]) =>
      new TableRow({
        children: [
          new TableCell({
            width: { size: 35, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 20 })] })],
            shading: { type: ShadingType.SOLID, fill: 'f0f0f0' },
          }),
          new TableCell({
            width: { size: 65, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ children: [new TextRun({ text: value, size: 20 })] })],
          }),
        ],
      })
    ),
  })
}

// ─── Document builder ─────────────────────────────────────────────────────────

function buildDocument(report: ThreatIntelReport): Document {
  const sections: (Paragraph | Table)[] = []

  // ── Cover ──
  sections.push(
    new Paragraph({
      children: [new TextRun({ text: 'SECFORIT', bold: true, size: 48, color: '1a1a2e' })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 600, after: 200 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Threat Intelligence Report', size: 36, color: '444444' })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 200 },
    }),
    emptyLine(),
    colorBadge(`TLP:${report.classification.tlp}`, tlpColor(report.classification.tlp)),
    colorBadge(report.classification.severity, severityColor(report.classification.severity)),
    new Paragraph({
      children: [new TextRun({ text: `Confidence: ${report.classification.confidence}`, size: 22, color: '666666' })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 100, after: 100 },
    }),
  )

  if (report.vulnerability.cve_id) {
    sections.push(
      new Paragraph({
        children: [new TextRun({ text: report.vulnerability.cve_id, bold: true, size: 32, color: '1a1a2e', font: 'Courier New' })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 200, after: 100 },
      }),
    )
  }

  sections.push(
    new Paragraph({
      children: [new TextRun({ text: report.vulnerability.title, size: 24, color: '333333' })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 400 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `Generated: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`, size: 20, color: '888888' })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 800 },
    }),
    new Paragraph({ text: '', pageBreakBefore: true }),
  )

  // ── Executive Summary ──
  sections.push(
    heading1('Executive Summary'),
    body(report.executive_summary),
    emptyLine(),
    ...(report.threat_context.cisa_kev ? [body('⚠ This vulnerability is listed in the CISA Known Exploited Vulnerabilities (KEV) catalog.', { bold: true, color: 'c0392b' })] : []),
    ...(report.threat_context.ransomware_linked ? [body('⚠ Linked to active ransomware campaigns.', { bold: true, color: 'd35400' })] : []),
  )

  // ── Vulnerability Details ──
  sections.push(
    heading1('Vulnerability Details'),
    twoColTable([
      ['CVE ID', report.vulnerability.cve_id ?? '—'],
      ['Title', report.vulnerability.title],
      ['Type', report.technical_analysis.vulnerability_type],
      ['CVSS Score', report.vulnerability.cvss_score !== undefined ? `${report.vulnerability.cvss_score.toFixed(1)} — ${report.classification.severity}` : '—'],
      ['CVSS Vector', report.vulnerability.cvss_vector ?? '—'],
      ['Patch Available', report.vulnerability.patch_available ? 'Yes' : 'No'],
      ['Exploit Available', report.vulnerability.exploit_available ? 'Yes' : 'No'],
      ['Exploit Maturity', report.vulnerability.exploit_maturity?.replace(/_/g, ' ') ?? '—'],
    ]),
    emptyLine(),
    heading2('Description'),
    body(report.vulnerability.description),
    emptyLine(),
    heading2('Affected Products'),
    ...report.vulnerability.affected_products.map(bullet),
  )

  if (report.vulnerability.related_cves?.length) {
    sections.push(
      heading2('Related CVEs'),
      ...report.vulnerability.related_cves.map(bullet),
    )
  }

  // ── Threat Context ──
  sections.push(
    heading1('Threat Context'),
    twoColTable([
      ['CISA KEV', report.threat_context.cisa_kev ? 'Yes — Confirmed exploited' : 'No'],
      ['Active Exploitation', report.threat_context.active_exploitation ? 'Confirmed' : 'Not confirmed'],
      ['Ransomware Linked', report.threat_context.ransomware_linked ? 'Yes' : 'No'],
    ]),
  )

  if (report.threat_context.threat_actors?.length) {
    sections.push(
      heading2('Threat Actors'),
      ...report.threat_context.threat_actors.map(a =>
        bullet(`${a.name} (${a.type.replace(/_/g, ' ')})${a.motivation ? ` — ${a.motivation}` : ''}`)
      ),
    )
  }

  if (report.threat_context.targeted_sectors?.length) {
    sections.push(
      heading2('Targeted Sectors'),
      ...report.threat_context.targeted_sectors.map(bullet),
    )
  }

  if (report.threat_context.targeted_regions?.length) {
    sections.push(
      heading2('Targeted Regions'),
      ...report.threat_context.targeted_regions.map(bullet),
    )
  }

  // ── Technical Analysis ──
  sections.push(
    heading1('Technical Analysis'),
    heading2('Attack Surface'),
    body(report.technical_analysis.attack_surface),
    heading2('Attack Scenario'),
    body(report.technical_analysis.attack_scenario),
    heading2('Prerequisites'),
    ...report.technical_analysis.prerequisites.map(bullet),
  )

  if (report.technical_analysis.post_exploitation?.length) {
    sections.push(
      heading2('Post-Exploitation Capabilities'),
      ...report.technical_analysis.post_exploitation.map(bullet),
    )
  }

  if (report.technical_analysis.lateral_movement) {
    sections.push(
      heading2('Lateral Movement'),
      body(report.technical_analysis.lateral_movement),
    )
  }

  // ── MITRE ATT&CK ──
  sections.push(
    heading1('MITRE ATT&CK Mapping'),
    heading2('Tactics'),
    ...report.mitre_attack.tactics.map(t => bullet(`${t.id} — ${t.name}`)),
    heading2('Techniques'),
    ...report.mitre_attack.techniques.map(t =>
      bullet(`${t.id} — ${t.name}${t.sub_technique ? `: ${t.sub_technique}` : ''}`)
    ),
  )

  // ── Impact Assessment ──
  sections.push(
    heading1('Impact Assessment'),
    twoColTable([
      ['Confidentiality', report.impact_assessment.confidentiality],
      ['Integrity', report.impact_assessment.integrity],
      ['Availability', report.impact_assessment.availability],
      ...(report.impact_assessment.estimated_affected_systems ? [['Estimated Affected Systems', report.impact_assessment.estimated_affected_systems] as [string, string]] : []),
    ]),
    emptyLine(),
    heading2('Business Impact'),
    body(report.impact_assessment.business_impact),
  )

  // ── IOCs ──
  const hasIocs = Object.values(report.iocs).some(v => v && (v as string[]).length > 0)
  if (hasIocs) {
    sections.push(heading1('Indicators of Compromise (IOCs)'))
    const iocTypes: [keyof typeof report.iocs, string][] = [
      ['ips', 'IP Addresses'], ['domains', 'Domains'], ['urls', 'URLs'],
      ['hashes', 'File Hashes'], ['user_agents', 'User Agents'], ['other', 'Other'],
    ]
    for (const [key, label] of iocTypes) {
      const items = report.iocs[key] as string[] | undefined
      if (items?.length) {
        sections.push(heading2(label), ...items.map(ioc => codeBlock(ioc)))
      }
    }
  }

  // ── Remediation ──
  sections.push(
    heading1('Remediation'),
    heading2('Priority Actions'),
    ...report.remediation.priority_actions.map((a, i) => bullet(`${i + 1}. ${a}`)),
    heading2('Timeline Recommendation'),
    body(report.remediation.timeline_recommendation),
  )

  if (report.remediation.patches?.length) {
    sections.push(
      heading2('Available Patches'),
      ...report.remediation.patches.map(p =>
        bullet(`${p.vendor} ${p.version}${p.url ? ` — ${p.url}` : ''}`)
      ),
    )
  }

  if (report.remediation.workarounds?.length) {
    sections.push(heading2('Workarounds'), ...report.remediation.workarounds.map(bullet))
  }

  // ── Detection ──
  sections.push(heading1('Detection & Threat Hunting'))

  if (report.detection.detection_queries?.length) {
    sections.push(heading2('Detection Queries'))
    for (const q of report.detection.detection_queries) {
      sections.push(
        body(`${q.platform} — ${q.description}`, { bold: true }),
        codeBlock(q.query),
        emptyLine(),
      )
    }
  }

  if (report.detection.threat_hunting?.length) {
    sections.push(heading2('Threat Hunting Recommendations'), ...report.detection.threat_hunting.map(bullet))
  }

  if (report.detection.log_sources?.length) {
    sections.push(heading2('Required Log Sources'), ...report.detection.log_sources.map(bullet))
  }

  // ── References ──
  if (report.references?.length) {
    sections.push(
      heading1('References'),
      ...report.references.map(r => bullet(`[${r.type}] ${r.title} — ${r.url}`)),
    )
  }

  // ── Analyst Assessment ──
  sections.push(
    heading1('Analyst Assessment'),
    body(report.analyst_assessment),
    emptyLine(),
    new Paragraph({
      children: [
        new TextRun({ text: '— SECFORIT Security Operations', size: 20, italics: true, color: '888888' }),
      ],
      alignment: AlignmentType.RIGHT,
      spacing: { before: 200 },
    }),
  )

  return new Document({
    creator: 'SECFORIT',
    title: `Threat Intelligence — ${report.vulnerability.cve_id ?? report.vulnerability.title}`,
    description: report.executive_summary,
    styles: {
      default: {
        document: {
          run: { font: 'Calibri', size: 22 },
        },
      },
      paragraphStyles: [
        {
          id: 'Heading1',
          name: 'Heading 1',
          run: { bold: true, size: 28, color: '1a1a2e' },
        },
        {
          id: 'Heading2',
          name: 'Heading 2',
          run: { bold: true, size: 24, color: '333333' },
        },
      ],
    },
    sections: [{
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: 'SECFORIT — CONFIDENTIAL — ', bold: true, size: 18, color: '888888' }),
                new TextRun({ text: `TLP:${report.classification.tlp}`, bold: true, size: 18, color: tlpColor(report.classification.tlp) }),
              ],
              alignment: AlignmentType.RIGHT,
              border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: 'cccccc', space: 4 } },
            }),
          ],
        }),
      },
      children: sections,
    }],
  })
}

// ─── Route ───────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const { report } = (await request.json()) as { report: ThreatIntelReport }
    if (!report) return NextResponse.json({ error: 'Missing report' }, { status: 400 })

    const doc = buildDocument(report)
    const buffer = await Packer.toBuffer(doc)
    const uint8 = new Uint8Array(buffer)

    const cveId = report.vulnerability.cve_id ?? 'threat-intel'
    const filename = `${cveId}-threat-intel-${new Date().toISOString().slice(0, 10)}.docx`

    return new NextResponse(uint8, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    console.error('Export error:', err)
    return NextResponse.json({ error: 'Failed to generate document' }, { status: 500 })
  }
}
