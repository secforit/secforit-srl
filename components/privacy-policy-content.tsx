"use client"

import { useEffect, useRef, useState } from "react"
import { Shield } from "lucide-react"
import Link from "next/link"

const sections = [
  {
    id: "controller",
    title: "1. Data Controller",
    content: `SECFORIT SRL ("SECFORIT", "we", "us", or "our") is the data controller responsible for processing your personal data. If you have any questions about this Privacy Policy or our data practices, please contact us at:

Email: razvan@secforit.ro`,
  },
  {
    id: "data-we-collect",
    title: "2. Personal Data We Collect",
    content: `We may collect and process the following categories of personal data:

**Information you provide directly:**
- Name, email address, company name, and any message content submitted through our contact form
- Communication records when you correspond with us via email or other channels
- Business contact information provided in the context of a professional relationship

**Information collected automatically:**
- IP address (anonymised where technically feasible)
- Browser type and version, operating system
- Pages visited, time and date of access, time spent on pages
- Referring website address

We do not knowingly collect special categories of personal data (e.g., racial or ethnic origin, political opinions, health data) unless you explicitly provide such information.`,
  },
  {
    id: "legal-basis",
    title: "3. Legal Basis for Processing",
    content: `Under the General Data Protection Regulation (GDPR) and applicable European data protection laws, we process your personal data on the following legal bases:

- **Consent (Art. 6(1)(a) GDPR):** When you voluntarily submit a contact form or subscribe to communications, you consent to the processing of your data for those purposes. You may withdraw your consent at any time.
- **Legitimate Interest (Art. 6(1)(f) GDPR):** We process certain data for our legitimate business interests, such as improving our website, ensuring security, and responding to enquiries, provided these interests do not override your fundamental rights and freedoms.
- **Contractual Necessity (Art. 6(1)(b) GDPR):** Where processing is necessary for the performance of a contract or to take pre-contractual steps at your request.
- **Legal Obligation (Art. 6(1)(c) GDPR):** Where we are required by law to process your data, for example for tax, accounting, or regulatory purposes.`,
  },
  {
    id: "purposes",
    title: "4. Purposes of Processing",
    content: `We use your personal data for the following purposes:

- Responding to your enquiries and providing requested information
- Delivering and improving our cybersecurity consulting services
- Operating and maintaining our website, including analytics
- Communicating updates, security advisories, or promotional material (only with your consent)
- Complying with legal obligations and protecting our legitimate interests
- Ensuring the security of our systems and detecting fraudulent activity`,
  },
  {
    id: "data-sharing",
    title: "5. Data Sharing and Transfers",
    content: `We do not sell your personal data. We may share your data with the following categories of recipients:

- **Service providers:** Trusted third-party processors that assist us in operating our website and delivering services (e.g., hosting providers, analytics services, email platforms). All processors are bound by data processing agreements.
- **Legal requirements:** Competent authorities, courts, or regulatory bodies when required by law or to protect our legal rights.
- **Business transfers:** In the event of a merger, acquisition, or sale of assets, your data may be transferred as part of that transaction, with equivalent protections in place.

**International transfers:** If your data is transferred outside the European Economic Area (EEA), we ensure appropriate safeguards are in place, such as Standard Contractual Clauses (SCCs) approved by the European Commission, or an adequacy decision under Art. 45 GDPR.`,
  },
  {
    id: "cookies",
    title: "6. Cookies and Tracking Technologies",
    content: `Our website may use cookies and similar technologies to improve your browsing experience and analyse site usage.

- **Strictly necessary cookies:** Required for the website to function and cannot be disabled.
- **Analytics cookies:** Help us understand how visitors interact with our website. We use Vercel Analytics, which collects anonymised usage data. No personal data is stored in cookies by this service.

You can manage your cookie preferences through your browser settings. Disabling certain cookies may affect website functionality.

We do not use third-party advertising cookies or tracking pixels for targeted advertising.`,
  },
  {
    id: "data-retention",
    title: "7. Data Retention",
    content: `We retain your personal data only for as long as necessary to fulfil the purposes for which it was collected:

- **Contact form submissions:** Retained for up to 12 months after the last communication, unless a business relationship is established.
- **Contractual data:** Retained for the duration of the contract and for the applicable statutory limitation period thereafter.
- **Analytics data:** Aggregated and anonymised data may be retained indefinitely. Identifiable data is deleted or anonymised within 26 months.
- **Legal obligations:** Data required for tax or regulatory compliance is retained as required by applicable law.

After the retention period, personal data is securely deleted or irreversibly anonymised.`,
  },
  {
    id: "your-rights",
    title: "8. Your Rights",
    content: `Under the GDPR and applicable European data protection legislation, you have the following rights:

- **Right of access (Art. 15):** You may request a copy of the personal data we hold about you.
- **Right to rectification (Art. 16):** You may request correction of inaccurate or incomplete data.
- **Right to erasure (Art. 17):** You may request deletion of your data where there is no compelling reason for its continued processing.
- **Right to restriction (Art. 18):** You may request that we restrict the processing of your data in certain circumstances.
- **Right to data portability (Art. 20):** You may request your data in a structured, commonly used, and machine-readable format.
- **Right to object (Art. 21):** You may object to processing based on legitimate interests at any time. We will cease processing unless we can demonstrate compelling legitimate grounds.
- **Right to withdraw consent:** Where processing is based on consent, you may withdraw it at any time without affecting the lawfulness of prior processing.
- **Right to lodge a complaint:** You have the right to lodge a complaint with a supervisory authority in the EU/EEA member state of your habitual residence, place of work, or place of the alleged infringement.

To exercise any of these rights, please contact us at razvan@secforit.ro. We will respond within one month, as required by the GDPR. This period may be extended by two further months where necessary, taking into account the complexity and number of requests.`,
  },
  {
    id: "security",
    title: "9. Data Security",
    content: `We implement appropriate technical and organisational measures to protect your personal data against unauthorised access, alteration, disclosure, or destruction. These measures include:

- Encryption of data in transit (TLS/SSL)
- Access controls and authentication mechanisms
- Regular security assessments and vulnerability testing
- Employee training on data protection
- Incident response procedures

While we take all reasonable precautions, no method of transmission over the internet or electronic storage is completely secure. We cannot guarantee absolute security but are committed to protecting your data to the highest industry standards.`,
  },
  {
    id: "children",
    title: "10. Children's Privacy",
    content: `Our website and services are not directed at individuals under the age of 16. We do not knowingly collect personal data from children. If you believe that a child has provided us with personal data, please contact us immediately and we will take steps to delete such information.`,
  },
  {
    id: "third-party-links",
    title: "11. Third-Party Links",
    content: `Our website may contain links to third-party websites or services. We are not responsible for the privacy practices or content of those third parties. We encourage you to review the privacy policies of any external sites you visit.`,
  },
  {
    id: "changes",
    title: "12. Changes to This Policy",
    content: `We may update this Privacy Policy from time to time to reflect changes in our practices, legal requirements, or business operations. When we make material changes, we will update the "Last updated" date at the top of this page. We encourage you to review this policy periodically.`,
  },
  {
    id: "contact-dpo",
    title: "13. Contact Information",
    content: `For any questions, concerns, or requests related to this Privacy Policy or the processing of your personal data, please contact us:

**SECFORIT SRL**
Email: razvan@secforit.ro

If you are not satisfied with our response, you have the right to lodge a complaint with your local data protection supervisory authority.`,
  },
]

