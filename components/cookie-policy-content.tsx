"use client"

import { useEffect, useRef, useState } from "react"
import { Cookie } from "lucide-react"
import Link from "next/link"

const sections = [
  {
    id: "what-are-cookies",
    title: "1. What Are Cookies",
    content: `Cookies are small text files that are placed on your device (computer, tablet, or mobile phone) when you visit a website. They are widely used to make websites work more efficiently, provide information to website owners, and enhance the user experience.

Cookies may be "first-party" (set by us) or "third-party" (set by a service we use). They can also be "session cookies" (deleted when you close your browser) or "persistent cookies" (remain on your device for a set period or until you delete them).`,
  },
  {
    id: "how-we-use",
    title: "2. How We Use Cookies",
    content: `We use cookies for the following purposes:

- Ensuring our website functions correctly and securely
- Understanding how visitors use and interact with our website
- Remembering your preferences, such as cookie consent choices

We do not use cookies for advertising, profiling, or selling data to third parties.`,
  },
  {
    id: "types-of-cookies",
    title: "3. Types of Cookies We Use",
    content: `**a) Strictly Necessary Cookies**

These cookies are essential for the website to function and cannot be disabled. They enable core functionality such as page navigation and secure areas of the site. No personal data is collected by these cookies.

| Cookie | Purpose | Duration | Type |
|--------|---------|----------|------|
| secforit-cookie-consent | Stores your cookie consent preferences | 1 year | First-party, Persistent |

**b) Analytics Cookies**

These cookies help us understand how visitors interact with our website by collecting anonymised usage data. They are only set if you consent to them.

| Cookie | Purpose | Duration | Type |
|--------|---------|----------|------|
| Vercel Analytics | Collects anonymised page view and performance data | Session | First-party |

Vercel Analytics is privacy-focused. It does not use cookies to track individual users across sites, does not collect personally identifiable information, and is compliant with GDPR without requiring personal data processing. Data is aggregated and cannot be used to identify individual visitors.`,
  },
  {
    id: "legal-basis",
    title: "4. Legal Basis",
    content: `Under the GDPR and the ePrivacy Directive (Directive 2002/58/EC, as amended by Directive 2009/136/EC), the legal bases for using cookies are:

- **Strictly necessary cookies:** These are exempt from consent requirements under Art. 5(3) of the ePrivacy Directive, as they are essential for providing the service you have requested.
- **Analytics cookies:** These require your prior consent under Art. 5(3) of the ePrivacy Directive and Art. 6(1)(a) GDPR. We obtain this consent through our cookie consent banner before placing any non-essential cookies on your device.

You may withdraw your consent at any time by clearing your browser cookies or using the cookie management options described below.`,
  },
  {
    id: "managing-cookies",
    title: "5. Managing Your Cookie Preferences",
    content: `You can manage your cookie preferences in several ways:

**Cookie consent banner:** When you first visit our website, a cookie consent banner allows you to accept all cookies, customise your preferences, or reject non-essential cookies. Your choice is saved in your browser and remembered for future visits.

**Changing your preferences:** You can reset your cookie preferences at any time by clearing the "secforit-cookie-consent" item from your browser's local storage, or by clearing all cookies for our domain. The consent banner will reappear on your next visit.

**Browser settings:** Most browsers allow you to control cookies through their settings. You can typically:
- View and delete existing cookies
- Block all cookies or only third-party cookies
- Set preferences for specific websites
- Configure notifications when cookies are set

Please note that blocking strictly necessary cookies may affect website functionality.

Common browser cookie management links:
- Chrome: Settings > Privacy and Security > Cookies
- Firefox: Settings > Privacy & Security > Cookies
- Safari: Preferences > Privacy
- Edge: Settings > Cookies and Site Permissions`,
  },
  {
    id: "third-party",
    title: "6. Third-Party Cookies",
    content: `We do not use third-party advertising or tracking cookies. The only third-party service that may process data is Vercel Analytics, which operates as a data processor under our instruction and does not place traditional tracking cookies. Vercel Analytics collects only anonymised, aggregated performance data.

We do not allow any third party to use cookies on our website for their own purposes.`,
  },
  {
    id: "data-collected",
    title: "7. Data Collected Through Cookies",
    content: `The data collected through our cookies is minimal:

**Consent cookie:** Stores only your preference choices (necessary/analytics), the consent version, and a timestamp. No personal data is included.

**Analytics (when consented):** Vercel Analytics may collect:
- Page URLs visited (no personal identifiers)
- Referral source
- Browser and device type (aggregated)
- Country of origin (based on anonymised IP)
- Page load performance metrics

This data cannot be used to identify individual visitors and is processed in accordance with our Privacy Policy.`,
  },
  {
    id: "retention",
    title: "8. Cookie Retention Periods",
    content: `- **Consent cookie:** Stored for 1 year or until you clear your browser data. After expiry, the consent banner will reappear.
- **Analytics data:** Aggregated analytics data processed by Vercel is retained according to their data retention policy. No personally identifiable data is retained.
- **Session cookies:** Automatically deleted when you close your browser.`,
  },
  {
    id: "your-rights",
    title: "9. Your Rights",
    content: `Under the GDPR and applicable European data protection laws, you have the right to:

- Withdraw your consent to non-essential cookies at any time
- Request information about the cookies used on our website
- Lodge a complaint with your local data protection supervisory authority

For any questions about our use of cookies or to exercise your rights, please contact us at razvan@secforit.ro.

For full details on how we handle your personal data, please refer to our Privacy Policy.`,
  },
  {
    id: "changes",
    title: "10. Changes to This Cookie Policy",
    content: `We may update this Cookie Policy from time to time. When we make changes, we will update the "Last updated" date at the top of this page. If material changes are made to the types of cookies used, we will reset the consent banner version so that you are prompted to review and consent again.`,
  },
]

export function CookiePolicyContent() {
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
            <Cookie className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">Legal</span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-foreground">
            Cookie <span className="text-primary">Policy</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Information about the cookies we use, why we use them, and how you
            can manage your preferences.
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
      <div className="text-muted-foreground leading-relaxed whitespace-pre-line text-sm md:text-base">
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
