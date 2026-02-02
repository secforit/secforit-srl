import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { PrivacyPolicyContent } from "@/components/privacy-policy-content"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Privacy Policy | SECFORIT",
  description:
    "SECFORIT privacy policy. Learn how we collect, use, and protect your personal data in compliance with GDPR and European data protection regulations.",
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
