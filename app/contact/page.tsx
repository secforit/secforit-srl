import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { ContactPageContent } from "@/components/contact-page-content"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Contact | SECFORIT",
  description:
    "Get in touch with SECFORIT for cybersecurity consulting, threat analysis, and secure development solutions.",
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
