import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { PrivacyPolicyContent } from "@/components/privacy-policy-content"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "SECFORIT privacy policy by Lisman Razvan. Learn how we collect, use, and protect your personal data in compliance with GDPR and European data protection regulations.",
  alternates: {
    canonical: 'https://www.secforit.ro/privacy-policy',
  },
}

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-background">
      <Navigation />
      <PrivacyPolicyContent />
      <Footer />
    </main>
  )
}
