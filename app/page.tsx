import type { Metadata } from "next"
import { Navigation } from "@/components/navigation"
import { HeroSection } from "@/components/hero-section"
import { ServicesPreview } from "@/components/services-preview"
import { AboutSection } from "@/components/about-section"
import { ContactPreview } from "@/components/contact-preview"
import { Footer } from "@/components/footer"
import { JsonLd } from "@/components/json-ld"

export const metadata: Metadata = {
  title: 'SECFORIT | Cybersecurity Consulting & Security Assessments',
  description: 'SECFORIT provides professional security consulting, security assessments, ISO 27001 & SOC 2 compliance, SIEM deployment, Zero Trust architecture, and secure application development for businesses.',
  alternates: {
    canonical: 'https://www.secforit.ro',
  },
  openGraph: {
    title: 'SECFORIT | Cybersecurity Consulting & Security Solutions',
    description: 'Professional cybersecurity consulting, security assessments, compliance, and secure development. Protecting businesses with Zero Trust architecture.',
    url: 'https://www.secforit.ro',
  },
}

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <JsonLd />
      <Navigation />
      <HeroSection />
      <ServicesPreview />
      <AboutSection />
      <ContactPreview />
      <Footer />
    </main>
  )
}
