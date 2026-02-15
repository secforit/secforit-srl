import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { ContactPageContent } from "@/components/contact-page-content"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Contact SECFORIT - Get a Cybersecurity Consultation with Lisman Razvan",
  description:
    "Contact Lisman Razvan at SECFORIT for cybersecurity consulting, penetration testing, compliance advisory, and security solutions. Free initial consultation for businesses.",
  keywords: [
    'contact cybersecurity consultant',
    'hire cybersecurity expert',
    'cybersecurity consultation',
    'security assessment quote',
    'Lisman Razvan contact',
    'SECFORIT contact',
  ],
  alternates: {
    canonical: 'https://www.secforit.ro/contact',
  },
  openGraph: {
    title: 'Contact SECFORIT | Cybersecurity Consulting by Lisman Razvan',
    description: 'Get in touch with cybersecurity expert Lisman Razvan for consulting, penetration testing, and security solutions.',
    url: 'https://www.secforit.ro/contact',
  },
}

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-background">
      <Navigation />
      <ContactPageContent />
      <Footer />
    </main>
  )
}
