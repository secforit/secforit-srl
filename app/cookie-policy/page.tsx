import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { CookiePolicyContent } from "@/components/cookie-policy-content"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Cookie Policy",
  description:
    "SECFORIT cookie policy. Learn about the cookies we use, their purposes, and how to manage your preferences.",
  alternates: {
    canonical: 'https://www.secforit.ro/cookie-policy',
  },
}

export default function CookiePolicyPage() {
  return (
    <main className="min-h-screen bg-background">
      <Navigation />
      <CookiePolicyContent />
      <Footer />
    </main>
  )
}
