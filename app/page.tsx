import { Navigation } from "@/components/navigation"
import { HeroSection } from "@/components/hero-section"
import { ServicesPreview } from "@/components/services-preview"
import { AboutSection } from "@/components/about-section"
import { ContactPreview } from "@/components/contact-preview"
import { Footer } from "@/components/footer"

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <Navigation />
      <HeroSection />
      <ServicesPreview />
      <AboutSection />
      <ContactPreview />
      <Footer />
    </main>
  )
}
