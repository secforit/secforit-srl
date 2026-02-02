"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { ArrowRight, Shield } from "lucide-react"
import Link from "next/link"

export function ContactPreview() {
  const [isVisible, setIsVisible] = useState(false)
  const sectionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true)
      },
      { threshold: 0.2 }
    )

    if (sectionRef.current) observer.observe(sectionRef.current)
    return () => observer.disconnect()
  }, [])

  return (
    <section className="relative py-24 md:py-32 bg-background overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(220,38,38,0.05)_0%,transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(10,10,10,0.03)_0%,transparent_50%)]" />
      </div>

      <div
        ref={sectionRef}
        className="container mx-auto px-4 relative z-10"
      >
        <div
          className={`max-w-3xl mx-auto text-center transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 border border-primary/20 mb-8">
            <Shield className="w-8 h-8 text-primary" />
          </div>

          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-foreground">
            {"Let's"} <span className="text-primary">Secure</span> Your Future
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-10">
            Ready to strengthen your security posture? Get in touch with our
            team of experts for a consultation.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              asChild
              size="lg"
              className="bg-primary text-primary-foreground hover:bg-sec-red-dark hover:shadow-[0_0_30px_rgba(220,38,38,0.4)] transition-all duration-300 px-8 py-6 text-base"
            >
              <Link href="/contact">
                Get in Touch
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
            <p className="text-sm text-muted-foreground">
              or email us at{" "}
              <a
                href="mailto:razvan@secforit.ro"
                className="text-primary hover:underline font-medium"
              >
                razvan@secforit.ro
              </a>
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