export function PrivacyPolicyContent() {
  const [headerVisible, setHeaderVisible] = useState(false)
  const headerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setHeaderVisible(true)
      },
      { threshold: 0.1 }
    )

    if (headerRef.current) observer.observe(headerRef.current)
    return () => observer.disconnect()
  }, [])

  return (
    <section className="relative pt-32 pb-24 md:pt-40 md:pb-32 bg-background">
      {/* Background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(220,38,38,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(220,38,38,0.02)_1px,transparent_1px)] bg-[size:80px_80px]" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Page Header */}
        <div
          ref={headerRef}
          className={`text-center mb-16 transition-all duration-700 ${
            headerVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/5 mb-6">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">Legal</span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-foreground">
            Privacy <span className="text-primary">Policy</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            How we collect, use, and protect your personal data in compliance
            with the GDPR and European data protection regulations.
          </p>
          <p className="text-sm text-muted-foreground/60 mt-4">
            Last updated: February 2, 2026
          </p>
          <div
            className={`mx-auto mt-4 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent transition-all duration-1000 ${
              headerVisible ? "w-48" : "w-0"
            }`}
          />
        </div>

        {/* Content */}
        <div className="max-w-3xl mx-auto">
          {/* Table of Contents */}
          <div className="mb-12 p-6 rounded-2xl bg-card/50 backdrop-blur-sm border border-border">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">
              Table of Contents
            </h2>
            <nav>
              <ol className="space-y-2">
                {sections.map((section) => (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      className="text-sm text-muted-foreground hover:text-primary transition-colors duration-300"
                    >
                      {section.title}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </div>

          {/* Sections */}
          <div className="space-y-12">
            {sections.map((section) => (
              <PolicySection key={section.id} section={section} />
            ))}
          </div>

          {/* Back Link */}
          <div className="mt-16 pt-8 border-t border-border text-center">
            <Link
              href="/"
              className="text-sm text-muted-foreground hover:text-primary transition-colors duration-300"
            >
              &larr; Back to Home
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

function PolicySection({
  section,
}: {
  section: (typeof sections)[0]
}) {
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true)
      },
      { threshold: 0.1 }
    )

    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      id={section.id}
      ref={ref}
      className={`scroll-mt-24 transition-all duration-700 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      }`}
    >
      <h2 className="text-xl md:text-2xl font-bold text-foreground mb-4">
        {section.title}
      </h2>
      <div className="prose-policy text-muted-foreground leading-relaxed whitespace-pre-line text-sm md:text-base">
        {section.content.split(/(\*\*[^*]+\*\*)/).map((part, i) => {
          if (part.startsWith("**") && part.endsWith("**")) {
            return (
              <strong key={i} className="text-foreground font-semibold">
                {part.slice(2, -2)}
              </strong>
            )
          }
          return <span key={i}>{part}</span>
        })}
      </div>
    </div>
  )
}
