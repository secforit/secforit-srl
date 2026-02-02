import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { ServicesPageContent } from "@/components/services-page-content"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Services | SECFORIT",
  description:
    "Comprehensive cybersecurity services including security consulting, threat analysis, automated solutions, secure development, and integration.",
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
