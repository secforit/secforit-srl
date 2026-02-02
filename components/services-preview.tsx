"use client"

import { useEffect, useRef, useState } from "react"
import { Shield, Search, Cog, Code, Network, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

const services = [
  {
    icon: Shield,
    title: "Security Consulting",
    description: "Strategic advisory and compliance alignment with ISO 27001, NIST, and SOC 2.",
  },
  {
    icon: Search,
    title: "Threat & Vulnerability Analysis",
    description: "Continuous scanning, threat modeling, and cloud security posture assessments.",
  },
  {
    icon: Cog,
    title: "Automated Security Solutions",
    description: "Custom SIEM tuning, automated compliance monitoring, and real-time dashboards.",
  },
  {
    icon: Code,
    title: "Secure Web Development",
    description: "Security-first applications with DevSecOps pipelines and SSO integration.",
  },
  {
    icon: Network,
    title: "Secure Integration",
    description: "API security architecture with Zero Trust principles and secrets management.",
  },
]

export function ServicesPreview() {
  const [titleVisible, setTitleVisible] = useState(false)
  const [cardsVisible, setCardsVisible] = useState(false)
  const titleRef = useRef<HTMLDivElement>(null)
  const cardsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setTitleVisible(true)
      },
      { threshold: 0.1 }
    )

    const cardsObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setCardsVisible(true)
      },
      { threshold: 0.1 }
    )

    if (titleRef.current) observer.observe(titleRef.current)
    if (cardsRef.current) cardsObserver.observe(cardsRef.current)

    return () => {
      observer.disconnect()
      cardsObserver.disconnect()
    }
  }, [])

  return (
    <section id="services-preview" className="relative py-24 md:py-32 bg-background">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(220,38,38,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(220,38,38,0.02)_1px,transparent_1px)] bg-[size:80px_80px]" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <div
          ref={titleRef}
          className={`text-center mb-16 transition-all duration-700 ${
            titleVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-foreground">
            Our <span className="text-primary">Services</span>
          </h2>
          <div className="relative inline-block">
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Comprehensive cybersecurity solutions tailored to protect your digital assets
            </p>
            <div
              className={`absolute -bottom-2 left-1/2 -translate-x-1/2 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent transition-all duration-1000 ${
                titleVisible ? "w-48" : "w-0"
              }`}
            />
          </div>
        </div>

        {/* Compact Services Grid */}
        <div
          ref={cardsRef}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto mb-12"
        >
          {services.map((service, index) => {
            const Icon = service.icon
            return (
              <div
                key={service.title}
                className={`group relative p-5 rounded-xl transition-all duration-500 ${
                  cardsVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                }`}
                style={{ transitionDelay: `${index * 80}ms` }}
              >
                <div className="absolute inset-0 rounded-xl bg-card/50 backdrop-blur-sm border border-border transition-all duration-300 group-hover:border-primary/50 group-hover:bg-card/70" />
                <div className="relative z-10 flex items-start gap-4">
                  <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/20 shrink-0 transition-all duration-300 group-hover:bg-primary/20">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors duration-300">
                      {service.title}
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {service.description}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* CTA */}
        <div
          className={`text-center transition-all duration-700 delay-300 ${
            cardsVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <Button
            asChild
            size="lg"
            className="bg-primary text-primary-foreground hover:bg-sec-red-dark hover:shadow-[0_0_30px_rgba(220,38,38,0.4)] transition-all duration-300 px-8 py-6 text-base"
          >
            <Link href="/services">
              View All Services
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
