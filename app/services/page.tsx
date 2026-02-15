import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { ServicesPageContent } from "@/components/services-page-content"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Cybersecurity Services - Security Assessments, ISO 27001, SIEM, DevSecOps",
  description:
    "SECFORIT cybersecurity services by Lisman Razvan: security assessments, vulnerability assessment, ISO 27001 & SOC 2 compliance consulting, SIEM deployment, DevSecOps pipelines, Zero Trust architecture, cloud security (AWS, Azure, GCP), and API security.",
  keywords: [
    'security assessments services',
    'vulnerability assessment',
    'ISO 27001 consulting',
    'SOC 2 compliance',
    'SIEM deployment',
    'DevSecOps services',
    'cloud security assessment',
    'API security',
    'security consulting services',
    'cybersecurity services Romania',
    'Lisman Razvan services',
    'SECFORIT services',
    'red team exercises',
    'incident response planning',
    'security audit services',
  ],
  alternates: {
    canonical: 'https://www.secforit.ro/services',
  },
  openGraph: {
    title: 'Cybersecurity Services | SECFORIT by Lisman Razvan',
    description: 'Professional cybersecurity services: security assessments, ISO 27001 compliance, SIEM solutions, DevSecOps, and Zero Trust architecture by Lisman Razvan.',
    url: 'https://www.secforit.ro/services',
  },
}

export default function ServicesPage() {
  return (
    <main className="min-h-screen bg-background">
      <Navigation />
      <ServicesPageContent />
      <Footer />
    </main>
  )
}
